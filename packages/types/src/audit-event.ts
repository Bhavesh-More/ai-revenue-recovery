import type {
  AuditEventId,
  CaseId,
  IsoTimestamp,
} from './common';

export type AuditAction =
  | 'event_detected'
  | 'context_retrieved'
  | 'decision_created'
  | 'policy_checked'
  | 'action_executed'
  | 'outcome_received'
  | 'escalation'
  | 'recovery'
  | 'stop';

export interface AuditEvent {
  id: AuditEventId;
  caseId: CaseId;
  action: AuditAction;
  summary: string;
  // Structured detail payload — direction-specific keys allowed.
  detail?: Record<string, string | number | boolean | null>;
  // Who/what produced it — agent run id, user id, or 'system'.
  actor: string;
  decisionId?: string;
  occurredAt: IsoTimestamp;
}
