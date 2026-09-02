import { eq, and, inArray, type SQL } from "drizzle-orm";
import {
  recoveryCases,
  batches,
  type RecoveryCaseRow,
  type BatchRow,
} from "@recovery/db/schema";
import type { RecoveryDirectionCode, CaseState } from "@recovery/types";

export const DEFAULT_DIRECTION_BASELINES: Record<RecoveryDirectionCode, number> = {
  "01_payment_degradation": 0.10,
  "02_checkout_dropoff": 0.15,
  "03_failed_subscription": 0.08,
  "04_b2b_receivables": 0.05,
  "05_mandate_retry": 0.12,
  "06_hinglish_voice": 0.08,
  "07_promise_to_pay": 0.10,
};

export interface SingleMetricSet {
  totalCases: number;
  activeCases: number;
  recoveredCases: number;
  escalatedCases: number;
  stoppedCases: number;
  failedCases: number;
  intervenedCases: number;
  intervenedRecoveredCases: number;
  revenueAtRiskMinor: number;
  expectedRecoveryMinor: number;
  promisedAmountMinor: number;
  actualRecoveredMinor: number;
  recoveryRate: number; // 0.000 to 1.000
  naturalBaselineRecoveredMinor: number;
  incrementalRecoveryMinor: number;
  interventionEffectiveness: number; // 0.000 to 1.000
  escalationRate: number; // 0.000 to 1.000
  stopRate: number; // 0.000 to 1.000
}

export interface ComprehensiveRecoveryMetrics extends SingleMetricSet {
  byDirection: Partial<Record<RecoveryDirectionCode, SingleMetricSet>>;
  byRiskTier: Partial<Record<string, SingleMetricSet>>;
}

export interface MetricsFilter {
  direction?: RecoveryDirectionCode;
  batchId?: string;
  state?: CaseState;
  directions?: RecoveryDirectionCode[];
}

export class RecoveryMetricsCalculator {
  constructor(private readonly db: any) {}

  /**
   * Pure calculation function over array of recovery case rows.
   */
  public calculateFromCases(
    cases: RecoveryCaseRow[],
    baselines: Record<RecoveryDirectionCode, number> = DEFAULT_DIRECTION_BASELINES,
  ): ComprehensiveRecoveryMetrics {
    const overall = this.computeSingleSet(cases, baselines);

    // Group by direction
    const directionGroups: Partial<Record<RecoveryDirectionCode, RecoveryCaseRow[]>> = {};
    // Group by risk tier
    const riskTierGroups: Record<string, RecoveryCaseRow[]> = {};

    for (const c of cases) {
      const dir = c.direction as RecoveryDirectionCode;
      if (!directionGroups[dir]) {
        directionGroups[dir] = [];
      }
      directionGroups[dir]!.push(c);

      const tier = c.riskTier || "medium";
      if (!riskTierGroups[tier]) {
        riskTierGroups[tier] = [];
      }
      riskTierGroups[tier]!.push(c);
    }

    const byDirection: Partial<Record<RecoveryDirectionCode, SingleMetricSet>> = {};
    for (const [dir, dirCases] of Object.entries(directionGroups)) {
      byDirection[dir as RecoveryDirectionCode] = this.computeSingleSet(dirCases!, baselines);
    }

    const byRiskTier: Record<string, SingleMetricSet> = {};
    for (const [tier, tierCases] of Object.entries(riskTierGroups)) {
      byRiskTier[tier] = this.computeSingleSet(tierCases, baselines);
    }

    return {
      ...overall,
      byDirection,
      byRiskTier,
    };
  }

  private computeSingleSet(
    cases: RecoveryCaseRow[],
    baselines: Record<RecoveryDirectionCode, number>,
  ): SingleMetricSet {
    let totalCases = cases.length;
    let activeCases = 0;
    let recoveredCases = 0;
    let escalatedCases = 0;
    let stoppedCases = 0;
    let failedCases = 0;
    let intervenedCases = 0;
    let intervenedRecoveredCases = 0;

    let revenueAtRiskMinor = 0;
    let expectedRecoveryMinor = 0;
    let promisedAmountMinor = 0;
    let actualRecoveredMinor = 0;
    let naturalBaselineRecoveredMinor = 0;

    for (const c of cases) {
      const atRisk = Number(c.amountAtRiskMinor || 0);
      const prob = Number(c.recoveryProbability || 0);
      const recovered = Number(c.outcomeRecoveredMinor || 0);
      const promised = Number(c.outcomePromisedMinor || 0);
      const attempts = Number(c.attemptCount || 0);

      revenueAtRiskMinor += atRisk;
      expectedRecoveryMinor += Math.round(atRisk * prob);
      actualRecoveredMinor += recovered;
      promisedAmountMinor += promised;

      const baselineRate = baselines[c.direction as RecoveryDirectionCode] ?? 0.10;
      naturalBaselineRecoveredMinor += Math.round(atRisk * baselineRate);

      if (c.currentState === "recovered") recoveredCases++;
      else if (c.currentState === "stopped") stoppedCases++;
      else if (c.currentState === "failed") failedCases++;
      else activeCases++;

      if (c.escalated || c.currentState === "escalated") {
        escalatedCases++;
      }

      if (attempts > 0) {
        intervenedCases++;
        if (c.currentState === "recovered") {
          intervenedRecoveredCases++;
        }
      }
    }

    const recoveryRate = revenueAtRiskMinor > 0 ? Number((actualRecoveredMinor / revenueAtRiskMinor).toFixed(4)) : 0;
    const incrementalRecoveryMinor = Math.max(0, actualRecoveredMinor - naturalBaselineRecoveredMinor);
    const interventionEffectiveness = intervenedCases > 0 ? Number((intervenedRecoveredCases / intervenedCases).toFixed(4)) : 0;
    const escalationRate = totalCases > 0 ? Number((escalatedCases / totalCases).toFixed(4)) : 0;
    const stopRate = totalCases > 0 ? Number((stoppedCases / totalCases).toFixed(4)) : 0;

    return {
      totalCases,
      activeCases,
      recoveredCases,
      escalatedCases,
      stoppedCases,
      failedCases,
      intervenedCases,
      intervenedRecoveredCases,
      revenueAtRiskMinor,
      expectedRecoveryMinor,
      promisedAmountMinor,
      actualRecoveredMinor,
      recoveryRate,
      naturalBaselineRecoveredMinor,
      incrementalRecoveryMinor,
      interventionEffectiveness,
      escalationRate,
      stopRate,
    };
  }

  /**
   * Fetch cases from database matching filter and compute comprehensive metrics.
   */
  public async getMetrics(filter: MetricsFilter = {}): Promise<ComprehensiveRecoveryMetrics> {
    const conditions: SQL[] = [];
    if (filter.direction) {
      conditions.push(eq(recoveryCases.direction, filter.direction));
    }
    if (filter.batchId) {
      conditions.push(eq(recoveryCases.batchId, filter.batchId));
    }
    if (filter.state) {
      conditions.push(eq(recoveryCases.currentState, filter.state));
    }
    if (filter.directions && filter.directions.length > 0) {
      conditions.push(inArray(recoveryCases.direction, filter.directions));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows: RecoveryCaseRow[] = await this.db
      .select()
      .from(recoveryCases)
      .where(where);

    return this.calculateFromCases(rows);
  }

  /**
   * Evaluate a batch by ID, update its db record with snapshot counts & metrics.
   */
  public async evaluateBatch(batchId: string): Promise<{ batch: BatchRow; metrics: SingleMetricSet }> {
    const casesInBatch: RecoveryCaseRow[] = await this.db
      .select()
      .from(recoveryCases)
      .where(eq(recoveryCases.batchId, batchId));

    const metrics = this.computeSingleSet(casesInBatch, DEFAULT_DIRECTION_BASELINES);

    const [updated] = await this.db
      .update(batches)
      .set({
        totalCases: BigInt(metrics.totalCases),
        recoveredCases: BigInt(metrics.recoveredCases),
        escalatedCases: BigInt(metrics.escalatedCases),
        stoppedCases: BigInt(metrics.stoppedCases),
        failedCases: BigInt(metrics.failedCases),
        revenueAtRiskMinor: BigInt(metrics.revenueAtRiskMinor),
        revenueRecoveredMinor: BigInt(metrics.actualRecoveredMinor),
        recoveryRate: metrics.recoveryRate.toFixed(3),
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(batches.id, batchId))
      .returning();

    return {
      batch: updated,
      metrics,
    };
  }
}
