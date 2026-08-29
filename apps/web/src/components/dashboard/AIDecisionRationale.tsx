'use client';

import { Icon } from '@iconify/react';
import { AIDecision } from '../../mocks/recoveryCaseDetails';

export interface AIDecisionRationaleProps {
  decision: AIDecision;
}

export function AIDecisionRationale({ decision }: AIDecisionRationaleProps) {
  const getConfidenceColor = () => {
    switch (decision.confidence) {
      case 'High':
        return 'bg-[#00B074] text-[#00B074]';
      case 'Medium':
        return 'bg-[#F59E0B] text-[#F59E0B]';
      case 'Low':
        return 'bg-[#8C8C8C] text-[#8C8C8C]';
    }
  };

  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm overflow-hidden font-mono transition-colors">
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex items-center gap-2">
        <Icon icon="lucide:brain-circuit" className="text-[#8C8C8C] dark:text-[#6B7280] text-base" />
        <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider">
          AI Decision Rationale
        </h2>
      </div>

      <div className="p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-2">
              Why this action?
            </h3>
            <p className="text-sm text-[#4A4A4A] dark:text-[#9CA3AF] leading-relaxed">
              {decision.whyExplanation}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {/* Recommended Action */}
            <div className="p-4 bg-[#F0F2F5] dark:bg-[#131416] rounded-lg border border-[#E5E7EB] dark:border-[#2A2B2D] transition-colors">
              <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1">
                Recommended Action
              </p>
              <p className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                {decision.recommendedAction}
              </p>
            </div>

            {/* Confidence */}
            <div className="p-4 bg-[#F0F2F5] dark:bg-[#131416] rounded-lg border border-[#E5E7EB] dark:border-[#2A2B2D] transition-colors">
              <p className="text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1">
                Confidence
              </p>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${getConfidenceColor().split(' ')[0]}`} />
                <p className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                  {decision.confidence}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
