import { registerAgentTool } from "../tool-registry.js";
import { sendEmailTool } from "./send-email.js";
import { sendSmsTool } from "./send-sms.js";
import { sendWhatsappTool } from "./send-whatsapp.js";
import { retryPaymentTool } from "./retry-payment.js";
import { scheduleRetryTool } from "./schedule-retry.js";
import { sendPaymentLinkTool } from "./send-payment-link.js";
import { requestPaymentMethodUpdateTool } from "./request-payment-method-update.js";
import { recordPromiseTool } from "./record-promise.js";
import { escalateToHumanTool } from "./escalate-to-human.js";
import { stopCaseTool } from "./stop-case.js";

let registered = false;

export function registerDefaultAgentTools(): void {
  if (registered) return;
  registered = true;

  registerAgentTool(sendEmailTool);
  registerAgentTool(sendSmsTool);
  registerAgentTool(sendWhatsappTool);
  registerAgentTool(retryPaymentTool);
  registerAgentTool(scheduleRetryTool);
  registerAgentTool(sendPaymentLinkTool);
  registerAgentTool(requestPaymentMethodUpdateTool);
  registerAgentTool(recordPromiseTool);
  registerAgentTool(escalateToHumanTool);
  registerAgentTool(stopCaseTool);
}
