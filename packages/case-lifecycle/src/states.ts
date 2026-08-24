import type { CaseState } from "@recovery/types";

export const CASE_STATES: readonly CaseState[] = [
  "detected",
  "investigating",
  "action_selected",
  "waiting",
  "customer_action_required",
  "recovering",
  "escalated",
  "recovered",
  "stopped",
  "failed",
] as const;

export const TERMINAL_CASE_STATES: readonly CaseState[] = [
  "recovered",
  "stopped",
  "failed",
] as const;

export function isTerminalState(state: CaseState): boolean {
  return TERMINAL_CASE_STATES.includes(state);
}
