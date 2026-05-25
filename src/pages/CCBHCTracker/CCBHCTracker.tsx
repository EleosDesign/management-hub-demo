import { useState } from 'react';
import './CCBHCTracker.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type MedicaidStatus = 'Active' | 'At Risk' | 'Lost';
type TriggerStatus = 'triggered' | 'not-triggered';

interface Client {
  id: string;
  initials: string;
  medicaidStatus: MedicaidStatus;
  treatmentPlanEnd: string;
  lastServiceDate: string;
  daysRemaining: number;
  riskReason: string;
  status: TriggerStatus;
  triggeredDate?: string;
  alert?: 'medicaid-loss' | 'wrong-payer';
  retroWindow?: number;
}

interface ClinicianRecord {
  name: string;
  credential: string;
  team: string;
  county: string;
  caseload: number;
  triggeredCount: number;
  atRiskCount: number;
  notTriggered: Client[];
  triggered: Client[];
}

interface TeamRow {
  team: string;
  county: string;
  caseload: number;
  triggeredPct: number;
  atRisk: number;
  trend: 'up' | 'down' | 'flat';
}

interface OrgAtRiskClient {
  id: string;
  team: string;
  primaryRisk: string;
  daysRemaining: number;
  action: string;
}

interface ActivityItem {
  time: string;
  text: string;
  type: 'email' | 'eligibility' | 'audit' | 'routing';
}

// ─── Per-clinician data ───────────────────────────────────────────────────────

const CLINICIANS: ClinicianRecord[] = [
  {
    name: 'Morgan Reyes', credential: 'LCSW', team: 'Team 4', county: 'Tulsa County',
    caseload: 32, triggeredCount: 27, atRiskCount: 3,
    notTriggered: [
      {
        id: 'CL-10238', initials: 'JS', medicaidStatus: 'Lost',
        treatmentPlanEnd: 'Jun 14, 2026', lastServiceDate: 'May 8, 2026',
        daysRemaining: 6, riskReason: 'Lost Medicaid May 12 — retro window: 8 days remaining',
        status: 'not-triggered', alert: 'medicaid-loss', retroWindow: 8,
      },
      {
        id: 'CL-10519', initials: 'AR', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Jun 3, 2026', lastServiceDate: 'Apr 30, 2026',
        daysRemaining: 6, riskReason: 'Treatment plan expires in 14 days — no appointment scheduled',
        status: 'not-triggered',
      },
      {
        id: 'CL-10774', initials: 'MW', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Aug 20, 2026', lastServiceDate: 'May 8, 2026',
        daysRemaining: 6, riskReason: 'Wrong payer billed — needs CCBHC triggering service',
        status: 'not-triggered', alert: 'wrong-payer',
      },
      {
        id: 'CL-11042', initials: 'TC', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Jul 7, 2026', lastServiceDate: 'May 3, 2026',
        daysRemaining: 6, riskReason: 'Payer change pending — PA not yet approved',
        status: 'not-triggered',
      },
      {
        id: 'CL-11198', initials: 'LB', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Sep 12, 2026', lastServiceDate: 'Apr 22, 2026',
        daysRemaining: 6, riskReason: 'No appointment scheduled — client unreachable',
        status: 'not-triggered',
      },
    ],
    triggered: [
      { id: 'CL-10102', initials: 'KP', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 5, 2026',  lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-10145', initials: 'RM', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 18, 2026', lastServiceDate: 'May 20, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 20' },
      { id: 'CL-10203', initials: 'GH', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 1, 2026',  lastServiceDate: 'May 19, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 19' },
      { id: 'CL-10311', initials: 'NF', medicaidStatus: 'Active', treatmentPlanEnd: 'Jun 30, 2026', lastServiceDate: 'May 17, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 17' },
      { id: 'CL-10402', initials: 'DW', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 14, 2026', lastServiceDate: 'May 15, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 15' },
    ],
  },
  {
    name: 'Avery Patel', credential: 'LPC', team: 'Team 2', county: 'Pawnee County',
    caseload: 28, triggeredCount: 26, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-20441', initials: 'RK', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Jul 2, 2026', lastServiceDate: 'May 6, 2026',
        daysRemaining: 6, riskReason: 'Payer change pending — PA not yet approved',
        status: 'not-triggered',
      },
      {
        id: 'CL-20589', initials: 'BT', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Oct 15, 2026', lastServiceDate: 'Apr 28, 2026',
        daysRemaining: 6, riskReason: 'No appointment scheduled — 27 days since last service',
        status: 'not-triggered',
      },
    ],
    triggered: [
      { id: 'CL-20104', initials: 'LN', medicaidStatus: 'Active', treatmentPlanEnd: 'Sep 3, 2026',  lastServiceDate: 'May 21, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 21' },
      { id: 'CL-20198', initials: 'SG', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 11, 2026', lastServiceDate: 'May 20, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 20' },
      { id: 'CL-20233', initials: 'PO', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 25, 2026', lastServiceDate: 'May 18, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 18' },
      { id: 'CL-20317', initials: 'CE', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 2, 2026',  lastServiceDate: 'May 16, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 16' },
      { id: 'CL-20405', initials: 'TH', medicaidStatus: 'Active', treatmentPlanEnd: 'Jun 19, 2026', lastServiceDate: 'May 14, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 14' },
    ],
  },
  {
    name: 'Sam Whitcomb', credential: 'BHC', team: 'Team 1', county: 'Delaware County',
    caseload: 35, triggeredCount: 28, atRiskCount: 5,
    notTriggered: [
      {
        id: 'CL-30102', initials: 'MN', medicaidStatus: 'Lost',
        treatmentPlanEnd: 'Aug 3, 2026', lastServiceDate: 'May 5, 2026',
        daysRemaining: 6, riskReason: 'Lost Medicaid May 9 — retro window: 4 days remaining',
        status: 'not-triggered', alert: 'medicaid-loss', retroWindow: 4,
      },
      {
        id: 'CL-30214', initials: 'JR', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'May 20, 2026', lastServiceDate: 'Apr 15, 2026',
        daysRemaining: 6, riskReason: 'Treatment plan expired May 20 — needs immediate renewal',
        status: 'not-triggered',
      },
      {
        id: 'CL-30318', initials: 'ES', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Sep 8, 2026', lastServiceDate: 'May 7, 2026',
        daysRemaining: 6, riskReason: 'Wrong payer billed — needs CCBHC triggering service',
        status: 'not-triggered', alert: 'wrong-payer',
      },
      {
        id: 'CL-30456', initials: 'CT', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Jul 30, 2026', lastServiceDate: 'Apr 8, 2026',
        daysRemaining: 6, riskReason: 'No contact in 47 days — care navigator follow-up needed',
        status: 'not-triggered',
      },
      {
        id: 'CL-30612', initials: 'WF', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Jun 18, 2026', lastServiceDate: 'Apr 29, 2026',
        daysRemaining: 6, riskReason: 'Payer change pending — PA under review 18 days',
        status: 'not-triggered',
      },
      {
        id: 'CL-30788', initials: 'LS', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Nov 1, 2026', lastServiceDate: 'Apr 18, 2026',
        daysRemaining: 6, riskReason: 'No upcoming appointment — client unreachable',
        status: 'not-triggered',
      },
      {
        id: 'CL-30891', initials: 'DH', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Aug 22, 2026', lastServiceDate: 'Apr 12, 2026',
        daysRemaining: 6, riskReason: 'Last service Apr 12 — 43 days without CCBHC encounter',
        status: 'not-triggered',
      },
    ],
    triggered: [
      { id: 'CL-30011', initials: 'BK', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 7, 2026',  lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-30044', initials: 'VR', medicaidStatus: 'Active', treatmentPlanEnd: 'Sep 14, 2026', lastServiceDate: 'May 21, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 21' },
      { id: 'CL-30077', initials: 'FA', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 3, 2026',  lastServiceDate: 'May 20, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 20' },
      { id: 'CL-30088', initials: 'QM', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 9, 2026',  lastServiceDate: 'May 19, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 19' },
      { id: 'CL-30099', initials: 'HJ', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 30, 2026', lastServiceDate: 'May 17, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 17' },
    ],
  },
];

const TEAM_ROWS: TeamRow[] = [
  { team: 'Tulsa Team 4',     county: 'Tulsa',    caseload: 47, triggeredPct: 97.9, atRisk: 1, trend: 'up'   },
  { team: 'Tulsa Team 3',     county: 'Tulsa',    caseload: 43, triggeredPct: 95.3, atRisk: 2, trend: 'up'   },
  { team: 'Pawnee Team 1',    county: 'Pawnee',   caseload: 38, triggeredPct: 92.1, atRisk: 3, trend: 'flat' },
  { team: 'Delaware Team 2',  county: 'Delaware', caseload: 41, triggeredPct: 90.2, atRisk: 4, trend: 'down' },
  { team: 'Kay Team 1',       county: 'Kay',      caseload: 35, triggeredPct: 97.1, atRisk: 1, trend: 'up'   },
  { team: 'Tulsa Team 1',     county: 'Tulsa',    caseload: 50, triggeredPct: 96.0, atRisk: 2, trend: 'flat' },
  { team: 'Pawnee Team 2',    county: 'Pawnee',   caseload: 44, triggeredPct: 93.2, atRisk: 3, trend: 'up'   },
  { team: 'Delaware Team 1',  county: 'Delaware', caseload: 39, triggeredPct: 78.5, atRisk: 8, trend: 'down' },
];

const ORG_AT_RISK: OrgAtRiskClient[] = [
  { id: 'CL-10238', team: 'Tulsa Team 4',    primaryRisk: 'Medicaid loss — retro window 8 days',        daysRemaining: 6, action: 'View retro workflow'       },
  { id: 'CL-11402', team: 'Delaware Team 1', primaryRisk: 'No service in 22 days — unreachable',         daysRemaining: 6, action: 'Assign care navigator'      },
  { id: 'CL-10774', team: 'Tulsa Team 4',    primaryRisk: 'Wrong payer billed — Medicaid not triggered', daysRemaining: 6, action: 'Review SDP routing'         },
  { id: 'CL-11819', team: 'Delaware Team 1', primaryRisk: 'Treatment plan expired May 1',                daysRemaining: 6, action: 'Open renewal request'       },
  { id: 'CL-12044', team: 'Pawnee Team 1',   primaryRisk: 'Payer change — PA pending 14 days',           daysRemaining: 6, action: 'Check PA status'            },
  { id: 'CL-10519', team: 'Tulsa Team 4',    primaryRisk: 'Treatment plan expires in 14 days',           daysRemaining: 6, action: 'Schedule triggering service' },
];

// ─── Alert data ───────────────────────────────────────────────────────────────

interface AlertItem {
  icon: string;
  title: string;
  desc: string;
  status: string;
  statusType: 'running' | 'done';
  variant: 'red' | 'neutral';
}

const REAL_TIME_ALERTS: AlertItem[] = [
  {
    icon: '⚡', variant: 'red',
    title: 'Medicaid loss: CL-10238',
    desc: 'Retro-eligibility workflow auto-initiated — 8-day recovery window open',
    status: '● Running', statusType: 'running',
  },
  {
    icon: '↻', variant: 'neutral',
    title: 'Wrong payer detected: CL-10774',
    desc: 'Auto-routed to SDP Jamie Lin — CCBHC service scheduled for May 28',
    status: '✓ Scheduled', statusType: 'done',
  },
  {
    icon: '📄', variant: 'neutral',
    title: 'PA expiring in 48h: CL-11042',
    desc: 'SoonerCare prior auth renewal auto-submitted to Medicaid portal',
    status: '✓ Submitted', statusType: 'done',
  },
  {
    icon: '⚡', variant: 'red',
    title: 'Medicaid loss: CL-11402',
    desc: 'Coverage lapsed May 19 — retro-eligibility workflow started, 12-day window',
    status: '● Running', statusType: 'running',
  },
  {
    icon: '📋', variant: 'neutral',
    title: 'Caseload audit: Delaware Team 1',
    desc: '4 documentation gaps auto-flagged — findings emailed to ITM Sam Whitcomb',
    status: '✓ Sent', statusType: 'done',
  },
  {
    icon: '↻', variant: 'neutral',
    title: 'Treatment plan renewed: CL-11819',
    desc: 'Renewal request routed to Morgan Reyes — signature pending',
    status: '● Awaiting signature', statusType: 'running',
  },
  {
    icon: '✉', variant: 'neutral',
    title: 'Day-10 chase batch sent',
    desc: '23 clinicians notified — 31 clients still untriggered with 6 days remaining',
    status: '✓ Delivered', statusType: 'done',
  },
  {
    icon: '📄', variant: 'neutral',
    title: 'ECHO form auto-filed: Pawnee Team 2',
    desc: 'May 2026 financial reporting submitted to SoonerCare portal',
    status: '✓ Filed', statusType: 'done',
  },
  {
    icon: '🔍', variant: 'neutral',
    title: 'Duplicate enrollment: CL-30612',
    desc: 'Client active in both Delaware Team 1 and Pawnee Team 1 — flagged for TSS review',
    status: '● Needs review', statusType: 'running',
  },
];

const ACTIVITY_FEED: ActivityItem[] = [
  { time: '08:14', text: 'Sent 23 chase emails to clinicians on day-10 triggering reminder',         type: 'email'       },
  { time: '09:32', text: 'Detected Medicaid loss for CL-11402 — initiated retro-eligibility flow',  type: 'eligibility' },
  { time: '10:07', text: 'Caseload audit completed for Delaware Team 1 — 4 findings emailed to ITM',type: 'audit'       },
  { time: '11:45', text: 'Routed CL-10774 wrong-payer exception to SDP Jamie Lin',                  type: 'routing'     },
  { time: '13:20', text: 'Treatment plan expiry alert sent for 3 clients across Pawnee Team 1 & 2', type: 'email'       },
];

// ─── Small helpers ────────────────────────────────────────────────────────────

function MedicaidPill({ status }: { status: MedicaidStatus }) {
  return (
    <span className={`ccbhc-pill ccbhc-pill--medicaid-${status.toLowerCase().replace(' ', '-')}`}>
      {status}
    </span>
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up')   return <span className="ccbhc-trend ccbhc-trend--up">↑</span>;
  if (trend === 'down') return <span className="ccbhc-trend ccbhc-trend--down">↓</span>;
  return <span className="ccbhc-trend ccbhc-trend--flat">–</span>;
}

function TrafficDot({ pct }: { pct: number }) {
  const cls = pct >= 97 ? 'green' : pct >= 92 ? 'yellow' : 'red';
  return <span className={`ccbhc-dot ccbhc-dot--${cls}`} />;
}

function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  const icons: Record<ActivityItem['type'], string> = { email: '✉', eligibility: '⚡', audit: '🔍', routing: '→' };
  return <span className="ccbhc-feed-icon">{icons[type]}</span>;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ccbhc-kpi">
      <div className="ccbhc-kpi__label">{label}</div>
      <div className="ccbhc-kpi__value">{value}</div>
      {sub && <div className="ccbhc-kpi__sub">{sub}</div>}
    </div>
  );
}

// ─── Screen 1 — Caseload View ─────────────────────────────────────────────────

function CaseloadView({ onClientClick }: { onClientClick: (id: string) => void }) {
  const [showTriggered, setShowTriggered] = useState(false);
  const [clinicianIdx, setClinicianIdx] = useState(0);
  const clinician = CLINICIANS[clinicianIdx];
  const triggerPct = Math.round((clinician.triggeredCount / clinician.caseload) * 100);
  const lastTriggeredDate = clinician.triggered[0]?.triggeredDate ?? '—';

  return (
    <div className="ccbhc-layout">
      {/* ── Main content ── */}
      <div className="ccbhc-main">
        {/* Sub-header */}
        <div className="ccbhc-subheader">
          <div className="ccbhc-subheader__left">
            <select
              className="ccbhc-clinician-select"
              value={clinicianIdx}
              onChange={e => { setClinicianIdx(Number(e.target.value)); setShowTriggered(false); }}
            >
              {CLINICIANS.map((c, i) => (
                <option key={i} value={i}>{c.name}, {c.credential} — {c.team}, {c.county}</option>
              ))}
            </select>
          </div>
          <div className="ccbhc-subheader__right">
            <select className="ccbhc-month-select">
              <option>May 2026</option>
              <option>April 2026</option>
              <option>March 2026</option>
            </select>
          </div>
        </div>

        {/* KPI strip */}
        <div className="ccbhc-kpi-row">
          <KpiCard label="Caseload size"        value={`${clinician.caseload} clients`} />
          <KpiCard label="Triggered this month" value={`${clinician.triggeredCount} of ${clinician.caseload}`} sub={`${triggerPct}% — target 98%`} />
          <KpiCard label="Days remaining"       value="6 days"   sub="Month ends May 31" />
          <KpiCard label="At-risk clients"      value={`${clinician.atRiskCount} clients`} sub="Require action" />
        </div>

        {/* Not yet triggered */}
        <div className="ccbhc-section">
          <div className="ccbhc-section__header ccbhc-section__header--alert">
            <span className="ccbhc-section__title">Not yet triggered</span>
            <span className="ccbhc-section__count">{clinician.notTriggered.length}</span>
          </div>

          <div className="ccbhc-client-list">
            {clinician.notTriggered.map(client => (
              <div
                key={client.id}
                className={`ccbhc-client-row${client.alert === 'medicaid-loss' ? ' ccbhc-client-row--highlight' : ''}`}
              >
                <div className="ccbhc-client-row__id">
                  <div>
                    <div className="ccbhc-client-row__name">{client.id}</div>
                    {client.alert === 'medicaid-loss' && (
                      <div className="ccbhc-retro-badge">
                        ⚡ Retro window: <strong>{client.retroWindow} days remaining</strong>
                      </div>
                    )}
                  </div>
                </div>

                <MedicaidPill status={client.medicaidStatus} />

                <div className="ccbhc-client-row__risk-block">
                  <div className="ccbhc-client-row__risk">{client.riskReason}</div>
                  <div className="ccbhc-client-row__dates">
                    <span>Plan ends {client.treatmentPlanEnd}</span>
                    <span>·</span>
                    <span>Last service {client.lastServiceDate}</span>
                  </div>
                </div>

                <button className="ccbhc-action-btn" onClick={() => onClientClick(client.id)}>
                  View details →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Triggered */}
        <div className="ccbhc-section">
          <div
            className="ccbhc-section__header ccbhc-section__header--done"
            onClick={() => setShowTriggered(v => !v)}
            style={{ cursor: 'pointer' }}
          >
            <span className="ccbhc-section__title">
              <span className="ccbhc-section__check">✓</span> Triggered
            </span>
            <span className="ccbhc-section__count ccbhc-section__count--done">{clinician.triggeredCount}</span>
            <button className="ccbhc-toggle-btn">{showTriggered ? 'Hide' : 'Show all'}</button>
          </div>

          {!showTriggered ? (
            <div className="ccbhc-triggered-summary">
              {clinician.triggeredCount} clients triggered this month — last on <strong>{lastTriggeredDate}</strong>
            </div>
          ) : (
            <div className="ccbhc-client-list">
              {clinician.triggered.map(client => (
                <div key={client.id} className="ccbhc-client-row ccbhc-client-row--triggered">
                  <div className="ccbhc-client-row__id">
                    <div className="ccbhc-client-row__name">{client.id}</div>
                  </div>
                  <MedicaidPill status={client.medicaidStatus} />
                  <div className="ccbhc-client-row__risk-block">
                    <div className="ccbhc-client-row__risk">
                      Triggered <span className="ccbhc-triggered-date">{client.triggeredDate}</span>
                    </div>
                    <div className="ccbhc-client-row__dates">
                      <span>Plan ends {client.treatmentPlanEnd}</span>
                    </div>
                  </div>
                  <span className="ccbhc-pill ccbhc-pill--triggered">✓ Triggered</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right rail ── */}
      <aside className="ccbhc-rail">
        <div className="ccbhc-rail__header">Pending review</div>
        <div className="ccbhc-pending-list">
          {clinician.notTriggered.filter(c => c.alert).map(c => (
            <div key={c.id} className="ccbhc-pending-item">
              <div className="ccbhc-pending-item__id">{c.id}</div>
              <div className="ccbhc-pending-item__desc">
                {c.alert === 'medicaid-loss' ? 'Retro-eligibility recommendation ready' : 'Wrong-payer routing recommendation ready'}
              </div>
              <button className="ccbhc-alert-link" onClick={() => onClientClick(c.id)}>Review →</button>
            </div>
          ))}
          {clinician.notTriggered.filter(c => c.alert).length === 0 && (
            <div className="ccbhc-pending-empty">No pending reviews</div>
          )}
        </div>

        <div className="ccbhc-rail__divider" />
        <div className="ccbhc-rail__header">Upcoming deadlines</div>
        <div className="ccbhc-deadline-item">
          <div className="ccbhc-deadline-item__date">May 31</div>
          <div className="ccbhc-deadline-item__label">PPS month close — {clinician.notTriggered.length} clients not yet triggered</div>
        </div>
        <div className="ccbhc-deadline-item">
          <div className="ccbhc-deadline-item__date">Jun 3</div>
          <div className="ccbhc-deadline-item__label">Treatment plan expiry — CL-10519</div>
        </div>
        <div className="ccbhc-deadline-item">
          <div className="ccbhc-deadline-item__date">Jun 14</div>
          <div className="ccbhc-deadline-item__label">ECHO reporting due — Delaware Team 1</div>
        </div>
      </aside>
    </div>
  );
}

// ─── Sorting helpers ──────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc';

function useSortState<T extends string>(defaultCol: T, defaultDir: SortDir = 'asc') {
  const [col, setCol] = useState<T>(defaultCol);
  const [dir, setDir] = useState<SortDir>(defaultDir);
  function toggle(next: T) {
    if (next === col) setDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setCol(next); setDir('asc'); }
  }
  return { col, dir, toggle };
}

function SortTh({ label, colKey, active, dir, onSort, className }: {
  label: string; colKey: string; active: boolean; dir: SortDir;
  onSort: (k: string) => void; className?: string;
}) {
  return (
    <th className={`ccbhc-th-sort${className ? ` ${className}` : ''}`} onClick={() => onSort(colKey)}>
      {label}
      <span className="ccbhc-sort-icon">
        {active ? (dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
      </span>
    </th>
  );
}

// ─── Screen 2 — Organization View ────────────────────────────────────────────

function OrgView() {
  type TeamCol = 'team' | 'county' | 'caseload' | 'triggeredPct' | 'atRisk';
  type RiskCol = 'id' | 'team' | 'primaryRisk' | 'daysRemaining';

  const teamSort = useSortState<TeamCol>('triggeredPct', 'asc');
  const riskSort = useSortState<RiskCol>('daysRemaining', 'asc');

  const sortedTeams = [...TEAM_ROWS].sort((a, b) => {
    const mul = teamSort.dir === 'asc' ? 1 : -1;
    const k = teamSort.col;
    if (k === 'team' || k === 'county') return mul * a[k].localeCompare(b[k]);
    return mul * ((a[k] as number) - (b[k] as number));
  });

  const sortedRisk = [...ORG_AT_RISK].sort((a, b) => {
    const mul = riskSort.dir === 'asc' ? 1 : -1;
    const k = riskSort.col;
    if (k === 'id' || k === 'team' || k === 'primaryRisk') return mul * a[k].localeCompare(b[k]);
    return mul * (a[k] - b[k]);
  });

  return (
    <div className="ccbhc-layout">
      <div className="ccbhc-main">
        {/* Metric cards */}
        <div className="ccbhc-org-metrics">
          <div className="ccbhc-org-metric-card">
            <div className="ccbhc-org-metric-card__label">Org trigger rate — May 2026</div>
            <div className="ccbhc-org-metric-card__value">94.2%</div>
            <div className="ccbhc-org-metric-card__meta">↑ +1.8% vs last month · target 98%</div>
          </div>

          <div className="ccbhc-org-metric-card">
            <div className="ccbhc-org-metric-card__label">Revenue at risk</div>
            <div className="ccbhc-org-metric-card__value">47 clients</div>
            <div className="ccbhc-org-metric-card__meta">Not yet triggered · 6 days remaining <button className="ccbhc-org-metric-card__link">See breakdown →</button></div>
          </div>

          <div className="ccbhc-org-metric-card">
            <div className="ccbhc-org-metric-card__label">Retro-eligibility recoveries</div>
            <div className="ccbhc-org-metric-card__value">12 clients</div>
            <div className="ccbhc-org-metric-card__meta">Recovered this month · +3 vs April</div>
          </div>
        </div>

        {/* Team breakdown table */}
        <div className="ccbhc-card">
          <div className="ccbhc-card__header">
            <span className="ccbhc-card__title">Per-team breakdown</span>
            <span className="ccbhc-card__sub">May 2026 · All counties</span>
          </div>
          <div className="ccbhc-table-wrap">
            <table className="ccbhc-table">
              <thead>
                <tr>
                  <SortTh label="Team"         colKey="team"         active={teamSort.col === 'team'}         dir={teamSort.dir} onSort={teamSort.toggle} />
                  <SortTh label="County"       colKey="county"       active={teamSort.col === 'county'}       dir={teamSort.dir} onSort={teamSort.toggle} />
                  <SortTh label="Caseload"     colKey="caseload"     active={teamSort.col === 'caseload'}     dir={teamSort.dir} onSort={teamSort.toggle} />
                  <SortTh label="Trigger rate" colKey="triggeredPct" active={teamSort.col === 'triggeredPct'} dir={teamSort.dir} onSort={teamSort.toggle} />
                  <SortTh label="At-risk"      colKey="atRisk"       active={teamSort.col === 'atRisk'}       dir={teamSort.dir} onSort={teamSort.toggle} />
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map(row => (
                  <tr key={row.team} className={row.triggeredPct < 85 ? 'ccbhc-table__row--critical' : ''}>
                    <td className="ccbhc-table__team">{row.team}</td>
                    <td>{row.county}</td>
                    <td>{row.caseload}</td>
                    <td>
                      <div className="ccbhc-rate-row">
                        <span className={row.triggeredPct < 85 ? 'ccbhc-pct ccbhc-pct--red' : 'ccbhc-pct'}>
                          {row.triggeredPct}%
                        </span>
                        <TrendIcon trend={row.trend} />
                      </div>
                    </td>
                    <td>
                      <span className={`ccbhc-pill ${row.atRisk >= 5 ? 'ccbhc-pill--red' : row.atRisk >= 3 ? 'ccbhc-pill--amber' : 'ccbhc-pill--neutral'}`}>{row.atRisk}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top at-risk clients */}
        <div className="ccbhc-card">
          <div className="ccbhc-card__header">
            <span className="ccbhc-card__title">Top at-risk clients — org-wide</span>
            <span className="ccbhc-card__sub">Click a column to sort</span>
          </div>
          <div className="ccbhc-table-wrap">
            <table className="ccbhc-table">
              <thead>
                <tr>
                  <SortTh label="Client ID"    colKey="id"           active={riskSort.col === 'id'}           dir={riskSort.dir} onSort={riskSort.toggle} />
                  <SortTh label="Team"         colKey="team"         active={riskSort.col === 'team'}         dir={riskSort.dir} onSort={riskSort.toggle} />
                  <SortTh label="Primary risk" colKey="primaryRisk"  active={riskSort.col === 'primaryRisk'}  dir={riskSort.dir} onSort={riskSort.toggle} />
                  <SortTh label="Days left"    colKey="daysRemaining" active={riskSort.col === 'daysRemaining'} dir={riskSort.dir} onSort={riskSort.toggle} />
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedRisk.map(c => (
                  <tr key={c.id}>
                    <td className="ccbhc-table__id">{c.id}</td>
                    <td>{c.team}</td>
                    <td className="ccbhc-table__risk">{c.primaryRisk}</td>
                    <td><span className="ccbhc-pill ccbhc-pill--amber">{c.daysRemaining}d</span></td>
                    <td><button className="ccbhc-table-action-btn">{c.action} →</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right rail */}
      <aside className="ccbhc-rail">
        <div className="ccbhc-rail__header">
          Real-time alerts
          <span className="ccbhc-rail__count">{REAL_TIME_ALERTS.length}</span>
        </div>

        <div className="ccbhc-alerts-scroll">
          {REAL_TIME_ALERTS.map((a, i) => (
            <div key={i} className={`ccbhc-alert ccbhc-alert--${a.variant}`}>
              <div className="ccbhc-alert__icon">{a.icon}</div>
              <div className="ccbhc-alert__body">
                <div className="ccbhc-alert__title">{a.title}</div>
                <div className="ccbhc-alert__desc">{a.desc}</div>
                <div className="ccbhc-alert__status">
                  <span className={a.statusType === 'running' ? 'ccbhc-status-running' : 'ccbhc-status-done'}>
                    {a.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="ccbhc-rail__divider" />
        <div className="ccbhc-rail__header">Eleos activity today</div>
        <div className="ccbhc-feed">
          {ACTIVITY_FEED.map((item, i) => (
            <div key={i} className="ccbhc-feed-item">
              <div className="ccbhc-feed-item__time">{item.time}</div>
              <div className="ccbhc-feed-item__body">
                <ActivityIcon type={item.type} />
                <span>{item.text}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="ccbhc-rail__divider" />
        <div className="ccbhc-rail__header">Monthly summary</div>
        <div className="ccbhc-summary-stat"><span className="ccbhc-summary-stat__label">Chase emails sent</span><span className="ccbhc-summary-stat__value">187</span></div>
        <div className="ccbhc-summary-stat"><span className="ccbhc-summary-stat__label">Eligibility checks run</span><span className="ccbhc-summary-stat__value">362</span></div>
        <div className="ccbhc-summary-stat"><span className="ccbhc-summary-stat__label">Exceptions auto-triaged</span><span className="ccbhc-summary-stat__value">24</span></div>
        <div className="ccbhc-summary-stat"><span className="ccbhc-summary-stat__label">TSS hours saved (est.)</span><span className="ccbhc-summary-stat__value">41h</span></div>
      </aside>
    </div>
  );
}

// ─── Screen 3 — Client Triage Detail ─────────────────────────────────────────

function TriageDetail({ clientId, clinicianName, onBack }: { clientId: string; clinicianName: string; onBack: () => void }) {
  const [approved, setApproved] = useState(false);

  // Find client across all clinicians
  const client = CLINICIANS.flatMap(c => c.notTriggered).find(c => c.id === clientId) ?? CLINICIANS[0].notTriggered[0];
  const isWrongPayer = client.alert === 'wrong-payer';
  const isMedicaidLoss = client.alert === 'medicaid-loss';

  return (
    <div className="ccbhc-triage">
      {/* Breadcrumb */}
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>CCBHC Tracking</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>{clinicianName}</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <span className="ccbhc-breadcrumb__current">{clientId}</span>
      </div>

      {/* Client header card */}
      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id">{clientId}</div>
          <div className="ccbhc-client-header__meta">
            Age 34 · Tulsa County · {isMedicaidLoss ? 'Medicaid Lost May 12' : 'Active Medicaid'}
          </div>
        </div>
        <MedicaidPill status={client.medicaidStatus} />
        {isMedicaidLoss && (
          <div className="ccbhc-retro-badge ccbhc-retro-badge--large">
            ⚡ Retro window: <strong>{client.retroWindow} days remaining</strong>
          </div>
        )}
      </div>

      {/* Three-column layout */}
      <div className="ccbhc-triage-cols">

        {/* Left — Client context */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Client context</div>

          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Insurance status</div>
            {isMedicaidLoss ? (
              <div>
                <span className="ccbhc-pill ccbhc-pill--medicaid-lost">Lost</span>
                <div className="ccbhc-insurance-timeline">
                  <div className="ccbhc-insurance-timeline__item ccbhc-insurance-timeline__item--past">Active through May 11</div>
                  <div className="ccbhc-insurance-timeline__item ccbhc-insurance-timeline__item--event">May 12 — Coverage lapsed</div>
                  <div className="ccbhc-insurance-timeline__item ccbhc-insurance-timeline__item--window">Retro window closes May 31</div>
                </div>
              </div>
            ) : (
              <div>
                <span className="ccbhc-pill ccbhc-pill--medicaid-active">Active</span>
                <div className="ccbhc-detail-value">Medicaid · through Nov 2026</div>
              </div>
            )}
          </div>

          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Assigned team</div>
            <div className="ccbhc-team-list">
              {[
                { role: 'Therapist',      name: 'Morgan Reyes', cred: 'LCSW' },
                { role: 'SDP',            name: 'Jamie Lin',    cred: 'SDP'  },
                { role: 'Care Navigator', name: 'Riley Okafor', cred: 'CN'   },
              ].map(m => (
                <div key={m.role} className="ccbhc-team-member">
                  <div>
                    <div className="ccbhc-team-member__name">{m.name}</div>
                    <div className="ccbhc-team-member__role">{m.role} · {m.cred}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Treatment plan</div>
            <div className="ccbhc-detail-value">Expires {client.treatmentPlanEnd}</div>
          </div>

          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Recent activity</div>
            <div className="ccbhc-activity-timeline">
              <div className="ccbhc-activity-item">
                <div className="ccbhc-activity-item__dot" />
                <div>
                  <div className="ccbhc-activity-item__date">May 8</div>
                  <div className="ccbhc-activity-item__text">
                    Individual therapy — billed {isWrongPayer ? <strong className="ccbhc-highlight-red">private insurance</strong> : 'Medicaid'}
                  </div>
                </div>
              </div>
              <div className="ccbhc-activity-item">
                <div className="ccbhc-activity-item__dot ccbhc-activity-item__dot--faded" />
                <div>
                  <div className="ccbhc-activity-item__date">Apr 24</div>
                  <div className="ccbhc-activity-item__text">Individual therapy — Medicaid billed</div>
                </div>
              </div>
              <div className="ccbhc-activity-item">
                <div className="ccbhc-activity-item__dot ccbhc-activity-item__dot--faded" />
                <div>
                  <div className="ccbhc-activity-item__date">Apr 10</div>
                  <div className="ccbhc-activity-item__text">Care coordination — Medicaid billed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center — Eleos diagnosis */}
        <div className="ccbhc-triage-col ccbhc-triage-col--center">
          <div className="ccbhc-triage-section-title">
            <span className="ccbhc-ai-icon">✦</span> Eleos analysis
          </div>

          {!approved ? (
            <>
              <div className="ccbhc-diagnosis-card">
                <div className="ccbhc-diagnosis-card__header">
                  <div className="ccbhc-diagnosis-card__title">
                    Likely cause:{' '}
                    {isWrongPayer ? 'Wrong payer billed for triggering service'
                      : isMedicaidLoss ? 'Medicaid coverage lapsed — retro window open'
                      : 'No triggering service scheduled before month-end'}
                  </div>
                  <span className="ccbhc-confidence-pill">High confidence</span>
                </div>

                <div className="ccbhc-diagnosis-card__reasoning">
                  <div className="ccbhc-reasoning-title">Reasoning</div>
                  <ul className="ccbhc-reasoning-list">
                    {isWrongPayer ? (<>
                      <li>Client had one service on May 8 (individual therapy)</li>
                      <li>Service was billed to <strong>private insurance</strong></li>
                      <li>CCBHC PPS triggers only on Medicaid-billed services</li>
                      <li>Client has active Medicaid coverage through Nov 2026</li>
                    </>) : isMedicaidLoss ? (<>
                      <li>Medicaid coverage lapsed May 12, 2026</li>
                      <li>No CCBHC-triggering service recorded after lapse</li>
                      <li>Retro-eligibility recovery window is still open (8 days)</li>
                      <li>Client had consistent coverage for prior 14 months</li>
                    </>) : (<>
                      <li>No service billed to Medicaid in May 2026</li>
                      <li>Last service was April 30 — predates May billing period</li>
                      <li>6 days remain in the month to schedule a triggering service</li>
                      <li>Client is reachable — last contact May 3</li>
                    </>)}
                  </ul>
                </div>
              </div>

              <div className="ccbhc-recommendation-card">
                <div className="ccbhc-recommendation-card__label">Recommended action</div>
                <div className="ccbhc-recommendation-card__action">
                  {isWrongPayer ? 'Route to SDP (Jamie Lin) to schedule a CCBHC-triggering service this week'
                    : isMedicaidLoss ? 'Initiate retro-eligibility recovery via Care Navigator (Riley Okafor)'
                    : 'Notify Morgan Reyes to schedule a Medicaid-billed service before May 31'}
                </div>
                <div className="ccbhc-recommendation-card__actions">
                  <button className="ccbhc-primary-btn" onClick={() => setApproved(true)}>Approve and route</button>
                  <button className="ccbhc-secondary-btn">Modify recommendation</button>
                </div>
              </div>
            </>
          ) : (
            <div className="ccbhc-approved-state">
              <div className="ccbhc-approved-state__icon">✓</div>
              <div className="ccbhc-approved-state__title">Routed successfully</div>
              <div className="ccbhc-approved-state__desc">
                {isWrongPayer
                  ? 'Jamie Lin has been notified to schedule a CCBHC-triggering service.'
                  : 'Riley Okafor has been assigned the retro-eligibility recovery workflow.'}
              </div>
              <button className="ccbhc-secondary-btn" onClick={() => setApproved(false)}>Undo</button>
            </div>
          )}
        </div>

        {/* Right — Alternatives */}
        <div className="ccbhc-triage-col ccbhc-triage-col--right">
          <div className="ccbhc-triage-section-title">Other options considered</div>

          <div className="ccbhc-alt-card">
            <div className="ccbhc-alt-card__title">
              {isWrongPayer ? 'Notify Morgan Reyes to re-bill under Medicaid' : 'Schedule emergency visit this week'}
            </div>
            <div className="ccbhc-alt-card__reason">
              Not preferred — {isWrongPayer ? 're-billing requires authorization from billing team; higher friction' : 'client has shown scheduling difficulty; low probability of success'}
            </div>
          </div>

          <div className="ccbhc-alt-card">
            <div className="ccbhc-alt-card__title">Mark as exception — exclude from PPS count</div>
            <div className="ccbhc-alt-card__reason">Not preferred — revenue impact; only appropriate if coverage is permanently lost</div>
          </div>

          <div className="ccbhc-alt-card">
            <div className="ccbhc-alt-card__title">Escalate to ITM for manual review</div>
            <div className="ccbhc-alt-card__reason">Not preferred — sufficient information to act now; escalation adds delay</div>
          </div>

          <details className="ccbhc-why-preferred">
            <summary>Why this recommendation was preferred</summary>
            <p>
              {isWrongPayer
                ? 'Routing to the SDP for a same-week service is the fastest path to a Medicaid-billed triggering service within the remaining billing window. The client has no scheduling barriers and the SDP has availability.'
                : 'Retro-eligibility recovery has a documented 82% success rate for clients with this coverage history. The 8-day window is sufficient if initiated today.'}
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type MainView = 'caseload' | 'org';

export default function CCBHCTracker() {
  const [view, setView] = useState<MainView>('org');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedClinicianName, setSelectedClinicianName] = useState(CLINICIANS[0].name);

  const handleClientClick = (id: string, clinicianName: string) => {
    setSelectedClient(id);
    setSelectedClinicianName(clinicianName);
  };
  const handleBack = () => setSelectedClient(null);

  return (
    <div className="ccbhc-root">
      <div className="ccbhc-page-header">
        <div className="ccbhc-page-header__left">
          <h1 className="ccbhc-page-title">CCBHC Tracking</h1>
          <span className="ccbhc-page-badge">Grand Mental Health · Oklahoma</span>
        </div>
        <div className="ccbhc-page-header__right">
          <div className="ccbhc-notif-bell">
            🔔<span className="ccbhc-notif-badge">3</span>
          </div>
        </div>
      </div>

      {!selectedClient && (
        <div className="ccbhc-tabs">
          <button className={`ccbhc-tab${view === 'org' ? ' ccbhc-tab--active' : ''}`} onClick={() => setView('org')}>Organization view</button>
          <button className={`ccbhc-tab${view === 'caseload' ? ' ccbhc-tab--active' : ''}`} onClick={() => setView('caseload')}>Caseload view</button>
        </div>
      )}

      {selectedClient ? (
        <TriageDetail clientId={selectedClient} clinicianName={selectedClinicianName} onBack={handleBack} />
      ) : view === 'caseload' ? (
        <CaseloadView onClientClick={(id) => handleClientClick(id, CLINICIANS.find(c => c.notTriggered.some(cl => cl.id === id))?.name ?? CLINICIANS[0].name)} />
      ) : (
        <OrgView />
      )}
    </div>
  );
}
