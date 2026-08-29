'use client';

import { Sidebar } from '../../components/dashboard/Sidebar';
import { Header } from '../../components/dashboard/Header';
import { RecoveryCasesPage } from '../../components/dashboard/RecoveryCasesPage';

export default function RecoveryCasesRoute() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F2F5] dark:bg-[#131416] font-mono text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors">
      <Sidebar activeItem="cases" />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto scrollbar-hide bg-[#F0F2F5] dark:bg-[#131416] transition-colors">
        <Header
          showNotificationBadge
          onSearch={(query) => {
            console.debug('Global search query:', query);
          }}
          onCalendarClick={() => {}}
          onFilterClick={() => {}}
          onNotificationClick={() => {}}
        />

        <RecoveryCasesPage />
      </main>
    </div>
  );
}
