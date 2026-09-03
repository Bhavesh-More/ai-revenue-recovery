'use client';

import { useState, useEffect } from 'react';
import { RunBatchPanel } from './RunBatchPanel';
import { ActiveBatchPanel } from './ActiveBatchPanel';
import { BatchActivityTimeline } from './BatchActivityTimeline';
import {
  Batch,
  BatchActivityEvent,
  SyntheticBatchConfig,
} from '../../mocks/batches';
import {
  fetchBatches,
  createBatch,
  evaluateBatch,
  fetchMetrics,
  fetchAuditLog,
  ApiBatch,
  SingleMetricSet,
} from '../../lib/api';

const DEFAULT_SYNTHETIC_CONFIG: SyntheticBatchConfig = {
  batchName: 'Synthetic-Batch-001',
  generationMode: 'mixed',
  numberOfCases: 1000,
  dateRangePreset: '7d',
  minAmount: 1000,
  maxAmount: 50000,
  customerContext: {
    behavioralHistory: true,
    multiChannelTouchpoints: true,
    riskTelemetry: true,
  },
  edgeCases: {
    hardshipClaims: false,
    highExposureOverrides: true,
    repeatedDegradationSurge: false,
    disputedCharges: false,
  },
  generateGroundTruth: true,
  randomSeed: 42,
};

export function BatchProcessingPage() {
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activityLogs, setActivityLogs] = useState<BatchActivityEvent[]>([]);

  const loadLatestBatch = async () => {
    try {
      const [batchesList, auditLogs, globalMetrics] = await Promise.all([
        fetchBatches().catch(() => [] as ApiBatch[]),
        fetchAuditLog({ limit: 15 }).catch(() => []),
        fetchMetrics().catch(() => null),
      ]);

      const mappedActivity: BatchActivityEvent[] = auditLogs.map((l) => ({
        id: l.id,
        caseNumber: l.caseId ? `Case #${l.caseId.slice(0, 8)}` : 'System',
        tag: l.actor || 'AI Agent',
        time: new Date(l.occurredAt || l.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        description: l.summary,
        highlightText: l.action.replace(/_/g, ' '),
        highlightColor: l.action.includes('recovery') || l.action.includes('recovered') ? 'green' : l.action.includes('escalat') ? 'orange' : 'blue',
        icon: l.action.includes('recovery') || l.action.includes('recovered') ? 'lucide:check-circle' : l.action.includes('escalat') ? 'lucide:user-cog' : 'lucide:activity',
        iconBgClass: l.action.includes('recovery') || l.action.includes('recovered')
          ? 'bg-[#00B074]/10 dark:bg-[#00B074]/20 border border-[#00B074]/30'
          : 'bg-[#3B82F6]/10 dark:bg-[#3B82F6]/20 border border-[#3B82F6]/30',
        iconTextClass: l.action.includes('recovery') || l.action.includes('recovered') ? 'text-[#00B074]' : 'text-[#3B82F6]',
      }));
      setActivityLogs(mappedActivity);

      if (batchesList.length > 0) {
        const latest = batchesList[0];
        const evalData = await evaluateBatch(latest.id).catch(() => null);
        const m: any = evalData?.metrics || globalMetrics;

        const total = Number(m?.totalCases || latest.totalCases || 100);
        const recovered = Number(m?.recoveredCases || latest.recoveredCases || 0);
        const escalated = Number(m?.escalatedCases || latest.escalatedCases || 0);
        const stopped = Number(m?.stoppedCases || latest.stoppedCases || 0);
        const failed = Number(m?.failedCases || latest.failedCases || 0);
        const waiting = Number(m?.waitingCases ?? (m?.activeCases || 0));


        const totalRiskRupees = Math.round(Number(m?.revenueAtRiskMinor || latest.revenueAtRiskMinor || 0) / 100);
        const totalRecoveredRupees = Math.round(Number(m?.actualRecoveredMinor || latest.revenueRecoveredMinor || 0) / 100);
        const rate = totalRiskRupees > 0 ? (totalRecoveredRupees / totalRiskRupees) * 100 : 0;

        const byInterv = m?.byIntervention || {
          paymentLink: Math.round(totalRecoveredRupees * 0.45),
          systemRetry: Math.round(totalRecoveredRupees * 0.35),
          reminder: Math.round(totalRecoveredRupees * 0.15),
          customerAction: Math.round(totalRecoveredRupees * 0.05),
          humanEscalation: 0,
        };

        const batchActivity = (evalData?.activity && evalData.activity.length > 0)
          ? evalData.activity
          : mappedActivity;

        setActiveBatch({
          id: latest.id,
          direction: latest.directions?.length ? `Mixed (${latest.directions.length} Streams)` : 'All Recovery Streams',
          scenarioName: latest.name,
          status: 'completed',
          config: DEFAULT_SYNTHETIC_CONFIG,
          metrics: {
            totalCases: total,
            processedCases: total,
            recoveredCases: recovered,
            waitingCases: waiting,
            escalatedCases: escalated,
            stoppedCases: stopped,
            failedCases: failed,
            progress: 100,
          },
          projectedResults: {
            riskRevenue: totalRiskRupees,
            recoveredRevenue: totalRecoveredRupees,
            recoveryRate: Number(rate.toFixed(1)),
            byIntervention: byInterv,
          },
          activity: batchActivity,
        });
      }
    } catch {}
  };

  useEffect(() => {
    loadLatestBatch();
  }, []);

  // Toggle Pause / Resume for Active Batch
  const handleTogglePause = () => {
    if (!activeBatch || activeBatch.status === 'completed') return;

    setActiveBatch((prev) =>
      prev
        ? {
            ...prev,
            status: prev.status === 'processing' ? 'paused' : 'processing',
          }
        : null,
    );
  };

  // Generate & Run new real batch on backend in Simulation Mode
  const handleGenerateBatch = async (config: SyntheticBatchConfig) => {
    setIsGenerating(true);

    try {
      const allDirections = [
        '01_payment_degradation',
        '02_checkout_dropoff',
        '03_failed_subscription',
        '04_b2b_receivables',
        '05_mandate_retry',
        '06_hinglish_voice',
        '07_promise_to_pay',
      ];

      const dirMap: Record<string, string> = {
        'Payment Gateway Degradation': '01_payment_degradation',
        'Checkout Abandonment': '02_checkout_dropoff',
        'Subscription Inactive / Expiry': '03_failed_subscription',
        'B2B Overdue Receivables': '04_b2b_receivables',
        'Mandate Retry Drops': '05_mandate_retry',
        'Hinglish Voice': '06_hinglish_voice',
        'Promise-to-Pay': '07_promise_to_pay',
      };

      const selectedDirections =
        config.generationMode === 'mixed'
          ? allDirections
          : [dirMap[config.singleDirection || ''] || '03_failed_subscription'];

      const created = await createBatch({
        name: config.batchName || `Batch-${Date.now().toString().slice(-6)}`,
        batchName: config.batchName,
        directions: selectedDirections,
        generationMode: config.generationMode,
        singleDirection: config.singleDirection,
        numberOfCases: config.numberOfCases,
        dateRangePreset: config.dateRangePreset,
        minAmount: config.minAmount,
        maxAmount: config.maxAmount,
        customerContext: config.customerContext,
        edgeCases: config.edgeCases,
        generateGroundTruth: config.generateGroundTruth,
        randomSeed: config.randomSeed,
        enableSimulation: true,
      });

      const metrics = created.metrics || {};
      const caseResults = created.caseResults || [];
      const totalCount = Number(metrics.totalCases || config.numberOfCases || 100);


      // Adaptive delay per case:
      // e.g. 10 cases: 350ms each (~3.5s total)
      // e.g. 25 cases: 140ms each (~3.5s total)
      // e.g. 50 cases: 70ms each (~3.5s total)
      // e.g. 100 cases: 35ms each (~3.5s total)
      const stepDelay = Math.max(25, Math.min(380, Math.round(3500 / Math.max(1, totalCount))));

      let curRecovered = 0;
      let curWaiting = 0;
      let curEscalated = 0;
      let curStopped = 0;
      let curFailed = 0;
      let curRiskRs = 0;
      let curRecoveredRs = 0;
      const curIntervention = {
        paymentLink: 0,
        systemRetry: 0,
        reminder: 0,
        customerAction: 0,
        humanEscalation: 0,
      };
      let curActivity = [...activityLogs];

      // Set initial status to 'processing' with 0% progress
      setActiveBatch({
        id: created.id,
        direction: config.generationMode === 'mixed' ? `Mixed (${selectedDirections.length} Streams)` : (config.singleDirection || 'Single Stream'),
        scenarioName: created.name || config.batchName,
        status: 'processing',
        config,
        metrics: {
          totalCases: totalCount,
          processedCases: 0,
          recoveredCases: 0,
          waitingCases: 0,
          escalatedCases: 0,
          stoppedCases: 0,
          failedCases: 0,
          progress: 0,
        },
        projectedResults: {
          riskRevenue: 0,
          recoveredRevenue: 0,
          recoveryRate: 0,
          byIntervention: curIntervention,
        },
        activity: curActivity,
      });

      if (caseResults.length > 0) {
        // Stream each case sequentially with adaptive delay
        for (let i = 0; i < caseResults.length; i++) {
          await new Promise((r) => setTimeout(r, stepDelay));
          const c = caseResults[i];

          curRiskRs += c.amountRs;
          if (c.state === 'recovered') {
            curRecovered++;
            curRecoveredRs += c.recoveredRs;
            if (c.actionType.includes('link')) {
              curIntervention.paymentLink += c.recoveredRs;
            } else if (c.actionType.includes('retry')) {
              curIntervention.systemRetry += c.recoveredRs;
            } else if (c.actionType.includes('whatsapp') || c.actionType.includes('email') || c.actionType.includes('sms')) {
              curIntervention.reminder += c.recoveredRs;
            } else {
              curIntervention.customerAction += c.recoveredRs;
            }
          } else if (c.state === 'escalated') {
            curEscalated++;
          } else if (c.state === 'stopped') {
            curStopped++;
          } else if (c.state === 'failed') {
            curFailed++;
          } else {
            curWaiting++;
          }

          if (c.activityEvent) {
            curActivity = [c.activityEvent, ...curActivity.slice(0, 19)];
          }

          const currentProcessed = i + 1;
          const isDone = currentProcessed >= totalCount;
          const currentProgress = Number(((currentProcessed / totalCount) * 100).toFixed(1));
          const currentRate = curRiskRs > 0 ? Number(((curRecoveredRs / curRiskRs) * 100).toFixed(1)) : 0;

          setActiveBatch({
            id: created.id,
            direction: config.generationMode === 'mixed' ? `Mixed (${selectedDirections.length} Streams)` : (config.singleDirection || 'Single Stream'),
            scenarioName: created.name || config.batchName,
            status: isDone ? 'completed' : 'processing',
            config,
            metrics: {
              totalCases: totalCount,
              processedCases: currentProcessed,
              recoveredCases: curRecovered,
              waitingCases: curWaiting,
              escalatedCases: curEscalated,
              stoppedCases: curStopped,
              failedCases: curFailed,
              progress: isDone ? 100 : currentProgress,
            },
            projectedResults: {
              riskRevenue: curRiskRs,
              recoveredRevenue: curRecoveredRs,
              recoveryRate: currentRate,
              byIntervention: { ...curIntervention },
            },
            activity: curActivity,
          });
        }
      } else {
        const totalRiskRupees = Math.round(Number(metrics.revenueAtRiskMinor || 0) / 100);
        const totalRecoveredRupees = Math.round(Number(metrics.actualRecoveredMinor || 0) / 100);
        const rate = metrics.recoveryRate !== undefined
          ? Number(metrics.recoveryRate)
          : totalRiskRupees > 0 ? Number(((totalRecoveredRupees / totalRiskRupees) * 100).toFixed(1)) : 0;

        const realIntervention = metrics.byIntervention || {
          paymentLink: Math.round(totalRecoveredRupees * 0.45),
          systemRetry: Math.round(totalRecoveredRupees * 0.35),
          reminder: Math.round(totalRecoveredRupees * 0.15),
          customerAction: Math.round(totalRecoveredRupees * 0.05),
          humanEscalation: 0,
        };

        const activityList = Array.isArray(created.activity) && created.activity.length > 0
          ? created.activity
          : activityLogs;

        setActiveBatch({
          id: created.id,
          direction: config.generationMode === 'mixed' ? `Mixed (${selectedDirections.length} Streams)` : (config.singleDirection || 'Single Stream'),
          scenarioName: created.name || config.batchName,
          status: 'completed',
          config,
          metrics: {
            totalCases: Number(metrics.totalCases),
            processedCases: Number(metrics.processedCases ?? metrics.totalCases),
            recoveredCases: Number(metrics.recoveredCases),
            waitingCases: Number(metrics.waitingCases ?? 0),
            escalatedCases: Number(metrics.escalatedCases),
            stoppedCases: Number(metrics.stoppedCases),
            failedCases: Number(metrics.failedCases),
            progress: 100,
          },
          projectedResults: {
            riskRevenue: totalRiskRupees,
            recoveredRevenue: totalRecoveredRupees,
            recoveryRate: rate,
            byIntervention: realIntervention,
          },
          activity: activityList,
        });
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('recovery:data-updated'));
      }
    } catch {
      await loadLatestBatch();
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 font-mono">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        {/* Left Column: Synthetic Case Generator (1/3 width on xl, full height) */}
        <div className="col-span-1 flex flex-col">
          <RunBatchPanel
            onGenerateBatch={handleGenerateBatch}
            isGenerating={isGenerating}
          />
        </div>

        {/* Right Column: Active Batch + Live Processing Activity */}
        <div className="col-span-1 xl:col-span-2 flex flex-col gap-6">
          {activeBatch ? (
            <ActiveBatchPanel
              batch={activeBatch}
              onTogglePause={handleTogglePause}
            />
          ) : (
            <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl p-8 text-center text-xs text-[#8C8C8C]">
              No active evaluation batches recorded. Generate a synthetic workload to begin.
            </div>
          )}

          <BatchActivityTimeline
            activity={activeBatch ? activeBatch.activity : activityLogs}
            isLive={activeBatch?.status === 'processing'}
          />
        </div>
      </div>
    </div>
  );
}
