'use client';

import { useState, useEffect } from 'react';
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
import { fetchPolicies } from '../../lib/api';

export function PoliciesPage() {
  const [config, setConfig] = useState<FullPolicyConfig>(INITIAL_POLICIES_DATA);
  const [editingDirection, setEditingDirection] = useState<DirectionPolicyOverride | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    fetchPolicies()
      .then((apiPolicies) => {
        if (Array.isArray(apiPolicies) && apiPolicies.length > 0) {
          setIsLive(true);
        }
      })
      .catch(() => {
        setIsLive(false);
      });
  }, []);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleGlobalChange = (newLimits: GlobalPolicyLimits) => {
    setConfig((prev) => ({
      ...prev,
      globalLimits: newLimits,
    }));
  };

  const handleEscalationChange = (newRules: EscalationRulesType) => {
    setConfig((prev) => ({
      ...prev,
      escalationRules: newRules,
    }));
  };

  const handleSaveDirectionOverride = (updated: DirectionPolicyOverride) => {
    setConfig((prev) => ({
      ...prev,
      directionOverrides: prev.directionOverrides.map((d) => (d.id === updated.id ? updated : d)),
    }));
    setEditingDirection(null);
    showToast(`Updated overrides for ${updated.name}`, 'info');
  };

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 font-mono pb-24">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-8 z-50 px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-bounce ${
            toast.type === 'success'
              ? 'bg-[#1A1A1A] dark:bg-[#F9FAFB] text-white dark:text-[#1A1A1A] border-neutral-700 dark:border-neutral-200'
              : toast.type === 'info'
              ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
              : 'bg-[#FF4444] text-white border-[#FF4444]'
          }`}
        >
          <Icon
            icon={
              toast.type === 'success'
                ? 'lucide:check-circle-2'
                : toast.type === 'info'
                ? 'lucide:info'
                : 'lucide:alert-circle'
            }
            className="text-lg"
          />
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
              Policy Engine Configuration
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                isLive
                  ? 'bg-[#00B074]/10 text-[#00B074] border-[#00B074]/20'
                  : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20'
              }`}
            >
              {isLive ? 'Live Policy Engine' : 'Sandbox Demo Baseline'}
            </span>
          </div>
          <p className="text-sm text-[#4A4A4A] dark:text-[#9CA3AF]">
            Configure autonomous guardrails, retry limits, and human escalation thresholds.
          </p>
        </div>
      </div>

      <PolicyStatusBar metadata={config.metadata} />

      <GlobalRecoveryLimits
        limits={config.globalLimits}
        onChange={handleGlobalChange}
      />

      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
            Direction Policy Overrides
          </h3>
          <p className="text-xs text-[#8C8C8C] dark:text-[#6B7280]">
            Customize execution limits specifically for individual recovery strategies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {config.directionOverrides.map((direction) => (
            <DirectionPolicyCard
              key={direction.id}
              direction={direction}
              onToggle={(enabled) => {
                setConfig((prev) => ({
                  ...prev,
                  directionOverrides: prev.directionOverrides.map((d) =>
                    d.id === direction.id ? { ...d, enabled } : d,
                  ),
                }));
              }}
              onEdit={() => setEditingDirection(direction)}
            />
          ))}
        </div>
      </div>

      <EscalationRules
        rules={config.escalationRules}
        onChange={handleEscalationChange}
      />

      <DirectionPolicyEditor
        isOpen={Boolean(editingDirection)}
        direction={editingDirection}
        onClose={() => setEditingDirection(null)}
        onSave={handleSaveDirectionOverride}
      />
    </div>
  );
}
