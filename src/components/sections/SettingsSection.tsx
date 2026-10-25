import React, { useState } from 'react';
import {
  Sliders,
  Workflow,
  Save,
  CheckCircle2,
  Wifi,
  RotateCw,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { TriageConfig, UserRole, DataOrigin } from '../../types/attendance';
import { DataOriginBadge } from '../common/DataOriginBadge';
import {
  n8nApi,
  DEFAULT_PRODUCTION_WEBHOOK_URL,
  DEFAULT_TEST_WEBHOOK_URL,
  DEFAULT_LOCAL_PROXY_URL,
  type HealthCheckResult,
} from '../../services/n8nApi';

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
  const [connectionTestResult, setConnectionTestResult] = useState<HealthCheckResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    n8nApi.setBaseUrl(formData.n8nWebhookUrl || DEFAULT_PRODUCTION_WEBHOOK_URL);
    onUpdateConfig(formData);
    setSaveStatus('Triage configuration updated and n8n base endpoint saved.');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleApplyPreset = (url: string) => {
    setFormData((prev) => ({ ...prev, n8nWebhookUrl: url }));
    n8nApi.setBaseUrl(url);
    setConnectionTestResult(null);
  };

  const handleTestBackend = async () => {
    setIsTesting(true);
    setConnectionTestResult(null);
    n8nApi.setBaseUrl(formData.n8nWebhookUrl || DEFAULT_PRODUCTION_WEBHOOK_URL);

    try {
      const result = await n8nApi.checkHealth();
      setConnectionTestResult(result);
    } catch (err: any) {
      setConnectionTestResult({
        ok: false,
        reachable: false,
        workflowActive: false,
        status: 0,
        latencyMs: 0,
        state: 'offline',
        message: err.message || 'Connection test failed',
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-slate-700">
                  n8n Webhook Target URL
                </label>
                <span className="text-[11px] text-slate-500 font-medium">Quick Presets:</span>
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2 mb-2.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(DEFAULT_PRODUCTION_WEBHOOK_URL)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition cursor-pointer border ${
                    formData.n8nWebhookUrl === DEFAULT_PRODUCTION_WEBHOOK_URL
                      ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🚀 Production Webhook
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(DEFAULT_TEST_WEBHOOK_URL)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition cursor-pointer border ${
                    formData.n8nWebhookUrl === DEFAULT_TEST_WEBHOOK_URL
                      ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🧪 Test Webhook (Canvas)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(DEFAULT_LOCAL_PROXY_URL)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition cursor-pointer border ${
                    formData.n8nWebhookUrl === DEFAULT_LOCAL_PROXY_URL
                      ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  💻 Local Proxy (/webhook)
                </button>
              </div>

              <input
                type="text"
                value={formData.n8nWebhookUrl}
                onChange={(e) =>
                  setFormData({ ...formData, n8nWebhookUrl: e.target.value })
                }
                placeholder="https://vidyaa25.app.n8n.cloud/webhook/triage-evaluate"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-500 mt-1.5 block">
                Production Webhook URL: <code>https://vidyaa25.app.n8n.cloud/webhook/triage-evaluate</code> (HTTP POST).
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
                <span>{isTesting ? 'Probing Webhook Target...' : 'Test Backend Connection (Live Probe)'}</span>
              </button>
            </div>

            {/* Diagnostic feedback card */}
            {connectionTestResult && (
              <div
                className={`p-4 rounded-xl text-xs border space-y-2 ${
                  connectionTestResult.state === 'active'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : connectionTestResult.state === 'workflow_inactive'
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : connectionTestResult.state === 'test_mode_waiting'
                    ? 'bg-blue-50 border-blue-300 text-blue-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {connectionTestResult.state === 'active' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : connectionTestResult.state === 'workflow_inactive' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : connectionTestResult.state === 'test_mode_waiting' ? (
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold text-xs flex items-center gap-2">
                      <span>{connectionTestResult.message}</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.2 bg-white/70 rounded border border-current">
                        HTTP {connectionTestResult.status} ({connectionTestResult.latencyMs}ms)
                      </span>
                    </div>

                    {connectionTestResult.hint && (
                      <p className="text-[11px] leading-relaxed bg-white/80 p-2.5 rounded-lg border border-current font-mono">
                        <strong>Diagnosis & Action:</strong> {connectionTestResult.hint}
                      </p>
                    )}

                    {connectionTestResult.state === 'workflow_inactive' && (
                      <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2.5 rounded-lg border border-amber-200">
                        <strong>How to solve in 5 seconds:</strong> In your n8n Cloud editor at{' '}
                        <a
                          href="https://vidyaa25.app.n8n.cloud"
                          target="_blank"
                          rel="noreferrer"
                          className="underline font-bold"
                        >
                          vidyaa25.app.n8n.cloud
                        </a>
                        , open the CareTriage workflow and switch the top-right toggle from <strong>Inactive</strong> to{' '}
                        <strong>Active</strong>.
                      </div>
                    )}
                  </div>
                </div>
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
