export interface DirectionMetric {
  icon: string;
  label: string;
  value: string;
  detail: string;
}

export interface DirectionBreakdownItem {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface DirectionCaseItem {
  caseId: string;
  customerName: string;
  customerEmail: string;
  amount: string;
  status: 'detected' | 'investigating' | 'action_selected' | 'waiting' | 'recovering' | 'recovered' | 'stopped' | 'escalated';
  riskTier: 'low' | 'medium' | 'high' | 'critical';
  latestAction: string;
  updatedAt: string;
}

export interface DirectionData {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  metrics: DirectionMetric[];
  breakdownTitle: string;
  breakdownItems: DirectionBreakdownItem[];
  activeCasesCount: number;
  recoveredTotal: string;
  recoveryRate: string;
  cases: DirectionCaseItem[];
}

export const DIRECTION_DATA_MAP: Record<string, DirectionData> = {
  'payment-degradation': {
    id: 'payment-degradation',
    code: '01_payment_degradation',
    title: 'Payment Degradation Recovery',
    subtitle: 'Direction 01 — Gateway & Issuer Failure Intelligence',
    icon: 'lucide:credit-card',
    color: '#3B82F6',
    metrics: [
      { icon: 'lucide:alert-circle', label: 'REVENUE AT RISK', value: '₹0', detail: 'Live Backend API' },
      { icon: 'lucide:check-circle', label: 'REVENUE RECOVERED', value: '₹0', detail: 'Settled Cases' },
      { icon: 'lucide:server-off', label: 'GATEWAY DEGRADATION', value: 'Live Monitor', detail: 'Detection Active' },
      { icon: 'lucide:refresh-cw', label: 'AUTO-RETRY SUCCESS', value: '—', detail: 'Smart Retries Executed' },
    ],
    breakdownTitle: 'Decline Cause Distribution',
    breakdownItems: [
      { label: 'Issuer Downtime / Timeout', count: 0, percentage: 0, color: '#EF4444' },
      { label: 'Customer Specific Decline', count: 0, percentage: 0, color: '#F59E0B' },
      { label: 'Transient Network Error', count: 0, percentage: 0, color: '#3B82F6' },
      { label: 'Authentication Failure', count: 0, percentage: 0, color: '#10B981' },
    ],
    activeCasesCount: 0,
    recoveredTotal: '₹0',
    recoveryRate: '0%',
    cases: [],
  },
  'checkout-dropoff': {
    id: 'checkout-dropoff',
    code: '02_checkout_dropoff',
    title: 'Checkout Dropoff Recovery',
    subtitle: 'Direction 02 — Abandoned Session Recovery',
    icon: 'lucide:shopping-cart',
    color: '#F59E0B',
    metrics: [
      { icon: 'lucide:shopping-bag', label: 'ABANDONED VALUE', value: '₹0', detail: 'Live Sessions' },
      { icon: 'lucide:zap', label: 'SESSIONS RECOVERED', value: '₹0', detail: 'Settled Cases' },
      { icon: 'lucide:clock', label: 'AVG RECOVERY SPEED', value: '—', detail: 'Time to Convert' },
      { icon: 'lucide:message-square', label: 'WHATSAPP CONVERSION', value: '—', detail: 'Message Engagement' },
    ],
    breakdownTitle: 'Dropoff Intent Analysis',
    breakdownItems: [
      { label: 'Payment Method Unavailable', count: 0, percentage: 0, color: '#F59E0B' },
      { label: 'OTP Delay / App Switch', count: 0, percentage: 0, color: '#3B82F6' },
      { label: 'Price Indecision', count: 0, percentage: 0, color: '#10B981' },
      { label: 'Technical Session Timeout', count: 0, percentage: 0, color: '#6366F1' },
    ],
    activeCasesCount: 0,
    recoveredTotal: '₹0',
    recoveryRate: '0%',
    cases: [],
  },
  'subscription-recovery': {
    id: 'subscription-recovery',
    code: '03_failed_subscription',
    title: 'Subscription Recovery',
    subtitle: 'Direction 03 — Recurring Billing & Expired Card Dunning',
    icon: 'lucide:repeat',
    color: '#10B981',
    metrics: [
      { icon: 'lucide:credit-card-off', label: 'FAILED SUB REVENUE', value: '₹0', detail: 'Live Subscriptions' },
      { icon: 'lucide:shield-check', label: 'RECOVERED ARR', value: '₹0', detail: 'Settled Cases' },
      { icon: 'lucide:user-minus', label: 'CHURN PREVENTED', value: '0', detail: 'Active Accounts' },
      { icon: 'lucide:mail', label: 'DUNNING OPEN RATE', value: '—', detail: 'Engagement Rate' },
    ],
    breakdownTitle: 'Subscription Failure Categorization',
    breakdownItems: [
      { label: 'Expired Credit/Debit Card', count: 0, percentage: 0, color: '#EF4444' },
      { label: 'Insufficient Funds', count: 0, percentage: 0, color: '#F59E0B' },
      { label: 'Bank Mandate Revocation', count: 0, percentage: 0, color: '#3B82F6' },
      { label: 'Soft Decline / Re-try Needed', count: 0, percentage: 0, color: '#10B981' },
    ],
    activeCasesCount: 0,
    recoveredTotal: '₹0',
    recoveryRate: '0%',
    cases: [],
  },
  'b2b-receivables': {
    id: 'b2b-receivables',
    code: '04_b2b_receivables',
    title: 'B2B Receivables Chaser',
    subtitle: 'Direction 04 — Enterprise Invoice & AP Communication Agent',
    icon: 'lucide:building',
    color: '#6366F1',
    metrics: [
      { icon: 'lucide:file-text', label: 'OVERDUE INVOICES', value: '₹0', detail: 'Live Invoices' },
      { icon: 'lucide:landmark', label: 'COLLECTED CASH', value: '₹0', detail: 'Settled Cases' },
      { icon: 'lucide:calendar-clock', label: 'DSO REDUCTION', value: '—', detail: 'Days Sales Outstanding' },
      { icon: 'lucide:phone-call', label: 'AP ENGAGEMENT', value: '—', detail: 'Response Rate' },
    ],
    breakdownTitle: 'Receivable Ageing Breakdown',
    breakdownItems: [
      { label: '1 - 15 Days Overdue', count: 0, percentage: 0, color: '#3B82F6' },
      { label: '16 - 30 Days Overdue', count: 0, percentage: 0, color: '#F59E0B' },
      { label: '31 - 60 Days Overdue', count: 0, percentage: 0, color: '#EF4444' },
      { label: '60+ Days (Legal Risk)', count: 0, percentage: 0, color: '#991B1B' },
    ],
    activeCasesCount: 0,
    recoveredTotal: '₹0',
    recoveryRate: '0%',
    cases: [],
  },
  'mandate-retry': {
    id: 'mandate-retry',
    code: '05_mandate_retry',
    title: 'Mandate Retry Sequencer',
    subtitle: 'Direction 05 — NACH / eNACH Smart Debit Optimizer',
    icon: 'lucide:layers',
    color: '#8B5CF6',
    metrics: [
      { icon: 'lucide:x-circle', label: 'FAILED DEBITS', value: '₹0', detail: 'Live Mandates' },
      { icon: 'lucide:check-square', label: 'RECOVERED VIA RETRY', value: '₹0', detail: 'Settled Cases' },
      { icon: 'lucide:trending-up', label: 'OPTIMAL TIMING HIT', value: '—', detail: 'Salary Cycle Match' },
      { icon: 'lucide:ban', label: 'BOUNCE CHARGE SAVED', value: '—', detail: 'Penalty Avoidance' },
    ],
    breakdownTitle: 'Mandate Failure Reasons',
    breakdownItems: [
      { label: 'Insufficient Balance', count: 0, percentage: 0, color: '#EF4444' },
      { label: 'Account Frozen / Dormant', count: 0, percentage: 0, color: '#F59E0B' },
      { label: 'NPCI Clearing Timeout', count: 0, percentage: 0, color: '#3B82F6' },
      { label: 'Mandate Limit Exceeded', count: 0, percentage: 0, color: '#8B5CF6' },
    ],
    activeCasesCount: 0,
    recoveredTotal: '₹0',
    recoveryRate: '0%',
    cases: [],
  },
  'hinglish-voice': {
    id: 'hinglish-voice',
    code: '06_hinglish_voice',
    title: 'Hinglish Voice Recovery',
    subtitle: 'Direction 06 — Code-Mixed Conversational Voice Call Agent',
    icon: 'lucide:phone-call',
    color: '#EC4899',
    metrics: [
      { icon: 'lucide:phone-outgoing', label: 'CALLS COMPLETED', value: '0', detail: 'Live Call Queue' },
      { icon: 'lucide:dollar-sign', label: 'RECOVERED ON CALL', value: '₹0', detail: 'Settled Cases' },
      { icon: 'lucide:smile', label: 'CSAT SENTIMENT', value: '—', detail: 'Positive Tone' },
      { icon: 'lucide:link-2', label: 'LINK SENT & PAID', value: '—', detail: 'SMS Payment Link' },
    ],
    breakdownTitle: 'Voice Call Outcome Categories',
    breakdownItems: [
      { label: 'Immediate Payment Link Paid', count: 0, percentage: 0, color: '#10B981' },
      { label: 'Promise to Pay Recorded', count: 0, percentage: 0, color: '#3B82F6' },
      { label: 'Dispute / Escalated to Agent', count: 0, percentage: 0, color: '#F59E0B' },
      { label: 'Unreachable / Line Busy', count: 0, percentage: 0, color: '#6B7280' },
    ],
    activeCasesCount: 0,
    recoveredTotal: '₹0',
    recoveryRate: '0%',
    cases: [],
  },
  'promise-to-pay': {
    id: 'promise-to-pay',
    code: '07_promise_to_pay',
    title: 'Promise-to-Pay Tracker',
    subtitle: 'Direction 07 — Commitment Lifecycle & Due Date Monitor',
    icon: 'lucide:calendar-check',
    color: '#14B8A6',
    metrics: [
      { icon: 'lucide:hand-metal', label: 'PROMISED REVENUE', value: '₹0', detail: 'Live Commitments' },
      { icon: 'lucide:check-circle-2', label: 'PROMISES KEPT', value: '₹0', detail: 'Settled Cases' },
      { icon: 'lucide:user-check', label: 'RELIABILITY SCORE', value: '—', detail: 'Customer Score' },
      { icon: 'lucide:alert-triangle', label: 'BROKEN PROMISES', value: '0', detail: 'Escalations' },
    ],
    breakdownTitle: 'Commitment Status Breakdown',
    breakdownItems: [
      { label: 'Firm Promise Pending', count: 0, percentage: 0, color: '#3B82F6' },
      { label: 'Fulfilled On Time', count: 0, percentage: 0, color: '#10B981' },
      { label: 'Broken / Overdue', count: 0, percentage: 0, color: '#EF4444' },
      { label: 'Rescheduled / Extension', count: 0, percentage: 0, color: '#F59E0B' },
    ],
    activeCasesCount: 0,
    recoveredTotal: '₹0',
    recoveryRate: '0%',
    cases: [],
  },
};
