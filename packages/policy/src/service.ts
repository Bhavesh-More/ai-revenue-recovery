import { and, desc, eq, isNull, or, type SQL } from "drizzle-orm";
import {
  policies,
  recoveryActions,
  recoveryCases,
  customers,
  type PolicyRow,
  type NewPolicyRow,
  type RecoveryCaseRow,
  type RecoveryActionRow,
} from "@recovery/db/schema";
import type {
  RecoveryActionType,
  RecoveryDirectionCode,
} from "@recovery/types";
import {
  DEFAULT_POLICY_LIMITS,
  DEFAULT_POLICY_NAME,
  DEFAULT_HIGH_VALUE_APPROVAL_THRESHOLD_MINOR,
} from "./defaults.js";
import { PolicyNotFoundError } from "./errors.js";
import {
  evaluatePolicy,
  type PolicyEvaluationOutput,
  type PolicyLimits,
} from "./evaluator.js";
import { db } from "@recovery/db";

export interface NewPolicyInput {
  name: string;
  applicableDirections?: RecoveryDirectionCode[];
  enabled?: boolean;
  limits: PolicyLimits;
  highValueApprovalThresholdMinor?: number | bigint;
  currency?: string;
}

export type PatchPolicyInput = Partial<Omit<NewPolicyInput, "limits">> & {
  limits?: {
    retry?: Partial<PolicyLimits["retry"]>;
    communication?: Partial<PolicyLimits["communication"]>;
    financial?: Partial<PolicyLimits["financial"]>;
    escalation?: Partial<PolicyLimits["escalation"]>;
    stop?: Partial<PolicyLimits["stop"]>;
  };
};

export interface ListPolicyFilter {
  enabled?: boolean;
}

export interface EvaluateInput {
  caseId: string;
  proposedActionType: RecoveryActionType;
  proposedAmountMinor?: number;
}

export interface EvaluationResult {
  decision: "allow" | "deny" | "require_approval";
  reasons: string[];
  policyId: string;
  requiresApprovalFrom?: "operator" | "account_manager" | "human";
}

const COMMUNICATION_TYPES: readonly RecoveryActionType[] = [
  "send_email",
  "send_sms",
  "send_whatsapp",
  "start_voice_call",
];

function isCommunicationAction(t: RecoveryActionType): boolean {
  return COMMUNICATION_TYPES.includes(t);
}

export class PolicyService {
  constructor(private readonly db: any) {}

  async list(filter: ListPolicyFilter = {}): Promise<PolicyRow[]> {
    const conditions: SQL[] = [];
    if (filter.enabled !== undefined) {
      conditions.push(eq(policies.enabled, filter.enabled));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    return this.db
      .select()
      .from(policies)
      .where(where)
      .orderBy(desc(policies.updatedAt));
  }

  async findById(policyId: string): Promise<PolicyRow> {
    const [row] = await this.db
      .select()
      .from(policies)
      .where(eq(policies.id, policyId))
      .limit(1);
    if (!row) throw new PolicyNotFoundError(policyId);
    return row;
  }

  async findApplicable(direction: RecoveryDirectionCode): Promise<PolicyRow> {
    // Prefer a policy that explicitly lists this direction.
    const allDirections = await this.db
      .select()
      .from(policies)
      .where(eq(policies.enabled, true))
      .orderBy(desc(policies.updatedAt));
    
    for (const p of allDirections) {
      if (Array.isArray(p.applicableDirections) && p.applicableDirections.includes(direction)) {
        return p;
      }
    }
    // Fall back to a global policy (applicable_directions = []).
    for (const p of allDirections) {
      if (
        Array.isArray(p.applicableDirections) &&
        p.applicableDirections.length === 0
      ) {
        return p;
      }
    }
    throw new PolicyNotFoundError(`applicable:${direction}`);
  }

  async create(input: NewPolicyInput, actor: string): Promise<PolicyRow> {
    return this.db.transaction(async (tx: any) => {
      const row: NewPolicyRow = {
        name: input.name,
        applicableDirections: input.applicableDirections ?? [],
        enabled: input.enabled ?? true,
        highValueApprovalThresholdMinor:
          input.highValueApprovalThresholdMinor !== undefined
            ? BigInt(input.highValueApprovalThresholdMinor)
            : DEFAULT_HIGH_VALUE_APPROVAL_THRESHOLD_MINOR,
        currency: input.currency ?? "INR",
        limits: input.limits as any,
        updatedBy: actor,
      };
      const [created] = await tx.insert(policies).values(row).returning();
      return created;
    });
  }

  async patch(
    policyId: string,
    input: PatchPolicyInput,
    actor: string,
  ): Promise<PolicyRow> {
    return this.db.transaction(async (tx: any) => {
      const existing = await tx
        .select()
        .from(policies)
        .where(eq(policies.id, policyId))
        .limit(1);
      if (!existing[0]) throw new PolicyNotFoundError(policyId);
      const current = existing[0];
      const mergedLimits = input.limits
        ? ({ ...(current.limits as any), ...input.limits } as any)
        : (current.limits as any);
      const update: Partial<PolicyRow> = {
        updatedAt: new Date(),
        updatedBy: actor,
      };
      if (input.name !== undefined) update.name = input.name;
      if (input.applicableDirections !== undefined) {
        update.applicableDirections = input.applicableDirections;
      }
      if (input.enabled !== undefined) update.enabled = input.enabled;
      if (input.currency !== undefined) update.currency = input.currency;
      if (input.highValueApprovalThresholdMinor !== undefined) {
        update.highValueApprovalThresholdMinor = BigInt(
          input.highValueApprovalThresholdMinor,
        );
      }
      if (input.limits !== undefined) update.limits = mergedLimits;
      const [updated] = await tx
        .update(policies)
        .set(update)
        .where(eq(policies.id, policyId))
        .returning();
      return updated;
    });
  }

  async activate(policyId: string, actor: string, enabled: boolean): Promise<PolicyRow> {
    return this.db.transaction(async (tx: any) => {
      const existing = await tx
        .select()
        .from(policies)
        .where(eq(policies.id, policyId))
        .limit(1);
      if (!existing[0]) throw new PolicyNotFoundError(policyId);
      const [updated] = await tx
        .update(policies)
        .set({ enabled, updatedAt: new Date(), updatedBy: actor })
        .where(eq(policies.id, policyId))
        .returning();
      return updated;
    });
  }

  async seedDefault(): Promise<PolicyRow> {
    return this.db.transaction(async (tx: any) => {
      const [existing] = await tx
        .select()
        .from(policies)
        .orderBy(desc(policies.updatedAt))
        .limit(1);
      if (existing) return existing;
      const row: NewPolicyRow = {
        name: DEFAULT_POLICY_NAME,
        applicableDirections: [],
        enabled: true,
        highValueApprovalThresholdMinor:
          DEFAULT_HIGH_VALUE_APPROVAL_THRESHOLD_MINOR,
        currency: "INR",
        limits: DEFAULT_POLICY_LIMITS as any,
        updatedBy: "system:bootstrap",
      };
      const [created] = await tx.insert(policies).values(row).returning();
      return created;
    });
  }

  async evaluate(input: EvaluateInput): Promise<EvaluationResult> {
    const [caseRow] = await this.db
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.id, input.caseId))
      .limit(1);
    if (!caseRow) throw new PolicyNotFoundError(`case:${input.caseId}`);

    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, caseRow.customerId))
      .limit(1);

    const caseActions = await this.db
      .select()
      .from(recoveryActions)
      .where(eq(recoveryActions.caseId, input.caseId))
      .orderBy(desc(recoveryActions.createdAt));

    const policy = await this.findApplicable(caseRow.direction);

    const result = evaluatePolicy(
      normalizeLimits(policy),
      input.proposedActionType,
      {
        customerOptedOut: customer?.optedOut ?? false,
        customerCancelled: false,
        caseEscalated: caseRow.escalated,
        actionAttemptCount: caseActions.length,
        lastActionAt: caseActions[0]?.createdAt
          ? new Date(caseActions[0].createdAt)
          : undefined,
        messagesSentCount: caseActions.filter((a: RecoveryActionRow) =>
          isCommunicationAction(a.type as RecoveryActionType),
        ).length,
        proposedAmountMinor: input.proposedAmountMinor,
      },
    );

    return {
      decision: result.decision,
      reasons: result.reasons,
      policyId: policy.id,
      requiresApprovalFrom: result.requiresApprovalFrom,
    };
  }
}

function normalizeLimits(p: PolicyRow): PolicyLimits {
  const limit = p.limits as any;
  const fin = limit.financial ?? {};
  const threshold = fin.highValueApprovalThreshold ?? {
    amountMinor:
      fin.highValueApprovalThresholdMinor !== undefined
        ? Number(fin.highValueApprovalThresholdMinor)
        : Number(p.highValueApprovalThresholdMinor),
    currency: p.currency,
  };
  return {
    retry: limit.retry,
    communication: limit.communication,
    financial: {
      maxDiscountMinor: fin.maxDiscountMinor ?? 0,
      maxPlanDurationDays: fin.maxPlanDurationDays ?? 0,
      highValueApprovalThreshold: threshold,
    },
    escalation: limit.escalation,
    stop: limit.stop,
  };
}

export const policyService = new PolicyService(db);
