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
  INITIAL_APPROVAL_REQUESTS,
  INITIAL_APPROVAL_HISTORY,
  INITIAL_APPROVAL_METRICS,
} from '../../mocks/approvals';
import { fetchApprovals, transitionCase } from '../../lib/api';

export function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(INITIAL_APPROVAL_REQUESTS);
  const [metrics, setMetrics] = useState<ApprovalMetrics>(INITIAL_APPROVAL_METRICS);
  const [history, setHistory] = useState<ApprovalHistoryItem[]>(INITIAL_APPROVAL_HISTORY);
  const [filter, setFilter] = useState<ApprovalFilter>('all');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    fetchApprovals()
      .then((apiCases) => {
        if (Array.isArray(apiCases) && apiCases.length > 0) {
          const mapped: ApprovalRequest[] = apiCases.map((c) => ({
            id: c.id,
            actionId: `act-${c.id.slice(0, 8)}`,
            caseId: c.id,
            customerName: `Customer ${c.customerId.slice(0, 8)}`,
            direction: 'B2B Receivables',
            amountAtRisk: Math.round(c.amountAtRiskMinor / 100),
            status: 'pending',
            risk: (c.riskTier || 'high') as any,
            icon: 'lucide:building',
            iconBgClass: 'bg-red-50 dark:bg-red-950/40',
            iconTextClass: 'text-[#FF4444]',
            iconBorderClass: 'border-red-100 dark:border-red-900/40',
            proposedAction: {
              type: 'retry_payment',
              label: c.latestDecisionSummary || 'Execute high-value recovery policy transition',
              icon: 'lucide:refresh-cw',
            },
            escalation: {
              tag: 'High Risk Threshold Exceeded',
              reason: 'Automatic retry requires human approval for high-risk accounts',
              tagVariant: 'high-value',
            },
            context: 'System paused action execution pending supervisor approval.',
          }));

          setRequests(mapped);
          setMetrics({
            pendingReview: mapped.length,
            approvedLast7Days: 45,
            rejectedLast7Days: 8,
            pendingRiskExposure: mapped.reduce((acc, curr) => acc + curr.amountAtRisk, 0),
          });
          setIsLive(true);
        }
      })
      .catch(() => {
        setIsLive(false);
      });
  }, []);

  const showToast = (message: string) => {
    setFeedbackToast(message);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  const handleApprove = (id: string) => {
    const target = requests.find((r) => r.id === id);
    if (!target) return;

    if (isLive) {
      transitionCase(target.caseId, 'recovering', 'Approved by operator in Approvals dashboard').catch(() => undefined);
    }

    setRequests((prev) => prev.filter((r) => r.id !== id));
    setMetrics((prev) => ({
      ...prev,
      pendingReview: Math.max(0, prev.pendingReview - 1),
      approvedLast7Days: prev.approvedLast7Days + 1,
      pendingRiskExposure: Math.max(0, prev.pendingRiskExposure - target.amountAtRisk),
    }));

    const newHistoryItem: ApprovalHistoryItem = {
      id: `hist-${Date.now()}`,
      caseId: target.caseId,
      actionReviewed: target.proposedAction.label,
      approver: 'Admin User (You)',
      status: 'approved',
      reviewedAt: 'Just now',
    };
    setHistory((prev) => [newHistoryItem, ...prev]);
    showToast(`Approved action for Case ${target.caseId}`);
  };

  const handleReject = (id: string) => {
    const target = requests.find((r) => r.id === id);
    if (!target) return;

    if (isLive) {
      transitionCase(target.caseId, 'stopped', 'Rejected by operator in Approvals dashboard').catch(() => undefined);
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
      actionReviewed: target.proposedAction.label,
      approver: 'Admin User (You)',
      status: 'rejected',
      reviewedAt: 'Just now',
    };
    setHistory((prev) => [newHistoryItem, ...prev]);
    showToast(`Rejected action for Case ${target.caseId}`);
  };

  const handleRequestInfo = (id: string) => {
    const target = requests.find((r) => r.id === id);
    if (!target) return;

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, infoRequested: true } : r)),
    );
    showToast(`Requested additional info for Case ${target.caseId}`);
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'high-risk') return r.risk === 'high' || r.risk === 'critical';
    if (filter === 'subscription') return r.direction === 'Subscription Recovery';
    if (filter === 'b2b') return r.direction === 'B2B Receivables';
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
              {isLive ? 'Live API Action Queue' : 'Sandbox Demo Baseline'}
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
