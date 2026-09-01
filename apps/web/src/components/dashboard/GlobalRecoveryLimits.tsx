'use client';

import { Icon } from '@iconify/react';
import {
  GlobalPolicyLimits,
  RETRY_INTERVAL_OPTIONS,
  RetryIntervalOption,
} from '../../mocks/policies';
import { ToggleSwitch } from './ToggleSwitch';

export interface GlobalRecoveryLimitsProps {
  limits: GlobalPolicyLimits;
  onChange: (limits: GlobalPolicyLimits) => void;
  errors?: {
    maxAutomaticRetries?: string;
    maxCommunications?: string;
  };
}

export function GlobalRecoveryLimits({
  limits,
  onChange,
  errors = {},
}: GlobalRecoveryLimitsProps) {
  const handleRetriesChange = (val: number) => {
    onChange({
      ...limits,
      maxAutomaticRetries: {
        ...limits.maxAutomaticRetries,
        value: val,
      },
    });
  };

  const handleRetriesToggle = (enabled: boolean) => {
    onChange({
      ...limits,
      maxAutomaticRetries: {
        ...limits.maxAutomaticRetries,
        enabled,
      },
    });
  };

  const handleCommsChange = (val: number) => {
    onChange({
      ...limits,
      maxCommunications: {
        ...limits.maxCommunications,
        value: val,
      },
    });
  };

  const handleCommsToggle = (enabled: boolean) => {
    onChange({
      ...limits,
      maxCommunications: {
        ...limits.maxCommunications,
        enabled,
      },
    });
  };

  const handleIntervalChange = (val: RetryIntervalOption) => {
    onChange({
      ...limits,
      defaultRetryInterval: {
        ...limits.defaultRetryInterval,
        value: val,
      },
    });
  };

  const handleIntervalToggle = (enabled: boolean) => {
    onChange({
      ...limits,
      defaultRetryInterval: {
        ...limits.defaultRetryInterval,
        enabled,
      },
    });
  };

  return (
    <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm flex flex-col font-mono transition-colors">
      {/* Header */}
      <div className="p-5 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex justify-between items-center">
        <h2 className="text-[11px] font-bold text-[#4A4A4A] dark:text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
          <Icon icon="lucide:settings-2" className="text-[#8C8C8C] dark:text-[#6B7280] text-base" />
          Global Recovery Limits
        </h2>
      </div>

      {/* Settings list */}
      <div className="p-6 flex flex-col gap-5 flex-1 justify-between">
        {/* Setting 1: Max Automatic Retries */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <label
              htmlFor="max-retries-input"
              className="block text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-1"
            >
              Maximum Automatic Retries
            </label>
            <p className="text-xs text-[#4A4A4A] dark:text-[#9CA3AF]">
              Number of times the system will attempt to recover payment without human intervention.
            </p>
            {errors.maxAutomaticRetries && (
              <p className="text-xs text-[#FF4444] dark:text-[#F87171] mt-1 font-medium">
                {errors.maxAutomaticRetries}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <input
              id="max-retries-input"
              type="number"
              min="1"
              max="20"
              disabled={!limits.maxAutomaticRetries.enabled}
              value={limits.maxAutomaticRetries.value}
              onChange={(e) => handleRetriesChange(Number(e.target.value))}
              className="w-20 bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-1.5 text-sm text-center font-mono text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] disabled:opacity-40 transition-colors"
            />
            <ToggleSwitch
              id="toggle-retries"
              ariaLabel="Toggle Maximum Automatic Retries"
              checked={limits.maxAutomaticRetries.enabled}
              onChange={handleRetriesToggle}
            />
          </div>
        </div>

        <hr className="border-[#E5E7EB] dark:border-[#2A2B2D]" />

        {/* Setting 2: Max Communications */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <label
              htmlFor="max-comms-input"
              className="block text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-1"
            >
              Maximum Communications
            </label>
            <p className="text-xs text-[#4A4A4A] dark:text-[#9CA3AF]">
              Total emails, SMS, or voice calls sent per recovery case cycle.
            </p>
            {errors.maxCommunications && (
              <p className="text-xs text-[#FF4444] dark:text-[#F87171] mt-1 font-medium">
                {errors.maxCommunications}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <input
              id="max-comms-input"
              type="number"
              min="1"
              max="30"
              disabled={!limits.maxCommunications.enabled}
              value={limits.maxCommunications.value}
              onChange={(e) => handleCommsChange(Number(e.target.value))}
              className="w-20 bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-1.5 text-sm text-center font-mono text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] disabled:opacity-40 transition-colors"
            />
            <ToggleSwitch
              id="toggle-comms"
              ariaLabel="Toggle Maximum Communications"
              checked={limits.maxCommunications.enabled}
              onChange={handleCommsToggle}
            />
          </div>
        </div>

        <hr className="border-[#E5E7EB] dark:border-[#2A2B2D]" />

        {/* Setting 3: Default Retry Interval */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <label
              htmlFor="retry-interval-select"
              className="block text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-1"
            >
              Default Retry Interval
            </label>
            <p className="text-xs text-[#4A4A4A] dark:text-[#9CA3AF]">
              Base time delay between automated action attempts.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select
              id="retry-interval-select"
              disabled={!limits.defaultRetryInterval.enabled}
              value={limits.defaultRetryInterval.value}
              onChange={(e) => handleIntervalChange(e.target.value as RetryIntervalOption)}
              className="w-32 bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-1.5 text-sm font-medium text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] disabled:opacity-40 transition-colors cursor-pointer"
            >
              {RETRY_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ToggleSwitch
              id="toggle-interval"
              ariaLabel="Toggle Default Retry Interval"
              checked={limits.defaultRetryInterval.enabled}
              onChange={handleIntervalToggle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
