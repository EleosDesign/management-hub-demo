import { useState, useEffect, useRef, Fragment } from 'react';
import './WorkflowsVisibility.css';

const TODAY = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ─── Types ────────────────────────────────────────────────────────────────────

const STATUS_PARTS: Record<string, { label: string; variant: 'action' | 'outcome' | 'next' | 'resolved' }[]> = {
  'Flagged':                                [{ label: 'Flagged', variant: 'action' }],
  'Called — left voicemail':                [{ label: 'Outreach', variant: 'action' }, { label: 'Left voicemail', variant: 'outcome' }],
  'Called — no time to talk, call back':    [{ label: 'Outreach', variant: 'action' }, { label: 'No time to talk, call back', variant: 'outcome' }],
  'Unreachable':                            [{ label: 'Outreach', variant: 'action' }, { label: 'Unreachable', variant: 'outcome' }],
  'Knows — will do it themselves':          [{ label: 'Client aware', variant: 'next' }, { label: 'Will do it themselves', variant: 'outcome' }],
  'Wants help':                             [{ label: 'Client aware', variant: 'next' }, { label: 'Wants help', variant: 'outcome' }],
  'Claims renewed — not confirmed':         [{ label: 'Client aware', variant: 'next' }, { label: 'Claims renewed', variant: 'outcome' }],
  'Needs appointment — CN / SDP / DHS':     [{ label: 'Renewal in progress', variant: 'next' }, { label: 'Needs appointment', variant: 'outcome' }],
  'Appointment scheduled':                  [{ label: 'Renewal in progress', variant: 'next' }, { label: 'Appt scheduled', variant: 'outcome' }],
  'Needs the insurance hotline called':     [{ label: 'Renewal in progress', variant: 'next' }, { label: 'Insurance hotline needed', variant: 'outcome' }],
  'Waiting on insurance decision':          [{ label: 'Submitted', variant: 'next' }, { label: 'Awaiting decision', variant: 'outcome' }],
  'Denied — appeal or reapply':             [{ label: 'Submitted', variant: 'next' }, { label: 'Denied — appeal/reapply', variant: 'outcome' }],
  'Confirmed by the state feed':            [{ label: 'Renewed', variant: 'resolved' }],
  'Waiting on pay stubs':                   [{ label: 'Blocked', variant: 'outcome' }, { label: 'Pay stubs', variant: 'next' }],
  'Waiting on Social Security award letter':[{ label: 'Blocked', variant: 'outcome' }, { label: 'SSA letter', variant: 'next' }],
  'Needs proof of address':                 [{ label: 'Blocked', variant: 'outcome' }, { label: 'Proof of address', variant: 'next' }],
  'Needs ID or birth certificate':          [{ label: 'Blocked', variant: 'outcome' }, { label: 'ID / birth cert', variant: 'next' }],
  'No email account':                       [{ label: 'Blocked', variant: 'outcome' }, { label: 'No email account', variant: 'next' }],
  'No OHCA portal access':                  [{ label: 'Blocked', variant: 'outcome' }, { label: 'No OHCA portal access', variant: 'next' }],
  'Needs transport to DHS':                 [{ label: 'Blocked', variant: 'outcome' }, { label: 'Needs transport to DHS', variant: 'next' }],
  'Waiting on client to send documents':    [{ label: 'Blocked', variant: 'outcome' }, { label: 'Awaiting docs', variant: 'next' }],
  'Office visit scheduled':                 [{ label: 'Renewal in progress', variant: 'next' }, { label: 'Office visit scheduled', variant: 'outcome' }],
  'Called — DHS walkthrough done':          [{ label: 'Outreach', variant: 'action' }, { label: 'DHS walkthrough done', variant: 'outcome' }],
  'Closed':                                 [{ label: 'Renewed', variant: 'resolved' }],
  // SOAR workflow statuses
  'Pre-Call — in progress':                 [{ label: 'Pre-Call', variant: 'action' }],
  'Contact — in progress':                  [{ label: 'Contact', variant: 'action' }],
  'In Session — in progress':               [{ label: 'In Session', variant: 'action' }],
  'Post-Submission — in progress':          [{ label: 'Post-Submission', variant: 'action' }],
  'Waiting':                                [{ label: 'Waiting', variant: 'outcome' }],
  'Blocked':                                [{ label: 'Blocked', variant: 'outcome' }],
  'Confirmed':                              [{ label: 'Confirmed', variant: 'resolved' }],
  'Navigator assigned':                     [{ label: 'Navigator assigned', variant: 'next' }],
  'In progress':                            [{ label: 'In progress', variant: 'action' }],
};

type MedicaidStatus = 'Active' | 'At Risk' | 'Lost';
type TriggerStatus = 'triggered' | 'not-triggered';
type WorkflowStatus =
  | 'Flagged'
  | 'Called — left voicemail'
  | 'Called — no time to talk, call back'
  | 'Unreachable'
  | 'Knows — will do it themselves'
  | 'Wants help'
  | 'Claims renewed — not confirmed'
  | 'Needs appointment — CN / SDP / DHS'
  | 'Appointment scheduled'
  | 'Needs the insurance hotline called'
  | 'Waiting on insurance decision'
  | 'Denied — appeal or reapply'
  | 'Confirmed by the state feed'
  | 'Waiting on pay stubs'
  | 'Waiting on Social Security award letter'
  | 'Needs proof of address'
  | 'Needs ID or birth certificate'
  | 'No email account'
  | 'No OHCA portal access'
  | 'Needs transport to DHS'
  | 'Waiting on client to send documents'
  | 'Office visit scheduled'
  | 'Called — DHS walkthrough done'
  | 'Closed';

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
  lapseDate?: string;
  retroWindow?: number;
  action?: string;
  workflowStatus?: WorkflowStatus;
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

interface ScheduleServiceState {
  done: boolean;
  selectedAction: 'office' | 'phone' | 'no-answer' | null;
  note: string;
  scheduledDate: string;
  scheduledTime: string;
  callbackDate: string;
  callbackTime: string;
  nextStepDate: string;
  nextStepTime: string;
  assignedNavigator: string;
  assignedTo: string;
  requiredAction: string;
  resolved: boolean;
  // 4-phase workflow (Marcus/Patricia)
  currentPhase: 'pre-call' | 'contact' | 'in-session' | 'post-submission';
  phaseAction: string;
  workflowOutcome: 'blocked' | 'waiting' | 'closed' | 'confirmed' | null;
  outcomeReason: string;
  pingDate: string;
  phaseHistory: { phase: string; label: string; action: string; note: string; date: string; actor?: string }[];
  nextStepAction: string;
  phaseGoal: string;
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
    name: 'Morgan Reyes', credential: 'LCSW', team: 'North Team 1', county: 'North County',
    caseload: 32, triggeredCount: 27, atRiskCount: 3,
    notTriggered: [
      {
        id: 'CL-10001', initials: 'MR', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Apr 1, 2027', lastServiceDate: 'Sep 22, 2026',
        daysRemaining: 6, riskReason: 'Address change flagged — Medicaid record must be updated',
        status: 'not-triggered', action: 'Check PA status',
        workflowStatus: 'Flagged',
      },
      {
        id: 'CL-10238', initials: 'JS', medicaidStatus: 'Lost',
        treatmentPlanEnd: 'Oct 14, 2026', lastServiceDate: 'Sep 8, 2026',
        daysRemaining: 6, riskReason: `Address change reported ${daysAgo(14)} — Medicaid terminated, retro window: 8 days`,
        status: 'not-triggered', alert: 'medicaid-loss', retroWindow: 8, action: 'Open retro workflow',
        workflowStatus: 'Waiting on insurance decision',
      },
      {
        id: 'CL-10519', initials: 'AR', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Oct 3, 2026', lastServiceDate: 'Aug 30, 2026',
        daysRemaining: 6, riskReason: 'Income reduction reported — Medicaid eligibility at risk mid-year',
        workflowStatus: 'Called — left voicemail',
        status: 'not-triggered', action: 'Schedule service',
      },
      {
        id: 'CL-10774', initials: 'MW', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Dec 20, 2026', lastServiceDate: 'Sep 8, 2026',
        daysRemaining: 6, riskReason: 'Household composition change — payer mismatch flagged',
        status: 'not-triggered', alert: 'wrong-payer', action: 'Review payer routing',
        workflowStatus: 'Wants help',
      },
      {
        id: 'CL-11042', initials: 'TC', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Nov 7, 2026', lastServiceDate: 'Sep 3, 2026',
        daysRemaining: 6, riskReason: 'Address change — payer reassignment pending, PA not yet approved',
        status: 'not-triggered', action: 'Check PA status',
        workflowStatus: 'Wants help',
      },
      {
        id: 'CL-11198', initials: 'LB', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Jan 12, 2027', lastServiceDate: 'Aug 22, 2026',
        daysRemaining: 6, riskReason: 'Lost employer coverage — Medicaid application in progress',
        workflowStatus: 'Waiting on client to send documents',
        status: 'not-triggered', action: 'Assign care navigator',
      },
    ],
    triggered: [
      { id: 'CL-10102', initials: 'KP', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 5, 2026',  lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Income change reported — eligibility redetermination completed', status: 'triggered', triggeredDate: 'Sep 22', workflowStatus: 'Closed' },
      { id: 'CL-10145', initials: 'RM', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 18, 2026', lastServiceDate: 'Sep 20, 2026', daysRemaining: 0, riskReason: 'Separation reported — household size change, eligibility impact pending', status: 'triggered', triggeredDate: 'Sep 20' },
      { id: 'CL-10203', initials: 'GH', medicaidStatus: 'Active', treatmentPlanEnd: 'Feb 1, 2027',  lastServiceDate: 'Sep 19, 2026', daysRemaining: 0, riskReason: 'Address change resolved — Medicaid record updated, redetermination mail rerouted', status: 'triggered', triggeredDate: 'Sep 19', workflowStatus: 'Closed' },
      { id: 'CL-10311', initials: 'NF', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 30, 2026', lastServiceDate: 'Sep 17, 2026', daysRemaining: 0, riskReason: 'Household size change — benefits reviewed and updated', status: 'triggered', triggeredDate: 'Sep 17', workflowStatus: 'Closed' },
      { id: 'CL-10402', initials: 'DW', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 14, 2026', lastServiceDate: 'Sep 15, 2026', daysRemaining: 0, riskReason: 'Employer coverage loss — Medicaid enrollment confirmed', status: 'triggered', triggeredDate: 'Sep 15', workflowStatus: 'Closed' },
    ],
  },
  {
    name: 'Avery Patel', credential: 'LPC', team: 'East Team 1', county: 'East County',
    caseload: 28, triggeredCount: 26, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-20441', initials: 'RK', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Nov 2, 2026', lastServiceDate: 'Sep 6, 2026',
        daysRemaining: 6, riskReason: 'Income increase reported — Medicaid eligibility under review',
        workflowStatus: 'Called — left voicemail',
        status: 'not-triggered', action: 'Check PA status',
      },
      {
        id: 'CL-20589', initials: 'BT', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Feb 15, 2027', lastServiceDate: 'Aug 28, 2026',
        daysRemaining: 6, riskReason: 'New household member added — benefits redetermination pending',
        workflowStatus: 'Needs appointment — CN / SDP / DHS',
        status: 'not-triggered', action: 'Assign care navigator',
      },
    ],
    triggered: [
      { id: 'CL-20104', initials: 'LN', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 3, 2027',  lastServiceDate: 'Sep 21, 2026', daysRemaining: 0, riskReason: 'Job loss reported — income drop may qualify for expanded Medicaid', status: 'triggered', triggeredDate: 'Sep 21' },
      { id: 'CL-20198', initials: 'SG', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 11, 2026', lastServiceDate: 'Sep 20, 2026', daysRemaining: 0, riskReason: 'Pregnancy reported — expanded Medicaid eligibility under review', status: 'triggered', triggeredDate: 'Sep 20' },
      { id: 'CL-20233', initials: 'PO', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 25, 2026', lastServiceDate: 'Sep 18, 2026', daysRemaining: 0, riskReason: 'Pregnancy reported — eligibility expanded, enrollment updated', status: 'triggered', triggeredDate: 'Sep 18', workflowStatus: 'Closed' },
      { id: 'CL-20317', initials: 'CE', medicaidStatus: 'Active', treatmentPlanEnd: 'Apr 2, 2027',  lastServiceDate: 'Sep 16, 2026', daysRemaining: 0, riskReason: 'Job loss reported — income drop verified, coverage maintained', status: 'triggered', triggeredDate: 'Sep 16', workflowStatus: 'Closed' },
      { id: 'CL-20405', initials: 'TH', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 19, 2026', lastServiceDate: 'Sep 14, 2026', daysRemaining: 0, riskReason: 'Spouse income change — redetermination completed, no gap in coverage', status: 'triggered', triggeredDate: 'Sep 14', workflowStatus: 'Closed' },
    ],
  },
  {
    name: 'Sam Whitcomb', credential: 'BHC', team: 'West Team 1', county: 'West County',
    caseload: 35, triggeredCount: 28, atRiskCount: 5,
    notTriggered: [
      {
        id: 'CL-30102', initials: 'MN', medicaidStatus: 'Lost',
        treatmentPlanEnd: 'Dec 3, 2026', lastServiceDate: 'Sep 5, 2026',
        daysRemaining: 6, riskReason: `Income loss ${daysAgo(18)} — Medicaid terminated, retro window: 4 days`,
        workflowStatus: 'Waiting on insurance decision',
        status: 'not-triggered', alert: 'medicaid-loss', retroWindow: 4, action: 'Open retro workflow',
      },
      {
        id: 'CL-30214', initials: 'JR', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Sep 20, 2026', lastServiceDate: 'Aug 15, 2026',
        daysRemaining: 6, riskReason: 'Address moved out of county — coverage transfer in progress',
        workflowStatus: 'Wants help',
        status: 'not-triggered', action: 'Open renewal request',
      },
      {
        id: 'CL-30318', initials: 'ES', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Jan 8, 2027', lastServiceDate: 'Sep 7, 2026',
        daysRemaining: 6, riskReason: 'Spouse income change — household eligibility impacted, payer mismatch',
        status: 'not-triggered', alert: 'wrong-payer', action: 'Review payer routing',
        workflowStatus: 'Flagged',
      },
      {
        id: 'CL-30456', initials: 'CT', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Nov 30, 2026', lastServiceDate: 'Aug 8, 2026',
        daysRemaining: 6, riskReason: 'Separation reported — household size change, unreachable',
        workflowStatus: 'Called — left voicemail',
        status: 'not-triggered', action: 'Assign care navigator',
      },
      {
        id: 'CL-30612', initials: 'WF', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Oct 18, 2026', lastServiceDate: 'Aug 29, 2026',
        daysRemaining: 6, riskReason: 'Job loss reported — CHIP to Medicaid transition, PA under review',
        workflowStatus: 'Needs appointment — CN / SDP / DHS',
        status: 'not-triggered', action: 'Check PA status',
      },
      {
        id: 'CL-30788', initials: 'LS', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Mar 1, 2027', lastServiceDate: 'Aug 18, 2026',
        daysRemaining: 6, riskReason: 'Medicare Part A enrollment — Medicaid coordination gap flagged',
        workflowStatus: 'Called — left voicemail',
        status: 'not-triggered', action: 'Assign care navigator',
      },
      {
        id: 'CL-30891', initials: 'DH', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Dec 22, 2026', lastServiceDate: 'Aug 12, 2026',
        daysRemaining: 6, riskReason: 'New dependent added — benefits recalculation triggered, 43-day gap',
        workflowStatus: 'Called — left voicemail',
        status: 'not-triggered', action: 'Schedule service',
      },
    ],
    triggered: [
      { id: 'CL-30011', initials: 'BK', medicaidStatus: 'Active', treatmentPlanEnd: 'Feb 7, 2027',  lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Spouse income change — household eligibility impact, redetermination due', status: 'triggered', triggeredDate: 'Sep 22' },
      { id: 'CL-30044', initials: 'VR', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 14, 2027', lastServiceDate: 'Sep 21, 2026', daysRemaining: 0, riskReason: 'New household member added — benefits redetermination pending', status: 'triggered', triggeredDate: 'Sep 21' },
      { id: 'CL-30077', initials: 'FA', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 3, 2026',  lastServiceDate: 'Sep 20, 2026', daysRemaining: 0, riskReason: 'Separation reported — household eligibility reassessed and resolved', status: 'triggered', triggeredDate: 'Sep 20', workflowStatus: 'Closed' },
      { id: 'CL-30088', initials: 'QM', medicaidStatus: 'Active', treatmentPlanEnd: 'Apr 9, 2027',  lastServiceDate: 'Sep 19, 2026', daysRemaining: 0, riskReason: 'New household member — redetermination completed successfully', status: 'triggered', triggeredDate: 'Sep 19', workflowStatus: 'Closed' },
      { id: 'CL-30099', initials: 'HJ', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 30, 2026', lastServiceDate: 'Sep 17, 2026', daysRemaining: 0, riskReason: 'Annual renewal flagged — documentation submitted and approved', status: 'triggered', triggeredDate: 'Sep 17', workflowStatus: 'Closed' },
    ],
  },
  // ── North Team 1 — 2nd clinician ─────────────────────────────────────────────
  {
    name: 'Jamie Lin', credential: 'SDP', team: 'North Team 1', county: 'North County',
    caseload: 24, triggeredCount: 23, atRiskCount: 0,
    notTriggered: [
      {
        id: 'CL-40101', initials: 'PD', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Dec 10, 2026', lastServiceDate: 'Sep 2, 2026',
        daysRemaining: 6, riskReason: 'Address change flagged — Medicaid record must be updated',
        workflowStatus: 'Wants help',
        status: 'not-triggered', action: 'Schedule service',
      },
    ],
    triggered: [
      { id: 'CL-40201', initials: 'KR', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 5, 2027',  lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Residency change — eligibility confirmed in new county', status: 'triggered', triggeredDate: 'Sep 22', workflowStatus: 'Closed' },
      { id: 'CL-40202', initials: 'BN', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 20, 2026', lastServiceDate: 'Sep 21, 2026', daysRemaining: 0, riskReason: 'Address change flagged — Medicaid record must be updated', status: 'triggered', triggeredDate: 'Sep 21' },
      { id: 'CL-40203', initials: 'MO', medicaidStatus: 'Active', treatmentPlanEnd: 'Feb 3, 2027',  lastServiceDate: 'Sep 19, 2026', daysRemaining: 0, riskReason: 'Self-employment income reported — eligibility re-verified', status: 'triggered', triggeredDate: 'Sep 19', workflowStatus: 'Closed' },
      { id: 'CL-40204', initials: 'VL', medicaidStatus: 'Active', treatmentPlanEnd: 'Apr 1, 2027',  lastServiceDate: 'Sep 17, 2026', daysRemaining: 0, riskReason: 'Student status change — eligibility reviewed, coverage continued', status: 'triggered', triggeredDate: 'Sep 17', workflowStatus: 'Closed' },
      { id: 'CL-40205', initials: 'TW', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 28, 2026', lastServiceDate: 'Sep 15, 2026', daysRemaining: 0, riskReason: 'Disability status update — benefits adjusted, coverage active', status: 'triggered', triggeredDate: 'Sep 15', workflowStatus: 'Closed' },
    ],
  },
  // ── North Team 2 ──────────────────────────────────────────────────────────────
  {
    name: 'Dana Torres', credential: 'LCSW', team: 'North Team 2', county: 'North County',
    caseload: 22, triggeredCount: 21, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-41101', initials: 'GF', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Oct 30, 2026', lastServiceDate: 'Aug 28, 2026',
        daysRemaining: 6, riskReason: 'Income loss reported — Medicaid redetermination due Jun 30',
        workflowStatus: 'Called — left voicemail',
        status: 'not-triggered', action: 'Check PA status',
      },
    ],
    triggered: [
      { id: 'CL-41201', initials: 'HL', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 12, 2026', lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Lost employer coverage — Medicaid application in progress', status: 'triggered', triggeredDate: 'Sep 22' },
      { id: 'CL-41202', initials: 'JK', medicaidStatus: 'Active', treatmentPlanEnd: 'Feb 7, 2027',  lastServiceDate: 'Sep 21, 2026', daysRemaining: 0, riskReason: 'Income reduction reported — Medicaid eligibility at risk mid-year', status: 'triggered', triggeredDate: 'Sep 21' },
      { id: 'CL-41203', initials: 'QS', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 15, 2026', lastServiceDate: 'Sep 19, 2026', daysRemaining: 0, riskReason: 'Immigration status change — eligibility confirmed', status: 'triggered', triggeredDate: 'Sep 19', workflowStatus: 'Closed' },
      { id: 'CL-41204', initials: 'AB', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 22, 2027', lastServiceDate: 'Sep 16, 2026', daysRemaining: 0, riskReason: 'Income change reported — eligibility redetermination completed', status: 'triggered', triggeredDate: 'Sep 16', workflowStatus: 'Closed' },
      { id: 'CL-41205', initials: 'RF', medicaidStatus: 'Active', treatmentPlanEnd: 'Mar 5, 2027',  lastServiceDate: 'Sep 14, 2026', daysRemaining: 0, riskReason: 'Address change resolved — Medicaid record updated, redetermination mail rerouted', status: 'triggered', triggeredDate: 'Sep 14', workflowStatus: 'Closed' },
    ],
  },
  {
    name: 'Kevin Park', credential: 'BHC', team: 'North Team 2', county: 'North County',
    caseload: 21, triggeredCount: 20, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-41301', initials: 'YM', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Nov 8, 2026', lastServiceDate: 'Sep 1, 2026',
        daysRemaining: 6, riskReason: 'Household member lost coverage — family plan change required',
        workflowStatus: 'Denied — appeal or reapply',
        status: 'not-triggered', action: 'Open renewal request',
      },
    ],
    triggered: [
      { id: 'CL-41401', initials: 'CN', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 10, 2027', lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Household composition change — payer mismatch flagged', status: 'triggered', triggeredDate: 'Sep 22' },
      { id: 'CL-41402', initials: 'DT', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 4, 2026',  lastServiceDate: 'Sep 20, 2026', daysRemaining: 0, riskReason: 'Household size change — benefits reviewed and updated', status: 'triggered', triggeredDate: 'Sep 20', workflowStatus: 'Closed' },
      { id: 'CL-41403', initials: 'EH', medicaidStatus: 'Active', treatmentPlanEnd: 'Apr 14, 2027', lastServiceDate: 'Sep 18, 2026', daysRemaining: 0, riskReason: 'Employer coverage loss — Medicaid enrollment confirmed', status: 'triggered', triggeredDate: 'Sep 18', workflowStatus: 'Closed' },
      { id: 'CL-41404', initials: 'PB', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 25, 2026', lastServiceDate: 'Sep 15, 2026', daysRemaining: 0, riskReason: 'Pregnancy reported — eligibility expanded, enrollment updated', status: 'triggered', triggeredDate: 'Sep 15', workflowStatus: 'Closed' },
    ],
  },
  // ── East Team 1 — 2nd clinician ────────────────────────────────────────────
  {
    name: 'Nina Reeves', credential: 'LPC', team: 'East Team 1', county: 'East County',
    caseload: 19, triggeredCount: 18, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-50101', initials: 'OW', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Jan 15, 2027', lastServiceDate: 'Aug 25, 2026',
        daysRemaining: 6, riskReason: 'Self-employment income fluctuation — Medicaid review triggered',
        workflowStatus: 'Flagged',
        status: 'not-triggered', action: 'Assign care navigator',
      },
    ],
    triggered: [
      { id: 'CL-50201', initials: 'ZA', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 18, 2026', lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Self-employment income fluctuation — Medicaid review triggered', status: 'triggered', triggeredDate: 'Sep 22' },
      { id: 'CL-50202', initials: 'XC', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 9, 2026',  lastServiceDate: 'Sep 20, 2026', daysRemaining: 0, riskReason: 'Job loss reported — income drop verified, coverage maintained', status: 'triggered', triggeredDate: 'Sep 20', workflowStatus: 'Closed' },
      { id: 'CL-50203', initials: 'UV', medicaidStatus: 'Active', treatmentPlanEnd: 'Feb 30, 2027', lastServiceDate: 'Sep 17, 2026', daysRemaining: 0, riskReason: 'Spouse income change — redetermination completed, no gap in coverage', status: 'triggered', triggeredDate: 'Sep 17', workflowStatus: 'Closed' },
      { id: 'CL-50204', initials: 'ST', medicaidStatus: 'Active', treatmentPlanEnd: 'Apr 5, 2027',  lastServiceDate: 'Sep 14, 2026', daysRemaining: 0, riskReason: 'Separation reported — household eligibility reassessed and resolved', status: 'triggered', triggeredDate: 'Sep 14', workflowStatus: 'Closed' },
    ],
  },
  // ── East Team 2 ─────────────────────────────────────────────────────────────
  {
    name: 'Jordan Wells', credential: 'BHC', team: 'East Team 2', county: 'East County',
    caseload: 22, triggeredCount: 21, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-51101', initials: 'FM', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Oct 20, 2026', lastServiceDate: 'Sep 3, 2026',
        daysRemaining: 6, riskReason: 'Employer insurance terminated — Medicaid application pending',
        workflowStatus: 'Waiting on insurance decision',
        status: 'not-triggered', action: 'Check PA status',
      },
    ],
    triggered: [
      { id: 'CL-51201', initials: 'IL', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 8, 2027',  lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'CHIP to Medicaid transition — PA renewal required', status: 'triggered', triggeredDate: 'Sep 22' },
      { id: 'CL-51202', initials: 'GK', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 14, 2026', lastServiceDate: 'Sep 21, 2026', daysRemaining: 0, riskReason: 'Income increase reported — eligibility under review, payer reassignment possible', status: 'triggered', triggeredDate: 'Sep 21' },
      { id: 'CL-51203', initials: 'NJ', medicaidStatus: 'Active', treatmentPlanEnd: 'Mar 2, 2027',  lastServiceDate: 'Sep 19, 2026', daysRemaining: 0, riskReason: 'New household member — redetermination completed successfully', status: 'triggered', triggeredDate: 'Sep 19', workflowStatus: 'Closed' },
      { id: 'CL-51204', initials: 'BH', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 27, 2026', lastServiceDate: 'Sep 16, 2026', daysRemaining: 0, riskReason: 'Annual renewal flagged — documentation submitted and approved', status: 'triggered', triggeredDate: 'Sep 16', workflowStatus: 'Closed' },
      { id: 'CL-51205', initials: 'OE', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 11, 2026', lastServiceDate: 'Sep 13, 2026', daysRemaining: 0, riskReason: 'Residency change — eligibility confirmed in new county', status: 'triggered', triggeredDate: 'Sep 13', workflowStatus: 'Closed' },
    ],
  },
  {
    name: 'Sarah Monroe', credential: 'LCSW', team: 'East Team 2', county: 'East County',
    caseload: 22, triggeredCount: 20, atRiskCount: 2,
    notTriggered: [
      {
        id: 'CL-51301', initials: 'WP', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Feb 5, 2027', lastServiceDate: 'Aug 30, 2026',
        daysRemaining: 6, riskReason: 'Address change out of service area — eligibility review needed',
        workflowStatus: 'Wants help',
        status: 'not-triggered', action: 'Schedule service',
      },
      {
        id: 'CL-51302', initials: 'RD', medicaidStatus: 'Lost',
        treatmentPlanEnd: 'Dec 1, 2026', lastServiceDate: 'Sep 4, 2026',
        daysRemaining: 6, riskReason: 'Household income drop — Medicaid lost, retro window open',
        workflowStatus: 'Waiting on client to send documents',
        status: 'not-triggered', alert: 'medicaid-loss', lapseDate: 'Sep 12, 2026', retroWindow: 6, action: 'Open retro workflow',
      },
    ],
    triggered: [
      { id: 'CL-51401', initials: 'AV', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 18, 2027', lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Part-time hours reduced — income drop may affect Medicaid eligibility', status: 'triggered', triggeredDate: 'Sep 22' },
      { id: 'CL-51402', initials: 'LQ', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 30, 2026', lastServiceDate: 'Sep 20, 2026', daysRemaining: 0, riskReason: 'Self-employment income reported — eligibility re-verified', status: 'triggered', triggeredDate: 'Sep 20', workflowStatus: 'Closed' },
      { id: 'CL-51403', initials: 'MZ', medicaidStatus: 'Active', treatmentPlanEnd: 'Apr 10, 2027', lastServiceDate: 'Sep 17, 2026', daysRemaining: 0, riskReason: 'Student status change — eligibility reviewed, coverage continued', status: 'triggered', triggeredDate: 'Sep 17', workflowStatus: 'Closed' },
      { id: 'CL-51404', initials: 'KU', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 6, 2026',  lastServiceDate: 'Sep 15, 2026', daysRemaining: 0, riskReason: 'Disability status update — benefits adjusted, coverage active', status: 'triggered', triggeredDate: 'Sep 15', workflowStatus: 'Closed' },
    ],
  },
  // ── West Team 2 ───────────────────────────────────────────────────────────
  {
    name: 'Chris Nair', credential: 'BHC', team: 'West Team 2', county: 'West County',
    caseload: 21, triggeredCount: 19, atRiskCount: 2,
    notTriggered: [
      {
        id: 'CL-60101', initials: 'HB', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Nov 22, 2026', lastServiceDate: 'Sep 6, 2026',
        daysRemaining: 6, riskReason: 'Immigration status update — eligibility verification required',
        workflowStatus: 'Wants help',
        status: 'not-triggered', alert: 'wrong-payer', action: 'Review payer routing',
      },
      {
        id: 'CL-60102', initials: 'EG', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Oct 12, 2026', lastServiceDate: 'Aug 29, 2026',
        daysRemaining: 6, riskReason: 'Income change reported — CHIP to Medicaid transition in progress',
        workflowStatus: 'Called — left voicemail',
        status: 'not-triggered', action: 'Open renewal request',
      },
    ],
    triggered: [
      { id: 'CL-60201', initials: 'TY', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 3, 2027',  lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Student status change — dependency and income impact on Medicaid', status: 'triggered', triggeredDate: 'Sep 22' },
      { id: 'CL-60202', initials: 'DN', medicaidStatus: 'Active', treatmentPlanEnd: 'Feb 17, 2027', lastServiceDate: 'Sep 21, 2026', daysRemaining: 0, riskReason: 'Immigration status change — eligibility confirmed', status: 'triggered', triggeredDate: 'Sep 21', workflowStatus: 'Closed' },
      { id: 'CL-60203', initials: 'SR', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 9, 2026',  lastServiceDate: 'Sep 19, 2026', daysRemaining: 0, riskReason: 'Income change reported — eligibility redetermination completed', status: 'triggered', triggeredDate: 'Sep 19', workflowStatus: 'Closed' },
      { id: 'CL-60204', initials: 'PC', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 4, 2026',  lastServiceDate: 'Sep 16, 2026', daysRemaining: 0, riskReason: 'Address change resolved — Medicaid record updated, redetermination mail rerouted', status: 'triggered', triggeredDate: 'Sep 16', workflowStatus: 'Closed' },
    ],
  },
  {
    name: 'Lisa Huang', credential: 'LCSW', team: 'West Team 2', county: 'West County',
    caseload: 20, triggeredCount: 18, atRiskCount: 2,
    notTriggered: [
      {
        id: 'CL-60301', initials: 'WK', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Jan 20, 2027', lastServiceDate: 'Aug 27, 2026',
        daysRemaining: 6, riskReason: 'Death of household member — benefits recalculated, coverage gap',
        workflowStatus: 'Needs appointment — CN / SDP / DHS',
        status: 'not-triggered', action: 'Schedule service',
      },
      {
        id: 'CL-60302', initials: 'IM', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Oct 8, 2026', lastServiceDate: 'Sep 5, 2026',
        daysRemaining: 6, riskReason: 'New employment — income threshold review, payer change pending',
        workflowStatus: 'Waiting on insurance decision',
        status: 'not-triggered', action: 'Check PA status',
      },
    ],
    triggered: [
      { id: 'CL-60401', initials: 'JT', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 14, 2026', lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Inherited assets reported — resource limit review triggered', status: 'triggered', triggeredDate: 'Sep 22' },
      { id: 'CL-60402', initials: 'BO', medicaidStatus: 'Active', treatmentPlanEnd: 'Mar 1, 2027',  lastServiceDate: 'Sep 20, 2026', daysRemaining: 0, riskReason: 'Household size change — benefits reviewed and updated', status: 'triggered', triggeredDate: 'Sep 20', workflowStatus: 'Closed' },
      { id: 'CL-60403', initials: 'ZP', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 28, 2026', lastServiceDate: 'Sep 18, 2026', daysRemaining: 0, riskReason: 'Employer coverage loss — Medicaid enrollment confirmed', status: 'triggered', triggeredDate: 'Sep 18', workflowStatus: 'Closed' },
      { id: 'CL-60404', initials: 'YH', medicaidStatus: 'Active', treatmentPlanEnd: 'Apr 6, 2027',  lastServiceDate: 'Sep 15, 2026', daysRemaining: 0, riskReason: 'Pregnancy reported — eligibility expanded, enrollment updated', status: 'triggered', triggeredDate: 'Sep 15', workflowStatus: 'Closed' },
    ],
  },
  // ── South Team 1 ────────────────────────────────────────────────────────────────
  {
    name: 'Tom Bradley', credential: 'LCSW', team: 'South Team 1', county: 'South County',
    caseload: 18, triggeredCount: 18, atRiskCount: 0,
    notTriggered: [],
    triggered: [
      { id: 'CL-70101', initials: 'FN', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 11, 2027', lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Disability status updated — SSI-linked Medicaid eligibility under review', status: 'triggered', triggeredDate: 'Sep 22' },
      { id: 'CL-70102', initials: 'GQ', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 5, 2026',  lastServiceDate: 'Sep 21, 2026', daysRemaining: 0, riskReason: 'Job loss reported — income drop verified, coverage maintained', status: 'triggered', triggeredDate: 'Sep 21', workflowStatus: 'Closed' },
      { id: 'CL-70103', initials: 'RX', medicaidStatus: 'Active', treatmentPlanEnd: 'Feb 20, 2027', lastServiceDate: 'Sep 19, 2026', daysRemaining: 0, riskReason: 'Spouse income change — redetermination completed, no gap in coverage', status: 'triggered', triggeredDate: 'Sep 19', workflowStatus: 'Closed' },
      { id: 'CL-70104', initials: 'LV', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 3, 2026',  lastServiceDate: 'Sep 17, 2026', daysRemaining: 0, riskReason: 'Separation reported — household eligibility reassessed and resolved', status: 'triggered', triggeredDate: 'Sep 17', workflowStatus: 'Closed' },
      { id: 'CL-70105', initials: 'NE', medicaidStatus: 'Active', treatmentPlanEnd: 'Apr 15, 2027', lastServiceDate: 'Sep 14, 2026', daysRemaining: 0, riskReason: 'New household member — redetermination completed successfully', status: 'triggered', triggeredDate: 'Sep 14', workflowStatus: 'Closed' },
    ],
  },
  {
    name: 'Kezia Okafor', credential: 'LPC', team: 'South Team 1', county: 'South County',
    caseload: 17, triggeredCount: 16, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-70201', initials: 'PJ', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Dec 25, 2026', lastServiceDate: 'Aug 30, 2026',
        daysRemaining: 6, riskReason: 'Rental assistance ended — income change affects eligibility',
        workflowStatus: 'Called — left voicemail',
        status: 'not-triggered', action: 'Schedule service',
      },
    ],
    triggered: [
      { id: 'CL-70301', initials: 'BW', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 7, 2027',  lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Second job started — income threshold review needed', status: 'triggered', triggeredDate: 'Sep 22' },
      { id: 'CL-70302', initials: 'TA', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 19, 2026', lastServiceDate: 'Sep 20, 2026', daysRemaining: 0, riskReason: 'Annual renewal flagged — documentation submitted and approved', status: 'triggered', triggeredDate: 'Sep 20', workflowStatus: 'Closed' },
      { id: 'CL-70303', initials: 'EC', medicaidStatus: 'Active', treatmentPlanEnd: 'Mar 8, 2027',  lastServiceDate: 'Sep 17, 2026', daysRemaining: 0, riskReason: 'Residency change — eligibility confirmed in new county', status: 'triggered', triggeredDate: 'Sep 17', workflowStatus: 'Closed' },
      { id: 'CL-70304', initials: 'KS', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 30, 2026', lastServiceDate: 'Sep 15, 2026', daysRemaining: 0, riskReason: 'Self-employment income reported — eligibility re-verified', status: 'triggered', triggeredDate: 'Sep 15', workflowStatus: 'Closed' },
    ],
  },
  // ── North Team 3 ──────────────────────────────────────────────────────────────
  {
    name: 'Marcus Chen', credential: 'LPC', team: 'North Team 3', county: 'North County',
    caseload: 25, triggeredCount: 24, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-42101', initials: 'SD', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Jan 14, 2027', lastServiceDate: 'Sep 5, 2026',
        daysRemaining: 6, riskReason: 'Pregnancy reported — expanded Medicaid eligibility under review',
        workflowStatus: 'Waiting on insurance decision',
        status: 'not-triggered', action: 'Schedule service',
      },
    ],
    triggered: [
      { id: 'CL-42201', initials: 'HM', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 20, 2026', lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Child moved out — household size reduction, eligibility reassessment due', status: 'triggered', triggeredDate: 'Sep 22' },
      { id: 'CL-42202', initials: 'JO', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 11, 2026', lastServiceDate: 'Sep 21, 2026', daysRemaining: 0, riskReason: 'Student status change — eligibility reviewed, coverage continued', status: 'triggered', triggeredDate: 'Sep 21', workflowStatus: 'Closed' },
      { id: 'CL-42203', initials: 'CP', medicaidStatus: 'Active', treatmentPlanEnd: 'Feb 25, 2027', lastServiceDate: 'Sep 19, 2026', daysRemaining: 0, riskReason: 'Disability status update — benefits adjusted, coverage active', status: 'triggered', triggeredDate: 'Sep 19', workflowStatus: 'Closed' },
      { id: 'CL-42204', initials: 'WQ', medicaidStatus: 'Active', treatmentPlanEnd: 'Apr 3, 2027',  lastServiceDate: 'Sep 16, 2026', daysRemaining: 0, riskReason: 'Immigration status change — eligibility confirmed', status: 'triggered', triggeredDate: 'Sep 16', workflowStatus: 'Closed' },
      { id: 'CL-42205', initials: 'RU', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 17, 2026', lastServiceDate: 'Sep 13, 2026', daysRemaining: 0, riskReason: 'Income change reported — eligibility redetermination completed', status: 'triggered', triggeredDate: 'Sep 13', workflowStatus: 'Closed' },
    ],
  },
  {
    name: 'Priya Osei', credential: 'LCSW', team: 'North Team 3', county: 'North County',
    caseload: 25, triggeredCount: 24, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-42301', initials: 'AF', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Nov 1, 2026', lastServiceDate: 'Sep 2, 2026',
        daysRemaining: 6, riskReason: 'Disability status change — SSI/Medicaid coordination required',
        workflowStatus: 'Needs appointment — CN / SDP / DHS',
        status: 'not-triggered', action: 'Open renewal request',
      },
    ],
    triggered: [
      { id: 'CL-42401', initials: 'XN', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 29, 2027', lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Rental income added — asset change flagged for Medicaid redetermination', status: 'triggered', triggeredDate: 'Sep 22' },
      { id: 'CL-42402', initials: 'YB', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 7, 2026',  lastServiceDate: 'Sep 20, 2026', daysRemaining: 0, riskReason: 'Address change resolved — Medicaid record updated, redetermination mail rerouted', status: 'triggered', triggeredDate: 'Sep 20', workflowStatus: 'Closed' },
      { id: 'CL-42403', initials: 'ZG', medicaidStatus: 'Active', treatmentPlanEnd: 'Mar 14, 2027', lastServiceDate: 'Sep 18, 2026', daysRemaining: 0, riskReason: 'Household size change — benefits reviewed and updated', status: 'triggered', triggeredDate: 'Sep 18', workflowStatus: 'Closed' },
      { id: 'CL-42404', initials: 'OT', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 23, 2026', lastServiceDate: 'Sep 15, 2026', daysRemaining: 0, riskReason: 'Employer coverage loss — Medicaid enrollment confirmed', status: 'triggered', triggeredDate: 'Sep 15', workflowStatus: 'Closed' },
      { id: 'CL-42405', initials: 'IP', medicaidStatus: 'Active', treatmentPlanEnd: 'Apr 20, 2027', lastServiceDate: 'Sep 12, 2026', daysRemaining: 0, riskReason: 'Pregnancy reported — eligibility expanded, enrollment updated', status: 'triggered', triggeredDate: 'Sep 12', workflowStatus: 'Closed' },
    ],
  },
  // ── West Team 1 — 2nd clinician ──────────────────────────────────────────
  {
    name: 'Alex Rivera', credential: 'LPC', team: 'West Team 1', county: 'West County',
    caseload: 20, triggeredCount: 14, atRiskCount: 3,
    notTriggered: [
      {
        id: 'CL-30901', initials: 'UV', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Dec 16, 2026', lastServiceDate: 'Aug 20, 2026',
        daysRemaining: 6, riskReason: 'Address change reported — unreachable at prior contact info',
        workflowStatus: 'Called — left voicemail',
        status: 'not-triggered', action: 'Assign care navigator',
      },
      {
        id: 'CL-30902', initials: 'WX', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Oct 5, 2026', lastServiceDate: 'Sep 3, 2026',
        daysRemaining: 6, riskReason: 'Student status change — coverage eligibility impacted',
        workflowStatus: 'Closed',
        status: 'not-triggered', action: 'Check PA status',
      },
      {
        id: 'CL-30903', initials: 'YZ', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Feb 12, 2027', lastServiceDate: 'Aug 9, 2026',
        daysRemaining: 6, riskReason: 'Household income increase — Medicaid eligibility reassessment due',
        workflowStatus: 'Flagged',
        status: 'not-triggered', action: 'Schedule service',
      },
    ],
    triggered: [
      { id: 'CL-30911', initials: 'AB', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 2, 2027',  lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'Household income increase — Medicaid eligibility reassessment due', status: 'triggered', triggeredDate: 'Sep 22' },
      { id: 'CL-30912', initials: 'CD', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 17, 2026', lastServiceDate: 'Sep 21, 2026', daysRemaining: 0, riskReason: 'Job loss reported — income drop verified, coverage maintained', status: 'triggered', triggeredDate: 'Sep 21', workflowStatus: 'Closed' },
      { id: 'CL-30913', initials: 'EF', medicaidStatus: 'Active', treatmentPlanEnd: 'Mar 28, 2027', lastServiceDate: 'Sep 19, 2026', daysRemaining: 0, riskReason: 'Spouse income change — redetermination completed, no gap in coverage', status: 'triggered', triggeredDate: 'Sep 19', workflowStatus: 'Closed' },
      { id: 'CL-30914', initials: 'GH', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 13, 2026', lastServiceDate: 'Sep 16, 2026', daysRemaining: 0, riskReason: 'Separation reported — household eligibility reassessed and resolved', status: 'triggered', triggeredDate: 'Sep 16', workflowStatus: 'Closed' },
    ],
  },
  // ── North Team 2 — 3rd clinician ─────────────────────────────────────────────
  {
    name: 'Rachel Kim', credential: 'LCSW', team: 'North Team 2', county: 'North County',
    caseload: 23, triggeredCount: 17, atRiskCount: 4,
    notTriggered: [
      {
        id: 'CL-80101', initials: 'TG', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Oct 18, 2026', lastServiceDate: 'Sep 4, 2026',
        daysRemaining: 8, riskReason: 'Income loss — Medicaid redetermination overdue, coverage at risk',
        workflowStatus: 'Flagged',
        status: 'not-triggered', action: 'Schedule service',
      },
      {
        id: 'CL-80102', initials: 'JV', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Dec 16, 2026', lastServiceDate: 'Aug 28, 2026',
        daysRemaining: 8, riskReason: 'Address change flagged — Medicaid record must be updated',
        workflowStatus: 'Called — left voicemail',
        status: 'not-triggered', action: 'Schedule service',
      },
      {
        id: 'CL-80103', initials: 'ME', medicaidStatus: 'Lost',
        treatmentPlanEnd: 'Nov 9, 2026', lastServiceDate: 'Sep 6, 2026',
        daysRemaining: 8, riskReason: 'Household size decreased — benefit recalculation resulted in loss',
        workflowStatus: 'Waiting on insurance decision',
        status: 'not-triggered', alert: 'medicaid-loss', retroWindow: 5, action: 'Open retro workflow',
      },
      {
        id: 'CL-80104', initials: 'SB', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Jan 25, 2027', lastServiceDate: 'Sep 1, 2026',
        daysRemaining: 8, riskReason: 'New job — income increase may affect Medicaid eligibility',
        workflowStatus: 'Waiting on client to send documents',
        status: 'not-triggered', action: 'Assign care navigator',
      },
    ],
    triggered: [
      { id: 'CL-80201', initials: 'PL', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 22, 2026', lastServiceDate: 'Sep 22, 2026', daysRemaining: 0, riskReason: 'New household member — redetermination completed successfully', status: 'triggered', triggeredDate: 'Sep 22', workflowStatus: 'Closed' },
      { id: 'CL-80202', initials: 'AO', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 4, 2026',  lastServiceDate: 'Sep 20, 2026', daysRemaining: 0, riskReason: 'Annual renewal flagged — documentation submitted and approved', status: 'triggered', triggeredDate: 'Sep 20', workflowStatus: 'Closed' },
      { id: 'CL-80203', initials: 'KF', medicaidStatus: 'Active', treatmentPlanEnd: 'Feb 11, 2027', lastServiceDate: 'Sep 18, 2026', daysRemaining: 0, riskReason: 'Residency change — eligibility confirmed in new county', status: 'triggered', triggeredDate: 'Sep 18', workflowStatus: 'Closed' },
      { id: 'CL-80204', initials: 'NW', medicaidStatus: 'Active', treatmentPlanEnd: 'Mar 20, 2027', lastServiceDate: 'Sep 16, 2026', daysRemaining: 0, riskReason: 'Self-employment income reported — eligibility re-verified', status: 'triggered', triggeredDate: 'Sep 16', workflowStatus: 'Closed' },
      { id: 'CL-80205', initials: 'DX', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 29, 2026', lastServiceDate: 'Sep 14, 2026', daysRemaining: 0, riskReason: 'Student status change — eligibility reviewed, coverage continued', status: 'triggered', triggeredDate: 'Sep 14', workflowStatus: 'Closed' },
      { id: 'CL-80206', initials: 'HY', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 6, 2027',  lastServiceDate: 'Sep 12, 2026', daysRemaining: 0, riskReason: 'Disability status update — benefits adjusted, coverage active', status: 'triggered', triggeredDate: 'Sep 12', workflowStatus: 'Closed' },
      { id: 'CL-80207', initials: 'QC', medicaidStatus: 'Active', treatmentPlanEnd: 'Apr 18, 2027', lastServiceDate: 'Sep 10, 2026', daysRemaining: 0, riskReason: 'Immigration status change — eligibility confirmed', status: 'triggered', triggeredDate: 'Sep 10', workflowStatus: 'Closed' },
      { id: 'CL-80208', initials: 'VZ', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 1, 2026',  lastServiceDate: 'Sep 8, 2026',  daysRemaining: 0, riskReason: 'Income change reported — eligibility redetermination completed', status: 'triggered', triggeredDate: 'Sep 8', workflowStatus: 'Closed' },
      { id: 'CL-80209', initials: 'LR', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 27, 2026', lastServiceDate: 'Sep 5, 2026',  daysRemaining: 0, riskReason: 'Address change resolved — Medicaid record updated, redetermination mail rerouted', status: 'triggered', triggeredDate: 'Sep 5', workflowStatus: 'Closed' },
      { id: 'CL-80210', initials: 'BM', medicaidStatus: 'Active', treatmentPlanEnd: 'Feb 3, 2027',  lastServiceDate: 'Sep 3, 2026',  daysRemaining: 0, riskReason: 'Household size change — benefits reviewed and updated', status: 'triggered', triggeredDate: 'Sep 3', workflowStatus: 'Closed' },
      { id: 'CL-80211', initials: 'GT', medicaidStatus: 'Active', treatmentPlanEnd: 'Mar 9, 2027',  lastServiceDate: 'Sep 1, 2026',  daysRemaining: 0, riskReason: 'Employer coverage loss — Medicaid enrollment confirmed', status: 'triggered', triggeredDate: 'Sep 1', workflowStatus: 'Closed' },
      { id: 'CL-80212', initials: 'OJ', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 14, 2026', lastServiceDate: 'Aug 29, 2026', daysRemaining: 0, riskReason: 'Pregnancy reported — eligibility expanded, enrollment updated', status: 'triggered', triggeredDate: 'Aug 29', workflowStatus: 'Closed' },
      { id: 'CL-80213', initials: 'WS', medicaidStatus: 'Active', treatmentPlanEnd: 'Jan 17, 2027', lastServiceDate: 'Aug 26, 2026', daysRemaining: 0, riskReason: 'Job loss reported — income drop verified, coverage maintained', status: 'triggered', triggeredDate: 'Aug 26', workflowStatus: 'Closed' },
    ],
  },
];

const TEAM_ROWS: TeamRow[] = [
  { team: 'North Team 1',  county: 'North', caseload: 47, triggeredPct: 56.3, atRisk: 7,  trend: 'up'   },
  { team: 'North Team 2',  county: 'North', caseload: 43, triggeredPct: 25.0, atRisk: 21, trend: 'up'   },
  { team: 'East Team 1',   county: 'East',  caseload: 38, triggeredPct: 40.0, atRisk: 6,  trend: 'flat' },
  { team: 'West Team 2',   county: 'West',  caseload: 41, triggeredPct: 18.2, atRisk: 9,  trend: 'down' },
  { team: 'South Team 1',  county: 'South', caseload: 35, triggeredPct: 33.3, atRisk: 6,  trend: 'up'   },
  { team: 'North Team 3',  county: 'North', caseload: 50, triggeredPct: 28.6, atRisk: 10, trend: 'flat' },
  { team: 'East Team 2',   county: 'East',  caseload: 44, triggeredPct: 22.2, atRisk: 14, trend: 'up'   },
  { team: 'West Team 1',   county: 'West',  caseload: 39, triggeredPct: 14.3, atRisk: 13, trend: 'down' },
];

const ORG_AT_RISK: OrgAtRiskClient[] = [
  { id: 'CL-10238', team: 'North Team 1',    primaryRisk: 'Address change — Medicaid lost, retro window 8 days', daysRemaining: 6, action: 'View retro workflow'       },
  { id: 'CL-11402', team: 'West Team 1', primaryRisk: 'Income loss — unreachable, coverage at risk',          daysRemaining: 6, action: 'Assign care navigator'      },
  { id: 'CL-10774', team: 'North Team 1',    primaryRisk: 'Household change — payer mismatch flagged',            daysRemaining: 6, action: 'Review SDP routing'         },
  { id: 'CL-11819', team: 'West Team 1', primaryRisk: 'Job loss — treatment plan renewal overdue',            daysRemaining: 6, action: 'Open renewal request'       },
  { id: 'CL-12044', team: 'East Team 1',   primaryRisk: 'Employer coverage ended — PA pending 14 days',         daysRemaining: 6, action: 'Check PA status'            },
  { id: 'CL-10519', team: 'North Team 1',    primaryRisk: 'Income reduction — Medicaid eligibility at risk',      daysRemaining: 6, action: 'Schedule triggering service' },
];

const CLIENT_NAMES: Record<string, string> = {
  'CL-10001': 'Marcus Reed',
  'CL-10238': 'James Spencer',   'CL-10519': 'Alex Rodriguez',  'CL-10774': 'Michael Webb',
  'CL-11042': 'Thomas Clark',    'CL-11198': 'Laura Bennett',
  'CL-10102': 'Karen Price',     'CL-10145': 'Rachel Moore',    'CL-10203': 'Grace Hill',
  'CL-10311': 'Nathan Ford',     'CL-10402': 'David Walsh',
  'CL-20441': 'Rita Kim',        'CL-20589': 'Brian Torres',
  'CL-20104': 'Lena Nguyen',     'CL-20198': 'Sofia Garcia',    'CL-20233': 'Patrick Owen',
  'CL-20317': 'Clara Evans',     'CL-20405': 'Tyler Harris',
  'CL-30102': 'Maria Novak',     'CL-30214': 'James Reid',      'CL-30318': 'Elena Santos',
  'CL-30456': 'Carlos Torres',   'CL-30612': 'William Ford',    'CL-30788': 'Lisa Sanders',
  'CL-30891': 'David Holmes',
  'CL-30011': 'Beth Kim',        'CL-30044': 'Victor Reid',     'CL-30077': 'Felix Adams',
  'CL-30088': 'Quinn Mitchell',  'CL-30099': 'Hannah Jones',
  'CL-40101': 'Patricia Davis',
  'CL-40201': 'Karen Reid',      'CL-40202': 'Brian Newton',    'CL-40203': 'Marcus Owen',
  'CL-40204': 'Victoria Lee',    'CL-40205': 'Thomas Walker',
  'CL-41101': 'Gregory Fisher',
  'CL-41201': 'Hannah Lewis',    'CL-41202': 'Jacob Kim',       'CL-41203': 'Quincy Stone',
  'CL-41204': 'Aria Bell',       'CL-41205': 'Ryan Foster',
  'CL-41301': 'Yara Murphy',
  'CL-41401': 'Carlos Nunez',    'CL-41402': 'Diana Torres',    'CL-41403': 'Ethan Hall',
  'CL-41404': 'Paige Brown',
  'CL-50101': 'Oscar Wilson',
  'CL-50201': 'Zoe Adams',       'CL-50202': 'Xavier Cruz',     'CL-50203': 'Uma Vargas',
  'CL-50204': 'Sofia Torres',
  'CL-51101': 'Felix Martin',
  'CL-51201': 'Iris Lopez',      'CL-51202': 'Grace Kim',       'CL-51203': 'Nina Jones',
  'CL-51204': 'Blake Harris',    'CL-51205': 'Olivia Evans',
  'CL-51301': 'William Parker',  'CL-51302': 'Rachel Davis',
  'CL-51401': 'Ana Vargas',      'CL-51402': 'Liam Quinn',      'CL-51403': 'Maya Zhang',
  'CL-51404': 'Kyle Underwood',
  'CL-60101': 'Harper Brown',    'CL-60102': 'Ethan Grant',
  'CL-60201': 'Tyler Young',     'CL-60202': 'Diana Nguyen',    'CL-60203': 'Sam Rivera',
  'CL-60204': 'Paige Collins',
  'CL-60301': 'William Kim',     'CL-60302': 'Isabel Martinez',
  'CL-60401': 'Jordan Torres',   'CL-60402': 'Brandon Ortiz',   'CL-60403': 'Zoe Park',
  'CL-60404': 'Yara Hernandez',
  'CL-70101': 'Frances Nash',    'CL-70102': 'George Quinn',    'CL-70103': 'Ruby Xavier',
  'CL-70104': 'Lucas Vega',      'CL-70105': 'Nina Edwards',
  'CL-70201': 'Patricia Johnson',
  'CL-70301': 'Beth Walker',     'CL-70302': 'Tyler Anderson',  'CL-70303': 'Emma Carter',
  'CL-70304': 'Kyle Stevens',
  'CL-42101': 'Sofia Diaz',
  'CL-42201': 'Hannah Morris',   'CL-42202': 'Jake Ortega',     'CL-42203': 'Chloe Price',
  'CL-42204': 'Will Quinn',      'CL-42205': 'Rita Upton',
  'CL-42301': 'Alex Fields',
  'CL-42401': 'Xavier Nash',     'CL-42402': 'Yara Boyd',       'CL-42403': 'Zoe Gray',
  'CL-42404': 'Omar Torres',     'CL-42405': 'Iris Park',
  'CL-30901': 'Uma Vargas',      'CL-30902': 'Wesley Xavier',   'CL-30903': 'Yara Zimmerman',
  'CL-30911': 'Adrian Bell',     'CL-30912': 'Clara Davis',     'CL-30913': 'Ethan Flynn',
  'CL-30914': 'Grace Howard',
  'CL-11402': 'Leon Torres',     'CL-11819': 'Samuel Price',    'CL-12044': 'Ray Kim',
  'CL-80101': 'Tyler Grant',     'CL-80102': 'Julia Vasquez',   'CL-80103': 'Maria Ellis',
  'CL-80104': 'Samuel Brooks',
  'CL-80201': 'Patricia Lane',   'CL-80202': 'Aaron Owens',     'CL-80203': 'Kevin Fox',
  'CL-80204': 'Natalie Wade',    'CL-80205': 'Derek Xu',        'CL-80206': 'Hannah Young',
  'CL-80207': 'Quinn Chen',      'CL-80208': 'Victor Zhang',    'CL-80209': 'Lily Ross',
  'CL-80210': 'Brandon Mills',   'CL-80211': 'Grace Tran',      'CL-80212': 'Owen James',
  'CL-80213': 'Wendy Scott',
};

// ─── Alert data ───────────────────────────────────────────────────────────────

interface AlertItem {
  icon: string;
  title: string;
  desc: string;
  status: string;
  statusType: 'running' | 'done';
  critical?: boolean;
  time: string;
  cta?: string;
}

const REAL_TIME_ALERTS: AlertItem[] = [
  {
    icon: '⚡', critical: true,
    title: 'Address change: James Spencer',
    desc: 'Address change triggered Medicaid termination — application completed, awaiting approval. 8-day retro window open.',
    status: 'Running', statusType: 'running', time: '13:41',
  },
  {
    icon: '⚡', critical: true,
    title: 'Address change: Marcus Reed',
    desc: 'Address change flagged — client must update Medicaid record to meet State terms and ensure redetermination mail reaches correct address.',
    status: 'Running', statusType: 'running', time: '13:30',
  },
  {
    icon: '⚡', critical: true,
    title: 'Income loss: Maria Novak',
    desc: `Income loss detected ${daysAgo(18)} — retro-eligibility window: 4 days remaining. Application awaiting approval.`,
    status: 'Running', statusType: 'running', time: '13:09',
  },
  {
    icon: '🔍',
    title: 'Household change: Michael Webb',
    desc: 'Household composition change flagged — payer routing under review, clinician notified.',
    status: 'In review', statusType: 'running', time: '12:33',
  },
  {
    icon: '🔍',
    title: 'Household change: Elena Santos',
    desc: 'Spouse income change impacted household eligibility — payer mismatch detected, review pending.',
    status: 'In review', statusType: 'running', time: '12:10',
  },
  {
    icon: '↻',
    title: 'Income reduction: Alex Rodriguez',
    desc: 'Income reduction reported — Medicaid eligibility at risk mid-year. Voicemail left, follow-up needed.',
    status: 'Awaiting response', statusType: 'running', time: '11:58',
  },
  {
    icon: '↻',
    title: 'Address change: James Reid',
    desc: 'Moved out of county — coverage transfer in progress. Renewal request opened.',
    status: 'Awaiting response', statusType: 'running', time: '11:20',
  },
  {
    icon: '✉',
    title: 'Outreach batch sent',
    desc: '18 clinicians notified — 24 flagged clients not yet contacted this month',
    status: 'Delivered', statusType: 'done', time: '10:30',
  },
  {
    icon: '📄',
    title: 'Missing documents: Laura Bennett',
    desc: 'Medicaid application in progress after employer coverage lost — missing documents flagged to clinician.',
    status: 'Flagged', statusType: 'done', time: '10:07',
  },
  {
    icon: '📄',
    title: 'Household change: Brian Torres',
    desc: 'New household member added — benefits redetermination pending, client needs help uploading documents.',
    status: 'Flagged', statusType: 'done', time: '09:45',
  },
  {
    icon: '📋',
    title: 'Eligibility audit: North Team 2',
    desc: '6 clients approaching 90-day redetermination deadline — reminders sent to clinicians.',
    status: 'Sent', statusType: 'done', time: '09:15',
  },
];

const ACTIVITY_FEED: ActivityItem[] = [
  { time: '08:14', text: 'Sent outreach reminders to 18 clinicians for 24 flagged clients not yet contacted',  type: 'email'       },
  { time: '09:32', text: 'Detected Medicaid loss for Leon Torres — initiated retro-eligibility window',          type: 'eligibility' },
  { time: '10:07', text: 'Eligibility audit completed for West Team 1 — 4 stale records flagged',             type: 'audit'       },
  { time: '11:45', text: 'Coverage gap resolved for Sandra Nguyen — Medicaid reinstated retroactively',       type: 'eligibility' },
  { time: '13:20', text: 'Redetermination reminders sent to 6 clients approaching 90-day deadline',           type: 'email'       },
];

// ─── Small helpers ────────────────────────────────────────────────────────────

function MedicaidPill({ status }: { status: MedicaidStatus }) {
  return (
    <span className={`ccbhc-pill ccbhc-pill--medicaid-${status.toLowerCase().replace(' ', '-')}`} style={{ alignSelf: 'flex-start' }}>
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

// Ordered list of unique teams (preserving TEAM_ROWS order for consistency)
const TEAM_ORDER = TEAM_ROWS.map(r => r.team);

function CaseloadView({ onClientClick, routedClients, clientStatuses }: { onClientClick: (id: string) => void; routedClients: Set<string>; clientStatuses: Map<string, string> }) {
  const [triggeredPage, setTriggeredPage] = useState(0);
  const TRIGGERED_PAGE_SIZE = 15;
  const [selectedTeam, setSelectedTeam] = useState<string>('__all__');
  type FlaggedSortCol = 'client' | 'provider' | 'lastService' | 'planEnds' | 'status';
  const [flaggedSort, setFlaggedSort] = useState<{ col: FlaggedSortCol; dir: 'asc' | 'desc' }>({ col: 'planEnds', dir: 'asc' });
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState<string>('Sep 2026');
  const [showResolved, setShowResolved] = useState(false);
  function toggleFlaggedSort(col: FlaggedSortCol) {
    setFlaggedSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
    setTriggeredPage(0);
  }

  // All clinicians in the selected team (or all teams)
  const teamClinicians = selectedTeam === '__all__' ? CLINICIANS : CLINICIANS.filter(c => c.team === selectedTeam);

  // Filter out clients that have been actioned, and by selected month
  const monthAbbr = selectedMonth.split(' ')[0]; // e.g. "Sep"
  const teamCliniciansFiltered = teamClinicians.map(c => ({
    ...c,
    notTriggered: c.notTriggered.filter(cl =>
      !routedClients.has(cl.id) && cl.lastServiceDate.startsWith(monthAbbr)
    ),
    triggered: c.triggered.filter(cl => cl.lastServiceDate.startsWith(monthAbbr)),
  }));

  // Aggregate KPIs
  const totalCaseload    = teamClinicians.reduce((s, c) => s + c.caseload, 0);
  const totalTriggered   = teamClinicians.reduce((s, c) => s + c.triggeredCount, 0);
  const totalAtRisk      = teamClinicians.reduce((s, c) => s + c.atRiskCount, 0);
  const totalNotTriggered = teamCliniciansFiltered.reduce((s, c) => s + c.notTriggered.length, 0);
  const totalFlagged     = teamCliniciansFiltered.reduce((s, c) => s + c.notTriggered.length + c.triggered.length, 0);
  const totalNew         = teamCliniciansFiltered.reduce((s, c) => s + [...c.notTriggered, ...c.triggered].filter(cl => !cl.workflowStatus || cl.workflowStatus === 'New').length, 0);
  const totalResolved    = teamCliniciansFiltered.reduce((s, c) => s + [...c.notTriggered, ...c.triggered].filter(cl => cl.workflowStatus === 'Closed').length, 0);
  const totalContacted   = teamCliniciansFiltered.reduce((s, c) => s + [...c.notTriggered, ...c.triggered].filter(cl => cl.workflowStatus && cl.workflowStatus !== 'New').length, 0);
  const triggerPct       = totalCaseload > 0 ? Math.round((totalTriggered / totalCaseload) * 100) : 0;

  return (
    <div className="ccbhc-layout">
      {/* ── Main content ── */}
      <div className="ccbhc-main">
        {/* Sub-header */}
        <div className="ccbhc-subheader">
          <div className="ccbhc-subheader__left">
            <select
              className="ccbhc-clinician-select"
              value={selectedTeam}
              onChange={e => { setSelectedTeam(e.target.value); setTriggeredPage(0); }}
            >
              <option value="__all__">All teams</option>
              {TEAM_ORDER.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
          <div className="ccbhc-subheader__right">
            <select
              className="ccbhc-month-select"
              value={selectedMonth}
              onChange={e => { setSelectedMonth(e.target.value); setTriggeredPage(0); }}
            >
              <option>Sep 2026</option>
              <option>Aug 2026</option>
              <option>Jul 2026</option>
            </select>
          </div>
        </div>

        {/* KPI strip */}
        <div className="ccbhc-kpi-row">
          <KpiCard label="New"                     value={`${totalNew} clients`} sub="Not yet contacted" />
          <KpiCard label="Eligibility reviews done" value={`${totalFlagged > 0 ? Math.round((totalContacted / totalFlagged) * 100) : 0}%`} sub={`${totalContacted} of ${totalFlagged} clients contacted`} />
          <KpiCard label="Resolved"                value={`${totalResolved} clients`} sub="Case closed" />
          <KpiCard label="Flagged"                 value={`${totalFlagged} clients`} sub="Require action" />
        </div>


        {/* All clients */}
        {(() => {
          const notTriggeredRows = teamCliniciansFiltered.flatMap(clinician =>
            clinician.notTriggered.map((client, i) => ({ client, clinician, isFirstForClinician: i === 0, primaryReason: client.riskReason }))
          );
          const triggeredRows = teamCliniciansFiltered.flatMap(clinician =>
            clinician.triggered.map((client, i) => ({ client, clinician, isFirstForClinician: i === 0, primaryReason: client.riskReason || 'Annual service triggered — Medicaid renewal review needed' }))
          );
          const effectiveStatus = (client: { id: string; workflowStatus?: string }) =>
            (clientStatuses.get(client.id) ?? client.workflowStatus) as WorkflowStatus | undefined;

          const STATUS_INFO: Record<string, { last: string; next: string; days: number }> = {
            'Flagged':                                  { last: 'Flagged by system',              next: 'Start workflow',               days: 0 },
            'Called — left voicemail':                  { last: 'Called — left voicemail',         next: 'Follow-up call',               days: 2 },
            'Called — no time to talk, call back':      { last: 'Called — no time to talk',        next: 'Call back',                    days: 1 },
            'Unreachable':                              { last: 'Multiple attempts — unreachable',  next: 'Escalate or close',            days: 1 },
            'Knows — will do it themselves':            { last: 'Client confirmed — self-managing', next: 'Confirm resolution',           days: 7 },
            'Wants help':                               { last: 'Client confirmed — wants help',    next: 'Schedule appointment',         days: 1 },
            'Claims renewed — not confirmed':           { last: 'Renewal submitted',                next: 'Confirm with state',           days: 5 },
            'Needs appointment — CN / SDP / DHS':       { last: 'Appointment needed',               next: 'Schedule with CN / SDP / DHS', days: 2 },
            'Appointment scheduled':                    { last: 'Appointment scheduled',            next: 'Confirm attendance',           days: 3 },
            'Needs the insurance hotline called':       { last: 'Hotline call needed',              next: 'Call insurance hotline',       days: 1 },
            'Waiting on insurance decision':            { last: 'Request submitted',                next: 'Check decision status',        days: 7 },
            'Denied — appeal or reapply':               { last: 'Claim denied',                     next: 'File appeal or reapply',       days: 3 },
            'Confirmed by the state feed':              { last: 'Confirmed via state feed',         next: 'Close workflow',               days: 1 },
            'Waiting on pay stubs':                     { last: 'Pay stubs requested',              next: 'Follow up on documents',       days: 5 },
            'Waiting on Social Security award letter':  { last: 'SS award letter requested',        next: 'Follow up on letter',          days: 7 },
            'Needs proof of address':                   { last: 'Address proof needed',             next: 'Collect proof of address',     days: 3 },
            'Needs ID or birth certificate':            { last: 'ID / birth cert needed',           next: 'Collect ID or birth cert',     days: 3 },
            'No email account':                         { last: 'No email on file',                 next: 'Set up email account',         days: 2 },
            'No OHCA portal access':                    { last: 'No portal access',                 next: 'Set up OHCA portal access',    days: 2 },
            'Needs transport to DHS':                   { last: 'Transport needed',                 next: 'Arrange DHS transport',        days: 3 },
            'Waiting on client to send documents':      { last: 'Documents requested',              next: 'Follow up on documents',       days: 5 },
            'Office visit scheduled':                   { last: 'Office visit scheduled',           next: 'Confirm attendance',           days: 3 },
            'Called — DHS walkthrough done':            { last: 'DHS walkthrough completed',        next: 'Confirm enrollment',           days: 2 },
            'Closed':                                   { last: 'Workflow closed',                  next: '—',                            days: 0 },
          };
          const nextStepDate = (days: number) => {
            const d = new Date('2026-09-24');
            d.setDate(d.getDate() + days);
            return days === 0 ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          };
          const getStatusInfo = (ws: string | undefined) => STATUS_INFO[ws ?? 'Flagged'] ?? { last: ws ?? 'Flagged', next: '—', days: 0 };
          const unsortedRows = [...notTriggeredRows, ...triggeredRows];
          const allRows = [...unsortedRows].sort((a, b) => {
            const dir = flaggedSort.dir === 'asc' ? 1 : -1;
            switch (flaggedSort.col) {
              case 'client':   return dir * (CLIENT_NAMES[a.client.id] ?? a.client.id).localeCompare(CLIENT_NAMES[b.client.id] ?? b.client.id);
              case 'provider': return dir * a.clinician.name.localeCompare(b.clinician.name);
              case 'lastService': return dir * (a.client.lastServiceDate ?? '').localeCompare(b.client.lastServiceDate ?? '');
              case 'planEnds': return dir * (a.client.treatmentPlanEnd ?? '').localeCompare(b.client.treatmentPlanEnd ?? '');
              case 'status': {
                const STATUS_ORDER: WorkflowStatus[] = [
                  'New',
                  'Called, left voicemail',
                  'Called, completed application — awaiting approval',
                  'Called, needs help uploading docs — office appt needed',
                  'Called, needs help uploading docs — DHS escort needed',
                  'Called, needs help with address update',
                  'Missing documents',
                  'Assigned to Case Manager',
                  'Notified Outreach Team',
                  'Pending supervisor review',
                  'Closed',
                ];
                const ai = STATUS_ORDER.indexOf(effectiveStatus(a.client) ?? 'New');
                const bi = STATUS_ORDER.indexOf(effectiveStatus(b.client) ?? 'New');
                return dir * ((ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi));
              }
              default: return 0;
            }
          });
          const visibleRows = showResolved ? allRows : allRows.filter(r => effectiveStatus(r.client) !== 'Closed');
          const totalPages = Math.ceil(visibleRows.length / TRIGGERED_PAGE_SIZE);
          const pageRows = visibleRows.slice(triggeredPage * TRIGGERED_PAGE_SIZE, (triggeredPage + 1) * TRIGGERED_PAGE_SIZE);
          return (
            <div className="ccbhc-section">
              <div className="ccbhc-section__title-row">
                <span className="ccbhc-section__title ccbhc-section__title--alert">Flagged</span>
                <span className="ccbhc-section__count ccbhc-section__count--alert">{visibleRows.length}</span>
                <label className="ccbhc-toggle-label" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary, #64748b)', cursor: 'pointer' }}>
                  <span>Show resolved</span>
                  <span
                    role="checkbox"
                    aria-checked={showResolved}
                    onClick={() => { setShowResolved(v => !v); setTriggeredPage(0); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', width: 32, height: 18, borderRadius: 9,
                      background: showResolved ? '#4f46e5' : '#cbd5e1',
                      transition: 'background 0.2s', cursor: 'pointer', padding: '2px', boxSizing: 'border-box',
                    }}
                  >
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%', background: '#fff',
                      transform: showResolved ? 'translateX(14px)' : 'translateX(0)',
                      transition: 'transform 0.2s', display: 'block',
                    }} />
                  </span>
                </label>
              </div>
              <div className="ccbhc-card">
                <div className="ccbhc-table-wrap">
                  <table className="ccbhc-table">
                    <colgroup>
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '22%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {([
                          { label: 'Client',         col: 'client'      },
                          { label: 'Team member',    col: 'provider'    },
                          { label: 'Primary reason', col: null          },
                          { label: 'Last service',   col: 'lastService' },
                          { label: 'Plan ends',      col: 'planEnds'    },
                          { label: 'Status',         col: 'status'      },
                          { label: 'Next step',      col: null          },
                        ] as { label: string; col: FlaggedSortCol | null }[]).map(({ label, col }) => (
                          <th
                            key={label}
                            onClick={col ? () => toggleFlaggedSort(col) : undefined}
                            style={col ? { cursor: 'pointer', userSelect: 'none' } : undefined}
                          >
                            {label}
                            {col && (
                              <span className="ccbhc-sort-icon">
                                {flaggedSort.col === col ? (flaggedSort.dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map(({ client, clinician, isFirstForClinician, primaryReason }) => (
                        <tr key={client.id} style={{ cursor: 'pointer' }} onClick={() => onClientClick(client.id)}>
                          <td className="ccbhc-table__id">{CLIENT_NAMES[client.id] ?? client.id}</td>
                          <td>
                            <span className="ccbhc-table__team">{clinician.name}</span><br /><span className="ccbhc-provider-cred">{{ LCSW: 'Care Coordinator', LPC: 'Case Manager', SDP: 'Care Coordinator', BHC: 'Case Manager' }[clinician.credential] ?? clinician.credential}</span>
                          </td>
                          <td className="ccbhc-table__risk">{primaryReason.split(' — ')[0]}</td>
                          <td>{client.lastServiceDate}</td>
                          <td>{client.treatmentPlanEnd}</td>
                          <td>
                            <div className="ccbhc-wf-status-parts">
                              {(STATUS_PARTS[effectiveStatus(client) ?? 'Flagged'] ?? STATUS_PARTS['Flagged']).map((part, pi) => (
                                <span key={pi} className={`ccbhc-wf-part ccbhc-wf-part--${part.variant}`}>{part.label}</span>
                              ))}
                            </div>
                          </td>
                          <td>
                            {(() => {
                              const ws = effectiveStatus(client);
                              const info = getStatusInfo(ws);
                              return (
                                <div style={{ lineHeight: 1.5 }}>
                                  <div style={{ fontSize: 12, color: '#1e293b', fontWeight: 500 }}>{info.next}</div>
                                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{nextStepDate(info.days)}</div>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                      {allRows.length === 0 && (
                        <tr><td colSpan={7} style={{ padding: '16px', color: '#4b5563' }}>No clients to show.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="ccbhc-pagination">
                    <button className="ccbhc-pagination__btn" onClick={() => setTriggeredPage(p => p - 1)} disabled={triggeredPage === 0}>← Prev</button>
                    <span className="ccbhc-pagination__info">{triggeredPage + 1} of {totalPages} &nbsp;·&nbsp; {visibleRows.length} clients</span>
                    <button className="ccbhc-pagination__btn" onClick={() => setTriggeredPage(p => p + 1)} disabled={triggeredPage === totalPages - 1}>Next →</button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Right rail */}
      <aside className="ccbhc-rail">
        <div className="ccbhc-rail__header">
          Real-time alerts
          <span className="ccbhc-rail__count">{REAL_TIME_ALERTS.length - dismissedAlerts.size}</span>
        </div>

        <div className="ccbhc-alerts-scroll">
          {REAL_TIME_ALERTS.filter((_, i) => !dismissedAlerts.has(i)).map((a, i) => (
            <div key={i} className="ccbhc-alert">
              <div className="ccbhc-alert__icon">{a.icon}</div>
              <div className="ccbhc-alert__body">
                <div className="ccbhc-alert__header-row">
                  <div className="ccbhc-alert__title">{a.title}</div>
                  <button
                    className="ccbhc-alert__dismiss"
                    onClick={() => setDismissedAlerts(s => new Set([...s, REAL_TIME_ALERTS.indexOf(a)]))}
                    aria-label="Dismiss"
                  >×</button>
                </div>
                <span className="ccbhc-alert__time">{a.time}</span>
                <div className="ccbhc-alert__desc">{a.desc}</div>
                {a.statusType !== 'running' && (
                  <div className="ccbhc-alert__footer">
                    <span className={a.statusType === 'running' ? 'ccbhc-status-running' : 'ccbhc-status-done'}>
                      {a.status}
                    </span>
                  </div>
                )}
                {a.cta && (() => {
                  const clientMatch = a.title.match(/CL-\d+/);
                  const clientId = clientMatch ? clientMatch[0] : null;
                  return (
                    <button
                      className="ccbhc-alert__cta"
                      onClick={clientId ? () => onClientClick(clientId) : undefined}
                    >{a.cta}</button>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

        <div className="ccbhc-rail__divider" />
        <div className="ccbhc-rail__header">Activity today</div>
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

type DetailType = 'triage' | 'care-navigator' | 'treatment-plan-renewal' | 'pa-status' | 'pa-appeal' | 'schedule-service' | 'duplicate-enrollment' | 'log-outreach';

interface SelectedDetail {
  clientId: string;
  clinicianName: string;
  detailType: DetailType;
}

const ORG_CLIENT_CLINICIAN: Record<string, string> = {
  'CL-10238': 'Morgan Reyes',
  'CL-11402': 'Sam Whitcomb',
  'CL-10774': 'Morgan Reyes',
  'CL-11819': 'Sam Whitcomb',
  'CL-12044': 'Avery Patel',
  'CL-10519': 'Morgan Reyes',
  'CL-20847': 'Avery Patel',
  'CL-30612': 'Sam Whitcomb',
};

const ORG_CLIENT_DETAIL_TYPE: Record<string, DetailType> = {
  'CL-10238': 'triage',
  'CL-11402': 'care-navigator',
  'CL-10774': 'triage',
  'CL-11819': 'treatment-plan-renewal',
  'CL-12044': 'pa-status',
  'CL-10519': 'schedule-service',
  'CL-40101': 'schedule-service',
  'CL-10001': 'schedule-service',
  'CL-20847': 'pa-appeal',
  'CL-30612': 'duplicate-enrollment',
};

function OrgView({ onClientClick }: { onClientClick: (id: string, clinician: string) => void }) {
  type TeamCol = 'team' | 'county' | 'caseload' | 'triggeredPct' | 'atRisk';
  type RiskCol = 'id' | 'team' | 'primaryRisk' | 'daysRemaining';

  const teamSort = useSortState<TeamCol>('triggeredPct', 'asc');
  const riskSort = useSortState<RiskCol>('daysRemaining', 'asc');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());

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

  const orgTotalResolved  = CLINICIANS.reduce((s, c) => s + [...c.notTriggered, ...c.triggered].filter(cl => cl.workflowStatus === 'Closed').length, 0);
  const orgTotalFlagged   = CLINICIANS.reduce((s, c) => s + c.notTriggered.length, 0);
  const orgTotalAll       = CLINICIANS.reduce((s, c) => s + c.notTriggered.length + c.triggered.length, 0);
  const orgTotalContacted = CLINICIANS.reduce((s, c) => s + c.notTriggered.filter(cl => cl.workflowStatus && cl.workflowStatus !== 'New').length, 0);
  const orgReviewedPct    = orgTotalFlagged > 0 ? Math.round((orgTotalContacted / orgTotalFlagged) * 100) : 0;

  return (
    <div className="ccbhc-layout">
      <div className="ccbhc-main">
        {/* Metric cards */}
        <div className="ccbhc-org-metrics">
          <div className="ccbhc-org-metric-card">
            <div className="ccbhc-org-metric-card__label">Flagged clients — Sep 2026</div>
            <div className="ccbhc-org-metric-card__value">{orgTotalFlagged} clients</div>
            <div className="ccbhc-org-metric-card__meta"><span className="ccbhc-trend--negative">↑ +14 vs last month</span> · across all teams</div>
          </div>

          <div className="ccbhc-org-metric-card">
            <div className="ccbhc-org-metric-card__label">Eligibility reviews done</div>
            <div className="ccbhc-org-metric-card__value">{orgReviewedPct}%</div>
            <div className="ccbhc-org-metric-card__meta">{orgTotalContacted} of {orgTotalFlagged} clients contacted</div>
          </div>

          <div className="ccbhc-org-metric-card">
            <div className="ccbhc-org-metric-card__label">Resolved this month</div>
            <div className="ccbhc-org-metric-card__value">{orgTotalResolved} clients</div>
            <div className="ccbhc-org-metric-card__meta">Cases closed · <span className="ccbhc-trend--positive">+{Math.max(1, orgTotalResolved - 54)} vs August</span></div>
          </div>
        </div>

        {/* Team breakdown table */}
        <div className="ccbhc-card">
          <div className="ccbhc-card__header">
            <span className="ccbhc-card__title">Per-team breakdown</span>
            <span className="ccbhc-card__sub">Sep 2026 · All counties</span>
          </div>
          <div className="ccbhc-table-wrap">
            <table className="ccbhc-table">
              <thead>
                <tr>
                  <SortTh label="Team"         colKey="team"         active={teamSort.col === 'team'}         dir={teamSort.dir} onSort={teamSort.toggle} />
                  <SortTh label="County"       colKey="county"       active={teamSort.col === 'county'}       dir={teamSort.dir} onSort={teamSort.toggle} />
                  <SortTh label="Caseload"     colKey="caseload"     active={teamSort.col === 'caseload'}     dir={teamSort.dir} onSort={teamSort.toggle} />
                  <SortTh label="% reviewed" colKey="triggeredPct" active={teamSort.col === 'triggeredPct'} dir={teamSort.dir} onSort={teamSort.toggle} />
                  <SortTh label="Not reviewed"  colKey="atRisk"       active={teamSort.col === 'atRisk'}       dir={teamSort.dir} onSort={teamSort.toggle} />
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map(row => (
                  <tr key={row.team} className={row.triggeredPct < 25 ? 'ccbhc-table__row--critical' : ''}>
                    <td className="ccbhc-table__team">{row.team}</td>
                    <td>{row.county}</td>
                    <td>{row.caseload}</td>
                    <td>
                      <div className="ccbhc-rate-row">
                        <span className={row.triggeredPct < 25 ? 'ccbhc-pct ccbhc-pct--red' : 'ccbhc-pct'}>
                          {row.triggeredPct}%
                        </span>
                        <TrendIcon trend={row.trend} />
                      </div>
                    </td>
                    <td>
                      <span className="ccbhc-pct">{row.atRisk}</span>
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
            <span className="ccbhc-card__title">Priority clients — action needed</span>
            <span className="ccbhc-card__sub">Click a column to sort</span>
          </div>
          <div className="ccbhc-table-wrap">
            <table className="ccbhc-table">
              <thead>
                <tr>
                  <SortTh label="Client"       colKey="id"           active={riskSort.col === 'id'}           dir={riskSort.dir} onSort={riskSort.toggle} />
                  <SortTh label="Team"         colKey="team"         active={riskSort.col === 'team'}         dir={riskSort.dir} onSort={riskSort.toggle} />
                  <SortTh label="Primary reason" colKey="primaryRisk"  active={riskSort.col === 'primaryRisk'}  dir={riskSort.dir} onSort={riskSort.toggle} />
                  <SortTh label="Days left"    colKey="daysRemaining" active={riskSort.col === 'daysRemaining'} dir={riskSort.dir} onSort={riskSort.toggle} />
                </tr>
              </thead>
              <tbody>
                {sortedRisk.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onClientClick(c.id, ORG_CLIENT_CLINICIAN[c.id] ?? CLINICIANS[0].name)}>
                    <td className="ccbhc-table__id">{CLIENT_NAMES[c.id] ?? c.id}</td>
                    <td>{c.team}</td>
                    <td className="ccbhc-table__risk">{c.primaryRisk}</td>
                    <td>{c.daysRemaining}d</td>
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
          <span className="ccbhc-rail__count">{REAL_TIME_ALERTS.length - dismissedAlerts.size}</span>
        </div>

        <div className="ccbhc-alerts-scroll">
          {REAL_TIME_ALERTS.filter((_, i) => !dismissedAlerts.has(i)).map((a, i) => (
            <div key={i} className="ccbhc-alert">
              <div className="ccbhc-alert__icon">{a.icon}</div>
              <div className="ccbhc-alert__body">
                <div className="ccbhc-alert__header-row">
                  <div className="ccbhc-alert__title">{a.title}</div>
                  <button
                    className="ccbhc-alert__dismiss"
                    onClick={() => setDismissedAlerts(s => new Set([...s, REAL_TIME_ALERTS.indexOf(a)]))}
                    aria-label="Dismiss"
                  >×</button>
                </div>
                <span className="ccbhc-alert__time">{a.time}</span>
                <div className="ccbhc-alert__desc">{a.desc}</div>
                {a.statusType !== 'running' && (
                  <div className="ccbhc-alert__footer">
                    <span className={a.statusType === 'running' ? 'ccbhc-status-running' : 'ccbhc-status-done'}>
                      {a.status}
                    </span>
                  </div>
                )}
                {a.cta && (() => {
                  const clientMatch = a.title.match(/CL-\d+/);
                  const clientId = clientMatch ? clientMatch[0] : null;
                  return (
                    <button
                      className="ccbhc-alert__cta"
                      onClick={clientId ? () => onClientClick(clientId, ORG_CLIENT_CLINICIAN[clientId] ?? CLINICIANS[0].name) : undefined}
                    >{a.cta}</button>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

        <div className="ccbhc-rail__divider" />
        <div className="ccbhc-rail__header">Activity today</div>
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

      </aside>
    </div>
  );
}

// ─── Screen 3 — Client Triage Detail ─────────────────────────────────────────

const CARE_NAVIGATORS = [
  { key: 'riley',  initials: 'RO', name: 'Riley Okafor',  role: 'Care Navigator', meta: 'North Team 1 · 3 active cases',  available: true  },
  { key: 'jordan', initials: 'JW', name: 'Jordan Wells',  role: 'Care Navigator', meta: 'North Team 2 · 5 active cases',  available: true  },
  { key: 'priya',  initials: 'PS', name: 'Priya Sharma',  role: 'Care Navigator', meta: 'East Team 1 · 7 active cases',   available: false },
];

const SDPS = [
  { key: 'jamie',  initials: 'JL', name: 'Jamie Lin',    role: 'SDP',            meta: 'North Team 1 · 2 active cases',  available: true  },
  { key: 'morgan', initials: 'MR', name: 'Morgan Reyes', role: 'SDP',            meta: 'West Team 2 · 4 active cases',   available: true  },
  { key: 'sam',    initials: 'SW', name: 'Sam Whitcomb', role: 'SDP',            meta: 'North Team 2 · 6 active cases',  available: false },
];

function TriageDetail({ clientId, clinicianName, onBack, onRouted }: { clientId: string; clinicianName: string; onBack: () => void; onRouted?: (id: string) => void }) {
  const [approved, setApproved] = useState(false);
  const [escalated, setEscalated] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('riley');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  // Quick Actions assignee picker state (separate from center-column picker)
  const [qaAssignee, setQaAssignee] = useState<string>('');
  const [qaAssigneeOpen, setQaAssigneeOpen] = useState(false);
  const [qaAssigneeSearch, setQaAssigneeSearch] = useState('');
  const [qaConfirmed, setQaConfirmed] = useState(false);

  // Quick action history entries (prepended to outreach history)
  const [quickActionHistory, setQuickActionHistory] = useState<{ date: string; actor: string; event: string; detail: string }[]>([]);

  // Find client across all clinicians
  const client = CLINICIANS.flatMap(c => c.notTriggered).find(c => c.id === clientId) ?? CLINICIANS[0].notTriggered[0];
  const clinician = CLINICIANS.find(c => [...c.notTriggered, ...c.triggered].some(cl => cl.id === clientId));
  const isWrongPayer = client.alert === 'wrong-payer';
  const isMedicaidLoss = client.alert === 'medicaid-loss';

  const assigneePool = isWrongPayer ? SDPS : CARE_NAVIGATORS;
  const defaultAssigneeKey = isWrongPayer ? 'jamie' : 'riley';

  // reset selected assignee whenever the pool changes
  const [poolKey, setPoolKey] = useState(defaultAssigneeKey);
  if (poolKey !== defaultAssigneeKey) { setPoolKey(defaultAssigneeKey); setSelectedAssignee(defaultAssigneeKey); }

  const chosenAssignee = assigneePool.find(a => a.key === selectedAssignee) ?? assigneePool[0];

  // Initialize QA assignee to pool default on first render / pool change
  const effectiveQaAssignee = qaAssignee || defaultAssigneeKey;
  const qaChosenAssignee = assigneePool.find(a => a.key === effectiveQaAssignee) ?? assigneePool[0];

  const defaultRec = isWrongPayer ? 'Route to SDP to schedule a CCBHC-triggering service this week'
    : isMedicaidLoss ? 'Initiate retro-eligibility recovery via Care Navigator'
    : `Notify ${clinician?.name ?? 'clinician'} to schedule a Medicaid-billed service before May 31`;
  const [modifiedRec, setModifiedRec] = useState(defaultRec);

  return (
    <div className="ccbhc-triage">
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>Workflows Visibility</button>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">
              {CLIENT_NAMES[clientId] ?? clientId} — {client.riskReason || (isWrongPayer ? 'Wrong payer billed — CCBHC triggering service needed' : isMedicaidLoss ? 'Medicaid loss — retro-eligibility window open' : 'No triggering service scheduled this month')}
            </span>
            <MedicaidPill status={client.medicaidStatus} />
          </div>
          <div className="ccbhc-client-header__meta">
            {clientId} · {clinician?.county ?? 'Unknown County'} · {isMedicaidLoss ? `Medicaid Lost ${client.lapseDate ?? 'recently'}` : 'Active Medicaid'}
          </div>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="ccbhc-triage-cols">

        {/* Left — Outreach context */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Outreach context</div>

          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Medicaid status</div>
            {isMedicaidLoss ? (
              <div className="ccbhc-insurance-timeline">
                <div className="ccbhc-insurance-timeline__item ccbhc-insurance-timeline__item--past">Active through {client.lapseDate ? client.lapseDate.replace(/\d+,/, d => String(parseInt(d) - 1) + ',') : 'recently'}</div>
                <div className="ccbhc-insurance-timeline__item ccbhc-insurance-timeline__item--event">{client.lapseDate ?? 'Recently'} — Coverage lapsed</div>
                <div className="ccbhc-insurance-timeline__item ccbhc-insurance-timeline__item--window">Retro window: {client.retroWindow} days remaining</div>
              </div>
            ) : (
              <div>
                <span className="ccbhc-pill ccbhc-pill--medicaid-active" style={{ alignSelf: 'flex-start' }}>Active</span>
                <div className="ccbhc-detail-value" style={{ marginTop: 4 }}>Treatment plan ends {client.treatmentPlanEnd}</div>
              </div>
            )}
          </div>

          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Last seen</div>
            <div className="ccbhc-detail-value">{client.lastServiceDate}</div>
          </div>

          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Phone</div>
            <a href="tel:+15032198841" style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>
              (503) 219-8841
            </a>
          </div>

          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Assigned clinician</div>
            <div className="ccbhc-detail-value">{clinician?.name ?? 'Clinician'}</div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            <div className="ccbhc-detail-label" style={{ marginBottom: 12 }}>Outreach history</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {(isMedicaidLoss ? [
                { date: client.lapseDate ?? 'Sep 12, 2026', actor: 'Eleos', event: 'Client flagged', detail: client.riskReason, type: 'flag' as const },
                { date: 'Sep 13, 2026', actor: 'Care team', event: 'Phone call', detail: 'No answer', type: 'outreach' as const },
                { date: 'Sep 14, 2026', actor: 'Care team', event: 'Voicemail left', detail: 'Asked client to send documents', type: 'outreach' as const },
                { date: daysAgo(7), actor: 'Care team', event: 'Called — no answer', detail: 'Requested income docs', type: 'outreach' as const },
                ...(approved ? [{ date: TODAY, actor: 'Care team', event: isWrongPayer ? `Routed to ${chosenAssignee.name} (SDP)` : `Routed to ${chosenAssignee.name} (Care Navigator)`, detail: defaultRec, type: 'outreach' as const }] : []),
                ...quickActionHistory.map(e => ({ ...e, type: 'outreach' as const })),
              ] : [
                { date: 'Aug 4, 2026', actor: 'Care team', event: 'Care coordination', detail: 'Medicaid billed', type: 'outreach' as const },
                { date: 'Aug 18, 2026', actor: 'Care team', event: 'Individual therapy', detail: 'Medicaid billed', type: 'outreach' as const },
                { date: client.lastServiceDate, actor: 'Care team', event: 'Individual therapy', detail: isWrongPayer ? 'Billed private insurance' : 'Medicaid billed', type: 'outreach' as const },
                ...quickActionHistory.map(e => ({ ...e, type: 'outreach' as const })),
              ]).map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: entry.type === 'flag' ? '#e0e7ff' : '#d1fae5', border: `2px solid ${entry.type === 'flag' ? '#6366f1' : '#10b981'}` }} />
                  </div>
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{entry.date} · {entry.actor}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: entry.type === 'flag' ? '#1e293b' : '#059669', marginTop: 2 }}>{entry.event}</div>
                    {entry.detail && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{entry.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center — Why outreach is needed */}
        <div className="ccbhc-triage-col ccbhc-triage-col--center">
          <div className="ccbhc-triage-section-title">{approved ? 'Action taken' : 'Why outreach is needed'}</div>

          {!approved ? (
            <>
              <div className="ccbhc-diagnosis-card">
                <div className="ccbhc-diagnosis-card__header">
                  <div className="ccbhc-diagnosis-card__title">
                    {client.riskReason || (isWrongPayer ? 'Wrong payer billed for triggering service'
                      : isMedicaidLoss ? 'Medicaid coverage lapsed — retro window open'
                      : 'No triggering service scheduled before month-end')}
                  </div>
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
                      <li>Coverage lapsed {client.lapseDate ?? 'recently'} — last service {client.lastServiceDate}</li>
                      <li>Retro-eligibility recovery window is still open ({client.retroWindow} days)</li>
                      <li>Client had consistent coverage prior to lapse</li>
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
                {!approved && (
                  <>
                    <div className="ccbhc-recommendation-card__action-row">
                      <span className="ccbhc-recommendation-card__action">{modifiedRec}</span>
                    </div>
                    <details className="ccbhc-why-preferred">
                      <summary>Why this recommendation was preferred</summary>
                      <p>
                        {isWrongPayer
                          ? 'Routing to the SDP for a same-week service is the fastest path to a Medicaid-billed triggering service within the remaining billing window. The client has no scheduling barriers and the SDP has availability.'
                          : 'Retro-eligibility recovery has a documented 82% success rate for clients with this coverage history. The 8-day window is sufficient if initiated today.'}
                      </p>
                    </details>
                    {/* Assignee search-select */}
                    <div style={{ marginTop: 14, marginBottom: 4, fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Assign to
                    </div>
                    <div style={{ position: 'relative', marginBottom: 14 }}>
                      {/* Trigger */}
                      <button
                        onClick={() => { setAssigneeOpen(o => !o); setAssigneeSearch(''); }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', borderRadius: 8, border: '1.5px solid',
                          borderColor: assigneeOpen ? '#4f46e5' : '#e2e8f0',
                          background: '#fff', cursor: 'pointer', textAlign: 'left',
                          boxShadow: assigneeOpen ? '0 0 0 3px #eef2ff' : 'none',
                          transition: 'border-color 0.15s, box-shadow 0.15s',
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: '#4f46e5', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700,
                        }}>{chosenAssignee.initials}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{chosenAssignee.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{chosenAssignee.meta}</div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, transform: assigneeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: '#94a3b8' }}>
                          <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>

                      {/* Dropdown */}
                      {assigneeOpen && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                          background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', overflow: 'hidden',
                        }}>
                          {/* Search input */}
                          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
                              <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                              <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                            </svg>
                            <input
                              autoFocus
                              value={assigneeSearch}
                              onChange={e => setAssigneeSearch(e.target.value)}
                              placeholder="Search by name or team…"
                              style={{
                                flex: 1, border: 'none', outline: 'none', fontSize: 13,
                                color: '#1e293b', background: 'transparent',
                              }}
                            />
                          </div>
                          {/* Options */}
                          {assigneePool
                            .filter(opt => opt.name.toLowerCase().includes(assigneeSearch.toLowerCase()) || opt.meta.toLowerCase().includes(assigneeSearch.toLowerCase()))
                            .map(opt => (
                              <button
                                key={opt.key}
                                onClick={() => { if (opt.available) { setSelectedAssignee(opt.key); setAssigneeOpen(false); } }}
                                style={{
                                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '8px 10px', border: 'none',
                                  background: selectedAssignee === opt.key ? '#eef2ff' : 'transparent',
                                  cursor: opt.available ? 'pointer' : 'not-allowed',
                                  opacity: opt.available ? 1 : 0.5,
                                  textAlign: 'left',
                                }}
                              >
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                  background: selectedAssignee === opt.key ? '#4f46e5' : '#94a3b8',
                                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 10, fontWeight: 700,
                                }}>{opt.initials}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{opt.name}</div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>{opt.meta}</div>
                                </div>
                                {!opt.available && <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>Unavailable</span>}
                                {selectedAssignee === opt.key && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="ccbhc-recommendation-card__actions">
                      <button className="ccbhc-primary-btn" onClick={() => { setApproved(true); onRouted?.(clientId); }}>Approve and route</button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="ccbhc-approved-state">
              <div className="ccbhc-approved-state__action">
                {modifiedRec}
                <span className="ccbhc-approved-state__badge">✓ Routed</span>
              </div>
              <div className="ccbhc-approved-state__assignee-row">
                <div className="ccbhc-approved-state__avatar">{chosenAssignee.initials}</div>
                <div>
                  <div className="ccbhc-approved-state__assignee-name">{chosenAssignee.name}</div>
                  <div className="ccbhc-approved-state__assignee-role">
                    {chosenAssignee.role} — {isWrongPayer ? 'notified via task queue' : 'assigned workflow'}
                  </div>
                </div>
                <button className="ccbhc-approved-state__undo" onClick={() => setApproved(false)}>Undo routing</button>
              </div>
            </div>
          )}
        </div>

        {/* Right — Quick Actions */}
        <div className="ccbhc-triage-col ccbhc-triage-col--right">
          <div className="ccbhc-triage-section-title">Quick Actions</div>

          {isMedicaidLoss && (<>
            <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Initiate retro-eligibility recovery</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Assign a Care Navigator to file for retroactive reinstatement before the recovery window closes.</div>
              {qaConfirmed ? (
                <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  ✓ Assigned to {qaChosenAssignee.name}
                  <button style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: '#94a3b8', cursor: 'pointer', marginLeft: 4, fontFamily: 'inherit' }} onClick={() => { setQaConfirmed(false); setApproved(false); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Navigator assigned'))); }}>Undo</button>
                </div>
              ) : (
                <>
                  {/* Inline assignee picker */}
                  <div style={{ position: 'relative', marginBottom: 6 }}>
                    <button
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', border: `1px solid ${qaAssigneeOpen ? '#4f46e5' : '#e2e8f0'}`, borderRadius: 6, background: '#fff', fontSize: 13, color: '#1e293b', cursor: 'pointer', fontFamily: 'inherit', boxShadow: qaAssigneeOpen ? '0 0 0 3px #eef2ff' : 'none' }}
                      onClick={() => setQaAssigneeOpen(o => !o)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{qaChosenAssignee.initials}</span>
                        {qaChosenAssignee.name}
                      </span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: qaAssigneeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: '#94a3b8' }}><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    {qaAssigneeOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', marginTop: 4, overflow: 'hidden' }}>
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>
                          <input autoFocus placeholder="Search…" value={qaAssigneeSearch} onChange={e => setQaAssigneeSearch(e.target.value)} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 12, color: '#1e293b', background: 'transparent', fontFamily: 'inherit' }} />
                        </div>
                        {assigneePool.filter(opt => opt.name.toLowerCase().includes(qaAssigneeSearch.toLowerCase())).map(opt => (
                          <button key={opt.key} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: effectiveQaAssignee === opt.key ? '#f5f3ff' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: opt.available ? 1 : 0.5 }}
                            onClick={() => { setQaAssignee(opt.key); setQaAssigneeOpen(false); setQaAssigneeSearch(''); }}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{opt.initials}</span>
                            <span style={{ textAlign: 'left' }}>
                              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{opt.name}</span>
                              <span style={{ display: 'block', fontSize: 11, color: '#94a3b8' }}>{opt.meta}{!opt.available ? ' · Unavailable' : ''}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="ccbhc-secondary-btn" onClick={() => {
                    setQaConfirmed(true);
                    setApproved(true);
                    setEscalated(null);
                    setResolved(false);
                    setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: `Navigator assigned — ${qaChosenAssignee.name}`, detail: 'Retro-eligibility recovery initiated via Quick Actions' }, ...h.filter(e => !e.event.startsWith('Navigator assigned'))]);
                  }}>Assign &amp; submit</button>
                </>
              )}
            </div>
            <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Escalate to ITM</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Send to ITM for manual review if reinstatement requires additional documentation.</div>
              {escalated === 'itm' ? (
                <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  ✓ Escalated to ITM
                  <button style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: '#94a3b8', cursor: 'pointer', marginLeft: 4, fontFamily: 'inherit' }} onClick={() => { setEscalated(null); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Escalated to ITM'))); }}>Undo</button>
                </div>
              ) : (
                <button className="ccbhc-secondary-btn" onClick={() => { setEscalated('itm'); setApproved(false); setResolved(false); setQaConfirmed(false); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Escalated to ITM', detail: 'Sent for manual review — additional documentation required' }, ...h.filter(e => !e.event.startsWith('Escalated'))]); }}>Escalate</button>
              )}
            </div>
          </>)}

          {isWrongPayer && (<>
            <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Re-bill under Medicaid</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Notify the therapist to resubmit the claim under the correct Medicaid payer.</div>
              <button className="ccbhc-secondary-btn" onClick={() => { setApproved(true); setEscalated(null); setResolved(false); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Re-bill initiated', detail: `Therapist notified to resubmit under Medicaid` }, ...h.filter(e => !e.event.startsWith('Re-bill'))]); }}>Initiate re-bill</button>
            </div>
            <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Assign to SDP</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Route to an SDP to schedule the CCBHC-triggering service and correct the payer going forward.</div>
              {qaConfirmed ? (
                <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  ✓ Assigned to {qaChosenAssignee.name}
                  <button style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: '#94a3b8', cursor: 'pointer', marginLeft: 4, fontFamily: 'inherit' }} onClick={() => { setQaConfirmed(false); setApproved(false); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('SDP assigned'))); }}>Undo</button>
                </div>
              ) : (
                <>
                  <div style={{ position: 'relative', marginBottom: 6 }}>
                    <button
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', border: `1px solid ${qaAssigneeOpen ? '#4f46e5' : '#e2e8f0'}`, borderRadius: 6, background: '#fff', fontSize: 13, color: '#1e293b', cursor: 'pointer', fontFamily: 'inherit', boxShadow: qaAssigneeOpen ? '0 0 0 3px #eef2ff' : 'none' }}
                      onClick={() => setQaAssigneeOpen(o => !o)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{qaChosenAssignee.initials}</span>
                        {qaChosenAssignee.name}
                      </span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: qaAssigneeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: '#94a3b8' }}><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    {qaAssigneeOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', marginTop: 4, overflow: 'hidden' }}>
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>
                          <input autoFocus placeholder="Search…" value={qaAssigneeSearch} onChange={e => setQaAssigneeSearch(e.target.value)} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 12, color: '#1e293b', background: 'transparent', fontFamily: 'inherit' }} />
                        </div>
                        {assigneePool.filter(opt => opt.name.toLowerCase().includes(qaAssigneeSearch.toLowerCase())).map(opt => (
                          <button key={opt.key} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: effectiveQaAssignee === opt.key ? '#f5f3ff' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: opt.available ? 1 : 0.5 }}
                            onClick={() => { setQaAssignee(opt.key); setQaAssigneeOpen(false); setQaAssigneeSearch(''); }}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{opt.initials}</span>
                            <span style={{ textAlign: 'left' }}>
                              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{opt.name}</span>
                              <span style={{ display: 'block', fontSize: 11, color: '#94a3b8' }}>{opt.meta}{!opt.available ? ' · Unavailable' : ''}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="ccbhc-secondary-btn" onClick={() => { setQaConfirmed(true); setApproved(true); setEscalated(null); setResolved(false); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: `SDP assigned — ${qaChosenAssignee.name}`, detail: 'Routed to schedule CCBHC-triggering service' }, ...h.filter(e => !e.event.startsWith('SDP assigned'))]); }}>Assign SDP</button>
                </>
              )}
            </div>
            <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Escalate to billing</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Flag to the billing team for a payer audit if the issue is systemic.</div>
              {escalated === 'billing' ? (
                <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  ✓ Escalated to billing
                  <button style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: '#94a3b8', cursor: 'pointer', marginLeft: 4, fontFamily: 'inherit' }} onClick={() => { setEscalated(null); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Escalated to billing'))); }}>Undo</button>
                </div>
              ) : (
                <button className="ccbhc-secondary-btn" onClick={() => { setEscalated('billing'); setApproved(false); setResolved(false); setQaConfirmed(false); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Escalated to billing', detail: 'Flagged for payer audit' }, ...h.filter(e => !e.event.startsWith('Escalated'))]); }}>Escalate</button>
              )}
            </div>
          </>)}

          {!isMedicaidLoss && !isWrongPayer && (<>
            <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Schedule a Medicaid session</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Book a Medicaid-billed service before the billing deadline.</div>
              <button className="ccbhc-secondary-btn" onClick={() => { setApproved(true); setEscalated(null); setResolved(false); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Session scheduled', detail: 'Medicaid-billed service booked before billing deadline' }, ...h.filter(e => !e.event.startsWith('Session scheduled'))]); }}>Schedule</button>
            </div>
            <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Notify clinician</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Alert {clinician?.name ?? 'the assigned clinician'} to prioritize a Medicaid-billed visit.</div>
              <button className="ccbhc-secondary-btn" onClick={() => { setApproved(true); setEscalated(null); setResolved(false); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: `Clinician notified — ${clinician?.name ?? 'clinician'}`, detail: 'Alerted to prioritize a Medicaid-billed visit' }, ...h.filter(e => !e.event.startsWith('Clinician notified'))]); }}>Notify</button>
            </div>
            <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Escalate to ITM</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Send to ITM for manual review if the case needs further investigation.</div>
              {escalated === 'itm' ? (
                <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  ✓ Escalated to ITM
                  <button style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: '#94a3b8', cursor: 'pointer', marginLeft: 4, fontFamily: 'inherit' }} onClick={() => { setEscalated(null); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Escalated to ITM'))); }}>Undo</button>
                </div>
              ) : (
                <button className="ccbhc-secondary-btn" onClick={() => { setEscalated('itm'); setApproved(false); setResolved(false); setQaConfirmed(false); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Escalated to ITM', detail: 'Sent for manual review' }, ...h.filter(e => !e.event.startsWith('Escalated'))]); }}>Escalate</button>
              )}
            </div>
          </>)}

          <div className="ccbhc-other-option">
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Mark as resolved</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Close this case once the issue has been fully addressed.</div>
            {resolved ? (
              <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                ✓ Case marked resolved
                <button style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: '#94a3b8', cursor: 'pointer', marginLeft: 4, fontFamily: 'inherit' }} onClick={() => { setResolved(false); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Case resolved'))); }}>Undo</button>
              </div>
            ) : (
              <button className="ccbhc-secondary-btn" onClick={() => { setResolved(true); setApproved(false); setEscalated(null); setQaConfirmed(false); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Case resolved', detail: 'Issue fully addressed and closed' }, ...h.filter(e => !e.event.startsWith('Case resolved'))]); }}>Mark resolved</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Care Navigator Detail ────────────────────────────────────────────────────

function CareNavigatorDetail({ clientId, clinicianName, onBack }: { clientId: string; clinicianName: string; onBack: () => void }) {
  const [selected, setSelected] = useState<'riley' | 'jordan'>('riley');
  const [done, setDone] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [quickActionHistory, setQuickActionHistory] = useState<{ date: string; actor: string; event: string; detail: string }[]>([]);
  const clinician = CLINICIANS.find(c => [...c.notTriggered, ...c.triggered].some(cl => cl.id === clientId));

  return (
    <div className="ccbhc-triage">
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>Workflows Visibility</button>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">{CLIENT_NAMES[clientId] ?? clientId} — {client.riskReason || 'Client unreachable — care navigator assignment needed'}</span>
            <MedicaidPill status="Active" />
          </div>
          <div className="ccbhc-client-header__meta">{clientId} · {clinician?.county ?? 'Unknown County'} · Active Medicaid</div>
        </div>
      </div>

      <div className="ccbhc-triage-cols">
        {/* Left */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Outreach context</div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Phone</div>
            <a href="tel:+15034551022" style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>
              (503) 455-1022
            </a>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Insurance</div>
            <div className="ccbhc-detail-value">Active Medicaid through Dec 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Assigned team</div>
            <div className="ccbhc-team-list">
              {[
                { name: clinician?.name ?? 'Clinician', role: `${clinician?.credential ?? ''}, Therapist` },
              ].map(m => (
                <div key={m.name} className="ccbhc-team-member">
                  <div>
                    <div className="ccbhc-team-member__name">{m.name}</div>
                    <div className="ccbhc-team-member__role">{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Last service</div>
            <div className="ccbhc-detail-value">Sep 3, 2026 (individual therapy)</div>
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            <div className="ccbhc-detail-label" style={{ marginBottom: 12 }}>Outreach history</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { date: 'May 14, 2026', actor: 'Care team', event: 'Phone call', detail: 'No answer', type: 'outreach' as const },
                { date: 'May 18, 2026', actor: 'Care team', event: 'Voicemail left', detail: '', type: 'outreach' as const },
                { date: daysAgo(7), actor: 'Care team', event: 'Called — no answer', detail: '', type: 'outreach' as const },
                ...quickActionHistory.map(e => ({ ...e, type: 'outreach' as const })),
              ].map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: entry.type === 'flag' ? '#e0e7ff' : '#d1fae5', border: `2px solid ${entry.type === 'flag' ? '#6366f1' : '#10b981'}` }} />
                  </div>
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{entry.date} · {entry.actor}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: entry.type === 'flag' ? '#1e293b' : '#059669', marginTop: 2 }}>{entry.event}</div>
                    {entry.detail && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{entry.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="ccbhc-triage-col ccbhc-triage-col--center">
          <div className="ccbhc-triage-section-title">Why outreach is needed</div>
          {!done ? (
            <>
              <div className="ccbhc-diagnosis-card">
                <div className="ccbhc-diagnosis-card__header">
                  <div className="ccbhc-diagnosis-card__title">Client unreachable — care navigator follow-up recommended</div>
                </div>
                <div className="ccbhc-diagnosis-card__reasoning">
                  <div className="ccbhc-reasoning-title">Reasoning</div>
                  <ul className="ccbhc-reasoning-list">
                    <li>22 days since last contact</li>
                    <li>3 outreach attempts unanswered</li>
                    <li>Month-end in 6 days — PPS payment at risk</li>
                  </ul>
                </div>
              </div>
              <div className="ccbhc-recommendation-card">
                <div className="ccbhc-recommendation-card__label">Assign care navigator</div>
                <div className="ccbhc-nav-list">
                  {([
                    { key: 'riley' as const, name: 'Riley Okafor', meta: 'North Team 1 · 3 active assignments' },
                    { key: 'jordan' as const, name: 'Jordan Wells', meta: 'North Team 2 · 5 active assignments' },
                  ]).map(opt => (
                    <div
                      key={opt.key}
                      className={`ccbhc-nav-option${selected === opt.key ? ' ccbhc-nav-option--selected' : ''}`}
                      onClick={() => setSelected(opt.key)}
                    >
                      <div className="ccbhc-nav-option__radio" />
                      <div>
                        <div className="ccbhc-nav-option__name">{opt.name} (Care Navigator)</div>
                        <div className="ccbhc-nav-option__meta">{opt.meta}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="ccbhc-recommendation-card__actions">
                  <button className="ccbhc-primary-btn" onClick={() => setDone(true)}>Assign and notify</button>
                  <button className="ccbhc-secondary-btn" onClick={onBack}>Cancel</button>
                </div>
              </div>
            </>
          ) : (
            <div className="ccbhc-approved-state">
              <div className="ccbhc-approved-state__icon">✓</div>
              <div className="ccbhc-approved-state__title">Navigator assigned</div>
              <div className="ccbhc-approved-state__desc">
                {selected === 'riley' ? 'Riley Okafor' : 'Jordan Wells'} assigned. Outreach scheduled for today at 2:00 PM.
              </div>
              <button className="ccbhc-secondary-btn" onClick={() => setDone(false)}>Undo</button>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="ccbhc-triage-col ccbhc-triage-col--right">
          <div className="ccbhc-triage-section-title">Quick Actions</div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Escalate to ITM</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Forward to ITM Sam Whitcomb for manual outreach.</div>
            {escalated ? (
              <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                ✓ Escalated to ITM
                <button style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => { setEscalated(false); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Escalated to ITM'))); }}>Undo</button>
              </div>
            ) : (
              <button className="ccbhc-secondary-btn" onClick={() => { setEscalated(true); setAttempted(false); setResolved(false); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Escalated to ITM', detail: 'Forwarded to Sam Whitcomb for manual outreach' }, ...h.filter(e => !e.event.startsWith('Escalated to ITM'))]); }}>Escalate</button>
            )}
          </div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Mark as attempted</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Document outreach attempt in the client record.</div>
            {attempted ? (
              <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                ✓ Attempt logged
                <button style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => { setAttempted(false); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Outreach attempted'))); }}>Undo</button>
              </div>
            ) : (
              <button className="ccbhc-secondary-btn" onClick={() => { setAttempted(true); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Outreach attempted', detail: 'Call documented in client record' }, ...h.filter(e => !e.event.startsWith('Outreach attempted'))]); }}>Mark attempted</button>
            )}
          </div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Mark as resolved</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Close this case once the issue has been fully addressed.</div>
            {resolved ? (
              <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                ✓ Case marked resolved
                <button style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => { setResolved(false); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Case resolved'))); }}>Undo</button>
              </div>
            ) : (
              <button className="ccbhc-secondary-btn" onClick={() => { setResolved(true); setEscalated(false); setAttempted(false); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Case resolved', detail: 'Issue fully addressed and closed' }, ...h.filter(e => !e.event.startsWith('Case resolved'))]); }}>Mark resolved</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Treatment Plan Renewal Detail ───────────────────────────────────────────

function TreatmentPlanRenewalDetail({ clientId, clinicianName, onBack }: { clientId: string; clinicianName: string; onBack: () => void }) {
  const [done, setDone] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [qaReminder, setQaReminder] = useState(false);
  const [qaReassigned, setQaReassigned] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [quickActionHistory, setQuickActionHistory] = useState<{ date: string; actor: string; event: string; detail: string }[]>([]);
  const clinician = CLINICIANS.find(c => [...c.notTriggered, ...c.triggered].some(cl => cl.id === clientId));

  return (
    <div className="ccbhc-triage">
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>Workflows Visibility</button>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">{CLIENT_NAMES[clientId] ?? clientId} — {client.riskReason || 'Treatment plan renewal pending clinician signature'}</span>
            <MedicaidPill status="Active" />
          </div>
          <div className="ccbhc-client-header__meta">{clientId} · {clinician?.county ?? 'Unknown County'} · Active Medicaid</div>
        </div>
      </div>

      <div className="ccbhc-triage-cols">
        {/* Left */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Outreach context</div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Phone</div>
            <a href="tel:+15032884710" style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>
              (503) 288-4710
            </a>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Insurance</div>
            <div className="ccbhc-detail-value">Active Medicaid through Oct 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Assigned</div>
            <div className="ccbhc-detail-value">{clinician?.name ?? 'Clinician'} ({clinician?.credential ?? ''}, {clinician?.team ?? 'Unknown Team'})</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Plan expired</div>
            <div className="ccbhc-detail-value">Sep 1, 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Status</div>
            <div className="ccbhc-detail-value">Renewal drafted by Eleos — pending signature from {clinician?.name ?? 'clinician'}</div>
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            <div className="ccbhc-detail-label" style={{ marginBottom: 12 }}>Outreach history</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { date: 'May 1, 2026', actor: 'System', event: 'Treatment plan expired', detail: '', type: 'flag' as const },
                { date: 'May 2, 2026', actor: 'Eleos', event: 'Renewal auto-drafted', detail: '', type: 'flag' as const },
                { date: 'May 2, 2026', actor: 'Eleos', event: 'Signature request sent', detail: `Sent to ${clinician?.name ?? 'clinician'}`, type: 'flag' as const },
                ...quickActionHistory.map(e => ({ ...e, type: 'outreach' as const })),
              ].map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: entry.type === 'flag' ? '#e0e7ff' : '#d1fae5', border: `2px solid ${entry.type === 'flag' ? '#6366f1' : '#10b981'}` }} />
                  </div>
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{entry.date} · {entry.actor}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: entry.type === 'flag' ? '#1e293b' : '#059669', marginTop: 2 }}>{entry.event}</div>
                    {entry.detail && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{entry.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="ccbhc-triage-col ccbhc-triage-col--center">
          <div className="ccbhc-triage-section-title">Why outreach is needed</div>
          <div className="ccbhc-doc-card">
            <div className="ccbhc-doc-card__title">Treatment Plan Renewal — {clientId}</div>
            {[
              { label: 'Client', value: `${clientId} (${CLIENT_NAMES[clientId] ?? clientId})` },
              { label: 'Clinician', value: `${clinician?.name ?? 'Clinician'}, ${clinician?.credential ?? ''}` },
              { label: 'Plan period', value: 'May 2026 – May 2027' },
              { label: 'Goals', value: 'Continue individual therapy for anxiety management; crisis plan updated' },
              { label: 'Diagnosis', value: 'F41.1 (Generalized Anxiety Disorder)' },
              { label: 'Frequency', value: 'Weekly (52 sessions/year)' },
            ].map(f => (
              <div key={f.label} className="ccbhc-doc-field">
                <span className="ccbhc-doc-field__label">{f.label}</span>
                <span className="ccbhc-doc-field__value">{f.value}</span>
              </div>
            ))}
            <div className="ccbhc-doc-status-banner">
              Awaiting clinician signature — sent May 2 at 9:14 AM
            </div>
          </div>
          {showFull && (
            <div className="ccbhc-doc-card" style={{ marginTop: 10 }}>
              <div className="ccbhc-doc-card__title">Additional plan details</div>
              <div className="ccbhc-doc-field"><span className="ccbhc-doc-field__label">Crisis plan</span><span className="ccbhc-doc-field__value">Updated May 2026 — on file</span></div>
              <div className="ccbhc-doc-field"><span className="ccbhc-doc-field__label">Discharge criteria</span><span className="ccbhc-doc-field__value">Symptom remission, stable housing, social support</span></div>
              <div className="ccbhc-doc-field"><span className="ccbhc-doc-field__label">Collateral contacts</span><span className="ccbhc-doc-field__value">Family member listed (consent on file)</span></div>
              <div className="ccbhc-doc-field"><span className="ccbhc-doc-field__label">Billing auth</span><span className="ccbhc-doc-field__value">Medicaid — no PA required for individual therapy</span></div>
            </div>
          )}
          {!done ? (
            <div className="ccbhc-recommendation-card__actions" style={{ marginTop: 4 }}>
              <button className="ccbhc-primary-btn" onClick={() => setDone(true)}>Send reminder to {clinician?.name ?? 'Clinician'}</button>
              <button className="ccbhc-secondary-btn" onClick={() => setShowFull(s => !s)}>
                {showFull ? 'Collapse plan' : 'View full plan'}
              </button>
            </div>
          ) : (
            <div className="ccbhc-approved-state">
              <div className="ccbhc-approved-state__icon">✓</div>
              <div className="ccbhc-approved-state__title">Reminder sent</div>
              <div className="ccbhc-approved-state__desc">{clinician?.name ?? 'Clinician'} has been notified to sign the renewal.</div>
              <button className="ccbhc-secondary-btn" onClick={() => setDone(false)}>Undo</button>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="ccbhc-triage-col ccbhc-triage-col--right">
          <div className="ccbhc-triage-section-title">Quick Actions</div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Send reminder</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Send a follow-up notification to {clinician?.name ?? 'clinician'} to sign the renewal.</div>
            {qaReminder ? (
              <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                ✓ Reminder sent
                <button style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => { setQaReminder(false); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Reminder sent'))); }}>Undo</button>
              </div>
            ) : (
              <button className="ccbhc-secondary-btn" onClick={() => { setQaReminder(true); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Reminder sent', detail: `Follow-up notification sent to ${clinician?.name ?? 'clinician'}` }, ...h.filter(e => !e.event.startsWith('Reminder sent'))]); }}>Send reminder</button>
            )}
          </div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Reassign clinician</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Reassign to another available clinician if Morgan is unavailable.</div>
            {qaReassigned ? (
              <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                ✓ Reassigned
                <button style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => { setQaReassigned(false); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Clinician reassigned'))); }}>Undo</button>
              </div>
            ) : (
              <button className="ccbhc-secondary-btn" onClick={() => { setQaReassigned(true); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Clinician reassigned', detail: 'Renewal ownership transferred to alternate clinician' }, ...h.filter(e => !e.event.startsWith('Clinician reassigned'))]); }}>Reassign</button>
            )}
          </div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Mark as resolved</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Close this case once the renewal has been signed.</div>
            {resolved ? (
              <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                ✓ Case marked resolved
                <button style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => { setResolved(false); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Case resolved'))); }}>Undo</button>
              </div>
            ) : (
              <button className="ccbhc-secondary-btn" onClick={() => { setResolved(true); setQaReminder(false); setQaReassigned(false); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Case resolved', detail: 'Renewal signed and case closed' }, ...h.filter(e => !e.event.startsWith('Case resolved'))]); }}>Mark resolved</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PA Status Detail ─────────────────────────────────────────────────────────

function PAStatusDetail({ clientId, clinicianName, onBack }: { clientId: string; clinicianName: string; onBack: () => void }) {
  const [done, setDone] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [qaExpedite, setQaExpedite] = useState(false);
  const [qaLogged, setQaLogged] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [quickActionHistory, setQuickActionHistory] = useState<{ date: string; actor: string; event: string; detail: string }[]>([]);
  const clinician = CLINICIANS.find(c => [...c.notTriggered, ...c.triggered].some(cl => cl.id === clientId));

  return (
    <div className="ccbhc-triage">
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>Workflows Visibility</button>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">{CLIENT_NAMES[clientId] ?? clientId} — {client.riskReason || 'Prior authorization pending — day 14 of 15'}</span>
            <MedicaidPill status="At Risk" />
          </div>
          <div className="ccbhc-client-header__meta">{clientId} · {clinician?.county ?? 'Unknown County'} · Active Medicaid (Medicaid)</div>
        </div>
      </div>

      <div className="ccbhc-triage-cols">
        {/* Left */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Outreach context</div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Phone</div>
            <a href="tel:+15037741293" style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>
              (503) 774-1293
            </a>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Insurance</div>
            <div className="ccbhc-detail-value">Active Medicaid (Medicaid) through Aug 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Assigned</div>
            <div className="ccbhc-detail-value">Avery Patel (LPC, East Team 1)</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Service blocked</div>
            <div className="ccbhc-detail-value">Intensive Outpatient Program (IOP)</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">PA submitted</div>
            <div className="ccbhc-detail-value">Sep 11, 2026</div>
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            <div className="ccbhc-detail-label" style={{ marginBottom: 12 }}>Outreach history</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { date: 'May 11, 2026', actor: 'Care team', event: 'PA submitted', detail: '', type: 'outreach' as const },
                { date: 'May 15, 2026', actor: 'Medicaid', event: 'Under review', detail: 'Medicaid portal', type: 'flag' as const },
                { date: 'May 22, 2026', actor: 'Medicaid', event: 'No decision yet', detail: 'Day 11 of 15-day window', type: 'flag' as const },
                ...quickActionHistory.map(e => ({ ...e, type: 'outreach' as const })),
              ].map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: entry.type === 'flag' ? '#e0e7ff' : '#d1fae5', border: `2px solid ${entry.type === 'flag' ? '#6366f1' : '#10b981'}` }} />
                  </div>
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{entry.date} · {entry.actor}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: entry.type === 'flag' ? '#1e293b' : '#059669', marginTop: 2 }}>{entry.event}</div>
                    {entry.detail && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{entry.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="ccbhc-triage-col ccbhc-triage-col--center">
          <div className="ccbhc-triage-section-title">Why outreach is needed</div>
          <div className="ccbhc-pa-timeline">
            {[
              { label: 'Submitted', date: 'May 11', done: true },
              { label: 'Received by payer', date: 'May 12', done: true },
              { label: 'Under review', date: 'May 15 — day 4', done: true },
              { label: 'Decision expected', date: 'by May 26 — day 15', done: false },
              { label: 'Service approved / denied', date: '', done: false },
            ].map((step, i) => (
              <div key={i} className={`ccbhc-pa-step${step.done ? '' : ' ccbhc-pa-step--pending'}`}>
                <div className={`ccbhc-pa-step__dot ${step.done ? 'ccbhc-pa-step__dot--done' : 'ccbhc-pa-step__dot--pending'}`} />
                <div>
                  <div className="ccbhc-pa-step__label">{step.label}</div>
                  {step.date && <div className="ccbhc-pa-step__date">{step.date}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="ccbhc-detail-value" style={{ fontSize: 12 }}>
            Medicaid standard review window is 15 business days. Day 14 of 15 — decision expected tomorrow.
          </div>
          <div className="ccbhc-escalation-card">
            <div className="ccbhc-escalation-card__title">Escalation recommended</div>
            <div className="ccbhc-escalation-card__text">If no decision by May 27, Eleos will auto-submit an expedite request to Medicaid.</div>
          </div>
          {!done ? (
            <>
              <div className="ccbhc-recommendation-card__actions">
                <button className="ccbhc-primary-btn" onClick={() => setDone(true)}>Request expedited review now</button>
                <button className="ccbhc-secondary-btn" onClick={() => setShowContact(s => !s)}>
                  {showContact ? 'Hide contact info' : 'Contact Medicaid provider line'}
                </button>
              </div>
              {showContact && (
                <div className="ccbhc-meta-stat" style={{ marginTop: 10 }}>
                  <div className="ccbhc-meta-stat__label">Medicaid Provider Services</div>
                  <div className="ccbhc-meta-stat__value">1-800-522-0114</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Mon–Fri 8 AM–5 PM CT · Reference PA-2026-10441</div>
                </div>
              )}
            </>
          ) : (
            <div className="ccbhc-approved-state">
              <div className="ccbhc-approved-state__icon">✓</div>
              <div className="ccbhc-approved-state__title">Request submitted</div>
              <div className="ccbhc-approved-state__desc">Expedite request submitted to Medicaid portal.</div>
              <button className="ccbhc-secondary-btn" onClick={() => setDone(false)}>Undo</button>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="ccbhc-triage-col ccbhc-triage-col--right">
          <div className="ccbhc-triage-section-title">Quick Actions</div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Request expedited review</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Submit an expedite request to Medicaid now. Ref: PA-2026-10441.</div>
            {qaExpedite ? (
              <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                ✓ Expedite requested
                <button style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => { setQaExpedite(false); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Expedite request'))); }}>Undo</button>
              </div>
            ) : (
              <button className="ccbhc-secondary-btn" onClick={() => { setQaExpedite(true); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Expedite request submitted', detail: 'Submitted to Medicaid portal · Ref: PA-2026-10441' }, ...h.filter(e => !e.event.startsWith('Expedite request'))]); }}>Request expedite</button>
            )}
          </div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Call Medicaid</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Provider line: 1-800-522-0114 · Mon–Fri 8 AM–5 PM CT.</div>
            {qaLogged ? (
              <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                ✓ Call logged
                <button style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => { setQaLogged(false); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Call logged'))); }}>Undo</button>
              </div>
            ) : (
              <button className="ccbhc-secondary-btn" onClick={() => { setQaLogged(true); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Call logged', detail: 'Called Medicaid provider line · 1-800-522-0114' }, ...h.filter(e => !e.event.startsWith('Call logged'))]); }}>Log call</button>
            )}
          </div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Mark as resolved</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Close this case once the PA has been decided.</div>
            {resolved ? (
              <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                ✓ Case marked resolved
                <button style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => { setResolved(false); setQuickActionHistory(h => h.filter(e => !e.event.startsWith('Case resolved'))); }}>Undo</button>
              </div>
            ) : (
              <button className="ccbhc-secondary-btn" onClick={() => { setResolved(true); setQaExpedite(false); setQaLogged(false); setQuickActionHistory(h => [{ date: TODAY, actor: 'Care team', event: 'Case resolved', detail: 'PA decided and case closed' }, ...h.filter(e => !e.event.startsWith('Case resolved'))]); }}>Mark resolved</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PA Appeal Detail ─────────────────────────────────────────────────────────

function PAAppealDetail({ clientId, clinicianName, onBack }: { clientId: string; clinicianName: string; onBack: () => void }) {
  const [done, setDone] = useState(false);
  const [modifying, setModifying] = useState(false);
  const clinician = CLINICIANS.find(c => [...c.notTriggered, ...c.triggered].some(cl => cl.id === clientId));
  const defaultAppeal = `Client has CCBHC-qualifying diagnosis (F20.9 — Schizophrenia). Day services were delivered per documented treatment plan. Clinical necessity supported by treating clinician notes from May 6. Medicaid policy §3.4.2 supports appeal for this service type.`;
  const [appealText, setAppealText] = useState(defaultAppeal);

  return (
    <div className="ccbhc-triage">
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>Workflows Visibility</button>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">{CLIENT_NAMES[clientId] ?? clientId} — {client.riskReason || 'Appeal pending TSS review'}</span>
            <MedicaidPill status="At Risk" />
          </div>
          <div className="ccbhc-client-header__meta">{clientId} · {clinician?.county ?? 'Unknown County'} · Active Medicaid (Medicaid)</div>
        </div>
      </div>

      <div className="ccbhc-triage-cols">
        {/* Left */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Outreach context</div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Phone</div>
            <a href="tel:+15036381044" style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>
              (503) 638-1044
            </a>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Insurance</div>
            <div className="ccbhc-detail-value">Active Medicaid (Medicaid) through Nov 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Assigned</div>
            <div className="ccbhc-detail-value">Avery Patel (LPC, East Team 2)</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Denied service</div>
            <div className="ccbhc-detail-value">CCBHC Day Service — May billing</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Denial date</div>
            <div className="ccbhc-detail-value">Sep 20, 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Denial reason</div>
            <div className="ccbhc-detail-value">Service not medically necessary per clinical guidelines</div>
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            <div className="ccbhc-detail-label" style={{ marginBottom: 12 }}>Outreach history</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { date: 'May 21, 2026', actor: 'Eleos', event: 'Appeal auto-drafted', detail: '', type: 'flag' as const },
                { date: 'May 20, 2026', actor: 'Payer', event: 'Denial received', detail: 'Service not medically necessary', type: 'flag' as const },
                { date: 'May 2026', actor: 'Care team', event: 'Claim submitted', detail: '', type: 'outreach' as const },
              ].map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: entry.type === 'flag' ? '#e0e7ff' : '#d1fae5', border: `2px solid ${entry.type === 'flag' ? '#6366f1' : '#10b981'}` }} />
                  </div>
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{entry.date} · {entry.actor}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: entry.type === 'flag' ? '#1e293b' : '#059669', marginTop: 2 }}>{entry.event}</div>
                    {entry.detail && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{entry.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="ccbhc-triage-col ccbhc-triage-col--center">
          <div className="ccbhc-triage-section-title">Why outreach is needed</div>
          <div className="ccbhc-diagnosis-card">
            <div className="ccbhc-diagnosis-card__title" style={{ fontSize: 12 }}>Denial summary</div>
            <div className="ccbhc-detail-value" style={{ fontSize: 12 }}>
              Denial code: CO-50 · Date: Sep 20, 2026<br />
              Reason: Service not medically necessary per clinical guidelines
            </div>
          </div>
          {!done ? (
            <div className="ccbhc-recommendation-card">
              <div className="ccbhc-recommendation-card__label">Draft appeal — ready for review</div>
              {modifying ? (
                <div className="ccbhc-modify-block">
                  <textarea
                    className="ccbhc-modify-textarea"
                    value={appealText}
                    onChange={e => setAppealText(e.target.value)}
                    rows={5}
                  />
                  <div className="ccbhc-recommendation-card__actions">
                    <button className="ccbhc-primary-btn" onClick={() => setModifying(false)}>Save draft</button>
                    <button className="ccbhc-secondary-btn" onClick={() => setModifying(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <ul className="ccbhc-reasoning-list">
                    <li>Client has CCBHC-qualifying diagnosis (F20.9 — Schizophrenia)</li>
                    <li>Day services delivered per documented treatment plan</li>
                    <li>Clinical necessity supported by treating clinician notes from May 6</li>
                    <li>Medicaid policy §3.4.2 supports appeal for this service type</li>
                  </ul>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button style={{ flex: 1, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#4f46e5', background: '#fff', border: '1.5px solid #c7d2fe', borderRadius: 10, padding: '10px 0', cursor: 'pointer' }} onClick={() => setDone(true)}>Approve and submit</button>
                    <button style={{ flex: 1, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#4f46e5', background: '#fff', border: '1.5px solid #c7d2fe', borderRadius: 10, padding: '10px 0', cursor: 'pointer' }} onClick={() => setModifying(true)}>Modify draft</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="ccbhc-approved-state">
              <div className="ccbhc-approved-state__icon">✓</div>
              <div className="ccbhc-approved-state__title">Appeal submitted</div>
              <div className="ccbhc-approved-state__desc">Appeal submitted to Medicaid portal. Reference #APL-2026-3847.</div>
              <button className="ccbhc-secondary-btn" onClick={() => setDone(false)}>Undo</button>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="ccbhc-triage-col ccbhc-triage-col--right">
          <div className="ccbhc-triage-section-title">Quick Actions</div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Submit appeal</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Approve the draft and submit to Medicaid. Deadline: Jun 19.</div>
            <button className="ccbhc-secondary-btn" onClick={() => {}}>Submit appeal</button>
          </div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Peer-to-peer review</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Request a peer-to-peer with Medicaid medical director as an alternative.</div>
            <button className="ccbhc-secondary-btn" onClick={() => {}}>Request review</button>
          </div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Mark as resolved</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Close this case once the appeal has been resolved.</div>
            <button className="ccbhc-secondary-btn" onClick={onBack}>Mark resolved</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Service Detail ──────────────────────────────────────────────────

function ScheduleServiceDetail({ clientId, clinicianName, onBack, persistedState, onStateChange, onStatusChange }: { clientId: string; clinicianName: string; onBack: () => void; persistedState?: ScheduleServiceState; onStateChange?: (s: ScheduleServiceState) => void; onStatusChange?: (id: string, status: string) => void }) {
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const outcomeRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(persistedState?.done ?? false);
  const [selectedAction, setSelectedAction] = useState<'office' | 'phone' | 'no-answer' | null>(persistedState?.selectedAction ?? null);
  const [note, setNote] = useState(persistedState?.note ?? '');
  const [scheduledDate, setScheduledDate] = useState(persistedState?.scheduledDate ?? '');
  const [scheduledTime, setScheduledTime] = useState(persistedState?.scheduledTime ?? '');
  const [callbackDate, setCallbackDate] = useState(persistedState?.callbackDate ?? '');
  const [callbackTime, setCallbackTime] = useState(persistedState?.callbackTime ?? '');
  const TOMORROW = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();
  const NOW_TIME = (() => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })();
  const [nextStepDate, setNextStepDate] = useState(persistedState?.nextStepDate ?? TOMORROW);
  const [nextStepTime, setNextStepTime] = useState(persistedState?.nextStepTime ?? NOW_TIME);
  const [assignedTo, setAssignedTo] = useState(persistedState?.assignedTo ?? 'Morgan Reyes (me)');
  const [requiredAction, setRequiredAction] = useState(persistedState?.requiredAction ?? '');

  const [assignedNavigator, setAssignedNavigator] = useState(persistedState?.assignedNavigator ?? '');
  const [showNavigatorPicker, setShowNavigatorPicker] = useState(false);
  const [resolved, setResolved] = useState(persistedState?.resolved ?? false);
  const [supervisorEscalated, setSupervisorEscalated] = useState(false);
  const [supervisorReason, setSupervisorReason] = useState('');
  const [showSupervisorForm, setShowSupervisorForm] = useState(false);

  // 4-phase workflow state (Marcus/Patricia)
  const [currentPhase, setCurrentPhase] = useState<'pre-call' | 'contact' | 'in-session' | 'post-submission'>(persistedState?.currentPhase ?? 'pre-call');
  const [phaseAction, setPhaseAction] = useState(persistedState?.phaseAction ?? '');
  const [workflowOutcome, setWorkflowOutcome] = useState<'blocked' | 'waiting' | 'closed' | 'confirmed' | null>(persistedState?.workflowOutcome ?? null);
  const [outcomeReason, setOutcomeReason] = useState(persistedState?.outcomeReason ?? '');
  const [pingDate, setPingDate] = useState(persistedState?.pingDate ?? '');
  const [showOutcomePanel, setShowOutcomePanel] = useState(false);
  const [phaseHistory, setPhaseHistory] = useState<{ phase: string; label: string; action: string; note: string; date: string; actor?: string }[]>(persistedState?.phaseHistory ?? []);
  const [nextStepAction, setNextStepAction] = useState(persistedState?.nextStepAction ?? '');
  const [phaseGoal, setPhaseGoal] = useState(persistedState?.phaseGoal ?? '');

  const CARE_NAVIGATORS = [
    'Maria Santos',
    'James Okonkwo',
    'Priya Nair',
    'Derek Hollis',
  ];

  const persist = (patch: Partial<ScheduleServiceState>) => {
    const next = { done, selectedAction, note, scheduledDate, scheduledTime, callbackDate, callbackTime, nextStepDate, nextStepTime, assignedNavigator, assignedTo, requiredAction, resolved, currentPhase, phaseAction, workflowOutcome, outcomeReason, pingDate, phaseHistory, nextStepAction, phaseGoal, ...patch };
    onStateChange?.(next);
  };

  const addDaysTo = (base: string, days: number) => {
    const d = new Date(base + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Sync table status on mount when restoring persisted state
  useEffect(() => {
    if (!persistedState) return;
    if (persistedState.resolved) { onStatusChange?.(clientId, 'Closed'); return; }
    // 4-phase workflow takes precedence
    if (persistedState.phaseHistory && persistedState.phaseHistory.length > 0) {
      const phase = persistedState.currentPhase;
      const outcome = persistedState.workflowOutcome;
      if (outcome === 'blocked') onStatusChange?.(clientId, 'Blocked');
      else if (outcome === 'waiting') onStatusChange?.(clientId, 'Waiting');
      else if (outcome === 'closed') onStatusChange?.(clientId, 'Closed');
      else onStatusChange?.(clientId, `${phase.charAt(0).toUpperCase() + phase.slice(1).replace('-', ' ')} — in progress`);
      return;
    }
    if (persistedState.done) {
      const s = persistedState.selectedAction;
      onStatusChange?.(clientId, s === 'office' ? 'Office visit scheduled' : s === 'phone' ? 'Called — DHS walkthrough done' : 'Called — left voicemail');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clinician = CLINICIANS.find(c => [...c.notTriggered, ...c.triggered].some(cl => cl.id === clientId));
  const client = clinician ? [...clinician.notTriggered, ...clinician.triggered].find(cl => cl.id === clientId) : undefined;

  const slots = [
    { label: 'Wed May 27 — 10:00 AM', type: `${clinician?.name ?? 'Clinician'}, individual therapy` },
    { label: 'Thu May 28 — 2:30 PM', type: `${clinician?.name ?? 'Clinician'}, individual therapy` },
    { label: 'Fri May 29 — 9:00 AM', type: `Group therapy — ${clinician?.team ?? 'Team'}` },
  ];

  // ── Patricia Davis (CL-40101) + Marcus Reed (CL-10001): address change scenario ──
  if (clientId === 'CL-40101' || clientId === 'CL-10001') {
    return (
      <div className="ccbhc-triage">
        <div className="ccbhc-breadcrumb">
          <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
          <button className="ccbhc-breadcrumb__link" onClick={onBack}>Workflows Visibility</button>
        </div>

        <div className="ccbhc-client-header">
          <div className="ccbhc-client-header__info">
            <div className="ccbhc-client-header__id-row">
              <span className="ccbhc-client-header__id">{CLIENT_NAMES[clientId] ?? clientId} — {client.riskReason || 'Address change flagged — Medicaid record must be updated'}</span>
              <MedicaidPill status="Active" />
            </div>
            <div className="ccbhc-client-header__meta">{clientId} · North County · Active Medicaid · 6 days remaining</div>
          </div>
        </div>

        <div className="ccbhc-triage-cols">
          {/* Left */}
          <div className="ccbhc-triage-col ccbhc-triage-col--left">
            <div className="ccbhc-triage-section-title">Outreach context</div>
            <div className="ccbhc-detail-group">
              <div className="ccbhc-detail-label">Insurance</div>
              <div className="ccbhc-detail-value">Active Medicaid (address not updated with Medicaid — redetermination at risk)</div>
            </div>
            <div className="ccbhc-detail-group">
              <div className="ccbhc-detail-label">Phone</div>
              <a href="tel:+15034921087" style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5', textDecoration: 'none', letterSpacing: '0.01em' }}>
                (503) 492-1087
              </a>
            </div>
            <div className="ccbhc-detail-group">
              <div className="ccbhc-detail-label">Assigned</div>
              <div className="ccbhc-detail-value">Jamie Lin (SDP, North Team 1)</div>
            </div>
            <div className="ccbhc-detail-group">
              <div className="ccbhc-detail-label">Treatment plan</div>
              <div className="ccbhc-detail-value">Expires Dec 10, 2026 (78 days)</div>
            </div>
            <div className="ccbhc-detail-group">
              <div className="ccbhc-detail-label">Last service</div>
              <div className="ccbhc-detail-value">Sep 2, 2026 (individual therapy)</div>
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              <div className="ccbhc-detail-label" style={{ marginBottom: 12 }}>Outreach history</div>
              <div style={{ position: 'relative', paddingLeft: 26 }}>
                {/* Single continuous vertical line behind all dots */}
                <div style={{ position: 'absolute', left: 9, top: 22, bottom: 22, width: 2, background: '#c7d2fe', borderRadius: 2 }} />
                {[
                  ...(resolved ? [{ date: TODAY, actor: 'Care team', event: 'Case marked resolved', detail: 'Address updated with DHS', type: 'flag' as const }] : []),
                  ...(nextStepAction || (!done && phaseGoal && !phaseAction) ? [{ date: (() => { const d = nextStepDate || (pingDate ? addDaysTo(pingDate, 1) : ''); return d ? new Date(`${d}T${nextStepTime || '09:00'}`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''; })(), actor: assignedTo || assignedNavigator || '', event: nextStepAction || phaseGoal, detail: '', type: 'next-step' as const }] : []),
                  ...(!done ? [{ date: TODAY, actor: '', event: '', detail: '', type: 'today' as const }] : []),
                  ...(assignedNavigator ? [{ date: TODAY, actor: assignedNavigator, event: 'Navigator assigned', detail: assignedNavigator, type: 'outreach' as const }] : []),
                  ...phaseHistory.map(h => ({
                    date: h.date,
                    actor: h.actor || assignedTo || 'Care team',
                    event: h.phase === 'outcome' ? h.action : `${h.label} — ${h.action}`,
                    detail: h.note || '',
                    type: h.phase === 'outcome' ? 'flag' as const : 'outreach' as const,
                  })),
                  { date: 'Aug 28, 2026', actor: 'Eleos', event: 'Address change flagged', detail: clientId === 'CL-10001' ? 'Medicaid record must be updated' : 'North County mismatch detected', type: 'flag' as const },
                ].map((entry, i) => {
                  if (entry.type === 'today') {
                    const todayLabel = `Today • ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                    return (
                      <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                        {/* Open circle dot for today */}
                        <div style={{
                          position: 'absolute', left: -21,
                          width: 10, height: 10, borderRadius: '50%',
                          background: '#fff',
                          border: '2px solid #6366f1',
                          boxSizing: 'border-box',
                          zIndex: 1,
                        }} />
                        {/* Dashed today card */}
                        <div style={{
                          flex: 1,
                          background: '#f5f7ff',
                          border: '2px dashed #818cf8',
                          borderRadius: 12,
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '11px 12px',
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#4338ca' }}>{todayLabel}</div>
                        </div>
                      </div>
                    );
                  }

                  if (entry.type === 'next-step') {
                    return (
                      <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{
                          position: 'absolute', left: -21,
                          width: 10, height: 10, borderRadius: '50%',
                          background: '#fff',
                          border: '2px solid #a5b4fc',
                          boxSizing: 'border-box',
                          zIndex: 1,
                        }} />
                        <div style={{
                          flex: 1,
                          background: '#f8f9ff',
                          border: '2px dashed #c7d2fe',
                          borderRadius: 12,
                          padding: '10px 12px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* Arrow-right icon for next step */}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4338ca" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#1e1b4b', flex: 1 }}>{entry.event}</div>
                            {entry.actor && (
                              <div style={{
                                fontSize: 10.5, fontWeight: 600,
                                color: '#3730a3',
                                background: '#c7d2fe',
                                borderRadius: 6,
                                padding: '2px 8px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}>{entry.actor}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, paddingLeft: 22 }}>
                            <div style={{ fontSize: 10.5, color: '#6366f1', fontWeight: 500 }}>Next step — assigned</div>
                            {entry.date && <div style={{ fontSize: 11, color: '#1e1b4b', fontWeight: 600 }}>{entry.date}</div>}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isFlag = entry.type === 'flag';
                  const ev = entry.event.toLowerCase();
                  const iconSvg = ev.includes('flag') || ev.includes('address')
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                    : ev.includes('follow-up') || ev.includes('schedule')
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    : ev.includes('call') || ev.includes('phone')
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    : ev.includes('navigator')
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    : ev.includes('resolved')
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;

                  return (
                    <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      {/* Dot: solid fill + white border ring, sits on top of the line */}
                      <div style={{
                        position: 'absolute', left: -21,
                        width: 10, height: 10, borderRadius: '50%',
                        background: isFlag ? '#f97316' : '#4338ca',
                        border: '2px solid #fff',
                        boxShadow: `0 0 0 1.5px ${isFlag ? '#f97316' : '#4338ca'}`,
                        boxSizing: 'border-box',
                        zIndex: 1,
                      }} />
                      {/* Card */}
                      <div style={{
                        flex: 1,
                        background: '#fff',
                        border: '1.5px solid #e8ecf4',
                        borderRadius: 12,
                        boxShadow: '0 1px 4px rgba(30,27,75,0.06)',
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '11px 12px',
                      }}>
                        {/* Card content: two rows */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Row 1: icon + title + actor badge (badge right-aligned) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                              {iconSvg}
                            </div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1e1b4b', lineHeight: 1.3, flex: 1, minWidth: 0 }}>{entry.event}</div>
                            <div style={{
                              fontSize: 10.5, fontWeight: 500,
                              color: '#4338ca',
                              background: '#eef2ff',
                              borderRadius: 6,
                              padding: '3px 8px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}>{entry.actor}</div>
                          </div>
                          {/* Row 2: detail + date — indented to align under title, not icon */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingLeft: 24 }}>
                            <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.35, flex: 1, minWidth: 0, maxWidth: '55%' }}>{entry.detail}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 'auto' }}>{entry.date}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center */}
          <div className="ccbhc-triage-col ccbhc-triage-col--center">
            <div className="ccbhc-triage-section-title">{done ? 'Action taken' : 'Why outreach is needed'}</div>
            {!done ? (
              <>
                <div className="ccbhc-diagnosis-card">
                  <div className="ccbhc-diagnosis-card__header">
                    <div className="ccbhc-diagnosis-card__title">Address change flagged — Medicaid record must be updated</div>
                  </div>
                  <div className="ccbhc-diagnosis-card__reasoning">
                    <div className="ccbhc-reasoning-title">Reasoning</div>
                    <ul className="ccbhc-reasoning-list">
                      <li>Client's address on file does not match current residence</li>
                      <li>State terms require Medicaid members to keep address current</li>
                      <li>Redetermination notices are mailed to the address on record — incorrect address risks missed renewal</li>
                    </ul>
                  </div>
                </div>
                {(() => {
                  // ── 4-phase workflow for Marcus Reed / Patricia Davis ──
                  const PHASES: { id: 'pre-call' | 'contact' | 'in-session' | 'post-submission'; label: string }[] = [
                    { id: 'pre-call', label: 'Pre-Call' },
                    { id: 'contact', label: 'Contact' },
                    { id: 'in-session', label: 'In Session' },
                    { id: 'post-submission', label: 'Post-Submission' },
                  ];
                  const phaseIndex = PHASES.findIndex(p => p.id === currentPhase);

                  const PHASE_ACTIONS: Record<string, string[]> = {
                    'pre-call': [
                      'Confirm benefit end date from PICIS',
                      'Confirm client contact information is current',
                    ],
                    'contact': [
                      'Called client — walked through portal together',
                      'Scheduled call with client',
                      'Re-attempted contact — no answer',
                    ],
                    'in-session': [
                      'Assisted client with portal login / password reset',
                      'Walked client through address update',
                      'Confirmed address update was submitted',
                    ],
                    'post-submission': [
                      'Verify address update in Medicaid system',
                      'Confirm client received DHS confirmation',
                      'Follow up — update not yet visible in system',
                      'Document outcome and close workflow',
                      'Escalate to DHS liaison for manual update',
                    ],
                  };

                  const BLOCKED_REASONS = [
                    { label: 'Client cannot log in to portal', ping: 2 },
                    { label: 'Client needs to call Medicaid helpline', ping: 2 },
                    { label: 'Missing documentation — client still needs to submit paperwork to Medicaid', ping: 2 },
                  ];

                  const WAITING_REASONS = [
                    { label: 'Client self-submitting independently', ping: 7 },
                    { label: "Waiting to verify client's claim of renewal from Medicaid portal", ping: 2 },
                  ];

                  const CLOSED_REASONS = [
                    { label: 'Address updated — active status confirmed on Medicaid', terminal: false, escalate: false },
                    { label: 'Client refused — no further outreach', terminal: true, escalate: true },
                    { label: 'Client refused — client discontinuing services', terminal: true, escalate: true },
                    { label: 'Unreachable — maximum attempts reached, escalated to supervisor', terminal: true, escalate: true },
                  ];

                  const addDays = (days: number) => {
                    const d = new Date();
                    d.setDate(d.getDate() + days);
                    return d.toISOString().split('T')[0];
                  };
                  const selectBtn = (label: string, color: string, bg: string, border: string) => ({
                    fontSize: 12, fontWeight: 600, color, background: bg, border: `1.5px solid ${border}`,
                    borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                  });

                  if (workflowOutcome === 'closed' && done) {
                    const isSucess = outcomeReason === 'Address updated successfully';
                    return (
                      <div style={{ background: isSucess ? '#f0fdf4' : '#fafafa', border: `1.5px solid ${isSucess ? '#86efac' : '#e2e8f0'}`, borderRadius: 10, padding: '16px 16px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 18 }}>{isSucess ? '✓' : '○'}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: isSucess ? '#15803d' : '#475569' }}>Workflow closed</div>
                            <div style={{ fontSize: 12, color: isSucess ? '#16a34a' : '#64748b' }}>{outcomeReason}</div>
                          </div>
                        </div>
                        {note && (
                          <div style={{ padding: '8px 10px', background: '#fff', borderRadius: 6, fontSize: 13, color: '#475569', borderLeft: '3px solid #c7d2fe', marginBottom: 10 }}>{note}</div>
                        )}
                        {!isSucess && pingDate && (
                          <div style={{ fontSize: 12, color: '#64748b' }}>3-month check-in: {new Date(pingDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        )}
                        <button style={{ marginTop: 10, fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => { setWorkflowOutcome(null); setOutcomeReason(''); setPingDate(''); setDone(false); persist({ workflowOutcome: null, outcomeReason: '', pingDate: '', done: false }); onStatusChange?.(clientId, 'In progress'); }}>Reopen workflow</button>
                      </div>
                    );
                  }

                  const isSchedulingAction = /schedul/i.test(phaseAction);
                  const isNoAnswerAction = currentPhase === 'contact' && phaseAction === 'Re-attempted contact — no answer';

                  return (
                    <>
                      {/* Phase stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16, padding: '0 2px' }}>
                        {PHASES.map((ph, i) => {
                          const isActive = ph.id === currentPhase;
                          const isDone = i < phaseIndex;
                          return (
                            <div key={ph.id} style={{ display: 'flex', alignItems: 'center', flex: i < PHASES.length - 1 ? 1 : 'none' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: isActive ? '#4f46e5' : isDone ? '#c7d2fe' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: isActive ? '#fff' : isDone ? '#4f46e5' : '#94a3b8' }}>{isDone ? '✓' : i + 1}</div>
                                <div style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? '#4f46e5' : isDone ? '#64748b' : '#94a3b8', whiteSpace: 'nowrap' }}>{ph.label}</div>
                              </div>
                              {i < PHASES.length - 1 && <div style={{ flex: 1, height: 2, background: isDone ? '#c7d2fe' : '#e2e8f0', margin: '0 4px', marginBottom: 16 }} />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Goal from previous step */}
                      {phaseGoal && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                          <span style={{ fontSize: 12, color: '#4338ca', fontWeight: 600 }}>Goal:</span>
                          <span style={{ fontSize: 12, color: '#3730a3' }}>{phaseGoal}</span>
                        </div>
                      )}

                      {/* Action for this phase */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Action taken</div>
                        <select
                          value={phaseAction}
                          onChange={e => {
                            const a = e.target.value;
                            setPhaseAction(a);
                            setWorkflowOutcome(null);
                            setOutcomeReason('');
                            setPingDate('');
                            persist({ phaseAction: a, workflowOutcome: null, outcomeReason: '', pingDate: '' });
                          }}
                          style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: phaseAction ? '#1e293b' : '#94a3b8', outline: 'none', fontFamily: 'inherit', background: '#fff', appearance: 'none', cursor: 'pointer' }}
                          onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px #eef2ff'; }}
                          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                        >
                          <option value="">Select action…</option>
                          {PHASE_ACTIONS[currentPhase].filter(a => {
                            if (a === 'Re-attempted contact — no answer') {
                              return phaseHistory.some(h => h.phase === 'contact');
                            }
                            return true;
                          }).map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>

                      {phaseAction && isSchedulingAction && (
                              <div style={{ marginBottom: 12, background: '#f8faff', border: '1.5px solid #e0e7ff', borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#4f46e5', marginBottom: 8 }}>Schedule appointment</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>Date</div>
                                    <input type="date" value={scheduledDate} onChange={e => { setScheduledDate(e.target.value); persist({ scheduledDate: e.target.value }); }} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 13, color: scheduledDate ? '#1e293b' : '#94a3b8', outline: 'none', fontFamily: 'inherit', background: '#fff' }} onFocus={e => { e.target.style.borderColor = '#4f46e5'; }} onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }} />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>Time</div>
                                    <input type="time" value={scheduledTime} onChange={e => { setScheduledTime(e.target.value); persist({ scheduledTime: e.target.value }); }} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 13, color: scheduledTime ? '#1e293b' : '#94a3b8', outline: 'none', fontFamily: 'inherit', background: '#fff' }} onFocus={e => { e.target.style.borderColor = '#4f46e5'; }} onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }} />
                                  </div>
                                </div>
                                {scheduledDate && <div style={{ marginTop: 6, fontSize: 12, color: '#4f46e5' }}>
                                  Scheduled: {new Date(`${scheduledDate}T${scheduledTime || '09:00'}`).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </div>}
                              </div>
                      )}

                      {(!!phaseAction || !!workflowOutcome) && <>

                      {/* Retry reminder — contact phase, no-answer actions */}
                      {isNoAnswerAction && (
                              <div style={{ marginBottom: 12, background: '#f8faff', border: '1.5px solid #e0e7ff', borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#4f46e5', marginBottom: 8 }}>Set retry reminder</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>Date</div>
                                    <input type="date" value={callbackDate} onChange={e => { setCallbackDate(e.target.value); persist({ callbackDate: e.target.value }); }} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 13, color: callbackDate ? '#1e293b' : '#94a3b8', outline: 'none', fontFamily: 'inherit', background: '#fff' }} onFocus={e => { e.target.style.borderColor = '#4f46e5'; }} onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }} />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>Time</div>
                                    <input type="time" value={callbackTime} onChange={e => { setCallbackTime(e.target.value); persist({ callbackTime: e.target.value }); }} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 13, color: callbackTime ? '#1e293b' : '#94a3b8', outline: 'none', fontFamily: 'inherit', background: '#fff' }} onFocus={e => { e.target.style.borderColor = '#4f46e5'; }} onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }} />
                                  </div>
                                </div>
                                {callbackDate && <div style={{ marginTop: 6, fontSize: 12, color: '#4f46e5' }}>
                                  Reminder: {new Date(`${callbackDate}T${callbackTime || '09:00'}`).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </div>}
                              </div>
                            )}

                            {/* Fast-track to In Session for "Called client — walked through portal together" */}
                            {currentPhase === 'contact' && phaseAction === 'Called client — walked through portal together' ? (
                              <button className="ccbhc-primary-btn" style={{ width: '100%' }} onClick={() => {
                                const completedPhase = PHASES[phaseIndex];
                                const nextPhase = PHASES[phaseIndex + 1].id;
                                const entry = { phase: completedPhase.id, label: completedPhase.label, action: phaseAction, note: '', date: TODAY, actor: assignedTo || assignedNavigator || undefined };
                                const newHistory = [entry, ...phaseHistory];
                                setPhaseHistory(newHistory);
                                setCurrentPhase(nextPhase); setPhaseAction(''); setNote(''); setPhaseGoal(nextStepAction); setNextStepAction('');
                                persist({ currentPhase: nextPhase, phaseAction: '', note: '', phaseHistory: newHistory, phaseGoal: nextStepAction, nextStepAction: '' });
                                onStatusChange?.(clientId, 'In Session — in progress');
                              }}>Move to In Session</button>
                            ) : <>

                            {/* Outcome */}
                            {!isSchedulingAction && <div ref={outcomeRef} style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Outcome</div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: workflowOutcome ? 10 : 0 }}>
                                {(currentPhase === 'pre-call' ? ['confirmed', 'blocked', 'waiting', 'closed'] : ['blocked', 'waiting', 'closed'] as const).map((o: string) => {
                                  const activeColor = o === 'blocked' ? '#b91c1c' : o === 'waiting' ? '#4f46e5' : o === 'confirmed' ? '#16a34a' : '#16a34a';
                                  const isActive = workflowOutcome === o;
                                  return <button key={o} onClick={() => { setWorkflowOutcome(isActive ? null : o as any); setOutcomeReason(''); setPingDate(''); }} style={{ ...selectBtn(o, isActive ? '#fff' : '#374151', isActive ? activeColor : '#e2e8f0', isActive ? activeColor : '#e2e8f0'), textTransform: 'capitalize' }}>{o}</button>;
                                })}
                              </div>

                              {workflowOutcome === 'blocked' && (
                                <div>
                                  <select value={outcomeReason} onChange={e => { const r = e.target.value; setOutcomeReason(r); const match = BLOCKED_REASONS.find(b => b.label === r); if (match) setPingDate(addDays(match.ping)); setNextStepDate(''); persist({ outcomeReason: r, pingDate: match ? addDays(match.ping) : '', nextStepDate: '' }); }} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: outcomeReason ? '#1e293b' : '#94a3b8', outline: 'none', fontFamily: 'inherit', background: '#fff', appearance: 'none', cursor: 'pointer' }} onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px #eef2ff'; }} onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}>
                                    <option value="">Select reason…</option>
                                    {BLOCKED_REASONS.map(b => <option key={b.label} value={b.label}>{b.label}</option>)}
                                  </select>
                                  {pingDate && <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 12, color: '#991b1b', fontWeight: 500 }}>Auto-ping:</span>
                                    <input type="date" value={pingDate} onChange={e => { setPingDate(e.target.value); setNextStepDate(''); persist({ pingDate: e.target.value, nextStepDate: '' }); }} style={{ border: '1px solid #fca5a5', borderRadius: 5, padding: '2px 6px', fontSize: 12, color: '#991b1b', outline: 'none', fontFamily: 'inherit', background: '#fff5f5', cursor: 'pointer' }} onFocus={e => { e.target.style.borderColor = '#b91c1c'; }} onBlur={e => { e.target.style.borderColor = '#fca5a5'; }} />
                                  </div>}
                                </div>
                              )}
                              {workflowOutcome === 'waiting' && (
                                <div>
                                  <select value={outcomeReason} onChange={e => { const r = e.target.value; setOutcomeReason(r); const match = WAITING_REASONS.find(w => w.label === r); if (match) setPingDate(addDays(match.ping)); setNextStepDate(''); persist({ outcomeReason: r, pingDate: match ? addDays(match.ping) : '', nextStepDate: '' }); }} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: outcomeReason ? '#1e293b' : '#94a3b8', outline: 'none', fontFamily: 'inherit', background: '#fff', appearance: 'none', cursor: 'pointer' }} onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px #eef2ff'; }} onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}>
                                    <option value="">Select reason…</option>
                                    {WAITING_REASONS.map(w => <option key={w.label} value={w.label}>{w.label}</option>)}
                                  </select>
                                  {pingDate && <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 12, color: '#4f46e5', fontWeight: 500 }}>Auto-ping:</span>
                                    <input type="date" value={pingDate} onChange={e => { setPingDate(e.target.value); setNextStepDate(''); persist({ pingDate: e.target.value, nextStepDate: '' }); }} style={{ border: '1px solid #c7d2fe', borderRadius: 5, padding: '2px 6px', fontSize: 12, color: '#4f46e5', outline: 'none', fontFamily: 'inherit', background: '#eef2ff', cursor: 'pointer' }} onFocus={e => { e.target.style.borderColor = '#4f46e5'; }} onBlur={e => { e.target.style.borderColor = '#c7d2fe'; }} />
                                  </div>}
                                </div>
                              )}
                              {workflowOutcome === 'closed' && (
                                <div>
                                  <select value={outcomeReason} onChange={e => { const r = e.target.value; setOutcomeReason(r); const match = CLOSED_REASONS.find(c => c.label === r); const pd = (match && match.terminal && !match.escalate) ? addDays(90) : ''; setPingDate(pd); persist({ outcomeReason: r, pingDate: pd }); }} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: outcomeReason ? '#1e293b' : '#94a3b8', outline: 'none', fontFamily: 'inherit', background: '#fff', appearance: 'none', cursor: 'pointer' }} onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px #eef2ff'; }} onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}>
                                    <option value="">Select reason…</option>
                                    {CLOSED_REASONS.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                                  </select>
                                  {pingDate && <div style={{ marginTop: 6, fontSize: 12, color: '#15803d' }}>3-month check-in: {new Date(pingDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
                                  {outcomeReason && CLOSED_REASONS.find(c => c.label === outcomeReason)?.escalate && <div style={{ marginTop: 6, fontSize: 12, color: '#b45309', fontWeight: 500 }}>⚠ Escalate to supervisor before closing</div>}
                                </div>
                              )}
                            </div>}

                            {/* Assign next step to — shown after outcome selected (reason required for blocked/waiting/closed) */}
                            {(outcomeReason || workflowOutcome === 'confirmed' || isSchedulingAction) && <div style={{ marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Assign next step to</div>
                                {assignedTo !== clinicianName && (
                                  <button style={{ fontSize: 11, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }} onClick={() => { setAssignedTo(clinicianName); persist({ assignedTo: clinicianName }); }}>
                                    Assign to me
                                  </button>
                                )}
                              </div>
                              <select
                                value={assignedTo}
                                onChange={e => { setAssignedTo(e.target.value); persist({ assignedTo: e.target.value }); }}
                                style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: assignedTo ? '#1e293b' : '#94a3b8', outline: 'none', fontFamily: 'inherit', background: '#fff', appearance: 'none', cursor: 'pointer', marginBottom: 6 }}
                                onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px #eef2ff'; }}
                                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                              >
                                <option value="">Select team member</option>
                                <option value={clinicianName}>{clinicianName} (me)</option>
                                {CARE_NAVIGATORS.map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                              <select
                                value={nextStepAction}
                                onChange={e => { setNextStepAction(e.target.value); persist({ nextStepAction: e.target.value }); }}
                                style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: nextStepAction ? '#1e293b' : '#94a3b8', outline: 'none', fontFamily: 'inherit', background: '#fff', appearance: 'none', cursor: 'pointer' }}
                                onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px #eef2ff'; }}
                                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                              >
                                <option value="">Select next action…</option>
                                {currentPhase === 'pre-call' ? <>
                                  <option>Call client — walk through portal together</option>
                                  <option>Schedule call with client</option>
                                  <option>Re-attempt contact (no answer on prior attempt)</option>
                                </> : <>
                                  {isSchedulingAction && <option>Call client — walk through portal together</option>}
                                  <option>Confirm submission received in portal</option>
                                  <option>Confirm active status on Medicaid</option>
                                  <option>Upload OHCA eligibility document to EHR</option>
                                </>}
                              </select>
                              {nextStepAction && (
                                <div style={{ marginTop: 8, background: '#f8faff', border: '1.5px solid #e0e7ff', borderRadius: 8, padding: '10px 12px' }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: '#4f46e5', marginBottom: 8 }}>Set reminder</div>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>Date</div>
                                      <input type="date" value={nextStepDate || (pingDate ? addDaysTo(pingDate, 1) : '')} onChange={e => { setNextStepDate(e.target.value); persist({ nextStepDate: e.target.value }); }} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 13, color: (nextStepDate || pingDate) ? '#1e293b' : '#94a3b8', outline: 'none', fontFamily: 'inherit', background: '#fff' }} onFocus={e => { e.target.style.borderColor = '#4f46e5'; }} onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>Time</div>
                                      <input type="time" value={nextStepTime} onChange={e => { setNextStepTime(e.target.value); persist({ nextStepTime: e.target.value }); }} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 13, color: nextStepTime ? '#1e293b' : '#94a3b8', outline: 'none', fontFamily: 'inherit', background: '#fff' }} onFocus={e => { e.target.style.borderColor = '#4f46e5'; }} onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }} />
                                    </div>
                                  </div>
                                  {(nextStepDate || pingDate) && <div style={{ marginTop: 6, fontSize: 12, color: '#4f46e5' }}>
                                    Reminder: {new Date(`${nextStepDate || (pingDate ? addDaysTo(pingDate, 1) : '')}T${nextStepTime || '09:00'}`).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                  </div>}
                                </div>
                              )}
                            </div>}

                            {/* Note */}
                            <div style={{ marginBottom: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Note (optional)</div>
                              <textarea
                                value={note}
                                onChange={e => { setNote(e.target.value); persist({ note: e.target.value }); }}
                                placeholder="Add context, next steps, or anything relevant…"
                                rows={2}
                                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#1e293b', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                                onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px #eef2ff'; }}
                                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                              />
                            </div>

                            {/* Action buttons */}
                            {workflowOutcome ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                {workflowOutcome === 'confirmed' ? (
                                  <button className="ccbhc-primary-btn" style={{ flex: 1 }} onClick={() => {
                                    const completedPhase = PHASES[phaseIndex];
                                    const nextPhase = phaseIndex < PHASES.length - 1 ? PHASES[phaseIndex + 1].id : null;
                                    const entry = { phase: completedPhase.id, label: completedPhase.label, action: phaseAction, note, date: TODAY, actor: assignedTo || assignedNavigator || undefined };
                                    const outcomeEntry = { phase: 'outcome', label: 'Outcome', action: 'Confirmed', note: '', date: TODAY, actor: assignedTo || assignedNavigator || undefined };
                                    const newHistory = [outcomeEntry, entry, ...phaseHistory];
                                    setPhaseHistory(newHistory);
                                    if (nextPhase) {
                                      setCurrentPhase(nextPhase); setPhaseAction(''); setNote(''); setWorkflowOutcome(null); setPhaseGoal(nextStepAction); setNextStepAction('');
                                      persist({ currentPhase: nextPhase, phaseAction: '', note: '', workflowOutcome: null, phaseHistory: newHistory, phaseGoal: nextStepAction, nextStepAction: '' });
                                      onStatusChange?.(clientId, `${PHASES[phaseIndex + 1].label} — in progress`);
                                    } else {
                                      setDone(true);
                                      persist({ done: true, workflowOutcome, phaseHistory: newHistory });
                                      onStatusChange?.(clientId, 'Confirmed');
                                    }
                                  }}>Log & advance to {PHASES[phaseIndex + 1]?.label ?? 'complete'}</button>
                                ) : (
                                  <button className="ccbhc-primary-btn" disabled={!outcomeReason} style={{ opacity: outcomeReason ? 1 : 0.4, cursor: outcomeReason ? 'pointer' : 'not-allowed', flex: 1 }} onClick={() => {
                                    if (!outcomeReason) return;
                                    const completedPhase = PHASES[phaseIndex];
                                    const nextPhase = phaseIndex < PHASES.length - 1 ? PHASES[phaseIndex + 1] : null;
                                    const actionEntry = { phase: completedPhase.id, label: completedPhase.label, action: phaseAction, note, date: TODAY, actor: assignedTo || assignedNavigator || undefined };
                                    const outcomeEntry = { phase: 'outcome', label: 'Outcome', action: `${workflowOutcome.charAt(0).toUpperCase() + workflowOutcome.slice(1)} — ${outcomeReason}`, note: pingDate ? `Auto-ping: ${new Date(pingDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '', date: TODAY, actor: assignedTo || assignedNavigator || undefined };
                                    const newHistory = [outcomeEntry, actionEntry, ...phaseHistory];
                                    setPhaseHistory(newHistory);
                                    if (nextPhase && workflowOutcome !== 'closed') {
                                      setCurrentPhase(nextPhase.id); setPhaseAction(''); setNote(''); setWorkflowOutcome(null); setPhaseGoal(nextStepAction); setNextStepAction('');
                                      persist({ currentPhase: nextPhase.id, phaseAction: '', note: '', workflowOutcome, outcomeReason, pingDate, phaseHistory: newHistory, phaseGoal: nextStepAction, nextStepAction: '' });
                                      onStatusChange?.(clientId, `${nextPhase.label} — in progress`);
                                    } else {
                                      setDone(true);
                                      persist({ done: true, workflowOutcome, outcomeReason, pingDate, phaseHistory: newHistory });
                                      const statusMap: Record<string, string> = { blocked: 'Blocked', waiting: 'Waiting', closed: 'Closed' };
                                      onStatusChange?.(clientId, statusMap[workflowOutcome]);
                                    }
                                  }}>Confirm outcome{phaseIndex < PHASES.length - 1 && workflowOutcome !== 'closed' ? ` & advance to ${PHASES[phaseIndex + 1]?.label}` : ''}</button>
                                )}
                                <button style={selectBtn('Clear', '#475569', '#fff', '#e2e8f0')} onClick={() => { setWorkflowOutcome(null); setOutcomeReason(''); setPingDate(''); }}>Clear</button>
                              </div>
                            ) : phaseIndex < PHASES.length - 1 ? (
                              <button className="ccbhc-primary-btn" style={{ width: '100%' }} onClick={() => {
                                const completedPhase = PHASES[phaseIndex];
                                const nextPhase = PHASES[phaseIndex + 1].id;
                                const entry = { phase: completedPhase.id, label: completedPhase.label, action: phaseAction, note, date: TODAY, actor: assignedTo || assignedNavigator || undefined };
                                const newHistory = [entry, ...phaseHistory];
                                setPhaseHistory(newHistory);
                                setCurrentPhase(nextPhase); setPhaseAction(''); setNote(''); setPhaseGoal(nextStepAction); setNextStepAction('');
                                persist({ currentPhase: nextPhase, phaseAction: '', note: '', phaseHistory: newHistory, phaseGoal: nextStepAction, nextStepAction: '' });
                                onStatusChange?.(clientId, `${PHASES[phaseIndex + 1].label} — in progress`);
                              }}>
                                Log & advance to {PHASES[phaseIndex + 1]?.label}
                              </button>
                            ) : (
                              <button className="ccbhc-primary-btn" style={{ width: '100%' }} onClick={() => { /* no-op on final phase without outcome */ }}>
                                Log action
                              </button>
                            )}
                            </> /* end non-fast-track branch */}
                      </>}
                    </>
                  );
                })()}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {phaseHistory.filter(h => h.phase !== 'outcome').map((h, i) => (
                  <div key={i} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', marginBottom: 4 }}>{h.label?.toUpperCase()}</div>
                    <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{h.action}</div>
                    {h.note && <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{h.note}</div>}
                  </div>
                ))}
                {workflowOutcome && outcomeReason && (
                  <div style={{ background: workflowOutcome === 'blocked' ? '#fef2f2' : workflowOutcome === 'waiting' ? '#eef2ff' : '#f0fdf4', border: `1.5px solid ${workflowOutcome === 'blocked' ? '#fca5a5' : workflowOutcome === 'waiting' ? '#c7d2fe' : '#86efac'}`, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', marginBottom: 4, color: workflowOutcome === 'blocked' ? '#991b1b' : workflowOutcome === 'waiting' ? '#4f46e5' : '#15803d' }}>OUTCOME</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: workflowOutcome === 'blocked' ? '#b91c1c' : workflowOutcome === 'waiting' ? '#4f46e5' : '#16a34a', marginBottom: 2 }}>{workflowOutcome.charAt(0).toUpperCase() + workflowOutcome.slice(1)}</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>{outcomeReason}</div>
                    {pingDate && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Auto-ping: {new Date(pingDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
                  </div>
                )}
                {(assignedTo || nextStepAction) && (
                  <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', marginBottom: 6 }}>NEXT STEP</div>
                    {nextStepAction && <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, marginBottom: 4 }}>{nextStepAction}</div>}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {assignedTo && <div style={{ fontSize: 11, color: '#64748b' }}><span style={{ fontWeight: 600 }}>Owner:</span> {assignedTo}</div>}
                      {(nextStepDate || (pingDate ? addDaysTo(pingDate, 1) : '')) && (
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          <span style={{ fontWeight: 600 }}>Due:</span>{' '}
                          {new Date(`${nextStepDate || addDaysTo(pingDate, 1)}T${nextStepTime || '09:00'}`).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right — Quick Actions */}
          <div className="ccbhc-triage-col ccbhc-triage-col--right">
            <div className="ccbhc-triage-section-title">Quick Actions</div>
            <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Escalate to supervisor</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Flag this case for supervisor review and provide a reason for escalation.</div>
              {supervisorEscalated ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                  <span>✓</span> Escalated to supervisor
                  <button style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: '#94a3b8', cursor: 'pointer', marginLeft: 4, fontFamily: 'inherit' }} onClick={() => { setSupervisorEscalated(false); setSupervisorReason(''); setShowSupervisorForm(false); }}>Undo</button>
                </div>
              ) : showSupervisorForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    autoFocus
                    placeholder="Reason for escalation…"
                    value={supervisorReason}
                    onChange={e => setSupervisorReason(e.target.value)}
                    rows={3}
                    style={{ fontSize: 13, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, color: '#1e293b', background: '#fff', resize: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="ccbhc-primary-btn"
                      disabled={!supervisorReason.trim()}
                      style={{ opacity: supervisorReason.trim() ? 1 : 0.4, cursor: supervisorReason.trim() ? 'pointer' : 'not-allowed', flex: 1, fontSize: 12 }}
                      onClick={() => { setSupervisorEscalated(true); setShowSupervisorForm(false); }}
                    >Submit</button>
                    <button style={{ fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '0' }} onClick={() => setShowSupervisorForm(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="ccbhc-secondary-btn" onClick={() => setShowSupervisorForm(true)}>Escalate</button>
              )}
            </div>
            <div className="ccbhc-other-option">
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Mark as resolved</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Close this case once the address has been updated with DHS.</div>
              {resolved ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                  <span>✓</span> Case resolved
                </div>
              ) : (
                <button className="ccbhc-secondary-btn" onClick={() => { setWorkflowOutcome('closed'); setOutcomeReason(''); setPingDate(''); persist({ workflowOutcome: 'closed', outcomeReason: '', pingDate: '' }); setTimeout(() => outcomeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }}>Mark resolved</button>
              )}
            </div>

            {/* Team visibility panel */}
            <div style={{ marginTop: 16, padding: '14px 14px 12px', background: '#f8faff', border: '1.5px solid #e0e7ff', borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Flagged for team</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                {resolved
                  ? 'This workflow has been closed. The address update has been confirmed with DHS.'
                  : done && selectedAction === 'office'
                  ? `An office visit has been scheduled to walk ${CLIENT_NAMES[clientId] ?? 'this client'} through the DHS portal update. ${assignedNavigator ? `${assignedNavigator} is assigned` : 'The care team is assigned'} and has the ball — they need to confirm attendance and complete the update before the session.`
                  : done && selectedAction === 'phone'
                  ? `${assignedTo || 'A care navigator'} is assigned to walk ${CLIENT_NAMES[clientId] ?? 'this client'} through the DHS self-service portal by phone.`
                  : done && selectedAction === 'no-answer'
                  ? `A call attempt was made but ${CLIENT_NAMES[clientId] ?? 'the client'} didn't answer. A voicemail was left. ${assignedNavigator ? `${assignedNavigator}` : 'The assigned navigator'} needs to follow up — the address update with DHS is still pending.`
                  : assignedNavigator
                  ? `${assignedNavigator} is assigned to contact ${CLIENT_NAMES[clientId] ?? 'this client'} and guide them through updating their address with DHS. All team members seeing this client are aware — any one of them can close this workflow once the update is confirmed.`
                  : phaseHistory.length > 0
                  ? `Actions have been logged for this client. The address update with DHS is still pending — the assigned care navigator needs to confirm completion.`
                  : `This client needs to update their address with DHS before their Medicaid redetermination. No action has been logged yet — the assigned care navigator needs to make contact and confirm the update.`
                }
              </div>
              {[
                { initials: 'JL', name: 'Jamie Lin', role: 'SDP · Primary owner', done: false },
                { initials: 'RT', name: 'Riley Torres', role: 'Care Navigator', done: false },
                { initials: 'MR', name: 'Morgan Reyes', role: 'Clinician', done: false },
              ].map((member, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{member.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{member.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{member.role}</div>
                  </div>
                  <div style={{ fontSize: 11, color: resolved ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>{resolved ? '✓' : 'Pending'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Default: scheduling scenario (CL-10519 and others) ──────────────────────
  return (
    <div className="ccbhc-triage">
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>Workflows Visibility</button>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">{CLIENT_NAMES[clientId] ?? clientId} — {client.riskReason || 'No triggering service this month — 6 days remaining'}</span>
            <MedicaidPill status="Active" />
          </div>
          <div className="ccbhc-client-header__meta">{clientId} · {clinician?.county ?? 'Unknown County'} · Active Medicaid</div>
        </div>
      </div>

      <div className="ccbhc-triage-cols">
        {/* Left */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Outreach context</div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Phone</div>
            <a href="tel:+15035021876" style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>
              (503) 502-1876
            </a>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Insurance</div>
            <div className="ccbhc-detail-value">Active Medicaid through Sep 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Assigned</div>
            <div className="ccbhc-detail-value">{clinician?.name ?? 'Clinician'} ({clinician?.credential ?? ''}, {clinician?.team ?? 'Team'}), SDP Jamie Lin</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Treatment plan</div>
            <div className="ccbhc-detail-value">Expires Oct 8, 2026 (14 days)</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Last service</div>
            <div className="ccbhc-detail-value">Sep 4, 2026 (individual therapy)</div>
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            <div className="ccbhc-detail-label" style={{ marginBottom: 12 }}>Outreach history</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { date: 'May 19, 2026', actor: 'Care team', event: 'No-show', detail: '', type: 'flag' as const },
                { date: 'May 12, 2026', actor: 'Client', event: 'Appointment cancelled', detail: '', type: 'flag' as const },
                { date: 'May 4, 2026', actor: 'Care team', event: 'Individual therapy', detail: 'Medicaid billed', type: 'outreach' as const },
              ].map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: entry.type === 'flag' ? '#e0e7ff' : '#d1fae5', border: `2px solid ${entry.type === 'flag' ? '#6366f1' : '#10b981'}` }} />
                  </div>
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{entry.date} · {entry.actor}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: entry.type === 'flag' ? '#1e293b' : '#059669', marginTop: 2 }}>{entry.event}</div>
                    {entry.detail && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{entry.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="ccbhc-triage-col ccbhc-triage-col--center">
          <div className="ccbhc-triage-section-title">Why outreach is needed</div>
          {!done ? (
            <>
              <div className="ccbhc-diagnosis-card">
                <div className="ccbhc-diagnosis-card__header">
                  <div className="ccbhc-diagnosis-card__title">No triggering service this month — scheduling window closing</div>
                </div>
                <div className="ccbhc-diagnosis-card__reasoning">
                  <div className="ccbhc-reasoning-title">Reasoning</div>
                  <ul className="ccbhc-reasoning-list">
                    <li>Client had two missed appointments this month</li>
                    <li>No Medicaid-billed service recorded in May</li>
                    <li>6 days remain in the billing period</li>
                  </ul>
                </div>
              </div>
              <div className="ccbhc-recommendation-card">
                <div className="ccbhc-recommendation-card__label">Schedule Medicaid-billed session before May 31</div>
                <div className="ccbhc-slot-list">
                  {slots.map((slot, i) => (
                    <div
                      key={i}
                      className={`ccbhc-slot${selectedSlot === i ? ' ccbhc-slot--selected' : ''}`}
                      onClick={() => setSelectedSlot(i)}
                    >
                      <div className="ccbhc-slot__radio" />
                      <div>
                        <div className="ccbhc-slot__time">{slot.label}</div>
                        <div className="ccbhc-slot__type">{slot.type}</div>
                      </div>
                    </div>
                  ))}
                  {showMore && (
                    <>
                      <div className={`ccbhc-slot${selectedSlot === 3 ? ' ccbhc-slot--selected' : ''}`} onClick={() => setSelectedSlot(3)}>
                        <div className={`ccbhc-slot__radio`} />
                        <div><div className="ccbhc-slot__time">Mon Jun 2 — 11:00 AM</div><div className="ccbhc-slot__type">Morgan Reyes, individual therapy</div></div>
                      </div>
                      <div className={`ccbhc-slot${selectedSlot === 4 ? ' ccbhc-slot--selected' : ''}`} onClick={() => setSelectedSlot(4)}>
                        <div className={`ccbhc-slot__radio`} />
                        <div><div className="ccbhc-slot__time">Mon Jun 2 — 3:00 PM</div><div className="ccbhc-slot__type">Group therapy — North Team 1</div></div>
                      </div>
                      <div className={`ccbhc-slot${selectedSlot === 5 ? ' ccbhc-slot--selected' : ''}`} onClick={() => setSelectedSlot(5)}>
                        <div className={`ccbhc-slot__radio`} />
                        <div><div className="ccbhc-slot__time">Tue Jun 3 — 10:00 AM</div><div className="ccbhc-slot__type">Morgan Reyes, individual therapy</div></div>
                      </div>
                    </>
                  )}
                </div>
                {selectedSlot >= 3 && <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>Note: June sessions do not count toward May PPS — confirm with clinician</div>}
                <div className="ccbhc-recommendation-card__actions">
                  <button className="ccbhc-primary-btn" onClick={() => setDone(true)}>Confirm and notify client</button>
                  <button className="ccbhc-secondary-btn" onClick={() => setShowMore(s => !s)}>
                    {showMore ? 'Show less' : 'Check full calendar'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="ccbhc-approved-state">
              <div className="ccbhc-approved-state__header">
                <span className="ccbhc-approved-state__badge">✓ Scheduled</span>
                <span className="ccbhc-approved-state__time">Just now</span>
              </div>
              <div className="ccbhc-approved-state__action">
                {selectedSlot < slots.length
                  ? slots[selectedSlot].label.replace(' — ', ' · ')
                  : selectedSlot === 3 ? 'Mon Jun 2 · 11:00 AM'
                  : selectedSlot === 4 ? 'Mon Jun 2 · 3:00 PM'
                  : 'Tue Jun 3 · 10:00 AM'}
                {selectedSlot >= 3 && <span className="ccbhc-approved-state__warning">June — does not count toward May PPS</span>}
              </div>
              <div className="ccbhc-approved-state__assignee-row">
                <div className="ccbhc-approved-state__avatar">MR</div>
                <div>
                  <div className="ccbhc-approved-state__assignee-name">Morgan Reyes</div>
                  <div className="ccbhc-approved-state__assignee-role">Therapist · client notified</div>
                </div>
                <button className="ccbhc-approved-state__undo" onClick={() => setDone(false)}>Undo</button>
              </div>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="ccbhc-triage-col ccbhc-triage-col--right">
          <div className="ccbhc-triage-section-title">Quick Actions</div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Schedule session</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Confirm a Medicaid-billed appointment before month-end (6 days remaining).</div>
            <button className="ccbhc-secondary-btn" onClick={() => {}}>View calendar</button>
          </div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Contact client</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Reach out to discuss the 2 missed appointments and schedule next visit.</div>
            <button className="ccbhc-secondary-btn" onClick={() => {}}>Log outreach</button>
          </div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Mark as resolved</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Close this case once the issue has been fully addressed.</div>
            <button className="ccbhc-secondary-btn" onClick={onBack}>Mark resolved</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Duplicate Enrollment Detail ──────────────────────────────────────────────

function DuplicateEnrollmentDetail({ clientId, clinicianName, onBack }: { clientId: string; clinicianName: string; onBack: () => void }) {
  const [done, setDone] = useState(false);
  const [kept, setKept] = useState<'delaware' | 'pawnee' | 'escalate' | null>(null);

  const handleKeep = (team: 'delaware' | 'pawnee') => {
    setKept(team);
    setDone(true);
  };

  const handleEscalate = () => {
    setKept('escalate');
    setDone(true);
  };

  return (
    <div className="ccbhc-triage">
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>Workflows Visibility</button>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">{CLIENT_NAMES[clientId] ?? clientId} — {client.riskReason || 'Duplicate enrollment — billing conflict detected'}</span>
            <MedicaidPill status="At Risk" />
          </div>
          <div className="ccbhc-client-header__meta">{clientId} · Active in two teams simultaneously</div>
        </div>
      </div>

      <div className="ccbhc-triage-cols">
        {/* Left */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Outreach context</div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Phone</div>
            <a href="tel:+15039271450" style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>
              (503) 927-1450
            </a>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Medicaid ID</div>
            <div className="ccbhc-detail-value">123-45-6789</div>
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            <div className="ccbhc-detail-label" style={{ marginBottom: 12 }}>Outreach history</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { date: TODAY, actor: 'Eleos', event: 'Billing conflict detected', detail: '', type: 'flag' as const },
                { date: 'Aug 17, 2026', actor: 'System', event: 'Duplicate enrollment created', detail: 'East Team 1', type: 'flag' as const },
                { date: 'Mar 3, 2026', actor: 'Care team', event: 'Enrolled in West Team 1', detail: '', type: 'outreach' as const },
              ].map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: entry.type === 'flag' ? '#e0e7ff' : '#d1fae5', border: `2px solid ${entry.type === 'flag' ? '#6366f1' : '#10b981'}` }} />
                  </div>
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{entry.date} · {entry.actor}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: entry.type === 'flag' ? '#1e293b' : '#059669', marginTop: 2 }}>{entry.event}</div>
                    {entry.detail && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{entry.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="ccbhc-triage-col ccbhc-triage-col--center">
          <div className="ccbhc-triage-section-title">Why outreach is needed</div>
          {!done ? (
            <>
              <div className="ccbhc-enrollment-cols">
                <div className="ccbhc-enrollment-card ccbhc-enrollment-card--primary">
                  <div className="ccbhc-enrollment-card__header">
                    West Team 1 record
                    <span className="ccbhc-enrollment-card__badge">Primary (recommended)</span>
                  </div>
                  {[
                    { label: 'Enrolled', value: 'Mar 3, 2026' },
                    { label: 'Primary clinician', value: 'Sam Whitcomb (BHC)' },
                    { label: 'Last service', value: 'Sep 14, 2026' },
                    { label: 'Services this month', value: '2' },
                    { label: 'County', value: 'West' },
                  ].map(f => (
                    <div key={f.label} className="ccbhc-enrollment-field">
                      <span className="ccbhc-enrollment-field__label">{f.label}</span>
                      <span className="ccbhc-enrollment-field__value">{f.value}</span>
                    </div>
                  ))}
                </div>
                <div className="ccbhc-enrollment-card">
                  <div className="ccbhc-enrollment-card__header">East Team 1 record</div>
                  {[
                    { label: 'Enrolled', value: 'Aug 17, 2026 (more recent)' },
                    { label: 'Primary clinician', value: 'Avery Patel (LPC)' },
                    { label: 'Last service', value: 'Sep 9, 2026' },
                    { label: 'Services this month', value: '1' },
                    { label: 'County', value: 'East' },
                  ].map(f => (
                    <div key={f.label} className="ccbhc-enrollment-field">
                      <span className="ccbhc-enrollment-field__label">{f.label}</span>
                      <span className="ccbhc-enrollment-field__value">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button style={{ flex: 1, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#4f46e5', background: '#fff', border: '1.5px solid #c7d2fe', borderRadius: 10, padding: '10px 0', cursor: 'pointer' }} onClick={() => handleKeep('delaware')}>Keep West Team 1 (recommended)</button>
                <button style={{ flex: 1, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#4f46e5', background: '#fff', border: '1.5px solid #c7d2fe', borderRadius: 10, padding: '10px 0', cursor: 'pointer' }} onClick={() => handleKeep('pawnee')}>Keep East Team 1</button>
              </div>
            </>
          ) : (
            <div className="ccbhc-approved-state">
              <div className="ccbhc-approved-state__icon">✓</div>
              <div className="ccbhc-approved-state__title">Enrollment resolved</div>
              <div className="ccbhc-approved-state__desc">
                {kept === 'delaware'
                  ? 'West Team 1 record retained. East Team 1 enrollment closed. Sam Whitcomb notified.'
                  : kept === 'pawnee'
                  ? 'East Team 1 record retained. West Team 1 enrollment closed. Avery Patel notified.'
                  : 'Escalated to ITM for manual review. Sam Whitcomb has been notified.'}
              </div>
              <button className="ccbhc-secondary-btn" onClick={() => { setDone(false); setKept(null); }}>Undo</button>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="ccbhc-triage-col ccbhc-triage-col--right">
          <div className="ccbhc-triage-section-title">Quick Actions</div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Escalate to ITM</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Refer to ITM Sam Whitcomb for manual enrollment resolution.</div>
            <button className="ccbhc-secondary-btn" onClick={handleEscalate}>Escalate</button>
          </div>
          <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Mark as resolved</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Close this case once the duplicate has been resolved.</div>
            <button className="ccbhc-secondary-btn" onClick={onBack}>Mark resolved</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Log Outreach Detail ──────────────────────────────────────────────────────

type CalledStatus =
  | 'Called — left voicemail'
  | 'Called — no time to talk, call back'
  | 'Unreachable'
  | 'Knows — will do it themselves'
  | 'Wants help'
  | 'Claims renewed — not confirmed'
  | 'Needs appointment — CN / SDP / DHS'
  | 'Appointment scheduled'
  | 'Needs the insurance hotline called'
  | 'Waiting on insurance decision'
  | 'Denied — appeal or reapply'
  | 'Confirmed by the state feed'
  | 'Waiting on pay stubs'
  | 'Waiting on Social Security award letter'
  | 'Needs proof of address'
  | 'Needs ID or birth certificate'
  | 'No email account'
  | 'No OHCA portal access'
  | 'Needs transport to DHS'
  | 'Waiting on client to send documents';

const OUTREACH_OUTCOMES: { value: CalledStatus; label: string; desc: string }[] = [
  { value: 'Knows — will do it themselves',       label: 'Will do it themselves',    desc: 'Client is aware and will handle renewal on their own' },
  { value: 'Wants help',                          label: 'Wants help',               desc: 'Client wants assistance completing the renewal' },
  { value: 'Claims renewed — not confirmed',      label: 'Claims renewed',           desc: 'Client says they renewed — not yet confirmed by state feed' },
  { value: 'Needs appointment — CN / SDP / DHS', label: 'Needs appointment',        desc: 'Client needs an in-person appointment (CN, SDP, or DHS office)' },
  { value: 'Appointment scheduled',               label: 'Appointment scheduled',    desc: 'Appointment has been booked to support renewal' },
  { value: 'Needs the insurance hotline called',  label: 'Insurance hotline needed', desc: 'Client needs someone to call the insurance hotline for them' },
  { value: 'Waiting on insurance decision',       label: 'Submitted — awaiting decision', desc: 'Application submitted; waiting on insurance approval' },
  { value: 'Denied — appeal or reapply',          label: 'Denied — appeal/reapply', desc: 'Client was denied; routes to MRT, counts as complex case' },
  { value: 'Confirmed by the state feed',         label: 'Renewed — confirmed',      desc: 'Renewal confirmed by the state feed' },
];

interface OutreachEntry {
  date: string;
  actor: string;
  event: string;
  detail: string;
  assignee?: string;
  callbackDate?: string;
  note?: string;
  selectedOutcome?: string;
}

function getLogOutreachInsights(riskReason: string, client: { treatmentPlanEnd: string; lastServiceDate: string }) {
  const r = riskReason.toLowerCase();
  if (r.includes('pregnancy')) return {
    bullets: [
      `Pregnancy reported — expanded Medicaid eligibility may apply`,
      `Current enrollment does not reflect updated household status`,
      `Maternity coverage window requires timely confirmation`,
      `Next service: ${client.treatmentPlanEnd} — record must be updated first`,
    ],
    recommendedAction: 'Confirm expanded eligibility enrollment and update Medicaid record',
    rationale: 'Pregnancy opens a 60-day special enrollment window. Updating the record now prevents a mid-treatment coverage gap.',
    assigneeName: 'Riley Okafor',
    assigneeRole: 'Care Navigator · 3 active cases',
  };
  if (r.includes('address') && r.includes('dhs')) return {
    bullets: [
      `Address change reported — DHS record not yet updated`,
      `County mismatch may result in terminated Medicaid coverage`,
      `Client must submit proof of new address within retro window`,
      `Medicaid active through ${client.treatmentPlanEnd} pending resolution`,
    ],
    recommendedAction: 'Schedule DHS portal walkthrough to update address and confirm eligibility',
    rationale: 'Address discrepancies are the leading cause of Medicaid termination. DHS self-service can update same-day.',
    assigneeName: 'Jamie Lin',
    assigneeRole: 'SDP · 2 active cases',
  };
  if (r.includes('address')) return {
    bullets: [
      `Address change detected — county transfer may affect payer assignment`,
      `Payer reassignment pending — PA not yet approved`,
      `Service continuity at risk if PA lapses`,
      `Client last seen ${client.lastServiceDate}`,
    ],
    recommendedAction: 'Initiate county transfer and confirm PA status with payer',
    rationale: 'Cross-county transfers require re-authorization. Early initiation prevents service interruption.',
    assigneeName: 'Riley Okafor',
    assigneeRole: 'Care Navigator · 3 active cases',
  };
  if (r.includes('income') || r.includes('job loss') || r.includes('employer')) return {
    bullets: [
      `Income change reported — Medicaid eligibility redetermination required`,
      `Coverage may shift based on updated household income`,
      `Redetermination must be submitted within 30 days of change`,
      `Current coverage active through ${client.treatmentPlanEnd}`,
    ],
    recommendedAction: 'Support client in completing income redetermination with DHS',
    rationale: 'Income changes trigger automatic redetermination. Early outreach prevents lapse during processing.',
    assigneeName: 'Riley Okafor',
    assigneeRole: 'Care Navigator · 3 active cases',
  };
  if (r.includes('household') || r.includes('separation') || r.includes('payer mismatch')) return {
    bullets: [
      `Household composition change — payer mismatch flagged`,
      `Latest service billed to incorrect payer`,
      `CCBHC PPS triggers only on Medicaid-billed services`,
      `Client has active Medicaid coverage through ${client.treatmentPlanEnd}`,
    ],
    recommendedAction: 'Route to SDP to schedule a CCBHC-triggering service this week',
    rationale: 'Payer mismatch delays CCBHC reimbursement. Correcting the billing payer and scheduling a Medicaid-billed service resolves the flag.',
    assigneeName: 'Jamie Lin',
    assigneeRole: 'SDP · 2 active cases',
  };
  return {
    bullets: [
      riskReason,
      `Coverage active through ${client.treatmentPlanEnd}`,
      `Client last seen ${client.lastServiceDate}`,
      'Direct outreach needed to confirm next steps',
    ],
    recommendedAction: 'Contact client to confirm status and coordinate next steps',
    rationale: 'Early outreach reduces the risk of a coverage gap before the next service date.',
    assigneeName: 'Riley Okafor',
    assigneeRole: 'Care Navigator · 3 active cases',
  };
}

function LogOutreachDetail({ clientId, clinicianName, onBack, onStatusChange, initialHistory, onHistoryAdd }: {
  clientId: string;
  clinicianName: string;
  onBack: () => void;
  onStatusChange?: (id: string, status: CalledStatus) => void;
  initialHistory?: OutreachEntry[];
  onHistoryAdd?: (id: string, entry: OutreachEntry) => void;
}) {
  const client = CLINICIANS.flatMap(c => [...c.notTriggered, ...c.triggered]).find(c => c.id === clientId)
    ?? CLINICIANS[0].notTriggered[0];

  const insights = getLogOutreachInsights(client.riskReason || '', client);

  const [actionType, setActionType] = useState<'outreach' | 'navigator' | null>(null);
  const [outreachReached, setOutreachReached] = useState<'yes' | 'no' | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<CalledStatus | ''>('');
  const [assignee, setAssignee] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [loggedStatus, setLoggedStatus] = useState<CalledStatus | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [callbackDate, setCallbackDate] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [navAssignee, setNavAssignee] = useState('Riley Okafor — Care Navigator');
  const [navSearch, setNavSearch] = useState('');
  const [resolvedDone, setResolvedDone] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const needsHelpOutcomes: CalledStatus[] = [
    'Needs appointment — CN / SDP / DHS',
    'Appointment scheduled',
    'Needs the insurance hotline called',
  ];
  const isNeedsHelp = needsHelpOutcomes.includes(selectedOutcome as CalledStatus);

  const handleLog = () => {
    if (actionType === 'navigator') {
      setLoggedStatus('Navigator assigned' as CalledStatus);
      setAssignee(navAssignee);
      onStatusChange?.(clientId, 'Navigator assigned' as CalledStatus);
      onHistoryAdd?.(clientId, { date: TODAY, actor: clinicianName, event: 'Navigator assigned', detail: '', assignee: navAssignee, note: note || undefined });
      setDone(true);
      return;
    }
    if (!selectedOutcome) return;
    const status: CalledStatus = selectedOutcome as CalledStatus;
    const event = status === 'Called — left voicemail' ? 'Called — left voicemail'
      : status === 'Called — no time to talk, call back' ? 'Callback scheduled'
      : status === 'Unreachable' ? 'Marked as unreachable'
      : 'Outreach logged';
    setLoggedStatus(status);
    onStatusChange?.(clientId, status);
    onHistoryAdd?.(clientId, {
      date: TODAY,
      actor: clinicianName,
      event,
      detail: status,
      assignee: assignee || undefined,
      callbackDate: callbackDate || undefined,
      note: note || undefined,
      selectedOutcome,
    });
    setDone(true);
  };

  const handleResolve = () => {
    onStatusChange?.(clientId, 'Closed' as CalledStatus);
    onHistoryAdd?.(clientId, { date: TODAY, actor: clinicianName, event: 'Case resolved', detail: '' });
    setResolvedDone(true);
  };

  return (
    <div className="ccbhc-triage">
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>Workflows Visibility</button>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">
              {CLIENT_NAMES[clientId] ?? clientId} — {client.riskReason || 'Medicaid renewal at risk'}
            </span>
            <MedicaidPill status={client.medicaidStatus} />
          </div>
          <div className="ccbhc-client-header__meta">
            {clientId}
          </div>
        </div>
      </div>

      <div className="ccbhc-triage-cols">

          {/* Left — Client context */}
          <div className="ccbhc-triage-col ccbhc-triage-col--left">
            <div className="ccbhc-triage-section-title">Outreach context</div>

            <div className="ccbhc-detail-group">
              <div className="ccbhc-detail-label">Medicaid status</div>
              <span className={`ccbhc-pill ccbhc-pill--medicaid-${client.medicaidStatus === 'Active' ? 'active' : 'at-risk'}`} style={{ alignSelf: 'flex-start' }}>{client.medicaidStatus}</span>
              <div className="ccbhc-detail-value">Treatment plan ends {client.treatmentPlanEnd}</div>
            </div>

            <div className="ccbhc-detail-group">
              <div className="ccbhc-detail-label">Last seen</div>
              <div className="ccbhc-detail-value">{client.lastServiceDate}</div>
            </div>

            <div className="ccbhc-detail-group">
              <div className="ccbhc-detail-label">Phone</div>
              <a href="tel:+15033847291" style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5', textDecoration: 'none', letterSpacing: '0.01em' }}>
                (503) 384-7291
              </a>
            </div>

            <div className="ccbhc-detail-group">
              <div className="ccbhc-detail-label">Assigned clinician</div>
              <div className="ccbhc-detail-value" style={{ fontWeight: 500 }}>{clinicianName}</div>
            </div>

            {/* Outreach history timeline */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              <div className="ccbhc-detail-label" style={{ marginBottom: 12 }}>Outreach history</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { date: `${client.triggeredDate ?? 'Sep 22'}, 2026`, actor: 'Eleos', event: 'Client flagged', detail: client.riskReason || 'Medicaid renewal at risk', type: 'flag' as const },
                  ...(initialHistory ?? []).map(e => ({ ...e, type: 'outreach' as const })),
                ].map((entry, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                        background: entry.type === 'flag' ? '#e0e7ff' : '#d1fae5',
                        border: `2px solid ${entry.type === 'flag' ? '#6366f1' : '#10b981'}`,
                      }} />
                    </div>
                    <div style={{ paddingBottom: 16 }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{entry.date} · {entry.actor}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: entry.type === 'flag' ? '#1e293b' : '#059669', marginTop: 2 }}>{entry.event}</div>
                      {entry.detail && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{entry.detail}</div>}
                      {'assignee' in entry && entry.assignee && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Assigned to: <span style={{ fontWeight: 500, color: '#1e293b' }}>{entry.assignee}</span></div>}
                      {'callbackDate' in entry && entry.callbackDate && <div style={{ fontSize: 12, color: '#4f46e5', marginTop: 3 }}>Callback: {new Date(entry.callbackDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>}
                      {'note' in entry && entry.note && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>"{entry.note}"</div>}
                    </div>
                  </div>
                ))}
                {!(initialHistory?.length) && !done && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 10, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f1f5f9', border: '2px dashed #cbd5e1', marginTop: 4 }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', paddingTop: 4 }}>No outreach logged yet</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center — Log outreach action */}
          <div className="ccbhc-triage-col ccbhc-triage-col--center">

            {/* WHY OUTREACH IS NEEDED */}
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Why outreach is needed</div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 10 }}>
                {client.riskReason || 'Medicaid renewal at risk'}
              </div>
              <div style={{ height: 1, background: '#f1f5f9', margin: '10px 0' }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Reasoning</div>
              <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {insights.bullets.map((b, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#334155', lineHeight: 1.45 }} dangerouslySetInnerHTML={{ __html: b.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                ))}
              </ul>
            </div>

            <div className="ccbhc-rec-card" style={{ marginTop: 0, padding: 0, border: 'none', background: 'transparent' }}>
              <div className="ccbhc-rec-card__body" style={{ padding: 0 }}>

                {/* Success state */}
                {done && (
                  <div style={{ padding: '20px 16px', borderRadius: 12, background: '#f0fdf4', border: '1.5px solid #86efac', textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, color: '#fff' }}>✓</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#15803d', marginBottom: 6 }}>
                      {loggedStatus === 'Navigator assigned' ? 'Navigator assigned' : 'Action logged'}
                    </div>
                    {loggedStatus !== 'Navigator assigned' && (
                      <div style={{ fontSize: 13, color: '#166534', marginBottom: selectedOutcome === 'Called — no time to talk, call back' && callbackDate ? 8 : 0 }}>
                        {loggedStatus}
                      </div>
                    )}
                    {assignee && (
                      <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>Assigned to: <span style={{ fontWeight: 600 }}>{assignee}</span></div>
                    )}
                    {selectedOutcome === 'Called — no time to talk, call back' && callbackDate && (
                      <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 500, marginBottom: 8 }}>
                        📅 {new Date(callbackDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}
                    {note && <div style={{ fontSize: 12, color: '#166534', fontStyle: 'italic', marginTop: 4 }}>"{note}"</div>}
                    <button
                      onClick={() => { setDone(false); setLoggedStatus(null); setActionType(null); setOutreachReached(null); setSelectedOutcome(''); setAssignee(''); setNote(''); setWizardStep(1); setCallbackDate(''); setAssigneeSearch(''); setAssigneeOpen(false); setNavAssignee('Riley Okafor — Care Navigator'); setNavSearch(''); setNavOpen(false); }}
                      style={{ marginTop: 12, padding: '4px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: '#6b9e80', fontSize: 11, fontWeight: 400, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}
                    >Undo</button>
                  </div>
                )}

                {/* Action type selector + wizard (hidden when done) */}
                {!done && (<>

                {/* Recommended action card — shown when no action type selected yet */}
                {!actionType && (
                  <div className="ccbhc-recommendation-card">
                    <div className="ccbhc-recommendation-card__label">Recommended action</div>
                    <div className="ccbhc-recommendation-card__action-row">
                      <span className="ccbhc-recommendation-card__action">{insights.recommendedAction}</span>
                    </div>
                    <details className="ccbhc-why-preferred">
                      <summary>Why this recommendation was preferred</summary>
                      <p>{insights.rationale}</p>
                    </details>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, marginTop: 4 }}>Log action</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        style={{ flex: 1, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#4f46e5', background: '#fff', border: '1.5px solid #c7d2fe', borderRadius: 10, padding: '10px 0', cursor: 'pointer' }}
                        onClick={() => setActionType('outreach')}
                      >
                        Outreach call
                      </button>
                      <button
                        style={{ flex: 1, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#4f46e5', background: '#fff', border: '1.5px solid #c7d2fe', borderRadius: 10, padding: '10px 0', cursor: 'pointer' }}
                        onClick={() => { setNavAssignee(''); setNavSearch(''); setActionType('navigator'); setNavOpen(true); }}
                      >
                        Assign to Care Navigator
                      </button>
                    </div>
                  </div>
                )}

                {/* Outreach call wizard */}
                {actionType === 'outreach' && (() => {
                  const totalSteps = outreachReached === 'yes' && isNeedsHelp ? 3 : 2;
                  const stepDone = (n: number) => {
                    if (n === 1) return outreachReached !== null;
                    if (n === 2) return selectedOutcome !== '';
                    if (n === 3) return assignee !== '';
                    return false;
                  };
                  const stepDotStyle = (n: number) => {
                    const done = stepDone(n);
                    const current = wizardStep === n;
                    const past = wizardStep > n;
                    return {
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                      background: (past && done) || done ? '#4f46e5' : current ? '#fff' : '#e2e8f0',
                      color: (past && done) || done ? '#fff' : current ? '#4f46e5' : '#94a3b8',
                      border: current && !done ? '2px solid #4f46e5' : '2px solid transparent',
                      boxSizing: 'border-box' as const,
                      transition: 'all 0.2s',
                    };
                  };
                  return (
                    <>
                      {/* Progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
                        {Array.from({ length: totalSteps }, (_, i) => (
                          <Fragment key={i}>
                            <div style={stepDotStyle(i + 1)}>
                              {wizardStep > i + 1 && stepDone(i + 1) ? '✓' : i + 1}
                            </div>
                            {i < totalSteps - 1 && (
                              <div style={{ flex: 1, height: 2, borderRadius: 1, background: wizardStep > i + 1 && stepDone(i + 1) ? '#4f46e5' : '#e2e8f0', transition: 'background 0.2s' }} />
                            )}
                          </Fragment>
                        ))}
                      </div>

                      {/* Step 1: Was outreach successful? */}
                      {wizardStep === 1 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Step 1 of 2</div>
                          <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 16 }}>Was outreach successful?</div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            {([
                              { key: 'yes' as const, label: 'Yes — reached client', icon: '✓', activeColor: '#059669', activeBg: '#ecfdf5', activeBorder: '#10b981' },
                              { key: 'no' as const, label: 'Could not reach', icon: '✗', activeColor: '#dc2626', activeBg: '#fef2f2', activeBorder: '#fca5a5' },
                            ]).map(opt => (
                              <button
                                key={opt.key}
                                onClick={() => { setOutreachReached(opt.key); setSelectedOutcome(''); setAssignee(''); setWizardStep(2); }}
                                style={{
                                  flex: 1, padding: '16px 10px', borderRadius: 10, border: '2px solid',
                                  borderColor: outreachReached === opt.key ? opt.activeBorder : '#e2e8f0',
                                  background: outreachReached === opt.key ? opt.activeBg : '#fafafa',
                                  color: outreachReached === opt.key ? opt.activeColor : '#475569',
                                  fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                                  transition: 'all 0.15s',
                                }}
                              >
                                <span style={{ fontSize: 20 }}>{opt.icon}</span>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Step 2a: Could not reach */}
                      {wizardStep === 2 && outreachReached === 'no' && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Step 2 of 2</div>
                          <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>What's next?</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Choose how to handle the missed attempt.</div>
                          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                            {([
                              { key: 'Called — left voicemail' as CalledStatus, icon: '📞', label: 'Left voicemail', desc: 'Called — client did not answer, voicemail left' },
                              { key: 'Called — no time to talk, call back' as CalledStatus, icon: '📅', label: 'No time to talk, call back', desc: 'Client answered briefly — schedule a callback' },
                              { key: 'Unreachable' as CalledStatus, icon: '🚫', label: 'Unreachable', desc: 'Multiple attempts failed — escalate if needed' },
                            ]).map(opt => (
                              <button
                                key={opt.key}
                                onClick={() => setSelectedOutcome(opt.key as CalledStatus)}
                                style={{
                                  flex: 1, padding: '14px 12px', borderRadius: 10, border: '2px solid',
                                  borderColor: selectedOutcome === opt.key ? '#4f46e5' : '#e2e8f0',
                                  background: selectedOutcome === opt.key ? '#eef2ff' : '#fafafa',
                                  color: selectedOutcome === opt.key ? '#4f46e5' : '#475569',
                                  fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                                  transition: 'all 0.15s',
                                }}
                              >
                                <div style={{ fontSize: 20, marginBottom: 6 }}>{opt.icon}</div>
                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{opt.label}</div>
                                <div style={{ fontSize: 11, color: selectedOutcome === opt.key ? '#6366f1' : '#94a3b8' }}>{opt.desc}</div>
                              </button>
                            ))}
                          </div>
                          {/* Callback date picker */}
                          {selectedOutcome === 'Called — no time to talk, call back' && (
                            <div style={{ marginBottom: 14, padding: '14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
                              <div className="ccbhc-detail-label" style={{ marginBottom: 10 }}>Select a date and time</div>
                              <input
                                type="datetime-local"
                                value={callbackDate}
                                onChange={e => setCallbackDate(e.target.value)}
                                min={new Date().toISOString().slice(0, 16)}
                                style={{
                                  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
                                  borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff',
                                  fontSize: 13, fontFamily: 'inherit', color: '#1e293b', outline: 'none',
                                  cursor: 'pointer',
                                }}
                              />
                              {callbackDate && (
                                <div style={{ marginTop: 8, fontSize: 12, color: '#4f46e5', fontWeight: 500 }}>
                                  Reminder set for {new Date(callbackDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          )}
                          <div style={{ marginBottom: 14 }}>
                            <div className="ccbhc-detail-label" style={{ marginBottom: 6 }}>Note (optional)</div>
                            <textarea
                              value={note}
                              onChange={e => setNote(e.target.value)}
                              placeholder="e.g. Tried twice, no answer. Will retry Thursday."
                              rows={2}
                              style={{
                                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                                borderRadius: 8, border: '1.5px solid #e2e8f0',
                                fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => setWizardStep(1)}
                              style={{
                                padding: '9px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                                background: '#fff', color: '#475569', fontSize: 13, fontWeight: 500,
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >← Back</button>
                            <button
                              className="ccbhc-primary-btn"
                              style={{ flex: 1, opacity: (selectedOutcome && (selectedOutcome !== 'Called — no time to talk, call back' || callbackDate)) ? 1 : 0.45 }}
                              disabled={!selectedOutcome || (selectedOutcome === 'Called — no time to talk, call back' && !callbackDate)}
                              onClick={handleLog}
                            >
                              {selectedOutcome === 'Called — no time to talk, call back' ? 'Schedule callback' : selectedOutcome === 'Unreachable' ? 'Mark as unreachable' : 'Log and update status'}
                            </button>
                          </div>
                        </>
                      )}

                      {/* Step 2b: Yes — select outcome */}
                      {wizardStep === 2 && outreachReached === 'yes' && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Step 2 of {isNeedsHelp ? 3 : 2}</div>
                          <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>What was the outcome?</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Select the result of the call.</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                            {(OUTREACH_OUTCOMES).map(opt => (
                              <label
                                key={opt.value}
                                style={{
                                  display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                                  padding: '9px 11px', borderRadius: 8, border: '1.5px solid',
                                  borderColor: selectedOutcome === opt.value ? '#4f46e5' : '#e2e8f0',
                                  background: selectedOutcome === opt.value ? '#eef2ff' : '#fff',
                                  transition: 'all 0.15s',
                                }}
                              >
                                <input
                                  type="radio"
                                  name="outreach-outcome"
                                  value={opt.value}
                                  checked={selectedOutcome === opt.value}
                                  onChange={() => { setSelectedOutcome(opt.value); setAssignee(''); }}
                                  style={{ marginTop: 3, accentColor: '#4f46e5', flexShrink: 0 }}
                                />
                                <div>
                                  <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b' }}>{opt.label}</div>
                                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{opt.desc}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => setWizardStep(1)}
                              style={{
                                padding: '9px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                                background: '#fff', color: '#475569', fontSize: 13, fontWeight: 500,
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >← Back</button>
                            <button
                              className="ccbhc-primary-btn"
                              style={{ flex: 1, opacity: selectedOutcome ? 1 : 0.45 }}
                              disabled={!selectedOutcome}
                              onClick={() => { if (isNeedsHelp) { setWizardStep(3); } else { handleLog(); } }}
                            >{isNeedsHelp ? 'Continue →' : 'Log and update status'}</button>
                          </div>
                        </>
                      )}

                      {/* Step 3: Assign + note + submit */}
                      {wizardStep === 3 && outreachReached === 'yes' && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Step 3 of 3</div>
                          <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>Assign to handle this task</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Choose a team member to follow up with the client.</div>
                          {(() => {
                            const allAssignees = ['Riley Okafor — Care Navigator', 'Sam Whitcomb — BHC', 'Dana Torres — LCSW', 'Marcus Chen — LPC', 'Jordan Wells — BHC', 'Priya Nair — LCSW', 'Tomas Reyes — LPC', 'Alex Kim — Care Navigator'];
                            const filtered = allAssignees.filter(n => n.toLowerCase().includes(assigneeSearch.toLowerCase()));
                            return (
                              <div style={{ position: 'relative', marginBottom: 16 }}>
                                <div
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '9px 12px', borderRadius: 8,
                                    border: `1.5px solid ${assigneeOpen ? '#4f46e5' : '#e2e8f0'}`,
                                    background: '#fff', cursor: 'text',
                                    boxShadow: assigneeOpen ? '0 0 0 3px #eef2ff' : 'none',
                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                  }}
                                  onClick={() => setAssigneeOpen(true)}
                                >
                                  <span style={{ fontSize: 14, color: '#94a3b8', flexShrink: 0 }}>🔍</span>
                                  <input
                                    type="text"
                                    value={assigneeOpen ? assigneeSearch : (assignee || '')}
                                    onChange={e => { setAssigneeSearch(e.target.value); setAssignee(''); }}
                                    onFocus={() => { setAssigneeOpen(true); setAssigneeSearch(''); }}
                                    onBlur={() => setTimeout(() => setAssigneeOpen(false), 150)}
                                    placeholder={assignee ? '' : 'Search team members…'}
                                    style={{
                                      flex: 1, border: 'none', outline: 'none', fontSize: 13,
                                      fontFamily: 'inherit', background: 'transparent',
                                      color: assignee && !assigneeOpen ? '#4f46e5' : '#1e293b',
                                      fontWeight: assignee && !assigneeOpen ? 600 : 400,
                                    }}
                                  />
                                  {assignee && !assigneeOpen && (
                                    <button
                                      onClick={e => { e.stopPropagation(); setAssignee(''); setAssigneeSearch(''); }}
                                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 2px', color: '#94a3b8', fontSize: 16, lineHeight: 1 }}
                                    >×</button>
                                  )}
                                </div>
                                {assigneeOpen && (
                                  <div style={{
                                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10,
                                    background: '#fff', borderRadius: 8, border: '1.5px solid #e2e8f0',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden',
                                  }}>
                                    {filtered.length === 0 ? (
                                      <div style={{ padding: '10px 12px', fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No matches found</div>
                                    ) : filtered.map(name => (
                                      <div
                                        key={name}
                                        onMouseDown={() => { setAssignee(name); setAssigneeSearch(''); setAssigneeOpen(false); }}
                                        style={{
                                          padding: '9px 12px', fontSize: 13, cursor: 'pointer',
                                          background: assignee === name ? '#eef2ff' : '#fff',
                                          color: assignee === name ? '#4f46e5' : '#1e293b',
                                          fontWeight: assignee === name ? 600 : 400,
                                          borderBottom: '1px solid #f1f5f9',
                                          transition: 'background 0.1s',
                                        }}
                                        onMouseEnter={e => { if (assignee !== name) (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = assignee === name ? '#eef2ff' : '#fff'; }}
                                      >{name}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          <div style={{ marginBottom: 14 }}>
                            <div className="ccbhc-detail-label" style={{ marginBottom: 6 }}>Note (optional)</div>
                            <textarea
                              value={note}
                              onChange={e => setNote(e.target.value)}
                              placeholder="Add context about the call…"
                              rows={2}
                              style={{
                                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                                borderRadius: 8, border: '1.5px solid #e2e8f0',
                                fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => setWizardStep(2)}
                              style={{
                                padding: '9px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                                background: '#fff', color: '#475569', fontSize: 13, fontWeight: 500,
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >← Back</button>
                            <button
                              className="ccbhc-primary-btn"
                              style={{ flex: 1, opacity: assignee ? 1 : 0.45 }}
                              disabled={!assignee}
                              onClick={handleLog}
                            >Log and update status</button>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}

                {/* Assign to Care Navigator form */}
                {actionType === 'navigator' && (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <div className="ccbhc-detail-label" style={{ marginBottom: 8 }}>Assign to</div>
                      {(() => {
                        const allNavigators = ['Riley Okafor — Care Navigator', 'Alex Kim — Care Navigator', 'Sam Whitcomb — BHC', 'Dana Torres — LCSW', 'Marcus Chen — LPC', 'Jordan Wells — BHC', 'Priya Nair — LCSW', 'Tomas Reyes — LPC'];
                        const filtered = allNavigators.filter(n => n.toLowerCase().includes(navSearch.toLowerCase()));
                        return (
                          <div style={{ position: 'relative' }}>
                            <div
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '9px 12px', borderRadius: 8,
                                border: `1.5px solid ${navOpen ? '#4f46e5' : '#e2e8f0'}`,
                                background: '#fff', cursor: 'text',
                                boxShadow: navOpen ? '0 0 0 3px #eef2ff' : 'none',
                                transition: 'border-color 0.15s, box-shadow 0.15s',
                              }}
                              onClick={() => setNavOpen(true)}
                            >
                              <span style={{ fontSize: 14, color: '#94a3b8', flexShrink: 0 }}>🔍</span>
                              <input
                                type="text"
                                value={navOpen ? navSearch : (navAssignee || '')}
                                onChange={e => { setNavSearch(e.target.value); setNavAssignee(''); }}
                                onFocus={() => { setNavOpen(true); setNavSearch(''); }}
                                onBlur={() => setTimeout(() => setNavOpen(false), 150)}
                                placeholder={navAssignee ? '' : 'Search team members…'}
                                style={{
                                  flex: 1, border: 'none', outline: 'none', fontSize: 13,
                                  fontFamily: 'inherit', background: 'transparent',
                                  color: navAssignee && !navOpen ? '#4f46e5' : '#1e293b',
                                  fontWeight: navAssignee && !navOpen ? 600 : 400,
                                }}
                              />
                              {navAssignee && !navOpen && (
                                <button
                                  onClick={e => { e.stopPropagation(); setNavAssignee(''); setNavSearch(''); }}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 2px', color: '#94a3b8', fontSize: 16, lineHeight: 1 }}
                                >×</button>
                              )}
                            </div>
                            {navOpen && (
                              <div style={{
                                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10,
                                background: '#fff', borderRadius: 8, border: '1.5px solid #e2e8f0',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden',
                              }}>
                                {filtered.length === 0 ? (
                                  <div style={{ padding: '10px 12px', fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No matches found</div>
                                ) : filtered.map(name => (
                                  <div
                                    key={name}
                                    onMouseDown={() => { setNavAssignee(name); setNavSearch(''); setNavOpen(false); }}
                                    style={{
                                      padding: '9px 12px', fontSize: 13, cursor: 'pointer',
                                      background: navAssignee === name ? '#eef2ff' : '#fff',
                                      color: navAssignee === name ? '#4f46e5' : '#1e293b',
                                      fontWeight: navAssignee === name ? 600 : 400,
                                      borderBottom: '1px solid #f1f5f9',
                                      transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => { if (navAssignee !== name) (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = navAssignee === name ? '#eef2ff' : '#fff'; }}
                                  >{name}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div className="ccbhc-detail-label" style={{ marginBottom: 6 }}>Reason for referral (optional)</div>
                      <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Add context for the care navigator…"
                        rows={3}
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                          borderRadius: 8, border: '1.5px solid #e2e8f0',
                          fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <button
                      className="ccbhc-primary-btn"
                      style={{ marginTop: 16, width: '100%', opacity: navAssignee ? 1 : 0.4, cursor: navAssignee ? 'pointer' : 'not-allowed' }}
                      disabled={!navAssignee}
                      onClick={handleLog}
                    >
                      Assign navigator
                    </button>
                  </>
                )}

                {/* Empty state */}
                {!actionType && (
                  <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                    Select an action type above to continue.
                  </div>
                )}
                </>)}
              </div>
            </div>
          </div>

          {/* Right — Other options */}
          <div className="ccbhc-triage-col ccbhc-triage-col--right">
            <div className="ccbhc-triage-section-title">Quick Actions</div>

            <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Schedule a callback</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Set a date for the team to follow up if this call is unsuccessful.</div>
              <button className="ccbhc-secondary-btn" onClick={() => { setDone(false); setActionType('outreach'); setOutreachReached('no'); setSelectedOutcome('callback' as CalledStatus); setAssignee(''); setNote(''); setWizardStep(2); setCallbackDate(''); setAssigneeSearch(''); setAssigneeOpen(false); }}>Schedule callback</button>
            </div>

            <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Assign to Care Navigator</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Route to Riley Okafor for direct case navigation support.</div>
              <button className="ccbhc-secondary-btn" onClick={() => { setDone(false); setActionType('navigator'); setOutreachReached(null); setSelectedOutcome(''); setAssignee(''); setNote(''); setWizardStep(1); setCallbackDate(''); setAssigneeSearch(''); setAssigneeOpen(false); }}>Assign navigator</button>
            </div>

            <div className="ccbhc-other-option" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Mark as unreachable</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Flag this client for escalation if repeated outreach fails.</div>
              <button className="ccbhc-secondary-btn" onClick={() => { setDone(false); setActionType('outreach'); setOutreachReached('no'); setSelectedOutcome('unreachable' as CalledStatus); setAssignee(''); setNote(''); setWizardStep(2); setCallbackDate(''); setAssigneeSearch(''); setAssigneeOpen(false); }}>Mark unreachable</button>
            </div>

            <div className="ccbhc-other-option">
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>Mark as resolved</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Close this case once the issue has been fully addressed.</div>
              {resolvedDone
                ? <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>✓ Case marked as resolved</span>
                : <button className="ccbhc-secondary-btn" onClick={handleResolve}>Mark resolved</button>
              }
            </div>
          </div>

        </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type MainView = 'caseload' | 'org';

export default function WorkflowsVisibility() {
  const [view, setView] = useState<MainView>('caseload');
  const [selected, setSelected] = useState<SelectedDetail | null>(null);
  const [routedClients, setRoutedClients] = useState<Set<string>>(new Set());
  const [clientStatuses, setClientStatuses] = useState<Map<string, string>>(new Map());
  const [clientHistories, setClientHistories] = useState<Map<string, OutreachEntry[]>>(new Map());
  const [scheduleServiceStates, setScheduleServiceStates] = useState<Map<string, ScheduleServiceState>>(new Map());

  const handleRouted = (id: string) => setRoutedClients(prev => new Set(prev).add(id));
  const handleStatusChange = (id: string, status: string) => setClientStatuses(prev => new Map(prev).set(id, status));
  const handleHistoryAdd = (id: string, entry: OutreachEntry) => setClientHistories(prev => {
    const next = new Map(prev);
    next.set(id, [...(prev.get(id) ?? []), entry]);
    return next;
  });

  const handleClientClick = (id: string, clinicianName: string) => {
    const allClients = CLINICIANS.flatMap(c => [...c.notTriggered, ...c.triggered]);
    const client = allClients.find(c => c.id === id);
    const isNew = !client?.workflowStatus || client.workflowStatus === 'New';
    const detailType: DetailType = isNew ? 'log-outreach' : (ORG_CLIENT_DETAIL_TYPE[id] ?? 'triage');
    setSelected({ clientId: id, clinicianName, detailType });
  };
  const handleBack = () => setSelected(null);

  const renderDetail = () => {
    if (!selected) return null;
    const { clientId, clinicianName, detailType } = selected;
    switch (detailType) {
      case 'care-navigator':
        return <CareNavigatorDetail clientId={clientId} clinicianName={clinicianName} onBack={handleBack} />;
      case 'treatment-plan-renewal':
        return <TreatmentPlanRenewalDetail clientId={clientId} clinicianName={clinicianName} onBack={handleBack} />;
      case 'pa-status':
        return <PAStatusDetail clientId={clientId} clinicianName={clinicianName} onBack={handleBack} />;
      case 'pa-appeal':
        return <PAAppealDetail clientId={clientId} clinicianName={clinicianName} onBack={handleBack} />;
      case 'schedule-service':
        return <ScheduleServiceDetail
          clientId={clientId}
          clinicianName={clinicianName}
          onBack={handleBack}
          persistedState={scheduleServiceStates.get(clientId)}
          onStateChange={s => setScheduleServiceStates(prev => new Map(prev).set(clientId, s))}
          onStatusChange={handleStatusChange}
        />;
      case 'duplicate-enrollment':
        return <DuplicateEnrollmentDetail clientId={clientId} clinicianName={clinicianName} onBack={handleBack} />;
      case 'log-outreach':
        return <LogOutreachDetail clientId={clientId} clinicianName={clinicianName} onBack={handleBack} onStatusChange={handleStatusChange} initialHistory={clientHistories.get(clientId)} onHistoryAdd={handleHistoryAdd} />;
      default:
        return <TriageDetail clientId={clientId} clinicianName={clinicianName} onBack={handleBack} onRouted={handleRouted} />;
    }
  };

  return (
    <div className="ccbhc-root">
      <div className="ccbhc-page-header">
        <div className="ccbhc-page-header__left">
          <h1 className="ccbhc-page-title">Workflows Visibility</h1>
        </div>
        <div className="ccbhc-page-header__right" />
      </div>

      {!selected && (
        <div className="ccbhc-tabs">
          <button className={`ccbhc-tab${view === 'caseload' ? ' ccbhc-tab--active' : ''}`} onClick={() => setView('caseload')}>Client view</button>
          <button className={`ccbhc-tab${view === 'org' ? ' ccbhc-tab--active' : ''}`} onClick={() => setView('org')}>Organization view</button>
        </div>
      )}

      {selected ? (
        renderDetail()
      ) : view === 'caseload' ? (
        <CaseloadView onClientClick={(id) => handleClientClick(id, CLINICIANS.find(c => c.notTriggered.some(cl => cl.id === id))?.name ?? CLINICIANS[0].name)} routedClients={routedClients} clientStatuses={clientStatuses} />
      ) : (
        <OrgView onClientClick={handleClientClick} />
      )}
    </div>
  );
}
