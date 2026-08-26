export class PolicyNotFoundError extends Error {
  public readonly code = "POLICY_NOT_FOUND" as const;
  public readonly policyId: string;

  constructor(policyId: string) {
    super(`Policy ${policyId} not found.`);
    this.name = "PolicyNotFoundError";
    this.policyId = policyId;
  }
}

export class PolicyDisabledError extends Error {
  public readonly code = "POLICY_DISABLED" as const;
  public readonly policyId: string;

  constructor(policyId: string) {
    super(`Policy ${policyId} is disabled.`);
    this.name = "PolicyDisabledError";
    this.policyId = policyId;
  }
}
