'use client';

import { AuditLogEntry } from '../../mocks/auditLog';

export interface AuditLogExpandedDetailsProps {
  entry: AuditLogEntry;
}

export function AuditLogExpandedDetails({ entry }: AuditLogExpandedDetailsProps) {
  const metadata = entry.metadata;

  if (!metadata || Object.keys(metadata).length === 0) {
    return (
      <div className="p-4 bg-[#F8F9FA] dark:bg-[#131416] text-xs text-[#8C8C8C] dark:text-[#6B7280] font-mono">
        No additional metadata recorded for this event.
      </div>
    );
  }

  // Format label from camelCase (e.g. amountAtRisk -> Amount At Risk)
  const formatLabel = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div className="p-4 bg-[#F8F9FA] dark:bg-[#131416] border-t border-[#E5E7EB] dark:border-[#2A2B2D] font-mono text-xs transition-colors">
      <p className="text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2.5">
        Audit Event Metadata &amp; Context
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(metadata).map(([key, value]) => {
          if (value === undefined || value === null) return null;

          return (
            <div
              key={key}
              className="p-2.5 bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg shadow-2xs"
            >
              <span className="text-[10px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider block mb-1">
                {formatLabel(key)}
              </span>
              <span className="font-mono font-medium text-[#1A1A1A] dark:text-[#F9FAFB] break-words">
                {String(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
