'use client';

import { Icon } from '@iconify/react';
import { PolicyDecisionData } from '../../mocks/recoveryCaseDetails';

export interface PolicyDecisionProps {
  policy: PolicyDecisionData;
}

export function PolicyDecision({ policy }: PolicyDecisionProps) {
  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm overflow-hidden font-mono transition-colors">
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex items-center gap-2">
        <Icon icon="lucide:shield-check" className="text-[#8C8C8C] dark:text-[#6B7280] text-base" />
        <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider">
          Policy Decision
        </h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {/* Proposed Action */}
          <div>
            <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
              Proposed Action
            </p>
            <p className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
              {policy.proposedAction}
            </p>
          </div>

          {/* Action Allowed */}
          <div>
            <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
              Action Allowed
            </p>
            <div className="flex items-center gap-2">
              {policy.actionAllowed ? (
                <>
                  <Icon icon="lucide:check-circle-2" className="text-[#00B074] text-lg" />
                  <span className="text-sm font-bold text-[#00B074]">Yes</span>
                </>
              ) : (
                <>
                  <Icon icon="lucide:x-circle" className="text-[#FF4444] text-lg" />
                  <span className="text-sm font-bold text-[#FF4444]">No</span>
                </>
              )}
            </div>
          </div>

          {/* Policy Reason */}
          <div className="col-span-2 md:col-span-1">
            <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
              Policy Reason
            </p>
            <p className="text-sm text-[#4A4A4A] dark:text-[#9CA3AF]">
              {policy.policyReason}
            </p>
          </div>

          {/* Retries Used */}
          <div>
            <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
              Retries Used
            </p>
            <p className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] font-mono">
              {policy.retriesUsed}
            </p>
          </div>

          {/* Comms Attempts */}
          <div>
            <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
              Comms Attempts
            </p>
            <p className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] font-mono">
              {policy.commsAttempts}
            </p>
          </div>

          {/* Human Approval */}
          <div>
            <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
              Human Approval
            </p>
            <p className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
              {policy.humanApproval}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
