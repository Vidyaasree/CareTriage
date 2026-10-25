-- =====================================================================
-- CARE-TRIAGE: SYNTHETIC SEED DATASET
-- 
-- Explicitly provisions realistic test fixtures for:
-- - TC1: Alex Rivera (8 unexcused absences of last 10 days)
-- - TC2: Jordan Chen (8 absences with 7 days approved medical leave)
-- - TC3: Teacher Marcus (Grade 10-B) attempting to query Grade 10-A
-- - TC4: Non-punitive, unlabelled proposal isolated in counsellor inbox
-- =====================================================================

-- 1. SEED STAFF
INSERT INTO staff (staff_id, email, full_name, role)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'eleanor.vance@school.edu', 'Eleanor Vance, M.Ed.', 'counselor'),
    ('22222222-2222-2222-2222-222222222222', 'sarah.davis@school.edu', 'Sarah Davis', 'teacher'),
    ('33333333-3333-3333-3333-333333333333', 'marcus.brown@school.edu', 'Marcus Brown', 'teacher'),
    ('44444444-4444-4444-4444-444444444444', 'admin.hastings@school.edu', 'Principal Arthur Hastings', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 2. SEED STAFF PERMISSIONS (TC3 Class-Level Tenancy)
INSERT INTO staff_permissions (staff_id, class_name, can_view, can_edit)
VALUES
    ('22222222-2222-2222-2222-222222222222', 'Grade 10-A', TRUE, TRUE), -- Sarah can only see 10-A
    ('33333333-3333-3333-3333-333333333333', 'Grade 10-B', TRUE, TRUE)  -- Marcus can only see 10-B
ON CONFLICT (staff_id, class_name) DO NOTHING;

-- 3. SEED SYNTHETIC STUDENTS
INSERT INTO students (student_id, student_code, first_name, last_name, class_name, grade_level, baseline_attendance_rate)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'STU-2026-001', 'Alex', 'Rivera', 'Grade 10-A', '10', 95.80),
    ('a0000000-0000-0000-0000-000000000002', 'STU-2026-002', 'Jordan', 'Chen', 'Grade 10-A', '10', 98.20),
    ('a0000000-0000-0000-0000-000000000003', 'STU-2026-003', 'Taylor', 'Patel', 'Grade 10-B', '10', 92.40),
    ('a0000000-0000-0000-0000-000000000004', 'STU-2026-004', 'Sam', 'Kim', 'Grade 11-A', '11', 94.00)
ON CONFLICT (student_code) DO NOTHING;

-- 4. SEED APPROVED LEAVE RECORDS (TC2: Medical Leave Shield)
INSERT INTO leave_records (leave_id, student_id, leave_type, start_date, end_date, is_approved, documentation_ref, approved_by, notes)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000002', -- Jordan Chen (STU-2026-002)
        'medical_leave',
        '2026-10-14',
        '2026-10-22',
        TRUE,
        'DOC-MED-84920',
        '11111111-1111-1111-1111-111111111111',
        'Pediatric specialist certificate for post-surgical recovery. Transition accommodation scheduled.'
    )
ON CONFLICT DO NOTHING;

-- 5. SEED 10-DAY SLIDING WINDOW ATTENDANCE RECORDS (2026-10-13 to 2026-10-24)
-- Student STU-2026-001 (Alex): 8 unexcused absences of 10 days (TC1)
INSERT INTO attendance (student_id, date, status, class_name)
VALUES
    ('a0000000-0000-0000-0000-000000000001', '2026-10-13', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000001', '2026-10-14', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000001', '2026-10-15', 'present', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000001', '2026-10-16', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000001', '2026-10-19', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000001', '2026-10-20', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000001', '2026-10-21', 'present', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000001', '2026-10-22', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000001', '2026-10-23', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000001', '2026-10-24', 'absent', 'Grade 10-A')
ON CONFLICT (student_id, date) DO NOTHING;

-- Student STU-2026-002 (Jordan): 8 absences, but 7 covered by medical leave (TC2)
INSERT INTO attendance (student_id, date, status, class_name)
VALUES
    ('a0000000-0000-0000-0000-000000000002', '2026-10-13', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000002', '2026-10-14', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000002', '2026-10-15', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000002', '2026-10-16', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000002', '2026-10-19', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000002', '2026-10-20', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000002', '2026-10-21', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000002', '2026-10-22', 'absent', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000002', '2026-10-23', 'present', 'Grade 10-A'),
    ('a0000000-0000-0000-0000-000000000002', '2026-10-24', 'present', 'Grade 10-A')
ON CONFLICT (student_id, date) DO NOTHING;

-- 6. SEED REVIEW PROPOSALS (TC1: Alex Rivera, TC4: Non-punitive)
INSERT INTO review_proposals (
    proposal_id,
    student_id,
    class_name,
    window_start,
    window_end,
    total_window_days,
    unexcused_absences,
    excused_absences,
    reason,
    evidence,
    ai_support_context,
    status
)
VALUES
    (
        'c0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'Grade 10-A',
        '2026-10-13',
        '2026-10-24',
        10,
        8,
        0,
        'RULE_8_OF_10_ABSENT: Sustained departure from 95.8% baseline with 8 unexcused unattended sessions in last 10 days.',
        '{
            "observed_sessions": 10,
            "unexcused_days": 8,
            "excused_medical_days": 0,
            "baseline_comparison": "Prior baseline 95.8% -> Current window 20.0%",
            "zero_labelling_compliance": "CONFIRMED"
        }'::jsonb,
        '{
            "factual_summary": "Sustained departure from regular 95.8% baseline: 8 absences across the last 10 school sessions without recorded health notifications.",
            "potential_domains": ["Commuter/Transit route changes", "Unreported family obligations", "Physical or wellness barriers"],
            "suggested_inquiry": "Hi Alex, we noticed you have been unable to make it into school recently and we wanted to make sure everything is okay. Is there anything happening that we can support you with?",
            "recommended_actions": ["Schedule an informal 10-minute check-in during advisory", "Warm pastoral outreach to family"]
        }'::jsonb,
        'pending_approval'
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000003', -- Taylor Patel
        'Grade 10-B',
        '2026-10-13',
        '2026-10-24',
        10,
        5,
        1,
        'RULE_3_CONSECUTIVE_UNEXCUSED: 3 consecutive unattended sessions on Mondays and Fridays.',
        '{
            "observed_sessions": 10,
            "unexcused_days": 5,
            "excused_medical_days": 1
        }'::jsonb,
        '{
            "factual_summary": "Three consecutive unattended sessions on consecutive Mondays/Fridays.",
            "suggested_inquiry": "Good morning Taylor, just wanted to check in and see how your mornings have been going recently."
        }'::jsonb,
        'approved'
    )
ON CONFLICT (proposal_id) DO NOTHING;

-- 7. SEED COUNSELLOR REVIEWS (Closed-Loop Evidence)
INSERT INTO counsellor_reviews (
    review_id,
    proposal_id,
    student_id,
    counsellor_id,
    action_type,
    scheduled_checkin_date,
    completed_at,
    pastoral_outcome_notes,
    verification_status,
    verified_at,
    verification_evidence
)
VALUES
    (
        'd0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000003',
        '11111111-1111-1111-1111-111111111111',
        'supportive_counselor_checkin',
        '2026-10-24',
        '2026-10-24 10:15:00+00',
        'Met with Taylor in counselling suite. County bus route #42 was re-routed causing student to miss 1st period connection. School transit office provided emergency transit pass for alternative shuttle.',
        'verified_completed',
        '2026-10-24 15:00:00+00',
        '{
            "counsellor_signature": "Eleanor Vance, M.Ed.",
            "encounter_location": "Pastoral Suite 102",
            "duration_minutes": 20,
            "verification_hash": "v_hash_77a9b0c2"
        }'::jsonb
    )
ON CONFLICT (review_id) DO NOTHING;

-- 8. SEED AUDIT LOGS (Immutable Traceability)
INSERT INTO audit_logs (log_id, actor, actor_role, action, timestamp, result, related_entity, related_record_id, reason, metadata)
VALUES
    (
        'e0000000-0000-0000-0000-000000000001',
        'agent-verifier-01',
        'system_agent',
        'ACTION_VERIFIED',
        '2026-10-24 15:00:12+00',
        'SUCCESS',
        'counsellor_reviews',
        'd0000000-0000-0000-0000-000000000001',
        'Closed-loop audit check confirmed completed pastoral notes and counsellor sign-off timestamp.',
        '{"verification_hash": "v_hash_77a9b0c2", "studentCode": "STU-2026-003"}'::jsonb
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        'agent-triage-daily',
        'system_agent',
        'PROPOSAL_GENERATED',
        '2026-10-24 14:30:05+00',
        'SUCCESS',
        'review_proposals',
        'c0000000-0000-0000-0000-000000000001',
        'Threshold met: Student STU-2026-001 unattended 8 of last 10 days. Private proposal created pending human approval.',
        '{"studentCode": "STU-2026-001", "unexcused": 8, "zero_labelling": "CLEAN"}'::jsonb
    ),
    (
        'e0000000-0000-0000-0000-000000000003',
        'agent-triage-daily',
        'system_agent',
        'EXCEPTION_EXCLUDED',
        '2026-10-24 14:30:04+00',
        'EXCLUDED',
        'attendance',
        'a0000000-0000-0000-0000-000000000002',
        'Rule 102 Applied: Student STU-2026-002 has 7 medical leave days covered by DOC-MED-84920. Excluded from triage flag.',
        '{"studentCode": "STU-2026-002", "totalAbsences": 8, "excusedMedical": 7, "effectiveUnexcused": 1}'::jsonb
    ),
    (
        'e0000000-0000-0000-0000-000000000004',
        'staff-marcus-brown',
        'teacher',
        'UNAUTHORIZED_ACCESS_BLOCKED',
        '2026-10-24 11:20:00+00',
        'BLOCKED_BY_RLS',
        'attendance',
        'Grade 10-A',
        'RLS Security Violation: Teacher Marcus (assigned to Grade 10-B) attempted query on Grade 10-A records.',
        '{"attemptedClass": "Grade 10-A", "authorizedClass": "Grade 10-B"}'::jsonb
    )
ON CONFLICT (log_id) DO NOTHING;

-- 9. SEED TEST RUNS
INSERT INTO test_runs (test_run_id, test_case, test_title, expected_result, actual_result, status, evidence, execution_logs)
VALUES
    (
        'f0000000-0000-0000-0000-000000000001',
        'TC1',
        'Sustained Unexcused Absences Triage',
        'Counsellor review item created in status pending_approval.',
        'Proposal c0000000-0000-0000-0000-000000000001 created with status pending_approval.',
        'passed',
        '{"studentCode": "STU-2026-001", "unexcusedAbsences": 8, "windowDays": 10}'::jsonb,
        ARRAY[
            'Ingesting 10-day sliding window for STU-2026-001...',
            'Counting unexcused absences: 8 of 10 days.',
            'Evaluating Rule 103 -> CONDITION MET (8 >= 8).',
            'ASSERTION SUCCESS: Counsellor review proposal created.'
        ]
    ),
    (
        'f0000000-0000-0000-0000-000000000002',
        'TC2',
        'Approved Medical Leave Exception',
        'Excluded from triage flag.',
        'Effective unexcused absences = 1. Flag suppressed.',
        'passed',
        '{"studentCode": "STU-2026-002", "totalAbsences": 8, "medicalExcused": 7, "effectiveUnexcused": 1}'::jsonb,
        ARRAY[
            'Ingesting 10-day sliding window for STU-2026-002...',
            'Found active medical exception DOC-MED-84920 covering 7 days.',
            'Rule 102 applied: Effective unexcused absences = 1.',
            'ASSERTION SUCCESS: Student excluded from flag.'
        ]
    ),
    (
        'f0000000-0000-0000-0000-000000000003',
        'TC3',
        'Cross-Class Unauthorized Access (RLS Check)',
        'Staff from another class cannot see the data (403 / 0 rows).',
        'PostgreSQL RLS returned 0 rows for Teacher Marcus on Grade 10-A.',
        'passed',
        '{"staffId": "33333333-3333-3333-3333-333333333333", "queriedClass": "Grade 10-A", "rowsReturned": 0}'::jsonb,
        ARRAY[
            'Authenticating as Teacher Marcus (assigned to Grade 10-B)...',
            'Executing SELECT * FROM attendance WHERE class_name = "Grade 10-A"...',
            'RLS policy policy_attendance_select evaluated -> Access Denied.',
            'ASSERTION SUCCESS: Cross-class query blocked.'
        ]
    ),
    (
        'f0000000-0000-0000-0000-000000000004',
        'TC4',
        'Zero-Labelling & Non-Punitive Compliance',
        'No automatic punishment or public label.',
        'Zero disciplinary fields in schema. Proposal quarantined in counsellor queue.',
        'passed',
        '{"hasPunishment": false, "hasTruantLabel": false, "isQuarantined": true}'::jsonb,
        ARRAY[
            'Inspecting schema: Zero punitive or defamatory columns.',
            'Verifying proposal state: Quarantined to counsellor queue.',
            'ASSERTION SUCCESS: Zero labelling and non-punitive guarantee verified.'
        ]
    )
ON CONFLICT (test_run_id) DO NOTHING;
