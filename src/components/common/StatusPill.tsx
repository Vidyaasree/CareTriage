import React from 'react';
import type { ProposalStatus } from '../../types/attendance';
import { Clock, CheckCircle2, XCircle, ShieldCheck, PlayCircle } from 'lucide-react';

interface StatusPillProps {
  status: ProposalStatus | 'scheduled' | 'completed' | 'verified_completed' | 'awaiting_encounter' | 'overdue_unverified';
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'pending_approval':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Pending Counsellor Review</span>
        </span>
      );

    case 'approved':
    case 'scheduled':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Support Scheduled</span>
        </span>
      );

    case 'dismissed':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300 ${className}`}>
          <XCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>Dismissed (Documented)</span>
        </span>
      );

    case 'action_executed':
    case 'completed':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
          <PlayCircle className="w-3.5 h-3.5 text-purple-600" />
          <span>Outreach Executed</span>
        </span>
      );

    case 'verified_completed':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-800 border border-teal-300 ${className}`}>
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Verified Closed-Loop</span>
        </span>
      );

    case 'awaiting_encounter':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 ${className}`}>
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Awaiting Pastoral Note</span>
        </span>
      );

    case 'overdue_unverified':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Verification Overdue</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 ${className}`}>
          {status}
        </span>
      );
  }
};
