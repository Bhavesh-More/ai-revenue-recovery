import { RecoveryCaseStatus, RecoveryCaseRisk } from './recoveryCases';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  time: string;
  icon: string;
  iconColor: 'orange' | 'blue' | 'green' | 'muted' | 'red';
  bgClass: string;
}

export interface CaseOutcome {
  successful: boolean;
  title: string;
  description: string;
  amountRecovered: number;
}

export interface AIDecision {
  whyExplanation: string;
  recommendedAction: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface PolicyDecisionData {
  proposedAction: string;
  actionAllowed: boolean;
  policyReason: string;
  retriesUsed: string;
  commsAttempts: string;
  humanApproval: string;
}

export interface RecoveryCaseDetail {
  id: string;
  customer: string;
  direction: string;
  amountAtRisk: number;
  amountRecovered: number;
  status: RecoveryCaseStatus;
  risk: RecoveryCaseRisk;
  recoveryProbability: number;
  timeline: TimelineEvent[];
  outcome: CaseOutcome;
  aiDecision: AIDecision;
  policyDecision: PolicyDecisionData;
}

export const mockCaseDetails: Record<string, RecoveryCaseDetail> = {
  'RC-10291': {
    id: 'RC-10291',
    customer: 'Rahul Sharma',
    direction: 'Subscription Recovery',
    amountAtRisk: 4999,
    amountRecovered: 4999,
    status: 'Recovered',
    risk: 'High',
    recoveryProbability: 87,
    timeline: [
      {
        id: '1',
        title: 'Payment failure detected',
        time: '14:32:11',
        icon: 'lucide:alert-circle',
        iconColor: 'orange',
        bgClass: 'bg-[#F59E0B]/20 text-[#F59E0B]',
      },
      {
        id: '2',
        title: 'Customer context loaded',
        time: '14:32:12',
        icon: 'lucide:database',
        iconColor: 'muted',
        bgClass: 'bg-[#E5E7EB] dark:bg-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF]',
      },
      {
        id: '3',
        title: 'Root cause identified',
        description: 'Expired card',
        time: '14:32:13',
        icon: 'lucide:search',
        iconColor: 'blue',
        bgClass: 'bg-[#3B82F6]/20 text-[#3B82F6]',
      },
      {
        id: '4',
        title: 'Recovery probability calculated',
        description: '87%',
        time: '14:32:14',
        icon: 'lucide:bar-chart-3',
        iconColor: 'green',
        bgClass: 'bg-[#E5E7EB] dark:bg-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF]',
      },
      {
        id: '5',
        title: 'Recovery action selected',
        description: 'Payment-method update',
        time: '14:32:14',
        icon: 'lucide:cpu',
        iconColor: 'blue',
        bgClass: 'bg-[#3B82F6]/20 text-[#3B82F6]',
      },
      {
        id: '6',
        title: 'Policy approved',
        time: '14:32:16',
        icon: 'lucide:check',
        iconColor: 'green',
        bgClass: 'bg-[#00B074]/20 text-[#00B074]',
      },
      {
        id: '7',
        title: 'Payment link sent',
        time: '14:32:18',
        icon: 'lucide:send',
        iconColor: 'muted',
        bgClass: 'bg-[#E5E7EB] dark:bg-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF]',
      },
      {
        id: '8',
        title: 'Customer updated payment method',
        time: '14:35:42',
        icon: 'lucide:user-check',
        iconColor: 'blue',
        bgClass: 'bg-[#3B82F6]/20 text-[#3B82F6]',
      },
      {
        id: '9',
        title: 'Payment retry initiated',
        time: '14:35:44',
        icon: 'lucide:refresh-cw',
        iconColor: 'muted',
        bgClass: 'bg-[#E5E7EB] dark:bg-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF]',
      },
      {
        id: '10',
        title: 'Payment successful',
        time: '14:35:47',
        icon: 'lucide:check-circle-2',
        iconColor: 'green',
        bgClass: 'bg-[#00B074]/20 text-[#00B074]',
      },
    ],
    outcome: {
      successful: true,
      title: 'Recovery Successful',
      description: 'Payment processed via updated Visa ending in 4242',
      amountRecovered: 4999,
    },
    aiDecision: {
      whyExplanation:
        'The customer has 18 successful previous payments and the current failure is associated with an expired payment method. The case has high recovery potential based on historical payment consistency.',
      recommendedAction: 'Payment-method update',
      confidence: 'High',
    },
    policyDecision: {
      proposedAction: 'Payment-method update',
      actionAllowed: true,
      policyReason: 'Automatic recovery permitted',
      retriesUsed: '1 / 3',
      commsAttempts: '1 / 3',
      humanApproval: 'Not required',
    },
  },
  'RC-10284': {
    id: 'RC-10284',
    customer: 'ABC Enterprises',
    direction: 'B2B Receivables',
    amountAtRisk: 1240000,
    amountRecovered: 0,
    status: 'Escalated',
    risk: 'Critical',
    recoveryProbability: 32,
    timeline: [
      {
        id: '1',
        title: 'Invoice overdue detected (45+ days)',
        time: '09:15:00',
        icon: 'lucide:alert-circle',
        iconColor: 'orange',
        bgClass: 'bg-[#F59E0B]/20 text-[#F59E0B]',
      },
      {
        id: '2',
        title: 'Company credit context loaded',
        time: '09:15:02',
        icon: 'lucide:database',
        iconColor: 'muted',
        bgClass: 'bg-[#E5E7EB] dark:bg-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF]',
      },
      {
        id: '3',
        title: 'Automated dunning sequence completed (3/3)',
        time: '09:15:05',
        icon: 'lucide:send',
        iconColor: 'muted',
        bgClass: 'bg-[#E5E7EB] dark:bg-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF]',
      },
      {
        id: '4',
        title: 'Policy threshold exceeded (> ₹10L)',
        time: '09:15:08',
        icon: 'lucide:shield-alert',
        iconColor: 'red',
        bgClass: 'bg-[#FF4444]/20 text-[#FF4444]',
      },
      {
        id: '5',
        title: 'Case escalated for Human Relationship Manager review',
        time: '09:15:10',
        icon: 'lucide:user',
        iconColor: 'red',
        bgClass: 'bg-[#FF4444]/20 text-[#FF4444]',
      },
    ],
    outcome: {
      successful: false,
      title: 'Manual Review Required',
      description: 'High-value enterprise receivable requires Relationship Manager outreach',
      amountRecovered: 0,
    },
    aiDecision: {
      whyExplanation:
        'Invoice exceeds single-transaction automated recovery threshold of ₹10,00,000. Automated dunning produced no response; dedicated account manager outreach is required.',
      recommendedAction: 'Direct Relationship Manager Outreach',
      confidence: 'Medium',
    },
    policyDecision: {
      proposedAction: 'Direct Relationship Manager Outreach',
      actionAllowed: false,
      policyReason: 'Exceeds single-transaction automated policy threshold',
      retriesUsed: '3 / 3',
      commsAttempts: '3 / 3',
      humanApproval: 'Required',
    },
  },
  'RC-10279': {
    id: 'RC-10279',
    customer: 'Priya Patel',
    direction: 'Checkout Recovery',
    amountAtRisk: 14500,
    amountRecovered: 14500,
    status: 'Recovered',
    risk: 'Low',
    recoveryProbability: 95,
    timeline: [
      {
        id: '1',
        title: 'Abandoned cart detected during checkout',
        time: '11:04:10',
        icon: 'lucide:alert-circle',
        iconColor: 'orange',
        bgClass: 'bg-[#F59E0B]/20 text-[#F59E0B]',
      },
      {
        id: '2',
        title: 'UPI payment intent failure logged',
        time: '11:04:12',
        icon: 'lucide:database',
        iconColor: 'muted',
        bgClass: 'bg-[#E5E7EB] dark:bg-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF]',
      },
      {
        id: '3',
        title: 'WhatsApp recovery prompt dispatched',
        time: '11:04:15',
        icon: 'lucide:send',
        iconColor: 'muted',
        bgClass: 'bg-[#E5E7EB] dark:bg-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF]',
      },
      {
        id: '4',
        title: 'Customer opened one-click payment link',
        time: '11:06:20',
        icon: 'lucide:user-check',
        iconColor: 'blue',
        bgClass: 'bg-[#3B82F6]/20 text-[#3B82F6]',
      },
      {
        id: '5',
        title: 'UPI payment completed successfully',
        time: '11:06:35',
        icon: 'lucide:check-circle-2',
        iconColor: 'green',
        bgClass: 'bg-[#00B074]/20 text-[#00B074]',
      },
    ],
    outcome: {
      successful: true,
      title: 'Recovery Successful',
      description: 'Payment completed via WhatsApp one-click UPI checkout',
      amountRecovered: 14500,
    },
    aiDecision: {
      whyExplanation:
        'Session dropped due to UPI app timeout on mobile. Instant messaging nudge with pre-filled payment link selected for highest conversion probability.',
      recommendedAction: 'One-Click UPI Recovery Link',
      confidence: 'High',
    },
    policyDecision: {
      proposedAction: 'One-Click UPI Recovery Link',
      actionAllowed: true,
      policyReason: 'Standard drop-off recovery workflow permitted',
      retriesUsed: '1 / 2',
      commsAttempts: '1 / 2',
      humanApproval: 'Not required',
    },
  },
  'RC-10271': {
    id: 'RC-10271',
    customer: 'Tech Solutions Ltd',
    direction: 'Promise-to-Pay',
    amountAtRisk: 500000,
    amountRecovered: 0,
    status: 'Cust Action',
    risk: 'Medium',
    recoveryProbability: 68,
    timeline: [
      {
        id: '1',
        title: 'Scheduled mandate debit failed (insufficient funds)',
        time: '08:00:10',
        icon: 'lucide:alert-circle',
        iconColor: 'orange',
        bgClass: 'bg-[#F59E0B]/20 text-[#F59E0B]',
      },
      {
        id: '2',
        title: 'Customer promise-to-pay commitment received',
        description: 'Scheduled for next billing cycle',
        time: '10:22:00',
        icon: 'lucide:calendar-clock',
        iconColor: 'blue',
        bgClass: 'bg-[#3B82F6]/20 text-[#3B82F6]',
      },
      {
        id: '3',
        title: 'Mandate retry auto-rescheduled',
        time: '10:22:05',
        icon: 'lucide:refresh-cw',
        iconColor: 'muted',
        bgClass: 'bg-[#E5E7EB] dark:bg-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF]',
      },
    ],
    outcome: {
      successful: false,
      title: 'Awaiting Customer Scheduled Payment',
      description: 'Promise-to-pay agreement active; debit rescheduled',
      amountRecovered: 0,
    },
    aiDecision: {
      whyExplanation:
        'Customer confirmed account funding date. Pausing active chaser messages to avoid customer friction and maintain relationship.',
      recommendedAction: 'Hold Active Chasing & Schedule Mandate Re-attempt',
      confidence: 'Medium',
    },
    policyDecision: {
      proposedAction: 'Schedule Mandate Re-attempt',
      actionAllowed: true,
      policyReason: 'Promise-to-Pay policy rule applies',
      retriesUsed: '1 / 3',
      commsAttempts: '1 / 3',
      humanApproval: 'Not required',
    },
  },
  'RC-10265': {
    id: 'RC-10265',
    customer: 'Amit Kumar',
    direction: 'Payment Degradation',
    amountAtRisk: 1999,
    amountRecovered: 0,
    status: 'Stopped',
    risk: 'Low',
    recoveryProbability: 12,
    timeline: [
      {
        id: '1',
        title: 'Payment gateway downtime detected',
        time: '16:00:00',
        icon: 'lucide:alert-circle',
        iconColor: 'orange',
        bgClass: 'bg-[#F59E0B]/20 text-[#F59E0B]',
      },
      {
        id: '2',
        title: 'Customer initiated cancellation request',
        time: '16:15:00',
        icon: 'lucide:user-x',
        iconColor: 'muted',
        bgClass: 'bg-[#E5E7EB] dark:bg-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF]',
      },
      {
        id: '3',
        title: 'Recovery operations stopped per customer opt-out',
        time: '16:15:05',
        icon: 'lucide:slash',
        iconColor: 'red',
        bgClass: 'bg-[#FF4444]/20 text-[#FF4444]',
      },
    ],
    outcome: {
      successful: false,
      title: 'Recovery Terminated',
      description: 'Customer requested order cancellation after initial payment failure',
      amountRecovered: 0,
    },
    aiDecision: {
      whyExplanation:
        'Customer explicitly cancelled order upon payment degradation. Stop policy triggered to respect customer preference.',
      recommendedAction: 'Cease All Communication',
      confidence: 'High',
    },
    policyDecision: {
      proposedAction: 'Cease All Communication',
      actionAllowed: true,
      policyReason: 'Hard stop condition: Customer opt-out',
      retriesUsed: '1 / 1',
      commsAttempts: '1 / 1',
      humanApproval: 'Not required',
    },
  },
};

export function getRecoveryCaseDetail(caseId: string): RecoveryCaseDetail | undefined {
  return mockCaseDetails[caseId];
}
