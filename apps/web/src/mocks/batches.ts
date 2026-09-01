export type BatchStatus =
  | 'idle'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'stopped';

export type GenerationMode = 'single' | 'mixed';

export interface DirectionDistributionItem {
  name: string;
  percentage: number;
  colorClass: string;
}

export interface SyntheticBatchConfig {
  batchName: string;
  generationMode: GenerationMode;
  singleDirection?: string;
  numberOfCases: number;
  dateRangePreset: '24h' | '7d' | '30d' | 'custom';
  startDate?: string;
  endDate?: string;
  minAmount: number;
  maxAmount: number;
  customerContext: {
    behavioralHistory: boolean;
    multiChannelTouchpoints: boolean;
    riskTelemetry: boolean;
  };
  edgeCases: {
    hardshipClaims: boolean;
    highExposureOverrides: boolean;
    repeatedDegradationSurge: boolean;
    disputedCharges: boolean;
  };
  generateGroundTruth: boolean;
  randomSeed: number;
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
  direction: string;
  scenarioName: string;
  status: BatchStatus;
  metrics: BatchMetrics;
  projectedResults: BatchProjectedResults;
  activity: BatchActivityEvent[];
  config?: SyntheticBatchConfig;
}

export const RECOVERY_DIRECTIONS_OPTIONS = [
  'Subscription Recovery',
  'Payment Degradation',
  'Checkout Abandonment',
  'B2B Receivables',
  'Mandate Retry',
  'Hinglish Voice',
  'Promise-to-Pay',
] as const;

export const MIXED_DIRECTION_DISTRIBUTION: DirectionDistributionItem[] = [
  { name: 'Subscription Inactive / Expiry', percentage: 35, colorClass: 'bg-[#3B82F6]' },
  { name: 'Payment Gateway Degradation', percentage: 25, colorClass: 'bg-[#F59E0B]' },
  { name: 'Checkout Abandonment', percentage: 20, colorClass: 'bg-[#00B074]' },
  { name: 'Mandate Retry Drops', percentage: 10, colorClass: 'bg-[#8B5CF6]' },
  { name: 'B2B Overdue Receivables', percentage: 10, colorClass: 'bg-[#EC4899]' },
];

export const SINGLE_DIRECTION_DISTRIBUTIONS: Record<string, DirectionDistributionItem[]> = {
  'Subscription Recovery': [
    { name: 'Expired Card Token', percentage: 45, colorClass: 'bg-[#3B82F6]' },
    { name: 'Insufficient Balance', percentage: 30, colorClass: 'bg-[#F59E0B]' },
    { name: 'Bank Authentication Fail', percentage: 15, colorClass: 'bg-[#FF4444]' },
    { name: 'Issuer Network Drop', percentage: 10, colorClass: 'bg-[#8C8C8C]' },
  ],
  'Payment Degradation': [
    { name: 'UPI Gateway Latency', percentage: 40, colorClass: 'bg-[#F59E0B]' },
    { name: 'Acquirer Switch Timeout', percentage: 30, colorClass: 'bg-[#FF4444]' },
    { name: 'OTP Delivery Failure', percentage: 20, colorClass: 'bg-[#3B82F6]' },
    { name: 'Session Expired', percentage: 10, colorClass: 'bg-[#8C8C8C]' },
  ],
  'Checkout Abandonment': [
    { name: 'Payment Page Abandoned', percentage: 50, colorClass: 'bg-[#00B074]' },
    { name: 'Payment Method Unavailable', percentage: 25, colorClass: 'bg-[#3B82F6]' },
    { name: 'Promo Code Invalidation', percentage: 15, colorClass: 'bg-[#F59E0B]' },
    { name: 'Price Shock / Shipping Drop', percentage: 10, colorClass: 'bg-[#8C8C8C]' },
  ],
  'B2B Receivables': [
    { name: 'Overdue >30 Days (Net-30)', percentage: 50, colorClass: 'bg-[#EC4899]' },
    { name: 'PO Mismatch / Disputed Item', percentage: 25, colorClass: 'bg-[#F59E0B]' },
    { name: 'Pending Sign-off', percentage: 15, colorClass: 'bg-[#3B82F6]' },
    { name: 'Credit Limit Hold', percentage: 10, colorClass: 'bg-[#FF4444]' },
  ],
  'Mandate Retry': [
    { name: 'E-Mandate Mandate Dropped', percentage: 45, colorClass: 'bg-[#8B5CF6]' },
    { name: 'Account Balance Low on Debit Day', percentage: 35, colorClass: 'bg-[#F59E0B]' },
    { name: 'Customer Revoked Mandate', percentage: 20, colorClass: 'bg-[#FF4444]' },
  ],
  'Hinglish Voice': [
    { name: 'High-Intent Callback Requested', percentage: 40, colorClass: 'bg-[#00B074]' },
    { name: 'Temporary Cash Crunch (Installment Request)', percentage: 35, colorClass: 'bg-[#3B82F6]' },
    { name: 'Disputed Invoice Charges', percentage: 25, colorClass: 'bg-[#F59E0B]' },
  ],
  'Promise-to-Pay': [
    { name: 'Promised within 3 Days', percentage: 50, colorClass: 'bg-[#00B074]' },
    { name: 'Split Installment Proposal', percentage: 30, colorClass: 'bg-[#3B82F6]' },
    { name: 'Broken Promise / Re-engagement', percentage: 20, colorClass: 'bg-[#FF4444]' },
  ],
};

export const INITIAL_BATCH_DATA: Batch = {
  id: 'BATCH-20260823-001',
  direction: 'Mixed (5 Streams)',
  scenarioName: 'Synthetic Revenue-Risk Pipeline Workload',
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
      highlightText: 'Human approval required before action.',
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
      highlightText: 'Retry scheduled for tomorrow.',
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
      highlightText: 'Payment link generated & sent.',
      highlightColor: 'blue',
      icon: 'lucide:link',
      iconBgClass: 'bg-[#3B82F6]/10 dark:bg-[#3B82F6]/20 border border-[#3B82F6]/30',
      iconTextClass: 'text-[#3B82F6]',
    },
  ],
};

export function formatLakhs(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  }
  const inLakhs = amount / 100000;
  return `₹${inLakhs.toFixed(1)}L`;
}
