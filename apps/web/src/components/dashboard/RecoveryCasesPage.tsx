'use client';

import { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { RecoveryCasesFilters } from './RecoveryCasesFilters';
import { RecoveryCasesTable, SortField, SortDirection } from './RecoveryCasesTable';
import { RecoveryCasesPagination } from './RecoveryCasesPagination';
import { mockRecoveryCases, RecoveryCase } from '../../mocks/recoveryCases';

export interface RecoveryCasesPageProps {
  initialCases?: RecoveryCase[];
}

export function RecoveryCasesPage({ initialCases = mockRecoveryCases }: RecoveryCasesPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('Any Direction');
  const [riskFilter, setRiskFilter] = useState('Any Risk Level');
  const [amountFilter, setAmountFilter] = useState('Any Amount');
  const [sortField, setSortField] = useState<SortField>('amountAtRisk');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Toggle sorting on click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'amountAtRisk' ? 'desc' : 'asc');
    }
  };

  // Combined intersection filter + sort
  const filteredAndSortedCases = useMemo(() => {
    let result = initialCases.filter((item) => {
      // 1. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'high_risk') {
          if (item.risk !== 'High' && item.risk !== 'Critical') {
            return false;
          }
        } else if (item.status !== statusFilter) {
          return false;
        }
      }

      // 2. Direction Filter
      if (directionFilter !== 'Any Direction') {
        if (item.direction !== directionFilter) {
          return false;
        }
      }

      // 3. Risk Filter
      if (riskFilter !== 'Any Risk Level') {
        if (item.risk !== riskFilter) {
          return false;
        }
      }

      // 4. Amount Filter
      if (amountFilter !== 'Any Amount') {
        if (amountFilter === '> ₹1L') {
          if (item.amountAtRisk <= 100000) return false;
        } else if (amountFilter === '₹10k - ₹1L') {
          if (item.amountAtRisk < 10000 || item.amountAtRisk > 100000) return false;
        } else if (amountFilter === '< ₹10k') {
          if (item.amountAtRisk >= 10000) return false;
        }
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matches =
          item.id.toLowerCase().includes(query) ||
          item.customer.toLowerCase().includes(query) ||
          item.direction.toLowerCase().includes(query) ||
          item.directionDisplay.toLowerCase().includes(query);

        if (!matches) return false;
      }

      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      if (sortField === 'amountAtRisk') {
        return sortDirection === 'asc'
          ? a.amountAtRisk - b.amountAtRisk
          : b.amountAtRisk - a.amountAtRisk;
      } else if (sortField === 'id') {
        return sortDirection === 'asc'
          ? a.id.localeCompare(b.id)
          : b.id.localeCompare(a.id);
      }
      return 0;
    });

    return result;
  }, [
    initialCases,
    searchQuery,
    statusFilter,
    directionFilter,
    riskFilter,
    amountFilter,
    sortField,
    sortDirection,
  ]);

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 font-mono">
      {/* Page Header */}
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-1">
            Recovery Cases
          </h2>
          <p className="text-sm text-[#4A4A4A] dark:text-[#9CA3AF]">
            Manage and monitor individual revenue recovery operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] px-4 py-2 rounded-lg text-sm font-medium text-[#1A1A1A] dark:text-[#F9FAFB] hover:bg-gray-50 dark:hover:bg-[#131416] transition-colors cursor-pointer shadow-sm"
          >
            <Icon icon="lucide:download" className="text-base" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <RecoveryCasesFilters
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        directionFilter={directionFilter}
        riskFilter={riskFilter}
        amountFilter={amountFilter}
        onSearchChange={setSearchQuery}
        onStatusChange={setStatusFilter}
        onDirectionChange={setDirectionFilter}
        onRiskChange={setRiskFilter}
        onAmountChange={setAmountFilter}
      />

      {/* Data Table Container */}
      <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm overflow-hidden flex flex-col transition-colors">
        <RecoveryCasesTable
          cases={filteredAndSortedCases}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />

        <RecoveryCasesPagination
          pageSize={pageSize}
          currentPage={currentPage}
          totalDisplayedCount={filteredAndSortedCases.length}
          onPageSizeChange={setPageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
