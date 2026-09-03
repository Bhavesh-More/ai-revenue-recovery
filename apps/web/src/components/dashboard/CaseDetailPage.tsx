'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { RecoveryCaseDetail } from '../../mocks/recoveryCaseDetails';
import { CaseHeaderCard } from './CaseHeaderCard';
import { RecoveryTimeline } from './RecoveryTimeline';
import { RecoveryOutcome } from './RecoveryOutcome';
import { AIDecisionRationale } from './AIDecisionRationale';
import { PolicyDecision } from './PolicyDecision';

export interface CaseDetailPageProps {
  caseDetail: RecoveryCaseDetail;
  onRefresh?: () => void;
}

export function CaseDetailPage({ caseDetail, onRefresh }: CaseDetailPageProps) {
  return (
    <div className="flex flex-col font-mono">
      {/* Floating Cloudy Sticky Breadcrumbs Bar */}
      <div className="sticky top-16 z-20 bg-[#F0F2F5]/85 dark:bg-[#131416]/85 backdrop-blur-md border-b border-[#E5E7EB]/80 dark:border-[#2A2B2D]/80 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.4)] px-6 lg:px-8 py-3 transition-colors">
        <div className="flex items-center justify-between gap-4">
          <nav className="flex items-center gap-2 text-xs font-medium">
            <Link
              href="/recovery-cases"
              className="flex items-center gap-1.5 text-[#4A4A4A] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] font-semibold transition-colors group cursor-pointer"
            >
              <Icon
                icon="lucide:arrow-left"
                className="text-sm group-hover:-translate-x-0.5 transition-transform"
              />
              <span>Recovery Cases</span>
            </Link>

            <Icon icon="lucide:chevron-right" className="text-xs text-[#8C8C8C] dark:text-[#6B7280]" />

            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] text-[#3B82F6] shadow-xs">
              {caseDetail.id}
            </span>
          </nav>

          <div className="hidden sm:flex items-center gap-2 text-xs text-[#8C8C8C] dark:text-[#6B7280]">
            <span className="font-semibold text-[#1A1A1A] dark:text-[#F9FAFB]">
              {caseDetail.customer}
            </span>
            <span>•</span>
            <span>{caseDetail.direction}</span>
          </div>
        </div>
      </div>

      {/* Main Page Content */}
      <div className="p-6 lg:p-8 flex flex-col gap-6">
        {/* Header & Metrics */}
        <CaseHeaderCard caseDetail={caseDetail} onRefresh={onRefresh} />

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Timeline */}
          <div className="col-span-1 flex flex-col gap-6">
            <RecoveryTimeline events={caseDetail.timeline} />
          </div>

          {/* Right Column: Outcomes & Decisions */}
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
            <RecoveryOutcome outcome={caseDetail.outcome} />
            <AIDecisionRationale decision={caseDetail.aiDecision} />
            <PolicyDecision policy={caseDetail.policyDecision} />
          </div>
        </div>
      </div>
    </div>
  );
}
