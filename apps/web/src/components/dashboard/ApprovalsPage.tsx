'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { ApprovalMetricCard } from './ApprovalMetricCard';
import { ApprovalFilters } from './ApprovalFilters';
import { ApprovalRequestCard } from './ApprovalRequestCard';
import { ApprovalHistoryTable } from './ApprovalHistoryTable';
import {
  ApprovalRequest,
  ApprovalHistoryItem,
  ApprovalMetrics,
  ApprovalFilter,
} from '../../mocks/approvals';
import {
  fetchApprovals,
  fetchAuditLog,
  transitionCase,
  approveSimulationCase,
  rejectSimulationCase,
  ApiCase,
} from '../../lib/api';


function mapDirectionToDisplay(code: string): string {
  switch (code) {
    case '01_payment_degradation':
      return 'Payment Degradation';
    case '02_checkout_dropoff':
      return 'Checkout Dropoff';
    case '03_failed_subscription':
      return 'Subscription Recovery';
    case '04_b2b_receivables':
      return 'B2B Receivables';
    case '05_mandate_retry':
      return 'Mandate Retry';
    case '06_hinglish_voice':
      return 'Hinglish Voice';
    case '07_promise_to_pay':
      return 'Promise-to-Pay';
    default:
      return code?.replace(/^[0-9]+_/, '') || 'Autonomous Strategy';
  }
}

export function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [metrics, setMetrics] = useState<ApprovalMetrics>({
    pendingReview: 0,
    approvedLast7Days: 0,
    rejectedLast7Days: 0,
    pendingRiskExposure: 0,
  });
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);
  const [filter, setFilter] = useState<ApprovalFilter>('all');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const loadData = () => {
    Promise.all([
      fetchApprovals(),
      fetchAuditLog({ limit: 20 }).catch(() => []),
    ])
      .then(([apiCases, auditLogs]) => {
        if (Array.isArray(apiCases)) {
          const mapped: ApprovalRequest[] = apiCases.map((c) => {
            const dirName = mapDirectionToDisplay(c.direction);
            const amtRupees = Math.round(c.amountAtRiskMinor / 100);
            return {
              id: c.id,
              actionId: `act-${c.id.slice(0, 8)}`,
              caseId: c.id,
              customerName: `Customer ${c.customerId.slice(0, 8)}`,
              direction: dirName,
              amountAtRisk: amtRupees,
              status: 'pending',
              risk: (c.riskTier || 'high') as any,
              icon:
                c.direction.includes('b2b')
                  ? 'lucide:building'
                  : c.direction.includes('subscription')
                  ? 'lucide:repeat'
                  : 'lucide:shield-alert',
              iconBgClass: 'bg-red-50 dark:bg-red-950/40',
              iconTextClass: 'text-[#FF4444]',
              iconBorderClass: 'border-red-100 dark:border-red-900/40',
              proposedAction: {
                type: 'retry_payment',
                label:
                  c.latestDecisionSummary ||
                  `Authorize high-value recovery action for ${dirName}`,
                icon: 'lucide:refresh-cw',
              },
              escalation: {
                tag: c.escalated ? 'High-Value Escalation Threshold' : 'Supervisory Review Required',
                reason:
                  c.latestDecisionSummary ||
                  'Action amount exceeds autonomous threshold limits.',
                tagVariant: 'high-value',
              },
              context: `Risk Tier: ${c.riskTier.toUpperCase()} • System paused execution pending supervisor sign-off.`,
            };
          });

          setRequests(mapped);

          const totalExposure = mapped.reduce((acc, curr) => acc + curr.amountAtRisk, 0);
          setMetrics({
            pendingReview: mapped.length,
            approvedLast7Days: 14,
            rejectedLast7Days: 2,
            pendingRiskExposure: totalExposure,
          });
          setIsLive(true);
        }

        if (Array.isArray(auditLogs) && auditLogs.length > 0) {
          const mappedHistory: ApprovalHistoryItem[] = auditLogs
            .filter((l) => l.action.includes('transition') || l.action.includes('decision') || l.action.includes('executed'))
            .slice(0, 5)
            .map((l) => ({
              id: l.id,
              caseId: l.caseId || 'SYS',
              actionReviewed: l.summary,
              approver: l.actor || 'Operator',
              status: l.action.includes('stop') || l.action.includes('reject') ? 'rejected' : 'approved',
              reviewedAt: new Date(l.occurredAt || l.timestamp || Date.now()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            }));
          setHistory(mappedHistory);
        }
      })
      .catch(() => {
        setIsLive(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message: string) => {
    setFeedbackToast(message);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  const handleApprove = async (id: string) => {
    const target = requests.find((r) => r.id === id);
    if (!target) return;

    let outcomeMessage = 'Recovery action authorized & executed in simulation mode';
    try {
      const updatedCase = await approveSimulationCase(target.caseId, 'supervisor');
      if (updatedCase?.currentState === 'recovered') {
        const amt = updatedCase.outcomeRecoveredMinor
          ? `₹${Math.round(Number(updatedCase.outcomeRecoveredMinor) / 100).toLocaleString('en-IN')}`
          : target.amountAtRisk;
        outcomeMessage = `Customer payment simulated: ${amt} recovered`;
      } else if (updatedCase?.currentState === 'waiting') {
        outcomeMessage = 'Action executed; retry scheduled (waiting for optimal window)';
      } else if (updatedCase?.currentState === 'customer_action_required') {
        outcomeMessage = 'Action executed; payment link / reminder delivered to customer';
      } else if (updatedCase?.currentState === 'stopped') {
        outcomeMessage = 'Action executed; case stopped after customer declined';
      }
    } catch {
      try {
        await transitionCase(target.caseId, 'recovering', 'Authorized by supervisor in Approvals queue');
      } catch {}
    }

    setRequests((prev) => prev.filter((r) => r.id !== id));
    setMetrics((prev) => ({
      ...prev,
      pendingReview: Math.max(0, prev.pendingReview - 1),
      approvedLast7Days: prev.approvedLast7Days + 1,
      pendingRiskExposure: Math.max(0, prev.pendingRiskExposure - target.amountAtRisk),
    }));

    setHistory((prev) => [
      {
        id: `h_${Date.now()}`,
        caseId: target.caseId,
        actionReviewed: `Authorized: ${target.proposedAction.label} (${target.amountAtRisk}) - ${outcomeMessage}`,
        approver: 'Operator (Supervisor)',
        status: 'approved',
        reviewedAt: 'Just now',
      },
      ...prev.slice(0, 4),
    ]);

    showToast(`Approved Case #${target.caseId.slice(0, 8)}: ${outcomeMessage}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('recovery:data-updated'));
    }
  };

  const handleReject = async (id: string) => {
    const target = requests.find((r) => r.id === id);
    if (!target) return;

    try {
      await rejectSimulationCase(target.caseId, 'supervisor', 'Declined by supervisor in Approvals queue');
    } catch {
      try {
        await transitionCase(target.caseId, 'stopped', 'Declined by supervisor in Approvals queue');
      } catch {}
    }

    setRequests((prev) => prev.filter((r) => r.id !== id));
    setMetrics((prev) => ({
      ...prev,
      pendingReview: Math.max(0, prev.pendingReview - 1),
      rejectedLast7Days: prev.rejectedLast7Days + 1,
      pendingRiskExposure: Math.max(0, prev.pendingRiskExposure - target.amountAtRisk),
    }));

    const newHistoryItem: ApprovalHistoryItem = {
      id: `hist-${Date.now()}`,
      caseId: target.caseId,
      actionReviewed: `Rejected: ${target.proposedAction.label} (${target.amountAtRisk}) - Case stopped`,
      approver: 'Admin User (Supervisor)',
      status: 'rejected',
      reviewedAt: 'Just now',
    };
    setHistory((prev) => [newHistoryItem, ...prev]);
    showToast(`Rejected action for Case #${target.caseId.slice(0, 8)}: Case stopped per policy.`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('recovery:data-updated'));
    }
  };

  const handleRequestInfo = (id: string) => {
    const target = requests.find((r) => r.id === id);
    if (!target) return;

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, infoRequested: true } : r)),
    );
    showToast(`Requested customer dossier for Case ${target.caseId.slice(0, 8)}`);
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'high-risk') return r.risk === 'high' || r.risk === 'critical';
    if (filter === 'subscription') return r.direction.includes('Subscription');
    if (filter === 'b2b') return r.direction.includes('B2B');
    return true;
  });

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 font-mono">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed top-20 right-8 z-50 bg-[#1A1A1A] dark:bg-[#F9FAFB] text-white dark:text-[#1A1A1A] px-4 py-3 rounded-lg shadow-xl border border-neutral-700 dark:border-neutral-200 flex items-center gap-3 animate-bounce">
          <Icon icon="lucide:check-circle-2" className="text-[#00B074] text-lg" />
          <span className="text-sm font-semibold">{feedbackToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
              Approvals & Human-in-the-Loop
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                isLive
                  ? 'bg-[#00B074]/10 text-[#00B074] border-[#00B074]/20'
                  : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20'
              }`}
            >
              {isLive ? 'Live API Action Queue' : 'Connecting...'}
            </span>
          </div>
          <p className="text-sm text-[#4A4A4A] dark:text-[#9CA3AF]">
            Review, authorize, or decline high-value recovery interventions.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <ApprovalMetricCard metrics={metrics} />

      {/* Main Content Area */}
      <div className="flex flex-col gap-4">
        <ApprovalFilters currentFilter={filter} onFilterChange={setFilter} />

        {filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl p-12 text-center shadow-sm">
            <Icon icon="lucide:check-circle-2" className="text-4xl text-[#00B074] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-1">
              Queue Cleared!
            </h3>
            <p className="text-xs text-[#8C8C8C] dark:text-[#9CA3AF] max-w-sm mx-auto">
              All high-risk autonomous recovery decisions have been authorized.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRequests.map((req) => (
              <ApprovalRequestCard
                key={req.id}
                request={req}
                onApprove={handleApprove}
                onReject={handleReject}
                onRequestInfo={handleRequestInfo}
              />
            ))}
          </div>
        )}
      </div>

      {/* Audit History */}
      <ApprovalHistoryTable history={history} />
    </div>
  );
}
