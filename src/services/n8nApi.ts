import type {
  TriageResponse,
  OverviewMetrics,
  EvidenceRecordItem,
  TrendTimelineItem,
  TrendStudentItem,
  SafetyCommitment,
  SupportProposal,
  SupportAction,
  AuditLogEntry,
} from '../types/attendance';

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(status: number, message: string, code?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

class N8nApiService {
  private baseUrl: string = '/webhook';

  constructor() {
    // Check if user set a custom URL in localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('care_triage_n8n_url');
      if (saved) {
        this.baseUrl = saved;
      }
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(url: string) {
    let clean = url.trim();
    if (clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    this.baseUrl = clean;
    if (typeof window !== 'undefined') {
      localStorage.setItem('care_triage_n8n_url', clean);
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const fullUrl = this.baseUrl.startsWith('http')
      ? `${this.baseUrl}${path.replace(/^\/webhook/, '')}`
      : `${this.baseUrl}${path.replace(/^\/webhook/, '')}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(fullUrl, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      throw new ApiError(
        0,
        `Network connection to n8n backend failed: ${networkErr.message || 'Unable to reach backend'}`,
        'NETWORK_FAILURE',
        networkErr
      );
    }

    let data: any;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => ({}));
    } else {
      const text = await response.text();
      data = { rawText: text };
    }

    if (!response.ok) {
      const code = data?.code || `HTTP_${response.status}`;
      const msg = data?.message || data?.error || `Request failed with status ${response.status}`;
      throw new ApiError(response.status, msg, code, data);
    }

    return data as T;
  }

  // 1. Live health check
  async checkHealth(): Promise<{ ok: boolean; status: number; latencyMs: number; details?: any }> {
    const start = performance.now();
    try {
      const healthPath = this.baseUrl.startsWith('http')
        ? new URL('/healthz', this.baseUrl).toString()
        : '/healthz';

      const res = await fetch(healthPath, { method: 'GET' });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const details = await res.json().catch(() => ({}));
        return { ok: true, status: res.status, latencyMs, details };
      }
      return { ok: false, status: res.status, latencyMs };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      return { ok: false, status: 0, latencyMs, details: err };
    }
  }

  // 2. Evaluate Triage (matches n8n workflow POST /webhook/triage-evaluate)
  async evaluateTriage(payload: {
    staff_id: string;
    class_id: string;
    student_id?: string | null;
    observation_period?: {
      start_date: string;
      end_date: string;
    };
    attendance_threshold?: {
      absence_threshold_count: number;
      window_days?: number;
    };
  }): Promise<TriageResponse> {
    return this.request<TriageResponse>('/triage-evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 3. Overview Metrics
  async getOverview(): Promise<{
    status: string;
    metrics: OverviewMetrics;
    proposals: SupportProposal[];
    actions: SupportAction[];
    exceptions: any[];
  }> {
    return this.request('/overview', { method: 'GET' });
  }

  // 4. Attendance Trends
  async getTrends(params?: {
    class_id?: string;
    student_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    status: string;
    timeline: TrendTimelineItem[];
    students: TrendStudentItem[];
    filters_applied: any;
  }> {
    const q = new URLSearchParams();
    if (params?.class_id) q.set('class_id', params.class_id);
    if (params?.student_id) q.set('student_id', params.student_id);
    if (params?.start_date) q.set('start_date', params.start_date);
    if (params?.end_date) q.set('end_date', params.end_date);

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/trends${queryStr}`, { method: 'GET' });
  }

  // 5. Evidence View Records
  async getEvidence(params?: {
    student_id?: string;
    class_id?: string;
  }): Promise<{
    status: string;
    evidence: EvidenceRecordItem[];
  }> {
    const q = new URLSearchParams();
    if (params?.student_id) q.set('student_id', params.student_id);
    if (params?.class_id) q.set('class_id', params.class_id);
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/evidence${queryStr}`, { method: 'GET' });
  }

  // 6. Review Action (Counselor Approve or Reject)
  async submitReviewAction(payload: {
    proposal_id: string;
    action: 'approve' | 'dismiss';
    notes: string;
    scheduled_date?: string;
    actor_id?: string;
    actor_name?: string;
  }): Promise<{
    status: string;
    message: string;
    proposal: any;
    action?: any;
  }> {
    return this.request('/review-action', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 7. Closed-Loop Verification
  async verifyAction(payload: {
    review_id?: string;
    verifier_id?: string;
  }): Promise<{
    status: string;
    message: string;
    verified_actions: any[];
  }> {
    return this.request('/verify-action', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 8. Immutable Audit Logs
  async getAuditLogs(): Promise<{
    status: string;
    logs: AuditLogEntry[];
  }> {
    return this.request('/audit-logs', { method: 'GET' });
  }

  // 9. Safety Manifest
  async getSafetyManifest(): Promise<{
    status: string;
    safety_commitments: SafetyCommitment[];
  }> {
    return this.request('/safety-manifest', { method: 'GET' });
  }
}

export const n8nApi = new N8nApiService();
