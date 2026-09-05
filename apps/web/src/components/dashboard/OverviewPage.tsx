'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { MetricCard } from './MetricCard';
import { RecoveryByDirection } from './RecoveryByDirection';
import { RecoveryFunnel } from './RecoveryFunnel';
import {
  fetchMetrics,
  fetchAuditLog,
  fetchRecoveryCases,
  formatCurrencyMinor,
  ComprehensiveRecoveryMetrics,
  ApiAuditLog,
  ApiCase,
} from '../../lib/api';
import { useRealtimeStream } from '../../hooks/useRealtimeStream';

export function OverviewPage() {
  const [metrics, setMetrics] = useState<ComprehensiveRecoveryMetrics | null>(null);
  const [recentActivities, setRecentActivities] = useState<ApiAuditLog[]>([]);
  const [highRiskCasesList, setHighRiskCasesList] = useState<ApiCase[]>([]);
  const [isLive, setIsLive] = useState(false);

  const loadData = async () => {
    try {
      const [m, audit, cases] = await Promise.all([
        fetchMetrics().catch(() => null),
        fetchAuditLog({ limit: 5 }).catch(() => []),
        fetchRecoveryCases({ limit: 10 }).catch(() => []),
      ]);

      if (m) {
        setMetrics(m);
        setIsLive(true);
      }

      if (Array.isArray(audit) && audit.length > 0) {
        setRecentActivities(audit);
      }

      if (Array.isArray(cases)) {
        const highRisk = cases.filter(
          (c) => c.riskTier === 'high' || c.riskTier === 'critical' || c.escalated,
        ).slice(0, 4);
        setHighRiskCasesList(highRisk);
      }
    } catch {
      setIsLive(false);
    }
  };

  const { status: sseStatus } = useRealtimeStream((_event) => {
    loadData();
  });

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    if (typeof window !== 'undefined') {
      window.addEventListener('recovery:data-updated', handleUpdate);
    }

    const interval = setInterval(loadData, 3000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('recovery:data-updated', handleUpdate);
      }
      clearInterval(interval);
    };
  }, []);

  const totalAtRisk = metrics?.revenueAtRiskMinor ?? 0;
  const totalRecovered = metrics?.actualRecoveredMinor ?? 0;
  const totalCases = metrics?.totalCases ?? 0;
  const activeCases = metrics?.activeCases ?? 0;
  const highRiskCount = metrics?.byRiskTier?.high?.totalCases ?? 0 + (metrics?.byRiskTier?.critical?.totalCases ?? 0);
  const recoveryRate = totalAtRisk > 0 ? `${((totalRecovered / totalAtRisk) * 100).toFixed(1)}%` : totalCases > 0 ? '0%' : '—';

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 font-mono">
      {/* Live API indicator banner */}
      <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isLive ? 'bg-[#00B074] animate-pulse' : 'bg-[#F59E0B]'
            }`}
          />
          <span className="font-semibold text-[#1A1A1A] dark:text-[#F9FAFB]">
            {isLive ? 'Live API Backend Connected' : 'Connecting to backend...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold ${
              sseStatus === 'connected'
                ? 'bg-[#00B074]/10 text-[#00B074] border border-[#00B074]/20'
                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            }`}
          >
            SSE Stream: {sseStatus}
          </span>
          <span className="text-[#8C8C8C] dark:text-[#6B7280]">
            {isLive ? 'GET /api/v1/metrics' : 'Connecting to localhost:4000...'}
          </span>
        </div>
      </div>

      {/* 5 Main Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon="lucide:tag"
          label="Revenue at Risk"
          value={formatCurrencyMinor(totalAtRisk)}
          detail={isLive ? 'Live Database Sum' : 'Connecting...'}
        />
        <MetricCard
          icon="lucide:check-square"
          label="Revenue Recovered"
          value={formatCurrencyMinor(totalRecovered)}
          detail={isLive ? 'Total Cash Settled' : 'Connecting...'}
        />
        <MetricCard
          icon="lucide:pie-chart"
          label="Recovery Rate"
          value={recoveryRate}
          detail={isLive ? 'Verified Conversion' : 'Connecting...'}
        />
        <MetricCard
          icon="lucide:users"
          label="Active Cases"
          value={String(activeCases)}
          detail={`${activeCases} active in pipeline`}
          href="/recovery-cases"
        />
        <MetricCard
          icon="lucide:flame"
          label="High Risk"
          value={String(highRiskCount || metrics?.escalatedCases || 0)}
          detail={metrics?.escalatedCases ? `${metrics.escalatedCases} cases escalated` : 'Requires review'}
          href="/recovery-cases"
          iconClassName="text-[#FF4444]"
        />
      </div>

      {/* Main Grid: Left Column (Live Activity & High Risk) + Right Column (Direction Table & Funnel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Agent Activity & High-Risk Interventions */}
        <div className="col-span-1 flex flex-col gap-6">
          {/* Agent Activity Card */}
          <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm transition-colors flex flex-col">
            <div className="p-4 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-center">
              <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
                <Icon icon="lucide:activity" className="text-[#3B82F6]" />
                Live Agent Activity
              </h2>
              <Link
                href="/audit-log"
                className="text-xs font-semibold text-[#3B82F6] hover:underline flex items-center gap-1"
              >
                Audit Log
                <Icon icon="lucide:arrow-up-right" className="text-xs" />
              </Link>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[280px]">
              {recentActivities.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8C8C8C] dark:text-[#6B7280]">
                  No recent activities recorded yet.
                </div>
              ) : (
                recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-lg bg-[#F8F9FA] dark:bg-[#202123] border border-[#E5E7EB] dark:border-[#2A2B2D] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1A1A1A] dark:text-[#F9FAFB] truncate max-w-[140px]">
                        {act.actor}
                      </span>
                      <span className="text-[10px] text-[#8C8C8C] dark:text-[#6B7280]">
                        {new Date(act.occurredAt || act.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#4A4A4A] dark:text-[#D1D5DB] line-clamp-2">
                      {act.summary}
                    </p>
                    {act.caseId && (
                      <Link
                        href={`/recovery-cases/${act.caseId}`}
                        className="text-[10px] text-[#3B82F6] hover:underline inline-block font-semibold"
                      >
                        Case #{act.caseId.slice(0, 8)} →
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* High-Risk Interventions Card */}
          <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm transition-colors flex flex-col">
            <div className="p-4 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-center">
              <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
                <Icon icon="lucide:shield-alert" className="text-[#FF4444]" />
                High-Risk Interventions
              </h2>
              <Link
                href="/approvals"
                className="text-xs font-semibold text-[#FF4444] hover:underline flex items-center gap-1"
              >
                Approvals Queue
                <Icon icon="lucide:arrow-up-right" className="text-xs" />
              </Link>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[280px]">
              {highRiskCasesList.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8C8C8C] dark:text-[#6B7280]">
                  No high-risk interventions pending.
                </div>
              ) : (
                highRiskCasesList.map((c) => (
                  <Link
                    key={c.id}
                    href={`/recovery-cases/${c.id}`}
                    className="block p-2.5 rounded-lg bg-[#F8F9FA] dark:bg-[#202123] border border-[#E5E7EB] dark:border-[#2A2B2D] text-xs space-y-1 hover:border-[#3B82F6] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                        Customer {c.customerId.slice(0, 8)}
                      </span>
                      <span className="font-bold text-[#FF4444]">
                        {formatCurrencyMinor(c.amountAtRiskMinor)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#8C8C8C] dark:text-[#6B7280]">
                      <span>{c.direction.replace(/^[0-9]+_/, '')}</span>
                      <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-bold uppercase">
                        {c.riskTier}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Direction Table & Recovery Funnel */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          <RecoveryByDirection byDirection={metrics?.byDirection} />
          <RecoveryFunnel metrics={metrics ?? undefined} />
        </div>
      </div>
    </div>
  );
}
