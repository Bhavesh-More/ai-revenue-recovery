'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { DirectionPolicyOverride } from '../../mocks/policies';
import { ToggleSwitch } from './ToggleSwitch';

export interface DirectionPolicyEditorProps {
  isOpen: boolean;
  direction: DirectionPolicyOverride | null;
  onClose: () => void;
  onSave: (updated: DirectionPolicyOverride) => void;
}

interface DirectionPolicyEditorModalProps {
  direction: DirectionPolicyOverride;
  onClose: () => void;
  onSave: (updated: DirectionPolicyOverride) => void;
}

function DirectionPolicyEditorModal({
  direction,
  onClose,
  onSave,
}: DirectionPolicyEditorModalProps) {
  const [enabled, setEnabled] = useState(direction.enabled);
  const [maxRetries, setMaxRetries] = useState(direction.maxRetries);
  const [maxComms, setMaxComms] = useState(direction.maxCommunications);
  const [autoApprove, setAutoApprove] = useState(direction.autoApproveActions);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...direction,
      enabled,
      maxRetries: Math.max(1, maxRetries),
      maxCommunications: Math.max(1, maxComms),
      autoApproveActions: autoApprove,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transition-colors">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E5E7EB] dark:border-[#2A2B2D] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${direction.iconBgClass} ${direction.iconTextClass}`}
            >
              <Icon icon={direction.icon} className="text-lg" />
            </div>
            <div>
              <h3
                id="modal-title"
                className="text-base font-bold text-[#1A1A1A] dark:text-[#F9FAFB]"
              >
                Configure {direction.name}
              </h3>
              <p className="text-xs text-[#8C8C8C] dark:text-[#6B7280]">
                Override global policy rules for this recovery stream.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg border border-[#E5E7EB] dark:border-[#2A2B2D] flex items-center justify-center text-[#8C8C8C] hover:text-[#1A1A1A] dark:hover:text-[#F9FAFB] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Icon icon="lucide:x" className="text-base" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Override Active Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl">
            <div>
              <p className="text-xs font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
                Policy Override Status
              </p>
              <p className="text-[11px] text-[#8C8C8C] dark:text-[#6B7280]">
                {enabled ? 'Active (Overrides global limits)' : 'Disabled (Uses global defaults)'}
              </p>
            </div>
            <ToggleSwitch
              id="modal-toggle-enabled"
              checked={enabled}
              onChange={setEnabled}
              ariaLabel="Toggle override active status"
            />
          </div>

          {/* Max Retries & Max Comms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="modal-max-retries"
                className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1.5"
              >
                Max Retries
              </label>
              <input
                id="modal-max-retries"
                type="number"
                min="1"
                max="20"
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm font-mono text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="modal-max-comms"
                className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-1.5"
              >
                Max Communications
              </label>
              <input
                id="modal-max-comms"
                type="number"
                min="1"
                max="30"
                value={maxComms}
                onChange={(e) => setMaxComms(Number(e.target.value))}
                className="w-full bg-[#F0F2F5] dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg px-3 py-2 text-sm font-mono text-[#1A1A1A] dark:text-[#F9FAFB] focus:outline-none focus:border-[#1A1A1A] dark:focus:border-[#60A5FA] transition-colors"
              />
            </div>
          </div>

          {/* Auto-Approve Actions Options */}
          <div>
            <label className="block text-[11px] font-bold text-[#8C8C8C] dark:text-[#6B7280] uppercase tracking-wider mb-2">
              Action Approval Mode
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  !autoApprove
                    ? 'border-[#FF4444]/40 bg-[#FF4444]/5 dark:bg-[#FF4444]/10'
                    : 'border-[#E5E7EB] dark:border-[#2A2B2D] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <input
                  type="radio"
                  name="autoApprove"
                  checked={!autoApprove}
                  onChange={() => setAutoApprove(false)}
                  className="mt-0.5 text-[#FF4444] focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F9FAFB] block">
                    Require Human Approval (Strict)
                  </span>
                  <span className="text-[11px] text-[#8C8C8C] dark:text-[#6B7280]">
                    Irreversible actions route to the Approvals queue before execution.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  autoApprove
                    ? 'border-[#00B074]/40 bg-[#00B074]/5 dark:bg-[#00B074]/10'
                    : 'border-[#E5E7EB] dark:border-[#2A2B2D] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <input
                  type="radio"
                  name="autoApprove"
                  checked={autoApprove}
                  onChange={() => setAutoApprove(true)}
                  className="mt-0.5 text-[#00B074] focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F9FAFB] block">
                    Automatic Execution (Auto-Approve)
                  </span>
                  <span className="text-[11px] text-[#8C8C8C] dark:text-[#6B7280]">
                    AI recovery engine directly triggers actions according to policy rules.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#2A2B2D] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-[#131416] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-xs font-bold text-[#4A4A4A] dark:text-[#9CA3AF] hover:bg-[#F0F2F5] dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] rounded-lg text-xs font-bold hover:bg-black dark:hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Apply Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DirectionPolicyEditor({
  isOpen,
  direction,
  onClose,
  onSave,
}: DirectionPolicyEditorProps) {
  if (!isOpen || !direction) return null;

  return (
    <DirectionPolicyEditorModal
      key={direction.id}
      direction={direction}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
