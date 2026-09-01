'use client';

import { Icon } from '@iconify/react';
import { ApprovalFilter } from '../../mocks/approvals';

export interface ApprovalFiltersProps {
  currentFilter: ApprovalFilter;
  onFilterChange: (filter: ApprovalFilter) => void;
  counts?: {
    all: number;
    highRisk: number;
    subscription: number;
    b2b: number;
  };
}

export function ApprovalFilters({
  currentFilter,
  onFilterChange,
  counts = { all: 12, highRisk: 4, subscription: 5, b2b: 3 },
}: ApprovalFiltersProps) {
  const filterButtons: {
    id: ApprovalFilter;
    label: string;
    count: number;
    icon?: string;
  }[] = [
    {
      id: 'all',
      label: 'All Pending',
      count: counts.all,
    },
    {
      id: 'high-risk',
      label: 'High Risk',
      count: counts.highRisk,
    },
    {
      id: 'subscription',
      label: 'Subscription',
      count: counts.subscription,
      icon: 'lucide:repeat',
    },
    {
      id: 'b2b',
      label: 'B2B Receivables',
      count: counts.b2b,
      icon: 'lucide:building',
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide font-mono">
      {filterButtons.map((btn) => {
        const isSelected = currentFilter === btn.id;

        return (
          <button
            key={btn.id}
            type="button"
            onClick={() => onFilterChange(btn.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              isSelected
                ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] font-bold shadow-sm'
                : 'bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB]'
            }`}
          >
            {btn.icon && (
              <Icon
                icon={btn.icon}
                className={
                  isSelected
                    ? 'text-white dark:text-[#131416]'
                    : 'text-[#8C8C8C] dark:text-[#6B7280]'
                }
              />
            )}
            <span>
              {btn.label} ({btn.count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
