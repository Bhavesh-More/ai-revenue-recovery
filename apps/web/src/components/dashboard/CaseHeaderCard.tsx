'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { RecoveryCaseDetail } from '../../mocks/recoveryCaseDetails';
import { formatIndianCurrency, StatusBadge } from './RecoveryCasesTable';
import { advanceSimulationCase, approveSimulationCase } from '../../lib/api';

export interface CaseHeaderCardProps {
  caseDetail: RecoveryCaseDetail;
  onRefresh?: () => void;
}

export function CaseHeaderCard({ caseDetail, onRefresh }: CaseHeaderCardProps) {
  const [advancing, setAdvancing] = useState(false);

  const handleAdvance = async () => {
    if (advancing) return;
    setAdvancing(true);
    try {
      if (caseDetail.status === 'Escalated') {
        await approveSimulationCase(caseDetail.id, 'operator');
      } else {
        await advanceSimulationCase(caseDetail.id, 'operator');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('recovery:data-updated'));
      }
      onRefresh?.();
    } catch (err) {
      console.error('Failed to advance case simulation:', err);
    } finally {
      setAdvancing(false);
    }
  };

  const getRiskColor = () => {
    switch (caseDetail.risk) {
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
    <div className="flex flex-col gap-4 font-mono">
      {/* Case Header Card */}
      <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm overflow-hidden transition-colors">
        {/* Top Info & Action Row */}
        <div className="p-6 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center shrink-0">
              <Icon icon="lucide:user" className="text-2xl" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                  {caseDetail.customer}
                </h1>
                <StatusBadge status={caseDetail.status} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#4A4A4A] dark:text-[#9CA3AF]">
                <span className="flex items-center gap-1.5">
                  <Icon icon="lucide:hash" className="text-[#8C8C8C] dark:text-[#6B7280]" />
                  {caseDetail.id}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon icon="lucide:compass" className="text-[#8C8C8C] dark:text-[#6B7280]" />
                  {caseDetail.direction}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {caseDetail.status === 'Waiting' && (
              <button
                type="button"
                onClick={handleAdvance}
                disabled={advancing}
                className="px-4 py-2 bg-[#00B074] text-white rounded-lg text-sm font-bold hover:bg-[#009663] transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Icon
                  icon={advancing ? 'lucide:loader-2' : 'lucide:zap'}
                  className={`text-base ${advancing ? 'animate-spin' : ''}`}
                />
                <span>{advancing ? 'Executing Retry...' : 'Execute Scheduled Retry'}</span>
              </button>
            )}

            {caseDetail.status === 'Cust Action' && (caseDetail as any).batchId && (
              <button
                type="button"
                onClick={handleAdvance}
                disabled={advancing}
                className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg text-sm font-bold hover:bg-[#2563EB] transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Icon
                  icon={advancing ? 'lucide:loader-2' : 'lucide:send'}
                  className={`text-base ${advancing ? 'animate-spin' : ''}`}
                />
                <span>{advancing ? 'Simulating...' : 'Simulate Customer Payment'}</span>
              </button>
            )}

            {caseDetail.status === 'Cust Action' && !(caseDetail as any).batchId && (
              <div className="px-4 py-2 bg-[#F0F9FF] dark:bg-[#0C2D48] border border-[#BAE6FD] dark:border-[#1E3A5F] rounded-lg text-sm font-bold text-[#0369A1] dark:text-[#7DD3FC] flex items-center gap-2">
                <Icon icon="lucide:clock" className="text-base" />
                <span>Awaiting Razorpay TEST Payment</span>
              </div>
            )}

            {caseDetail.status === 'Escalated' && (
              <button
                type="button"
                onClick={handleAdvance}
                disabled={advancing}
                className="px-4 py-2 bg-[#F59E0B] text-white rounded-lg text-sm font-bold hover:bg-[#D97706] transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Icon
                  icon={advancing ? 'lucide:loader-2' : 'lucide:check-circle'}
                  className={`text-base ${advancing ? 'animate-spin' : ''}`}
                />
                <span>{advancing ? 'Authorizing...' : 'Authorize Action'}</span>
              </button>
            )}

            <button
              type="button"
              className="px-4 py-2 bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] hover:bg-gray-50 dark:hover:bg-[#131416] transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Icon icon="lucide:download" className="text-base" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E7EB] dark:divide-[#2A2B2D]">
          <div className="p-5">
            <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
              Amount At Risk
            </p>
            <p className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F9FAFB] font-mono">
              {formatIndianCurrency(caseDetail.amountAtRisk)}
            </p>
          </div>

          <div className="p-5">
            <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
              Amount Recovered
            </p>
            <p className="text-2xl font-bold text-[#00B074] font-mono">
              {formatIndianCurrency(caseDetail.amountRecovered)}
            </p>
          </div>

          <div className="p-5">
            <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
              Risk Level
            </p>
            <div className="flex items-center gap-2">
              <Icon icon="lucide:flame" className={`text-xl ${getRiskColor()}`} />
              <span className="text-lg font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                {caseDetail.risk}
              </span>
            </div>
          </div>

          <div className="p-5">
            <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
              Recovery Prob.
            </p>
            <div className="flex items-center gap-2">
              <Icon icon="lucide:trending-up" className="text-[#00B074] text-xl" />
              <span className="text-lg font-bold text-[#1A1A1A] dark:text-[#F9FAFB] font-mono">
                {caseDetail.recoveryProbability}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
