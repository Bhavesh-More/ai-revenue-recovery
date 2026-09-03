'use client';

import { Icon } from '@iconify/react';

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
  const totalPages = Math.max(1, Math.ceil(totalDisplayedCount / pageSize));
  const startIdx = totalDisplayedCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(totalDisplayedCount, currentPage * pageSize);

  const pageNumbers: number[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push(-1); // Ellipsis
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      if (!pageNumbers.includes(i)) pageNumbers.push(i);
    }
    if (currentPage < totalPages - 2) pageNumbers.push(-2); // Ellipsis
    if (!pageNumbers.includes(totalPages)) pageNumbers.push(totalPages);
  }

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
          Showing {startIdx}-{endIdx} of {totalDisplayedCount.toLocaleString()} cases
        </span>

        <div className="flex items-center gap-1">
          {/* Previous Button */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange?.(currentPage - 1)}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-gray-50 dark:hover:bg-[#131416] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Previous page"
          >
            <Icon icon="lucide:chevron-left" />
          </button>

          {/* Dynamic Page Buttons */}
          {pageNumbers.map((p, idx) => {
            if (p < 0) {
              return (
                <span key={idx} className="px-1 text-[#8C8C8C] dark:text-[#6B7280]">
                  ...
                </span>
              );
            }
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange?.(p)}
                className={`w-8 h-8 flex items-center justify-center rounded border font-medium text-sm transition-colors cursor-pointer ${
                  currentPage === p
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] dark:bg-white dark:text-[#131416] dark:border-white font-bold'
                    : 'border-[#E5E7EB] dark:border-[#2A2B2D] text-[#1A1A1A] dark:text-[#F9FAFB] hover:bg-gray-50 dark:hover:bg-[#131416]'
                }`}
              >
                {p}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange?.(currentPage + 1)}
            className="w-8 h-8 flex items-center justify-center rounded border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-gray-50 dark:hover:bg-[#131416] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Next page"
          >
            <Icon icon="lucide:chevron-right" />
          </button>
        </div>
      </div>
    </div>
  );
}
