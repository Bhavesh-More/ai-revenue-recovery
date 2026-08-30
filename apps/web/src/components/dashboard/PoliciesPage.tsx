'use client';

import { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import {
  FullPolicyConfig,
  INITIAL_POLICIES_DATA,
  DirectionPolicyOverride,
  GlobalPolicyLimits,
  EscalationRules as EscalationRulesType,
} from '../../mocks/policies';
import { PolicyStatusBar } from './PolicyStatusBar';
import { GlobalRecoveryLimits } from './GlobalRecoveryLimits';
import { EscalationRules } from './EscalationRules';
import { DirectionPolicyCard } from './DirectionPolicyCard';
import { DirectionPolicyEditor } from './DirectionPolicyEditor';

export function PoliciesPage() {
  const [savedConfig, setSavedConfig] = useState<FullPolicyConfig>(INITIAL_POLICIES_DATA);
  const [draftConfig, setDraftConfig] = useState<FullPolicyConfig>(INITIAL_POLICIES_DATA);
  const [editingDirection, setEditingDirection] = useState<DirectionPolicyOverride | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Change detection
  const isDirty = useMemo(() => {
    return JSON.stringify(savedConfig) !== JSON.stringify(draftConfig);
  }, [savedConfig, draftConfig]);

  // Validation
  const errors = useMemo(() => {
    const errs: {
      maxAutomaticRetries?: string;
      maxCommunications?: string;
      highValueThreshold?: string;
      criticalRiskThreshold?: string;
    } = {};

    if (draftConfig.globalLimits.maxAutomaticRetries.value < 1) {
      errs.maxAutomaticRetries = 'Must be at least 1 retry';
    }
    if (draftConfig.globalLimits.maxCommunications.value < 1) {
      errs.maxCommunications = 'Must be at least 1 communication';
    }
    if (draftConfig.escalationRules.highValueThreshold.value <= 0) {
      errs.highValueThreshold = 'Amount must be greater than 0';
    }
    if (
      draftConfig.escalationRules.criticalRiskThreshold.value < 0 ||
      draftConfig.escalationRules.criticalRiskThreshold.value > 100
    ) {
      errs.criticalRiskThreshold = 'Must be between 0% and 100%';
    }

    return errs;
  }, [draftConfig]);

  const hasErrors = Object.keys(errors).length > 0;

  // Handlers for Global Limits & Escalation Rules
  const handleGlobalLimitsChange = (limits: GlobalPolicyLimits) => {
    setDraftConfig((prev) => ({
      ...prev,
      globalLimits: limits,
    }));
  };

  const handleEscalationRulesChange = (rules: EscalationRulesType) => {
    setDraftConfig((prev) => ({
      ...prev,
      escalationRules: rules,
    }));
  };

  // Handlers for Direction Overrides
  const handleToggleDirection = (id: string, enabled: boolean) => {
    setDraftConfig((prev) => ({
      ...prev,
      directionOverrides: prev.directionOverrides.map((d) =>
        d.id === id ? { ...d, enabled } : d
      ),
    }));
  };

  const handleSaveDirection = (updatedDir: DirectionPolicyOverride) => {
    setDraftConfig((prev) => ({
      ...prev,
      directionOverrides: prev.directionOverrides.map((d) =>
        d.id === updatedDir.id ? updatedDir : d
      ),
    }));
    showToast(`Override settings updated for ${updatedDir.name}.`, 'info');
  };

  // Discard changes
  const handleDiscard = () => {
    setDraftConfig(savedConfig);
    showToast('Unsaved changes discarded.', 'info');
  };

  // Save configuration
  const handleSave = () => {
    if (hasErrors || !isDirty || isSaving) return;

    setIsSaving(true);

    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const lastUpdatedStr = `Today, ${timeStr}`;

      const updatedSaved: FullPolicyConfig = {
        ...draftConfig,
        metadata: {
          ...draftConfig.metadata,
          lastUpdated: lastUpdatedStr,
        },
      };

      setSavedConfig(updatedSaved);
      setDraftConfig(updatedSaved);
      setIsSaving(false);
      showToast('Policy configuration saved and active across recovery cases.', 'success');
    }, 400);
  };

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full font-mono transition-colors">
      {/* Feedback Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-8 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-[#00B074] text-white border-[#00B074]'
              : toast.type === 'error'
              ? 'bg-[#FF4444] text-white border-[#FF4444]'
              : 'bg-[#1A1A1A] dark:bg-white text-white dark:text-[#131416] border-[#2A2B2D]'
          }`}
        >
          <Icon
            icon={
              toast.type === 'success'
                ? 'lucide:check-circle-2'
                : toast.type === 'error'
                ? 'lucide:alert-circle'
                : 'lucide:info'
            }
            className="text-lg shrink-0"
          />
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon icon="lucide:shield" className="text-[#3B82F6] text-2xl shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
              Policies &amp; Configuration
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#4A4A4A] dark:text-[#9CA3AF]">
            Manage global recovery rules, escalation thresholds, and direction-specific behaviors.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          {/* Discard button */}
          <button
            type="button"
            disabled={!isDirty || isSaving}
            onClick={handleDiscard}
            className="px-4 py-2 bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-lg text-xs sm:text-sm font-medium text-[#1A1A1A] dark:text-[#F9FAFB] hover:bg-[#F0F2F5] dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
          >
            Discard Changes
          </button>

          {/* Save button */}
          <button
            type="button"
            disabled={!isDirty || hasErrors || isSaving}
            onClick={handleSave}
            className="px-4 py-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] rounded-lg text-xs sm:text-sm font-bold hover:bg-black dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            {isSaving ? (
              <>
                <Icon icon="lucide:loader-2" className="text-base animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:save" className="text-base" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Policy Status Bar */}
      <PolicyStatusBar metadata={draftConfig.metadata} />

      {/* Global Settings Grid (Global Recovery Limits + Escalation Rules) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        <GlobalRecoveryLimits
          limits={draftConfig.globalLimits}
          onChange={handleGlobalLimitsChange}
          errors={{
            maxAutomaticRetries: errors.maxAutomaticRetries,
            maxCommunications: errors.maxCommunications,
          }}
        />

        <EscalationRules
          rules={draftConfig.escalationRules}
          onChange={handleEscalationRulesChange}
          errors={{
            highValueThreshold: errors.highValueThreshold,
            criticalRiskThreshold: errors.criticalRiskThreshold,
          }}
        />
      </div>

      {/* Section Divider */}
      <div className="pt-2 pb-1 border-b border-[#E5E7EB] dark:border-[#2A2B2D]">
        <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
          Direction-Specific Policy Overrides
        </h3>
        <p className="text-xs text-[#4A4A4A] dark:text-[#9CA3AF] mt-0.5">
          Configure specific rules that override global settings for individual recovery workflows.
        </p>
      </div>

      {/* Direction Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {draftConfig.directionOverrides.map((direction) => (
          <DirectionPolicyCard
            key={direction.id}
            direction={direction}
            onToggle={(enabled) => handleToggleDirection(direction.id, enabled)}
            onEdit={() => setEditingDirection(direction)}
          />
        ))}
      </div>

      {/* Modal Editor for Direction Override */}
      <DirectionPolicyEditor
        isOpen={Boolean(editingDirection)}
        direction={editingDirection}
        onClose={() => setEditingDirection(null)}
        onSave={handleSaveDirection}
      />
    </div>
  );
}
