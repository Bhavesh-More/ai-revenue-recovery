'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import {
  AuditLogEntry,
  AuditSortColumn,
  AuditSortDirection,
} from '../../mocks/auditLog';
import { AuditLogRow } from './AuditLogRow';
import { AuditLogPagination } from './AuditLogPagination';

export interface AuditLogTableProps {
  entries: AuditLogEntry[];
  totalFilteredCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  sortColumn: AuditSortColumn;
  sortDirection: AuditSortDirection;
  onSortChange: (column: AuditSortColumn) => void;
  onClearFilters: () => void;
}

export function AuditLogTable({
  entries,
  totalFilteredCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortColumn,
  sortDirection,
  onSortChange,
  onClearFilters,
}: AuditLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderSortIndicator = (column: AuditSortColumn) => {
    if (sortColumn !== column) {
      return (
        <Icon
          icon="lucide:arrow-up-down"
          className="text-xs text-[#8C8C8C] dark:text-[#6B7280] opacity-40 group-hover:opacity-100 transition-opacity ml-1 shrink-0"
        />
      );
    }

    return (
      <Icon
        icon={sortDirection === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'}
        className="text-xs text-[#1A1A1A] dark:text-[#F9FAFB] ml-1 shrink-0 font-bold"
      />
    );
  };

  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm overflow-hidden flex flex-col font-mono transition-colors">
      {/* Responsive Table Container */}
      <div className="overflow-x-auto min-h-0">
        <table className="w-full text-left border-collapse">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-[#E5E7EB] dark:border-[#2A2B2D] bg-[#F8F9FA]/75 dark:bg-[#131416]/75 text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider select-none">
              <th className="py-3 pl-4 pr-2 w-10 text-center">
                <span className="sr-only">Expand</span>
              </th>

              {/* Sortable: Timestamp */}
              <th className="py-3 px-3">
                <button
                  type="button"
                  onClick={() => onSortChange('timestamp')}
                  className="flex items-center group cursor-pointer focus:outline-none"
                  aria-label={`Sort by Timestamp (${sortColumn === 'timestamp' ? sortDirection : 'default'})`}
                >
                  <span>Timestamp</span>
                  {renderSortIndicator('timestamp')}
                </button>
              </th>

              {/* Sortable: User / Agent */}
              <th className="py-3 px-3">
                <button
                  type="button"
                  onClick={() => onSortChange('actor')}
                  className="flex items-center group cursor-pointer focus:outline-none"
                  aria-label={`Sort by User / Agent (${sortColumn === 'actor' ? sortDirection : 'default'})`}
                >
                  <span>User / Agent</span>
                  {renderSortIndicator('actor')}
                </button>
              </th>

              {/* Sortable: Action */}
              <th className="py-3 px-3">
                <button
                  type="button"
                  onClick={() => onSortChange('action')}
                  className="flex items-center group cursor-pointer focus:outline-none"
                  aria-label={`Sort by Action (${sortColumn === 'action' ? sortDirection : 'default'})`}
                >
                  <span>Action</span>
                  {renderSortIndicator('action')}
                </button>
              </th>

              {/* Sortable: Object */}
              <th className="py-3 px-3">
                <button
                  type="button"
                  onClick={() => onSortChange('objectId')}
                  className="flex items-center group cursor-pointer focus:outline-none"
                  aria-label={`Sort by Object (${sortColumn === 'objectId' ? sortDirection : 'default'})`}
                >
                  <span>Object</span>
                  {renderSortIndicator('objectId')}
                </button>
              </th>

              {/* Details */}
              <th className="py-3 px-3">Details</th>

              {/* Result */}
              <th className="py-3 pl-3 pr-6 text-right">Result</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {entries.length > 0 ? (
              entries.map((entry) => (
                <AuditLogRow
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedId === entry.id}
                  onToggleExpand={() => handleToggleExpand(entry.id)}
                />
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#F0F2F5] dark:bg-[#131416] flex items-center justify-center text-[#8C8C8C] dark:text-[#6B7280]">
                      <Icon icon="lucide:search-x" className="text-2xl" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                        No audit events found
                      </p>
                      <p className="text-xs text-[#8C8C8C] dark:text-[#6B7280] mt-1">
                        Try adjusting your search keywords or filter criteria.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClearFilters}
                      className="mt-2 px-3 py-1.5 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] rounded-lg text-xs font-bold hover:bg-black dark:hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <AuditLogPagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalFilteredCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
