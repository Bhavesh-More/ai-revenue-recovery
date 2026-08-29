'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import {
  FAILURE_DISTRIBUTION,
  RECOVERY_DIRECTIONS_OPTIONS,
} from '../../mocks/batches';

export interface RunBatchPanelProps {
  onGenerateBatch: (params: {
    direction: string;
    scenarioName: string;
    customers: number;
    avgPayment: number;
    generateHistory: boolean;
    enableSimulation: boolean;
  }) => void;
  isGenerating?: boolean;
}

export function RunBatchPanel({
  onGenerateBatch,
  isGenerating = false,
}: RunBatchPanelProps) {
  const [direction, setDirection] = useState<string>(RECOVERY_DIRECTIONS_OPTIONS[0]);
  const [scenarioName, setScenarioName] = useState('August Billing Failure');
  const [customers, setCustomers] = useState(1000);
  const [avgPayment, setAvgPayment] = useState(2500);
  const [generateHistory, setGenerateHistory] = useState(true);
  const [enableSimulation, setEnableSimulation] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;

    onGenerateBatch({
      direction,
      scenarioName,
      customers: Math.max(1, customers),
      avgPayment: Math.max(1, avgPayment),
      generateHistory,
      enableSimulation,
    });
  };

  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm flex flex-col font-mono transition-colors">
      {/* Header */}
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-center">
        <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
          <Icon icon="lucide:wand-2" className="text-[#8C8C8C] dark:text-[#6B7280] text-base" />
          Run Batch (Scenario Generator)
        </h2>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col gap-5">
        {/* Recovery Direction */}
        <div>
          <label
            htmlFor="recovery-direction"
            className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2"
          >
            Recovery Direction
          </label>
          <select
            id="recovery-direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors cursor-pointer"
          >
            {RECOVERY_DIRECTIONS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Scenario Name */}
        <div>
          <label
            htmlFor="scenario-name"
            className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2"
          >
            Scenario Name
          </label>
          <input
            id="scenario-name"
            type="text"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            placeholder="e.g. August Billing Failure"
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] placeholder:text-[#8C8C8C] dark:placeholder:text-[#6B7280] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors"
          />
        </div>

        {/* Customers & Avg Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="customer-count"
              className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2"
            >
              Customers
            </label>
            <input
              id="customer-count"
              type="number"
              min="1"
              value={customers}
              onChange={(e) => setCustomers(Number(e.target.value))}
              className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-mono transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="avg-payment"
              className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2"
            >
              Avg. Payment
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] dark:text-[#6B7280] font-mono text-sm">
                ₹
              </span>
              <input
                id="avg-payment"
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
          <label className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-3">
            Failure Distribution
          </label>
          <div className="space-y-2">
            {FAILURE_DISTRIBUTION.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-sm"
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
        <div className="flex flex-col gap-3 mt-2">
          {/* Toggle 1 */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={generateHistory}
              onClick={() => setGenerateHistory((prev) => !prev)}
              className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
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
            <span className="text-sm text-[#1A1A1A] dark:text-[#F9FAFB] font-medium">
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
              className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
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
            <span className="text-sm text-[#1A1A1A] dark:text-[#F9FAFB] font-medium">
              Enable recovery simulation
            </span>
          </label>
        </div>

        {/* Submit CTA */}
        <div className="mt-auto pt-4">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] px-4 py-3 rounded-lg text-sm font-bold hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            {isGenerating ? (
              <>
                <Icon icon="lucide:loader-2" className="text-lg animate-spin" />
                <span>Generating...</span>
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
