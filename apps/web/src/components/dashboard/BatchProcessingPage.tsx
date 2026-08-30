'use client';

import { useState, useEffect } from 'react';
import { RunBatchPanel } from './RunBatchPanel';
import { ActiveBatchPanel } from './ActiveBatchPanel';
import { BatchActivityTimeline } from './BatchActivityTimeline';
import {
  Batch,
  INITIAL_BATCH_DATA,
  BatchActivityEvent,
  SyntheticBatchConfig,
} from '../../mocks/batches';

export function BatchProcessingPage() {
  const [batch, setBatch] = useState<Batch>(INITIAL_BATCH_DATA);
  const [isGenerating, setIsGenerating] = useState(false);

  // Background progress simulation when active batch is 'processing'
  useEffect(() => {
    if (batch.status !== 'processing') return;

    const interval = setInterval(() => {
      setBatch((prev) => {
        if (prev.status !== 'processing') return prev;

        const nextProgress = Math.min(100, prev.metrics.progress + 0.6);
        const isDone = nextProgress >= 100;
        const total = prev.metrics.totalCases;
        const newProcessed = Math.min(total, Math.floor((nextProgress / 100) * total));
        const newRecovered = Math.floor(newProcessed * 0.436);

        return {
          ...prev,
          status: isDone ? 'completed' : 'processing',
          metrics: {
            ...prev.metrics,
            progress: nextProgress,
            processedCases: newProcessed,
            recoveredCases: newRecovered,
          },
        };
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [batch.status]);

  // Toggle Pause / Resume for Active Batch
  const handleTogglePause = () => {
    if (batch.status === 'completed') return;

    setBatch((prev) => ({
      ...prev,
      status: prev.status === 'processing' ? 'paused' : 'processing',
    }));
  };

  // Generate & Run new synthetic batch
  const handleGenerateBatch = (config: SyntheticBatchConfig) => {
    setIsGenerating(true);

    setTimeout(() => {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const batchId = `BATCH-${dateStr}-${config.randomSeed.toString().slice(0, 4)}`;

      const avgAmount = (config.minAmount + config.maxAmount) / 2;
      const totalRisk = Math.round(config.numberOfCases * avgAmount);
      const totalRecovered = Math.round(totalRisk * 0.431);

      const directionLabel =
        config.generationMode === 'mixed'
          ? 'Mixed (5 Streams)'
          : config.singleDirection || 'Subscription Recovery';

      const edgeCaseTags: string[] = [];
      if (config.edgeCases.hardshipClaims) edgeCaseTags.push('Hardship');
      if (config.edgeCases.highExposureOverrides) edgeCaseTags.push('VIP >₹5L');
      if (config.edgeCases.repeatedDegradationSurge) edgeCaseTags.push('Spike Surge');
      if (config.edgeCases.disputedCharges) edgeCaseTags.push('Disputes');

      const newActivityEvent: BatchActivityEvent = {
        id: `batch_${Date.now()}`,
        caseNumber: `Batch ${batchId}`,
        tag: directionLabel,
        time: 'Just now',
        description: `Synthetic cases generated (${config.numberOfCases.toLocaleString()} cases, Seed #${config.randomSeed}).`,
        highlightText: edgeCaseTags.length > 0 ? `Edge cases: ${edgeCaseTags.join(', ')}` : 'Pipeline running',
        highlightColor: 'blue',
        icon: 'lucide:play',
        iconBgClass: 'bg-[#3B82F6]/10 dark:bg-[#3B82F6]/20 border border-[#3B82F6]/30',
        iconTextClass: 'text-[#3B82F6]',
      };

      setBatch({
        id: batchId,
        direction: directionLabel,
        scenarioName: config.batchName,
        status: 'processing',
        config,
        metrics: {
          totalCases: config.numberOfCases,
          processedCases: Math.floor(config.numberOfCases * 0.15),
          recoveredCases: Math.floor(config.numberOfCases * 0.08),
          waitingCases: Math.floor(config.numberOfCases * 0.2),
          escalatedCases: config.edgeCases.highExposureOverrides
            ? Math.floor(config.numberOfCases * 0.04)
            : Math.floor(config.numberOfCases * 0.01),
          stoppedCases: config.edgeCases.hardshipClaims
            ? Math.floor(config.numberOfCases * 0.03)
            : 0,
          failedCases: 2,
          progress: 15.0,
        },
        projectedResults: {
          riskRevenue: totalRisk,
          recoveredRevenue: totalRecovered,
          recoveryRate: 43.1,
          byIntervention: {
            paymentLink: Math.floor(totalRecovered * 0.34),
            systemRetry: Math.floor(totalRecovered * 0.28),
            reminder: Math.floor(totalRecovered * 0.15),
            customerAction: Math.floor(totalRecovered * 0.11),
            humanEscalation: Math.floor(totalRecovered * 0.12),
          },
        },
        activity: [newActivityEvent, ...batch.activity],
      });

      setIsGenerating(false);
    }, 600);
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

        {/* Right Column: Active Batch + Live Processing Activity (2/3 width on xl, spans matching height) */}
        <div className="col-span-1 xl:col-span-2 flex flex-col gap-6">
          <ActiveBatchPanel
            batch={batch}
            onTogglePause={handleTogglePause}
          />

          <BatchActivityTimeline
            activity={batch.activity}
            isLive={batch.status === 'processing'}
          />
        </div>
      </div>
    </div>
  );
}
