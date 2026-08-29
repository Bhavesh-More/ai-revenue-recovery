import type {
  AuditEventId,
  CaseId,
  IsoTimestamp,
} from './common';

export type AuditAction =
  | 'event_detected'
  | 'context_retrieved'
  | 'decision_created'
  | 'decision_failed'
  | 'policy_checked'
  | 'action_executed'
  | 'action_failed'
  | 'communication_sent'
  | 'outcome_received'
  | 'escalation'
  | 'recovery'
  | 'stop';

export interface AuditEvent {
  id: AuditEventId;
  caseId: CaseId;
  action: AuditAction;
  summary: string;
  detail?: Record<string, string | number | boolean | null>;
  actor: string;
  decisionId?: string;
  occurredAt: IsoTimestamp;
}
