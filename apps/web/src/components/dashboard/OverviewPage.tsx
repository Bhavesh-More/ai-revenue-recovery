'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from './MetricCard';
import { EmptyStatePanel } from './EmptyStatePanel';
import { RecoveryByDirection } from './RecoveryByDirection';
import { RecoveryFunnel } from './RecoveryFunnel';
import { OverviewData, mockOverviewData } from '../../mocks/overview';
import { fetchOverviewStats, formatCurrencyMinor } from '../../lib/api';
import { useRealtimeStream } from '../../hooks/useRealtimeStream';

export interface OverviewPageProps {
  data?: OverviewData;
}

export function OverviewPage({ data: propData }: OverviewPageProps) {
  const [stats, setStats] = useState<OverviewData>(propData || mockOverviewData);
  const [isLive, setIsLive] = useState(false);

  const loadStats = () => {
    fetchOverviewStats()
      .then((res) => {
        setStats({
          revenueAtRisk: formatCurrencyMinor(res.revenueAtRiskMinor),
          revenueRecovered: formatCurrencyMinor(res.revenueRecoveredMinor),
          recoveryRate: res.totalCasesCount > 0 ? `${res.recoveryRate}%` : '—',
          activeCases: res.activeCases,
          highRiskCases: res.highRiskCases,
          activeCaseSummary: `${res.activeCases} active cases in recovery`,
          riskSummary: res.highRiskCases > 0 ? 'Requires immediate action' : 'System nominal',
        });
        setIsLive(true);
      })
      .catch(() => {
        setIsLive(false);
      });
  };

  const { status: sseStatus } = useRealtimeStream((event) => {
    if (event.type === 'case.created' || event.type === 'case.updated' || event.type === 'webhook.event') {
      loadStats();
    }
  });

  useEffect(() => {
    loadStats();
  }, []);

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
            {isLive ? 'Live API Backend Connected' : 'Local Sandbox Mode (Mock Baseline Active)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold ${
            sseStatus === 'connected' ? 'bg-[#00B074]/10 text-[#00B074] border border-[#00B074]/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
          }`}>
            SSE Stream: {sseStatus}
          </span>
          <span className="text-[#8C8C8C] dark:text-[#6B7280]">
            {isLive ? 'GET /api/v1/cases/stats' : 'Connecting to localhost:3000...'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon="lucide:tag"
          label="Revenue at Risk"
          value={stats.revenueAtRisk}
          detail={isLive ? 'Live Database Sum' : 'System ready'}
        />
        <MetricCard
          icon="lucide:check-square"
          label="Revenue Recovered"
          value={stats.revenueRecovered}
          detail={isLive ? 'Total Cash Settled' : 'Awaiting processing'}
        />
        <MetricCard
          icon="lucide:pie-chart"
          label="Recovery Rate"
          value={stats.recoveryRate}
          detail={isLive ? 'Verified Conversion' : 'Insufficient data'}
        />
        <MetricCard
          icon="lucide:users"
          label="Active Cases"
          value={String(stats.activeCases)}
          detail={stats.activeCaseSummary}
          href="/recovery-cases"
        />
        <MetricCard
          icon="lucide:flame"
          label="High Risk"
          value={String(stats.highRiskCases)}
          detail={stats.riskSummary}
          href="/recovery-cases"
          iconClassName="text-[#FF4444]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="col-span-1 flex flex-col gap-6">
          <EmptyStatePanel
            title="Agent Activity"
            icon="lucide:activity-square"
            emptyIcon="lucide:history"
            message={isLive ? 'Live Monitoring Active' : 'No activity yet'}
            description="Recovery agent operations will appear here."
          />

          <EmptyStatePanel
            title="High-Risk Cases"
            icon="lucide:shield-alert"
            emptyIcon="lucide:clipboard-x"
            message={stats.highRiskCases > 0 ? `${stats.highRiskCases} High-Risk Active` : 'No critical risks'}
            description="High priority interventions are highlighted here."
            href="/recovery-cases"
          />
        </div>

        {/* Right Column */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          <RecoveryByDirection />
          <RecoveryFunnel />
        </div>
      </div>
    </div>
  );
}
