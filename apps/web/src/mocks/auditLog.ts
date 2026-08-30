export type AuditActorType = 'user' | 'ai' | 'system';

export type AuditResult = 'success' | 'pending' | 'failed';

export type AuditObjectType = 'case' | 'batch' | 'policy' | 'approval' | 'settings';

export interface AuditLogMetadata {
  direction?: string;
  duration?: string;
  total?: number;
  recovered?: number;
  failed?: number;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  source?: string;
  amountAtRisk?: string;
  recoveryRate?: string;
  approver?: string;
  ruleEnforced?: string;
  channel?: string;
  customer?: string;
  [key: string]: unknown;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  actor: string;
  actorType: AuditActorType;
  action: string;
  objectType: AuditObjectType;
  objectId: string;
  details: string;
  result: AuditResult;
  metadata?: AuditLogMetadata;
}

export interface AuditLogFiltersState {
  searchQuery: string;
  dateRange: 'Today' | 'Last 7 Days' | 'Last 30 Days' | 'Last 90 Days' | 'All Time';
  actionType: string;
  actor: string;
  objectType: string;
  resultStatus: string;
}

export type AuditSortColumn = 'timestamp' | 'actor' | 'action' | 'objectId';
export type AuditSortDirection = 'asc' | 'desc';

export const INITIAL_AUDIT_FILTERS: AuditLogFiltersState = {
  searchQuery: '',
  dateRange: 'Last 7 Days',
  actionType: 'All Actions',
  actor: 'All Users & AI',
  objectType: 'All Objects',
  resultStatus: 'All Statuses',
};

export const ACTION_TYPE_OPTIONS = [
  'All Actions',
  'Case Created',
  'Case Updated',
  'Batch Started',
  'Batch Completed',
  'Policy Modified',
  'Approval Request',
  'Approval Granted',
  'Approval Rejected',
  'Settings Changed',
  'Status Changed',
] as const;

export const ACTOR_OPTIONS = [
  'All Users & AI',
  'AI Recovery Engine',
  'Admin User',
  'Policy Enforcement',
] as const;

export const OBJECT_TYPE_OPTIONS = [
  'All Objects',
  'Cases',
  'Batches',
  'Policies',
  'Approvals',
  'Settings',
] as const;

export const RESULT_STATUS_OPTIONS = [
  'All Statuses',
  'Success',
  'Pending',
  'Failed',
] as const;

export const DATE_RANGE_OPTIONS = [
  'Today',
  'Last 7 Days',
  'Last 30 Days',
  'Last 90 Days',
  'All Time',
] as const;

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-9021',
    timestamp: '2026-08-30 16:15:22',
    actor: 'AI Recovery Engine',
    actorType: 'ai',
    action: 'Case Created',
    objectType: 'case',
    objectId: 'RC-10291',
    details: 'Ingested failed payment event for ₹4,999 SaaS annual tier renewal.',
    result: 'success',
    metadata: {
      direction: 'Subscription Recovery',
      customer: 'Acme Technologies',
      amountAtRisk: '₹4,999',
      source: 'Webhook (Razorpay Subscriptions)',
    },
  },
  {
    id: 'AUD-9020',
    timestamp: '2026-08-30 15:40:08',
    actor: 'Admin User',
    actorType: 'user',
    action: 'Batch Started',
    objectType: 'batch',
    objectId: 'BATCH-20260830-001',
    details: 'Initiated synthetic workload simulation across 5 recovery streams.',
    result: 'success',
    metadata: {
      total: 1000,
      direction: 'Mixed (5 Streams)',
      duration: 'In progress',
      amountAtRisk: '₹42,70,000',
    },
  },
  {
    id: 'AUD-9019',
    timestamp: '2026-08-30 14:32:11',
    actor: 'Admin User',
    actorType: 'user',
    action: 'Policy Modified',
    objectType: 'policy',
    objectId: 'Payment Retry Limit',
    details: 'Changed maximum automatic retry count from 3 to 4 attempts.',
    result: 'success',
    metadata: {
      previousValue: '3 retries',
      newValue: '4 retries',
      reason: 'Optimize recovery for temporary banking switch downtime',
      approver: 'Admin User (admin@company.com)',
    },
  },
  {
    id: 'AUD-9018',
    timestamp: '2026-08-30 13:20:45',
    actor: 'AI Recovery Engine',
    actorType: 'ai',
    action: 'Approval Request',
    objectType: 'approval',
    objectId: 'RC-10284',
    details: 'Requested human approval for service suspension on high-value account.',
    result: 'pending',
    metadata: {
      customer: 'Priya Sharma (Starlight Media)',
      amountAtRisk: '₹1,45,000',
      ruleEnforced: 'High-Value Escalation Threshold (>₹1,00,000)',
      direction: 'Subscription Recovery',
    },
  },
  {
    id: 'AUD-9017',
    timestamp: '2026-08-30 12:11:30',
    actor: 'Admin User',
    actorType: 'user',
    action: 'Approval Granted',
    objectType: 'approval',
    objectId: 'RC-10284',
    details: 'Granted manual approval to execute custom settlement schedule.',
    result: 'success',
    metadata: {
      approver: 'Admin User',
      actionApproved: 'Custom payment plan (3 installments)',
      customer: 'Priya Sharma',
    },
  },
  {
    id: 'AUD-9016',
    timestamp: '2026-08-29 18:45:10',
    actor: 'AI Recovery Engine',
    actorType: 'ai',
    action: 'Batch Completed',
    objectType: 'batch',
    objectId: 'BATCH-20260829-005',
    details: 'Processed 1,000 cases; successfully recovered 341 payments.',
    result: 'success',
    metadata: {
      direction: 'Subscription Recovery',
      duration: '45m 12s',
      total: 1000,
      recovered: 341,
      failed: 12,
      recoveryRate: '43.1%',
    },
  },
  {
    id: 'AUD-9015',
    timestamp: '2026-08-29 16:30:00',
    actor: 'Policy Enforcement',
    actorType: 'system',
    action: 'Status Changed',
    objectType: 'case',
    objectId: 'RC-10265',
    details: 'Recovery stopped: customer submitted hardship/opt-out request.',
    result: 'success',
    metadata: {
      ruleEnforced: 'Hardship Claims Opt-out Policy',
      customer: 'Rohit Verma',
      previousValue: 'in_recovery',
      newValue: 'stopped',
    },
  },
  {
    id: 'AUD-9014',
    timestamp: '2026-08-29 14:15:22',
    actor: 'Admin User',
    actorType: 'user',
    action: 'Settings Changed',
    objectType: 'settings',
    objectId: 'Settings',
    details: 'Updated notification webhooks and Slack alert channel preferences.',
    result: 'success',
    metadata: {
      previousValue: '#alerts-general',
      newValue: '#revenue-recovery-ops',
      reason: 'Routing critical escalation events to dedicated squad',
    },
  },
  {
    id: 'AUD-9013',
    timestamp: '2026-08-29 11:20:15',
    actor: 'AI Recovery Engine',
    actorType: 'ai',
    action: 'Case Updated',
    objectType: 'case',
    objectId: 'RC-10278',
    details: 'Generated smart payment link with auto-UPI intent and dispatched via WhatsApp.',
    result: 'success',
    metadata: {
      channel: 'WhatsApp + SMS',
      direction: 'Checkout Recovery',
      amountAtRisk: '₹3,499',
    },
  },
  {
    id: 'AUD-9012',
    timestamp: '2026-08-28 17:05:40',
    actor: 'AI Recovery Engine',
    actorType: 'ai',
    action: 'Case Updated',
    objectType: 'case',
    objectId: 'RC-10292',
    details: 'Gateway retry attempt failed due to insufficient funds error from issuer.',
    result: 'failed',
    metadata: {
      errorCode: 'INSUFFICIENT_FUNDS',
      bankResponse: 'Decline by Issuer Bank (Code 51)',
      nextAction: 'Reschedule retry for expected salary cycle date',
    },
  },
  {
    id: 'AUD-9011',
    timestamp: '2026-08-28 15:10:04',
    actor: 'Policy Enforcement',
    actorType: 'system',
    action: 'Status Changed',
    objectType: 'case',
    objectId: 'RC-10270',
    details: 'Escalated to Human queue due to exposure exceeding ₹1,00,000 threshold.',
    result: 'success',
    metadata: {
      ruleEnforced: 'High-Value Exposure Threshold',
      amountAtRisk: '₹2,50,000',
      customer: 'Nexus Global Logistics',
      direction: 'B2B Receivables',
    },
  },
  {
    id: 'AUD-9010',
    timestamp: '2026-08-28 12:44:19',
    actor: 'Admin User',
    actorType: 'user',
    action: 'Approval Rejected',
    objectType: 'approval',
    objectId: 'RC-10255',
    details: 'Rejected 50% invoice fee waiver request per financial compliance limits.',
    result: 'success',
    metadata: {
      approver: 'Admin User',
      reason: 'Requested discount exceeds maximum allowable 20% cap',
      customer: 'Quantum Tech Labs',
    },
  },
  {
    id: 'AUD-9009',
    timestamp: '2026-08-27 19:12:00',
    actor: 'AI Recovery Engine',
    actorType: 'ai',
    action: 'Case Created',
    objectType: 'case',
    objectId: 'RC-10293',
    details: 'Ingested UPI autopay recurring mandate decline event.',
    result: 'success',
    metadata: {
      direction: 'Mandate Retry',
      customer: 'Vikram Mehta',
      amountAtRisk: '₹1,299',
    },
  },
  {
    id: 'AUD-9008',
    timestamp: '2026-08-27 16:02:33',
    actor: 'AI Recovery Engine',
    actorType: 'ai',
    action: 'Approval Request',
    objectType: 'approval',
    objectId: 'RC-10289',
    details: 'Requested approval for custom installment plan discount (15%).',
    result: 'pending',
    metadata: {
      customer: 'Ananya Gupta',
      amountAtRisk: '₹28,500',
      direction: 'Promise-to-Pay',
    },
  },
  {
    id: 'AUD-9007',
    timestamp: '2026-08-26 14:18:50',
    actor: 'Admin User',
    actorType: 'user',
    action: 'Policy Modified',
    objectType: 'policy',
    objectId: 'High-Value Threshold',
    details: 'Updated global high-value escalation threshold from ₹50,000 to ₹1,00,000.',
    result: 'success',
    metadata: {
      previousValue: '₹50,000',
      newValue: '₹1,00,000',
      approver: 'Admin User',
    },
  },
  {
    id: 'AUD-9006',
    timestamp: '2026-08-25 18:22:11',
    actor: 'Policy Enforcement',
    actorType: 'system',
    action: 'Case Updated',
    objectType: 'case',
    objectId: 'RC-10260',
    details: 'Triggered smart retry on card token after gateway latency normalized.',
    result: 'success',
    metadata: {
      direction: 'Payment Degradation',
      latencyDrop: 'from 4.2s to 0.6s',
      gateway: 'HDFC UPI Switch',
    },
  },
  {
    id: 'AUD-9005',
    timestamp: '2026-08-25 11:00:00',
    actor: 'AI Recovery Engine',
    actorType: 'ai',
    action: 'Batch Started',
    objectType: 'batch',
    objectId: 'BATCH-20260825-001',
    details: 'Started automated recovery execution for 500 degraded UPI cases.',
    result: 'success',
    metadata: {
      direction: 'Payment Degradation',
      total: 500,
      amountAtRisk: '₹15,20,000',
    },
  },
  {
    id: 'AUD-9004',
    timestamp: '2026-08-24 16:45:19',
    actor: 'Policy Enforcement',
    actorType: 'system',
    action: 'Status Changed',
    objectType: 'case',
    objectId: 'RC-10245',
    details: 'Max communications threshold (4 touches) reached. Escalated to human oversight.',
    result: 'success',
    metadata: {
      ruleEnforced: 'Maximum Communications Limit',
      touchesSent: '2 Emails, 1 SMS, 1 WhatsApp',
      customer: 'Deepak Patel',
    },
  },
  {
    id: 'AUD-9003',
    timestamp: '2026-08-24 10:14:02',
    actor: 'Admin User',
    actorType: 'user',
    action: 'Settings Changed',
    objectType: 'settings',
    objectId: 'Security',
    details: 'Enforced multi-factor authentication for all platform supervisor roles.',
    result: 'success',
    metadata: {
      previousValue: 'MFA Optional',
      newValue: 'MFA Enforced',
      approver: 'Admin User',
    },
  },
  {
    id: 'AUD-9002',
    timestamp: '2026-08-23 15:30:45',
    actor: 'AI Recovery Engine',
    actorType: 'ai',
    action: 'Case Updated',
    objectType: 'case',
    objectId: 'RC-10250',
    details: 'Initiated conversational Hinglish IVR voice call for high-intent customer.',
    result: 'success',
    metadata: {
      direction: 'Hinglish Voice',
      callDuration: '2m 14s',
      outcome: 'Customer agreed to pay via link sent during call',
    },
  },
  {
    id: 'AUD-9001',
    timestamp: '2026-08-23 09:12:00',
    actor: 'AI Recovery Engine',
    actorType: 'ai',
    action: 'Case Updated',
    objectType: 'case',
    objectId: 'RC-10251',
    details: 'Webhook delivery timeout from merchant switch after 3 connection attempts.',
    result: 'failed',
    metadata: {
      httpStatus: 504,
      endpoint: 'https://api.merchant.com/v1/recovery-events',
      retryPolicy: 'Exp backoff step 3',
    },
  },
];
