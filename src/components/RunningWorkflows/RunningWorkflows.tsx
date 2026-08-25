import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RunningWorkflows.css';

const PAGE = '/assets/workflows-page';

const workflows = [
  {
    id: 1, name: 'Eligibility continuity', workspace: 'Revenue Cycle', org: 'Riverside Clinical Ops', status: 'Active', activity: '12 cases open · updated 14m ago',
    desc: 'Monitors payer eligibility status and flags lapses before they disrupt care or billing.',
    impact: '41 coverage gaps caught early',
    trigger: 'Nightly and before each scheduled appointment',
    context: ['Eligibility records', 'Schedule', 'Payer roster'],
    agentWork: ['Verify current eligibility', 'Compare to prior status', 'Flag changed or lapsed coverage', 'Route to billing or care team'],
    actions: ['Create billing task', 'Alert care coordinator'],
  },
  {
    id: 2, name: 'Authorization exhaustaion', workspace: 'Clinical', org: 'Riverside Clinical Ops', status: 'Active', activity: '3 cases open · updated 2m ago',
    desc: 'Finds clients running out of authorized units and assembles continued care evidence',
    impact: '23 auth lapses avoided',
    trigger: 'Daily and after every completed service',
    context: ['Authorizations', 'Schedule', 'Progress notes', 'Treatment plans', 'Payer policy'],
    agentWork: ['Calculate remaining units', 'Project exhaustion date', 'Check evidence', 'Route next action'],
    actions: ['Create RCM task', 'Project exhaustion date'],
  },
  {
    id: 3, name: 'Golden Thread alignment', workspace: 'Compliance', org: 'Riverside Clinical Ops', status: 'Active', activity: '4 corrections routed today',
    desc: 'Checks that progress notes reference treatment goals and flags documentation gaps.',
    impact: '4 corrections routed today',
    trigger: 'After every signed progress note',
    context: ['Progress notes', 'Treatment plans', 'Diagnosis'],
    agentWork: ['Parse note for goal references', 'Match to active treatment plan', 'Score alignment', 'Flag and route gaps'],
    actions: ['Create documentation task', 'Notify clinician'],
  },
  {
    id: 4, name: 'Safety plan required', workspace: 'Compliance', org: 'Riverside Clinical Ops', status: 'Needs attention', activity: '2 policy exceptions flagged',
    desc: 'Identifies clients with risk language in notes who are missing an active safety plan.',
    impact: '2 policy exceptions flagged',
    trigger: 'After each session note with risk indicators',
    context: ['Progress notes', 'Safety plans', 'Risk assessments'],
    agentWork: ['Detect risk language', 'Check for active safety plan', 'Flag missing documentation', 'Escalate to supervisor'],
    actions: ['Create compliance task', 'Notify clinical supervisor'],
  },
  {
    id: 5, name: 'Engagement & dropout risk', workspace: 'Clinical', org: 'Riverside Clinical Ops', status: 'Testing', activity: '30-day backtest running',
    desc: 'Predicts dropout risk based on attendance patterns and engagement signals.',
    impact: 'Backtest in progress',
    trigger: 'Weekly per active client',
    context: ['Attendance', 'Progress notes', 'Scheduling history'],
    agentWork: ['Score engagement signals', 'Calculate missed visit rate', 'Predict dropout risk', 'Route outreach'],
    actions: ['Create outreach task', 'Alert care manager'],
  },
  {
    id: 6, name: 'Medicaid redetermination', workspace: 'Revenue Cycle', org: 'Riverside Clinical Ops', status: 'Draft', activity: 'awaiting review',
    desc: 'Tracks Medicaid renewal windows and prepares documentation for timely redetermination.',
    impact: 'Not yet live',
    trigger: 'Monthly, 60 days before renewal date',
    context: ['Eligibility records', 'Payer roster', 'Client demographics'],
    agentWork: ['Identify upcoming renewals', 'Check required documentation', 'Assemble renewal packet', 'Route to billing'],
    actions: ['Create renewal task', 'Notify billing team'],
  },
  {
    id: 7, name: 'Denial triage', workspace: 'Revenue Cycle', org: 'Riverside Clinical Ops', status: 'Paused', activity: 'awaiting review',
    desc: 'Categorizes denied claims by root cause and routes them to the appropriate team for appeal.',
    impact: 'Not yet live',
    trigger: 'On each new denial received',
    context: ['Claims', 'EOBs', 'Payer policy', 'Prior authorizations'],
    agentWork: ['Parse denial reason code', 'Classify root cause', 'Identify appeal path', 'Route to correct queue'],
    actions: ['Create appeal task', 'Notify billing specialist'],
  },
];

const tabs = ['All', 'Needs Attention', 'Active', 'Testing', 'Draft', 'Paused'];

const statusFilter: Record<string, string> = {
  'Needs Attention': 'Needs attention',
  Active: 'Active',
  Testing: 'Testing',
  Draft: 'Draft',
  Paused: 'Paused',
};

const workspaceColors: Record<string, string> = {
  'Revenue Cycle': 'var(--color-deeppurple-800, #4527a0)',
  Clinical: 'var(--color-blue-900, #0d47a1)',
  Compliance: 'var(--color-cyan-900, #006064)',
};

const workspaceIcon: Record<string, string> = {
  'Revenue Cycle': `${PAGE}/rcm-logo.svg`,
  Clinical: `${PAGE}/clinical-logo.svg`,
  Compliance: `${PAGE}/compliance-logo.svg`,
};

const statusConfig: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  Active: {
    bg: '#e8f5e9', color: '#2e7d32',
    icon: <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#2e7d32"/></svg>,
  },
  'Needs attention': {
    bg: '#fdecea', color: '#c62828',
    icon: <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#c62828"/></svg>,
  },
  Testing: {
    bg: '#e3f2fd', color: '#1565c0',
    icon: <span style={{ fontSize: 10 }}>⚗</span>,
  },
  Draft: {
    bg: '#f5f5f5', color: '#616161',
    icon: <span style={{ fontSize: 10 }}>▭</span>,
  },
  Paused: {
    bg: '#f5f5f5', color: '#616161',
    icon: <span style={{ fontSize: 10 }}>⏸</span>,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig['Draft'];
  return (
    <span className="rw-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="rw-status-icon">{cfg.icon}</span>
      {status}
    </span>
  );
}

function WorkflowIcon({ workspace }: { workspace: string }) {
  const color = workspaceColors[workspace] || '#9e9e9e';
  const icon = workspaceIcon[workspace];
  return (
    <div className="rw-row-icon" style={{ background: color + '18' }}>
      {icon ? <img src={icon} alt="" width="16" height="16" /> : workspace[0]}
    </div>
  );
}

type Workflow = typeof workflows[0];

function DetailPanel({ workflow }: { workflow: Workflow }) {
  const workspaceColor = workspaceColors[workflow.workspace] || '#9e9e9e';
  return (
    <div className="rw-detail">
      <div className="rw-detail-header">
        <span className="rw-detail-workspace-chip" style={{ background: workspaceColor + '18', color: workspaceColor }}>
          {workflow.workspace}
        </span>
        <StatusBadge status={workflow.status} />
        <button className="rw-detail-menu">···</button>
      </div>
      <h2 className="rw-detail-title">{workflow.name}</h2>
      <p className="rw-detail-desc">{workflow.desc}</p>
      <div className="rw-impact-card">
        <div>
          <div className="rw-impact-label">Measured impact</div>
          <div className="rw-impact-value">{workflow.impact}</div>
        </div>
        <span className="rw-impact-icon">🏆</span>
      </div>
      <div className="rw-detail-fields">
        <div className="rw-field">
          <span className="rw-field-label">Trigger</span>
          <span className="rw-field-value">{workflow.trigger}</span>
        </div>
        <div className="rw-field">
          <span className="rw-field-label">Context</span>
          <div className="rw-tag-list">
            {workflow.context.map(t => (
              <span key={t} className="rw-tag">{t}</span>
            ))}
          </div>
        </div>
        <div className="rw-field">
          <span className="rw-field-label">Agent work</span>
          <ol className="rw-numbered-list">
            {workflow.agentWork.map(step => <li key={step}>{step}</li>)}
          </ol>
        </div>
        <div className="rw-field">
          <span className="rw-field-label">Actions</span>
          <ul className="rw-bullet-list">
            {workflow.actions.map(a => <li key={a}>{a}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function RunningWorkflows() {
  const [selectedId, setSelectedId] = useState(2);
  const [activeTab, setActiveTab] = useState('All');
  const navigate = useNavigate();

  const selectedWorkflow = workflows.find(w => w.id === selectedId) || workflows[1];

  const filtered = activeTab === 'All'
    ? workflows
    : workflows.filter(w => w.status === (statusFilter[activeTab] || activeTab));

  return (
    <div className="rw-page">
      {/* Page header */}
      <div className="rw-header">
        <h1 className="rw-title">Workflows Registry</h1>
        <div className="rw-header-actions">
          <button className="rw-btn-outline" type="button" onClick={() => navigate('/workflows/new')}>
            Create a workflow
          </button>
          <button className="rw-btn-icon" type="button" aria-label="More options">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="rw-stats">
        {[
          { label: 'Active workflows', value: '8', sub: 'across 3 workspaces' },
          { label: 'work created today', value: '94', sub: '61 completed automatically' },
          { label: 'awaiting people', value: '9', sub: 'human judgment or action' },
          { label: 'completed on time', value: '84%', sub: '+7 points this quarter' },
        ].map(s => (
          <div className="rw-stat-card" key={s.label}>
            <div className="rw-stat-label">{s.label}</div>
            <div className="rw-stat-value">{s.value}</div>
            <div className="rw-stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="rw-main">
        {/* Left: list */}
        <div className="rw-list-section">
          <div className="rw-tabs">
            {tabs.map(tab => (
              <button
                key={tab}
                className={`rw-tab${activeTab === tab ? ' rw-tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="rw-list">
            {filtered.map(w => (
              <div
                key={w.id}
                className={`rw-row${selectedId === w.id ? ' rw-row--selected' : ''}`}
                onClick={() => setSelectedId(w.id)}
              >
                <WorkflowIcon workspace={w.workspace} />
                <div className="rw-row-info">
                  <div className="rw-row-name">{w.name}</div>
                  <div className="rw-row-workspace" style={{ color: workspaceColors[w.workspace] }}>
                    {w.workspace} · {w.org}
                  </div>
                </div>
                <StatusBadge status={w.status} />
                <div className="rw-row-activity">{w.activity}</div>
                <span className="rw-chevron">›</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: detail */}
        <DetailPanel workflow={selectedWorkflow} />
      </div>
    </div>
  );
}
