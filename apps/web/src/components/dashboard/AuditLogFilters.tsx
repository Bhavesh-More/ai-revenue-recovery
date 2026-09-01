'use client';

import { Icon } from '@iconify/react';
import {
  AuditLogFiltersState,
  ACTION_TYPE_OPTIONS,
  ACTOR_OPTIONS,
  OBJECT_TYPE_OPTIONS,
  RESULT_STATUS_OPTIONS,
  DATE_RANGE_OPTIONS,
} from '../../mocks/auditLog';

export interface AuditLogFiltersProps {
  filters: AuditLogFiltersState;
  onChange: (filters: AuditLogFiltersState) => void;
  onClear: () => void;
  isFiltered: boolean;
}

export function AuditLogFilters({
  filters,
  onChange,
  onClear,
  isFiltered,
}: AuditLogFiltersProps) {
  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl p-4 sm:p-5 shadow-sm font-mono flex flex-col gap-4 transition-colors">
      {/* Top row: Search and Clear Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xl">
          <Icon
            icon="lucide:search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] dark:text-[#6B7280] text-base"
          />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Search by ID, user, or action description..."
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-[#1A1A1A] dark:text-[#F9FAFB] placeholder:text-[#8C8C8C] dark:placeholder:text-[#6B7280] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors"
          />
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center justify-center gap-1.5 px-3 py-2 border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-xs font-bold text-[#FF4444] dark:text-[#F87171] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer shrink-0"
          >
            <Icon icon="lucide:x" className="text-sm" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Bottom row: Filter Dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Date Range */}
        <div>
          <label
            htmlFor="audit-filter-date"
            className="block text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1"
          >
            Date Range
          </label>
          <select
            id="audit-filter-date"
            value={filters.dateRange}
            onChange={(e) =>
              onChange({
                ...filters,
                dateRange: e.target.value as AuditLogFiltersState['dateRange'],
              })
            }
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-2.5 py-1.5 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors cursor-pointer"
          >
            {DATE_RANGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Action Type */}
        <div>
          <label
            htmlFor="audit-filter-action"
            className="block text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1"
          >
            Action Type
          </label>
          <select
            id="audit-filter-action"
            value={filters.actionType}
            onChange={(e) => onChange({ ...filters, actionType: e.target.value })}
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-2.5 py-1.5 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors cursor-pointer"
          >
            {ACTION_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* User / Agent */}
        <div>
          <label
            htmlFor="audit-filter-actor"
            className="block text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1"
          >
            User / Agent
          </label>
          <select
            id="audit-filter-actor"
            value={filters.actor}
            onChange={(e) => onChange({ ...filters, actor: e.target.value })}
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-2.5 py-1.5 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors cursor-pointer"
          >
            {ACTOR_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Object Type */}
        <div>
          <label
            htmlFor="audit-filter-object"
            className="block text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1"
          >
            Object Type
          </label>
          <select
            id="audit-filter-object"
            value={filters.objectType}
            onChange={(e) => onChange({ ...filters, objectType: e.target.value })}
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-2.5 py-1.5 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors cursor-pointer"
          >
            {OBJECT_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Result Status */}
        <div>
          <label
            htmlFor="audit-filter-result"
            className="block text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1"
          >
            Result Status
          </label>
          <select
            id="audit-filter-result"
            value={filters.resultStatus}
            onChange={(e) => onChange({ ...filters, resultStatus: e.target.value })}
            className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-2.5 py-1.5 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] font-medium transition-colors cursor-pointer"
          >
            {RESULT_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
