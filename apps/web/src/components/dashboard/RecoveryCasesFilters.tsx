'use client';

import { Icon } from '@iconify/react';
import {
  RECOVERY_CASE_DIRECTIONS,
  RECOVERY_CASE_RISK_LEVELS,
  RECOVERY_CASE_AMOUNT_RANGES,
  STATUS_FILTER_TABS,
} from '../../mocks/recoveryCases';

export interface RecoveryCasesFiltersProps {
  searchQuery: string;
  statusFilter: string;
  directionFilter: string;
  riskFilter: string;
  amountFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDirectionChange: (value: string) => void;
  onRiskChange: (value: string) => void;
  onAmountChange: (value: string) => void;
}

export function RecoveryCasesFilters({
  searchQuery,
  statusFilter,
  directionFilter,
  riskFilter,
  amountFilter,
  onSearchChange,
  onStatusChange,
  onDirectionChange,
  onRiskChange,
  onAmountChange,
}: RecoveryCasesFiltersProps) {
  const getTabClass = (tabValue: string) => {
    const isSelected = statusFilter === tabValue;
    if (isSelected) {
      return 'px-3 py-1.5 rounded-md text-xs font-bold bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] shadow-sm transition-all';
    }

    switch (tabValue) {
      case 'Waiting':
        return 'px-3 py-1.5 rounded-md text-xs font-medium text-[#F59E0B] hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-transparent hover:border-orange-200 dark:hover:border-orange-800 transition-colors';
      case 'Cust Action':
        return 'px-3 py-1.5 rounded-md text-xs font-medium text-[#3B82F6] hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-colors';
      case 'Recovered':
        return 'px-3 py-1.5 rounded-md text-xs font-medium text-[#00B074] hover:bg-green-50 dark:hover:bg-green-950/30 border border-transparent hover:border-green-200 dark:hover:border-green-800 transition-colors';
      case 'Escalated':
        return 'px-3 py-1.5 rounded-md text-xs font-medium text-[#FF4444] hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-colors';
      default:
        return 'px-3 py-1.5 rounded-md text-xs font-medium text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-gray-100 dark:hover:bg-[#131416] transition-colors border border-transparent hover:border-[#E5E7EB] dark:hover:border-[#2A2B2D]';
    }
  };

  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm p-4 font-mono transition-colors">
      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onStatusChange(tab.value)}
              className={`${getTabClass(tab.value)} cursor-pointer whitespace-nowrap`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input & Dropdown Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Icon
            icon="lucide:search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] dark:text-[#6B7280]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by ID, customer name, or direction..."
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg pl-10 pr-4 py-2 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] placeholder:text-[#8C8C8C] dark:placeholder:text-[#6B7280] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] focus:bg-white dark:focus:bg-[#131416] transition-colors"
          />
        </div>

        {/* Direction Select */}
        <select
          value={directionFilter}
          onChange={(e) => onDirectionChange(e.target.value)}
          className="bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-sm px-3 py-2 text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none font-medium cursor-pointer transition-colors"
        >
          {RECOVERY_CASE_DIRECTIONS.map((dir) => (
            <option key={dir} value={dir}>
              {dir}
            </option>
          ))}
        </select>

        {/* Risk Select */}
        <select
          value={riskFilter}
          onChange={(e) => onRiskChange(e.target.value)}
          className="bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-sm px-3 py-2 text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none font-medium cursor-pointer transition-colors"
        >
          {RECOVERY_CASE_RISK_LEVELS.map((risk) => (
            <option key={risk} value={risk}>
              {risk}
            </option>
          ))}
        </select>

        {/* Amount Select */}
        <select
          value={amountFilter}
          onChange={(e) => onAmountChange(e.target.value)}
          className="bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-sm px-3 py-2 text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none font-medium cursor-pointer transition-colors"
        >
          {RECOVERY_CASE_AMOUNT_RANGES.map((amt) => (
            <option key={amt} value={amt}>
              {amt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
