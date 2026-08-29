'use client';

import { Icon } from '@iconify/react';
import { RecoveryCase, RecoveryCaseStatus, RecoveryCaseRisk } from '../../mocks/recoveryCases';

export type SortField = 'id' | 'amountAtRisk';
export type SortDirection = 'asc' | 'desc';

export interface RecoveryCasesTableProps {
  cases: RecoveryCase[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

export function formatIndianCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

export function StatusBadge({ status }: { status: RecoveryCaseStatus }) {
  switch (status) {
    case 'Waiting':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold bg-orange-100 dark:bg-orange-950/40 text-[#F59E0B]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          Waiting
        </span>
      );
    case 'Escalated':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold bg-red-100 dark:bg-red-950/40 text-[#FF4444]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF4444]" />
          Escalated
        </span>
      );
    case 'Recovered':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold bg-green-100 dark:bg-green-950/40 text-[#00B074]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00B074]" />
          Recovered
        </span>
      );
    case 'Cust Action':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-950/40 text-[#3B82F6]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
          Cust Action
        </span>
      );
    case 'Stopped':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold bg-gray-200 dark:bg-gray-800 text-[#4A4A4A] dark:text-[#9CA3AF]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4A4A4A] dark:bg-[#9CA3AF]" />
          Stopped
        </span>
      );
  }
}

function RiskBadge({ risk, probability }: { risk: RecoveryCaseRisk; probability: number }) {
  const getRiskColor = () => {
    switch (risk) {
      case 'Critical':
      case 'High':
        return 'text-[#FF4444]';
      case 'Medium':
        return 'text-[#F59E0B]';
      case 'Low':
        return 'text-[#00B074]';
    }
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-[10px] font-bold uppercase ${getRiskColor()}`}>
        {risk}
      </span>
      <span className="text-xs text-[#4A4A4A] dark:text-[#9CA3AF] font-mono">
        {probability}%
      </span>
    </div>
  );
}

export function RecoveryCasesTable({
  cases,
  sortField,
  sortDirection,
  onSort,
}: RecoveryCasesTableProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <table className="w-full text-sm text-left whitespace-nowrap font-mono">
        <thead className="text-[11px] text-[#8C8C8C] dark:text-[#6B7280] bg-[#F0F2F5] dark:bg-[#131416] uppercase font-bold tracking-wider border-b border-[#E5E7EB] dark:border-[#2A2B2D] transition-colors">
          <tr>
            <th
              onClick={() => onSort('id')}
              className="px-6 py-4 cursor-pointer hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] group transition-colors"
            >
              <div className="flex items-center gap-1">
                <span>Case ID</span>
                <Icon
                  icon={
                    sortField === 'id'
                      ? sortDirection === 'asc'
                        ? 'lucide:arrow-up'
                        : 'lucide:arrow-down'
                      : 'lucide:arrow-up-down'
                  }
                  className={`text-xs ${
                    sortField === 'id'
                      ? 'text-[#1A1A1A] dark:text-white opacity-100'
                      : 'opacity-0 group-hover:opacity-100 transition-opacity'
                  }`}
                />
              </div>
            </th>
            <th className="px-6 py-4">Customer</th>
            <th className="px-6 py-4">Direction</th>
            <th
              onClick={() => onSort('amountAtRisk')}
              className="px-6 py-4 cursor-pointer hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] group text-right transition-colors"
            >
              <div className="flex items-center justify-end gap-1">
                <span>Amount at Risk</span>
                <Icon
                  icon={
                    sortField === 'amountAtRisk'
                      ? sortDirection === 'asc'
                        ? 'lucide:arrow-up'
                        : 'lucide:arrow-down'
                      : 'lucide:arrow-up-down'
                  }
                  className={`text-xs ${
                    sortField === 'amountAtRisk'
                      ? 'text-[#1A1A1A] dark:text-white opacity-100'
                      : 'opacity-0 group-hover:opacity-100 transition-opacity'
                  }`}
                />
              </div>
            </th>
            <th className="px-6 py-4 text-right">Recovered</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Risk / Prob.</th>
            <th className="px-6 py-4">Owner</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#2A2B2D] text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors">
          {cases.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-6 py-12 text-center text-sm text-[#8C8C8C] dark:text-[#6B7280]">
                No recovery cases match your filters.
              </td>
            </tr>
          ) : (
            cases.map((item) => (
              <tr
                key={item.id}
                className={`hover:bg-gray-50 dark:hover:bg-[#131416] transition-colors group cursor-pointer ${
                  item.isStopped ? 'opacity-60' : ''
                }`}
              >
                {/* Case ID */}
                <td className="px-6 py-4 font-mono font-medium text-[#3B82F6]">
                  {item.id}
                </td>

                {/* Customer */}
                <td className="px-6 py-4 font-medium">
                  {item.customer}
                </td>

                {/* Direction */}
                <td className="px-6 py-4 text-[#4A4A4A] dark:text-[#9CA3AF]">
                  <div className="flex items-center gap-2">
                    <Icon
                      icon={item.directionIcon}
                      className="text-[#8C8C8C] dark:text-[#6B7280] text-base"
                    />
                    <span>{item.directionDisplay}</span>
                  </div>
                </td>

                {/* Amount at Risk */}
                <td
                  className={`px-6 py-4 text-right font-mono font-bold ${
                    item.isStopped ? 'line-through' : ''
                  }`}
                >
                  {formatIndianCurrency(item.amountAtRisk)}
                </td>

                {/* Recovered Amount */}
                <td
                  className={`px-6 py-4 text-right font-mono font-bold ${
                    item.recovered !== null
                      ? 'text-[#00B074]'
                      : 'text-[#8C8C8C] dark:text-[#6B7280]'
                  }`}
                >
                  {item.recovered !== null
                    ? formatIndianCurrency(item.recovered)
                    : '-'}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <StatusBadge status={item.status} />
                </td>

                {/* Risk / Prob */}
                <td className="px-6 py-4">
                  <RiskBadge risk={item.risk} probability={item.probability} />
                </td>

                {/* Owner */}
                <td className="px-6 py-4">
                  {item.owner === 'AI' ? (
                    <div className="flex items-center gap-2 text-xs text-[#4A4A4A] dark:text-[#9CA3AF]">
                      <Icon icon="lucide:bot" className="text-base" />
                      <span>AI</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-[#4A4A4A] dark:text-[#9CA3AF]">
                      <div className="w-4 h-4 rounded bg-[#3B82F6] text-white text-[9px] font-bold flex items-center justify-center">
                        AU
                      </div>
                      <span>Human</span>
                    </div>
                  )}
                </td>

                {/* Action */}
                <td className="px-6 py-4 text-right">
                  {item.owner === 'Human' && item.status === 'Escalated' ? (
                    <button
                      type="button"
                      className="px-3 py-1 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] text-xs font-medium rounded hover:bg-black transition-colors cursor-pointer"
                    >
                      Review
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 text-[#3B82F6] text-sm font-medium hover:underline transition-opacity cursor-pointer"
                    >
                      View Details
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
