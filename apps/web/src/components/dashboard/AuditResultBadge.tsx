'use client';

import { AuditResult } from '../../mocks/auditLog';

export interface AuditResultBadgeProps {
  result: AuditResult;
}

export function AuditResultBadge({ result }: AuditResultBadgeProps) {
  if (result === 'success') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold text-[#00B074] dark:text-[#10B981] bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00B074] dark:bg-[#10B981]" />
        Success
      </span>
    );
  }

  if (result === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold text-[#F59E0B] bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
        Pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold text-[#FF4444] dark:text-[#F87171] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-[#FF4444] dark:bg-[#F87171]" />
      Failed
    </span>
  );
}
