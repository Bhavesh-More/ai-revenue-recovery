'use client';

import { useState, useMemo, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { RecoveryCasesFilters } from './RecoveryCasesFilters';
import { RecoveryCasesTable, SortField, SortDirection } from './RecoveryCasesTable';
import { RecoveryCasesPagination } from './RecoveryCasesPagination';
import { mockRecoveryCases, RecoveryCase, RecoveryCaseStatus, RecoveryCaseRisk } from '../../mocks/recoveryCases';
import { fetchRecoveryCases } from '../../lib/api';

export interface RecoveryCasesPageProps {
  initialCases?: RecoveryCase[];
}

function mapDirectionToDisplay(code: string): string {
  switch (code) {
    case '01_payment_degradation':
      return 'Payment Degradation';
    case '02_checkout_dropoff':
      return 'Checkout Dropoff';
    case '03_failed_subscription':
      return 'Subscription Recovery';
    case '04_b2b_receivables':
      return 'B2B Receivables';
    case '05_mandate_retry':
      return 'Mandate Retry';
    case '06_hinglish_voice':
      return 'Hinglish Voice';
    case '07_promise_to_pay':
      return 'Promise-to-Pay';
    default:
      return code;
  }
}

export function RecoveryCasesPage({ initialCases = mockRecoveryCases }: RecoveryCasesPageProps) {
  const [casesList, setCasesList] = useState<RecoveryCase[]>(initialCases);
  const [isLive, setIsLive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('Any Direction');
  const [riskFilter, setRiskFilter] = useState('Any Risk Level');
  const [amountFilter, setAmountFilter] = useState('Any Amount');
  const [sortField, setSortField] = useState<SortField>('amountAtRisk');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchRecoveryCases({ limit: 100 })
      .then((apiCases) => {
        if (Array.isArray(apiCases) && apiCases.length > 0) {
          const mapped: RecoveryCase[] = apiCases.map((c) => {
            const prob = typeof c.recoveryProbability === 'string' ? Math.round(parseFloat(c.recoveryProbability) * 100) : Math.round((c.recoveryProbability || 0.5) * 100);
            const statusMap: Record<string, RecoveryCaseStatus> = {
              detected: 'Waiting',
              investigating: 'Waiting',
              action_selected: 'Waiting',
              waiting: 'Waiting',
              customer_action_required: 'Cust Action',
              recovering: 'Waiting',
              escalated: 'Escalated',
              recovered: 'Recovered',
              stopped: 'Stopped',
              failed: 'Stopped',
            };
            const riskMap: Record<string, RecoveryCaseRisk> = {
              low: 'Low',
              medium: 'Medium',
              high: 'High',
              critical: 'Critical',
            };
            return {
              id: c.id,
              customer: `Customer ${c.customerId.slice(0, 8)}`,
              direction: mapDirectionToDisplay(c.direction),
              directionDisplay: mapDirectionToDisplay(c.direction),
              directionIcon: 'lucide:layers',
              amountAtRisk: Math.round(c.amountAtRiskMinor / 100),
              recovered: c.outcomeRecoveredMinor ? Math.round(c.outcomeRecoveredMinor / 100) : null,
              status: statusMap[c.currentState] || 'Waiting',
              risk: riskMap[c.riskTier] || 'Medium',
              probability: prob,
              owner: c.escalated ? 'Human' : 'AI',
            };
          });
          setCasesList(mapped);
          setIsLive(true);
        }
      })
      .catch(() => {
        setIsLive(false);
      });
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'amountAtRisk' ? 'desc' : 'asc');
    }
  };

  const filteredAndSortedCases = useMemo(() => {
    let result = casesList.filter((item) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'high_risk') {
          if (item.risk !== 'High' && item.risk !== 'Critical') {
            return false;
          }
        } else if (item.status.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      if (directionFilter !== 'Any Direction') {
        if (item.direction !== directionFilter && item.directionDisplay !== directionFilter) {
          return false;
        }
      }

      if (riskFilter !== 'Any Risk Level') {
        if (item.risk !== riskFilter) {
          return false;
        }
      }

      if (amountFilter !== 'Any Amount') {
        if (amountFilter === '> ₹1L') {
          if (item.amountAtRisk <= 100000) return false;
        } else if (amountFilter === '₹10k - ₹1L') {
          if (item.amountAtRisk < 10000 || item.amountAtRisk > 100000) return false;
        } else if (amountFilter === '< ₹10k') {
          if (item.amountAtRisk >= 10000) return false;
        }
      }

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
    casesList,
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
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
              Recovery Cases
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                isLive
                  ? 'bg-[#00B074]/10 text-[#00B074] border-[#00B074]/20'
                  : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20'
              }`}
            >
              {isLive ? 'Live API Data' : 'Sandbox Demo Baseline'}
            </span>
          </div>
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
