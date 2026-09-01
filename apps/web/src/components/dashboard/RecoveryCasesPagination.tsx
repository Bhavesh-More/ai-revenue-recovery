'use client';

import { Icon } from '@iconify/react';
import { TOTAL_MOCK_CASES_DISPLAY } from '../../mocks/recoveryCases';

export interface RecoveryCasesPaginationProps {
  pageSize?: number;
  currentPage?: number;
  totalDisplayedCount: number;
  onPageSizeChange?: (size: number) => void;
  onPageChange?: (page: number) => void;
}

export function RecoveryCasesPagination({
  pageSize = 50,
  currentPage = 1,
  totalDisplayedCount,
  onPageSizeChange,
  onPageChange,
}: RecoveryCasesPaginationProps) {
  return (
    <div className="p-4 border-t border-[#E5E7EB] dark:border-[#2A2B2D] flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-[#171819] mt-auto font-mono transition-colors">
      {/* Page Size Selector */}
      <div className="flex items-center gap-2 text-sm text-[#4A4A4A] dark:text-[#9CA3AF]">
        <span>Show</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded px-2 py-1 text-sm text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none cursor-pointer transition-colors"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>per page</span>
      </div>

      {/* Page Range & Navigation Buttons */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-[#4A4A4A] dark:text-[#9CA3AF]">
          Showing 1-{totalDisplayedCount} of {TOTAL_MOCK_CASES_DISPLAY.toLocaleString()} cases
        </span>

        <div className="flex items-center gap-1">
          {/* Previous Button */}
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange?.(currentPage - 1)}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-gray-50 dark:hover:bg-[#131416] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <Icon icon="lucide:chevron-left" />
          </button>

          {/* Page 1 (Active) */}
          <button
            type="button"
            onClick={() => onPageChange?.(1)}
            className={`w-8 h-8 flex items-center justify-center rounded border font-medium text-sm transition-colors ${
              currentPage === 1
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] dark:bg-white dark:text-[#131416] dark:border-white'
                : 'border-[#E5E7EB] dark:border-[#2A2B2D] text-[#1A1A1A] dark:text-[#F9FAFB] hover:bg-gray-50 dark:hover:bg-[#131416]'
            }`}
          >
            1
          </button>

          {/* Page 2 */}
          <button
            type="button"
            onClick={() => onPageChange?.(2)}
            className={`w-8 h-8 flex items-center justify-center rounded border font-medium text-sm transition-colors ${
              currentPage === 2
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] dark:bg-white dark:text-[#131416] dark:border-white'
                : 'border-[#E5E7EB] dark:border-[#2A2B2D] text-[#1A1A1A] dark:text-[#F9FAFB] hover:bg-gray-50 dark:hover:bg-[#131416]'
            }`}
          >
            2
          </button>

          {/* Page 3 */}
          <button
            type="button"
            onClick={() => onPageChange?.(3)}
            className={`w-8 h-8 flex items-center justify-center rounded border font-medium text-sm transition-colors ${
              currentPage === 3
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] dark:bg-white dark:text-[#131416] dark:border-white'
                : 'border-[#E5E7EB] dark:border-[#2A2B2D] text-[#1A1A1A] dark:text-[#F9FAFB] hover:bg-gray-50 dark:hover:bg-[#131416]'
            }`}
          >
            3
          </button>

          {/* Ellipsis */}
          <span className="px-1 text-[#8C8C8C] dark:text-[#6B7280]">...</span>

          {/* Page 26 */}
          <button
            type="button"
            onClick={() => onPageChange?.(26)}
            className={`w-8 h-8 flex items-center justify-center rounded border font-medium text-sm transition-colors ${
              currentPage === 26
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] dark:bg-white dark:text-[#131416] dark:border-white'
                : 'border-[#E5E7EB] dark:border-[#2A2B2D] text-[#1A1A1A] dark:text-[#F9FAFB] hover:bg-gray-50 dark:hover:bg-[#131416]'
            }`}
          >
            26
          </button>

          {/* Next Button */}
          <button
            type="button"
            onClick={() => onPageChange?.(currentPage + 1)}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-gray-50 dark:hover:bg-[#131416] transition-colors"
            aria-label="Next page"
          >
            <Icon icon="lucide:chevron-right" />
          </button>
        </div>
      </div>
    </div>
  );
}
