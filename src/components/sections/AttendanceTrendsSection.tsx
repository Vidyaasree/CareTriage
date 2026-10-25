import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Filter,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import type {
  UserRole,
  DataOrigin,
  TrendTimelineItem,
  TrendStudentItem,
} from '../../types/attendance';
import { DataOriginBadge } from '../common/DataOriginBadge';
import { n8nApi } from '../../services/n8nApi';

interface AttendanceTrendsSectionProps {
  currentRole: UserRole;
  dataOrigin: DataOrigin;
  onNavigateToEvidence?: (studentId: string) => void;
}

export const AttendanceTrendsSection: React.FC<AttendanceTrendsSectionProps> = ({
  currentRole,
  dataOrigin,
  onNavigateToEvidence,
}) => {
  // Filters
  const [selectedClass, setSelectedClass] = useState<string>(currentRole === 'teacher' ? '10A' : 'all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('2026-10-12');
  const [endDate, setEndDate] = useState('2026-10-23');

  // Backend Data
  const [timeline, setTimeline] = useState<TrendTimelineItem[]>([]);
  const [students, setStudents] = useState<TrendStudentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await n8nApi.getTrends({
        class_id: selectedClass === 'all' ? undefined : selectedClass,
        student_id: selectedStudent === 'all' ? undefined : selectedStudent,
        start_date: startDate,
        end_date: endDate,
      });

      setTimeline(res.timeline || []);
      setStudents(res.students || []);
    } catch (err: any) {
      setError(`Failed to fetch trends from backend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [selectedClass, selectedStudent, startDate, endDate]);

  // Apply quick date presets
  const handlePresetChange = (preset: string) => {
    if (preset === '10days') {
      setStartDate('2026-10-12');
      setEndDate('2026-10-23');
    } else if (preset === '30days') {
      setStartDate('2026-09-24');
      setEndDate('2026-10-24');
    } else if (preset === 'semester') {
      setStartDate('2026-09-01');
      setEndDate('2026-10-24');
    }
  };

  // Filter students for table display
  const filteredStudents = students.filter((s) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCode = s.student_code.toLowerCase().includes(q);
      const matchName = `${s.first_name} ${s.last_name}`.toLowerCase().includes(q);
      if (!matchCode && !matchName) return false;
    }
    if (selectedClass !== 'all' && s.class_name.toLowerCase() !== selectedClass.toLowerCase()) {
      return false;
    }
    return true;
  });

  const normalCount = filteredStudents.filter((s) => s.pattern_classification === 'normal').length;
  const shieldedCount = filteredStudents.filter((s) => s.pattern_classification === 'medical_shielded').length;
  const reviewCount = filteredStudents.filter((s) => s.pattern_classification === 'review_recommended').length;

  // Compute overall average rate across filtered students
  const overallAvgRate = filteredStudents.length > 0
    ? (filteredStudents.reduce((acc, s) => acc + s.effective_rate, 0) / filteredStudents.length).toFixed(1)
    : '94.8';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Attendance Trends & Pattern Analysis
            </h2>
            <DataOriginBadge origin={dataOrigin} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Empirical observation period telemetry distinguishing normal attendance, medical exceptions, and review-recommended patterns.
          </p>
        </div>

        <button
          onClick={fetchTrends}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh Backend Trends</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Toolbar (Date, Class, Student) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Interactive Filters</span>
          </span>
          <span className="text-[11px] text-slate-400">
            Active Staff Scope: {currentRole === 'teacher' ? 'Class 10A (Teacher RLS Scope)' : 'Full School Scope'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Class Filter */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Class Filter</label>
            <select
              value={selectedClass}
              disabled={currentRole === 'teacher'}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedStudent('all');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-75"
            >
              {currentRole !== 'teacher' && <option value="all">All Classes (Institutional)</option>}
              <option value="10A">Class 10A (Teacher Sarah)</option>
              {currentRole !== 'teacher' && <option value="10B">Class 10B (Teacher Marcus)</option>}
              {currentRole !== 'teacher' && <option value="10C">Class 10C (Teacher Chloe)</option>}
            </select>
          </div>

          {/* Student Filter */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Student Filter</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Monitored Students</option>
              {students
                .filter((s) => selectedClass === 'all' || s.class_name.toLowerCase() === selectedClass.toLowerCase())
                .map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.student_code} — {s.first_name} {s.last_name} ({s.class_name})
                  </option>
                ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Observation Start Date</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Observation End Date</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Date Presets:
          </span>
          <button
            onClick={() => handlePresetChange('10days')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
              startDate === '2026-10-12' && endDate === '2026-10-23'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last 10 School Days (Standard Window)
          </button>
          <button
            onClick={() => handlePresetChange('30days')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
              startDate === '2026-09-24'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last 30 Calendar Days
          </button>
          <button
            onClick={() => handlePresetChange('semester')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
              startDate === '2026-09-01'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Fall Semester 2026
          </button>
        </div>
      </div>

      {/* Pattern Distinction KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Effective Attendance Rate
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{overallAvgRate}%</span>
            <span className="text-xs font-semibold text-emerald-600">Stable Baseline</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {filteredStudents.length} monitored students in active scope
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-2xs bg-gradient-to-br from-white to-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">
              Normal Patterns
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-950">{normalCount}</div>
          <span className="text-[11px] text-emerald-700 mt-1 block">
            Within acceptable variance (&lt; 8 unexcused absences)
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-2xs bg-gradient-to-br from-white to-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
              Medical Shielded (TC2)
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-amber-950">{shieldedCount}</div>
          <span className="text-[11px] text-amber-700 mt-1 block">
            Rule 102 Protected: Approved leave certificates subtracted
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-2xs bg-gradient-to-br from-white to-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-900 uppercase tracking-wider">
              Review Recommended (TC1)
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-rose-950">{reviewCount}</div>
          <span className="text-[11px] text-rose-700 mt-1 block">
            ≥ 8 unexcused absences; flagged for private counselor review
          </span>
        </div>
      </div>

      {/* Attendance Chart (Timeline Visualization) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Daily Attendance Trends Timeline</span>
              <span className="text-xs font-mono font-normal text-slate-400">
                ({startDate} to {endDate})
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily volume of attendance sessions, showing present status, unexcused absences, and excused medical exemptions.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span className="text-slate-600">Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400"></span>
              <span className="text-slate-600">Medical Excused</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500"></span>
              <span className="text-slate-600">Unexcused</span>
            </div>
          </div>
        </div>

        {/* Bar Chart Representation */}
        {timeline.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No session records found for the selected filter parameters.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2 items-end pt-6 pb-2 min-h-[180px]">
              {timeline.map((day) => {
                const total = day.total || 1;
                const presentPct = Math.round((day.present / total) * 100);
                const medicalPct = Math.round((day.medical_excused / total) * 100);
                const unexcusedPct = Math.max(0, 100 - presentPct - medicalPct);

                return (
                  <div key={day.date} className="flex flex-col items-center gap-2 group">
                    {/* Hover tooltip metrics */}
                    <div className="text-[10px] text-slate-500 font-mono font-semibold">
                      {presentPct}%
                    </div>

                    {/* Stacked bar */}
                    <div className="w-full max-w-[40px] bg-slate-100 rounded-lg overflow-hidden h-36 flex flex-col-reverse relative shadow-2xs">
                      {/* Present segment (Green) */}
                      <div
                        style={{ height: `${presentPct}%` }}
                        className="bg-emerald-500 w-full transition-all duration-300"
                        title={`Present: ${day.present} of ${day.total}`}
                      ></div>
                      {/* Medical Excused segment (Amber) */}
                      <div
                        style={{ height: `${medicalPct}%` }}
                        className="bg-amber-400 w-full transition-all duration-300"
                        title={`Medical Excused: ${day.medical_excused} of ${day.total}`}
                      ></div>
                      {/* Unexcused segment (Rose) */}
                      <div
                        style={{ height: `${unexcusedPct}%` }}
                        className="bg-rose-500 w-full transition-all duration-300"
                        title={`Unexcused: ${day.absent} of ${day.total}`}
                      ></div>
                    </div>

                    {/* Day label */}
                    <span className="text-[10px] font-mono text-slate-600 font-medium">
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Student Pattern Classification Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Pattern Distinction Roster (Empirical Evaluation)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Clear classification between normal baseline attendance and review-recommended cases.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code or student..."
              className="w-full pl-8 pr-3 py-1.5 bg-white text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student Code</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Baseline Rate</th>
                <th className="py-3 px-4">Observed Window Rate</th>
                <th className="py-3 px-4 text-center">Unexcused</th>
                <th className="py-3 px-4 text-center">Medical Excused</th>
                <th className="py-3 px-4">Pattern Classification</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No student records match the active criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const isReview = st.pattern_classification === 'review_recommended';
                  const isShielded = st.pattern_classification === 'medical_shielded';

                  return (
                    <tr
                      key={st.student_id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isReview ? 'bg-rose-50/30' : isShielded ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {st.student_code}
                          </span>
                          <span className="text-slate-600 font-medium">
                            {st.first_name} {st.last_name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-600">
                        Class {st.class_name}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {st.baseline_rate}%
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              style={{ width: `${st.effective_rate}%` }}
                              className={`h-full ${
                                isReview
                                  ? 'bg-rose-500'
                                  : isShielded
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-500'
                              }`}
                            ></div>
                          </div>
                          <span className="font-mono font-semibold text-slate-800">
                            {st.effective_rate}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        <span className={st.unexcused_absences >= 8 ? 'text-rose-600' : 'text-slate-600'}>
                          {st.unexcused_absences}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-medium text-amber-700">
                        {st.medical_absences > 0 ? (
                          <span className="px-2 py-0.5 bg-amber-50 rounded border border-amber-200">
                            {st.medical_absences} excused
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isReview ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Review Recommended (Rule 103)</span>
                          </span>
                        ) : isShielded ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            <span>Medical Shielded (Rule 102)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Normal Attendance</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {onNavigateToEvidence ? (
                          <button
                            onClick={() => onNavigateToEvidence(st.student_id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                          >
                            View Evidence
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
