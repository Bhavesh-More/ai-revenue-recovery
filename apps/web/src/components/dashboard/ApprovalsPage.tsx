'use client';

import { useState } from 'react';
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

export function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(INITIAL_APPROVAL_REQUESTS);
  const [metrics, setMetrics] = useState<ApprovalMetrics>(INITIAL_APPROVAL_METRICS);
  const [history, setHistory] = useState<ApprovalHistoryItem[]>(INITIAL_APPROVAL_HISTORY);
  const [filter, setFilter] = useState<ApprovalFilter>('all');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setFeedbackToast(message);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  // Handle Approve
  const handleApprove = (id: string) => {
    const target = requests.find((r) => r.id === id);
    if (!target) return;

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
      status: 'approved',
      approver: 'Admin User',
      reviewedAt: 'Today, Just now',
    };

    setHistory((prev) => [newHistoryItem, ...prev]);
    showToast(`Action "${target.proposedAction.label}" approved for ${target.customerName}.`);
  };

  // Handle Reject
  const handleReject = (id: string) => {
    const target = requests.find((r) => r.id === id);
    if (!target) return;

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
      status: 'rejected',
      approver: 'Admin User',
      reviewedAt: 'Today, Just now',
    };

    setHistory((prev) => [newHistoryItem, ...prev]);
    showToast(`Action "${target.proposedAction.label}" rejected for ${target.customerName}.`);
  };

  // Handle Request Info
  const handleRequestInfo = (id: string) => {
    const target = requests.find((r) => r.id === id);
    if (!target) return;

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, infoRequested: true } : r))
    );

    showToast(`Information requested for case ${target.caseId}.`);
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (filter === 'high-risk') {
      return r.risk === 'high' || r.risk === 'critical';
    }
    if (filter === 'subscription') {
      return r.direction === 'Subscription Recovery';
    }
    if (filter === 'b2b') {
      return r.direction === 'B2B Receivables';
    }
    return true;
  });

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 font-mono">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] rounded-xl shadow-xl border border-[#2A2B2D] flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Icon icon="lucide:check-circle-2" className="text-[#00B074] text-lg shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F9FAFB]">
            Approvals
          </h1>
          <p className="text-sm text-[#4A4A4A] dark:text-[#9CA3AF] mt-1">
            Review and authorize high-risk or escalated recovery actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 border border-[#E5E7EB] dark:border-[#2A2B2D] bg-white dark:bg-[#171819] px-4 py-2 rounded-lg text-sm text-[#1A1A1A] dark:text-[#F9FAFB] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Icon icon="lucide:filter" className="text-base text-[#8C8C8C] dark:text-[#6B7280]" />
            <span>More Filters</span>
          </button>
        </div>
      </div>

      {/* Top 4 Metrics */}
      <ApprovalMetricCard metrics={metrics} />

      {/* Filter Bar */}
      <ApprovalFilters
        currentFilter={filter}
        onFilterChange={setFilter}
        counts={{
          all: requests.length,
          highRisk: requests.filter((r) => r.risk === 'high' || r.risk === 'critical').length,
          subscription: requests.filter((r) => r.direction === 'Subscription Recovery').length,
          b2b: requests.filter((r) => r.direction === 'B2B Receivables').length,
        }}
      />

      {/* Pending Approval Requests List */}
      <div className="flex flex-col gap-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-[#171819] border border-[#E5E7EB] dark:border-[#2A2B2D] rounded-xl p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#00B074]/10 text-[#00B074] flex items-center justify-center mx-auto mb-3">
              <Icon icon="lucide:check" className="text-2xl" />
            </div>
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F9FAFB] mb-1">
              No Pending Approvals in this View
            </h3>
            <p className="text-xs text-[#8C8C8C] dark:text-[#6B7280]">
              All recovery actions in this queue have been authorized or reviewed.
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <ApprovalRequestCard
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onReject={handleReject}
              onRequestInfo={handleRequestInfo}
            />
          ))
        )}
      </div>

      {/* Recent Approvals History */}
      <div className="mt-4">
        <ApprovalHistoryTable history={history} />
      </div>
    </div>
  );
}
