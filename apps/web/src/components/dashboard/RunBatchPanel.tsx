'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import {
  GenerationMode,
  SyntheticBatchConfig,
  RECOVERY_DIRECTIONS_OPTIONS,
  MIXED_DIRECTION_DISTRIBUTION,
  SINGLE_DIRECTION_DISTRIBUTIONS,
} from '../../mocks/batches';

export interface RunBatchPanelProps {
  onGenerateBatch: (config: SyntheticBatchConfig) => void;
  isGenerating?: boolean;
}

export function RunBatchPanel({
  onGenerateBatch,
  isGenerating = false,
}: RunBatchPanelProps) {
  const [batchName, setBatchName] = useState('SYNTH-RISK-20260830-01');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('mixed');
  const [singleDirection, setSingleDirection] = useState<string>(
    RECOVERY_DIRECTIONS_OPTIONS[0]
  );
  const [numberOfCases, setNumberOfCases] = useState(1000);
  const [dateRangePreset, setDateRangePreset] = useState<'24h' | '7d' | '30d' | 'custom'>('7d');
  const [minAmount, setMinAmount] = useState(499);
  const [maxAmount, setMaxAmount] = useState(14999);

  const [behavioralHistory, setBehavioralHistory] = useState(true);
  const [multiChannelTouchpoints, setMultiChannelTouchpoints] = useState(true);
  const [riskTelemetry, setRiskTelemetry] = useState(true);

  const [hardshipClaims, setHardshipClaims] = useState(true);
  const [highExposureOverrides, setHighExposureOverrides] = useState(true);
  const [repeatedDegradationSurge, setRepeatedDegradationSurge] = useState(false);
  const [disputedCharges, setDisputedCharges] = useState(false);

  const [generateGroundTruth, setGenerateGroundTruth] = useState(true);
  const [randomSeed, setRandomSeed] = useState(42);

  // Active distribution based on mode
  const currentDistribution =
    generationMode === 'mixed'
      ? MIXED_DIRECTION_DISTRIBUTION
      : SINGLE_DIRECTION_DISTRIBUTIONS[singleDirection] ||
        SINGLE_DIRECTION_DISTRIBUTIONS['Subscription Recovery'];

  const handleApplyAmountPreset = (min: number, max: number) => {
    setMinAmount(min);
    setMaxAmount(max);
  };

  const handleRandomizeSeed = () => {
    setRandomSeed(Math.floor(1000 + Math.random() * 90000));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;

    onGenerateBatch({
      batchName: batchName.trim() || `SYNTH-BATCH-${Date.now().toString().slice(-4)}`,
      generationMode,
      singleDirection: generationMode === 'single' ? singleDirection : undefined,
      numberOfCases: Math.max(1, numberOfCases),
      dateRangePreset,
      minAmount: Math.max(1, minAmount),
      maxAmount: Math.max(minAmount, maxAmount),
      customerContext: {
        behavioralHistory,
        multiChannelTouchpoints,
        riskTelemetry,
      },
      edgeCases: {
        hardshipClaims,
        highExposureOverrides,
        repeatedDegradationSurge,
        disputedCharges,
      },
      generateGroundTruth,
      randomSeed,
    });
  };

  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm flex flex-col font-mono transition-colors">
      {/* Header */}
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-start gap-4">
        <div>
          <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
            <Icon icon="lucide:cpu" className="text-[#3B82F6] text-base" />
            Synthetic Case Generator
          </h2>
          <p className="text-xs text-[#8C8C8C] dark:text-[#6B7280] mt-1">
            Configure synthetic revenue-risk workloads to test the recovery pipeline.
          </p>
        </div>
        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 shrink-0">
          Synthetic Engine
        </span>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col gap-5">
        {/* Batch Name */}
        <div>
          <label
            htmlFor="batch-name"
            className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1.5"
          >
            Batch Name
          </label>
          <input
            id="batch-name"
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="e.g. SYNTH-RISK-20260830-01"
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] placeholder:text-[#8C8C8C] dark:placeholder:text-[#6B7280] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors"
          />
        </div>

        {/* Generation Mode */}
        <div>
          <label className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
            Generation Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGenerationMode('mixed')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                generationMode === 'mixed'
                  ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] border-transparent shadow-sm'
                  : 'bg-[#F0F2F5] dark:bg-[#131416] text-[#4A4A4A] dark:text-[#9CA3AF] border-[#E5E7EB] dark:border-[#2A2B2D] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon icon="lucide:layers" className="text-sm" />
              <span>Mixed Directions</span>
            </button>

            <button
              type="button"
              onClick={() => setGenerationMode('single')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                generationMode === 'single'
                  ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] border-transparent shadow-sm'
                  : 'bg-[#F0F2F5] dark:bg-[#131416] text-[#4A4A4A] dark:text-[#9CA3AF] border-[#E5E7EB] dark:border-[#2A2B2D] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon icon="lucide:target" className="text-sm" />
              <span>Single Direction</span>
            </button>
          </div>

          {/* Single Direction Selector (conditional) */}
          {generationMode === 'single' && (
            <div className="mt-3">
              <select
                id="single-direction-select"
                value={singleDirection}
                onChange={(e) => setSingleDirection(e.target.value)}
                className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors cursor-pointer"
              >
                {RECOVERY_DIRECTIONS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Number of Cases & Quick Chips */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="number-of-cases"
              className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider"
            >
              Number of Cases
            </label>
            <div className="flex items-center gap-1.5">
              {[100, 500, 1000, 5000].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setNumberOfCases(count)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    numberOfCases === count
                      ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                      : 'border-[#E5E7EB] dark:border-[#2A2B2D] text-[#8C8C8C] dark:text-[#6B7280] hover:text-[#1A1A1A] dark:hover:text-white'
                  }`}
                >
                  {count.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
          <input
            id="number-of-cases"
            type="number"
            min="1"
            max="100000"
            value={numberOfCases}
            onChange={(e) => setNumberOfCases(Number(e.target.value))}
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-mono transition-colors"
          />
        </div>

        {/* Event Date Range */}
        <div>
          <label
            htmlFor="date-range-preset"
            className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1.5"
          >
            Event Date Range
          </label>
          <select
            id="date-range-preset"
            value={dateRangePreset}
            onChange={(e) =>
              setDateRangePreset(e.target.value as '24h' | '7d' | '30d' | 'custom')
            }
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors cursor-pointer"
          >
            <option value="7d">Last 7 Days (Aug 23 - Aug 30, 2026)</option>
            <option value="24h">Last 24 Hours (Real-time Stream)</option>
            <option value="30d">Last 30 Days (Full Billing Cycle)</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {/* Amount-at-Risk Range & Quick Presets */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider">
              Amount-at-Risk Range
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleApplyAmountPreset(499, 14999)}
                className="text-[10px] px-1.5 py-0.5 rounded border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#8C8C8C] hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer"
              >
                SaaS
              </button>
              <button
                type="button"
                onClick={() => handleApplyAmountPreset(99, 999)}
                className="text-[10px] px-1.5 py-0.5 rounded border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#8C8C8C] hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer"
              >
                Micro
              </button>
              <button
                type="button"
                onClick={() => handleApplyAmountPreset(25000, 1000000)}
                className="text-[10px] px-1.5 py-0.5 rounded border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#8C8C8C] hover:text-[#1A1A1A] dark:hover:text-white transition-colors cursor-pointer"
              >
                B2B
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] dark:text-[#6B7280] font-mono text-xs">
                Min ₹
              </span>
              <input
                type="number"
                min="1"
                value={minAmount}
                onChange={(e) => setMinAmount(Number(e.target.value))}
                className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg pl-12 pr-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-mono transition-colors"
              />
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] dark:text-[#6B7280] font-mono text-xs">
                Max ₹
              </span>
              <input
                type="number"
                min={minAmount}
                value={maxAmount}
                onChange={(e) => setMaxAmount(Number(e.target.value))}
                className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg pl-12 pr-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-mono transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Direction / Event Distribution Legend */}
        <div className="p-3.5 bg-[#F0F2F5] dark:bg-[#131416] rounded-lg border border-[#E5E7EB] dark:border-[#2A2B2D] transition-colors">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider">
              {generationMode === 'mixed' ? 'Pipeline Stream Distribution' : `${singleDirection} Event Mix`}
            </span>
            <span className="text-[10px] text-[#3B82F6] font-bold">100% Total</span>
          </div>

          <div className="space-y-1.5">
            {currentDistribution.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full ${item.colorClass} shrink-0`}
                  />
                  <span className="text-[#4A4A4A] dark:text-[#9CA3AF] truncate">
                    {item.name}
                  </span>
                </div>
                <span className="font-mono font-medium text-[#1A1A1A] dark:text-[#F9FAFB] shrink-0 ml-2">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Context Generation Options */}
        <div className="space-y-2.5">
          <label className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider">
            Customer-Context Generation
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-[#1A1A1A] dark:text-[#F9FAFB]">
            <input
              type="checkbox"
              checked={behavioralHistory}
              onChange={(e) => setBehavioralHistory(e.target.checked)}
              className="rounded text-[#3B82F6] focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Synthesize behavioral history (LTV, tenure, past punctuality)</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-[#1A1A1A] dark:text-[#F9FAFB]">
            <input
              type="checkbox"
              checked={multiChannelTouchpoints}
              onChange={(e) => setMultiChannelTouchpoints(e.target.checked)}
              className="rounded text-[#3B82F6] focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Generate multi-channel touchpoints (SMS, Email, Voice logs)</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-[#1A1A1A] dark:text-[#F9FAFB]">
            <input
              type="checkbox"
              checked={riskTelemetry}
              onChange={(e) => setRiskTelemetry(e.target.checked)}
              className="rounded text-[#3B82F6] focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Enrich risk telemetry (device fingerprint, gateway switch logs)</span>
          </label>
        </div>

        {/* Edge-Case Injection */}
        <div className="space-y-2.5">
          <label className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider">
            Edge-Case Injection (Boundary Tests)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setHardshipClaims((prev) => !prev)}
              className={`p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                hardshipClaims
                  ? 'border-[#FF4444]/40 bg-[#FF4444]/10 text-[#FF4444]'
                  : 'border-[#E5E7EB] dark:border-[#2A2B2D] text-[#8C8C8C] dark:text-[#6B7280]'
              }`}
            >
              <span>Hardship Claims (Opt-Out)</span>
              <Icon icon={hardshipClaims ? 'lucide:check-square' : 'lucide:square'} />
            </button>

            <button
              type="button"
              onClick={() => setHighExposureOverrides((prev) => !prev)}
              className={`p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                highExposureOverrides
                  ? 'border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]'
                  : 'border-[#E5E7EB] dark:border-[#2A2B2D] text-[#8C8C8C] dark:text-[#6B7280]'
              }`}
            >
              <span>VIP &gt;₹5L Escalations</span>
              <Icon icon={highExposureOverrides ? 'lucide:check-square' : 'lucide:square'} />
            </button>

            <button
              type="button"
              onClick={() => setRepeatedDegradationSurge((prev) => !prev)}
              className={`p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                repeatedDegradationSurge
                  ? 'border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#3B82F6]'
                  : 'border-[#E5E7EB] dark:border-[#2A2B2D] text-[#8C8C8C] dark:text-[#6B7280]'
              }`}
            >
              <span>Degradation Spike Surge</span>
              <Icon icon={repeatedDegradationSurge ? 'lucide:check-square' : 'lucide:square'} />
            </button>

            <button
              type="button"
              onClick={() => setDisputedCharges((prev) => !prev)}
              className={`p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                disputedCharges
                  ? 'border-[#8B5CF6]/40 bg-[#8B5CF6]/10 text-[#8B5CF6]'
                  : 'border-[#E5E7EB] dark:border-[#2A2B2D] text-[#8C8C8C] dark:text-[#6B7280]'
              }`}
            >
              <span>Dispute &amp; Chargeback Flags</span>
              <Icon icon={disputedCharges ? 'lucide:check-square' : 'lucide:square'} />
            </button>
          </div>
        </div>

        {/* Ground Truth & Random Seed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Ground Truth Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <button
                type="button"
                role="switch"
                aria-checked={generateGroundTruth}
                onClick={() => setGenerateGroundTruth((prev) => !prev)}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                  generateGroundTruth
                    ? 'bg-[#1A1A1A] dark:bg-white'
                    : 'bg-[#E5E7EB] dark:bg-[#2A2B2D]'
                }`}
              >
                <div
                  className={`bg-white dark:bg-[#171819] w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    generateGroundTruth ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <div>
                <span className="text-xs text-[#1A1A1A] dark:text-[#F9FAFB] font-bold block">
                  Ground Truth Labels
                </span>
                <span className="text-[10px] text-[#8C8C8C] dark:text-[#6B7280]">
                  Attach optimal action benchmark
                </span>
              </div>
            </label>
          </div>

          {/* Random Seed */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label
                htmlFor="random-seed"
                className="block text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider"
              >
                Random Seed
              </label>
              <button
                type="button"
                onClick={handleRandomizeSeed}
                className="text-[10px] text-[#3B82F6] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Icon icon="lucide:shuffle" className="text-xs" />
                Randomize
              </button>
            </div>
            <input
              id="random-seed"
              type="number"
              value={randomSeed}
              onChange={(e) => setRandomSeed(Number(e.target.value))}
              className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-mono transition-colors"
            />
          </div>
        </div>

        {/* Submit CTA */}
        <div className="mt-auto pt-4 border-t border-[#E5E7EB] dark:border-[#2A2B2D]">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] px-4 py-3 rounded-lg text-sm font-bold hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            {isGenerating ? (
              <>
                <Icon icon="lucide:loader-2" className="text-lg animate-spin" />
                <span>Synthesizing Cases &amp; Starting Batch...</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:play-circle" className="text-lg" />
                <span>Generate &amp; Run Synthetic Batch</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
