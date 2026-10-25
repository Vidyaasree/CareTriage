import { n8nBackend } from './n8n_engine.js';

console.log('==========================================================');
console.log('CareTriage Comprehensive n8n Backend Validation Suite');
console.log('==========================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(description, condition, extraInfo = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${description}`);
  } else {
    console.error(`[FAIL] ${description} ${extraInfo}`);
  }
}

// 1. Feature 1: Overview Metrics
console.log('>>> Testing Feature 1: Overview Metrics');
const overview = n8nBackend.getOverview();
assert('Overview responds with HTTP 200', overview.status === 200);
assert('Overview contains students_monitored (30)', overview.body.metrics.students_monitored === 30);
assert('Overview contains attendance_patterns_detected (>= 1)', overview.body.metrics.attendance_patterns_detected >= 1);
assert('Overview contains pending_human_approvals', typeof overview.body.metrics.pending_human_approvals === 'number');
assert('Overview contains excluded_cases (>= 1)', overview.body.metrics.excluded_cases >= 1);
assert('Overview contains verified_actions (>= 1)', overview.body.metrics.verified_actions >= 1);

// 2. Feature 2: Attendance Trends
console.log('\n>>> Testing Feature 2: Attendance Trends');
const trends = n8nBackend.getTrends({ class_id: '10A', start_date: '2026-10-12', end_date: '2026-10-23' });
assert('Trends responds with HTTP 200', trends.status === 200);
assert('Trends contains daily timeline records', Array.isArray(trends.body.timeline) && trends.body.timeline.length > 0);
assert('Trends contains student pattern classifications', Array.isArray(trends.body.students) && trends.body.students.length === 10);
const hasNormal = trends.body.students.some(s => s.pattern_classification === 'normal');
const hasShielded = trends.body.students.some(s => s.pattern_classification === 'medical_shielded');
const hasReview = trends.body.students.some(s => s.pattern_classification === 'review_recommended');
assert('Distinguishes normal patterns', hasNormal);
assert('Distinguishes medical shielded patterns (TC2)', hasShielded);
assert('Distinguishes review recommended patterns (TC1)', hasReview);

// 3. Feature 3: Review Queue
console.log('\n>>> Testing Feature 3: Review Queue Controls');
const reviewRes = n8nBackend.submitReviewAction({
  proposal_id: 'c0000000-0000-0000-0000-000000000001',
  action: 'approve',
  notes: 'Advisory 10-minute check-in scheduled',
  scheduled_date: '2026-10-27',
  actor_id: '11111111-1111-1111-1111-111111111111',
  actor_name: 'Eleanor Vance, M.Ed.'
});
assert('Approve review action returns HTTP 200', reviewRes.status === 200);
assert('Proposal status updated to approved', reviewRes.body.proposal.status === 'approved');
assert('Pastoral action created with awaiting_encounter', reviewRes.body.action.verification_status === 'awaiting_encounter');

// 4. Feature 4: Evidence View
console.log('\n>>> Testing Feature 4: Evidence View Attributes');
const evidence = n8nBackend.getEvidence({ class_id: '10A' });
assert('Evidence responds with HTTP 200', evidence.status === 200);
const firstItem = evidence.body.evidence[0];
assert('Evidence contains student_id', !!firstItem.student_id);
assert('Evidence contains attendance_records list', Array.isArray(firstItem.attendance_records) && firstItem.attendance_records.length === 10);
assert('Evidence contains dates range', !!firstItem.dates.start_date && !!firstItem.dates.end_date);
assert('Evidence contains threshold count', !!firstItem.threshold);
assert('Evidence contains leave_status', !!firstItem.leave_status);
assert('Evidence contains decision_reason', !!firstItem.decision_reason);
assert('Evidence contains source_id', !!firstItem.source_id);
assert('Evidence contains retrieval_timestamp', !!firstItem.retrieval_timestamp);

// 5. Feature 5: Test Lab (TC1, TC2, TC3, TC4)
console.log('\n>>> Testing Feature 5: Test Lab (TC1 - TC4)');

// TC1: Sustained Unexcused Absences
const tc1 = n8nBackend.evaluateTriage({
  staff_id: '22222222-2222-2222-2222-222222222222',
  class_id: '10A',
  student_id: 'a0000000-0000-0000-0000-000000000001',
  observation_period: { start_date: '2026-10-12', end_date: '2026-10-23' },
  attendance_threshold: { absence_threshold_count: 8, window_days: 10 }
});
assert('TC1 returns HTTP 200 OK', tc1.status === 200);
assert('TC1 triggers flag_raised: true', tc1.body.triage_results[0].triage_evaluation.flag_raised === true);
assert('TC1 recommends review proposal', tc1.body.triage_results[0].triage_evaluation.recommended_action === 'create_private_counsellor_review_proposal');

// TC2: Approved Medical Leave Shield
const tc2 = n8nBackend.evaluateTriage({
  staff_id: '22222222-2222-2222-2222-222222222222',
  class_id: '10A',
  student_id: 'a0000000-0000-0000-0000-000000000002',
  observation_period: { start_date: '2026-10-12', end_date: '2026-10-23' },
  attendance_threshold: { absence_threshold_count: 8, window_days: 10 }
});
assert('TC2 returns HTTP 200 OK', tc2.status === 200);
assert('TC2 shields student (flag_raised: false)', tc2.body.triage_results[0].triage_evaluation.flag_raised === false);
assert('TC2 is_medical_shielded: true', tc2.body.triage_results[0].triage_evaluation.is_medical_shielded === true);

// TC3: Cross-Class Unauthorized Staff
const tc3 = n8nBackend.evaluateTriage({
  staff_id: '22222222-2222-2222-2222-222222222222', // Teacher Sarah (10A only)
  class_id: '10B', // Target class 10B
  observation_period: { start_date: '2026-10-12', end_date: '2026-10-23' }
});
assert('TC3 returns HTTP 403 Forbidden', tc3.status === 403);
assert('TC3 error code is UNAUTHORIZED_STAFF', tc3.body.code === 'UNAUTHORIZED_STAFF');

// TC4: Zero-Labelling & Non-Punitive Compliance
const tc4 = n8nBackend.evaluateTriage({
  staff_id: '11111111-1111-1111-1111-111111111111',
  class_id: '10A',
  observation_period: { start_date: '2026-10-12', end_date: '2026-10-23' }
});
assert('TC4 returns HTTP 200 OK', tc4.status === 200);
const allZeroLabelled = tc4.body.triage_results.every(r => r.ethical_compliance.zero_labelling_verified === true);
const allNonPunitive = tc4.body.triage_results.every(r => r.ethical_compliance.punitive_action === 'NONE');
const allQuarantined = tc4.body.triage_results.every(r => r.ethical_compliance.privacy_quarantine === 'counselor_only');
assert('TC4 zero public student labelling verified', allZeroLabelled);
assert('TC4 zero automatic punishment verified', allNonPunitive);
assert('TC4 counselor-only quarantine verified', allQuarantined);

// 6. Feature 6: Audit Log
console.log('\n>>> Testing Feature 6: Audit Log');
const auditRes = n8nBackend.getAuditLogs();
assert('Audit log responds with HTTP 200', auditRes.status === 200);
assert('Audit log contains chronological entries', Array.isArray(auditRes.body.logs) && auditRes.body.logs.length > 0);
const sampleLog = auditRes.body.logs[0];
assert('Log contains event/id', !!(sampleLog.log_id || sampleLog.id));
assert('Log contains actor', !!(sampleLog.actor || sampleLog.actorId));
assert('Log contains timestamp', !!sampleLog.timestamp);
assert('Log contains action', !!sampleLog.action);
assert('Log contains result', !!(sampleLog.result || sampleLog.metadata?.result));

// 7. Feature 7: Safety Panel Manifest
console.log('\n>>> Testing Feature 7: Safety Panel Manifest');
const safetyRes = n8nBackend.getSafetyManifest();
assert('Safety manifest responds with HTTP 200', safetyRes.status === 200);
assert('Safety manifest contains 5 commitments', safetyRes.body.safety_commitments.length === 5);

const titles = safetyRes.body.safety_commitments.map(c => c.title.toLowerCase());
assert('Manifest includes: No public student labelling', titles.some(t => t.includes('public student labelling')));
assert('Manifest includes: No automatic punishment', titles.some(t => t.includes('automatic punishment')));
assert('Manifest includes: Approved leave respected', titles.some(t => t.includes('approved leave respected')));
assert('Manifest includes: Staff authorization enforced', titles.some(t => t.includes('staff authorization enforced')));
assert('Manifest includes: Human approval required', titles.some(t => t.includes('human approval required')));

// 8. New Feature: Manual Student Evaluation & API Contract Validation
console.log('\n>>> Testing New Feature: Manual Student Evaluation & API Contract');
const manualEval = n8nBackend.evaluateTriage({
  staff_id: '11111111-1111-1111-1111-111111111111',
  class_id: '10A',
  student_id: 'a0000000-0000-0000-0000-000000000001',
  observation_period: {
    start_date: '2026-10-12',
    end_date: '2026-10-23'
  },
  attendance_threshold: {
    absence_threshold_count: 8,
    window_days: 10
  }
});
assert('Manual evaluation returns HTTP 200', manualEval.status === 200);
assert('Observation period includes window_days (10)', manualEval.body.request_scope.observation_period.window_days === 10);
assert('Absence threshold count is 8', manualEval.body.request_scope.absence_threshold === 8);
assert('Returns target student result', manualEval.body.triage_results.length === 1);

// Unknown student validation (404)
const unknownStudentEval = n8nBackend.evaluateTriage({
  staff_id: '11111111-1111-1111-1111-111111111111',
  class_id: '10A',
  student_id: 'a9999999-9999-9999-9999-999999999999',
  observation_period: { start_date: '2026-10-12', end_date: '2026-10-23' }
});
assert('Unknown student returns HTTP 404', unknownStudentEval.status === 404);
assert('Error code is UNKNOWN_STUDENT', unknownStudentEval.body.code === 'UNKNOWN_STUDENT');

// Inverted dates validation (400)
const invalidDatesEval = n8nBackend.evaluateTriage({
  staff_id: '11111111-1111-1111-1111-111111111111',
  class_id: '10A',
  observation_period: { start_date: '2026-10-25', end_date: '2026-10-12' }
});
assert('Inverted dates return HTTP 400', invalidDatesEval.status === 400);
assert('Error code is INVALID_DATES', invalidDatesEval.body.code === 'INVALID_DATES');

// 9. New Feature: Visible AI Explanation Structure & Non-Hallucination
console.log('\n>>> Testing New Feature: AI Explanation Schema & Ethical Guardrails');
const alexResult = manualEval.body.triage_results[0];
assert('AI explanation object exists', !!alexResult.ai_explanation);
assert('AI explanation contains explanation text', typeof alexResult.ai_explanation.explanation === 'string' && alexResult.ai_explanation.explanation.length > 20);
assert('AI explanation contains factual evidence_used', !!alexResult.ai_explanation.evidence_used);
assert('Evidence reflects 8 unexcused absences', alexResult.ai_explanation.evidence_used.unexcused_absences === 8);
assert('AI explanation documents uncertainty without guessing causes', alexResult.ai_explanation.uncertainty_or_missing_info.includes('Underlying causes'));
assert('AI explanation provides supportive pastoral next step', alexResult.ai_explanation.suggested_supportive_next_step.includes('supportive check-in'));
assert('AI explanation is quarantined as private to staff', alexResult.ai_explanation.is_private === true);

// Medical shield AI explanation test
const jordanEval = n8nBackend.evaluateTriage({
  staff_id: '11111111-1111-1111-1111-111111111111',
  class_id: '10A',
  student_id: 'a0000000-0000-0000-0000-000000000002',
  observation_period: { start_date: '2026-10-12', end_date: '2026-10-23' },
  attendance_threshold: { absence_threshold_count: 8, window_days: 10 }
});
const jordanResult = jordanEval.body.triage_results[0];
assert('Medical shield explanation explicitly references medical leave', jordanResult.ai_explanation.explanation.includes('medical'));
assert('Evidence captures 7 excused medical sessions', jordanResult.ai_explanation.evidence_used.excused_medical_absences === 7);

// 10. New Feature: Backend Enforcement of Human Approval (HITL)
console.log('\n>>> Testing New Feature: Backend Enforcement of Human Approval');
const proposalId = alexResult.triage_evaluation.proposal_id;
assert('Proposal ID generated for flagged student', !!proposalId);

// 10A: Unauthorized teacher attempts to approve -> Backend MUST reject with 403
const teacherApprovalAttempt = n8nBackend.submitReviewAction({
  proposal_id: proposalId,
  action: 'approve',
  notes: 'Teacher attempting unauthorized approval',
  scheduled_date: '2026-10-26',
  actor_id: '22222222-2222-2222-2222-222222222222' // Sarah Davis (Teacher)
});
assert('Backend rejects teacher approval with HTTP 403', teacherApprovalAttempt.status === 403);
assert('Error code is UNAUTHORIZED_REVIEWER', teacherApprovalAttempt.body.code === 'UNAUTHORIZED_REVIEWER');

// 10B: Authorized counselor approves -> Backend succeeds with HTTP 200
const counselorApproval = n8nBackend.submitReviewAction({
  proposal_id: proposalId,
  action: 'approve',
  notes: 'Conduct 10-minute check-in during advisory period',
  scheduled_date: '2026-10-26',
  actor_id: '11111111-1111-1111-1111-111111111111', // Eleanor Vance (Counselor)
  actor_name: 'Eleanor Vance, M.Ed.'
});
assert('Backend allows counselor approval with HTTP 200', counselorApproval.status === 200);
assert('Proposal status updated to approved in backend', counselorApproval.body.proposal.status === 'approved');
assert('Pastoral outreach action scheduled with Eleanor Vance', counselorApproval.body.action.counsellor_id === '11111111-1111-1111-1111-111111111111');

console.log('\n==========================================================');
console.log(`Results: ${passedTests} / ${totalTests} assertions PASSED!`);
console.log('==========================================================');
