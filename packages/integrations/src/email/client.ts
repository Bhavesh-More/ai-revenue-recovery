import type { SendEmailOptions, EmailResult } from "./types.js";

export class EmailClient {
  /**
   * Send a real email using Resend API.
   * If RESEND_API_KEY is not configured or Resend fails, returns an explicit failed status.
   */
  public async send(options: SendEmailOptions): Promise<EmailResult> {
    const rawKey = process.env.RESEND_API_KEY;
    const apiKey = rawKey ? rawKey.replace(/^["']|["']$/g, "").trim() : null;

    const rawFrom = process.env.EMAIL_FROM;
    const fromAddress = rawFrom
      ? rawFrom.replace(/^["']|["']$/g, "").trim()
      : "RevRecovery AI <onboarding@resend.dev>";

    if (!apiKey) {
      console.warn("[EmailClient] Missing RESEND_API_KEY in environment.");
      return {
        status: "failed",
        provider: "resend",
        to: options.to,
        subject: options.subject,
        error: "RESEND_API_KEY environment variable is not configured on the backend.",
      };
    }

    const timestamp = new Date().toISOString();

    try {
      const payload = {
        from: options.from || fromAddress,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      };

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as {
          message?: string;
          name?: string;
          statusCode?: number;
        };
        const errorMsg =
          errData?.message ||
          res.statusText ||
          `Resend API request failed with HTTP ${res.status}`;

        console.error(`[EmailClient] Resend rejected email to ${options.to}:`, errorMsg);

        return {
          status: "failed",
          provider: "resend",
          to: options.to,
          subject: options.subject,
          error: errorMsg,
        };
      }

      const data = (await res.json()) as { id: string };
      console.log(
        `[EmailClient] Email accepted by Resend for ${options.to}. Message ID: ${data.id}`,
      );

      return {
        id: data.id,
        messageId: data.id,
        status: "accepted",
        provider: "resend",
        to: options.to,
        subject: options.subject,
        acceptedAt: timestamp,
      };
    } catch (err: any) {
      console.error("[EmailClient] Network failure communicating with Resend:", err);
      return {
        status: "failed",
        provider: "resend",
        to: options.to,
        subject: options.subject,
        error: err?.message || "Network failure connecting to Resend API.",
      };
    }
  }
}

export const emailClient = new EmailClient();
