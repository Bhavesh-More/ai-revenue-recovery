export type RecoveryCaseStatus =
  | 'Waiting'
  | 'Escalated'
  | 'Recovered'
  | 'Cust Action'
  | 'Stopped';

export type RecoveryCaseRisk = 'Critical' | 'High' | 'Medium' | 'Low';

export type RecoveryCaseOwner = 'AI' | 'Human';

export interface RecoveryCase {
  id: string;
  customer: string;
  direction: string;
  directionDisplay: string;
  directionIcon: string;
  amountAtRisk: number;
  recovered: number | null;
  status: RecoveryCaseStatus;
  risk: RecoveryCaseRisk;
  probability: number;
  owner: RecoveryCaseOwner;
  isStopped?: boolean;
}

export const mockRecoveryCases: RecoveryCase[] = [
  {
    id: 'RC-10291',
    customer: 'Rahul Sharma',
    direction: 'Subscription Recovery',
    directionDisplay: 'Subscription',
    directionIcon: 'lucide:repeat',
    amountAtRisk: 4999,
    recovered: null,
    status: 'Waiting',
    risk: 'High',
    probability: 87,
    owner: 'AI',
  },
  {
    id: 'RC-10284',
    customer: 'ABC Enterprises',
    direction: 'B2B Receivables',
    directionDisplay: 'B2B Receivables',
    directionIcon: 'lucide:building',
    amountAtRisk: 1240000,
    recovered: null,
    status: 'Escalated',
    risk: 'Critical',
    probability: 32,
    owner: 'Human',
  },
  {
    id: 'RC-10279',
    customer: 'Priya Patel',
    direction: 'Checkout Recovery',
    directionDisplay: 'Checkout',
    directionIcon: 'lucide:shopping-cart',
    amountAtRisk: 14500,
    recovered: 14500,
    status: 'Recovered',
    risk: 'Low',
    probability: 95,
    owner: 'AI',
  },
  {
    id: 'RC-10271',
    customer: 'Tech Solutions Ltd',
    direction: 'Promise-to-Pay',
    directionDisplay: 'Promise-to-Pay',
    directionIcon: 'lucide:calendar-clock',
    amountAtRisk: 500000,
    recovered: null,
    status: 'Cust Action',
    risk: 'Medium',
    probability: 68,
    owner: 'AI',
  },
  {
    id: 'RC-10265',
    customer: 'Amit Kumar',
    direction: 'Payment Degradation',
    directionDisplay: 'Payment Deg.',
    directionIcon: 'lucide:credit-card',
    amountAtRisk: 1999,
    recovered: null,
    status: 'Stopped',
    risk: 'Low',
    probability: 12,
    owner: 'AI',
    isStopped: true,
  },
];

export const TOTAL_MOCK_CASES_DISPLAY = 1284;

export const RECOVERY_CASE_DIRECTIONS = [
  'Any Direction',
  'Subscription Recovery',
  'Payment Degradation',
  'Checkout Recovery',
  'B2B Receivables',
  'Mandate Retry',
  'Hinglish Voice',
  'Promise-to-Pay',
] as const;

export const RECOVERY_CASE_RISK_LEVELS = [
  'Any Risk Level',
  'Critical',
  'High',
  'Medium',
  'Low',
] as const;

export const RECOVERY_CASE_AMOUNT_RANGES = [
  'Any Amount',
  '> ₹1L',
  '₹10k - ₹1L',
  '< ₹10k',
] as const;

export const STATUS_FILTER_TABS = [
  { label: 'All Cases', value: 'all' },
  { label: 'High Risk', value: 'high_risk' },
  { label: 'Waiting', value: 'Waiting' },
  { label: 'Customer Action', value: 'Cust Action' },
  { label: 'Escalated', value: 'Escalated' },
  { label: 'Recovered', value: 'Recovered' },
  { label: 'Stopped', value: 'Stopped' },
] as const;
