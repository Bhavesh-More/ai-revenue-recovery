'use client';

import { Icon } from '@iconify/react';
import { AuditLogEntry } from '../../mocks/auditLog';
import { AuditActorCell } from './AuditActorCell';
import { AuditResultBadge } from './AuditResultBadge';
import { AuditLogExpandedDetails } from './AuditLogExpandedDetails';

export interface AuditLogRowProps {
  entry: AuditLogEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function AuditLogRow({
  entry,
  isExpanded,
  onToggleExpand,
}: AuditLogRowProps) {
  const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

  return (
    <>
      <tr
        onClick={onToggleExpand}
        className={`border-b border-[#E5E7EB] dark:border-[#2A2B2D] transition-colors cursor-pointer hover:bg-black/2 dark:hover:bg-white/2 ${
          isExpanded ? 'bg-[#F0F2F5]/50 dark:bg-[#131416]/50' : 'bg-white dark:bg-[#171819]'
        }`}
      >
        {/* 1. Expand Toggle */}
        <td className="py-3.5 pl-4 pr-2 text-center w-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            aria-label={
              isExpanded
                ? `Collapse audit event ${entry.objectId}`
                : `Expand audit event ${entry.objectId}`
            }
            className={`w-6 h-6 rounded flex items-center justify-center text-[#8C8C8C] hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] transition-transform cursor-pointer ${
              !hasMetadata ? 'opacity-40' : ''
            }`}
          >
            <Icon
              icon={isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'}
              className="text-base"
            />
          </button>
        </td>

        {/* 2. Timestamp */}
        <td className="py-3.5 px-3 text-xs font-mono text-[#8C8C8C] dark:text-[#6B7280] whitespace-nowrap">
          {entry.timestamp}
        </td>

        {/* 3. User / Agent */}
        <td className="py-3.5 px-3 whitespace-nowrap">
          <AuditActorCell actor={entry.actor} actorType={entry.actorType} />
        </td>

        {/* 4. Action */}
        <td className="py-3.5 px-3 text-xs font-medium text-[#1A1A1A] dark:text-[#F9FAFB] whitespace-nowrap">
          {entry.action}
        </td>

        {/* 5. Object */}
        <td className="py-3.5 px-3 text-xs font-mono font-medium text-[#3B82F6] dark:text-[#60A5FA] whitespace-nowrap">
          {entry.objectId}
        </td>

        {/* 6. Details */}
        <td className="py-3.5 px-3 text-xs text-[#4A4A4A] dark:text-[#9CA3AF] max-w-sm xl:max-w-md truncate">
          {entry.details}
        </td>

        {/* 7. Result */}
        <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
          <AuditResultBadge result={entry.result} />
        </td>
      </tr>

      {/* Expanded Row Panel */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <AuditLogExpandedDetails entry={entry} />
          </td>
        </tr>
      )}
    </>
  );
}
