import React from 'react';
import { Database, Wifi } from 'lucide-react';
import type { DataOrigin } from '../../types/attendance';

interface DataOriginBadgeProps {
  origin: DataOrigin;
  className?: string;
}

export const DataOriginBadge: React.FC<DataOriginBadgeProps> = ({ origin, className = '' }) => {
  if (origin === 'synthetic') {
    return (
      <span
        title="This data is synthetically generated for hackathon prototyping and evaluation."
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
      >
        <Database className="w-3 h-3 text-amber-600" />
        <span>MOCK DATA</span>
      </span>
    );
  }

  return (
    <span
      title="Data retrieved from live backend API / Supabase."
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 ${className}`}
    >
      <Wifi className="w-3 h-3 text-emerald-600" />
      <span>LIVE API</span>
    </span>
  );
};
