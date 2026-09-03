'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { Sidebar } from '../../../components/dashboard/Sidebar';
import { Header } from '../../../components/dashboard/Header';
import { CaseDetailPage } from '../../../components/dashboard/CaseDetailPage';
import {
  fetchCaseDetail,
  fetchAuditLog,
  ApiCase,
  ApiAuditLog,
} from '../../../lib/api';
import {
  RecoveryCaseDetail,
  TimelineEvent,
} from '../../../mocks/recoveryCaseDetails';
import { RecoveryCaseStatus, RecoveryCaseRisk } from '../../../mocks/recoveryCases';

interface CaseDetailRouteProps {
  params: Promise<{
    caseId: string;
  }>;
}

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
      return code?.replace(/^[0-9]+_/, '') || 'Autonomous Recovery';
  }
}

export default function CaseDetailRoute({ params }: CaseDetailRouteProps) {
  const resolvedParams = use(params);
  const caseId = resolvedParams.caseId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<RecoveryCaseDetail | null>(null);

  const loadCase = (showLoadingSpinner: boolean = false) => {
    if (showLoadingSpinner) setLoading(true);
    setError(null);

    Promise.all([
      fetchCaseDetail(caseId),
      fetchAuditLog({ caseId, limit: 50 }).catch(() => [] as ApiAuditLog[]),
    ])
      .then(([apiCase, auditLogs]) => {
        const prob =
          typeof apiCase.recoveryProbability === 'string'
            ? Math.round(parseFloat(apiCase.recoveryProbability) * 100)
            : Math.round((apiCase.recoveryProbability || 0.5) * 100);

        const statusMap: Record<string, RecoveryCaseStatus> = {
          detected: 'Waiting',
          investigating: 'Waiting',
          action_selected: 'Waiting',
          waiting: 'Waiting',
          customer_action_required: 'Cust Action',
          recovering: 'Waiting',
          escalated: 'Escalated',
          recovered: 'Recovered',
          stopped: 'Stopped',
          failed: 'Stopped',
        };

        const riskMap: Record<string, RecoveryCaseRisk> = {
          low: 'Low',
          medium: 'Medium',
          high: 'High',
          critical: 'Critical',
        };

        const timeline: TimelineEvent[] = (auditLogs || []).map((log) => {
          const lifecycle = (log.detail as any)?.lifecycleEvent;
          const isSuccess =
            log.action.includes('recovered') ||
            log.action.includes('executed') ||
            lifecycle === 'ACTION_EXECUTED' ||
            lifecycle === 'CASE_RECOVERED';
          const isEscalation =
            log.action.includes('escalat') ||
            lifecycle === 'ESCALATION' ||
            lifecycle === 'APPROVAL_REQUESTED';
          const isCheck =
            log.action.includes('checked') ||
            log.action.includes('detected') ||
            lifecycle === 'POLICY_CHECKED' ||
            lifecycle === 'CASE_CREATED' ||
            lifecycle === 'LIVE_DEMO_CREATED';

          const title = lifecycle
            ? String(lifecycle).replace(/_/g, ' ').toUpperCase()
            : log.action.replace(/_/g, ' ').toUpperCase();

          return {
            id: log.id,
            title,
            description: log.summary,
            time: new Date(log.occurredAt || log.timestamp || Date.now()).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            icon: isSuccess
              ? 'lucide:check-circle'
              : isEscalation
              ? 'lucide:alert-triangle'
              : isCheck
              ? 'lucide:shield'
              : 'lucide:activity',
            iconColor: isSuccess
              ? 'green'
              : isEscalation
              ? 'red'
              : isCheck
              ? 'blue'
              : 'muted',
            bgClass: isSuccess
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
              : isEscalation
              ? 'bg-red-50 dark:bg-red-950/40 text-red-600'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600',
          };
        });

        // Add initial event if empty
        if (timeline.length === 0) {
          timeline.push({
            id: 'init-1',
            title: 'CASE OPENED',
            description: apiCase.latestDecisionSummary || 'Autonomous case initialized from revenue event.',
            time: new Date(apiCase.openedAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            icon: 'lucide:inbox',
            iconColor: 'blue',
            bgClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600',
          });
        }

        const isRecovered = apiCase.currentState === 'recovered';
        const isEscalated = apiCase.currentState === 'escalated' || apiCase.escalated;

        const detail: RecoveryCaseDetail = {
          id: apiCase.id,
          customer: `Customer ${apiCase.customerId.slice(0, 8)}`,
          direction: mapDirectionToDisplay(apiCase.direction),
          amountAtRisk: Math.round(apiCase.amountAtRiskMinor / 100),
          amountRecovered: Math.round((apiCase.outcomeRecoveredMinor || 0) / 100),
          status: statusMap[apiCase.currentState] || 'Waiting',
          risk: riskMap[apiCase.riskTier] || 'Medium',
          recoveryProbability: prob,
          timeline,
          outcome: {
            successful: isRecovered,
            title: isRecovered
              ? 'Revenue Successfully Recovered'
              : isEscalated
              ? 'Intervention Escalated to Operator'
              : 'Autonomous Recovery In Flight',
            description:
              apiCase.outcomeReason ||
              apiCase.latestDecisionSummary ||
              `Case currently active in ${mapDirectionToDisplay(apiCase.direction)} sequence.`,
            amountRecovered: Math.round((apiCase.outcomeRecoveredMinor || 0) / 100),
          },
          aiDecision: {
            whyExplanation:
              apiCase.latestDecisionSummary ||
              `AI evaluated failure telemetry and assigned ${prob}% recovery probability under ${apiCase.riskTier} risk tier.`,
            recommendedAction:
              apiCase.currentState === 'escalated'
                ? 'High-value threshold exceeded — human supervisor approval required.'
                : 'Execute autonomous dunning / smart retry routing sequence.',
            confidence: prob >= 80 ? 'High' : prob >= 60 ? 'Medium' : 'Low',
          },
          policyDecision: {
            proposedAction: 'Autonomous Recovery Strategy',
            actionAllowed: !isEscalated,
            policyReason: isEscalated
              ? 'Escalation triggered per high-value guardrail limit.'
              : 'Action within active policy bounds.',
            retriesUsed: `${apiCase.attemptCount} / 3`,
            commsAttempts: `${apiCase.attemptCount} / 4`,
            humanApproval: isEscalated ? 'Mandatory (Triggered)' : 'Auto-Approved',
          },
          batchId: apiCase.batchId,
        };

        setCaseDetail(detail);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load case');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCase(true);
  }, [caseId]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F2F5] dark:bg-[#131416] font-mono text-[#1A1A1A] dark:text-[#F9FAFB] transition-colors">
      <Sidebar activeItem="cases" />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto scrollbar-hide bg-[#F0F2F5] dark:bg-[#131416] transition-colors">
        <Header
          showNotificationBadge
          onSearch={(query) => {
            console.debug('Search query:', query);
          }}
          onCalendarClick={() => {}}
          onFilterClick={() => {}}
          onNotificationClick={() => {}}
        />

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
            <Icon icon="lucide:loader-2" className="text-3xl text-[#3B82F6] animate-spin" />
            <p className="text-sm text-[#8C8C8C] dark:text-[#6B7280]">
              Fetching case {caseId} from Postgres...
            </p>
          </div>
        ) : error || !caseDetail ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
            <Icon icon="lucide:alert-triangle" className="text-4xl text-[#FF4444]" />
            <h2 className="text-lg font-bold">Case Not Found</h2>
            <p className="text-sm text-[#8C8C8C] max-w-md">
              {error || `Case ${caseId} does not exist in the database.`}
            </p>
            <Link
              href="/recovery-cases"
              className="px-4 py-2 bg-[#1A1A1A] text-white dark:bg-white dark:text-[#131416] rounded-lg text-xs font-bold"
            >
              Back to Cases
            </Link>
          </div>
        ) : (
          <CaseDetailPage caseDetail={caseDetail} onRefresh={() => loadCase(false)} />
        )}
      </main>
    </div>
  );
}
