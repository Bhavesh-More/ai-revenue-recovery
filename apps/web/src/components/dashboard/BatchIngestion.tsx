'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { BATCH_SCENARIOS, BatchScenario } from '../../mocks/ingestion';

export interface BatchIngestionProps {
  onGenerateBatch: (params: {
    scenario: BatchScenario;
    casesToGenerate: number;
    avgPayment: number;
    generateHistory: boolean;
    enableSimulation: boolean;
  }) => void;
  isGenerating?: boolean;
}

export function BatchIngestion({
  onGenerateBatch,
  isGenerating = false,
}: BatchIngestionProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(BATCH_SCENARIOS[0].id);
  const selectedScenario =
    BATCH_SCENARIOS.find((s) => s.id === selectedScenarioId) || BATCH_SCENARIOS[0];

  const [casesToGenerate, setCasesToGenerate] = useState(selectedScenario.defaultBatchSize);
  const [avgPayment, setAvgPayment] = useState(selectedScenario.defaultAvgPayment);
  const [generateHistory, setGenerateHistory] = useState(true);
  const [enableSimulation, setEnableSimulation] = useState(true);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    const found = BATCH_SCENARIOS.find((s) => s.id === scenarioId);
    if (found) {
      setCasesToGenerate(found.defaultBatchSize);
      setAvgPayment(found.defaultAvgPayment);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;

    onGenerateBatch({
      scenario: selectedScenario,
      casesToGenerate: Math.max(1, casesToGenerate),
      avgPayment: Math.max(1, avgPayment),
      generateHistory,
      enableSimulation,
    });
  };

  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm flex flex-col font-mono transition-colors">
      {/* Header */}
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-start gap-4">
        <div>
          <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
            <Icon icon="lucide:layers" className="text-[#F59E0B] text-base" />
            Batch Ingestion
          </h2>
          <p className="text-xs text-[#8C8C8C] dark:text-[#6B7280] mt-1">
            Generate a synthetic workload for recovery processing.
          </p>
        </div>
        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 shrink-0">
          Scenario → N Cases
        </span>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col gap-4">
        {/* Scenario Select with Derived Direction */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="batch-scenario"
              className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider"
            >
              Scenario
            </label>
            <span className="text-[10px] font-semibold text-[#8C8C8C] dark:text-[#6B7280]">
              Direction:{' '}
              <span className="text-[#1A1A1A] dark:text-[#F9FAFB] font-bold">
                {selectedScenario.direction}
              </span>
            </span>
          </div>

          <select
            id="batch-scenario"
            value={selectedScenarioId}
            onChange={(e) => handleScenarioChange(e.target.value)}
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors cursor-pointer"
          >
            {BATCH_SCENARIOS.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name} ({sc.direction})
              </option>
            ))}
          </select>
        </div>

        {/* Cases to Generate & Average Payment Value */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="cases-to-generate"
              className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1.5"
            >
              Cases to Generate
            </label>
            <input
              id="cases-to-generate"
              type="number"
              min="1"
              value={casesToGenerate}
              onChange={(e) => setCasesToGenerate(Number(e.target.value))}
              className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-mono transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="avg-payment-value"
              className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1.5"
            >
              Avg. Payment Value
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] dark:text-[#6B7280] font-mono text-sm">
                ₹
              </span>
              <input
                id="avg-payment-value"
                type="number"
                min="1"
                value={avgPayment}
                onChange={(e) => setAvgPayment(Number(e.target.value))}
                className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg pl-8 pr-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-mono transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Failure Distribution */}
        <div>
          <label className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
            Failure Distribution
          </label>
          <div className="space-y-1.5">
            {selectedScenario.failureDistribution.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${item.colorClass} shrink-0`}
                  />
                  <span className="text-[#4A4A4A] dark:text-[#9CA3AF]">
                    {item.name}
                  </span>
                </div>
                <span className="font-mono font-medium text-[#1A1A1A] dark:text-[#F9FAFB]">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-2.5 pt-1">
          {/* Toggle 1 */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={generateHistory}
              onClick={() => setGenerateHistory((prev) => !prev)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                generateHistory
                  ? 'bg-[#1A1A1A] dark:bg-white'
                  : 'bg-[#E5E7EB] dark:bg-[#2A2B2D]'
              }`}
            >
              <div
                className={`bg-white dark:bg-[#171819] w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  generateHistory ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs text-[#1A1A1A] dark:text-[#F9FAFB] font-medium">
              Generate realistic history
            </span>
          </label>

          {/* Toggle 2 */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={enableSimulation}
              onClick={() => setEnableSimulation((prev) => !prev)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                enableSimulation
                  ? 'bg-[#1A1A1A] dark:bg-white'
                  : 'bg-[#E5E7EB] dark:bg-[#2A2B2D]'
              }`}
            >
              <div
                className={`bg-white dark:bg-[#171819] w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  enableSimulation ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs text-[#1A1A1A] dark:text-[#F9FAFB] font-medium">
              Enable recovery simulation
            </span>
          </label>
        </div>

        {/* Submit CTA */}
        <div className="mt-auto pt-2">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            {isGenerating ? (
              <>
                <Icon icon="lucide:loader-2" className="text-lg animate-spin" />
                <span>Generating Batch...</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:play-circle" className="text-lg" />
                <span>Generate &amp; Run Batch</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
