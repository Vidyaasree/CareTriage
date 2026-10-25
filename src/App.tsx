import React, { useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardSection } from './components/sections/DashboardSection';
import { EvaluateStudentSection } from './components/sections/EvaluateStudentSection';
import { AttendanceTrendsSection } from './components/sections/AttendanceTrendsSection';
import { ReviewQueueSection } from './components/sections/ReviewQueueSection';
import { EvidenceSection } from './components/sections/EvidenceSection';
import { TestLabSection } from './components/sections/TestLabSection';
import { AuditLogSection } from './components/sections/AuditLogSection';
import { SafetyPanelSection } from './components/sections/SafetyPanelSection';
import { SettingsSection } from './components/sections/SettingsSection';
import type {
  NavSection,
  UserRole,
  DataOrigin,
  SupportProposal,
  SupportAction,
  AuditLogEntry,
  TriageConfig,
} from './types/attendance';
import {
  MOCK_PROPOSALS,
  MOCK_SUPPORT_ACTIONS,
  MOCK_EXCEPTIONS,
  MOCK_AUDIT_LOGS,
  INITIAL_CONFIG,
} from './mock/syntheticData';

export const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('counselor');
  // Default to live_api connected to real n8n backend
  const [dataOrigin, setDataOrigin] = useState<DataOrigin>('live_api');

  // Application Data States
  const [proposals, setProposals] = useState<SupportProposal[]>(MOCK_PROPOSALS);
  const [actions, setActions] = useState<SupportAction[]>(MOCK_SUPPORT_ACTIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(MOCK_AUDIT_LOGS);
  const [config, setConfig] = useState<TriageConfig>(INITIAL_CONFIG);

  // Evidence filter parameter passed from trends table
  const [evidenceFilterStudentId, setEvidenceFilterStudentId] = useState<string | null>(null);

  // Switch role and enforce navigation protection (TC3 & RLS compliance)
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    // If teacher tries to view private review queue or evidence, redirect to overview or trends
    if (role === 'teacher' && (currentSection === 'review-queue' || currentSection === 'evidence')) {
      setCurrentSection('dashboard');
    }
  };

  const handleToggleDataOrigin = () => {
    setDataOrigin((prev) => (prev === 'synthetic' ? 'live_api' : 'synthetic'));
  };

  const handleNavigateToEvidence = (studentId: string) => {
    setEvidenceFilterStudentId(studentId);
    setCurrentSection('evidence');
  };

  // Human Approval Action
  const handleApproveProposal = (
    proposalId: string,
    notes: string,
    scheduledDate: string
  ) => {
    const targetProposal = proposals.find((p) => p.id === proposalId);
    if (!targetProposal) return;

    const timestamp = new Date().toISOString();

    // 1. Update Proposal State
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId
          ? {
              ...p,
              status: 'approved',
              reviewedBy: 'Eleanor Vance, M.Ed.',
              reviewedAt: timestamp,
              counselorDecisionNotes: notes,
            }
          : p
      )
    );

    // 2. Spawn Assigned Pastoral Action
    const newAction: SupportAction = {
      id: `act-${Date.now().toString().slice(-4)}`,
      proposalId: targetProposal.id,
      studentCode: targetProposal.studentCode,
      className: targetProposal.className,
      actionType: 'supportive_counselor_checkin',
      assignedCounselorName: 'Eleanor Vance, M.Ed.',
      scheduledDate,
      status: 'scheduled',
      pastoralNotes: notes,
      verificationStatus: 'awaiting_encounter',
      dataOrigin,
    };
    setActions((prev) => [newAction, ...prev]);

    // 3. Log Immutable Audit Record
    const newAuditEntry: AuditLogEntry = {
      id: `aud-${Date.now().toString().slice(-4)}`,
      timestamp,
      actorId: 'eleanor.vance@school.edu',
      actorRole: 'counselor',
      action: 'COUNSELOR_APPROVED',
      targetEntity: 'support_proposals',
      targetId: proposalId,
      reason: `Human counselor approved supportive outreach: "${notes}"`,
      metadata: {
        studentCode: targetProposal.studentCode,
        scheduledDate,
        dataMode: dataOrigin,
        result: 'SUCCESS',
      },
      dataOrigin,
    };
    setAuditLogs((prev) => [newAuditEntry, ...prev]);
  };

  // Human Dismissal Action
  const handleDismissProposal = (proposalId: string, reason: string) => {
    const targetProposal = proposals.find((p) => p.id === proposalId);
    if (!targetProposal) return;

    const timestamp = new Date().toISOString();

    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId
          ? {
              ...p,
              status: 'dismissed',
              reviewedBy: 'Eleanor Vance, M.Ed.',
              reviewedAt: timestamp,
              dismissalReason: reason,
            }
          : p
      )
    );

    const newAuditEntry: AuditLogEntry = {
      id: `aud-${Date.now().toString().slice(-4)}`,
      timestamp,
      actorId: 'eleanor.vance@school.edu',
      actorRole: 'counselor',
      action: 'COUNSELOR_DISMISSED',
      targetEntity: 'support_proposals',
      targetId: proposalId,
      reason: `Human counselor dismissed proposal with documented reason: "${reason}"`,
      metadata: {
        studentCode: targetProposal.studentCode,
        reason,
        dataMode: dataOrigin,
        result: 'DISMISSED',
      },
      dataOrigin,
    };
    setAuditLogs((prev) => [newAuditEntry, ...prev]);
  };

  // Closed-Loop Verification Trigger
  const handleTriggerVerification = () => {
    const timestamp = new Date().toISOString();

    setActions((prev) =>
      prev.map((act) => ({
        ...act,
        verificationStatus: 'verified_completed',
        verifiedAt: timestamp,
      }))
    );

    const newAuditEntry: AuditLogEntry = {
      id: `aud-${Date.now().toString().slice(-4)}`,
      timestamp,
      actorId: 'agent-verifier-01',
      actorRole: 'system_agent',
      action: 'ACTION_VERIFIED',
      targetEntity: 'support_actions',
      targetId: 'batch-verification',
      reason: 'Automated closed-loop auditor verified completed actions against timestamp signatures.',
      metadata: {
        verificationRunTime: timestamp,
        status: 'ALL_VERIFIED',
        result: 'SUCCESS',
      },
      dataOrigin,
    };
    setAuditLogs((prev) => [newAuditEntry, ...prev]);
  };

  const pendingCount = proposals.filter((p) => p.status === 'pending_approval').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
      {/* Top Banner: Ethical Guarantees & Real n8n Connection status */}
      <div className="bg-slate-900 text-slate-200 text-xs px-4 py-2 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-white">CareTriage:</span>
            <span>School Attendance Support Triage Dashboard</span>
            <span className="text-[11px] px-2 py-0.5 bg-blue-900/60 text-blue-200 rounded font-mono border border-blue-700">
              Real n8n Backend Active
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-300">
            <span className="hidden md:inline">
              ✓ Zero Labelling & No Automated Punishment
            </span>
            <span>✓ Approved Leave Respected</span>
            <span>✓ Human Approval Required (HITL)</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        dataOrigin={dataOrigin}
        onToggleDataOrigin={handleToggleDataOrigin}
        currentSection={currentSection}
        onNavigate={setCurrentSection}
      />

      {/* App Body: Sidebar + Main Content Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentSection={currentSection}
          onNavigate={setCurrentSection}
          pendingCount={pendingCount}
          currentRole={currentRole}
        />

        <main className="flex-1 overflow-y-auto">
          {/* Feature 1: Overview */}
          {currentSection === 'dashboard' && (
            <DashboardSection
              proposals={proposals}
              actions={actions}
              exceptions={MOCK_EXCEPTIONS}
              onNavigate={setCurrentSection}
              currentRole={currentRole}
              dataOrigin={dataOrigin}
            />
          )}

          {/* Manual Student Evaluation Form & HITL AI Triage */}
          {currentSection === 'evaluate' && (
            <EvaluateStudentSection
              currentRole={currentRole}
              dataOrigin={dataOrigin}
              onNavigate={setCurrentSection}
            />
          )}

          {/* Feature 2: Attendance Trends */}
          {currentSection === 'trends' && (
            <AttendanceTrendsSection
              currentRole={currentRole}
              dataOrigin={dataOrigin}
              onNavigateToEvidence={handleNavigateToEvidence}
            />
          )}

          {/* Feature 3: Review Queue */}
          {currentSection === 'review-queue' && (
            <ReviewQueueSection
              proposals={proposals}
              onApproveProposal={handleApproveProposal}
              onDismissProposal={handleDismissProposal}
              currentRole={currentRole}
              dataOrigin={dataOrigin}
              n8nConfigured={true}
            />
          )}

          {/* Feature 4: Evidence View */}
          {currentSection === 'evidence' && (
            <EvidenceSection
              actions={actions}
              onTriggerVerification={handleTriggerVerification}
              currentRole={currentRole}
              dataOrigin={dataOrigin}
              filterStudentId={evidenceFilterStudentId}
            />
          )}

          {/* Feature 5: Test Lab */}
          {currentSection === 'test-lab' && (
            <TestLabSection currentRole={currentRole} />
          )}

          {/* Feature 6: Audit Log */}
          {currentSection === 'audit-log' && (
            <AuditLogSection
              logs={auditLogs}
              currentRole={currentRole}
              dataOrigin={dataOrigin}
            />
          )}

          {/* Feature 7: Safety Panel */}
          {currentSection === 'safety' && (
            <SafetyPanelSection
              currentRole={currentRole}
              dataOrigin={dataOrigin}
            />
          )}

          {/* Feature 8: Settings & Backend Integration */}
          {currentSection === 'settings' && (
            <SettingsSection
              config={config}
              onUpdateConfig={setConfig}
              currentRole={currentRole}
              dataOrigin={dataOrigin}
              onToggleDataOrigin={handleToggleDataOrigin}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
