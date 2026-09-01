'use client';

import { Icon } from '@iconify/react';
import { CaseOutcome } from '../../mocks/recoveryCaseDetails';
import { formatIndianCurrency } from './RecoveryCasesTable';

export interface RecoveryOutcomeProps {
  outcome: CaseOutcome;
}

export function RecoveryOutcome({ outcome }: RecoveryOutcomeProps) {
  const isSuccess = outcome.successful;

  return (
    <div
      className={`border rounded-xl shadow-sm overflow-hidden font-mono transition-colors ${
        isSuccess
          ? 'bg-[#00B074]/5 dark:bg-[#00B074]/10 border-[#00B074]/20'
          : 'bg-[#F59E0B]/5 dark:bg-[#F59E0B]/10 border-[#F59E0B]/20'
      }`}
    >
      <div className="p-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-full text-white flex items-center justify-center shrink-0 shadow-sm ${
              isSuccess ? 'bg-[#00B074]' : 'bg-[#F59E0B]'
            }`}
          >
            <Icon
              icon={isSuccess ? 'lucide:check-circle' : 'lucide:alert-triangle'}
              className="text-3xl"
            />
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-1">
              {outcome.title}
            </h2>
            <p className="text-sm text-[#4A4A4A] dark:text-[#9CA3AF]">
              {outcome.description}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p
            className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${
              isSuccess ? 'text-[#00B074]' : 'text-[#F59E0B]'
            }`}
          >
            Amount Recovered
          </p>
          <p
            className={`text-3xl font-bold font-mono ${
              isSuccess ? 'text-[#00B074]' : 'text-[#8C8C8C] dark:text-[#6B7280]'
            }`}
          >
            {formatIndianCurrency(outcome.amountRecovered)}
          </p>
        </div>
      </div>
    </div>
  );
}
