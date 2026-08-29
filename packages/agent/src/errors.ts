export class AgentError extends Error {
  public readonly code:
    | "AGENT_ERROR"
    | "AGENT_TIMEOUT"
    | "AGENT_TOOL_ERROR"
    | "POLICY_VIOLATION";
  public readonly node?: string;

  constructor(
    code:
      | "AGENT_ERROR"
      | "AGENT_TIMEOUT"
      | "AGENT_TOOL_ERROR"
      | "POLICY_VIOLATION",
    message: string,
    node?: string,
  ) {
    super(message);
    this.name = "AgentError";
    this.code = code;
    this.node = node;
  }
}

export class AgentTimeoutError extends AgentError {
  constructor(node?: string, timeoutMs?: number) {
    super(
      "AGENT_TIMEOUT",
      `Agent node ${node ?? "?"} exceeded timeout${
        timeoutMs ? ` (${timeoutMs}ms)` : ""
      }.`,
      node,
    );
    this.name = "AgentTimeoutError";
  }
}

export class AgentToolError extends AgentError {
  public readonly toolName: string;

  constructor(toolName: string, message: string) {
    super(
      "AGENT_TOOL_ERROR",
      `Tool ${toolName} failed: ${message}`,
      "execute",
    );
    this.name = "AgentToolError";
    this.toolName = toolName;
  }
}

export class DecisionNotFoundError extends Error {
  public readonly decisionId: string;
  constructor(decisionId: string) {
    super(`Agent decision ${decisionId} not found.`);
    this.name = "DecisionNotFoundError";
    this.decisionId = decisionId;
  }
}

export class InvalidApprovalTransitionError extends Error {
  public readonly from: string;
  public readonly to: string;

  constructor(from: string, to: string) {
    super(`Cannot transition decision from ${from} to ${to}.`);
    this.name = "InvalidApprovalTransitionError";
    this.from = from;
    this.to = to;
  }
}
