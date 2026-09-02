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

export const mockRecoveryCases: RecoveryCase[] = [];

export const STATUS_FILTER_TABS = [
  { value: 'all', label: 'All Cases' },
  { value: 'waiting', label: 'Waiting / Active' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'recovered', label: 'Recovered' },
  { value: 'cust_action', label: 'Customer Action' },
  { value: 'stopped', label: 'Stopped' },
];

export const RECOVERY_CASE_DIRECTIONS = [
  'Any Direction',
  'Payment Degradation',
  'Checkout Dropoff',
  'Subscription Recovery',
  'B2B Receivables',
  'Mandate Retry',
  'Hinglish Voice',
  'Promise-to-Pay',
];

export const RECOVERY_CASE_RISK_LEVELS = [
  'Any Risk Level',
  'Critical',
  'High',
  'Medium',
  'Low',
];

export const RECOVERY_CASE_AMOUNT_RANGES = [
  'Any Amount',
  '> ₹1L',
  '₹10k - ₹1L',
  '< ₹10k',
];

export const TOTAL_MOCK_CASES_DISPLAY = 0;
