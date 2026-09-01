'use client';

import { Icon } from '@iconify/react';
import { DirectionPolicyOverride } from '../../mocks/policies';
import { ToggleSwitch } from './ToggleSwitch';

export interface DirectionPolicyCardProps {
  direction: DirectionPolicyOverride;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
}

export function DirectionPolicyCard({
  direction,
  onToggle,
  onEdit,
}: DirectionPolicyCardProps) {
  return (
    <div
      className={`bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl shadow-sm overflow-hidden flex flex-col font-mono transition-all ${
        !direction.enabled ? 'opacity-60' : ''
      }`}
    >
      {/* Card Header */}
      <div className="p-4 border-b border-[#E5E7EB] dark:border-[#2A2B2D] bg-[#F0F2F5]/50 dark:bg-[#131416]/50 flex justify-between items-center transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${direction.iconBgClass} ${direction.iconTextClass}`}
          >
            <Icon icon={direction.icon} className="text-base" />
          </div>
          <span className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB] truncate">
            {direction.name}
          </span>
        </div>

        <ToggleSwitch
          id={`toggle-dir-${direction.id}`}
          size="sm"
          ariaLabel={`Enable or disable override for ${direction.name}`}
          checked={direction.enabled}
          onChange={onToggle}
        />
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#4A4A4A] dark:text-[#9CA3AF]">Max Retries:</span>
            <span
              className={`font-mono font-medium ${
                direction.isCustomRetries
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-[#1A1A1A] dark:text-[#F9FAFB]'
              }`}
            >
              {direction.maxRetries}
              {direction.isCustomRetries && ' (Custom)'}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-[#4A4A4A] dark:text-[#9CA3AF]">Max Comms:</span>
            <span
              className={`font-mono font-medium ${
                direction.isCustomComms
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-[#1A1A1A] dark:text-[#F9FAFB]'
              }`}
            >
              {direction.maxCommunications}
              {direction.isCustomComms && ' (Custom)'}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-[#4A4A4A] dark:text-[#9CA3AF]">Auto-Approve Actions:</span>
            {direction.autoApproveActions ? (
              <span className="text-[#00B074] dark:text-[#10B981] font-medium text-xs bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40 px-2 py-0.5 rounded">
                Yes (Auto)
              </span>
            ) : (
              <span className="text-[#FF4444] dark:text-[#F87171] font-medium text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 px-2 py-0.5 rounded">
                No (Approval Req.)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="p-4 border-t border-[#E5E7EB] dark:border-[#2A2B2D] bg-[#F8F9FA] dark:bg-[#171819] transition-colors">
        <button
          type="button"
          onClick={onEdit}
          className="w-full py-2 bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-xs font-bold text-[#1A1A1A] dark:text-[#F9FAFB] hover:bg-[#F0F2F5] dark:hover:bg-white/5 transition-colors cursor-pointer shadow-xs"
        >
          Edit Configuration
        </button>
      </div>
    </div>
  );
}
