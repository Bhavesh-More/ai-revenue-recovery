'use client';

import { Icon } from '@iconify/react';
import Link from 'next/link';
import { SingleMetricSet, formatCurrencyMinor } from '../../lib/api';

export interface RecoveryFunnelProps {
  metrics?: SingleMetricSet;
}

export function RecoveryFunnel({ metrics }: RecoveryFunnelProps) {
  const total = metrics?.totalCases || 0;
  const active = metrics?.activeCases || 0;
  const escalated = metrics?.escalatedCases || 0;
  const recovered = metrics?.recoveredCases || 0;
  const recoveredAmount = metrics?.actualRecoveredMinor || 0;

  const steps = [
    {
      label: 'Detected & Ingested',
      count: total,
      pct: total > 0 ? 100 : 0,
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      icon: 'lucide:inbox',
      desc: 'Normalized from Razorpay webhooks & API',
    },
    {
      label: 'Autonomous In-Flight',
      count: active,
      pct: total > 0 ? Math.round((active / total) * 100) : 0,
      color: 'bg-amber-500',
      textColor: 'text-amber-500',
      icon: 'lucide:cpu',
      desc: 'Active retry / dunning / voice sequencing',
    },
    {
      label: 'Human Review / Escalated',
      count: escalated,
      pct: total > 0 ? Math.round((escalated / total) * 100) : 0,
      color: 'bg-purple-500',
      textColor: 'text-purple-500',
      icon: 'lucide:shield-alert',
      desc: 'High-value policy boundary triggers',
    },
    {
      label: 'Recovered & Settled',
      count: recovered,
      pct: total > 0 ? Math.round((recovered / total) * 100) : 0,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-500',
      icon: 'lucide:check-circle-2',
      desc: `${formatCurrencyMinor(recoveredAmount)} recovered revenue`,
    },
  ];

  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm transition-colors font-mono">
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-center">
        <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
          <Icon icon="lucide:filter" className="text-[#8C8C8C] dark:text-[#6B7280]" />
          Autonomous Recovery Funnel
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href="/recovery-cases"
            className="text-xs font-semibold text-[#3B82F6] hover:underline flex items-center gap-1"
          >
            Inspect Pipeline
            <Icon icon="lucide:arrow-up-right" className="text-sm" />
          </Link>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {steps.map((s, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Icon icon={s.icon} className={`text-sm ${s.textColor}`} />
                <span className="font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">{s.label}</span>
                <span className="text-[11px] text-[#8C8C8C] dark:text-[#6B7280]">({s.desc})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">{s.count} cases</span>
                <span className={`text-[11px] font-semibold ${s.textColor}`}>{s.pct}%</span>
              </div>
            </div>
            <div className="w-full bg-[#F0F2F5] dark:bg-[#202123] rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full ${s.color} rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(s.count > 0 ? 4 : 0, s.pct)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
