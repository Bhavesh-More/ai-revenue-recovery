'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { ApprovalRequest, formatCurrency } from '../../mocks/approvals';

export interface ApprovalRequestCardProps {
  request: ApprovalRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestInfo: (id: string) => void;
}

export function ApprovalRequestCard({
  request,
  onApprove,
  onReject,
  onRequestInfo,
}: ApprovalRequestCardProps) {
  const getTagBadgeClass = () => {
    switch (request.escalation.tagVariant) {
      case 'high-value':
        return 'bg-red-50 dark:bg-red-950/50 text-[#FF4444] border border-red-200 dark:border-red-900/40';
      case 'policy-override':
        return 'bg-blue-50 dark:bg-blue-950/50 text-[#3B82F6] border border-blue-200 dark:border-blue-900/40';
      case 'custom-terms':
        return 'bg-orange-50 dark:bg-orange-950/50 text-[#F59E0B] border border-orange-200 dark:border-orange-900/40';
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-[#4A4A4A] dark:text-[#9CA3AF] border border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm p-6 font-mono transition-colors">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
        <div className="flex gap-4">
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center border shrink-0 ${request.iconBgClass} ${request.iconBorderClass}`}
          >
            <Icon
              icon={request.icon}
              className={`text-xl ${request.iconTextClass}`}
            />
          </div>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                {request.customerName}
              </h3>
              {request.infoRequested ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/50 text-[#3B82F6] border border-blue-200 dark:border-blue-800">
                  Info Requested
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/50 text-[#F59E0B] border border-orange-200 dark:border-orange-800">
                  Pending Review
                </span>
              )}
            </div>

            <p className="text-sm text-[#4A4A4A] dark:text-[#9CA3AF] flex items-center gap-2 mt-1 flex-wrap">
              <Link
                href={`/recovery-cases/${request.caseId}`}
                className="font-mono font-medium text-[#3B82F6] hover:underline"
              >
                {request.caseId}
              </Link>
              <span>•</span>
              <span>{request.direction}</span>
            </p>
          </div>
        </div>

        <div className="text-right ml-auto">
          <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1">
            Amount at Risk
          </p>
          <p className="text-xl font-bold text-[#1A1A1A] dark:text-[#F9FAFB] font-mono">
            {formatCurrency(request.amountAtRisk)}
          </p>
        </div>
      </div>

      {/* 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column: Proposed Action & Escalation Reason */}
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1">
              Proposed Action
            </p>
            <p className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] flex items-center gap-2">
              <Icon
                icon={request.proposedAction.icon}
                className="text-[#3B82F6] text-base shrink-0"
              />
              <span>{request.proposedAction.label}</span>
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1">
              Escalation Reason
            </p>
            <p className="text-sm text-[#1A1A1A] dark:text-[#F9FAFB] leading-normal flex items-start gap-1.5 flex-wrap">
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-bold shrink-0 ${getTagBadgeClass()}`}
              >
                {request.escalation.tag}
              </span>
              <span className="text-[#4A4A4A] dark:text-[#9CA3AF]">
                {request.escalation.reason}
              </span>
            </p>
          </div>
        </div>

        {/* Right Column: Case Context */}
        <div className="bg-[#F0F2F5] dark:bg-[#131416] rounded-lg p-4 border border-[#E5E7EB] dark:border-[#2A2B2D] transition-colors">
          <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
            Case Context
          </p>
          <p className="text-sm text-[#4A4A4A] dark:text-[#9CA3AF] leading-relaxed">
            {request.context}
          </p>
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] dark:border-[#2A2B2D] flex-wrap">
        <button
          type="button"
          onClick={() => onRequestInfo(request.id)}
          disabled={request.infoRequested}
          className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            request.infoRequested
              ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-[#3B82F6] cursor-default'
              : 'border-[#E5E7EB] dark:border-[#2A2B2D] text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB]'
          }`}
        >
          {request.infoRequested ? 'Info Requested' : 'Request Info'}
        </button>

        <button
          type="button"
          onClick={() => onReject(request.id)}
          className="px-4 py-2 bg-white dark:bg-[#171819] border border-[#FF4444] text-[#FF4444] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-sm font-bold transition-colors cursor-pointer"
        >
          Reject
        </button>

        <button
          type="button"
          onClick={() => onApprove(request.id)}
          className="px-6 py-2 bg-[#00B074] text-white hover:bg-green-600 rounded-lg text-sm font-bold transition-colors shadow-sm cursor-pointer"
        >
          Approve Action
        </button>
      </div>
    </div>
  );
}
