const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

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
  timestamp: string;
}

export interface ApiPolicy {
  id: string;
  name: string;
  direction?: string | null;
  rules: any;
  isActive: boolean;
  createdAt: string;
}

export interface ApiBatch {
  id: string;
  status: string;
  totalEvents: number;
  processedEvents: number;
  recoveredCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
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
      throw new Error(`API error ${res.status}: ${res.statusText}`);
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
  return fetchJson<ApiCase[]>('/cases?state=action_selected');
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
  return fetchJson<ApiAuditLog[]>(`/audit${query ? `?${query}` : ''}`);
}

export async function fetchBatches(): Promise<ApiBatch[]> {
  try {
    return await fetchJson<ApiBatch[]>('/batches');
  } catch {
    return [];
  }
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
