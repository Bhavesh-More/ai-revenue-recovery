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
export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];
