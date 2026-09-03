'use client';

import { Icon } from '@iconify/react';
import Link from 'next/link';
import { SingleMetricSet, formatCurrencyMinor } from '../../lib/api';

export interface DirectionRowData {
  code: string;
  name: string;
  href: string;
  color: string;
}

export const DIRECTION_CONFIGS: DirectionRowData[] = [
  {
    code: '01_payment_degradation',
    name: 'Payment Degradation',
    href: '/directions/payment-degradation',
    color: '#3B82F6',
  },
  {
    code: '02_checkout_dropoff',
    name: 'Checkout Dropoff',
    href: '/directions/checkout-dropoff',
    color: '#F59E0B',
  },
  {
    code: '03_failed_subscription',
    name: 'Subscription Recovery',
    href: '/directions/subscription-recovery',
    color: '#10B981',
  },
  {
    code: '04_b2b_receivables',
    name: 'B2B Receivables',
    href: '/directions/b2b-receivables',
    color: '#6366F1',
  },
  {
    code: '05_mandate_retry',
    name: 'Mandate Retry',
    href: '/directions/mandate-retry',
    color: '#8B5CF6',
  },
  {
    code: '06_hinglish_voice',
    name: 'Hinglish Voice',
    href: '/directions/hinglish-voice',
    color: '#EC4899',
  },
  {
    code: '07_promise_to_pay',
    name: 'Promise-to-Pay',
    href: '/directions/promise-to-pay',
    color: '#14B8A6',
  },
];

export interface RecoveryByDirectionProps {
  byDirection?: Partial<Record<string, SingleMetricSet>>;
}

export function RecoveryByDirection({ byDirection = {} }: RecoveryByDirectionProps) {
  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm transition-colors">
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-center">
        <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
          <Icon icon="lucide:bar-chart-2" className="text-[#8C8C8C] dark:text-[#6B7280]" />
          Recovery by Direction
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href="/recovery-cases"
            className="text-xs font-semibold text-[#3B82F6] hover:underline flex items-center gap-1"
          >
            All Cases
            <Icon icon="lucide:arrow-up-right" className="text-sm" />
          </Link>
        </div>
      </div>

      <div className="p-0 overflow-x-auto scrollbar-hide">
        <table className="w-full text-sm text-left font-mono">
          <thead className="text-[11px] text-[#8C8C8C] dark:text-[#6B7280] bg-[#F0F2F5] dark:bg-[#131416] uppercase font-bold tracking-wider transition-colors">
            <tr>
              <th className="px-6 py-4">Direction</th>
              <th className="px-6 py-4 text-right">Cases</th>
              <th className="px-6 py-4 text-right">At Risk</th>
              <th className="px-6 py-4 text-right">Recovered</th>
              <th className="px-6 py-4 text-right">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#2A2B2D] text-[#1A1A1A] dark:text-[#F9FAFB]">
            {DIRECTION_CONFIGS.map((dir) => {
              const m = byDirection[dir.code];
              const totalCases = m?.totalCases ?? 0;
              const atRisk = m?.revenueAtRiskMinor ?? 0;
              const recovered = m?.actualRecoveredMinor ?? 0;
              const rate = totalCases > 0 ? `${((m?.recoveryRate ?? 0) * 100).toFixed(1)}%` : '0%';

              return (
                <tr
                  key={dir.code}
                  className="hover:bg-[#F0F2F5] dark:hover:bg-[#131416] transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={dir.href}
                      className="flex items-center gap-3 font-medium hover:text-[#3B82F6] dark:hover:text-[#60A5FA] transition-colors"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: dir.color }}
                      />
                      <span className="font-semibold">{dir.name}</span>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium text-[#1A1A1A] dark:text-[#F9FAFB]">
                    {totalCases}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium text-[#1A1A1A] dark:text-[#F9FAFB]">
                    {formatCurrencyMinor(atRisk)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium text-[#00B074]">
                    {formatCurrencyMinor(recovered)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-semibold text-[#1A1A1A] dark:text-[#F9FAFB]">
                    {rate}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
