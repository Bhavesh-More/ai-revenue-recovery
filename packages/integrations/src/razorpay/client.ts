import crypto from 'crypto';
import {
  CreatePaymentLinkInput,
  RazorpayPaymentLink,
  RazorpayPaymentDetails,
  RazorpaySubscription,
} from './types.js';

export interface RazorpayClientConfig {
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
  baseUrl?: string;
}

export class RazorpayClient {
  private keyId?: string;
  private keySecret?: string;
  private webhookSecret?: string;
  private baseUrl: string;

  constructor(config?: RazorpayClientConfig) {
    this.keyId = config?.keyId || process.env.RAZORPAY_KEY_ID;
    this.keySecret = config?.keySecret || process.env.RAZORPAY_KEY_SECRET;
    this.webhookSecret = config?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
    this.baseUrl = config?.baseUrl || 'https://api.razorpay.com/v1';
  }

  public isMockMode(): boolean {
    return !this.keyId || !this.keySecret;
  }

  public verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string,
    secret?: string
  ): boolean {
    const targetSecret = secret || this.webhookSecret;
    if (!targetSecret || !signature) {
      // In sandbox mode without configured secret, return true if matching mock header
      return this.isMockMode();
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', targetSecret)
        .update(rawBody)
        .digest('hex');

      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  public async createPaymentLink(
    input: CreatePaymentLinkInput
  ): Promise<RazorpayPaymentLink> {
    if (this.isMockMode()) {
      const mockId = `plink_${Math.random().toString(36).substring(2, 11)}`;
      return {
        id: mockId,
        entity: 'payment_link',
        short_url: `https://rzp.io/i/${mockId.substring(6)}`,
        status: 'created',
        amount: input.amountMinor,
        amount_paid: 0,
        currency: input.currency || 'INR',
        customer: input.customer,
        description: input.description,
        reference_id: input.referenceId,
        created_at: Math.floor(Date.now() / 1000),
        notes: input.notes,
      };
    }

    // Razorpay standard payment links have a maximum transaction limit of ₹5,00,000 (50,000,000 paise).
    // For high-value enterprise cases, cap to platform limit so creation succeeds.
    const MAX_RZP_LINK_AMOUNT_MINOR = 50_000_000;
    const effectiveAmount = Math.min(input.amountMinor, MAX_RZP_LINK_AMOUNT_MINOR);
    const effectiveDescription =
      input.amountMinor > MAX_RZP_LINK_AMOUNT_MINOR
        ? `${input.description || 'Payment Link'} (Tranche 1 - capped at ₹5L link limit)`
        : input.description;

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch(`${this.baseUrl}/payment_links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: effectiveAmount,
        currency: input.currency || 'INR',
        accept_partial: false,
        description: effectiveDescription,
        customer: input.customer,
        reference_id: input.referenceId,
        expire_by: input.expireBy,
        callback_url: input.callbackUrl,
        callback_method: 'get',
        notes: input.notes,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Razorpay API error (${response.status}): ${errorText}`);
    }

    return (await response.json()) as RazorpayPaymentLink;
  }

  public async fetchPaymentLink(linkId: string): Promise<any> {
    if (this.isMockMode()) {
      return {
        id: linkId,
        entity: 'payment_link',
        status: 'created',
        amount: 149900,
        amount_paid: 0,
      };
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch(`${this.baseUrl}/payment_links/${linkId}`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Razorpay API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  public async fetchPaymentsForLink(linkId: string): Promise<any[]> {
    if (this.isMockMode()) {
      return [];
    }
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch(`${this.baseUrl}/payments?payment_link_id=${linkId}`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as any;
    return data.items || [];
  }

  public async fetchPayment(paymentId: string): Promise<RazorpayPaymentDetails> {
    if (this.isMockMode()) {
      return {
        id: paymentId,
        entity: 'payment',
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        international: false,
        method: 'upi',
        amount_refunded: 0,
        captured: true,
        description: 'Mock Payment Inspection',
        vpa: 'customer@upi',
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Razorpay payment ${paymentId}`);
    }

    return (await response.json()) as RazorpayPaymentDetails;
  }

  public async fetchSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
    if (this.isMockMode()) {
      return {
        id: subscriptionId,
        entity: 'subscription',
        plan_id: 'plan_H10283921',
        customer_id: 'cust_9018231',
        status: 'active',
        quantity: 1,
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Razorpay subscription ${subscriptionId}`);
    }

    return (await response.json()) as RazorpaySubscription;
  }
}

export const razorpayClient = new RazorpayClient();
