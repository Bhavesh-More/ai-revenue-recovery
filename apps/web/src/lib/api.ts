const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '')}/api/v1`
  : 'http://localhost:4000/api/v1';

export interface OverviewStatsResponse {
  revenueAtRiskMinor: number;
  revenueRecoveredMinor: number;
  recoveryRate: number;
  activeCases: number;
  highRiskCases: number;
  directionCounts: Record<string, number>;
  totalCasesCount: number;
}

export interface ApiCase {
  id: string;
  customerId: string;
  originatingEventId: string;
  direction: string;
  currentState: string;
  amountAtRiskMinor: number;
  currency: string;
  recoveryProbability: string | number;
  riskTier: 'low' | 'medium' | 'high' | 'critical';
  attemptCount: number;
  escalated: boolean;
  batchId?: string | null;
  latestDecisionSummary?: string | null;
  outcomeState?: string | null;
  outcomeRecoveredMinor?: number;
  outcomePromisedMinor?: number;
  outcomeReason?: string | null;
  outcomeClosedAt?: string | null;
  openedAt: string;
  updatedAt: string;
}


export interface ApiAuditLog {
  id: string;
  caseId: string;
  action: string;
  summary: string;
  detail?: any;
  actor: string;
  occurredAt?: string;
  timestamp?: string;
}

export interface ApiPolicy {
  id: string;
  name: string;
  direction?: string | null;
  rules: any;
  isActive: boolean;
  createdAt: string;
}

export interface SingleMetricSet {
  totalCases: number;
  activeCases: number;
  recoveredCases: number;
  escalatedCases: number;
  stoppedCases: number;
  failedCases: number;
  intervenedCases: number;
  intervenedRecoveredCases: number;
  revenueAtRiskMinor: number;
  expectedRecoveryMinor: number;
  promisedAmountMinor: number;
  actualRecoveredMinor: number;
  recoveryRate: number; // 0.000 to 1.000
  naturalBaselineRecoveredMinor: number;
  incrementalRecoveryMinor: number;
  interventionEffectiveness: number;
  escalationRate: number;
  stopRate: number;
}

export interface ComprehensiveRecoveryMetrics extends SingleMetricSet {
  byDirection: Partial<Record<string, SingleMetricSet>>;
  byRiskTier: Partial<Record<string, SingleMetricSet>>;
}

export interface ApiBatch {
  id: string;
  name: string;
  status: string;
  directions: string[];
  caseIds?: string[];
  totalCases: number;
  recoveredCases?: number;
  escalatedCases?: number;
  stoppedCases?: number;
  failedCases?: number;
  revenueAtRiskMinor?: number;
  revenueRecoveredMinor?: number;
  recoveryRate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      let message = `API error ${res.status}: ${res.statusText}`;
      try {
        const errPayload = await res.json();
        if (errPayload?.error?.message) {
          message = errPayload.error.message;
        } else if (errPayload?.message) {
          message = errPayload.message;
        }
      } catch {}
      throw new Error(message);
    }

    const payload = await res.json();
    return payload.data !== undefined ? payload.data : payload;
  } catch (err) {
    console.warn(`[API fetchJson] Endpoint ${endpoint} unreachable or failed:`, err);
    throw err;
  }
}

// Platform API Endpoints (per docs/api.md)
export async function fetchOverviewStats(): Promise<OverviewStatsResponse> {
  return fetchJson<OverviewStatsResponse>('/cases/stats');
}

export async function fetchMetrics(filters?: {
  direction?: string;
  batchId?: string;
}): Promise<ComprehensiveRecoveryMetrics> {
  const params = new URLSearchParams();
  if (filters?.direction) params.set('direction', filters.direction);
  if (filters?.batchId) params.set('batchId', filters.batchId);
  const query = params.toString();
  return fetchJson<ComprehensiveRecoveryMetrics>(`/metrics${query ? `?${query}` : ''}`);
}

export async function fetchRecoveryCases(filters?: {
  direction?: string;
  state?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiCase[]> {
  const params = new URLSearchParams();
  if (filters?.direction) params.set('direction', filters.direction);
  if (filters?.state) params.set('state', filters.state);
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.offset) params.set('offset', String(filters.offset));

  const query = params.toString();
  return fetchJson<ApiCase[]>(`/cases${query ? `?${query}` : ''}`);
}

export async function fetchCaseDetail(caseId: string): Promise<ApiCase> {
  return fetchJson<ApiCase>(`/cases/${caseId}`);
}

export async function fetchApprovals(): Promise<ApiCase[]> {
  // Fetch cases requiring human review: escalated or action_selected
  try {
    const escalated = await fetchRecoveryCases({ state: 'escalated', limit: 100 });
    const actionSelected = await fetchRecoveryCases({ state: 'action_selected', limit: 100 });
    const map = new Map<string, ApiCase>();
    [...escalated, ...actionSelected].forEach(c => map.set(c.id, c));
    return Array.from(map.values());
  } catch {
    return fetchRecoveryCases({ state: 'escalated', limit: 50 });
  }
}

export async function transitionCase(
  caseId: string,
  toState: string,
  reason?: string,
): Promise<ApiCase> {
  return fetchJson<ApiCase>(`/cases/${caseId}/transitions`, {
    method: 'POST',
    body: JSON.stringify({
      toState,
      reason: reason || 'Action processed from Approvals dashboard',
      actor: 'dashboard:operator',
    }),
  });
}

export async function fetchPolicies(): Promise<ApiPolicy[]> {
  return fetchJson<ApiPolicy[]>('/policies');
}

export async function fetchAuditLog(filters?: {
  caseId?: string;
  limit?: number;
}): Promise<ApiAuditLog[]> {
  const params = new URLSearchParams();
  if (filters?.caseId) params.set('caseId', filters.caseId);
  if (filters?.limit) params.set('limit', String(filters.limit));

  const query = params.toString();
  return fetchJson<ApiAuditLog[]>(`/audit-events${query ? `?${query}` : ''}`);
}

export async function fetchBatches(): Promise<ApiBatch[]> {
  try {
    return await fetchJson<ApiBatch[]>('/batches');
  } catch {
    return [];
  }
}

export async function createBatch(payload: {
  name: string;
  directions?: string[];
  caseIds?: string[];
  batchName?: string;
  generationMode?: 'single' | 'mixed';
  singleDirection?: string;
  numberOfCases?: number;
  dateRangePreset?: '24h' | '7d' | '30d' | 'custom';
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  customerContext?: any;
  edgeCases?: any;
  generateGroundTruth?: boolean;
  randomSeed?: number;
  enableSimulation?: boolean;
}): Promise<ApiBatch & { metrics?: any; activity?: any; caseResults?: any[] }> {
  return fetchJson<ApiBatch & { metrics?: any; activity?: any; caseResults?: any[] }>('/batches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}


export async function evaluateBatch(batchId: string): Promise<{
  batch: ApiBatch;
  metrics: SingleMetricSet & {
    processedCases?: number;
    waitingCases?: number;
    byIntervention?: {
      paymentLink: number;
      systemRetry: number;
      reminder: number;
      customerAction: number;
      humanEscalation: number;
    };
  };
  activity?: any[];
}> {
  return fetchJson<{
    batch: ApiBatch;
    metrics: SingleMetricSet & {
      processedCases?: number;
      waitingCases?: number;
      byIntervention?: {
        paymentLink: number;
        systemRetry: number;
        reminder: number;
        customerAction: number;
        humanEscalation: number;
      };
    };
    activity?: any[];
  }>(`/batches/${batchId}/evaluate`, {
    method: 'POST',
  });
}

export async function approveSimulationCase(caseId: string, actor: string = 'operator'): Promise<ApiCase> {
  return fetchJson<ApiCase>(`/cases/${caseId}/approve-simulation`, {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });
}

export async function rejectSimulationCase(caseId: string, actor: string = 'operator', reason?: string): Promise<ApiCase> {
  return fetchJson<ApiCase>(`/cases/${caseId}/reject-simulation`, {
    method: 'POST',
    body: JSON.stringify({ actor, reason }),
  });
}

export async function advanceSimulationCase(caseId: string, actor: string = 'operator'): Promise<ApiCase> {
  return fetchJson<ApiCase>(`/cases/${caseId}/advance-simulation`, {
    method: 'POST',
    body: JSON.stringify({ actor }),
  });
}

export async function settleSimulationCase(caseId: string, actor: string = 'operator'): Promise<ApiCase> {
  return approveSimulationCase(caseId, actor);
}


// Direction Specific Endpoints (per docs/api.md)
export async function fetchPaymentDegradationCases(): Promise<ApiCase[]> {
  return fetchJson<ApiCase[]>('/payment-recovery/cases').catch(() => fetchRecoveryCases({ direction: '01_payment_degradation' }));
}

export async function fetchCheckoutDropoffCases(): Promise<ApiCase[]> {
  return fetchJson<ApiCase[]>('/checkout-recovery/cases').catch(() => fetchRecoveryCases({ direction: '02_checkout_dropoff' }));
}

export async function fetchSubscriptionRecoveryCases(): Promise<ApiCase[]> {
  return fetchJson<ApiCase[]>('/subscription-recovery/cases').catch(() => fetchRecoveryCases({ direction: '03_failed_subscription' }));
}

export async function fetchReceivablesCases(): Promise<ApiCase[]> {
  return fetchJson<ApiCase[]>('/receivables/cases').catch(() => fetchRecoveryCases({ direction: '04_b2b_receivables' }));
}

export async function fetchMandateRetryCases(): Promise<ApiCase[]> {
  return fetchJson<ApiCase[]>('/mandate-recovery/cases').catch(() => fetchRecoveryCases({ direction: '05_mandate_retry' }));
}

export async function fetchVoiceRecoveryCases(): Promise<ApiCase[]> {
  return fetchJson<ApiCase[]>('/voice-recovery/cases').catch(() => fetchRecoveryCases({ direction: '06_hinglish_voice' }));
}

export async function fetchPromiseToPayCases(): Promise<ApiCase[]> {
  return fetchJson<ApiCase[]>('/promises').catch(() => fetchRecoveryCases({ direction: '07_promise_to_pay' }));
}

export async function createCasePaymentLink(caseId: string): Promise<{ paymentLinkId: string; shortUrl: string }> {
  return fetchJson<{ paymentLinkId: string; shortUrl: string }>(`/cases/${caseId}/payment-link`, {
    method: 'POST',
  });
}

export async function retryCasePayment(caseId: string): Promise<{ paymentId: string; status: string; executed: boolean }> {
  return fetchJson<{ paymentId: string; status: string; executed: boolean }>(`/cases/${caseId}/retry-payment`, {
    method: 'POST',
  });
}

export async function fetchAgentJob(jobId: string): Promise<{ id: string; status: string; progress: number; startedAt: string; completedAt: string | null }> {
  return fetchJson<{ id: string; status: string; progress: number; startedAt: string; completedAt: string | null }>(`/jobs/${jobId}`);
}

export async function fetchAgentJobEvents(jobId: string): Promise<Array<{ jobId: string; type: string; message: string; createdAt: string }>> {
  return fetchJson<Array<{ jobId: string; type: string; message: string; createdAt: string }>>(`/jobs/${jobId}/events`);
}

export async function fetchObservabilityStatus(): Promise<{ tracingEnabled: boolean; project: string; environment: string; endpoint: string; status: string }> {
  return fetchJson<{ tracingEnabled: boolean; project: string; environment: string; endpoint: string; status: string }>('/observability/status');
}

export interface LiveDemoInput {
  direction: string;
  customer: {
    name: string;
    email: string;
    externalId?: string;
    phone?: string;
    companyName?: string;
  };
  amount: number;
  directionData?: Record<string, any>;
}

export interface LiveDemoResult {
  case: ApiCase;
  decision?: any;
  status: string;
  approvalRequired: boolean;
  emailSent: boolean;
  emailResult?: {
    id?: string;
    messageId?: string;
    status: string;
    provider: string;
    to: string;
    subject: string;
    acceptedAt?: string;
    deliveredAt?: string;
    error?: string;
  };
  paymentLink?: {
    id: string;
    shortUrl: string;
    status: string;
  };
}

export async function executeLiveDemo(input: LiveDemoInput): Promise<LiveDemoResult> {
  return fetchJson<LiveDemoResult>('/live-demo/execute', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function approveLiveDemo(caseId: string, actor: string = 'supervisor'): Promise<LiveDemoResult> {
  return fetchJson<LiveDemoResult>('/live-demo/approve', {
    method: 'POST',
    body: JSON.stringify({ caseId, actor }),
  });
}

export function formatCurrencyMinor(minor: number, currency: string = 'INR'): string {
  const rupees = Math.round(minor / 100);
  if (rupees >= 10000000) {
    return `₹${(rupees / 10000000).toFixed(2)} Cr`;
  }
  if (rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(1)}L`;
  }
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export async function syncCaseRazorpay(caseId: string): Promise<{
  synced: boolean;
  status: string;
  message: string;
  case: ApiCase;
}> {
  return fetchJson<{
    synced: boolean;
    status: string;
    message: string;
    case: ApiCase;
  }>(`/cases/${caseId}/sync-razorpay`, {
    method: 'POST',
  });
}

export async function simulateCasePaymentFailure(
  caseId: string,
  reason?: string,
): Promise<{
  simulated: boolean;
  status: string;
  message: string;
  case: ApiCase;
}> {
  return fetchJson<{
    simulated: boolean;
    status: string;
    message: string;
    case: ApiCase;
  }>(`/cases/${caseId}/simulate-payment-failure`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function simulateCasePaymentSuccess(caseId: string): Promise<{
  simulated: boolean;
  status: string;
  message: string;
  case: ApiCase;
}> {
  return fetchJson<{
    simulated: boolean;
    status: string;
    message: string;
    case: ApiCase;
  }>(`/cases/${caseId}/simulate-payment-success`, {
    method: 'POST',
  });
}
