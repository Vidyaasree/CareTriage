import React, { useState } from 'react';
import {
  Sliders,
  Workflow,
  Save,
  CheckCircle2,
  Wifi,
  RotateCw,
  AlertTriangle,
} from 'lucide-react';
import type { TriageConfig, UserRole, DataOrigin } from '../../types/attendance';
import { DataOriginBadge } from '../common/DataOriginBadge';
import { n8nApi } from '../../services/n8nApi';

interface SettingsSectionProps {
  config: TriageConfig;
  onUpdateConfig: (newConfig: TriageConfig) => void;
  currentRole: UserRole;
  dataOrigin: DataOrigin;
  onToggleDataOrigin: () => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  config,
  onUpdateConfig,
  currentRole: _currentRole,
  dataOrigin,
  onToggleDataOrigin,
}) => {
  const [formData, setFormData] = useState<TriageConfig>({
    ...config,
    n8nWebhookUrl: n8nApi.getBaseUrl(),
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    ok: boolean;
    text: string;
    latencyMs?: number;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    n8nApi.setBaseUrl(formData.n8nWebhookUrl || '/webhook');
    onUpdateConfig(formData);
    setSaveStatus('Triage configuration updated and n8n base endpoint saved.');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleTestBackend = async () => {
    setIsTesting(true);
    setConnectionTestResult(null);

    const targetUrl = formData.n8nWebhookUrl.trim() || '/webhook';
    const start = performance.now();

    try {
      const pingUrl = targetUrl.startsWith('http')
        ? new URL('/healthz', targetUrl).toString()
        : '/healthz';

      const res = await fetch(pingUrl, { method: 'GET' });
      const latency = Math.round(performance.now() - start);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setConnectionTestResult({
          ok: true,
          latencyMs: latency,
          text: `Real HTTP 200 OK (${latency}ms): Service "${data.service || 'n8n-care-triage-backend'}" is active. Ready to evaluate triage webhooks.`,
        });
      } else {
        setConnectionTestResult({
          ok: false,
          latencyMs: latency,
          text: `Real HTTP ${res.status}: Backend responded with non-200 status code. Check endpoint path.`,
        });
      }
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      setConnectionTestResult({
        ok: false,
        latencyMs: latency,
        text: `Connection Failed (${latency}ms): ${err.message || 'Unable to connect to remote server'}. Ensure backend is running.`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Triage Configuration & n8n Backend Integration
            </h2>
            <DataOriginBadge origin={dataOrigin} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configurable thresholds for sliding windows, absence triggers, and real n8n webhook API targets.
          </p>
        </div>

        <button
          onClick={onToggleDataOrigin}
          className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors shadow-2xs cursor-pointer flex items-center gap-2"
        >
          <Wifi className="w-3.5 h-3.5 text-blue-600" />
          <span>Active Origin: {dataOrigin === 'synthetic' ? 'Mock Fallback' : 'Real n8n API'}</span>
        </button>
      </div>

      {saveStatus && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Deterministic Triage Thresholds */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Deterministic Attendance Thresholds (Configurable)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Sliding Observation Window (Days)
              </label>
              <input
                type="number"
                min={5}
                max={30}
                value={formData.slidingWindowDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slidingWindowDays: parseInt(e.target.value, 10) || 10,
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Standard window: 10 school operational days.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Absence Threshold Count (Rule 103 Trigger)
              </label>
              <input
                type="number"
                min={3}
                max={15}
                value={formData.absenceThresholdCount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    absenceThresholdCount: parseInt(e.target.value, 10) || 8,
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Unexcused sessions required to trigger counselor proposal (TC1).
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: n8n Backend Webhook Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Real n8n Webhook API Configuration
              </h3>
            </div>
            <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
              Live Connection
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                n8n Webhook Base URL
              </label>
              <input
                type="text"
                value={formData.n8nWebhookUrl}
                onChange={(e) =>
                  setFormData({ ...formData, n8nWebhookUrl: e.target.value })
                }
                placeholder="e.g. /webhook or http://localhost:5678/webhook"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Default <code>/webhook</code> proxies directly through Vite or points to <code>http://localhost:5678/webhook</code>.
              </span>
            </div>

            {/* Live Connection Test Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestBackend}
                disabled={isTesting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Pinging Real Backend...' : 'Ping n8n Backend (Health Check)'}</span>
              </button>
            </div>

            {/* Test result feedback */}
            {connectionTestResult && (
              <div
                className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
                  connectionTestResult.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {connectionTestResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span className="font-mono leading-relaxed">{connectionTestResult.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Submit Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
