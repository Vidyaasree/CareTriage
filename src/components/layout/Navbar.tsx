import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  HeartHandshake,
  UserCircle2,
  Wifi,
  RotateCw,
  LayoutDashboard,
  UserCheck,
  TrendingUp,
  Inbox,
  FileCheck2,
  FlaskConical,
  ScrollText,
  Settings as SettingsIcon,
} from 'lucide-react';
import type { UserRole, DataOrigin, NavSection } from '../../types/attendance';
import { DataOriginBadge } from '../common/DataOriginBadge';
import { n8nApi } from '../../services/n8nApi';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  dataOrigin: DataOrigin;
  onToggleDataOrigin: () => void;
  currentSection?: NavSection;
  onNavigate?: (section: NavSection) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  dataOrigin,
  currentSection,
  onNavigate,
}) => {
  const [backendStatus, setBackendStatus] = useState<{
    ok: boolean;
    latencyMs: number;
    checking: boolean;
    state?: 'active' | 'workflow_inactive' | 'test_mode_waiting' | 'offline';
    message?: string;
    hint?: string;
  }>({
    ok: true,
    latencyMs: 12,
    checking: false,
    state: 'active',
  });

  const checkConnection = async () => {
    setBackendStatus((prev) => ({ ...prev, checking: true }));
    const result = await n8nApi.checkHealth();
    setBackendStatus({
      ok: result.ok,
      latencyMs: result.latencyMs,
      checking: false,
      state: result.state,
      message: result.message,
      hint: result.hint,
    });
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // periodic ping
    return () => clearInterval(interval);
  }, []);

  const navTabs = [
    {
      id: 'dashboard' as NavSection,
      label: 'Overview',
      icon: LayoutDashboard,
      allowedRoles: ['counselor', 'teacher', 'admin'],
    },
    {
      id: 'evaluate' as NavSection,
      label: 'Evaluate Student',
      icon: UserCheck,
      highlight: 'n8n + Gemini',
      allowedRoles: ['counselor', 'teacher', 'admin'],
    },
    {
      id: 'trends' as NavSection,
      label: 'Attendance Trends',
      icon: TrendingUp,
      allowedRoles: ['counselor', 'teacher', 'admin'],
    },
    {
      id: 'review-queue' as NavSection,
      label: 'Review Queue',
      icon: Inbox,
      allowedRoles: ['counselor', 'admin'],
    },
    {
      id: 'evidence' as NavSection,
      label: 'Evidence View',
      icon: FileCheck2,
      allowedRoles: ['counselor', 'admin'],
    },
    {
      id: 'test-lab' as NavSection,
      label: 'Test Lab (TC1-TC4)',
      icon: FlaskConical,
      allowedRoles: ['counselor', 'teacher', 'admin'],
    },
    {
      id: 'audit-log' as NavSection,
      label: 'Audit Log',
      icon: ScrollText,
      allowedRoles: ['admin', 'counselor'],
    },
    {
      id: 'safety' as NavSection,
      label: 'Safety Panel',
      icon: ShieldCheck,
      allowedRoles: ['counselor', 'teacher', 'admin'],
    },
    {
      id: 'settings' as NavSection,
      label: 'Backend & Settings',
      icon: SettingsIcon,
      allowedRoles: ['counselor', 'admin', 'teacher'],
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                  CareTriage
                </h1>
                <span className="text-xs px-2 py-0.5 font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  Attendance Support
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Supportive pastoral triage • Zero-labelling design
              </p>
            </div>
          </div>

          {/* Right Controls: Backend Status, Role Selector */}
          <div className="flex items-center gap-3">
            {/* Live n8n Backend Ping Indicator */}
            {backendStatus.checking ? (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border bg-slate-50 text-slate-700 border-slate-200">
                <RotateCw className="w-3 h-3 text-slate-500 animate-spin" />
                <span>Pinging n8n...</span>
              </span>
            ) : backendStatus.state === 'active' ? (
              <button
                onClick={checkConnection}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-colors cursor-pointer bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                title={`n8n Production API Connected (${backendStatus.latencyMs}ms). Click to ping.`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>n8n API Connected ({backendStatus.latencyMs}ms)</span>
                <RotateCw className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            ) : backendStatus.state === 'workflow_inactive' ? (
              <button
                onClick={checkConnection}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-colors cursor-pointer bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                title={backendStatus.hint || 'n8n reached, but workflow is inactive. Toggle Active in top-right of n8n editor.'}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <Wifi className="w-3 h-3 text-amber-600" />
                <span>Workflow Inactive in n8n</span>
                <RotateCw className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            ) : backendStatus.state === 'test_mode_waiting' ? (
              <button
                onClick={checkConnection}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-colors cursor-pointer bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100"
                title={backendStatus.hint || "Click 'Execute workflow' button on n8n canvas to test."}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <Wifi className="w-3 h-3 text-blue-600" />
                <span>n8n Test Mode (Awaiting Run)</span>
                <RotateCw className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            ) : (
              <button
                onClick={checkConnection}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-colors cursor-pointer bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                title={backendStatus.hint || 'n8n backend unreachable. Click to retry ping.'}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <Wifi className="w-3 h-3 text-slate-500" />
                <span>n8n Offline</span>
                <RotateCw className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            )}

            {/* Non-punitive guarantee badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 rounded-full border border-slate-200 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Non-punitive • Supportive follow-up only</span>
            </div>

            {/* Mock vs Live Indicator */}
            <DataOriginBadge origin={dataOrigin} />

            {/* Role Switcher */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <UserCircle2 className="w-4 h-4 text-slate-400" />
              <label htmlFor="role-select" className="sr-only">Role</label>
              <select
                id="role-select"
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="counselor">Role: School Counselor (HITL)</option>
                <option value="teacher">Role: Class Teacher (10-A)</option>
                <option value="admin">Role: School Administrator</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Navigation Tabs (Top Header Bar) */}
      {onNavigate && (
        <div className="bg-slate-50/90 border-t border-slate-200 px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="max-w-7xl mx-auto flex items-center gap-1.5 py-2 min-w-max">
            {navTabs.map((tab) => {
              const isAllowed = tab.allowedRoles.includes(currentRole);
              if (!isAllowed) return null;
              const isActive = currentSection === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-transparent'
                  }`}
                >
                  <tab.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.highlight && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {tab.highlight}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
