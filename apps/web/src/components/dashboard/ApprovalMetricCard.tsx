'use client';

import { Icon } from '@iconify/react';
import { ApprovalMetrics, formatExposure } from '../../mocks/approvals';

export interface ApprovalMetricsProps {
  metrics: ApprovalMetrics;
}

export function ApprovalMetricCard({ metrics }: ApprovalMetricsProps) {
  const cards = [
    {
      label: 'Pending Review',
      value: String(metrics.pendingReview),
      description: 'Requires immediate attention',
      icon: 'lucide:clock',
      iconColor: 'text-[#F59E0B]',
      fontMono: false,
    },
    {
      label: 'Approved (7d)',
      value: String(metrics.approvedLast7Days),
      description: 'Actions authorized',
      icon: 'lucide:check-circle',
      iconColor: 'text-[#00B074]',
      fontMono: false,
    },
    {
      label: 'Rejected (7d)',
      value: String(metrics.rejectedLast7Days),
      description: 'Actions denied',
      icon: 'lucide:x-circle',
      iconColor: 'text-[#FF4444]',
      fontMono: false,
    },
    {
      label: 'Risk Exposure',
      value: formatExposure(metrics.pendingRiskExposure),
      description: 'Total pending amount',
      icon: 'lucide:shield-alert',
      iconColor: 'text-[#3B82F6]',
      fontMono: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 font-mono">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl p-5 shadow-sm transition-colors"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2 text-[#4A4A4A] dark:text-[#9CA3AF]">
              <Icon icon={card.icon} className={`${card.iconColor} text-base shrink-0`} />
              <h3 className="text-[11px] font-bold uppercase tracking-wider">
                {card.label}
              </h3>
            </div>
          </div>
          <p
            className={`text-3xl font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-2 ${
              card.fontMono ? 'font-mono' : ''
            }`}
          >
            {card.value}
          </p>
          <div className="flex items-center gap-2 text-xs text-[#8C8C8C] dark:text-[#6B7280]">
            <span>{card.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
