'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import {
  AuditLogEntry,
  AuditLogFiltersState,
  AuditSortColumn,
  AuditSortDirection,
  INITIAL_AUDIT_LOGS,
  INITIAL_AUDIT_FILTERS,
} from '../../mocks/auditLog';
import { AuditLogFilters } from './AuditLogFilters';
import { AuditLogTable } from './AuditLogTable';

export function AuditLogPage() {
  const [logs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [filters, setFilters] = useState<AuditLogFiltersState>(INITIAL_AUDIT_FILTERS);
  const [sortColumn, setSortColumn] = useState<AuditSortColumn>('timestamp');
  const [sortDirection, setSortDirection] = useState<AuditSortDirection>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [exportToast, setExportToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setExportToast(message);
    setTimeout(() => {
      setExportToast(null);
    }, 4000);
  };

  // Check if any filter is active
  const isFiltered = useMemo(() => {
    return (
      filters.searchQuery.trim() !== '' ||
      filters.dateRange !== 'Last 7 Days' ||
      filters.actionType !== 'All Actions' ||
      filters.actor !== 'All Users & AI' ||
      filters.objectType !== 'All Objects' ||
      filters.resultStatus !== 'All Statuses'
    );
  }, [filters]);

  const handleFilterChange = (newFilters: AuditLogFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters(INITIAL_AUDIT_FILTERS);
    setCurrentPage(1);
  };

  const handleSortChange = (column: AuditSortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  // Filtered dataset
  const filteredEntries = useMemo(() => {
    return logs.filter((entry) => {
      // 1. Search Query
      if (filters.searchQuery.trim() !== '') {
        const q = filters.searchQuery.toLowerCase();
        const matchesId = entry.id.toLowerCase().includes(q);
        const matchesActor = entry.actor.toLowerCase().includes(q);
        const matchesAction = entry.action.toLowerCase().includes(q);
        const matchesObject = entry.objectId.toLowerCase().includes(q);
        const matchesDetails = entry.details.toLowerCase().includes(q);

        if (!matchesId && !matchesActor && !matchesAction && !matchesObject && !matchesDetails) {
          return false;
        }
      }

      // 2. Date Range Filter
      if (filters.dateRange !== 'All Time') {
        const entryDate = new Date(entry.timestamp.replace(' ', 'T'));
        // Fixed reference anchor for prototype (2026-08-30)
        const refDate = new Date('2026-08-30T23:59:59');

        if (filters.dateRange === 'Today') {
          const isToday = entry.timestamp.startsWith('2026-08-30');
          if (!isToday) return false;
        } else if (filters.dateRange === 'Last 7 Days') {
          const diffDays = (refDate.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (filters.dateRange === 'Last 30 Days') {
          const diffDays = (refDate.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        } else if (filters.dateRange === 'Last 90 Days') {
          const diffDays = (refDate.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 90) return false;
        }
      }

      // 3. Action Type Filter
      if (filters.actionType !== 'All Actions') {
        if (entry.action !== filters.actionType) return false;
      }

      // 4. Actor Filter
      if (filters.actor !== 'All Users & AI') {
        if (entry.actor !== filters.actor) return false;
      }

      // 5. Object Type Filter
      if (filters.objectType !== 'All Objects') {
        const objMap: Record<string, string> = {
          Cases: 'case',
          Batches: 'batch',
          Policies: 'policy',
          Approvals: 'approval',
          Settings: 'settings',
        };
        const expectedObj = objMap[filters.objectType];
        if (expectedObj && entry.objectType !== expectedObj) return false;
      }

      // 6. Result Status Filter
      if (filters.resultStatus !== 'All Statuses') {
        if (entry.result !== filters.resultStatus.toLowerCase()) return false;
      }

      return true;
    });
  }, [logs, filters]);

  // Sorted dataset
  const sortedEntries = useMemo(() => {
    const list = [...filteredEntries];

    list.sort((a, b) => {
      let aVal = '';
      let bVal = '';

      switch (sortColumn) {
        case 'timestamp':
          aVal = a.timestamp;
          bVal = b.timestamp;
          break;
        case 'actor':
          aVal = a.actor;
          bVal = b.actor;
          break;
        case 'action':
          aVal = a.action;
          bVal = b.action;
          break;
        case 'objectId':
          aVal = a.objectId;
          bVal = b.objectId;
          break;
        default:
          aVal = a.timestamp;
          bVal = b.timestamp;
      }

      const comparison = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [filteredEntries, sortColumn, sortDirection]);

  // Paginated dataset
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEntries.slice(start, start + pageSize);
  }, [sortedEntries, currentPage, pageSize]);

  // CSV Export handler
  const handleExportCSV = () => {
    if (sortedEntries.length === 0) {
      showToast('No entries to export with current filters.');
      return;
    }

    const escapeCsv = (str: string): string => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Event ID',
      'Timestamp',
      'User / Agent',
      'Actor Type',
      'Action',
      'Object Type',
      'Object ID',
      'Details',
      'Result',
    ];

    const rows = sortedEntries.map((entry) => [
      escapeCsv(entry.id),
      escapeCsv(entry.timestamp),
      escapeCsv(entry.actor),
      escapeCsv(entry.actorType),
      escapeCsv(entry.action),
      escapeCsv(entry.objectType),
      escapeCsv(entry.objectId),
      escapeCsv(entry.details),
      escapeCsv(entry.result),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-log-export-${now}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${sortedEntries.length} audit records to CSV.`);
  };

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full font-mono transition-colors">
      {/* Toast feedback */}
      {exportToast && (
        <div className="fixed top-20 right-8 z-50 px-4 py-3 rounded-xl shadow-lg border bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] border-[#2A2B2D] flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <Icon icon="lucide:check-circle-2" className="text-lg text-[#00B074] shrink-0" />
          <span className="text-xs font-bold">{exportToast}</span>
        </div>
      )}

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#8C8C8C] dark:text-[#6B7280]">
        <Link href="/" className="hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] transition-colors">
          Overview
        </Link>
        <Icon icon="lucide:chevron-right" className="text-xs opacity-60" />
        <span>System</span>
        <Icon icon="lucide:chevron-right" className="text-xs opacity-60" />
        <span className="text-[#1A1A1A] dark:text-[#F9FAFB] font-bold">
          Audit Log
        </span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
            Audit Log
          </h2>
          <p className="text-xs sm:text-sm text-[#4A4A4A] dark:text-[#9CA3AF] mt-1">
            Comprehensive trail of all system and user activities.
          </p>
        </div>

        {/* Export CSV CTA */}
        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2 bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-xs sm:text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] hover:bg-[#F0F2F5] dark:hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer shadow-xs shrink-0 self-end sm:self-auto"
        >
          <Icon icon="lucide:download" className="text-base text-[#3B82F6]" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters and Search Panel */}
      <AuditLogFilters
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
        isFiltered={isFiltered}
      />

      {/* Audit Log Table */}
      <AuditLogTable
        entries={paginatedEntries}
        totalFilteredCount={sortedEntries.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}
