'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MetricCard } from './MetricCard';
import { DirectionData, DirectionCaseItem } from '../../mocks/directions';
import { fetchRecoveryCases, formatCurrencyMinor } from '../../lib/api';

interface DirectionDashboardPageProps {
  direction: DirectionData;
  activeItem: string;
}

export function DirectionDashboardPage({
  direction,
  activeItem,
}: DirectionDashboardPageProps) {
  const [casesList, setCasesList] = useState<DirectionCaseItem[]>(direction.cases);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    fetchRecoveryCases({ direction: direction.code, limit: 50 })
      .then((apiCases) => {
        if (Array.isArray(apiCases) && apiCases.length > 0) {
          const mapped: DirectionCaseItem[] = apiCases.map((c) => ({
            caseId: c.id,
            customerName: `Customer ${c.customerId.slice(0, 8)}`,
            customerEmail: `cus_${c.customerId.slice(0, 6)}@company.com`,
            amount: formatCurrencyMinor(c.amountAtRiskMinor),
            status: (c.currentState || 'detected') as any,
            riskTier: (c.riskTier || 'medium') as any,
            latestAction: c.latestDecisionSummary || 'Initial direction observation',
            updatedAt: 'Just now',
          }));
          setCasesList(mapped);
          setIsLive(true);
        }
      })
      .catch(() => {
        setIsLive(false);
      });
  }, [direction.code]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F2F5] dark:bg-[#131416] font-mono text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors">
      <Sidebar activeItem={activeItem} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto scrollbar-hide bg-[#F0F2F5] dark:bg-[#131416] transition-colors">
        <Header
          showNotificationBadge
          onSearch={(query) => console.debug('Search:', query)}
          onCalendarClick={() => {}}
          onFilterClick={() => {}}
          onNotificationClick={() => {}}
        />

        <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Header Banner */}
          <div className="bg-white dark:bg-[#171819] p-6 rounded-xl border border-[#E5E7EB] dark:border-[#2A2B2D] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: direction.color }}
              >
                <Icon icon={direction.icon} className="text-2xl" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold tracking-tight text-[#1A1A1A] dark:text-[#F9FAFB]">
                    {direction.title}
                  </h1>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#4A4A4A] dark:text-[#D1D5DB] border border-[#E5E7EB] dark:border-[#374151]">
                    {direction.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isLive
                        ? 'bg-[#00B074]/10 text-[#00B074] border-[#00B074]/20'
                        : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20'
                    }`}
                  >
                    {isLive ? 'Live API Connected' : 'Sandbox Demo Baseline'}
                  </span>
                </div>
                <p className="text-xs text-[#8C8C8C] dark:text-[#9CA3AF] mt-1 font-mono">
                  {direction.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C8C8C] dark:text-[#6B7280] block">
                  Direction Recovery Rate
                </span>
                <span className="text-lg font-bold text-[#00B074]">
                  {direction.recoveryRate}
                </span>
              </div>
              <div className="h-8 w-px bg-[#E5E7EB] dark:bg-[#2A2B2D]" />
              <Link
                href="/recovery-cases"
                className="px-4 py-2 text-xs font-bold text-white bg-black dark:bg-white dark:text-black rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
              >
                View All Cases
              </Link>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {direction.metrics.map((metric, index) => (
              <MetricCard
                key={index}
                icon={metric.icon}
                label={metric.label}
                value={metric.value}
                detail={metric.detail}
              />
            ))}
          </div>

          {/* Analytics & Distribution Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Failure Distribution */}
            <div className="lg:col-span-2 bg-white dark:bg-[#171819] p-6 rounded-xl border border-[#E5E7EB] dark:border-[#2A2B2D] shadow-sm transition-colors">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                    {direction.breakdownTitle}
                  </h2>
                  <p className="text-xs text-[#8C8C8C] dark:text-[#9CA3AF] mt-0.5">
                    Categorized AI recovery reasoning & diagnostic trends
                  </p>
                </div>
                <span className="text-xs font-bold text-[#4A4A4A] dark:text-[#9CA3AF] px-2.5 py-1 rounded bg-[#F8F9FA] dark:bg-[#202123] border border-[#E5E7EB] dark:border-[#2A2B2D]">
                  {casesList.length} Active Insights
                </span>
              </div>

              <div className="space-y-4">
                {direction.breakdownItems.map((item, index) => (
                  <div key={index} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-[#1A1A1A] dark:text-[#F9FAFB]">
                        {item.label}
                      </span>
                      <span className="text-[#8C8C8C] dark:text-[#9CA3AF]">
                        {item.count} cases ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#F0F2F5] dark:bg-[#202123] rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Strategy Info Card */}
            <div className="bg-white dark:bg-[#171819] p-6 rounded-xl border border-[#E5E7EB] dark:border-[#2A2B2D] shadow-sm flex flex-col justify-between transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Icon icon="lucide:cpu" className="text-lg text-[#3B82F6]" />
                  <h2 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                    AI Autonomous Strategy
                  </h2>
                </div>

                <div className="p-4 rounded-lg bg-[#F8F9FA] dark:bg-[#202123] border border-[#E5E7EB] dark:border-[#2A2B2D] mb-4 font-mono text-xs text-[#4A4A4A] dark:text-[#D1D5DB] space-y-2">
                  <p className="font-semibold text-[#1A1A1A] dark:text-[#F9FAFB]">
                    Active Policy Bounds:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[#8C8C8C] dark:text-[#9CA3AF]">
                    <li>Max communication limit: 3 per day</li>
                    <li>Cooloff period: 12 hours</li>
                    <li>High-value escalation threshold: ₹5,00,000</li>
                    <li>Human approval requirement: Level 2</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[#00B074]/20 bg-[#00B074]/5 flex items-center justify-between text-xs font-mono">
                <span className="text-[#00B074] font-bold">
                  Autonomous Engine Operational
                </span>
                <span className="w-2 h-2 rounded-full bg-[#00B074] animate-pulse" />
              </div>
            </div>
          </div>

          {/* Active Direction Cases Table */}
          <div className="bg-white dark:bg-[#171819] rounded-xl border border-[#E5E7EB] dark:border-[#2A2B2D] shadow-sm overflow-hidden transition-colors">
            <div className="p-6 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                  Active Recovery Cases ({casesList.length})
                </h2>
                <p className="text-xs text-[#8C8C8C] dark:text-[#9CA3AF] mt-0.5">
                  Cases currently managed under {direction.title}
                </p>
              </div>

              <Link
                href="/recovery-cases"
                className="text-xs font-bold text-[#3B82F6] hover:underline flex items-center gap-1"
              >
                View all in Cases Tab
                <Icon icon="lucide:arrow-right" className="text-sm" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#E5E7EB] dark:border-[#2A2B2D] bg-[#F8F9FA] dark:bg-[#202123] text-[#8C8C8C] dark:text-[#9CA3AF]">
                    <th className="py-3 px-4 font-semibold">Case ID</th>
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold">Amount</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Risk Tier</th>
                    <th className="py-3 px-4 font-semibold">Latest Action</th>
                    <th className="py-3 px-4 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#2A2B2D]">
                  {casesList.map((c) => (
                    <tr
                      key={c.caseId}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                        <Link
                          href={`/recovery-cases/${c.caseId}`}
                          className="hover:underline text-[#3B82F6]"
                        >
                          {c.caseId}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#1A1A1A] dark:text-[#F9FAFB]">
                          {c.customerName}
                        </div>
                        <div className="text-[10px] text-[#8C8C8C] dark:text-[#9CA3AF]">
                          {c.customerEmail}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                        {c.amount}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                            c.status === 'recovered'
                              ? 'bg-[#00B074]/10 text-[#00B074] border-[#00B074]/20'
                              : c.status === 'escalated'
                              ? 'bg-[#FF4444]/10 text-[#FF4444] border-[#FF4444]/20'
                              : 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            c.riskTier === 'high' || c.riskTier === 'critical'
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}
                        >
                          {c.riskTier}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#4A4A4A] dark:text-[#D1D5DB]">
                        <code className="text-[11px] bg-[#F0F2F5] dark:bg-[#202123] px-1.5 py-0.5 rounded border border-[#E5E7EB] dark:border-[#374151]">
                          {c.latestAction}
                        </code>
                      </td>
                      <td className="py-3.5 px-4 text-[#8C8C8C] dark:text-[#9CA3AF]">
                        {c.updatedAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
