'use client';

import { Icon } from '@iconify/react';
import { PolicyMetadata } from '../../mocks/policies';

export interface PolicyStatusBarProps {
  metadata: PolicyMetadata;
}

export function PolicyStatusBar({ metadata }: PolicyStatusBarProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono">
      {/* 1. System Status */}
      <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl p-4 shadow-sm flex items-center gap-4 transition-colors">
        <div className="w-10 h-10 rounded-full bg-[#00B074]/10 dark:bg-[#00B074]/20 flex items-center justify-center text-[#00B074] dark:text-[#10B981] shrink-0">
          <Icon icon="lucide:check-circle-2" className="text-xl" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider">
            System Status
          </p>
          <p className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] truncate">
            {metadata.systemStatus}
          </p>
        </div>
      </div>

      {/* 2. Last Updated */}
      <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl p-4 shadow-sm flex flex-col justify-center transition-colors">
        <p className="text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1">
          Last Updated
        </p>
        <p className="text-sm font-mono font-medium text-[#1A1A1A] dark:text-[#F9FAFB] truncate">
          {metadata.lastUpdated}
        </p>
      </div>

      {/* 3. Applied Across */}
      <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl p-4 shadow-sm flex flex-col justify-center transition-colors">
        <p className="text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1">
          Applied Across
        </p>
        <p className="text-sm font-mono font-medium text-[#1A1A1A] dark:text-[#F9FAFB] truncate">
          {metadata.appliedAcross}
        </p>
      </div>

      {/* 4. Modified By */}
      <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl p-4 shadow-sm flex flex-col justify-center transition-colors">
        <p className="text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1">
          Modified By
        </p>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded bg-[#3B82F6] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {metadata.modifiedBy.initials}
          </div>
          <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#F9FAFB] truncate">
            {metadata.modifiedBy.name}
          </p>
        </div>
      </div>
    </div>
  );
}
