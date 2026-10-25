import React, { useState } from 'react';
import {
  UserCheck,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  User,
  Hash,
  Play,
  Clock,
  FileCheck2,
  Lock,
  ArrowRight,
  Info,
  XCircle,
  HelpCircle,
  Check,
  X,
} from 'lucide-react';
import type {
  UserRole,
  DataOrigin,
  TriageResponse,
} from '../../types/attendance';
import { n8nApi, ApiError } from '../../services/n8nApi';
import { MOCK_STUDENTS, MOCK_STAFF } from '../../mock/syntheticData';
import { DataOriginBadge } from '../common/DataOriginBadge';

interface EvaluateStudentSectionProps {
  currentRole: UserRole;
  dataOrigin: DataOrigin;
  onNavigate?: (section: any) => void;
  onRefreshGlobalData?: () => void;
}

export const EvaluateStudentSection: React.FC<EvaluateStudentSectionProps> = ({
  currentRole,
  dataOrigin,
  onRefreshGlobalData,
}) => {
  // Session Staff Resolution: counselor = Eleanor Vance, teacher = Sarah Davis
  const sessionStaff = currentRole === 'teacher'
    ? MOCK_STAFF.find((s) => s.role === 'teacher') || MOCK_STAFF[1]
    : MOCK_STAFF.find((s) => s.role === 'counselor') || MOCK_STAFF[0];

  // Form State
  const [selectedStaffId, setSelectedStaffId] = useState<string>(sessionStaff.staffId);
  const [classId, setClassId] = useState<string>('10A');
  const [isCustomClass, setIsCustomClass] = useState<boolean>(false);
  const [customClassId, setCustomClassId] = useState<string>('');

  const [studentSelectionMode, setStudentSelectionMode] = useState<'dropdown' | 'custom' | 'all'>('dropdown');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(MOCK_STUDENTS[0].id); // Alex Rivera
  const [customStudentId, setCustomStudentId] = useState<string>('');

  const [startDate, setStartDate] = useState<string>('2026-10-12');
  const [endDate, setEndDate] = useState<string>('2026-10-23');
  const [thresholdCount, setThresholdCount] = useState<number>(8);
  const [windowDays, setWindowDays] = useState<number>(10);

  // Execution & Feedback States
  const [loading, setLoading] = useState<boolean>(false);
  const [errorFeedback, setErrorFeedback] = useState<{
    status?: number;
    code?: string;
    message: string;
  } | null>(null);
  const [triageResponse, setTriageResponse] = useState<TriageResponse | null>(null);

  // Human Review Action States
  const [actionNotes, setActionNotes] = useState<string>('Conduct supportive 10-minute check-in during morning advisory period.');
  const [scheduledCheckinDate, setScheduledCheckinDate] = useState<string>('2026-10-26');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Helper to render evidence items whether string array or object
  const renderEvidenceBadges = (evidence: any) => {
    if (Array.isArray(evidence)) {
      return evidence.map((ev: any, idx: number) => (
        <div
          key={idx}
          className="text-xs bg-white border border-slate-200 p-2.5 rounded-xl text-slate-700 font-mono text-[11px] flex items-center gap-2 shadow-2xs"
        >
          <FileCheck2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">{typeof ev === 'string' ? ev : JSON.stringify(ev)}</span>
        </div>
      ));
    }
    if (typeof evidence === 'object' && evidence !== null) {
      const items = [
        { label: 'Window', val: evidence.observation_window || `${evidence.window_days_evaluated || 10} days` },
        { label: 'Total Sessions', val: `${evidence.total_sessions_evaluated ?? 10} sessions` },
        { label: 'Unexcused Absences', val: `${evidence.unexcused_absences ?? 0} sessions` },
        { label: 'Medical Excused', val: `${evidence.excused_medical_absences ?? 0} (Docs: ${(evidence.applicable_medical_exceptions || []).join(', ') || 'None'})` },
        { label: 'Policy Threshold', val: evidence.threshold_evaluated || '8 unexcused' },
        { label: 'Effective Attendance Rate', val: `${evidence.effective_attendance_rate_pct ?? 100}%` },
      ];
      return items.map((item, idx) => (
        <div
          key={idx}
          className="text-xs bg-white border border-slate-200 p-2.5 rounded-xl text-slate-700 text-[11px] flex items-center gap-2 shadow-2xs"
        >
          <FileCheck2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <div>
            <span className="font-semibold text-slate-900">{item.label}: </span>
            <span className="font-mono text-slate-600">{item.val}</span>
          </div>
        </div>
      ));
    }
    return null;
  };

  // Quick preset loader
  const applyPreset = (presetKey: string) => {
    setErrorFeedback(null);
    setTriageResponse(null);
    setActionFeedback(null);

    switch (presetKey) {
      case 'tc1_alex':
        // Alex Rivera: 8 unexcused absences in Class 10A
        setSelectedStaffId('11111111-1111-1111-1111-111111111111'); // Eleanor Vance (Counselor)
        setClassId('10A');
        setIsCustomClass(false);
        setStudentSelectionMode('dropdown');
        setSelectedStudentId('a0000000-0000-0000-0000-000000000001'); // Alex Rivera
        setStartDate('2026-10-12');
        setEndDate('2026-10-23');
        setThresholdCount(8);
        setWindowDays(10);
        break;
      case 'tc2_jordan':
        // Jordan Chen: Medical leave shielded in Class 10A
        setSelectedStaffId('11111111-1111-1111-1111-111111111111');
        setClassId('10A');
        setIsCustomClass(false);
        setStudentSelectionMode('dropdown');
        setSelectedStudentId('a0000000-0000-0000-0000-000000000002'); // Jordan Chen
        setStartDate('2026-10-12');
        setEndDate('2026-10-23');
        setThresholdCount(8);
        setWindowDays(10);
        break;
      case 'tc3_cross_class':
        // Sarah Davis (Class 10A Teacher) querying Class 10B -> 403 Forbidden
        setSelectedStaffId('22222222-2222-2222-2222-222222222222'); // Sarah Davis
        setClassId('10B');
        setIsCustomClass(false);
        setStudentSelectionMode('all');
        setStartDate('2026-10-12');
        setEndDate('2026-10-23');
        setThresholdCount(8);
        setWindowDays(10);
        break;
      case 'tc4_taylor':
        // Taylor Brooks: Normal baseline in Class 10A
        setSelectedStaffId('11111111-1111-1111-1111-111111111111');
        setClassId('10A');
        setIsCustomClass(false);
        setStudentSelectionMode('dropdown');
        setSelectedStudentId('a0000000-0000-0000-0000-000000000003'); // Casey / Taylor
        setStartDate('2026-10-12');
        setEndDate('2026-10-23');
        setThresholdCount(8);
        setWindowDays(10);
        break;
      case 'err_unknown_student':
        // Unknown student UUID -> 404
        setSelectedStaffId('11111111-1111-1111-1111-111111111111');
        setClassId('10A');
        setIsCustomClass(false);
        setStudentSelectionMode('custom');
        setCustomStudentId('a9999999-9999-9999-9999-999999999999');
        setStartDate('2026-10-12');
        setEndDate('2026-10-23');
        setThresholdCount(8);
        setWindowDays(10);
        break;
      case 'err_invalid_dates':
        // Start date after end date -> 400
        setSelectedStaffId('11111111-1111-1111-1111-111111111111');
        setClassId('10A');
        setIsCustomClass(false);
        setStudentSelectionMode('dropdown');
        setSelectedStudentId('a0000000-0000-0000-0000-000000000001');
        setStartDate('2026-10-25');
        setEndDate('2026-10-12'); // Inverted!
        setThresholdCount(8);
        setWindowDays(10);
        break;
      default:
        break;
    }
  };

  // Submit Evaluation to Real n8n Webhook (/webhook/triage-evaluate)
  const handleSubmitEvaluation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorFeedback(null);
    setTriageResponse(null);
    setActionFeedback(null);

    const effectiveClassId = isCustomClass ? customClassId.trim() : classId;
    let effectiveStudentId: string | undefined = undefined;

    if (studentSelectionMode === 'dropdown') {
      effectiveStudentId = selectedStudentId;
    } else if (studentSelectionMode === 'custom') {
      effectiveStudentId = customStudentId.trim();
    }

    // Client-side pre-flight validations
    if (!effectiveClassId) {
      setErrorFeedback({
        status: 400,
        code: 'CLIENT_VALIDATION',
        message: 'Please provide a valid Class ID.',
      });
      setLoading(false);
      return;
    }

    if (studentSelectionMode === 'custom' && !effectiveStudentId) {
      setErrorFeedback({
        status: 400,
        code: 'CLIENT_VALIDATION',
        message: 'Please provide a Student ID or select "All Students".',
      });
      setLoading(false);
      return;
    }

    try {
      const response = await n8nApi.evaluateTriage({
        staff_id: selectedStaffId,
        class_id: effectiveClassId,
        student_id: effectiveStudentId || undefined,
        observation_period: {
          start_date: startDate,
          end_date: endDate,
        },
        attendance_threshold: {
          absence_threshold_count: Number(thresholdCount),
          window_days: Number(windowDays),
        },
      });

      setTriageResponse(response);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorFeedback({
          status: err.status,
          code: err.code || `HTTP_${err.status}`,
          message: err.message,
        });
      } else {
        setErrorFeedback({
          status: 0,
          code: 'NETWORK_ERROR',
          message: err.message || 'Failed to connect to backend.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Human Review Decision (Approve or Reject)
  const handleReviewDecision = async (
    proposalId: string,
    action: 'approve' | 'dismiss'
  ) => {
    setActionLoading(true);
    setActionFeedback(null);

    const currentStaffObj = MOCK_STAFF.find((s) => s.staffId === selectedStaffId) || sessionStaff;

    try {
      const res = await n8nApi.submitReviewAction({
        proposal_id: proposalId,
        action,
        notes: actionNotes,
        scheduled_date: action === 'approve' ? scheduledCheckinDate : undefined,
        actor_id: currentStaffObj.staffId,
        actor_name: `${currentStaffObj.fullName} (${currentStaffObj.email})`,
      });

      setActionFeedback({
        success: true,
        message: `Success: ${res.message} (Status: ${res.proposal?.status || action})`,
      });

      // Update local triageResponse state
      if (triageResponse) {
        setTriageResponse({
          ...triageResponse,
          triage_results: triageResponse.triage_results.map((item) => {
            if (item.triage_evaluation.proposal_id === proposalId) {
              return {
                ...item,
                triage_evaluation: {
                  ...item.triage_evaluation,
                  proposal_status: action === 'approve' ? 'approved' : 'dismissed',
                },
              };
            }
            return item;
          }),
        });
      }

      if (onRefreshGlobalData) onRefreshGlobalData();
    } catch (err: any) {
      setActionFeedback({
        success: false,
        message: `Backend Error (HTTP ${err.status || 400}): ${err.message}`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const activeStaff = MOCK_STAFF.find((s) => s.staffId === selectedStaffId) || sessionStaff;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Manual Student Evaluation & Care Triage
            </h2>
            <DataOriginBadge origin={dataOrigin} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Execute targeted attendance evaluations against the live n8n backend with full HITL approval safeguards.
          </p>
        </div>

        {/* Authenticated Staff Pill */}
        <div className="flex items-center gap-2 text-xs bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <span className="text-slate-400 font-medium">Session Staff: </span>
            <span className="font-semibold text-slate-800">{activeStaff.fullName}</span>
            <span className="text-slate-400 ml-1">({activeStaff.role})</span>
          </div>
        </div>
      </div>

      {/* Preset Scenarios for Rapid Testing */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Quick Scenario Presets (1-Click Test without Hoppscotch)
          </span>
          <span className="text-[11px] text-slate-400">Click any preset to load test parameters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            type="button"
            onClick={() => applyPreset('tc1_alex')}
            className="text-left px-3 py-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition text-xs shadow-2xs group cursor-pointer"
          >
            <div className="font-bold text-blue-900 group-hover:text-blue-700">TC1 Trigger</div>
            <div className="text-[11px] text-slate-500">Alex Rivera (8 unexcused)</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('tc2_jordan')}
            className="text-left px-3 py-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition text-xs shadow-2xs group cursor-pointer"
          >
            <div className="font-bold text-emerald-900 group-hover:text-emerald-700">TC2 Shield</div>
            <div className="text-[11px] text-slate-500">Jordan Chen (Medical Leave)</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('tc3_cross_class')}
            className="text-left px-3 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-xl transition text-xs shadow-2xs group cursor-pointer"
          >
            <div className="font-bold text-rose-900 group-hover:text-rose-700">TC3 Block</div>
            <div className="text-[11px] text-slate-500">Teacher Sarah on Class 10B</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('tc4_taylor')}
            className="text-left px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl transition text-xs shadow-2xs group cursor-pointer"
          >
            <div className="font-bold text-slate-900">Baseline Rate</div>
            <div className="text-[11px] text-slate-500">Casey W. (Normal Stability)</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('err_unknown_student')}
            className="text-left px-3 py-2 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl transition text-xs shadow-2xs group cursor-pointer"
          >
            <div className="font-bold text-amber-900 group-hover:text-amber-700">404 Test</div>
            <div className="text-[11px] text-slate-500">Unknown Student UUID</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('err_invalid_dates')}
            className="text-left px-3 py-2 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl transition text-xs shadow-2xs group cursor-pointer"
          >
            <div className="font-bold text-amber-900 group-hover:text-amber-700">400 Test</div>
            <div className="text-[11px] text-slate-500">Inverted Dates (End &lt; Start)</div>
          </button>
        </div>
      </div>

      {/* Main Interactive Evaluation Form */}
      <form onSubmit={handleSubmitEvaluation} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Evaluation Parameters</h3>
            <p className="text-xs text-slate-500">
              Payload conforms to <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">POST /webhook/triage-evaluate</code> contract.
            </p>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">HITL Policy: Rule 101, 102, 103</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Authenticated Staff Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Authenticated Staff ID
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {MOCK_STAFF.map((staff) => (
                <option key={staff.staffId} value={staff.staffId}>
                  {staff.fullName} — {staff.role.toUpperCase()} ({staff.authorizedClass || 'Institutional'})
                </option>
              ))}
            </select>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              UUID: {selectedStaffId}
            </div>
          </div>

          {/* Class Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Class Identifier
              </label>
              <button
                type="button"
                onClick={() => setIsCustomClass(!isCustomClass)}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                {isCustomClass ? 'Choose from list' : 'Enter custom ID'}
              </button>
            </div>
            {isCustomClass ? (
              <input
                type="text"
                placeholder="e.g. 10A, 10B, 11-MATH"
                value={customClassId}
                onChange={(e) => setCustomClassId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            ) : (
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="10A">Class 10A (Teacher: Sarah Davis)</option>
                <option value="10B">Class 10B (Teacher: Marcus Brown)</option>
                <option value="10C">Class 10C (Teacher: Chloe Zhao)</option>
              </select>
            )}
            <div className="text-[10px] text-slate-400">Class roster boundary for access control</div>
          </div>

          {/* Student Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                Target Student
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStudentSelectionMode(studentSelectionMode === 'dropdown' ? 'custom' : 'dropdown')}
                  className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  {studentSelectionMode === 'dropdown' ? 'Custom UUID' : 'Select Student'}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setStudentSelectionMode(studentSelectionMode === 'all' ? 'dropdown' : 'all')}
                  className={`${studentSelectionMode === 'all' ? 'font-bold text-indigo-600' : 'text-slate-500 hover:text-slate-700'} cursor-pointer`}
                >
                  All in Class
                </button>
              </div>
            </div>

            {studentSelectionMode === 'dropdown' && (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {MOCK_STUDENTS.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.studentCode} — {stu.firstName} {stu.lastName} ({stu.className})
                  </option>
                ))}
              </select>
            )}

            {studentSelectionMode === 'custom' && (
              <input
                type="text"
                placeholder="Enter Student UUID (e.g. a0000000-0000-...)"
                value={customStudentId}
                onChange={(e) => setCustomStudentId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            )}

            {studentSelectionMode === 'all' && (
              <div className="px-3 py-2.5 text-xs bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl font-medium">
                Evaluating all students enrolled in Class {isCustomClass ? customClassId : classId}
              </div>
            )}
            <div className="text-[10px] text-slate-400">Target individual student or entire class cohort</div>
          </div>

          {/* Observation Start Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Observation Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <div className="text-[10px] text-slate-400">YYYY-MM-DD start of observation window</div>
          </div>

          {/* Observation End Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Observation End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <div className="text-[10px] text-slate-400">YYYY-MM-DD end of observation window</div>
          </div>

          {/* Absence Threshold & Window Days */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Threshold
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={thresholdCount}
                onChange={(e) => setThresholdCount(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <div className="text-[10px] text-slate-400">Absences (default 8)</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Window (Days)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={windowDays}
                onChange={(e) => setWindowDays(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <div className="text-[10px] text-slate-400">Days (default 10)</div>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Real n8n backend execution. Zero automated punishment or public labelling guaranteed.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setTriageResponse(null);
                setErrorFeedback(null);
                setActionFeedback(null);
              }}
              className="px-4 py-2.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer"
            >
              Reset Form
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <Play className={`w-3.5 h-3.5 ${loading ? 'animate-pulse' : ''}`} />
              <span>{loading ? 'Evaluating via n8n Webhook...' : 'Evaluate Student'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Backend Error Display (Handles 400, 403, 404, etc.) */}
      {errorFeedback && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-900 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Backend Validation Error (HTTP {errorFeedback.status || 'ERROR'}): {errorFeedback.code}</span>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed font-mono bg-rose-100/60 p-3 rounded-xl border border-rose-200">
            {errorFeedback.message}
          </p>
          <div className="text-[11px] text-rose-600 flex items-center gap-1.5 pt-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              {errorFeedback.message.includes('must be active') || errorFeedback.message.includes('not registered')
                ? 'n8n Workflow Inactive: In your n8n Cloud editor (vidyaa25.app.n8n.cloud), open the CareTriage workflow and switch the top-right toggle to Active.'
                : errorFeedback.status === 403
                ? 'Role-Based Access Control (TC3): Only staff assigned to this specific class or institutional counselors can access these records.'
                : errorFeedback.status === 404
                ? 'Record Not Found: Verify student identifier exists in the roster or check that the webhook is active in n8n.'
                : 'Invalid Request: Verify observation date order (start_date <= end_date) and required fields.'}
            </span>
          </div>
        </div>
      )}

      {/* Human Review Decision Banner (Feedback from Approve / Reject) */}
      {actionFeedback && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
          actionFeedback.success
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2 font-medium">
            {actionFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Evaluation Results & AI Explanation Display */}
      {triageResponse && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="text-sm font-bold text-slate-900">
                  Live Evaluation Returned from n8n Engine
                </h3>
                <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-mono">
                  {triageResponse.timestamp.slice(0, 19).replace('T', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Evaluator: <strong className="text-slate-700">{triageResponse.request_scope.evaluated_by_staff}</strong> ({triageResponse.request_scope.staff_role}) | Class: <strong className="text-slate-700">{triageResponse.request_scope.class_id}</strong> | Window: <strong className="text-slate-700">{triageResponse.request_scope.observation_period.start_date} to {triageResponse.request_scope.observation_period.end_date}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Evaluated</div>
                <div className="text-sm font-bold text-slate-800">{triageResponse.summary_metrics.students_evaluated}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-center">
                <div className="text-[10px] text-blue-600 uppercase font-semibold">Proposals</div>
                <div className="text-sm font-bold text-blue-800">{triageResponse.summary_metrics.support_proposals_warranted}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-center">
                <div className="text-[10px] text-emerald-600 uppercase font-semibold">Shielded (TC2)</div>
                <div className="text-sm font-bold text-emerald-800">{triageResponse.summary_metrics.medical_exceptions_shielded}</div>
              </div>
            </div>
          </div>

          {/* Student Evaluation Cards */}
          <div className="space-y-6">
            {triageResponse.triage_results.map((studentItem) => {
              const tel = studentItem.telemetry;
              const evalDetails = studentItem.triage_evaluation;
              const ai = studentItem.ai_explanation;
              const isFlagged = evalDetails.flag_raised;
              const isShielded = evalDetails.is_medical_shielded;

              return (
                <div
                  key={studentItem.student_id}
                  className={`bg-white border rounded-2xl shadow-xs overflow-hidden transition ${
                    isFlagged
                      ? 'border-blue-300 ring-1 ring-blue-100'
                      : isShielded
                      ? 'border-emerald-200'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Student Card Header */}
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isFlagged
                          ? 'bg-blue-100 text-blue-700'
                          : isShielded
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {studentItem.student_code.slice(-3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {studentItem.first_name ? `${studentItem.first_name} ${studentItem.last_name}` : studentItem.student_code}
                          </h4>
                          <span className="text-xs font-mono text-slate-500">({studentItem.student_code})</span>
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                            Class {studentItem.class_name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          ID: <span className="font-mono">{studentItem.student_id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {isFlagged ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-blue-600" />
                          TC1 Trigger: Review Proposal Warranted
                        </span>
                      ) : isShielded ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          TC2 Medical Shield Applied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Normal Attendance Baseline
                        </span>
                      )}

                      {evalDetails.proposal_status && (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          evalDetails.proposal_status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : evalDetails.proposal_status === 'dismissed'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          Status: {evalDetails.proposal_status.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 p-5 bg-white border-b border-slate-100 text-center">
                    <div className="p-2.5 bg-slate-50 rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Sessions</div>
                      <div className="text-base font-bold text-slate-900">{tel.total_sessions_evaluated}</div>
                    </div>
                    <div className="p-2.5 bg-emerald-50 rounded-xl">
                      <div className="text-[10px] text-emerald-600 uppercase font-semibold">Present</div>
                      <div className="text-base font-bold text-emerald-700">{tel.present_count}</div>
                    </div>
                    <div className="p-2.5 bg-rose-50 rounded-xl">
                      <div className="text-[10px] text-rose-600 uppercase font-semibold">Unexcused</div>
                      <div className="text-base font-bold text-rose-700">{tel.unexcused_absences}</div>
                    </div>
                    <div className="p-2.5 bg-purple-50 rounded-xl">
                      <div className="text-[10px] text-purple-600 uppercase font-semibold">Medical Excused</div>
                      <div className="text-base font-bold text-purple-700">{tel.excused_medical_absences}</div>
                    </div>
                    <div className="p-2.5 bg-amber-50 rounded-xl">
                      <div className="text-[10px] text-amber-600 uppercase font-semibold">Tardy Count</div>
                      <div className="text-base font-bold text-amber-700">{tel.tardy_count}</div>
                    </div>
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                      <div className="text-[10px] text-blue-600 uppercase font-semibold">Effective Rate</div>
                      <div className="text-base font-bold text-blue-700">{tel.effective_attendance_rate_pct}%</div>
                    </div>
                  </div>

                  {/* Visible Gemini AI Explanation Section */}
                  {ai && (
                    <div className="p-6 bg-slate-50/80 border-b border-slate-100 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                              Gemini AI Explanation
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                                Live Model Response
                              </span>
                            </h5>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              Synthesized by n8n Gemini Message a model node • Strictly Private to Authorized Staff
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Zero Public Labelling
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 bg-blue-100/80 px-2.5 py-1 rounded-lg border border-blue-200">
                            <Lock className="w-3.5 h-3.5 text-blue-600" /> Counselor Quarantine
                          </span>
                        </div>
                      </div>

                      {/* Evidence-Based Summary Card */}
                      <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed shadow-2xs space-y-1.5">
                        <div className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
                          <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                          Factual Attendance Summary
                        </div>
                        <p className="text-slate-700 leading-relaxed text-xs sm:text-sm">
                          {ai.explanation}
                        </p>
                      </div>

                      {/* Attendance Evidence Considered Card */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                          Attendance Evidence Considered (Telemetry Grounding):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {renderEvidenceBadges(ai.evidence_used)}
                        </div>
                      </div>

                      {/* Uncertainty & Missing Information Notice Card */}
                      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                        <div className="font-bold text-amber-900 flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
                          Uncertainty &amp; Missing Information Safeguard
                        </div>
                        <p className="text-amber-800 text-xs leading-relaxed">
                          {ai.uncertainty_or_missing_info}
                        </p>
                      </div>

                      {/* Suggested Supportive Next Step Card */}
                      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1.5">
                        <div className="font-bold text-blue-900 flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-blue-700 shrink-0" />
                          Recommended Supportive Next Step (Non-Punitive Follow-up)
                        </div>
                        <p className="text-blue-800 text-xs leading-relaxed">
                          {ai.suggested_supportive_next_step}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Human-in-the-Loop Approval Action Box */}
                  {isFlagged && (
                    <div className="p-5 bg-white space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Human-in-the-Loop Authorization &amp; Triage Action
                          </h5>
                          <p className="text-[11px] text-slate-500">
                            Proposal ID: <code className="text-slate-700">{evalDetails.proposal_id || 'prop-pending'}</code>. Irreversible actions are blocked until confirmed by an authorized counselor.
                          </p>
                        </div>

                        <div className="text-xs font-medium text-slate-500">
                          {currentRole === 'teacher' ? (
                            <span className="text-rose-600 font-semibold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                              Logged in as Teacher (Approval Disabled by Backend)
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              Counselor Authorization Active
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Decision Form */}
                      {evalDetails.proposal_status === 'approved' ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold">Human Counselor Approved: </span>
                            <span>Pastoral outreach scheduled and assigned to Eleanor Vance, M.Ed. Closed-loop verification is now awaiting encounter evidence.</span>
                          </div>
                        </div>
                      ) : evalDetails.proposal_status === 'dismissed' ? (
                        <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center gap-3">
                          <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
                          <div>
                            <span className="font-bold">Proposal Dismissed: </span>
                            <span>Documented rationale has been written to the immutable audit log. No further outreach scheduled.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-1">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-700">
                                Pastoral Outreach Date
                              </label>
                              <input
                                type="date"
                                value={scheduledCheckinDate}
                                onChange={(e) => setScheduledCheckinDate(e.target.value)}
                                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-700">
                                Counselor Follow-Up Notes / Rationale
                              </label>
                              <input
                                type="text"
                                value={actionNotes}
                                onChange={(e) => setActionNotes(e.target.value)}
                                placeholder="Enter pastoral follow-up focus or reason for decision..."
                                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleReviewDecision(evalDetails.proposal_id || 'prop-pending', 'dismiss')}
                              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5 text-slate-500" />
                              <span>Reject / Dismiss Proposal</span>
                            </button>

                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleReviewDecision(evalDetails.proposal_id || 'prop-pending', 'approve')}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>{actionLoading ? 'Enforcing Authorization...' : 'Approve & Schedule Outreach'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
