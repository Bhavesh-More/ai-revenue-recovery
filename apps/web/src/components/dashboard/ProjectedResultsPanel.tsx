'use client';

import { Icon } from '@iconify/react';
import { BatchProjectedResults, formatLakhs } from '../../mocks/batches';

export interface ProjectedResultsPanelProps {
  projectedResults: BatchProjectedResults;
}

export function ProjectedResultsPanel({
  projectedResults,
}: ProjectedResultsPanelProps) {
  const interventionItems = [
    {
      label: 'Payment Link',
      icon: 'lucide:link',
      amount: projectedResults.byIntervention.paymentLink,
    },
    {
      label: 'System Retry',
      icon: 'lucide:refresh-ccw',
      amount: projectedResults.byIntervention.systemRetry,
    },
    {
      label: 'Reminder',
      icon: 'lucide:bell-ring',
      amount: projectedResults.byIntervention.reminder,
    },
    {
      label: 'Customer Action',
      icon: 'lucide:user',
      amount: projectedResults.byIntervention.customerAction,
    },
    {
      label: 'Human Escalation',
      icon: 'lucide:user-check',
      amount: projectedResults.byIntervention.humanEscalation,
    },
  ];

  return (
    <div className="col-span-1 bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm flex flex-col h-[400px] font-mono transition-colors">
      {/* Header */}
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-center">
        <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
          <Icon icon="lucide:bar-chart-3" className="text-[#8C8C8C] dark:text-[#6B7280] text-base" />
          Projected Results
        </h2>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-6 overflow-y-auto scrollbar-hide">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#F0F2F5] dark:bg-[#131416] p-3 rounded-lg border border-[#E5E7EB] dark:border-[#2A2B2D] transition-colors">
            <p className="text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1">
              Risk Revenue
            </p>
            <p className="text-lg font-bold font-mono text-[#1A1A1A] dark:text-[#F9FAFB]">
              {formatLakhs(projectedResults.riskRevenue)}
            </p>
          </div>

          <div className="bg-[#00B074]/10 dark:bg-[#00B074]/20 p-3 rounded-lg border border-[#00B074]/20 transition-colors">
            <p className="text-[10px] font-bold text-[#00B074] uppercase tracking-wider mb-1">
              Recovered
            </p>
            <p className="text-lg font-bold font-mono text-[#00B074]">
              {formatLakhs(projectedResults.recoveredRevenue)}
            </p>
          </div>
        </div>

        {/* Recovery Rate Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-[#4A4A4A] dark:text-[#9CA3AF]">
              Current Recovery Rate
            </span>
            <span className="text-sm font-bold font-mono text-[#1A1A1A] dark:text-[#F9FAFB]">
              {projectedResults.recoveryRate.toFixed(1)}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={projectedResults.recoveryRate}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] rounded-full h-1.5 overflow-hidden"
          >
            <div
              className="bg-[#1A1A1A] dark:bg-white h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, projectedResults.recoveryRate))}%`,
              }}
            />
          </div>
        </div>

        {/* Recovery by Intervention Breakdown List */}
        <div>
          <h3 className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-3">
            Recovery by Intervention
          </h3>
          <div className="space-y-3">
            {interventionItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Icon
                    icon={item.icon}
                    className="text-[#8C8C8C] dark:text-[#6B7280] text-sm"
                  />
                  <span className="text-sm text-[#1A1A1A] dark:text-[#F9FAFB] font-medium">
                    {item.label}
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-[#1A1A1A] dark:text-[#F9FAFB]">
                  {formatLakhs(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
