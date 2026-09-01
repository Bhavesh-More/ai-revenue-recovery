'use client';

import { Icon } from '@iconify/react';

export interface AuditLogPaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function AuditLogPagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: AuditLogPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="p-4 border-t border-[#E5E7EB] dark:border-[#2A2B2D] bg-[#F8F9FA]/60 dark:bg-[#171819] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs transition-colors">
      {/* Left: Entries counter and Page size */}
      <div className="flex flex-wrap items-center gap-3 text-[#8C8C8C] dark:text-[#6B7280]">
        <span>
          Showing <strong className="text-[#1A1A1A] dark:text-[#F9FAFB]">{startItem}-{endItem}</strong> of{' '}
          <strong className="text-[#1A1A1A] dark:text-[#F9FAFB]">{totalItems}</strong> entries
        </span>

        <div className="flex items-center gap-1.5 ml-2">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Select number of entries per page"
            className="bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded px-2 py-1 text-xs text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>per page</span>
        </div>
      </div>

      {/* Right: Page Navigation Buttons */}
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Go to previous page"
          className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#2A2B2D] bg-white dark:bg-[#131416] text-[#1A1A1A] dark:text-[#F9FAFB] hover:bg-[#F0F2F5] dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
        >
          <Icon icon="lucide:chevron-left" className="text-sm" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 py-1 text-[#8C8C8C] dark:text-[#6B7280]"
              >
                ...
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === currentPage;

          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              aria-label={`Go to page ${pageNum}`}
              aria-current={isActive ? 'page' : undefined}
              className={`min-w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center ${
                isActive
                  ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] shadow-xs'
                  : 'bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-[#F0F2F5] dark:hover:bg-white/5'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next button */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Go to next page"
          className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#2A2B2D] bg-white dark:bg-[#131416] text-[#1A1A1A] dark:text-[#F9FAFB] hover:bg-[#F0F2F5] dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
        >
          <span className="hidden sm:inline">Next</span>
          <Icon icon="lucide:chevron-right" className="text-sm" />
        </button>
      </div>
    </div>
  );
}
