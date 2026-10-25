# CareTriage — n8n MVP Attendance Triage Workflow

This folder contains the **importable n8n workflow JSON** for the first MVP of the School Attendance Support Triage Agent.

## Workflow Overview

```
Webhook Trigger (POST /webhook/triage-evaluate)
   │
   ▼
Validate Input ──[Invalid]──► Respond Input Error (HTTP 400: missing staff_id / class_id / invalid dates)
   │ [Valid]
   ▼
Check Staff Permission (Supabase Postgres)
   │
   ▼
Evaluate Authorization (TC3) ──[Unauthorized]──► Respond Unauthorized (HTTP 403: unauthorized staff)
   │ [Authorized]
   ▼
Verify Student & Class Roster (Supabase Postgres)
   │
   ▼
Check Student Exists ──[Not Found]──► Respond Unknown Student (HTTP 404: unknown student)
   │ [Found / Class-wide]
   ▼
Fetch Attendance Records (Supabase Postgres)
   │
   ▼
Fetch Approved Leave Records (Supabase Postgres)
   │
   ▼
Deterministic Decision Engine (Rule 102 Medical Shield & Rule 103 Triage Trigger)
   │
   ▼
Respond Success (HTTP 200 with structured triage telemetry)
```

---

## 1. How to Import into n8n

1. Open your **n8n instance** (e.g., `http://localhost:5678` or n8n Cloud).
2. Click **Add workflow** (top right) $\rightarrow$ Click the **three dots menu (`...`)** in the top right $\rightarrow$ Select **Import from File**.
3. Choose the file: [`d:\Attendance\n8n\care_triage_mvp_workflow.json`](file:///d:/Attendance/n8n/care_triage_mvp_workflow.json).
4. The complete 16-node workflow will render automatically on your n8n canvas.

---

## 2. Setting up Supabase Database Credentials in n8n

The workflow uses the **Postgres** node to query Supabase directly with full SQL support:
1. In n8n, go to **Credentials** $\rightarrow$ **New Credential** $\rightarrow$ Search for **Postgres**.
2. Fill in your Supabase connection parameters (found in **Supabase Dashboard** $\rightarrow$ **Project Settings** $\rightarrow$ **Database** $\rightarrow$ **Connection info**):
   - **Host**: `db.<your-project-ref>.supabase.co`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: `<your-db-password>`
   - **Port**: `5432` or `6543` (Pooler)
   - **SSL**: `true` (Enable SSL / Require)
3. Name the credential `Supabase PostgreSQL` (or map it in the 4 Postgres nodes).

---

## 3. Explicit Error Response Specifications

### Error 1: Missing `staff_id` (HTTP 400)
- **Trigger**: Request omits `staff_id`
- **Response**:
```json
{
  "status": "error",
  "code": "MISSING_STAFF_ID",
  "error": "missing staff_id",
  "message": "Mandatory parameter 'staff_id' is missing or empty."
}
```

### Error 2: Missing `class_id` (HTTP 400)
- **Trigger**: Request omits `class_id`
- **Response**:
```json
{
  "status": "error",
  "code": "MISSING_CLASS_ID",
  "error": "missing class_id",
  "message": "Mandatory parameter 'class_id' is missing or empty."
}
```

### Error 3: Invalid Dates (HTTP 400)
- **Trigger**: `start_date > end_date` or bad format
- **Response**:
```json
{
  "status": "error",
  "code": "INVALID_DATES",
  "error": "invalid dates",
  "message": "start_date (2026-10-25) cannot be after end_date (2026-10-10)."
}
```

### Error 4: Unauthorized Staff (HTTP 403 — TC3 Enforcement)
- **Trigger**: Teacher Sarah (`staff_id: 22222222-2222-2222-2222-222222222222`, authorized for `10A` only) attempts to query Class `10B`.
- **Response**:
```json
{
  "status": "error",
  "code": "UNAUTHORIZED_STAFF",
  "error": "unauthorized staff",
  "message": "Access Denied (TC3): Staff member 'Sarah Davis' (teacher) is not authorized to access records for class '10B'."
}
```

### Error 5: Unknown Student (HTTP 404)
- **Trigger**: Querying a `student_id` that does not exist in the requested class.
- **Response**:
```json
{
  "status": "error",
  "code": "UNKNOWN_STUDENT",
  "error": "unknown student",
  "message": "Student with ID '00000000-0000-0000-0000-000000000999' not found in class '10A'."
}
```

---

## 4. Successful Triage Response (HTTP 200 — TC1 & TC2 Evaluated)

When an authorized staff member (e.g. Teacher Sarah for `10A` or Counsellor Eleanor) evaluates the 10-day window (`2026-10-12` to `2026-10-23`):

```json
{
  "status": "success",
  "timestamp": "2026-10-25T16:26:00.000Z",
  "request_scope": {
    "evaluated_by_staff": "Sarah Davis",
    "staff_role": "teacher",
    "class_id": "10A",
    "observation_period": {
      "start_date": "2026-10-12",
      "end_date": "2026-10-23"
    },
    "absence_threshold": 8
  },
  "summary_metrics": {
    "students_evaluated": 10,
    "support_proposals_warranted": 1,
    "medical_exceptions_shielded": 1
  },
  "triage_results": [
    {
      "student_id": "a0000000-0000-0000-0000-000000000001",
      "student_code": "STU-2026-001",
      "class_name": "10A",
      "telemetry": {
        "total_sessions_evaluated": 10,
        "present_count": 2,
        "tardy_count": 0,
        "unexcused_absences": 8,
        "excused_medical_absences": 0,
        "effective_attendance_rate_pct": 20.0
      },
      "triage_evaluation": {
        "threshold_tested": "8 unexcused absences",
        "flag_raised": true,
        "is_medical_shielded": false,
        "decision_reason": "TC1 TRIGGER: Sustained attendance pattern change detected (8 of 10 sessions unattended without documented exception).",
        "recommended_action": "create_private_counsellor_review_proposal"
      },
      "ethical_compliance": {
        "zero_labelling_verified": true,
        "punitive_action": "NONE",
        "public_flag": false,
        "privacy_quarantine": "counselor_only"
      }
    },
    {
      "student_id": "a0000000-0000-0000-0000-000000000002",
      "student_code": "STU-2026-002",
      "class_name": "10A",
      "telemetry": {
        "total_sessions_evaluated": 10,
        "present_count": 2,
        "tardy_count": 0,
        "unexcused_absences": 1,
        "excused_medical_absences": 7,
        "effective_attendance_rate_pct": 90.0
      },
      "triage_evaluation": {
        "threshold_tested": "8 unexcused absences",
        "flag_raised": false,
        "is_medical_shielded": true,
        "decision_reason": "TC2 SHIELD: 8 unattended sessions observed, but 7 covered by approved medical documentation (DOC-MED-84920). Excluded from triage flag.",
        "recommended_action": "no_action_needed_medical_exception"
      },
      "ethical_compliance": {
        "zero_labelling_verified": true,
        "punitive_action": "NONE",
        "public_flag": false,
        "privacy_quarantine": "counselor_only"
      }
    }
  ]
}
```

---

## 5. Running the Automated Test Suite

In PowerShell:
```powershell
# In d:\Attendance\n8n:
.\test_curls.ps1 -BaseUrl "http://localhost:5678/webhook-test/triage-evaluate"
```
Or test in production webhook mode:
```powershell
.\test_curls.ps1 -BaseUrl "http://localhost:5678/webhook/triage-evaluate"
```
