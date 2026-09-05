import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "@recovery/db";
import { customers, revenueEvents, recoveryCases, recoveryActions, agentDecisions } from "@recovery/db/schema";
import { caseLifecycle } from "@recovery/case-lifecycle";
import { auditService } from "@recovery/audit";
import { agentRunner } from "@recovery/agent";
import { emailClient, generateRecoveryEmail, razorpayClient } from "@recovery/integrations";
import { asyncHandler } from "../lib/async-handler.js";
import { ok, jsonSafe } from "../lib/responses.js";
import { eventBroadcaster } from "../lib/broadcaster.js";

export const liveDemoRouter = Router();

const liveDemoExecuteSchema = z.object({
  direction: z.enum([
    "01_payment_degradation",
    "02_checkout_dropoff",
    "03_failed_subscription",
    "04_b2b_receivables",
    "05_mandate_retry",
    "06_hinglish_voice",
    "07_promise_to_pay",
  ]),
  customer: z.object({
    name: z.string().min(1, "Customer name is required"),
    email: z.string().email("Valid email is required"),
    externalId: z.string().optional(),
    phone: z.string().optional(),
    companyName: z.string().optional(),
  }),
  amount: z.number().positive("Amount must be greater than zero"),
  directionData: z.record(z.string(), z.any()).default({}),
});

const liveDemoApproveSchema = z.object({
  caseId: z.string().uuid(),
  actor: z.string().default("supervisor"),
});

liveDemoRouter.post(
  "/live-demo/execute",
  asyncHandler(async (req, res) => {
    const parsed = liveDemoExecuteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map((i) => i.message).join(", "),
        },
      });
    }

    const input = parsed.data;
    const amountMinor = Math.round(input.amount * 100);

    // 1. Resolve or Create Customer (ONE customer)
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(eq(customers.email, input.customer.email.toLowerCase().trim()))
      .limit(1);

    let customerId: string;
    if (existingCustomer) {
      customerId = existingCustomer.id;
      await db
        .update(customers)
        .set({
          name: input.customer.name,
          phone: input.customer.phone || existingCustomer.phone,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customerId));
    } else {
      const [newCustomer] = await db
        .insert(customers)
        .values({
          name: input.customer.name,
          email: input.customer.email.toLowerCase().trim(),
          phone: input.customer.phone || "+919876543210",
          externalRef: input.customer.externalId || `demo_${randomUUID().slice(0, 8)}`,
          type: input.direction === "04_b2b_receivables" ? "business" : "individual",
          risk: {
            reliabilityScore: 0.85,
            recoveryProbability: 0.85,
            optedOut: false,
          },
          history: {
            tenureMonths: 14,
            successfulPayments: 12,
            failedPayments: 1,
            lifetimeRevenueMinor: amountMinor * 5,
            hasBrokenPromise: false,
            priorRecoveryCases: 0,
          },
        })
        .returning();
      customerId = newCustomer.id;
    }

    // 2. Build Direction-Specific Revenue Event Payload
    let eventType: any = "payment.failed";
    let payload: Record<string, unknown> = {
      direction: input.direction,
    };

    switch (input.direction) {
      case "01_payment_degradation":
        eventType = "payment.failed";
        payload = {
          ...payload,
          paymentId: input.directionData.paymentId || `pay_${randomUUID().slice(0, 10)}`,
          provider: input.directionData.gateway || "HDFC",
          providerCode: input.directionData.errorCode || "GATEWAY_TIMEOUT",
          failureReason: input.directionData.failureReason || "bank_decline",
          paymentMethod: "card",
          baselineSuccessRate: 0.95,
          currentSuccessRate: 0.45,
          affectedCustomerCount: 24,
          similarFailureCount: 6,
          timeWindowMinutes: 15,
        };
        break;

      case "02_checkout_dropoff":
        eventType = "checkout.abandoned";
        payload = {
          ...payload,
          orderReference: input.directionData.orderReference || `ord_${randomUUID().slice(0, 8)}`,
          lastStep: input.directionData.checkoutStage || "payment_method",
          cartValueMinor: amountMinor,
          shippingCostMinor: 0,
          intentScore: Number(input.directionData.intentScore ?? 0.88),
          abandonmentDurationMinutes: 15,
          previousAbandonedCount: 0,
        };
        break;

      case "03_failed_subscription":
        eventType = "subscription.renewal_failed";
        payload = {
          ...payload,
          subscriptionId: input.directionData.subscriptionId || `sub_${randomUUID().slice(0, 10)}`,
          failureReason: input.directionData.failureReason || "bank_decline",
          tenureMonths: 15,
          previousSuccessfulRenewals: 14,
          failedRenewalCount: 1,
          gracePeriodDaysRemaining: Number(input.directionData.gracePeriodDays || 5),
          mrrMinor: amountMinor,
          renewalDate: input.directionData.renewalDate || new Date().toISOString(),
        };
        break;

      case "04_b2b_receivables":
        eventType = "invoice.overdue";
        payload = {
          ...payload,
          invoiceId: `inv_${randomUUID().slice(0, 8)}`,
          invoiceNumber: input.directionData.invoiceNumber || `INV-${new Date().getFullYear()}-001`,
          companyName: input.customer.companyName || input.customer.name,
          contactEmail: input.customer.email,
          dueDate: input.directionData.dueDate || new Date(Date.now() - 7 * 86400000).toISOString(),
          daysOverdue: 7,
          paymentTerms: input.directionData.paymentTerms || "Net 30",
          brokenPromisesCount: 0,
        };
        break;

      case "05_mandate_retry":
        eventType = "mandate.failed";
        payload = {
          ...payload,
          mandateId: input.directionData.mandateId || `man_${randomUUID().slice(0, 10)}`,
          mandateState: "active",
          failureReason: input.directionData.failureReason || "insufficient_funds",
          consecutiveFailures: 1,
          successfulDebitsCount: 6,
          bankDegradationHint: false,
          retryWindow: input.directionData.retryWindow || "09:00 - 11:00 AM",
        };
        break;

      case "06_hinglish_voice":
        eventType = "voice.call_completed";
        payload = {
          ...payload,
          interactionId: `call_${randomUUID().slice(0, 10)}`,
          transcriptText:
            input.directionData.transcript ||
            "Customer: Haan main samajh gaya, kal subah tak payment clear kar dunga. AI: Theek hai sir, main aapko payment link email kar raha hoon.",
          detectedLanguage: "hinglish",
          sentiment: "cooperative",
          voiceIntent: "promise_to_pay",
          callDurationSeconds: 48,
          promisedDate: new Date(Date.now() + 86400000).toISOString(),
        };
        break;

      case "07_promise_to_pay":
        eventType = "promise.created";
        payload = {
          ...payload,
          promiseId: `p2p_${randomUUID().slice(0, 8)}`,
          promisedMinor: amountMinor,
          promisedDate: input.directionData.promisedDate
            ? new Date(input.directionData.promisedDate).toISOString()
            : new Date(Date.now() + 86400000).toISOString(),
          promiseType: "firm",
          promiseStatus: "pending",
          source: input.directionData.source || "customer_portal",
          customerReliabilityScore: 0.85,
        };
        break;
    }

    // 3. Insert Exactly ONE Revenue Event
    const [eventRow] = await db
      .insert(revenueEvents)
      .values({
        type: eventType,
        source: "live_demo",
        externalId: `live_demo_evt_${randomUUID().slice(0, 8)}`,
        customerId,
        amountAtRiskMinor: amountMinor,
        currency: "INR",
        payload,
      })
      .returning();

    // 4. Insert Exactly ONE Recovery Case
    const [caseRow] = await db
      .insert(recoveryCases)
      .values({
        customerId,
        originatingEventId: eventRow.id,
        direction: input.direction,
        currentState: "detected",
        amountAtRiskMinor: amountMinor,
        currency: "INR",
        recoveryProbability: "0.850",
        riskTier: amountMinor > 50000000 ? "critical" : amountMinor > 10000000 ? "high" : "medium",
        attemptCount: 1,
        escalated: false,
      })
      .returning();

    // 5. Record Initial Audit Events
    await auditService.record({
      caseId: caseRow.id,
      action: "event_detected",
      summary: `[LIVE DEMO] Case created for customer ${input.customer.name} (${input.customer.email}).`,
      detail: {
        lifecycleEvent: "LIVE_DEMO_CREATED",
        direction: input.direction,
        amountMinor,
        customerEmail: input.customer.email,
      },
      actor: "live_demo:user",
    });

    await auditService.record({
      caseId: caseRow.id,
      action: "event_detected",
      summary: `Case ingested: ₹${input.amount.toLocaleString("en-IN")} at risk for direction ${input.direction}.`,
      detail: {
        lifecycleEvent: "CASE_CREATED",
        originatingEventId: eventRow.id,
      },
      actor: "system:ingestion",
    });

    // 6. Run AI Reasoner & Policy Engine
    try {
      await agentRunner.runAnalysis({
        caseId: caseRow.id,
        actor: "agent:live_demo",
      });
    } catch (err: any) {
      console.error("[LiveDemo] Analysis error:", err);
    }

    // Refresh case row from DB
    const [freshCase] = await db
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.id, caseRow.id))
      .limit(1);

    const [latestDecision] = await db
      .select()
      .from(agentDecisions)
      .where(eq(agentDecisions.caseId, caseRow.id))
      .orderBy(desc(agentDecisions.createdAt))
      .limit(1);

    // If case failed during execution (e.g. tool failure), do NOT pretend email succeeded
    if (freshCase.currentState === "failed") {
      eventBroadcaster.broadcast("case.updated", freshCase);
      return res.status(422).json(
        jsonSafe({
          error: {
            code: "ACTION_EXECUTION_FAILED",
            message: freshCase.outcomeReason || "AI recovery action execution failed.",
          },
          case: freshCase,
          decision: latestDecision,
          status: "failed",
          approvalRequired: false,
          emailSent: false,
        }),
      );
    }

    const policyDecision = (latestDecision?.policyResult as any)?.decision || "allow";

    // 7. Branch on Policy Decision
    if (policyDecision === "deny" || freshCase.currentState === "stopped") {
      eventBroadcaster.broadcast("case.updated", freshCase);
      return ok(res, {
        case: freshCase,
        decision: latestDecision,
        status: "stopped",
        approvalRequired: false,
        emailSent: false,
      });
    }

    if (policyDecision === "require_approval" || freshCase.currentState === "escalated") {
      eventBroadcaster.broadcast("case.updated", freshCase);
      return ok(res, {
        case: freshCase,
        decision: latestDecision,
        status: "escalated",
        approvalRequired: true,
        emailSent: false,
      });
    }

    // 8. Policy Allowed: Create Razorpay TEST Payment Link + Send Real Email via Resend

    // 8a. Create Razorpay TEST payment link (capped at ₹5,00,000 max link ceiling)
    const MAX_RZP_LINK_AMOUNT_MINOR = 50_000_000;
    const linkAmountMinor = Math.min(amountMinor, MAX_RZP_LINK_AMOUNT_MINOR);
    const linkDesc =
      amountMinor > MAX_RZP_LINK_AMOUNT_MINOR
        ? `Recovery: ${input.direction} — ${input.customer.name} (Tranche 1 - capped at ₹5L link limit)`
        : `Recovery: ${input.direction} — ${input.customer.name}`;

    let paymentLink: any;
    try {
      paymentLink = await razorpayClient.createPaymentLink({
        amountMinor: linkAmountMinor,
        currency: "INR",
        description: linkDesc,
        customer: {
          name: input.customer.name,
          email: input.customer.email,
          contact: input.customer.phone,
        },
        referenceId: caseRow.id,
        notes: {
          caseId: caseRow.id,
          direction: input.direction,
          source: "live_demo",
        },
      });
    } catch (rzpErr: any) {
      const errorMsg = rzpErr.message || "Razorpay payment link creation failed";
      console.error("[LiveDemo] Razorpay createPaymentLink error:", rzpErr);

      await db.insert(recoveryActions).values({
        caseId: caseRow.id,
        customerId,
        type: "send_payment_link",
        payload: {
          provider: "razorpay",
          status: "failed",
          error: errorMsg,
          amountMinor,
          mode: "TEST",
        },
        status: "failed",
        resultStatus: "failed",
        resultMessage: errorMsg,
        executedAt: new Date(),
      });

      await auditService.record({
        caseId: caseRow.id,
        action: "action_failed",
        summary: `[LIVE DEMO] Razorpay TEST payment link creation failed: ${errorMsg}`,
        detail: {
          lifecycleEvent: "PAYMENT_LINK_FAILED",
          actionType: "send_payment_link",
          provider: "razorpay",
          error: errorMsg,
          amountMinor,
        },
        actor: "live_demo:action_executor",
      });

      let failedCase = freshCase;
      try {
        failedCase = await caseLifecycle.transition({
          caseId: caseRow.id,
          toState: "failed",
          reason: `Razorpay payment link creation failed: ${errorMsg}`,
          actor: "live_demo:action_executor",
        });
      } catch {}

      eventBroadcaster.broadcast("case.updated", failedCase);

      return res.status(422).json(
        jsonSafe({
          error: {
            code: "PAYMENT_LINK_CREATION_FAILED",
            message: errorMsg,
          },
          case: failedCase,
          decision: latestDecision,
          status: failedCase.currentState,
          approvalRequired: false,
          emailSent: false,
        }),
      );
    }

    // 8b. Record successful payment link creation
    await db.insert(recoveryActions).values({
      caseId: caseRow.id,
      customerId,
      type: "send_payment_link",
      payload: {
        provider: "razorpay",
        paymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url,
        referenceId: caseRow.id,
        amountMinor,
        mode: "TEST",
      },
      status: "succeeded",
      resultStatus: "succeeded",
      resultExternalReference: paymentLink.id,
      resultMessage: "Razorpay TEST payment link created",
      executedAt: new Date(),
    });

    await auditService.record({
      caseId: caseRow.id,
      action: "action_executed",
      summary: `[LIVE DEMO] Razorpay TEST payment link created.`,
      detail: {
        lifecycleEvent: "ACTION_EXECUTED",
        actionType: "send_payment_link",
        provider: "razorpay",
        paymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url,
        amountMinor,
        mode: "TEST",
      },
      actor: "live_demo:action_executor",
    });

    // 8c. Send Real Email via Resend with actual Razorpay payment link URL
    const emailContent = generateRecoveryEmail({
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      direction: input.direction,
      amountMinor,
      amountFormatted: `₹${input.amount.toLocaleString("en-IN")}`,
      actionUrl: paymentLink.short_url,
      customData: input.directionData,
    });

    const emailResult = await emailClient.send({
      to: input.customer.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      direction: input.direction,
    });

    // Check if email send failed
    if (emailResult.status === "failed") {
      const errorMsg = emailResult.error || "Unknown Resend error";

      // Record Failed Action in DB
      await db.insert(recoveryActions).values({
        caseId: caseRow.id,
        customerId,
        type: "send_email",
        payload: {
          channel: "email",
          subject: emailContent.subject,
          provider: "resend",
          recipient: input.customer.email,
          status: "failed",
          error: errorMsg,
        },
        status: "failed",
        resultStatus: "failed",
        resultMessage: errorMsg,
        executedAt: new Date(),
      });

      // Record ACTION FAILED Audit Event
      await auditService.record({
        caseId: caseRow.id,
        action: "action_failed",
        summary: `[LIVE DEMO] Recovery email failed: ${errorMsg}`,
        detail: {
          lifecycleEvent: "EMAIL_FAILED",
          actionType: "send_email",
          provider: "resend",
          recipient: input.customer.email,
          error: errorMsg,
        },
        actor: "live_demo:action_executor",
      });

      // Payment link was created but email failed — case stays in action_selected/waiting
      eventBroadcaster.broadcast("case.updated", freshCase);

      return res.status(422).json(
        jsonSafe({
          error: {
            code: "EMAIL_DELIVERY_FAILED",
            message: errorMsg,
          },
          case: freshCase,
          decision: latestDecision,
          status: freshCase.currentState,
          approvalRequired: false,
          emailSent: false,
          emailResult,
          paymentLink: {
            id: paymentLink.id,
            shortUrl: paymentLink.short_url,
            status: "created",
          },
        }),
      );
    }

    // Email Succeeded (Accepted by Resend)
    await db.insert(recoveryActions).values({
      caseId: caseRow.id,
      customerId,
      type: "send_email",
      payload: {
        channel: "email",
        subject: emailContent.subject,
        provider: "resend",
        messageId: emailResult.messageId,
        recipient: input.customer.email,
        status: "accepted",
      },
      status: "succeeded",
      resultStatus: "succeeded",
      resultExternalReference: emailResult.messageId,
      resultMessage: "Recovery email accepted by Resend",
      executedAt: new Date(),
    });

    // Record Action Execution Audit Event
    await auditService.record({
      caseId: caseRow.id,
      action: "action_executed",
      summary: `[LIVE DEMO] Recovery email accepted by Resend.`,
      detail: {
        lifecycleEvent: "ACTION_EXECUTED",
        emailStatus: "EMAIL_ACCEPTED",
        actionType: "send_email",
        provider: "resend",
        messageId: emailResult.messageId ?? null,
        recipient: input.customer.email,
      },
      actor: "live_demo:action_executor",
    });

    // Transition state to customer_action_required
    let updatedCase = freshCase;
    try {
      updatedCase = await caseLifecycle.transition({
        caseId: caseRow.id,
        toState: "customer_action_required",
        reason: "Recovery email sent; awaiting customer payment via Razorpay TEST payment link.",
        actor: "live_demo:engine",
      });
    } catch {}

    // Record Outcome Audit Event
    await auditService.record({
      caseId: caseRow.id,
      action: "outcome_received",
      summary: "Customer action required: Recovery email sent; awaiting customer payment.",
      detail: {
        lifecycleEvent: "OUTCOME_RECEIVED",
        outcomeState: "customer_action_required",
        paymentLinkId: paymentLink.id,
      },
      actor: "live_demo:engine",
    });

    eventBroadcaster.broadcast("case.updated", updatedCase);

    return ok(res, {
      case: updatedCase,
      decision: latestDecision,
      status: updatedCase.currentState,
      approvalRequired: false,
      emailSent: true,
      emailResult,
      paymentLink: {
        id: paymentLink.id,
        shortUrl: paymentLink.short_url,
        status: "created",
      },
    });
  }),
);

liveDemoRouter.post(
  "/live-demo/approve",
  asyncHandler(async (req, res) => {
    const parsed = liveDemoApproveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map((i) => i.message).join(", "),
        },
      });
    }

    const { caseId, actor } = parsed.data;

    const [caseRow] = await db
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.id, caseId))
      .limit(1);

    if (!caseRow) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Case ${caseId} not found.`,
        },
      });
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, caseRow.customerId))
      .limit(1);

    const [latestDecision] = await db
      .select()
      .from(agentDecisions)
      .where(eq(agentDecisions.caseId, caseId))
      .orderBy(desc(agentDecisions.createdAt))
      .limit(1);

    // 1. Mark decision approved
    if (latestDecision) {
      await db
        .update(agentDecisions)
        .set({
          status: "approved",
          approvedBy: actor,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentDecisions.id, latestDecision.id));
    }

    // 2. Emit APPROVAL_GRANTED Audit Event
    await auditService.record({
      caseId,
      action: "action_executed",
      summary: `Supervisor ${actor} granted authorization to execute recovery action.`,
      detail: {
        lifecycleEvent: "APPROVAL_GRANTED",
        actor,
      },
      actor: `supervisor:${actor}`,
    });

    // 3. Transition to recovering
    try {
      await caseLifecycle.transition({
        caseId,
        toState: "recovering",
        reason: `Authorized by supervisor ${actor}.`,
        actor: `supervisor:${actor}`,
      });
    } catch {}

    // 4. Create Razorpay TEST Payment Link (capped at ₹5,00,000 max link ceiling)
    const amountMinor = Number(caseRow.amountAtRiskMinor || 0);
    const MAX_RZP_LINK_AMOUNT_MINOR = 50_000_000;
    const linkAmountMinor = Math.min(amountMinor, MAX_RZP_LINK_AMOUNT_MINOR);
    const linkDesc =
      amountMinor > MAX_RZP_LINK_AMOUNT_MINOR
        ? `Recovery: ${caseRow.direction} — ${customer?.name || "Customer"} (Tranche 1 - capped at ₹5L link limit)`
        : `Recovery: ${caseRow.direction} — ${customer?.name || "Customer"}`;
    const amountRs = Math.round(amountMinor / 100);
    const targetEmail = customer?.email || "customer@example.com";

    let paymentLink: any;
    try {
      paymentLink = await razorpayClient.createPaymentLink({
        amountMinor: linkAmountMinor,
        currency: "INR",
        description: linkDesc,
        customer: {
          name: customer?.name || "Valued Customer",
          email: targetEmail,
          contact: customer?.phone || undefined,
        },
        referenceId: caseId,
        notes: {
          caseId,
          direction: caseRow.direction,
          source: "live_demo",
        },
      });
    } catch (rzpErr: any) {
      const errorMsg = rzpErr.message || "Razorpay payment link creation failed";
      console.error("[LiveDemo:Approve] Razorpay createPaymentLink error:", rzpErr);

      await db.insert(recoveryActions).values({
        caseId,
        customerId: caseRow.customerId,
        type: "send_payment_link",
        payload: {
          provider: "razorpay",
          status: "failed",
          error: errorMsg,
          amountMinor,
          mode: "TEST",
        },
        status: "failed",
        resultStatus: "failed",
        resultMessage: errorMsg,
        executedAt: new Date(),
      });

      await auditService.record({
        caseId,
        action: "action_failed",
        summary: `[LIVE DEMO] Razorpay TEST payment link creation failed: ${errorMsg}`,
        detail: {
          lifecycleEvent: "PAYMENT_LINK_FAILED",
          actionType: "send_payment_link",
          provider: "razorpay",
          error: errorMsg,
          amountMinor,
        },
        actor: "live_demo:action_executor",
      });

      let failedCase = caseRow;
      try {
        failedCase = await caseLifecycle.transition({
          caseId,
          toState: "failed",
          reason: `Razorpay payment link creation failed: ${errorMsg}`,
          actor: "live_demo:action_executor",
        });
      } catch {}

      eventBroadcaster.broadcast("case.updated", failedCase);

      return res.status(422).json(
        jsonSafe({
          error: {
            code: "PAYMENT_LINK_CREATION_FAILED",
            message: errorMsg,
          },
          case: failedCase,
          decision: latestDecision,
          status: failedCase.currentState,
          approvalRequired: false,
          emailSent: false,
        }),
      );
    }

    // 4b. Record successful payment link creation
    await db.insert(recoveryActions).values({
      caseId,
      customerId: caseRow.customerId,
      type: "send_payment_link",
      payload: {
        provider: "razorpay",
        paymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url,
        referenceId: caseId,
        amountMinor,
        mode: "TEST",
      },
      status: "succeeded",
      resultStatus: "succeeded",
      resultExternalReference: paymentLink.id,
      resultMessage: "Razorpay TEST payment link created",
      executedAt: new Date(),
    });

    await auditService.record({
      caseId,
      action: "action_executed",
      summary: `[LIVE DEMO] Razorpay TEST payment link created.`,
      detail: {
        lifecycleEvent: "ACTION_EXECUTED",
        actionType: "send_payment_link",
        provider: "razorpay",
        paymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url,
        amountMinor,
        mode: "TEST",
      },
      actor: "live_demo:action_executor",
    });

    // 5. Send Real Email via Resend with actual Razorpay payment link URL
    const emailContent = generateRecoveryEmail({
      customerName: customer?.name || "Valued Customer",
      customerEmail: targetEmail,
      direction: caseRow.direction as any,
      amountMinor,
      amountFormatted: `₹${amountRs.toLocaleString("en-IN")}`,
      actionUrl: paymentLink.short_url,
    });

    const emailResult = await emailClient.send({
      to: targetEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      direction: caseRow.direction as any,
    });

    // Handle Email Failure
    if (emailResult.status === "failed") {
      const errorMsg = emailResult.error || "Unknown Resend error";

      await db.insert(recoveryActions).values({
        caseId,
        customerId: caseRow.customerId,
        type: "send_email",
        payload: {
          channel: "email",
          subject: emailContent.subject,
          provider: "resend",
          recipient: targetEmail,
          status: "failed",
          error: errorMsg,
        },
        status: "failed",
        resultStatus: "failed",
        resultMessage: errorMsg,
        executedAt: new Date(),
      });

      await auditService.record({
        caseId,
        action: "action_failed",
        summary: `[LIVE DEMO] Recovery email failed: ${errorMsg}`,
        detail: {
          lifecycleEvent: "EMAIL_FAILED",
          actionType: "send_email",
          provider: "resend",
          recipient: targetEmail,
          error: errorMsg,
        },
        actor: "live_demo:action_executor",
      });

      // Payment link was created but email failed
      eventBroadcaster.broadcast("case.updated", caseRow);

      return res.status(422).json(
        jsonSafe({
          error: {
            code: "EMAIL_DELIVERY_FAILED",
            message: errorMsg,
          },
          case: caseRow,
          decision: latestDecision,
          status: caseRow.currentState,
          approvalRequired: false,
          emailSent: false,
          emailResult,
          paymentLink: {
            id: paymentLink.id,
            shortUrl: paymentLink.short_url,
            status: "created",
          },
        }),
      );
    }

    // 6. Record Successful Recovery Action
    await db.insert(recoveryActions).values({
      caseId,
      customerId: caseRow.customerId,
      type: "send_email",
      payload: {
        channel: "email",
        subject: emailContent.subject,
        provider: "resend",
        messageId: emailResult.messageId,
        recipient: targetEmail,
        status: "accepted",
      },
      status: "succeeded",
      resultStatus: "succeeded",
      resultExternalReference: emailResult.messageId,
      resultMessage: "Recovery email accepted by Resend",
      executedAt: new Date(),
    });

    // 7. Emit ACTION_EXECUTED Audit Event
    await auditService.record({
      caseId,
      action: "action_executed",
      summary: `[LIVE DEMO] Recovery email accepted by Resend.`,
      detail: {
        lifecycleEvent: "ACTION_EXECUTED",
        emailStatus: "EMAIL_ACCEPTED",
        actionType: "send_email",
        provider: "resend",
        messageId: emailResult.messageId ?? null,
        recipient: targetEmail,
      },
      actor: "live_demo:action_executor",
    });

    // 8. Transition to customer_action_required
    const updatedCase = await caseLifecycle.transition({
      caseId,
      toState: "customer_action_required",
      reason: "Recovery email sent following approval; awaiting customer payment via Razorpay TEST payment link.",
      actor: "live_demo:engine",
    });

    // 9. Emit OUTCOME_RECEIVED Audit Event
    await auditService.record({
      caseId,
      action: "outcome_received",
      summary: "Customer action required: Recovery email sent; awaiting customer payment.",
      detail: {
        lifecycleEvent: "OUTCOME_RECEIVED",
        outcomeState: "customer_action_required",
        paymentLinkId: paymentLink.id,
      },
      actor: "live_demo:engine",
    });

    eventBroadcaster.broadcast("case.updated", updatedCase);

    return ok(res, {
      case: updatedCase,
      decision: latestDecision,
      status: updatedCase.currentState,
      approvalRequired: false,
      emailSent: true,
      emailResult,
      paymentLink: {
        id: paymentLink.id,
        shortUrl: paymentLink.short_url,
        status: "created",
      },
    });
  }),
);
