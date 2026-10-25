export type UserRole = 'counselor' | 'teacher' | 'admin';

export type DataOrigin = 'synthetic' | 'live_api';

export type NavSection =
  | 'dashboard'
  | 'evaluate'
  | 'trends'
  | 'review-queue'
  | 'evidence'
  | 'test-lab'
  | 'audit-log'
  | 'safety'
  | 'settings';

export interface Student {
  id: string;
  studentCode: string; // e.g. STU-2026-001 (Zero labelling)
  firstName: string;
  lastName: string;
  gradeLevel: string;
  classSectionId: string;
  className: string; // e.g. "Grade 10-A"
  baselineAttendanceRate: number; // e.g. 96.5% prior average
  isCurrentlyEnrolled: boolean;
}

export type AttendanceStatus = 'present' | 'absent' | 'tardy' | 'half_day';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  isExcused: boolean;
  exceptionType?: 'medical_leave' | 'bereavement' | 'school_activity' | 'family_emergency';
  recordedByTeacherId?: string;
  classSectionId: string;
}

export interface ApprovedException {
  id: string;
  studentId: string;
  studentCode: string;
  startDate: string;
  endDate: string;
  type: 'medical_leave' | 'bereavement' | 'school_activity' | 'family_emergency';
  status: 'approved' | 'pending' | 'rejected';
  documentationRef: string;
  approvedBy: string;
  notes: string;
  createdAt: string;
}

export type ProposalStatus =
  | 'pending_approval' // Waiting for human counselor review
  | 'approved'         // Human counselor signed off on supportive outreach
  | 'dismissed'        // Human counselor reviewed and decided no action needed (with recorded reason)
  | 'action_executed'  // Outreach was performed
  | 'verified_completed'; // Closed-loop verification confirmed evidence

export interface SupportProposal {
  id: string;
  studentId: string;
  studentCode: string;
  className: string;
  classSectionId: string;
  triggeredAt: string;
  windowDays: number;
  unexcusedAbsences: number;
  excusedAbsences: number;
  triggerRule: string; // e.g. "RULE_8_OF_10_ABSENT"
  // AI Supportive Reasoning
  aiReasoning: {
    isSyntheticSample: boolean;
    factualPatternSummary: string;
    potentialSupportDomains: string[];
    suggestedInquiryQuestion: string;
    recommendedActions: string[];
  };
  status: ProposalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  counselorDecisionNotes?: string;
  dismissalReason?: string;
  dataOrigin: DataOrigin;
}

export interface SupportAction {
  id: string;
  proposalId: string;
  studentCode: string;
  className: string;
  actionType: 'supportive_counselor_checkin' | 'pastoral_family_outreach' | 'academic_catchup_plan';
  assignedCounselorName: string;
  scheduledDate: string;
  completedAt?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  pastoralNotes?: string;
  verificationStatus: 'verified_completed' | 'awaiting_encounter' | 'overdue_unverified';
  verifiedAt?: string;
  dataOrigin: DataOrigin;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole | 'system_agent';
  action:
    | 'EVALUATION_CYCLE_RUN'
    | 'PROPOSAL_GENERATED'
    | 'EXCEPTION_EXCLUDED'
    | 'COUNSELOR_APPROVED'
    | 'COUNSELOR_DISMISSED'
    | 'ACTION_SCHEDULED'
    | 'ACTION_COMPLETED'
    | 'ACTION_VERIFIED'
    | 'UNAUTHORIZED_ACCESS_BLOCKED';
  targetEntity: string;
  targetId: string;
  reason: string;
  metadata: Record<string, unknown>;
  dataOrigin: DataOrigin;
}

export interface TriageConfig {
  slidingWindowDays: number;
  absenceThresholdCount: number;
  consecutiveAbsenceThreshold: number;
  rateDropPercentage: number;
  n8nWebhookUrl: string;
  supabaseUrl: string;
  supabaseConfigured: boolean;
  geminiConfigured: boolean;
  n8nConfigured: boolean;
}

export interface TestCaseRunner {
  id: string;
  code: 'TC1' | 'TC2' | 'TC3' | 'TC4';
  title: string;
  description: string;
  expectedOutcome: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  actualOutcome?: string;
  logs: string[];
  executedAt?: string;
  inputPayload?: Record<string, unknown>;
  rawResponse?: Record<string, unknown>;
  httpStatus?: number;
  latencyMs?: number;
}

// -------------------------------------------------------------
// Real n8n API Data Types
// -------------------------------------------------------------

export interface TriageTelemetry {
  total_sessions_evaluated: number;
  present_count: number;
  tardy_count: number;
  unexcused_absences: number;
  excused_medical_absences: number;
  effective_attendance_rate_pct: number;
  covered_leave_refs?: string[];
}

export interface AIExplanation {
  explanation: string;
  evidence_used: {
    student_id?: string;
    student_code?: string;
    class_name?: string;
    observation_window?: string;
    window_days_evaluated?: number;
    total_sessions_evaluated?: number;
    present_count?: number;
    unexcused_absences?: number;
    excused_medical_absences?: number;
    effective_attendance_rate_pct?: number;
    threshold_evaluated?: string;
    applicable_medical_exceptions?: string[];
    prior_baseline_rate_pct?: number;
    [key: string]: any;
  } | string[];
  uncertainty_or_missing_info: string;
  suggested_supportive_next_step: string;
  is_private: boolean;
  generated_by: string;
  timestamp: string;
}

export interface TriageEvaluationDetails {
  threshold_tested: string;
  flag_raised: boolean;
  is_medical_shielded: boolean;
  decision_reason: string;
  recommended_action: string;
  proposal_id?: string | null;
  proposal_status?: string | null;
}

export interface TriageResultItem {
  student_id: string;
  student_code: string;
  first_name?: string;
  last_name?: string;
  class_name: string;
  telemetry: TriageTelemetry;
  triage_evaluation: TriageEvaluationDetails;
  ai_explanation?: AIExplanation;
  ethical_compliance: {
    zero_labelling_verified: boolean;
    punitive_action: string;
    public_flag: boolean;
    privacy_quarantine: string;
  };
  records?: Array<{
    attendance_id: string;
    date: string;
    status: AttendanceStatus;
    is_excused: boolean;
    leave_ref: string | null;
  }>;
}

export interface TriageResponse {
  status: string;
  timestamp: string;
  request_scope: {
    evaluated_by_staff: string;
    staff_role: string;
    class_id: string;
    observation_period: {
      start_date: string;
      end_date: string;
      window_days?: number;
    };
    absence_threshold: number;
  };
  summary_metrics: {
    students_evaluated: number;
    support_proposals_warranted: number;
    medical_exceptions_shielded: number;
  };
  triage_results: TriageResultItem[];
}

export interface OverviewMetrics {
  students_monitored: number;
  attendance_patterns_detected: number;
  pending_human_approvals: number;
  excluded_cases: number;
  verified_actions: number;
  school_baseline_rate: number;
}

export interface EvidenceRecordItem {
  student_id: string;
  student_code: string;
  full_name: string;
  class_name: string;
  attendance_records: Array<{
    attendance_id: string;
    date: string;
    status: AttendanceStatus;
    is_excused: boolean;
    leave_ref: string | null;
  }>;
  dates: {
    start_date: string;
    end_date: string;
    window_days: number;
  };
  threshold: string;
  leave_status: string;
  decision_reason: string;
  pattern_status: 'Normal' | 'Medical Shielded' | 'Review Recommended';
  source_id: string;
  retrieval_timestamp: string;
}

export interface TrendTimelineItem {
  date: string;
  total: number;
  present: number;
  absent: number;
  tardy: number;
  medical_excused: number;
}

export interface TrendStudentItem {
  student_id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  class_name: string;
  baseline_rate: number;
  evaluated_sessions: number;
  present_count: number;
  unexcused_absences: number;
  medical_absences: number;
  effective_rate: number;
  pattern_classification: 'normal' | 'medical_shielded' | 'review_recommended';
}

export interface SafetyCommitment {
  id: string;
  title: string;
  description: string;
  status: string;
  rule: string;
  technical_enforcement: string;
}
