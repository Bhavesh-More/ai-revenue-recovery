'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { ApprovalHistoryItem } from '../../mocks/approvals';

export interface ApprovalHistoryTableProps {
  history: ApprovalHistoryItem[];
}

export function ApprovalHistoryTable({ history }: ApprovalHistoryTableProps) {
  return (
    <div className="font-mono">
      <h2 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-4 flex items-center gap-2">
        <Icon icon="lucide:history" className="text-base text-[#8C8C8C] dark:text-[#6B7280]" />
        Recent Approvals History
      </h2>

      <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-[#8C8C8C] dark:text-[#6B7280] bg-[#F0F2F5] dark:bg-[#131416] uppercase font-bold tracking-wider border-b border-[#E5E7EB] dark:border-[#2A2B2D]">
              <tr>
                <th className="px-6 py-4">Case ID</th>
                <th className="px-6 py-4">Action Reviewed</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Approver</th>
                <th className="px-6 py-4 text-right">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#2A2B2D] text-[#1A1A1A] dark:text-[#F9FAFB]">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-[#8C8C8C] dark:text-[#6B7280]">
                    No recent approval history recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((item) => {
                  const isApproved = item.status === 'approved';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-[#3B82F6]">
                        <Link
                          href={`/recovery-cases/${item.caseId}`}
                          className="hover:underline"
                        >
                          {item.caseId}
                        </Link>
                      </td>

                      <td className="px-6 py-4 text-[#4A4A4A] dark:text-[#9CA3AF]">
                        {item.actionReviewed}
                      </td>

                      <td className="px-6 py-4">
                        {isApproved ? (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-[#00B074]/10 text-[#00B074] border border-[#00B074]/20">
                            Approved
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/20">
                            Rejected
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded bg-[#3B82F6] flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            aria-label={item.approver}
                          >
                            AU
                          </div>
                          <span className="text-xs font-medium text-[#1A1A1A] dark:text-[#F9FAFB]">
                            {item.approver}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right text-[#8C8C8C] dark:text-[#6B7280] text-xs font-mono">
                        {item.reviewedAt}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
