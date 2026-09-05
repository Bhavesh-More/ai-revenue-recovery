'use client';

import { Icon } from '@iconify/react';
import { Batch } from '../../mocks/batches';

export interface ActiveBatchPanelProps {
  batch: Batch;
  onTogglePause: () => void;
}

export function ActiveBatchPanel({
  batch,
  onTogglePause,
}: ActiveBatchPanelProps) {
  const isProcessing = batch.status === 'processing';
  const isPaused = batch.status === 'paused';
  const isCompleted = batch.status === 'completed';

  const getStatusBadge = () => {
    if (isProcessing) {
      return (
        <div className="bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
          Processing
        </div>
      );
    }
    if (isPaused) {
      return (
        <div className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          Paused
        </div>
      );
    }
    return (
      <div className="bg-[#00B074]/10 text-[#00B074] border border-[#00B074]/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00B074]" />
        Completed
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm flex flex-col font-mono transition-colors">
      {/* Header */}
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex flex-wrap gap-4 justify-between items-center bg-[#F0F2F5]/50 dark:bg-[#131416]/50 rounded-t-xl transition-colors">
        <div>
          <h2 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] flex items-center gap-2">
            {isProcessing && (
              <Icon icon="lucide:loader-2" className="text-[#3B82F6] animate-spin text-base" />
            )}
            {isPaused && (
              <Icon icon="lucide:pause-circle" className="text-[#F59E0B] text-base" />
            )}
            {isCompleted && (
              <Icon icon="lucide:check-circle" className="text-[#00B074] text-base" />
            )}
            <span>Active Batch: {batch.id}</span>
          </h2>
          <p className="text-xs text-[#4A4A4A] dark:text-[#9CA3AF] mt-1">
            Direction: {batch.direction} • {batch.scenarioName}
          </p>
        </div>

        {getStatusBadge()}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-6">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider">
              Completion Progress
            </span>
            <div className="flex items-center gap-2">
              {isProcessing && (
                <span className="text-[10px] text-[#3B82F6] font-semibold animate-pulse font-mono">
                  Processing ({batch.metrics.processedCases}/{batch.metrics.totalCases})...
                </span>
              )}
              <span className="font-mono font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                {batch.metrics.progress.toFixed(1)}%
              </span>
            </div>
          </div>
          <div
            role="progressbar"
            aria-valuenow={batch.metrics.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] rounded-full h-2.5 border border-[#E5E7EB] dark:border-[#2A2B2D] overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all duration-150 ease-out ${
                isCompleted ? 'bg-[#00B074]' : 'bg-[#3B82F6]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, batch.metrics.progress))}%` }}
            />
          </div>
        </div>

        {/* 8 Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Cases */}
          <div className="p-4 border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg bg-[#F0F2F5] dark:bg-[#131416] transition-colors">
            <p className="text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1">
              Total Cases
            </p>
            <p className="text-2xl font-bold font-mono text-[#1A1A1A] dark:text-[#F9FAFB]">
              {batch.metrics.totalCases.toLocaleString()}
            </p>
          </div>

          {/* Processed */}
          <div className="p-4 border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg bg-[#F0F2F5] dark:bg-[#131416] transition-colors">
            <p className="text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1">
              Processed
            </p>
            <p className="text-2xl font-bold font-mono text-[#1A1A1A] dark:text-[#F9FAFB]">
              {batch.metrics.processedCases.toLocaleString()}
            </p>
          </div>

          {/* Recovered */}
          <div className="p-4 border border-[#00B074]/30 rounded-lg bg-white dark:bg-[#171819] shadow-sm ring-1 ring-[#00B074]/20 transition-colors">
            <p className="text-[10px] font-bold text-[#00B074] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Icon icon="lucide:check-circle-2" /> Recovered
            </p>
            <p className="text-2xl font-bold font-mono text-[#1A1A1A] dark:text-[#F9FAFB]">
              {batch.metrics.recoveredCases.toLocaleString()}
            </p>
          </div>

          {/* Waiting */}
          <div className="p-4 border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg bg-[#F0F2F5] dark:bg-[#131416] transition-colors">
            <p className="text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1">
              Waiting
            </p>
            <p className="text-2xl font-bold font-mono text-[#1A1A1A] dark:text-[#F9FAFB]">
              {batch.metrics.waitingCases.toLocaleString()}
            </p>
          </div>

          {/* Escalated */}
          <div className="p-4 border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg bg-[#F0F2F5] dark:bg-[#131416] transition-colors">
            <p className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Icon icon="lucide:alert-circle" /> Escalated
            </p>
            <p className="text-2xl font-bold font-mono text-[#1A1A1A] dark:text-[#F9FAFB]">
              {batch.metrics.escalatedCases.toLocaleString()}
            </p>
          </div>

          {/* Stopped */}
          <div className="p-4 border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg bg-[#F0F2F5] dark:bg-[#131416] transition-colors">
            <p className="text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Icon icon="lucide:stop-circle" /> Stopped
            </p>
            <p className="text-2xl font-bold font-mono text-[#1A1A1A] dark:text-[#F9FAFB]">
              {batch.metrics.stoppedCases.toLocaleString()}
            </p>
          </div>

          {/* Failed */}
          <div className="p-4 border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg bg-[#F0F2F5] dark:bg-[#131416] transition-colors">
            <p className="text-[10px] font-bold text-[#FF4444] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Icon icon="lucide:x-circle" /> Failed
            </p>
            <p className="text-2xl font-bold font-mono text-[#1A1A1A] dark:text-[#F9FAFB]">
              {batch.metrics.failedCases.toLocaleString()}
            </p>
          </div>

          {/* Pause / Resume Button Tile */}
          <button
            type="button"
            disabled={isCompleted}
            onClick={onTogglePause}
            className={`p-4 border rounded-lg flex flex-col justify-center items-center text-center transition-all cursor-pointer ${
              isCompleted
                ? 'border-[#E5E7EB] dark:border-[#2A2B2D] bg-[#F0F2F5] dark:bg-[#131416] text-[#8C8C8C] cursor-not-allowed'
                : isPaused
                ? 'border-[#00B074]/30 bg-[#00B074]/10 hover:bg-[#00B074]/20 text-[#00B074]'
                : 'border-[#3B82F6]/30 bg-[#3B82F6]/5 hover:bg-[#3B82F6]/10 text-[#3B82F6]'
            }`}
          >
            <Icon
              icon={
                isCompleted
                  ? 'lucide:check-circle'
                  : isPaused
                  ? 'lucide:play-circle'
                  : 'lucide:pause-circle'
              }
              className="text-xl mb-1"
            />
            <p className="text-xs font-bold">
              {isCompleted
                ? 'Completed'
                : isPaused
                ? 'Resume Batch'
                : 'Pause Batch'}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
