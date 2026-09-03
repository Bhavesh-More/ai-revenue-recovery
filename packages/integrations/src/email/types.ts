import type { RecoveryDirectionCode } from "@recovery/types";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  direction?: RecoveryDirectionCode;
  metadata?: Record<string, unknown>;
}

export interface EmailResult {
  id?: string;
  messageId?: string;
  status: "accepted" | "sent" | "failed" | "simulated";
  provider: "resend" | "mock";
  to: string;
  subject: string;
  acceptedAt?: string;
  deliveredAt?: string;
  error?: string;
}

export interface EmailTemplateContext {
  customerName: string;
  customerEmail: string;
  direction: RecoveryDirectionCode;
  amountMinor: number;
  amountFormatted: string;
  currency?: string;
  actionUrl?: string;
  customData?: Record<string, unknown>;
}
