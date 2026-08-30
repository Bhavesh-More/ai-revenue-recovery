'use client';

import { Icon } from '@iconify/react';
import { EscalationRules as EscalationRulesType, formatINR } from '../../mocks/policies';
import { ToggleSwitch } from './ToggleSwitch';

export interface EscalationRulesProps {
  rules: EscalationRulesType;
  onChange: (rules: EscalationRulesType) => void;
  errors?: {
    highValueThreshold?: string;
    criticalRiskThreshold?: string;
  };
}

export function EscalationRules({
  rules,
  onChange,
  errors = {},
}: EscalationRulesProps) {
  const handleHighValChange = (valStr: string) => {
    const cleaned = Number(valStr.replace(/[^0-9]/g, ''));
    if (!isNaN(cleaned)) {
      onChange({
        ...rules,
        highValueThreshold: {
          ...rules.highValueThreshold,
          value: cleaned,
        },
      });
    }
  };

  const handleHighValToggle = (enabled: boolean) => {
    onChange({
      ...rules,
      highValueThreshold: {
        ...rules.highValueThreshold,
        enabled,
      },
    });
  };

  const handleRiskChange = (val: number) => {
    onChange({
      ...rules,
      criticalRiskThreshold: {
        ...rules.criticalRiskThreshold,
        value: val,
      },
    });
  };

  const handleRiskToggle = (enabled: boolean) => {
    onChange({
      ...rules,
      criticalRiskThreshold: {
        ...rules.criticalRiskThreshold,
        enabled,
      },
    });
  };

  const handleHumanApprovalToggle = (enabled: boolean) => {
    onChange({
      ...rules,
      humanApprovalRequired: {
        ...rules.humanApprovalRequired,
        enabled,
      },
    });
  };

  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm flex flex-col font-mono transition-colors">
      {/* Header */}
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-center">
        <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
          <Icon icon="lucide:alert-triangle" className="text-[#F59E0B] text-base" />
          Escalation Rules
        </h2>
      </div>

      {/* Settings list */}
      <div className="p-6 flex flex-col gap-5 flex-1 justify-between">
        {/* Setting 1: High-Value Threshold */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <label
              htmlFor="high-value-input"
              className="block text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-1"
            >
              High-Value Threshold
            </label>
            <p className="text-xs text-[#4A4A4A] dark:text-[#9CA3AF]">
              Cases exceeding this amount are automatically flagged for review.
            </p>
            {errors.highValueThreshold && (
              <p className="text-xs text-[#FF4444] dark:text-[#F87171] mt-1 font-medium">
                {errors.highValueThreshold}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] dark:text-[#6B7280] font-mono text-sm">
                ₹
              </span>
              <input
                id="high-value-input"
                type="text"
                disabled={!rules.highValueThreshold.enabled}
                value={formatINR(rules.highValueThreshold.value)}
                onChange={(e) => handleHighValChange(e.target.value)}
                className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg pl-7 pr-3 py-1.5 text-sm font-mono text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] disabled:opacity-40 transition-colors"
              />
            </div>
            <ToggleSwitch
              id="toggle-highval"
              ariaLabel="Toggle High-Value Threshold"
              checked={rules.highValueThreshold.enabled}
              onChange={handleHighValToggle}
            />
          </div>
        </div>

        <hr className="border-[#E5E7EB] dark:border-[#2A2B2D]" />

        {/* Setting 2: Critical Risk Threshold */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <label
              htmlFor="critical-risk-input"
              className="block text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-1"
            >
              Critical Risk Threshold
            </label>
            <p className="text-xs text-[#4A4A4A] dark:text-[#9CA3AF]">
              Probability score triggering immediate human escalation.
            </p>
            {errors.criticalRiskThreshold && (
              <p className="text-xs text-[#FF4444] dark:text-[#F87171] mt-1 font-medium">
                {errors.criticalRiskThreshold}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-24">
              <input
                id="critical-risk-input"
                type="number"
                min="0"
                max="100"
                disabled={!rules.criticalRiskThreshold.enabled}
                value={rules.criticalRiskThreshold.value}
                onChange={(e) => handleRiskChange(Number(e.target.value))}
                className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg pl-3 pr-6 py-1.5 text-sm font-mono text-center text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] disabled:opacity-40 transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] dark:text-[#6B7280] text-sm">
                %
              </span>
            </div>
            <ToggleSwitch
              id="toggle-risk"
              ariaLabel="Toggle Critical Risk Threshold"
              checked={rules.criticalRiskThreshold.enabled}
              onChange={handleRiskToggle}
            />
          </div>
        </div>

        <hr className="border-[#E5E7EB] dark:border-[#2A2B2D]" />

        {/* Setting 3: Human Approval Required (Emphasized Box) */}
        <div className="flex items-start justify-between gap-4 bg-orange-50/80 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-900/40 -mx-2 -mb-2 transition-colors">
          <div className="flex-1">
            <label
              htmlFor="toggle-human-approval"
              className="block text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-1 flex items-center gap-2"
            >
              <span>Human Approval Required</span>
              <span className="px-1.5 py-0.5 bg-[#F59E0B] text-white text-[9px] uppercase tracking-wider font-bold rounded">
                Strict
              </span>
            </label>
            <p className="text-xs text-[#4A4A4A] dark:text-[#9CA3AF]">
              When enabled, irreversible actions (like service suspension) require manual approval via the Approvals queue.
            </p>
          </div>
          <div className="flex items-center pt-1 shrink-0">
            <ToggleSwitch
              id="toggle-human-approval"
              ariaLabel="Toggle Human Approval Required"
              checked={rules.humanApprovalRequired.enabled}
              onChange={handleHumanApprovalToggle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
