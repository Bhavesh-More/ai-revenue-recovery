import type { CaseState } from "@recovery/types";
import { InvalidStateTransitionError } from "./errors.js";

export const ALLOWED_TRANSITIONS: Readonly<Record<CaseState, readonly CaseState[]>> = {
  detected: ["investigating", "stopped", "failed"],
  investigating: ["action_selected", "escalated", "stopped", "failed"],
  action_selected: [
    "waiting",
    "customer_action_required",
    "recovering",
    "escalated",
    "stopped",
    "failed",
  ],
  waiting: [
    "customer_action_required",
    "recovering",
    "escalated",
    "stopped",
    "failed",
  ],
  customer_action_required: [
    "recovering",
    "waiting",
    "escalated",
    "stopped",
    "failed",
  ],
  recovering: [
    "recovered",
    "waiting",
    "customer_action_required",
    "escalated",
    "stopped",
    "failed",
  ],
  escalated: ["recovering", "action_selected", "stopped", "failed"],
  // Failed cases can be re-opened into recovering for retry-able failures.
  failed: ["recovering"],
  recovered: [],
  stopped: [],
};

export function canTransition(from: CaseState, to: CaseState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: CaseState, to: CaseState): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}

// Audit action mapping for each case state. Used to generate audit events on state transitions.
export const TRANSITION_AUDIT_ACTION: Readonly<Record<CaseState, string>> = {
  detected: "event_detected",
  investigating: "context_retrieved",
  action_selected: "decision_created",
  waiting: "decision_created",
  customer_action_required: "decision_created",
  recovering: "action_executed",
  escalated: "escalation",
  recovered: "recovery",
  stopped: "stop",
  failed: "action_executed",
};
