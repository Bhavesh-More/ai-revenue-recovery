import type { RecoveryDirectionCode } from "@recovery/types";
import type { RevenueEventPayload } from "./schemas.js";

// Map every event type to the direction the case will be opened against.
export function directionForEvent(
  type: RevenueEventPayload["type"],
): RecoveryDirectionCode {
  switch (type) {
    case "payment.failed":
    case "payment.succeeded":
      return "01_payment_degradation";
    case "checkout.abandoned":
      return "02_checkout_dropoff";
    case "subscription.renewal_failed":
      return "03_failed_subscription";
    case "invoice.overdue":
      return "04_b2b_receivables";
    case "mandate.failed":
      return "05_mandate_retry";
    case "customer.responded":
    case "promise.created":
    case "promise.due":
    case "promise.broken":
    case "promise.fulfilled":
      return "07_promise_to_pay";
  }
}
