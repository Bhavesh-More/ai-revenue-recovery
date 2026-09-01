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
  pendingReview: 12,
  approvedLast7Days: 45,
  rejectedLast7Days: 8,
  pendingRiskExposure: 1200000,
};

export const INITIAL_APPROVAL_REQUESTS: ApprovalRequest[] = [
  {
    id: 'apr-1',
    actionId: 'act-10492-1',
    caseId: 'RC-10492',
    customerName: 'Acme Corp Ltd.',
    direction: 'B2B Receivables',
    amountAtRisk: 850000,
    status: 'pending',
    risk: 'high',
    icon: 'lucide:building',
    iconBgClass: 'bg-red-50 dark:bg-red-950/40',
    iconTextClass: 'text-[#FF4444]',
    iconBorderClass: 'border-red-100 dark:border-red-900/40',
    proposedAction: {
      type: 'legal_notice',
      label: 'Send Final Legal Notice',
      icon: 'lucide:mail-warning',
    },
    escalation: {
      tag: 'High Value',
      reason: 'Amount exceeds automated policy limit (₹5L).',
      tagVariant: 'high-value',
    },
    context:
      'Customer is 45 days past due on Q3 invoice. 3 automated reminders sent via email and SMS with no response. AI predicts 82% chance of recovery if escalated to legal notice tier based on similar B2B profiles.',
    createdAt: 'Today, 09:30 AM',
  },
  {
    id: 'apr-2',
    actionId: 'act-10501-1',
    caseId: 'RC-10501',
    customerName: 'Priya Sharma',
    direction: 'Subscription Recovery',
    amountAtRisk: 14999,
    status: 'pending',
    risk: 'medium',
    icon: 'lucide:repeat',
    iconBgClass: 'bg-orange-50 dark:bg-orange-950/40',
    iconTextClass: 'text-[#F59E0B]',
    iconBorderClass: 'border-orange-100 dark:border-orange-900/40',
    proposedAction: {
      type: 'retention_discount',
      label: 'Offer 20% Retention Discount',
      icon: 'lucide:percent',
    },
    escalation: {
      tag: 'Policy Override',
      reason: 'Discount exceeds standard 10% tier.',
      tagVariant: 'policy-override',
    },
    context:
      'Customer initiated cancellation citing "too expensive". They have been active for 24 months with zero previous failed payments. LTV justifies higher discount to prevent churn.',
    createdAt: 'Today, 10:15 AM',
  },
  {
    id: 'apr-3',
    actionId: 'act-10515-1',
    caseId: 'RC-10515',
    customerName: 'Rahul Desai',
    direction: 'Hinglish Voice Recovery',
    amountAtRisk: 45000,
    status: 'pending',
    risk: 'medium',
    icon: 'lucide:mic',
    iconBgClass: 'bg-blue-50 dark:bg-blue-950/40',
    iconTextClass: 'text-[#3B82F6]',
    iconBorderClass: 'border-blue-100 dark:border-blue-900/40',
    proposedAction: {
      type: 'installment_plan',
      label: 'Accept 3-Month Installment Plan',
      icon: 'lucide:calendar-clock',
    },
    escalation: {
      tag: 'Custom Terms',
      reason: 'Promise-to-pay terms require human sign-off.',
      tagVariant: 'custom-terms',
    },
    context:
      'During automated voice call, customer cited temporary cash flow issues and requested splitting the payment into 3 equal monthly installments of ₹15,000. Voice sentiment analysis indicated high intent to pay.',
    createdAt: 'Today, 11:00 AM',
  },
];

export const INITIAL_APPROVAL_HISTORY: ApprovalHistoryItem[] = [
  {
    id: 'hist-1',
    caseId: 'RC-10488',
    actionReviewed: 'Pause recovery (Hardship)',
    status: 'approved',
    approver: 'Admin User',
    reviewedAt: 'Today, 10:42 AM',
  },
  {
    id: 'hist-2',
    caseId: 'RC-10475',
    actionReviewed: '30% Settlement Offer',
    status: 'rejected',
    approver: 'Admin User',
    reviewedAt: 'Yesterday, 14:15 PM',
  },
];

export function formatExposure(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (amount >= 1000000) {
    return `₹${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
