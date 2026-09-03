import type { EmailTemplateContext } from "./types.js";

function baseEmailWrapper(title: string, innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 24px; color: #1a1a1a; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #111827; padding: 24px 32px; color: #ffffff; display: flex; align-items: center; justify-content: space-between; }
    .header h1 { font-size: 18px; margin: 0; font-weight: 700; letter-spacing: -0.02em; }
    .badge { background: #2563eb; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; }
    .content { padding: 32px; }
    .amount-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; margin: 24px 0; text-align: center; }
    .amount-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .amount-val { font-size: 28px; font-weight: 800; color: #111827; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-weight: 700; font-size: 14px; border-radius: 8px; margin-top: 12px; text-align: center; }
    .btn:hover { background: #1d4ed8; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 32px; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RevRecovery AI</h1>
      <span class="badge">Live Recovery</span>
    </div>
    <div class="content">
      ${innerHtml}
    </div>
    <div class="footer">
      This is an automated recovery message from RevRecovery AI Platform.<br/>
      Need assistance? Contact support@revrecovery.internal
    </div>
  </div>
</body>
</html>`;
}

export function generateRecoveryEmail(ctx: EmailTemplateContext): { subject: string; html: string; text: string } {
  const { customerName, direction, amountFormatted, actionUrl = "https://checkout.razorpay.com/pay", customData } = ctx;

  switch (direction) {
    case "01_payment_degradation": {
      const subject = `Action Required: Instant Payment Retry for ${customerName}`;
      const html = baseEmailWrapper(
        subject,
        `<h2>Payment Gateway Downtime Resolved</h2>
        <p>Dear ${customerName},</p>
        <p>We noticed your recent payment attempt experienced a temporary banking gateway timeout. Our automated traffic monitoring indicates optimal routing is now restored.</p>
        <div class="amount-box">
          <div class="amount-label">Pending Recovery Amount</div>
          <div class="amount-val">${amountFormatted}</div>
        </div>
        <p>Please complete your payment safely through our verified secondary route:</p>
        <div style="text-align: center;">
          <a href="${actionUrl}" class="btn">Retry Payment Now</a>
        </div>`,
      );
      const text = `Dear ${customerName},\nYour payment of ${amountFormatted} failed due to temporary bank degradation. Please retry here: ${actionUrl}`;
      return { subject, html, text };
    }

    case "02_checkout_dropoff": {
      const subject = `Complete Your Order: We saved your cart, ${customerName}!`;
      const html = baseEmailWrapper(
        subject,
        `<h2>Your Cart is Waiting for You</h2>
        <p>Hi ${customerName},</p>
        <p>You left items in your shopping cart before completing checkout. We have reserved your items so you can easily resume where you left off.</p>
        <div class="amount-box">
          <div class="amount-label">Cart Total</div>
          <div class="amount-val">${amountFormatted}</div>
        </div>
        <p>Click below to restore your checkout session with pre-filled details:</p>
        <div style="text-align: center;">
          <a href="${actionUrl}" class="btn">Resume Checkout</a>
        </div>`,
      );
      const text = `Hi ${customerName},\nYour cart of ${amountFormatted} is waiting. Resume checkout here: ${actionUrl}`;
      return { subject, html, text };
    }

    case "03_failed_subscription": {
      const subject = `Important: Update Payment Method for Subscription Renewal`;
      const html = baseEmailWrapper(
        subject,
        `<h2>Subscription Renewal Notice</h2>
        <p>Dear ${customerName},</p>
        <p>We were unable to process your recurring subscription renewal due to an issue with your card on file. Your access is currently preserved under your active grace period.</p>
        <div class="amount-box">
          <div class="amount-label">Subscription Dues</div>
          <div class="amount-val">${amountFormatted}</div>
        </div>
        <p>To avoid any interruption to your service, please update your payment details or clear the pending invoice:</p>
        <div style="text-align: center;">
          <a href="${actionUrl}" class="btn">Update Payment Details</a>
        </div>`,
      );
      const text = `Dear ${customerName},\nYour subscription renewal of ${amountFormatted} failed. Please update payment details here: ${actionUrl}`;
      return { subject, html, text };
    }

    case "04_b2b_receivables": {
      const subject = `Notice: Outstanding Invoice Payment Due — ${customerName}`;
      const html = baseEmailWrapper(
        subject,
        `<h2>Outstanding Commercial Invoice</h2>
        <p>Dear Accounts Team / ${customerName},</p>
        <p>This is a reminder regarding your overdue commercial invoice. Our automated accounts receivable tracker has flagged this item for prompt settlement.</p>
        <div class="amount-box">
          <div class="amount-label">Outstanding Invoice Balance</div>
          <div class="amount-val">${amountFormatted}</div>
        </div>
        <p>Please remit payment via corporate bank transfer or direct online settlement:</p>
        <div style="text-align: center;">
          <a href="${actionUrl}" class="btn">View & Pay Invoice</a>
        </div>`,
      );
      const text = `Dear ${customerName},\nYour outstanding invoice of ${amountFormatted} is overdue. Please settle here: ${actionUrl}`;
      return { subject, html, text };
    }

    case "05_mandate_retry": {
      const subject = `Auto-Debit Notice: Mandate Payment Update for ${customerName}`;
      const html = baseEmailWrapper(
        subject,
        `<h2>Recurring Mandate Notification</h2>
        <p>Dear ${customerName},</p>
        <p>Your scheduled auto-debit mandate could not be processed during the current processing cycle. Our sequencer is queuing a secondary debit window.</p>
        <div class="amount-box">
          <div class="amount-label">Scheduled Debit Amount</div>
          <div class="amount-val">${amountFormatted}</div>
        </div>
        <p>You may also authorize an immediate one-time payment to clear the pending balance:</p>
        <div style="text-align: center;">
          <a href="${actionUrl}" class="btn">Clear Mandate Dues</a>
        </div>`,
      );
      const text = `Dear ${customerName},\nYour mandate debit of ${amountFormatted} could not be processed. Settle directly here: ${actionUrl}`;
      return { subject, html, text };
    }

    case "06_hinglish_voice": {
      const subject = `Follow-up: Recovery Summary & Payment Link for ${customerName}`;
      const html = baseEmailWrapper(
        subject,
        `<h2>Voice Recovery Follow-Up</h2>
        <p>Namaste ${customerName},</p>
        <p>Thank you for speaking with our automated AI voice assistant regarding your pending account payment. As discussed during the call, here is your direct payment link to complete settlement.</p>
        <div class="amount-box">
          <div class="amount-label">Agreed Amount</div>
          <div class="amount-val">${amountFormatted}</div>
        </div>
        <p>Aap niche diye gaye button par click karke turant UPI ya Card se payment complete kar sakte hain:</p>
        <div style="text-align: center;">
          <a href="${actionUrl}" class="btn">Pay Now / Turant Pay Karein</a>
        </div>`,
      );
      const text = `Namaste ${customerName},\nAs discussed on call, please complete your pending payment of ${amountFormatted} here: ${actionUrl}`;
      return { subject, html, text };
    }

    case "07_promise_to_pay": {
      const promisedDate = (customData as any)?.promisedDate || "your scheduled payment date";
      const subject = `Confirmation: Promise-to-Pay Commitment for ${customerName} (${amountFormatted})`;
      const html = baseEmailWrapper(
        subject,
        `<h2>Payment Commitment Registered</h2>
        <p>Dear ${customerName},</p>
        <p>Thank you for confirming your payment commitment. We have officially registered your promise to pay by <strong>${promisedDate}</strong> and paused automated escalation notices.</p>
        <div class="amount-box">
          <div class="amount-label">Committed Balance Due by ${promisedDate}</div>
          <div class="amount-val">${amountFormatted}</div>
        </div>
        <p>Please use the secure payment link below to fulfill your payment on or before ${promisedDate}:</p>
        <div style="text-align: center;">
          <a href="${actionUrl}" class="btn">Fulfill Payment Commitment</a>
        </div>
        <p style="margin-top: 20px; font-size: 13px; color: #64748b;">If you have already initiated this transfer, please allow standard banking clearance time.</p>`,
      );
      const text = `Dear ${customerName},\nYour promise-to-pay commitment for ${amountFormatted} due on ${promisedDate} has been confirmed. Settle securely here: ${actionUrl}`;
      return { subject, html, text };
    }

    default: {
      const subject = `Action Required: Payment Recovery Notice for ${customerName}`;
      const html = baseEmailWrapper(
        subject,
        `<h2>Payment Recovery Notice</h2>
        <p>Dear ${customerName},</p>
        <p>We require your attention regarding a pending payment on your account.</p>
        <div class="amount-box">
          <div class="amount-label">Pending Amount</div>
          <div class="amount-val">${amountFormatted}</div>
        </div>
        <div style="text-align: center;">
          <a href="${actionUrl}" class="btn">Complete Payment</a>
        </div>`,
      );
      const text = `Dear ${customerName},\nPending payment of ${amountFormatted}. Pay here: ${actionUrl}`;
      return { subject, html, text };
    }
  }
}
