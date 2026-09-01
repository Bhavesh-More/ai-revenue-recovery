export type BatchStatus =
  | 'idle'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'stopped';

export interface FailureDistributionItem {
  name: string;
  percentage: number;
  colorClass: string;
}

export interface BatchScenario {
  id: string;
  name: string;
  direction: string;
  defaultBatchSize: number;
  defaultAvgPayment: number;
  failureDistribution: FailureDistributionItem[];
}

export interface LiveIngestionEvent {
  eventId: string;
  source: string;
  customerId: string;
  customerName: string;
  paymentId: string;
  direction: string;
  amount: number;
  failureReason: string;
  occurredAt: string;
}

export interface BatchMetrics {
  totalCases: number;
  processedCases: number;
  recoveredCases: number;
  waitingCases: number;
  escalatedCases: number;
  stoppedCases: number;
  failedCases: number;
  progress: number;
}

export interface BatchActivityEvent {
  id: string;
  caseNumber: string;
  tag: string;
  time: string;
  description: string;
  highlightText?: string;
  highlightColor?: 'green' | 'red' | 'orange' | 'blue' | 'normal';
  icon: string;
  iconBgClass: string;
  iconTextClass: string;
}

export interface BatchProjectedResults {
  riskRevenue: number;
  recoveredRevenue: number;
  recoveryRate: number;
  byIntervention: {
    paymentLink: number;
    systemRetry: number;
    reminder: number;
    customerAction: number;
    humanEscalation: number;
  };
}

export interface Batch {
  id: string;
  scenario: BatchScenario;
  status: BatchStatus;
  metrics: BatchMetrics;
  projectedResults: BatchProjectedResults;
  activity: BatchActivityEvent[];
}

export const EVENT_SOURCES = [
  'Razorpay Webhook',
  'Stripe Webhook',
  'Direct Gateway API',
  'Custom Ingest Pipeline',
] as const;

export const FAILURE_REASONS = [
  'Expired Card',
  'Insufficient Funds',
  'Bank Decline',
  'Authentication Failed',
  'Gateway Timeout',
  'Mandate Inactive',
] as const;

export const RECOVERY_DIRECTIONS = [
  'Subscription Recovery',
  'Payment Degradation',
  'Checkout Recovery',
  'B2B Receivables',
  'Mandate Retry',
  'Hinglish Voice',
  'Promise-to-Pay',
] as const;

export const BATCH_SCENARIOS: BatchScenario[] = [
  {
    id: 'august_billing',
    name: 'August Billing Failure',
    direction: 'Subscription Recovery',
    defaultBatchSize: 1000,
    defaultAvgPayment: 2500,
    failureDistribution: [
      { name: 'Expired Card', percentage: 45, colorClass: 'bg-[#3B82F6]' },
      { name: 'Insufficient Funds', percentage: 30, colorClass: 'bg-[#F59E0B]' },
      { name: 'Bank Decline', percentage: 15, colorClass: 'bg-[#FF4444]' },
      { name: 'Other', percentage: 10, colorClass: 'bg-[#8C8C8C]' },
    ],
  },
  {
    id: 'checkout_abandonment',
    name: 'Holiday Checkout Drop-off',
    direction: 'Checkout Recovery',
    defaultBatchSize: 800,
    defaultAvgPayment: 14500,
    failureDistribution: [
      { name: 'Cart Abandoned', percentage: 50, colorClass: 'bg-[#3B82F6]' },
      { name: 'UPI Timeout', percentage: 30, colorClass: 'bg-[#F59E0B]' },
      { name: 'Gateway Drop', percentage: 15, colorClass: 'bg-[#FF4444]' },
      { name: 'Other', percentage: 5, colorClass: 'bg-[#8C8C8C]' },
    ],
  },
  {
    id: 'payment_degradation',
    name: 'Peak Payment Degradation Surge',
    direction: 'Payment Degradation',
    defaultBatchSize: 1200,
    defaultAvgPayment: 1999,
    failureDistribution: [
      { name: 'Bank Decline', percentage: 55, colorClass: 'bg-[#FF4444]' },
      { name: 'Network Timeout', percentage: 25, colorClass: 'bg-[#F59E0B]' },
      { name: 'Card Error', percentage: 15, colorClass: 'bg-[#3B82F6]' },
      { name: 'Other', percentage: 5, colorClass: 'bg-[#8C8C8C]' },
    ],
  },
  {
    id: 'b2b_receivables',
    name: 'Q3 Enterprise Receivables Aging',
    direction: 'B2B Receivables',
    defaultBatchSize: 150,
    defaultAvgPayment: 850000,
    failureDistribution: [
      { name: 'Overdue >45d', percentage: 60, colorClass: 'bg-[#FF4444]' },
      { name: 'Dispute / Review', percentage: 25, colorClass: 'bg-[#F59E0B]' },
      { name: 'Credit Hold', percentage: 15, colorClass: 'bg-[#3B82F6]' },
    ],
  },
];

export const INITIAL_BATCH_DATA: Batch = {
  id: 'BATCH-20260823-001',
  scenario: BATCH_SCENARIOS[0],
  status: 'processing',
  metrics: {
    totalCases: 1000,
    processedCases: 782,
    recoveredCases: 341,
    waitingCases: 219,
    escalatedCases: 34,
    stoppedCases: 177,
    failedCases: 11,
    progress: 78.2,
  },
  projectedResults: {
    riskRevenue: 4270000,
    recoveredRevenue: 1840000,
    recoveryRate: 43.1,
    byIntervention: {
      paymentLink: 620000,
      systemRetry: 510000,
      reminder: 280000,
      customerAction: 210000,
      humanEscalation: 220000,
    },
  },
  activity: [
    {
      id: '1',
      caseNumber: 'Case #395',
      tag: 'Repeated failure',
      time: 'Just now',
      description: 'Recovery stopped per policy limits.',
      highlightText: 'stopped',
      highlightColor: 'normal',
      icon: 'lucide:stop-circle',
      iconBgClass: 'bg-[#F0F2F5] dark:bg-[#131416]',
      iconTextClass: 'text-[#8C8C8C] dark:text-[#6B7280]',
    },
    {
      id: '2',
      caseNumber: 'Case #394',
      tag: 'Payment successful',
      time: '12s ago',
      description: 'Payment recovered:',
      highlightText: '₹7,999',
      highlightColor: 'green',
      icon: 'lucide:check',
      iconBgClass: 'bg-[#00B074]/10 dark:bg-[#00B074]/20 border border-[#00B074]/30',
      iconTextClass: 'text-[#00B074]',
    },
    {
      id: '3',
      caseNumber: 'Case #393',
      tag: 'High-value customer',
      time: '45s ago',
      description: 'Escalated:',
      highlightText: 'Human approval required',
      highlightColor: 'orange',
      icon: 'lucide:user-cog',
      iconBgClass: 'bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20 border border-[#F59E0B]/30',
      iconTextClass: 'text-[#F59E0B]',
    },
    {
      id: '4',
      caseNumber: 'Case #392',
      tag: 'Insufficient funds',
      time: '1m ago',
      description: 'Action selected:',
      highlightText: 'Retry scheduled',
      highlightColor: 'blue',
      icon: 'lucide:refresh-ccw',
      iconBgClass: 'bg-[#3B82F6]/10 dark:bg-[#3B82F6]/20 border border-[#3B82F6]/30',
      iconTextClass: 'text-[#3B82F6]',
    },
    {
      id: '5',
      caseNumber: 'Case #391',
      tag: 'Expired card',
      time: '2m ago',
      description: 'Action selected:',
      highlightText: 'Payment link generated',
      highlightColor: 'blue',
      icon: 'lucide:link',
      iconBgClass: 'bg-[#3B82F6]/10 dark:bg-[#3B82F6]/20 border border-[#3B82F6]/30',
      iconTextClass: 'text-[#3B82F6]',
    },
  ],
};

export function formatLakhs(amount: number): string {
  const inLakhs = amount / 100000;
  return `₹${inLakhs.toFixed(1)}L`;
}
