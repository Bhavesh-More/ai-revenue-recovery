export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'info-requested';

export type ApprovalRisk = 'critical' | 'high' | 'medium' | 'low';

export type ApprovalDirection =
  | 'B2B Receivables'
  | 'Subscription Recovery'
  | 'Hinglish Voice Recovery'
  | 'Payment Degradation'
  | 'Checkout Recovery'
  | 'Mandate Retry'
  | 'Promise-to-Pay';

export type ApprovalFilter = 'all' | 'high-risk' | 'subscription' | 'b2b';

export interface ApprovalProposedAction {
  type: string;
  label: string;
  icon: string;
}

export interface ApprovalEscalation {
  tag: string;
  reason: string;
  tagVariant: 'high-value' | 'policy-override' | 'custom-terms';
}

export interface ApprovalRequest {
  id: string;
  actionId: string;
  caseId: string;
  customerName: string;
  direction: ApprovalDirection;
  amountAtRisk: number;
  status: ApprovalStatus;
  risk: ApprovalRisk;
  proposedAction: ApprovalProposedAction;
  escalation: ApprovalEscalation;
  context: string;
  icon: string;
  iconBgClass: string;
  iconTextClass: string;
  iconBorderClass: string;
  infoRequested?: boolean;
  createdAt?: string;
}

export interface ApprovalHistoryItem {
  id: string;
  caseId: string;
  actionReviewed: string;
  status: 'approved' | 'rejected';
  approver: string;
  reviewedAt: string;
}

export interface ApprovalMetrics {
  pendingReview: number;
  approvedLast7Days: number;
  rejectedLast7Days: number;
  pendingRiskExposure: number;
}

export const INITIAL_APPROVAL_METRICS: ApprovalMetrics = {
  pendingReview: 0,
  approvedLast7Days: 0,
  rejectedLast7Days: 0,
  pendingRiskExposure: 0,
};

export const INITIAL_APPROVAL_REQUESTS: ApprovalRequest[] = [];

export const INITIAL_APPROVAL_HISTORY: ApprovalHistoryItem[] = [];

export function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatExposure(amount: number): string {
  return formatCurrency(amount);
}
