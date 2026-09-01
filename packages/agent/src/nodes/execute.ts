import { sql } from "drizzle-orm";
import { recoveryActions } from "@recovery/db/schema";
import { auditService } from "@recovery/audit";
import { caseLifecycle } from "@recovery/case-lifecycle";
import { dispatchAgentTool, findAgentTool } from "../tool-registry.js";
import type { AgentStateType } from "../state.js";

const TERMINAL_ACTIONS = new Set([
  "escalate_to_human",
  "stop_case",
]);

const IMMEDIATE_RECOVERY_ACTIONS = new Set([
  "retry_payment",
  "send_payment_link",
]);

const CUSTOMER_ACTION_REQUIRED_ACTIONS = new Set([
  "request_payment_method_update",
  "send_email",
  "send_sms",
  "send_whatsapp",
]);

export interface ExecuteDeps {
  db: any;
}

export function executeNode(deps: ExecuteDeps) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const rec = state.recommendation;
    if (!rec) {
      return {
        phase: "failed",
        error: {
          code: "AGENT_ERROR",
          message: "No recommendation to execute.",
          node: "execute",
        },
      };
    }

    const tool = findAgentTool(rec.actionType);
    if (!tool) {
      await auditService.record({
        caseId: state.caseId,
        action: "decision_failed",
        summary: `No tool registered for actionType=${rec.actionType}.`,
        detail: {
          runId: state.runId,
          actionType: rec.actionType,
        },
        actor: "agent:execute",
      });
      return {
        phase: "failed",
        error: {
          code: "AGENT_ERROR",
          message: `No tool registered for actionType=${rec.actionType}`,
          node: "execute",
        },
      };
    }

    const caseRow = await caseLifecycle.findById(state.caseId);

    const toolInput = {
      ...(rec.parameters ?? {}),
      customerId: caseRow.customerId,
      caseId: state.caseId,
    };

    const dispatch = await dispatchAgentTool({
      tool,
      input: toolInput,
      ctx: {
        caseId: state.caseId,
        actor: "agent:execute",
        data: {
          runId: state.runId,
          customerId: caseRow.customerId,
        },
      },
      runId: state.runId,
    });

    if (!dispatch.ok) {
      return deps.db.transaction(async (tx: any) => {
        const actionId = sql`gen_random_uuid()`;
        await tx
          .insert(recoveryActions)
          .values({
            id: actionId as unknown as string,
            caseId: state.caseId,
            customerId: caseRow.customerId,
            type: rec.actionType,
            status: "failed",
            requiredApproval: state.policyResult?.decision === "require_approval",
            approvedAt:
              state.policyResult?.decision === "require_approval"
                ? new Date()
                : null,
            approvedBy:
              state.policyResult?.decision === "require_approval"
                ? state.approval?.approvedBy ?? "system"
                : null,
            payload: toolInput as any,
            amountMinor:
              typeof rec.parameters?.amountMinor === "number"
                ? String(rec.parameters.amountMinor)
                : null,
            currency:
              typeof rec.parameters?.currency === "string"
                ? (rec.parameters.currency as string)
                : caseRow.currency,
            resultStatus: "failed",
            resultMessage: dispatch.error.message,
            resultObservedAt: new Date(),
            executedAt: new Date(),
          });

        await auditService.record(
          {
            caseId: state.caseId,
            action: "action_failed",
            summary: `Tool ${tool.name} failed: ${dispatch.error.message}`,
            detail: {
              runId: state.runId,
              tool: tool.name,
              errorClass: dispatch.error.name,
              errorMessage: dispatch.error.message,
            },
            actor: `agent:tool:${tool.name}`,
          },
          tx,
        );

        await auditService.record(
          {
            caseId: state.caseId,
            action: "action_executed",
            summary: `Executed ${rec.actionType} for case ${state.caseId} (failed).`,
            detail: {
              runId: state.runId,
              actionType: rec.actionType,
              rationale: rec.rationale,
              approvalState: state.approval?.status ?? null,
              status: "failed",
            },
            actor: "agent:execute",
          },
          tx,
        );

        try {
          await caseLifecycle.transition({
            caseId: state.caseId,
            toState: "failed",
            reason: `tool ${tool.name} failed: ${dispatch.error.message}`,
            actor: "agent:execute",
          });
        } catch {}

        return {
          phase: "executed",
          outcome: {
            recoveredMinor: 0,
            promisedMinor: 0,
            reason: dispatch.error.message,
          },
        };
      });
    }

    const result = dispatch.output as {
      status?: string;
      externalReference?: string;
      message?: string;
      observedAt?: string;
    };

    return deps.db.transaction(async (tx: any) => {
      const actionId = sql`gen_random_uuid()`;
      await tx
        .insert(recoveryActions)
        .values({
          id: actionId as unknown as string,
          caseId: state.caseId,
          customerId: caseRow.customerId,
          type: rec.actionType,
          status: (result.status as any) ?? "succeeded",
          requiredApproval: state.policyResult?.decision === "require_approval",
          approvedAt:
            state.policyResult?.decision === "require_approval"
              ? new Date()
              : null,
          approvedBy:
            state.policyResult?.decision === "require_approval"
              ? state.approval?.approvedBy ?? "system"
              : null,
          payload: toolInput as any,
          amountMinor:
            typeof rec.parameters?.amountMinor === "number"
              ? String(rec.parameters.amountMinor)
              : null,
          currency:
            typeof rec.parameters?.currency === "string"
              ? (rec.parameters.currency as string)
              : caseRow.currency,
          resultStatus: (result.status as any) ?? "succeeded",
          resultExternalReference: result.externalReference ?? null,
          resultMessage: result.message ?? `[stub] ${rec.actionType} completed`,
          resultObservedAt: result.observedAt
            ? new Date(result.observedAt)
            : new Date(),
          executedAt: new Date(),
        });

      await auditService.record(
        {
          caseId: state.caseId,
          action: "action_executed",
          summary: `Executed ${rec.actionType} for case ${state.caseId}.`,
          detail: {
            runId: state.runId,
            actionType: rec.actionType,
            rationale: rec.rationale,
            approvalState: state.approval?.status ?? null,
            durationMs: dispatch.durationMs,
            externalReference: result.externalReference ?? null,
          },
          actor: "agent:execute",
        },
        tx,
      );

      if (!TERMINAL_ACTIONS.has(rec.actionType)) {
        try {
          await caseLifecycle.transition({
            caseId: state.caseId,
            toState: "investigating",
            reason: `agent started execution of ${rec.actionType}`,
            actor: "agent:execute",
          });
        } catch {}
        try {
          await caseLifecycle.transition({
            caseId: state.caseId,
            toState: "action_selected",
            reason: `agent selected ${rec.actionType}`,
            actor: "agent:execute",
          });
        } catch {}
        try {
          await caseLifecycle.transition({
            caseId: state.caseId,
            toState: "recovering",
            reason: `agent executing ${rec.actionType}`,
            actor: "agent:execute",
          });
        } catch {}
        if (CUSTOMER_ACTION_REQUIRED_ACTIONS.has(rec.actionType)) {
          try {
            await caseLifecycle.transition({
              caseId: state.caseId,
              toState: "customer_action_required",
              reason: `customer action required after ${rec.actionType}`,
              actor: "agent:execute",
            });
          } catch {}
        }
        if (rec.actionType === "schedule_retry") {
          try {
            await caseLifecycle.transition({
              caseId: state.caseId,
              toState: "waiting",
              reason: "retry scheduled for a safer recovery window",
              actor: "agent:execute",
            });
          } catch {}
        }
      }

      const recoveredMinor =
        IMMEDIATE_RECOVERY_ACTIONS.has(rec.actionType) &&
        ((result.status as string | undefined) ?? "succeeded") === "succeeded"
          ? typeof rec.parameters?.amountMinor === "number"
            ? rec.parameters.amountMinor
            : Number(caseRow.amountAtRiskMinor)
          : 0;

      if (recoveredMinor > 0) {
        await caseLifecycle.recordOutcome({
          caseId: state.caseId,
          recoveredMinor,
          promisedMinor: 0,
          reason: result.message ?? `${rec.actionType} recovered payment`,
          actor: "agent:execute",
        });
      }

      return {
        phase: "executed",
        outcome: {
          recoveredMinor,
          promisedMinor: 0,
          reason: result.message ?? `[tool] ${rec.actionType} executed`,
        },
      };
    });
  };
}
