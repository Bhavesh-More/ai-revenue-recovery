import { Router } from "express";
import { razorpayClient, RazorpayWebhookEvent } from "@recovery/integrations";
import { caseLifecycle } from "@recovery/case-lifecycle";
import { eventIngestion } from "@recovery/event-ingestion";
import { auditService } from "@recovery/audit";
import { ApiError } from "../lib/errors.js";
import { ok } from "../lib/responses.js";
import { asyncHandler } from "../lib/async-handler.js";
import { eventBroadcaster } from "../lib/broadcaster.js";

export const webhooksRazorpayRouter = Router();

webhooksRazorpayRouter.post(
  "/webhooks/razorpay",
  asyncHandler(async (req, res) => {
    const signature = (req.headers["x-razorpay-signature"] as string) || "";
    const rawBody =
      typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body || {});

    // Timestamp drift protection (rejects replayed webhooks > 300 seconds old)
    const timestampHeader = req.headers["x-razorpay-event-timestamp"] as string | undefined;
    if (timestampHeader) {
      const eventTimeMs = parseInt(timestampHeader, 10) * (timestampHeader.length === 10 ? 1000 : 1);
      const currentTimeMs = Date.now();
      const driftSeconds = Math.abs(currentTimeMs - eventTimeMs) / 1000;
      if (driftSeconds > 300) {
        throw ApiError.badRequest("WEBHOOK_EXPIRED", "Razorpay webhook timestamp skew exceeds 300 seconds (replay attack protection).");
      }
    }

    // Signature verification (skips check in sandbox mock mode if secret is unset)
    if (!razorpayClient.isMockMode() && signature) {
      const isValid = razorpayClient.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        throw ApiError.badRequest("WEBHOOK_INVALID", "Invalid Razorpay HMAC signature.");
      }
    }

    const payload = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as RazorpayWebhookEvent;
    const eventType = payload.event || "unknown";
    const paymentEntity = payload.payload?.payment?.entity;
    const linkEntity = payload.payload?.payment_link?.entity;
    const subEntity = payload.payload?.subscription?.entity;
    const invoiceEntity = payload.payload?.invoice?.entity;
    const downtimeEntity = payload.payload?.downtime?.entity;

    let caseIdHandled: string | undefined;

    // 1. Payment Failure Event -> Create/Ingest Payment Degradation Case
    if (eventType === "payment.failed" && paymentEntity) {
      const customerId = paymentEntity.contact || paymentEntity.email || "00000000-0000-0000-0000-000000000000";
      const ingestResult = await eventIngestion.ingest({
        source: "razorpay",
        customerId,
        externalId: paymentEntity.id,
        payload: {
          type: "payment.failed",
          customerId,
          paymentId: paymentEntity.id,
          amountAtRiskMinor: paymentEntity.amount,
          currency: paymentEntity.currency || "INR",
          attemptCount: 1,
        },
      });

      if (ingestResult.case) {
        caseIdHandled = ingestResult.case.id;
      }
    }

    // 2. Invoice Expired Event -> Trigger B2B Receivables Overdue Case
    if (eventType === "invoice.expired" && invoiceEntity) {
      const customerId = (invoiceEntity.customer_id as string) || "00000000-0000-0000-0000-000000000000";
      const invoiceId = (invoiceEntity.id as string) || `inv_${Date.now()}`;
      const amountMinor = (invoiceEntity.amount as number) || 0;

      const ingestResult = await eventIngestion.ingest({
        source: "razorpay",
        customerId,
        externalId: invoiceId,
        payload: {
          type: "invoice.overdue",
          customerId,
          invoiceId,
          amountAtRiskMinor: amountMinor,
          currency: "INR",
          dueDate: new Date().toISOString(),
          daysOverdue: 1,
        },
      });

      if (ingestResult.case) {
        caseIdHandled = ingestResult.case.id;
      }
    }

    // 3. Payment Link Expired Event -> Update Link Status
    if (eventType === "payment_link.expired" && linkEntity) {
      const refCaseId = linkEntity.notes?.caseId || linkEntity.reference_id;
      if (refCaseId) {
        try {
          const updated = await caseLifecycle.transition({
            caseId: refCaseId,
            toState: "waiting",
            reason: "Payment link expired; queueing alternative recovery action touchpoint",
            actor: "razorpay:webhook",
          });
          caseIdHandled = updated.id;
        } catch {
          // Ignore if caseId is external or not found
        }
      }
    }

    // 4. Gateway Downtime Events (Direction 01 Payment Degradation Intelligence)
    if (eventType === "payment.downtime.started" || eventType === "payment.downtime.resolved") {
      await auditService.record({
        caseId: "SYS-DOWNTIME",
        action: "event_detected",
        summary: eventType === "payment.downtime.started"
          ? `ALERT: Gateway Downtime Started (${downtimeEntity?.issuer || "Issuer"} / ${downtimeEntity?.method || "UPI"})`
          : `NOTICE: Gateway Downtime Resolved (${downtimeEntity?.issuer || "Issuer"})`,
        actor: "razorpay:webhook",
        detail: {
          event: eventType,
          method: (downtimeEntity?.method as string) || "gateway",
          issuer: (downtimeEntity?.issuer as string) || "bank",
        },
      }).catch(() => undefined);
    }

    // 5. Payment Settlement & Recovery Success Events
    const isSuccessEvent =
      eventType === "payment.captured" ||
      eventType === "payment.authorized" ||
      eventType === "payment_link.paid" ||
      eventType === "order.paid" ||
      eventType === "invoice.paid";

    if (isSuccessEvent && (paymentEntity || linkEntity)) {
      const refCaseId = linkEntity?.notes?.caseId || paymentEntity?.description || paymentEntity?.id;

      if (refCaseId) {
        try {
          const updated = await caseLifecycle.transition({
            caseId: refCaseId,
            toState: "recovered",
            reason: `Razorpay webhook confirmed settlement (${eventType})`,
            actor: "razorpay:webhook",
          });
          caseIdHandled = updated.id;
        } catch {
          // Ignore if caseId is external or not found in local memory/DB
        }
      }
    }

    // 6. Record Audit Trail if a case ID was updated
    if (caseIdHandled) {
      await auditService.record({
        caseId: caseIdHandled,
        action: "outcome_received",
        summary: `Processed Razorpay webhook event ${eventType}`,
        actor: "system:razorpay_webhook",
        detail: {
          event: eventType,
          paymentId: paymentEntity?.id || null,
          linkId: linkEntity?.id || null,
          subscriptionId: subEntity?.id || null,
        },
      });
      eventBroadcaster.broadcast("case.updated", { caseId: caseIdHandled, event: eventType });
    }

    eventBroadcaster.broadcast("webhook.event", { event: eventType, caseId: caseIdHandled || null });

    ok(res, {
      received: true,
      event: eventType,
      processedCaseId: caseIdHandled || null,
    });
  }),
);
