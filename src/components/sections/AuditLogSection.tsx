import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Filter,
  Search,
  Eye,
  RotateCw,
  AlertTriangle,
} from 'lucide-react';
import type { AuditLogEntry, UserRole, DataOrigin } from '../../types/attendance';
import { DataOriginBadge } from '../common/DataOriginBadge';
import { Modal } from '../common/Modal';
import { n8nApi } from '../../services/n8nApi';

interface AuditLogSectionProps {
  logs: AuditLogEntry[];
  currentRole: UserRole;
  dataOrigin: DataOrigin;
  onRefreshData?: () => void;
}

export const AuditLogSection: React.FC<AuditLogSectionProps> = ({
  logs: initialLogs,
  currentRole: _currentRole,
  dataOrigin,
  onRefreshData,
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await n8nApi.getAuditLogs();
      if (res.logs && res.logs.length > 0) {
        const mappedLogs: AuditLogEntry[] = res.logs.map((l: any) => {
          let metadataObj = {};
          if (l.metadata) {
            try {
              metadataObj = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : l.metadata;
            } catch {
              metadataObj = { raw: l.metadata };
            }
          }

          return {
            id: l.log_id || l.id,
            timestamp: l.timestamp || new Date().toISOString(),
            actorId: l.actor || l.actorId || 'system_agent',
            actorRole: l.actor_role || l.actorRole || 'counselor',
            action: l.action || 'EVALUATION_CYCLE_RUN',
            targetEntity: l.related_entity || l.targetEntity || 'triage',
            targetId: l.related_record_id || l.targetId || 'triage-run',
            reason: l.reason || 'Operational compliance evaluation',
            metadata: {
              ...metadataObj,
              result: l.result || 'SUCCESS',
            },
            dataOrigin: 'live_api' as DataOrigin,
          };
        });
        setLogs(mappedLogs);
      }
    } catch (err: any) {
      setError(`Failed to fetch audit logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = async () => {
    await fetchLogs();
    if (onRefreshData) onRefreshData();
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (
      searchQuery &&
      !log.reason.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !log.targetId.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !log.actorId.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !log.id.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'COUNSELOR_APPROVED':
      case 'ACTION_VERIFIED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'PROPOSAL_GENERATED':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'EXCEPTION_EXCLUDED':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'UNAUTHORIZED_ACCESS_BLOCKED':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'COUNSELOR_DISMISSED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getResultBadgeColor = (result: string) => {
    switch (result) {
      case 'SUCCESS':
        return 'bg-emerald-100 text-emerald-800';
      case 'EXCLUDED':
        return 'bg-amber-100 text-amber-800';
      case 'BLOCKED_BY_RLS':
        return 'bg-rose-100 text-rose-800';
      case 'DISMISSED':
        return 'bg-slate-200 text-slate-700';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Immutable Compliance Audit Trail
            </h2>
            <DataOriginBadge origin={dataOrigin} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Complete chronological log of evaluations, exception exclusions, counselor approvals, and closed-loop verification checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Append-Only • Tamper Evident</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Refresh Logs from n8n backend"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event, actor, student code, or rationale..."
            className="w-full pl-9 pr-4 py-2 bg-white text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full sm:w-auto text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer font-medium"
          >
            <option value="all">All Actions</option>
            <option value="PROPOSAL_GENERATED">PROPOSAL_GENERATED</option>
            <option value="EXCEPTION_EXCLUDED">EXCEPTION_EXCLUDED (Rule 102)</option>
            <option value="COUNSELOR_APPROVED">COUNSELOR_APPROVED</option>
            <option value="COUNSELOR_DISMISSED">COUNSELOR_DISMISSED</option>
            <option value="ACTION_VERIFIED">ACTION_VERIFIED</option>
            <option value="UNAUTHORIZED_ACCESS_BLOCKED">UNAUTHORIZED_ACCESS_BLOCKED (TC3)</option>
          </select>
        </div>
      </div>

      {/* 5 Explicitly Required Columns Table: Event, Actor, Timestamp, Action, Result */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">1. Event</th>
                <th className="py-3 px-4">2. Actor</th>
                <th className="py-3 px-4">3. Timestamp</th>
                <th className="py-3 px-4">4. Action</th>
                <th className="py-3 px-4">5. Result</th>
                <th className="py-3 px-4">Decision Reason & Target</th>
                <th className="py-3 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No audit records found matching the active criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const resultStr = String(log.metadata?.result || 'SUCCESS');

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* 1. Event */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {log.id}
                      </td>

                      {/* 2. Actor */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {log.actorId}
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize">
                          Role: {log.actorRole}
                        </span>
                      </td>

                      {/* 3. Timestamp */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      {/* 4. Action */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* 5. Result */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${getResultBadgeColor(
                            resultStr
                          )}`}
                        >
                          {resultStr}
                        </span>
                      </td>

                      {/* Reason & Target */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-slate-800 line-clamp-2 leading-relaxed">
                          {log.reason}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          Target: {log.targetEntity} • {log.targetId}
                        </span>
                      </td>

                      {/* Payload Inspector Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="View complete cryptographic log entry"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`Audit Record: ${selectedLog.id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">
                  Actor Identity:
                </span>
                <span className="font-mono text-slate-800 font-bold">
                  {selectedLog.actorId} ({selectedLog.actorRole})
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">
                  Timestamp:
                </span>
                <span className="font-mono text-slate-800">
                  {selectedLog.timestamp}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">
                  Action:
                </span>
                <span className="font-mono text-blue-700 font-bold">
                  {selectedLog.action}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">
                  Result Status:
                </span>
                <span className="font-mono text-emerald-700 font-bold">
                  {String(selectedLog.metadata?.result || 'SUCCESS')}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block text-[11px] mb-1">
                Factual Rationale / Decision Context:
              </span>
              <p className="p-3 bg-white border border-slate-200 rounded-xl text-slate-800 leading-relaxed font-medium">
                {selectedLog.reason}
              </p>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block text-[11px] mb-1">
                Structured Metadata Payload:
              </span>
              <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto">
                <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs cursor-pointer font-medium"
              >
                Close Entry
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
