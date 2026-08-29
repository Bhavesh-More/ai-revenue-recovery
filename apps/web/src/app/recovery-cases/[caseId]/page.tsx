'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { Sidebar } from '../../../components/dashboard/Sidebar';
import { Header } from '../../../components/dashboard/Header';
import { CaseDetailPage } from '../../../components/dashboard/CaseDetailPage';
import { getRecoveryCaseDetail } from '../../../mocks/recoveryCaseDetails';

interface CaseDetailRouteProps {
  params: Promise<{
    caseId: string;
  }>;
}

export default function CaseDetailRoute({ params }: CaseDetailRouteProps) {
  const resolvedParams = use(params);
  const caseId = resolvedParams.caseId;
  const caseDetail = getRecoveryCaseDetail(caseId);

  if (!caseDetail) {
    notFound();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F2F5] dark:bg-[#131416] font-mono text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors">
      <Sidebar activeItem="cases" />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto scrollbar-hide bg-[#F0F2F5] dark:bg-[#131416] transition-colors">
        <Header
          showNotificationBadge
          onSearch={(query) => {
            console.debug('Search query:', query);
          }}
          onCalendarClick={() => {}}
          onFilterClick={() => {}}
          onNotificationClick={() => {}}
        />

        <CaseDetailPage caseDetail={caseDetail} />
      </main>
    </div>
  );
}
