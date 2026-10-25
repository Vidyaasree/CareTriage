import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Inbox,
  FileCheck2,
  FlaskConical,
  ScrollText,
  ShieldCheck,
  Settings as SettingsIcon,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import type { NavSection, UserRole } from '../../types/attendance';

interface SidebarProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
  pendingCount: number;
  currentRole: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onNavigate,
  pendingCount,
  currentRole,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavSection,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
      allowedRoles: ['counselor', 'teacher', 'admin'],
    },
    {
      id: 'evaluate' as NavSection,
      label: 'Evaluate Student',
      icon: UserCheck,
      badge: 'n8n Live',
      badgeColor: 'bg-blue-100 text-blue-700 font-mono',
      allowedRoles: ['counselor', 'teacher', 'admin'],
    },
    {
      id: 'trends' as NavSection,
      label: 'Attendance Trends',
      icon: TrendingUp,
      badge: null,
      allowedRoles: ['counselor', 'teacher', 'admin'],
    },
    {
      id: 'review-queue' as NavSection,
      label: 'Review Queue',
      icon: Inbox,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-blue-100 text-blue-700',
      allowedRoles: ['counselor', 'admin'], // Blocked for teacher to prevent classroom bias!
    },
    {
      id: 'evidence' as NavSection,
      label: 'Evidence View',
      icon: FileCheck2,
      badge: null,
      allowedRoles: ['counselor', 'admin'],
    },
    {
      id: 'test-lab' as NavSection,
      label: 'Test Lab (TC1-TC4)',
      icon: FlaskConical,
      badge: 'Interactive',
      badgeColor: 'bg-purple-100 text-purple-700 font-mono',
      allowedRoles: ['counselor', 'teacher', 'admin'],
    },
    {
      id: 'audit-log' as NavSection,
      label: 'Audit Log',
      icon: ScrollText,
      badge: null,
      allowedRoles: ['admin', 'counselor'],
    },
    {
      id: 'safety' as NavSection,
      label: 'Safety Panel',
      icon: ShieldCheck,
      badge: '5 Policies',
      badgeColor: 'bg-emerald-100 text-emerald-800 font-mono',
      allowedRoles: ['counselor', 'teacher', 'admin'],
    },
    {
      id: 'settings' as NavSection,
      label: 'Backend & Settings',
      icon: SettingsIcon,
      badge: null,
      allowedRoles: ['counselor', 'admin', 'teacher'],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Navigation Links */}
      <nav className="p-4 space-y-1.5 flex-1">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
          Dashboard Features
        </div>

        {navItems.map((item) => {
          const isAllowed = item.allowedRoles.includes(currentRole);
          const isActive = currentSection === item.id;

          if (!isAllowed) {
            return (
              <div
                key={item.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 bg-slate-50/50 cursor-not-allowed text-xs border border-transparent"
                title={`Access Restricted: Available only to ${item.allowedRoles.join(', ')}`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 opacity-40" />
                  <span className="font-medium line-through opacity-60">
                    {item.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">
                  Restricted
                </span>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    item.badgeColor || 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Role Notice & HITL Enforcement Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Active Session</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {currentRole === 'teacher' ? (
            <span className="text-amber-700 font-medium">
              Teacher Mode: Review queue is quarantined to protect students from classroom bias (TC3).
            </span>
          ) : currentRole === 'counselor' ? (
            <span className="text-blue-700 font-medium">
              Counselor Mode: Full pastoral review authorized. Human approval required before outreach.
            </span>
          ) : (
            <span className="text-slate-700 font-medium">
              Admin Mode: Institutional oversight and immutable audit logging enabled.
            </span>
          )}
        </p>

        {currentRole === 'teacher' && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>Class 10A roster access only. Cross-class queries strictly blocked.</span>
          </div>
        )}
      </div>
    </aside>
  );
};
