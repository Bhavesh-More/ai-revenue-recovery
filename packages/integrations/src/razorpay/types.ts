export interface RazorpayCustomerInfo {
  name: string;
  email?: string;
  contact?: string;
}

export interface CreatePaymentLinkInput {
  amountMinor: number;
  currency?: string;
  description: string;
  customer: RazorpayCustomerInfo;
  referenceId?: string;
  expireBy?: number;
  callbackUrl?: string;
  notes?: Record<string, string>;
}

export interface RazorpayPaymentLink {
  id: string;
  entity: 'payment_link';
  short_url: string;
  status: 'created' | 'partially_paid' | 'paid' | 'cancelled' | 'expired';
  amount: number;
  amount_paid: number;
  currency: string;
  customer?: RazorpayCustomerInfo;
  description: string;
  reference_id?: string;
  created_at: number;
  notes?: Record<string, string>;
}

export interface RazorpayPaymentDetails {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id?: string;
  invoice_id?: string;
  international: boolean;
  method: 'card' | 'netbanking' | 'wallet' | 'emi' | 'upi';
  amount_refunded: number;
  refund_status?: string;
  captured: boolean;
  description?: string;
  card_id?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  email?: string;
  contact?: string;
  error_code?: string;
  error_description?: string;
  error_source?: string;
  error_step?: string;
  error_reason?: string;
  created_at: number;
}

export interface RazorpaySubscription {
  id: string;
  entity: 'subscription';
  plan_id: string;
  customer_id: string;
  status: 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'cancelled' | 'completed';
  current_start?: number;
  current_end?: number;
  ended_at?: number;
  quantity: number;
  notes?: Record<string, string>;
  created_at: number;
}

export type RazorpayEventType =
  | 'payment.authorized'
  | 'payment.failed'
  | 'payment.captured'
  | 'payment.dispute.created'
  | 'payment.dispute.won'
  | 'payment.dispute.lost'
  | 'payment.dispute.closed'
  | 'payment.dispute.under_review'
  | 'payment.dispute.action_required'
  | 'payment.downtime.started'
  | 'payment.downtime.updated'
  | 'payment.downtime.resolved'
  | 'order.paid'
  | 'order.notification.delivered'
  | 'order.notification.failed'
  | 'invoice.paid'
  | 'invoice.partially_paid'
  | 'invoice.expired'
  | 'settlement.processed'
  | 'refund.speed_changed'
  | 'refund.processed'
  | 'refund.failed'
  | 'refund.created'
  | 'payment_link.paid'
  | 'payment_link.partially_paid'
  | 'payment_link.expired'
  | 'payment_link.cancelled'
  | string;

export interface RazorpayWebhookEvent {
  event: RazorpayEventType;
  payload: {
    payment?: {
      entity: RazorpayPaymentDetails;
    };
    payment_link?: {
      entity: RazorpayPaymentLink;
    };
    subscription?: {
      entity: RazorpaySubscription;
    };
    order?: {
      entity: Record<string, unknown>;
    };
    invoice?: {
      entity: Record<string, unknown>;
    };
    downtime?: {
      entity: Record<string, unknown>;
    };
    [key: string]: unknown;
  };
  created_at: number;
  account_id?: string;
}
