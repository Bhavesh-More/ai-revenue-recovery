'use client';

import { useState, useMemo, useEffect } from 'react';
import { Icon } from '@iconify/react';
import {
  AuditLogEntry,
  AuditLogFiltersState,
  AuditSortColumn,
  AuditSortDirection,
  AuditActorType,
  AuditResult,
  AuditObjectType,
  INITIAL_AUDIT_LOGS,
  INITIAL_AUDIT_FILTERS,
} from '../../mocks/auditLog';
import { AuditLogFilters } from './AuditLogFilters';
import { AuditLogTable } from './AuditLogTable';
import { fetchAuditLog } from '../../lib/api';

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [filters, setFilters] = useState<AuditLogFiltersState>(INITIAL_AUDIT_FILTERS);
  const [sortColumn, setSortColumn] = useState<AuditSortColumn>('timestamp');
  const [sortDirection, setSortDirection] = useState<AuditSortDirection>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    fetchAuditLog({ limit: 100 })
      .then((apiLogs) => {
        if (Array.isArray(apiLogs) && apiLogs.length > 0) {
          const mapped: AuditLogEntry[] = apiLogs.map((l) => {
            const actorType: AuditActorType =
              l.actor?.includes('agent') || l.actor?.includes('scenario') || l.actor?.includes('bot')
                ? 'ai'
                : l.actor?.includes('operator') || l.actor?.includes('user') || l.actor?.includes('admin')
                ? 'user'
                : 'system';
            const objectType: AuditObjectType = 'case';
            const result: AuditResult = l.action.includes('fail') || l.action.includes('stop') ? 'failed' : 'success';
            const dateStr = new Date(l.occurredAt || l.timestamp || Date.now())
              .toISOString()
              .replace('T', ' ')
              .slice(0, 19);

            return {
              id: l.id,
              timestamp: dateStr,
              actor: l.actor || 'system:agent',
              actorType,
              action: l.action,
              objectType,
              objectId: l.caseId || 'SYS-101',
              details: l.summary,
              result,
              metadata: l.detail,
            };
          });
          setLogs(mapped);
          setIsLive(true);
        }
      })
      .catch(() => {
        setIsLive(false);
      });
  }, []);

  const showToast = (message: string) => {
    setExportToast(message);
    setTimeout(() => {
      setExportToast(null);
    }, 4000);
  };

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

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.trim().toLowerCase();
        const matchesId = log.id.toLowerCase().includes(query);
        const matchesActor = log.actor.toLowerCase().includes(query);
        const matchesAction = log.action.toLowerCase().includes(query);
        const matchesDetails = log.details.toLowerCase().includes(query);
        const matchesObjectId = log.objectId.toLowerCase().includes(query);

        if (!matchesId && !matchesActor && !matchesAction && !matchesDetails && !matchesObjectId) {
          return false;
        }
      }

      if (filters.actor !== 'All Users & AI') {
        if (filters.actor === 'AI Agent' && log.actorType !== 'ai') return false;
        if (filters.actor === 'Human Operators' && log.actorType !== 'user') return false;
        if (filters.actor === 'System Background' && log.actorType !== 'system') return false;
      }

      if (filters.resultStatus !== 'All Statuses') {
        if (filters.resultStatus === 'Success' && log.result !== 'success') return false;
        if (filters.resultStatus === 'Failed' && log.result !== 'failed') return false;
      }

      return true;
    });
  }, [logs, filters]);

  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let comparison = 0;
      if (sortColumn === 'timestamp') {
        comparison = a.timestamp.localeCompare(b.timestamp);
      } else if (sortColumn === 'actor') {
        comparison = a.actor.localeCompare(b.actor);
      } else if (sortColumn === 'action') {
        comparison = a.action.localeCompare(b.action);
      } else if (sortColumn === 'objectId') {
        comparison = a.objectId.localeCompare(b.objectId);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredLogs, sortColumn, sortDirection]);

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 font-mono">
      {/* Toast */}
      {exportToast && (
        <div className="fixed top-20 right-8 z-50 bg-[#1A1A1A] dark:bg-[#F9FAFB] text-white dark:text-[#1A1A1A] px-4 py-3 rounded-lg shadow-xl border border-neutral-700 dark:border-neutral-200 flex items-center gap-3 animate-bounce">
          <Icon icon="lucide:check-circle-2" className="text-[#00B074] text-lg" />
          <span className="text-sm font-semibold">{exportToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
              Audit Trail & System Logs
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                isLive
                  ? 'bg-[#00B074]/10 text-[#00B074] border-[#00B074]/20'
                  : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20'
              }`}
            >
              {isLive ? 'Live API Audit Log' : 'Sandbox Demo Baseline'}
            </span>
          </div>
          <p className="text-sm text-[#4A4A4A] dark:text-[#9CA3AF]">
            Cryptographically verifiable record of all agent actions, policy evaluations, and state changes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => showToast('Exported audit log CSV report')}
            className="flex items-center gap-2 bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] px-4 py-2 rounded-lg text-sm font-medium text-[#1A1A1A] dark:text-[#F9FAFB] hover:bg-gray-50 dark:hover:bg-[#131416] transition-colors cursor-pointer shadow-sm"
          >
            <Icon icon="lucide:download" className="text-base" />
            <span>Export Audit Log</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <AuditLogFilters
        filters={filters}
        isFiltered={isFiltered}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {/* Log Table Container */}
      <AuditLogTable
        entries={sortedLogs}
        totalFilteredCount={sortedLogs.length}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        currentPage={currentPage}
        pageSize={pageSize}
        onSortChange={handleSortChange}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}
