import type { CaseState } from "@recovery/types";

export class InvalidStateTransitionError extends Error {
  public readonly code = "INVALID_STATE_TRANSITION" as const;
  public readonly from: CaseState;
  public readonly to: CaseState;

  constructor(from: CaseState, to: CaseState) {
    super(
      `Invalid case state transition: ${from} → ${to}. Allowed targets from ${from}: see ALLOWED_TRANSITIONS.`,
    );
    this.name = "InvalidStateTransitionError";
    this.from = from;
    this.to = to;
  }
}

export class CaseNotFoundError extends Error {
  public readonly code = "CASE_NOT_FOUND" as const;
  public readonly caseId: string;

  constructor(caseId: string) {
    super(`Recovery case ${caseId} not found.`);
    this.name = "CaseNotFoundError";
    this.caseId = caseId;
  }
}

export class CaseAlreadyTerminalError extends Error {
  public readonly code = "RECOVERY_STOPPED" as const;
  public readonly caseId: string;
  public readonly state: CaseState;

  constructor(caseId: string, state: CaseState) {
    super(
      `Recovery case ${caseId} is in terminal state '${state}' and cannot transition further.`,
    );
    this.name = "CaseAlreadyTerminalError";
    this.caseId = caseId;
    this.state = state;
  }
}
