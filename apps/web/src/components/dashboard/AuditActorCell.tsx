'use client';

import { Icon } from '@iconify/react';
import { AuditActorType } from '../../mocks/auditLog';

export interface AuditActorCellProps {
  actor: string;
  actorType: AuditActorType;
}

export function AuditActorCell({ actor, actorType }: AuditActorCellProps) {
  if (actorType === 'ai') {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-md bg-[#8B5CF6]/10 text-[#8B5CF6] dark:bg-[#8B5CF6]/20 flex items-center justify-center shrink-0">
          <Icon icon="lucide:bot" className="text-sm" />
        </div>
        <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F9FAFB] truncate">
          {actor}
        </span>
      </div>
    );
  }

  if (actorType === 'system') {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-md bg-[#F59E0B]/10 text-[#F59E0B] dark:bg-[#F59E0B]/20 flex items-center justify-center shrink-0">
          <Icon icon="lucide:shield" className="text-sm" />
        </div>
        <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F9FAFB] truncate">
          {actor}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-6 h-6 rounded-md bg-[#3B82F6] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
        AU
      </div>
      <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F9FAFB] truncate">
        {actor}
      </span>
    </div>
  );
}
