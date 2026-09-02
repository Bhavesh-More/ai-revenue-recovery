import type {
  ActionId,
  CaseId,
  CustomerId,
  IsoTimestamp,
  Money,
  PaymentId,
} from './common';

export type RecoveryActionType =
  | 'retry_payment'
  | 'send_payment_link'
  | 'send_resume_checkout_link'
  | 'send_email'
  | 'send_sms'
  | 'send_whatsapp'
  | 'start_voice_call'
  | 'request_payment_method_update'
  | 'record_promise'
  | 'escalate_to_human'
  | 'stop_case'
  | 'schedule_retry';

export type ActionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export interface ActionResult {
  status: ActionStatus;
  // Provider/external reference — e.g. payment link id, message id.
  externalReference?: string;
  message?: string;
  observedAt: IsoTimestamp;
}

export interface RecoveryActionPayload {
  paymentId?: PaymentId;
  amount?: Money;
  config?: Record<string, string | number | boolean>;
}

export interface RecoveryAction {
  id: ActionId;
  caseId: CaseId;
  customerId: CustomerId;
  type: RecoveryActionType;
  status: ActionStatus;
  // Was human approval required and obtained?
  requiredApproval: boolean;
  approvedAt?: IsoTimestamp;
  approvedBy?: string;
  payload: RecoveryActionPayload;
  result?: ActionResult;
  scheduledFor?: IsoTimestamp;
  executedAt?: IsoTimestamp;
  createdAt: IsoTimestamp;
}
