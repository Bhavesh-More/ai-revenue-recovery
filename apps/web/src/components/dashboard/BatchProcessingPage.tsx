'use client';

import { useState, useEffect } from 'react';
import { RunBatchPanel } from './RunBatchPanel';
import { ActiveBatchPanel } from './ActiveBatchPanel';
import { BatchActivityTimeline } from './BatchActivityTimeline';
import { ProjectedResultsPanel } from './ProjectedResultsPanel';
import {
  Batch,
  INITIAL_BATCH_DATA,
  BatchActivityEvent,
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

  // Generate & Run new batch
  const handleGenerateBatch = (params: {
    direction: string;
    scenarioName: string;
    customers: number;
    avgPayment: number;
    generateHistory: boolean;
    enableSimulation: boolean;
  }) => {
    setIsGenerating(true);

    setTimeout(() => {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomId = Math.floor(100 + Math.random() * 900);
      const batchId = `BATCH-${dateStr}-${randomId}`;

      const totalRisk = params.customers * params.avgPayment;
      const totalRecovered = Math.floor(totalRisk * 0.431);

      const newActivityEvent: BatchActivityEvent = {
        id: `batch_${Date.now()}`,
        caseNumber: `Batch #${randomId}`,
        tag: params.scenarioName,
        time: 'Just now',
        description: `Batch generated for ${params.customers.toLocaleString()} customers.`,
        highlightText: 'Processing initiated',
        highlightColor: 'blue',
        icon: 'lucide:play',
        iconBgClass: 'bg-[#3B82F6]/10 dark:bg-[#3B82F6]/20 border border-[#3B82F6]/30',
        iconTextClass: 'text-[#3B82F6]',
      };

      setBatch({
        id: batchId,
        direction: params.direction,
        scenarioName: params.scenarioName,
        status: 'processing',
        metrics: {
          totalCases: params.customers,
          processedCases: Math.floor(params.customers * 0.15),
          recoveredCases: Math.floor(params.customers * 0.08),
          waitingCases: Math.floor(params.customers * 0.2),
          escalatedCases: Math.floor(params.customers * 0.03),
          stoppedCases: Math.floor(params.customers * 0.02),
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
      {/* Top Row: Run Batch (1/3) & Active Batch (2/3) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <RunBatchPanel
          onGenerateBatch={handleGenerateBatch}
          isGenerating={isGenerating}
        />

        <div className="col-span-1 xl:col-span-2">
          <ActiveBatchPanel
            batch={batch}
            onTogglePause={handleTogglePause}
          />
        </div>
      </div>

      {/* Bottom Row: Live Processing Activity (2/3) & Projected Results (1/3) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="col-span-1 xl:col-span-2">
          <BatchActivityTimeline
            activity={batch.activity}
            isLive={batch.status === 'processing'}
          />
        </div>

        <ProjectedResultsPanel
          projectedResults={batch.projectedResults}
        />
      </div>
    </div>
  );
}
