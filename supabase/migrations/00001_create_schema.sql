-- =====================================================================
-- CARE-TRIAGE: SCHOOL ATTENDANCE SUPPORT TRIAGE PLATFORM
-- DATABASE SCHEMA MIGRATION (SUPABASE / POSTGRESQL)
-- 
-- Strictly enforces:
-- 1. Stable UUID Primary Keys for all entities
-- 2. Zero-labelling & non-punitive structure
-- 3. Row Level Security (RLS) based on staff_permissions
-- 4. Audit trail and closed-loop verification store
-- =====================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 1. ENUMS
-- =====================================================================
DO $$ BEGIN
    CREATE TYPE staff_role_type AS ENUM ('counselor', 'teacher', 'admin', 'support_lead');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status_type AS ENUM ('present', 'absent', 'tardy', 'half_day');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE leave_category_type AS ENUM ('medical_leave', 'bereavement', 'school_activity', 'family_emergency');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE proposal_status_type AS ENUM ('pending_approval', 'approved', 'dismissed', 'action_executed', 'verified_completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE review_action_type AS ENUM ('supportive_counselor_checkin', 'pastoral_family_outreach', 'academic_catchup_plan', 'dismissed_no_action');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE test_execution_status AS ENUM ('idle', 'running', 'passed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================================
-- 2. TABLE: staff
-- Stores faculty and staff role identities, linked to Supabase auth.users
-- =====================================================================
CREATE TABLE IF NOT EXISTS staff (
    staff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role staff_role_type NOT NULL DEFAULT 'teacher',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 3. TABLE: staff_permissions
-- Identifies which classes each staff member is authorized to access (TC3)
-- =====================================================================
CREATE TABLE IF NOT EXISTS staff_permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
    class_name TEXT NOT NULL, -- e.g. 'Grade 10-A', 'Grade 10-B'
    can_view BOOLEAN NOT NULL DEFAULT TRUE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(staff_id, class_name)
);

-- =====================================================================
-- 4. TABLE: students
-- Synthetic, non-identifying student records with stable student_id
-- No deficit tags or punitive fields permitted in this schema.
-- =====================================================================
CREATE TABLE IF NOT EXISTS students (
    student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_code TEXT NOT NULL UNIQUE, -- e.g. 'STU-2026-001' (neutral, unlabelled)
    first_name TEXT NOT NULL,          -- synthetic mock name
    last_name TEXT NOT NULL,           -- synthetic mock name
    class_name TEXT NOT NULL,          -- e.g. 'Grade 10-A'
    grade_level TEXT NOT NULL,         -- e.g. '10'
    baseline_attendance_rate NUMERIC(5,2) NOT NULL DEFAULT 95.00 CHECK (baseline_attendance_rate >= 0 AND baseline_attendance_rate <= 100),
    is_currently_enrolled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 5. TABLE: attendance
-- Granular daily roll-call logs with stable attendance_id
-- =====================================================================
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status_type NOT NULL,
    class_name TEXT NOT NULL, -- denormalized for efficient RLS class scoping
    recorded_by UUID REFERENCES staff(staff_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, date) -- exactly one attendance record per student per date
);

-- =====================================================================
-- 6. TABLE: leave_records
-- Approved medical leave, bereavement and exemptions (Rule 102 & TC2)
-- Absences during approved leave periods are excluded from triage flags.
-- =====================================================================
CREATE TABLE IF NOT EXISTS leave_records (
    leave_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    leave_type leave_category_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    documentation_ref TEXT NOT NULL, -- synthetic certificate reference (e.g. DOC-MED-84920)
    approved_by UUID REFERENCES staff(staff_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- =====================================================================
-- 7. TABLE: review_proposals
-- Private counsellor review items triggered by sustained pattern shifts
-- Quarantined strictly from classroom teachers to prevent bias (TC3, TC4)
-- =====================================================================
CREATE TABLE IF NOT EXISTS review_proposals (
    proposal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    window_start DATE NOT NULL,
    window_end DATE NOT NULL,
    total_window_days INT NOT NULL DEFAULT 10 CHECK (total_window_days > 0),
    unexcused_absences INT NOT NULL CHECK (unexcused_absences >= 0),
    excused_absences INT NOT NULL DEFAULT 0 CHECK (excused_absences >= 0),
    reason TEXT NOT NULL, -- Objective explanation of sustained pattern shift
    evidence JSONB NOT NULL, -- Telemetry snapshot: dates, session IDs, baseline comparison
    ai_support_context JSONB, -- Compassionate suggested inquiry questions from Gemini
    status proposal_status_type NOT NULL DEFAULT 'pending_approval',
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES staff(staff_id) ON DELETE SET NULL,
    dismissal_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 8. TABLE: counsellor_reviews
-- References the approved proposal and documents the human-executed care
-- Mandatory for closed-loop verification (Requirements 7, 8, 9)
-- =====================================================================
CREATE TABLE IF NOT EXISTS counsellor_reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES review_proposals(proposal_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    counsellor_id UUID NOT NULL REFERENCES staff(staff_id) ON DELETE RESTRICT,
    action_type review_action_type NOT NULL DEFAULT 'supportive_counselor_checkin',
    scheduled_checkin_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    pastoral_outcome_notes TEXT, -- Notes from the supportive conversation
    verification_status TEXT NOT NULL DEFAULT 'awaiting_encounter' CHECK (verification_status IN ('awaiting_encounter', 'verified_completed', 'overdue_unverified')),
    verified_at TIMESTAMPTZ,
    verification_evidence JSONB, -- Signature, check-in encounter metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 9. TABLE: audit_logs
-- Immutable compliance trail documenting all agent and human decisions
-- Append-only; no UPDATE or DELETE privileges granted.
-- =====================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor TEXT NOT NULL,         -- e.g. 'agent-triage-daily' or 'staff-counselor-vance'
    actor_role TEXT NOT NULL,    -- 'system_agent', 'counselor', 'admin', 'teacher'
    action TEXT NOT NULL,       -- 'PROPOSAL_GENERATED', 'EXCEPTION_EXCLUDED', 'COUNSELOR_APPROVED', etc.
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result TEXT NOT NULL,        -- 'SUCCESS', 'BLOCKED_BY_RLS', 'CONDITION_MET', 'EXCLUDED'
    related_entity TEXT NOT NULL,-- 'review_proposals', 'attendance', 'counsellor_reviews'
    related_record_id TEXT NOT NULL, -- ID of the targeted record
    reason TEXT NOT NULL,        -- Plain-language rationale for the decision
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- =====================================================================
-- 10. TABLE: test_runs
-- Stores automated test suite execution results for hackathon compliance
-- Directly evaluates TC1, TC2, TC3, and TC4
-- =====================================================================
CREATE TABLE IF NOT EXISTS test_runs (
    test_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case TEXT NOT NULL, -- 'TC1', 'TC2', 'TC3', 'TC4'
    test_title TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    actual_result TEXT,
    status test_execution_status NOT NULL DEFAULT 'idle',
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    execution_logs TEXT[] DEFAULT ARRAY[]::TEXT[],
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 11. INDEXES FOR PERFORMANCE & FAST RETRIEVAL
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_name ON attendance(class_name);
CREATE INDEX IF NOT EXISTS idx_leave_records_student_dates ON leave_records(student_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff ON staff_permissions(staff_id, class_name);
CREATE INDEX IF NOT EXISTS idx_review_proposals_student ON review_proposals(student_id);
CREATE INDEX IF NOT EXISTS idx_review_proposals_status ON review_proposals(status);
CREATE INDEX IF NOT EXISTS idx_counsellor_reviews_proposal ON counsellor_reviews(proposal_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- =====================================================================
-- 12. ROW-LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE counsellor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;

-- Helper function to lookup current staff member ID from authenticated user
CREATE OR REPLACE FUNCTION get_current_staff_id()
RETURNS UUID AS $$
    SELECT staff_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function to lookup current staff role
CREATE OR REPLACE FUNCTION get_current_staff_role()
RETURNS staff_role_type AS $$
    SELECT role FROM staff WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- POLICY: attendance (TC3 Enforcement)
-- Teachers can ONLY see attendance for classes granted in staff_permissions.
-- Counsellors and Admins have institutional access.
-- ---------------------------------------------------------------------
CREATE POLICY policy_attendance_select ON attendance
    FOR SELECT USING (
        -- Counsellors and Admins have full read access
        get_current_staff_role() IN ('counselor', 'admin', 'support_lead')
        OR
        -- Teachers can only see classes they have view permission for
        class_name IN (
            SELECT sp.class_name FROM staff_permissions sp
            WHERE sp.staff_id = get_current_staff_id() AND sp.can_view = TRUE
        )
    );

CREATE POLICY policy_attendance_insert ON attendance
    FOR INSERT WITH CHECK (
        get_current_staff_role() IN ('admin', 'support_lead')
        OR
        class_name IN (
            SELECT sp.class_name FROM staff_permissions sp
            WHERE sp.staff_id = get_current_staff_id() AND sp.can_edit = TRUE
        )
    );

-- ---------------------------------------------------------------------
-- POLICY: students
-- Teachers can only select students enrolled in their assigned classes.
-- ---------------------------------------------------------------------
CREATE POLICY policy_students_select ON students
    FOR SELECT USING (
        get_current_staff_role() IN ('counselor', 'admin', 'support_lead')
        OR
        class_name IN (
            SELECT sp.class_name FROM staff_permissions sp
            WHERE sp.staff_id = get_current_staff_id() AND sp.can_view = TRUE
        )
    );

-- ---------------------------------------------------------------------
-- POLICY: review_proposals (Confidentiality & TC4 Enforcement)
-- Teachers have ZERO access to review proposals to eliminate classroom bias.
-- Restricted strictly to Counsellors and Admins.
-- ---------------------------------------------------------------------
CREATE POLICY policy_proposals_counselor_only ON review_proposals
    FOR ALL USING (
        get_current_staff_role() IN ('counselor', 'admin', 'support_lead')
    );

-- ---------------------------------------------------------------------
-- POLICY: counsellor_reviews (Confidential Pastoral Dossiers)
-- Teachers have ZERO access. Only counsellors & admins can review.
-- ---------------------------------------------------------------------
CREATE POLICY policy_counsellor_reviews_access ON counsellor_reviews
    FOR ALL USING (
        get_current_staff_role() IN ('counselor', 'admin', 'support_lead')
    );

-- ---------------------------------------------------------------------
-- POLICY: leave_records
-- Staff can view leave records for students in their assigned classes.
-- ---------------------------------------------------------------------
CREATE POLICY policy_leave_records_select ON leave_records
    FOR SELECT USING (
        get_current_staff_role() IN ('counselor', 'admin', 'support_lead')
        OR
        student_id IN (
            SELECT s.student_id FROM students s
            JOIN staff_permissions sp ON sp.class_name = s.class_name
            WHERE sp.staff_id = get_current_staff_id() AND sp.can_view = TRUE
        )
    );

-- ---------------------------------------------------------------------
-- POLICY: audit_logs
-- Append-only for system and service roles; read-only for admin & counselors.
-- ---------------------------------------------------------------------
CREATE POLICY policy_audit_logs_select ON audit_logs
    FOR SELECT USING (
        get_current_staff_role() IN ('admin', 'counselor', 'support_lead')
    );

CREATE POLICY policy_audit_logs_insert ON audit_logs
    FOR INSERT WITH CHECK (TRUE);

-- ---------------------------------------------------------------------
-- POLICY: test_runs
-- Accessible to staff for transparency and hackathon evaluation.
-- ---------------------------------------------------------------------
CREATE POLICY policy_test_runs_all ON test_runs
    FOR ALL USING (TRUE);
