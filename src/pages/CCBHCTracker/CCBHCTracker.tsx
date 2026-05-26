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
  action?: string;
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
    name: 'Morgan Reyes', credential: 'LCSW', team: 'Tulsa Team 4', county: 'Tulsa County',
    caseload: 32, triggeredCount: 27, atRiskCount: 3,
    notTriggered: [
      {
        id: 'CL-10238', initials: 'JS', medicaidStatus: 'Lost',
        treatmentPlanEnd: 'Jun 14, 2026', lastServiceDate: 'May 8, 2026',
        daysRemaining: 6, riskReason: 'Lost Medicaid May 12 — retro window: 8 days remaining',
        status: 'not-triggered', alert: 'medicaid-loss', retroWindow: 8, action: 'Open retro workflow',
      },
      {
        id: 'CL-10519', initials: 'AR', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Jun 3, 2026', lastServiceDate: 'Apr 30, 2026',
        daysRemaining: 6, riskReason: 'Treatment plan expires in 14 days — no appointment scheduled',
        status: 'not-triggered', action: 'Schedule service',
      },
      {
        id: 'CL-10774', initials: 'MW', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Aug 20, 2026', lastServiceDate: 'May 8, 2026',
        daysRemaining: 6, riskReason: 'Wrong payer billed — needs CCBHC triggering service',
        status: 'not-triggered', alert: 'wrong-payer', action: 'Review payer routing',
      },
      {
        id: 'CL-11042', initials: 'TC', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Jul 7, 2026', lastServiceDate: 'May 3, 2026',
        daysRemaining: 6, riskReason: 'Payer change pending — PA not yet approved',
        status: 'not-triggered', action: 'Check PA status',
      },
      {
        id: 'CL-11198', initials: 'LB', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Sep 12, 2026', lastServiceDate: 'Apr 22, 2026',
        daysRemaining: 6, riskReason: 'No appointment scheduled — client unreachable',
        status: 'not-triggered', action: 'Assign care navigator',
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
    name: 'Avery Patel', credential: 'LPC', team: 'Pawnee Team 1', county: 'Pawnee County',
    caseload: 28, triggeredCount: 26, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-20441', initials: 'RK', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Jul 2, 2026', lastServiceDate: 'May 6, 2026',
        daysRemaining: 6, riskReason: 'Payer change pending — PA not yet approved',
        status: 'not-triggered', action: 'Check PA status',
      },
      {
        id: 'CL-20589', initials: 'BT', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Oct 15, 2026', lastServiceDate: 'Apr 28, 2026',
        daysRemaining: 6, riskReason: 'No appointment scheduled — 27 days since last service',
        status: 'not-triggered', action: 'Assign care navigator',
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
    name: 'Sam Whitcomb', credential: 'BHC', team: 'Delaware Team 1', county: 'Delaware County',
    caseload: 35, triggeredCount: 28, atRiskCount: 5,
    notTriggered: [
      {
        id: 'CL-30102', initials: 'MN', medicaidStatus: 'Lost',
        treatmentPlanEnd: 'Aug 3, 2026', lastServiceDate: 'May 5, 2026',
        daysRemaining: 6, riskReason: 'Lost Medicaid May 9 — retro window: 4 days remaining',
        status: 'not-triggered', alert: 'medicaid-loss', retroWindow: 4, action: 'Open retro workflow',
      },
      {
        id: 'CL-30214', initials: 'JR', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'May 20, 2026', lastServiceDate: 'Apr 15, 2026',
        daysRemaining: 6, riskReason: 'Treatment plan expired May 20 — needs immediate renewal',
        status: 'not-triggered', action: 'Open renewal request',
      },
      {
        id: 'CL-30318', initials: 'ES', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Sep 8, 2026', lastServiceDate: 'May 7, 2026',
        daysRemaining: 6, riskReason: 'Wrong payer billed — needs CCBHC triggering service',
        status: 'not-triggered', alert: 'wrong-payer', action: 'Review payer routing',
      },
      {
        id: 'CL-30456', initials: 'CT', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Jul 30, 2026', lastServiceDate: 'Apr 8, 2026',
        daysRemaining: 6, riskReason: 'No contact in 47 days — care navigator follow-up needed',
        status: 'not-triggered', action: 'Assign care navigator',
      },
      {
        id: 'CL-30612', initials: 'WF', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Jun 18, 2026', lastServiceDate: 'Apr 29, 2026',
        daysRemaining: 6, riskReason: 'Payer change pending — PA under review 18 days',
        status: 'not-triggered', action: 'Check PA status',
      },
      {
        id: 'CL-30788', initials: 'LS', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Nov 1, 2026', lastServiceDate: 'Apr 18, 2026',
        daysRemaining: 6, riskReason: 'No upcoming appointment — client unreachable',
        status: 'not-triggered', action: 'Assign care navigator',
      },
      {
        id: 'CL-30891', initials: 'DH', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Aug 22, 2026', lastServiceDate: 'Apr 12, 2026',
        daysRemaining: 6, riskReason: 'Last service Apr 12 — 43 days without CCBHC encounter',
        status: 'not-triggered', action: 'Schedule service',
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
  // ── Tulsa Team 4 — 2nd clinician ─────────────────────────────────────────────
  {
    name: 'Jamie Lin', credential: 'SDP', team: 'Tulsa Team 4', county: 'Tulsa County',
    caseload: 24, triggeredCount: 23, atRiskCount: 0,
    notTriggered: [
      {
        id: 'CL-40101', initials: 'PD', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Aug 10, 2026', lastServiceDate: 'May 2, 2026',
        daysRemaining: 6, riskReason: 'No appointment scheduled this month',
        status: 'not-triggered', action: 'Schedule service',
      },
    ],
    triggered: [
      { id: 'CL-40201', initials: 'KR', medicaidStatus: 'Active', treatmentPlanEnd: 'Sep 5, 2026',  lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-40202', initials: 'BN', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 20, 2026', lastServiceDate: 'May 21, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 21' },
      { id: 'CL-40203', initials: 'MO', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 3, 2026',  lastServiceDate: 'May 19, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 19' },
      { id: 'CL-40204', initials: 'VL', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 1, 2026',  lastServiceDate: 'May 17, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 17' },
      { id: 'CL-40205', initials: 'TW', medicaidStatus: 'Active', treatmentPlanEnd: 'Jun 28, 2026', lastServiceDate: 'May 15, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 15' },
    ],
  },
  // ── Tulsa Team 3 ──────────────────────────────────────────────────────────────
  {
    name: 'Dana Torres', credential: 'LCSW', team: 'Tulsa Team 3', county: 'Tulsa County',
    caseload: 22, triggeredCount: 21, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-41101', initials: 'GF', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Jun 30, 2026', lastServiceDate: 'Apr 28, 2026',
        daysRemaining: 6, riskReason: 'Payer change pending — PA under review',
        status: 'not-triggered', action: 'Check PA status',
      },
    ],
    triggered: [
      { id: 'CL-41201', initials: 'HL', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 12, 2026', lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-41202', initials: 'JK', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 7, 2026',  lastServiceDate: 'May 21, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 21' },
      { id: 'CL-41203', initials: 'QS', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 15, 2026', lastServiceDate: 'May 19, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 19' },
      { id: 'CL-41204', initials: 'AB', medicaidStatus: 'Active', treatmentPlanEnd: 'Sep 22, 2026', lastServiceDate: 'May 16, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 16' },
      { id: 'CL-41205', initials: 'RF', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 5, 2026',  lastServiceDate: 'May 14, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 14' },
    ],
  },
  {
    name: 'Kevin Park', credential: 'BHC', team: 'Tulsa Team 3', county: 'Tulsa County',
    caseload: 21, triggeredCount: 20, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-41301', initials: 'YM', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Jul 8, 2026', lastServiceDate: 'May 1, 2026',
        daysRemaining: 6, riskReason: 'Treatment plan expires in 7 days',
        status: 'not-triggered', action: 'Open renewal request',
      },
    ],
    triggered: [
      { id: 'CL-41401', initials: 'CN', medicaidStatus: 'Active', treatmentPlanEnd: 'Sep 10, 2026', lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-41402', initials: 'DT', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 4, 2026',  lastServiceDate: 'May 20, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 20' },
      { id: 'CL-41403', initials: 'EH', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 14, 2026', lastServiceDate: 'May 18, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 18' },
      { id: 'CL-41404', initials: 'PB', medicaidStatus: 'Active', treatmentPlanEnd: 'Jun 25, 2026', lastServiceDate: 'May 15, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 15' },
    ],
  },
  // ── Pawnee Team 1 — 2nd clinician ────────────────────────────────────────────
  {
    name: 'Nina Reeves', credential: 'LPC', team: 'Pawnee Team 1', county: 'Pawnee County',
    caseload: 19, triggeredCount: 18, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-50101', initials: 'OW', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Sep 15, 2026', lastServiceDate: 'Apr 25, 2026',
        daysRemaining: 6, riskReason: 'No service in 18 days — client unreachable',
        status: 'not-triggered', action: 'Assign care navigator',
      },
    ],
    triggered: [
      { id: 'CL-50201', initials: 'ZA', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 18, 2026', lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-50202', initials: 'XC', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 9, 2026',  lastServiceDate: 'May 20, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 20' },
      { id: 'CL-50203', initials: 'UV', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 30, 2026', lastServiceDate: 'May 17, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 17' },
      { id: 'CL-50204', initials: 'ST', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 5, 2026',  lastServiceDate: 'May 14, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 14' },
    ],
  },
  // ── Pawnee Team 2 ─────────────────────────────────────────────────────────────
  {
    name: 'Jordan Wells', credential: 'BHC', team: 'Pawnee Team 2', county: 'Pawnee County',
    caseload: 22, triggeredCount: 21, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-51101', initials: 'FM', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Jun 20, 2026', lastServiceDate: 'May 3, 2026',
        daysRemaining: 6, riskReason: 'Payer change pending — PA under review',
        status: 'not-triggered', action: 'Check PA status',
      },
    ],
    triggered: [
      { id: 'CL-51201', initials: 'IL', medicaidStatus: 'Active', treatmentPlanEnd: 'Sep 8, 2026',  lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-51202', initials: 'GK', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 14, 2026', lastServiceDate: 'May 21, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 21' },
      { id: 'CL-51203', initials: 'NJ', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 2, 2026',  lastServiceDate: 'May 19, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 19' },
      { id: 'CL-51204', initials: 'BH', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 27, 2026', lastServiceDate: 'May 16, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 16' },
      { id: 'CL-51205', initials: 'OE', medicaidStatus: 'Active', treatmentPlanEnd: 'Jun 11, 2026', lastServiceDate: 'May 13, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 13' },
    ],
  },
  {
    name: 'Sarah Monroe', credential: 'LCSW', team: 'Pawnee Team 2', county: 'Pawnee County',
    caseload: 22, triggeredCount: 20, atRiskCount: 2,
    notTriggered: [
      {
        id: 'CL-51301', initials: 'WP', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Oct 5, 2026', lastServiceDate: 'Apr 30, 2026',
        daysRemaining: 6, riskReason: 'No appointment scheduled this month',
        status: 'not-triggered', action: 'Schedule service',
      },
      {
        id: 'CL-51302', initials: 'RD', medicaidStatus: 'Lost',
        treatmentPlanEnd: 'Aug 1, 2026', lastServiceDate: 'May 4, 2026',
        daysRemaining: 6, riskReason: 'Lost Medicaid — retro window open',
        status: 'not-triggered', alert: 'medicaid-loss', retroWindow: 6, action: 'Open retro workflow',
      },
    ],
    triggered: [
      { id: 'CL-51401', initials: 'AV', medicaidStatus: 'Active', treatmentPlanEnd: 'Sep 18, 2026', lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-51402', initials: 'LQ', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 30, 2026', lastServiceDate: 'May 20, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 20' },
      { id: 'CL-51403', initials: 'MZ', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 10, 2026', lastServiceDate: 'May 17, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 17' },
      { id: 'CL-51404', initials: 'KU', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 6, 2026',  lastServiceDate: 'May 15, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 15' },
    ],
  },
  // ── Delaware Team 2 ───────────────────────────────────────────────────────────
  {
    name: 'Chris Nair', credential: 'BHC', team: 'Delaware Team 2', county: 'Delaware County',
    caseload: 21, triggeredCount: 19, atRiskCount: 2,
    notTriggered: [
      {
        id: 'CL-60101', initials: 'HB', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Jul 22, 2026', lastServiceDate: 'May 6, 2026',
        daysRemaining: 6, riskReason: 'Wrong payer billed — needs CCBHC service',
        status: 'not-triggered', alert: 'wrong-payer', action: 'Review payer routing',
      },
      {
        id: 'CL-60102', initials: 'EG', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Jun 12, 2026', lastServiceDate: 'Apr 29, 2026',
        daysRemaining: 6, riskReason: 'Treatment plan expires in 7 days',
        status: 'not-triggered', action: 'Open renewal request',
      },
    ],
    triggered: [
      { id: 'CL-60201', initials: 'TY', medicaidStatus: 'Active', treatmentPlanEnd: 'Sep 3, 2026',  lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-60202', initials: 'DN', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 17, 2026', lastServiceDate: 'May 21, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 21' },
      { id: 'CL-60203', initials: 'SR', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 9, 2026',  lastServiceDate: 'May 19, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 19' },
      { id: 'CL-60204', initials: 'PC', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 4, 2026',  lastServiceDate: 'May 16, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 16' },
    ],
  },
  {
    name: 'Lisa Huang', credential: 'LCSW', team: 'Delaware Team 2', county: 'Delaware County',
    caseload: 20, triggeredCount: 18, atRiskCount: 2,
    notTriggered: [
      {
        id: 'CL-60301', initials: 'WK', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Sep 20, 2026', lastServiceDate: 'Apr 27, 2026',
        daysRemaining: 6, riskReason: 'No appointment scheduled this month',
        status: 'not-triggered', action: 'Schedule service',
      },
      {
        id: 'CL-60302', initials: 'IM', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Jun 8, 2026', lastServiceDate: 'May 5, 2026',
        daysRemaining: 6, riskReason: 'Payer change pending — PA under review',
        status: 'not-triggered', action: 'Check PA status',
      },
    ],
    triggered: [
      { id: 'CL-60401', initials: 'JT', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 14, 2026', lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-60402', initials: 'BO', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 1, 2026',  lastServiceDate: 'May 20, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 20' },
      { id: 'CL-60403', initials: 'ZP', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 28, 2026', lastServiceDate: 'May 18, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 18' },
      { id: 'CL-60404', initials: 'YH', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 6, 2026',  lastServiceDate: 'May 15, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 15' },
    ],
  },
  // ── Kay Team 1 ────────────────────────────────────────────────────────────────
  {
    name: 'Tom Bradley', credential: 'LCSW', team: 'Kay Team 1', county: 'Kay County',
    caseload: 18, triggeredCount: 18, atRiskCount: 0,
    notTriggered: [],
    triggered: [
      { id: 'CL-70101', initials: 'FN', medicaidStatus: 'Active', treatmentPlanEnd: 'Sep 11, 2026', lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-70102', initials: 'GQ', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 5, 2026',  lastServiceDate: 'May 21, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 21' },
      { id: 'CL-70103', initials: 'RX', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 20, 2026', lastServiceDate: 'May 19, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 19' },
      { id: 'CL-70104', initials: 'LV', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 3, 2026',  lastServiceDate: 'May 17, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 17' },
      { id: 'CL-70105', initials: 'NE', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 15, 2026', lastServiceDate: 'May 14, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 14' },
    ],
  },
  {
    name: 'Kezia Okafor', credential: 'LPC', team: 'Kay Team 1', county: 'Kay County',
    caseload: 17, triggeredCount: 16, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-70201', initials: 'PJ', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Aug 25, 2026', lastServiceDate: 'Apr 30, 2026',
        daysRemaining: 6, riskReason: 'No appointment scheduled this month',
        status: 'not-triggered', action: 'Schedule service',
      },
    ],
    triggered: [
      { id: 'CL-70301', initials: 'BW', medicaidStatus: 'Active', treatmentPlanEnd: 'Sep 7, 2026',  lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-70302', initials: 'TA', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 19, 2026', lastServiceDate: 'May 20, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 20' },
      { id: 'CL-70303', initials: 'EC', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 8, 2026',  lastServiceDate: 'May 17, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 17' },
      { id: 'CL-70304', initials: 'KS', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 30, 2026', lastServiceDate: 'May 15, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 15' },
    ],
  },
  // ── Tulsa Team 1 ──────────────────────────────────────────────────────────────
  {
    name: 'Marcus Chen', credential: 'LPC', team: 'Tulsa Team 1', county: 'Tulsa County',
    caseload: 25, triggeredCount: 24, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-42101', initials: 'SD', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Sep 14, 2026', lastServiceDate: 'May 5, 2026',
        daysRemaining: 6, riskReason: 'No appointment scheduled this month',
        status: 'not-triggered', action: 'Schedule service',
      },
    ],
    triggered: [
      { id: 'CL-42201', initials: 'HM', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 20, 2026', lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-42202', initials: 'JO', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 11, 2026', lastServiceDate: 'May 21, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 21' },
      { id: 'CL-42203', initials: 'CP', medicaidStatus: 'Active', treatmentPlanEnd: 'Oct 25, 2026', lastServiceDate: 'May 19, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 19' },
      { id: 'CL-42204', initials: 'WQ', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 3, 2026',  lastServiceDate: 'May 16, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 16' },
      { id: 'CL-42205', initials: 'RU', medicaidStatus: 'Active', treatmentPlanEnd: 'Jun 17, 2026', lastServiceDate: 'May 13, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 13' },
    ],
  },
  {
    name: 'Priya Osei', credential: 'LCSW', team: 'Tulsa Team 1', county: 'Tulsa County',
    caseload: 25, triggeredCount: 24, atRiskCount: 1,
    notTriggered: [
      {
        id: 'CL-42301', initials: 'AF', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Jul 1, 2026', lastServiceDate: 'May 2, 2026',
        daysRemaining: 6, riskReason: 'Treatment plan expires in 7 days',
        status: 'not-triggered', action: 'Open renewal request',
      },
    ],
    triggered: [
      { id: 'CL-42401', initials: 'XN', medicaidStatus: 'Active', treatmentPlanEnd: 'Sep 29, 2026', lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-42402', initials: 'YB', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 7, 2026',  lastServiceDate: 'May 20, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 20' },
      { id: 'CL-42403', initials: 'ZG', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 14, 2026', lastServiceDate: 'May 18, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 18' },
      { id: 'CL-42404', initials: 'OT', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 23, 2026', lastServiceDate: 'May 15, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 15' },
      { id: 'CL-42405', initials: 'IP', medicaidStatus: 'Active', treatmentPlanEnd: 'Dec 20, 2026', lastServiceDate: 'May 12, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 12' },
    ],
  },
  // ── Delaware Team 1 — 2nd clinician ──────────────────────────────────────────
  {
    name: 'Alex Rivera', credential: 'LPC', team: 'Delaware Team 1', county: 'Delaware County',
    caseload: 20, triggeredCount: 14, atRiskCount: 3,
    notTriggered: [
      {
        id: 'CL-30901', initials: 'UV', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Aug 16, 2026', lastServiceDate: 'Apr 20, 2026',
        daysRemaining: 6, riskReason: 'No service in 18 days — client unreachable',
        status: 'not-triggered', action: 'Assign care navigator',
      },
      {
        id: 'CL-30902', initials: 'WX', medicaidStatus: 'At Risk',
        treatmentPlanEnd: 'Jun 5, 2026', lastServiceDate: 'May 3, 2026',
        daysRemaining: 6, riskReason: 'Payer change pending — PA under review',
        status: 'not-triggered', action: 'Check PA status',
      },
      {
        id: 'CL-30903', initials: 'YZ', medicaidStatus: 'Active',
        treatmentPlanEnd: 'Oct 12, 2026', lastServiceDate: 'Apr 9, 2026',
        daysRemaining: 6, riskReason: 'No appointment scheduled this month',
        status: 'not-triggered', action: 'Schedule service',
      },
    ],
    triggered: [
      { id: 'CL-30911', initials: 'AB', medicaidStatus: 'Active', treatmentPlanEnd: 'Sep 2, 2026',  lastServiceDate: 'May 22, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 22' },
      { id: 'CL-30912', initials: 'CD', medicaidStatus: 'Active', treatmentPlanEnd: 'Jul 17, 2026', lastServiceDate: 'May 21, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 21' },
      { id: 'CL-30913', initials: 'EF', medicaidStatus: 'Active', treatmentPlanEnd: 'Nov 28, 2026', lastServiceDate: 'May 19, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 19' },
      { id: 'CL-30914', initials: 'GH', medicaidStatus: 'Active', treatmentPlanEnd: 'Aug 13, 2026', lastServiceDate: 'May 16, 2026', daysRemaining: 0, riskReason: '', status: 'triggered', triggeredDate: 'May 16' },
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
  critical?: boolean;
  time: string;
  cta?: string;
}

const REAL_TIME_ALERTS: AlertItem[] = [
  {
    icon: '⚡', critical: true,
    title: 'Medicaid loss: CL-10238',
    desc: 'Coverage lapsed May 18 — OHCA verified, DMH enrollment initiated, ODIPSA retro-date request sent. 8-day window remaining.',
    status: 'Running', statusType: 'running', time: '13:41',
  },
  {
    icon: '⚡', critical: true,
    title: 'Medicaid loss: CL-11402',
    desc: 'Coverage lapsed May 19 — OHCA verified, DMH enrollment in progress. 12-day window remaining.',
    status: 'Running', statusType: 'running', time: '13:09',
  },
  {
    icon: '⚡', critical: true,
    title: 'Month-end risk: 6 untriggered clients',
    desc: '6 clients still untriggered with 6 days remaining — targeted chase emails sent to 4 clinicians',
    status: 'Running', statusType: 'running', time: '12:10',
  },
  {
    icon: '↻',
    title: 'Treatment plan renewal: CL-11819',
    desc: 'Renewal request routed to Morgan Reyes — signature pending',
    status: 'Awaiting signature', statusType: 'running', time: '12:58',
  },
  {
    icon: '🔍',
    title: 'Duplicate enrollment: CL-30612',
    desc: 'Client active in both Delaware Team 1 and Pawnee Team 1 — flagged for TSS review',
    status: 'Needs review', statusType: 'running', time: '12:33',
  },
  {
    icon: '↻',
    title: 'Wrong payer detected: CL-10774',
    desc: 'Auto-routed to SDP Jamie Lin — CCBHC service scheduled for May 28',
    status: 'Scheduled', statusType: 'done', time: '11:45',
  },
  {
    icon: '📄',
    title: 'PA expiring in 48h: CL-11042',
    desc: 'SoonerCare prior auth renewal auto-submitted to Medicaid portal',
    status: 'Submitted', statusType: 'done', time: '11:20',
  },
  {
    icon: '✉',
    title: 'Day-10 chase batch sent',
    desc: '23 clinicians notified — 31 clients still untriggered with 6 days remaining',
    status: 'Delivered', statusType: 'done', time: '10:30',
  },
  {
    icon: '📋',
    title: 'Caseload audit: Delaware Team 1',
    desc: '3 gaps flagged: 1 missing SSN, 1 wrong program assignment, 1 episode missing team member — findings emailed to ITM Sam Whitcomb',
    status: 'Sent', statusType: 'done', time: '10:07',
  },
  {
    icon: '📄',
    title: 'ECHO form auto-filed: Pawnee Team 2',
    desc: '5 payer echo entries auto-filed to SoonerCare portal — 2.5 hrs of manual entry saved',
    status: 'Filed', statusType: 'done', time: '09:15',
  },
];

const ACTIVITY_FEED: ActivityItem[] = [
  { time: '08:14', text: 'Sent 23 chase emails to clinicians on day-10 triggering reminder',         type: 'email'       },
  { time: '09:32', text: 'Detected Medicaid loss for CL-11402 — initiated retro-eligibility flow',  type: 'eligibility' },
  { time: '10:07', text: 'Caseload audit completed for Delaware Team 1 — 3 findings emailed to ITM', type: 'audit'       },
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

// Ordered list of unique teams (preserving TEAM_ROWS order for consistency)
const TEAM_ORDER = TEAM_ROWS.map(r => r.team);

function CaseloadView({ onClientClick, routedClients }: { onClientClick: (id: string) => void; routedClients: Set<string> }) {
  const [triggeredPage, setTriggeredPage] = useState(0);
  const TRIGGERED_PAGE_SIZE = 8;
  const [selectedTeam, setSelectedTeam] = useState(TEAM_ORDER[0]);

  // All clinicians in the selected team
  const teamClinicians = CLINICIANS.filter(c => c.team === selectedTeam);

  // Filter out clients that have been actioned
  const teamCliniciansFiltered = teamClinicians.map(c => ({
    ...c,
    notTriggered: c.notTriggered.filter(cl => !routedClients.has(cl.id)),
  }));

  // Aggregate KPIs
  const totalCaseload    = teamClinicians.reduce((s, c) => s + c.caseload, 0);
  const totalTriggered   = teamClinicians.reduce((s, c) => s + c.triggeredCount, 0);
  const totalAtRisk      = teamClinicians.reduce((s, c) => s + c.atRiskCount, 0);
  const totalNotTriggered = teamCliniciansFiltered.reduce((s, c) => s + c.notTriggered.length, 0);
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
              {TEAM_ORDER.map(team => (
                <option key={team} value={team}>{team}</option>
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
          <KpiCard label="Team caseload"        value={`${totalCaseload} clients`} sub={`${teamClinicians.length} providers`} />
          <KpiCard label="Triggered this month" value={`${triggerPct}%`} sub={`${totalTriggered} of ${totalCaseload} clients · target 98%`} />
          <KpiCard label="Days remaining"       value="6 days"   sub="Month ends May 31" />
          <KpiCard label="Not triggered"         value={`${totalNotTriggered} clients`} sub="Require action" />
        </div>


        {/* Not yet triggered */}
        <div className="ccbhc-section">
          <div className="ccbhc-section__title-row">
            <span className="ccbhc-section__title ccbhc-section__title--alert">Not yet triggered</span>
            <span className="ccbhc-section__count ccbhc-section__count--alert">{totalNotTriggered}</span>
          </div>
          <div className="ccbhc-card">
            <div className="ccbhc-table-wrap">
              <table className="ccbhc-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Client</th>
                    <th>Primary reason</th>
                    <th>Last service</th>
                    <th>Plan ends</th>
                  </tr>
                </thead>
                <tbody>
                  {teamCliniciansFiltered.flatMap(clinician =>
                    clinician.notTriggered.map((client, i) => (
                      <tr key={client.id} style={{ cursor: 'pointer' }} onClick={() => onClientClick(client.id)}>
                        <td>
                          {i === 0 && (
                            <><span className="ccbhc-table__team">{clinician.name}</span><br /><span className="ccbhc-provider-cred">{clinician.credential}</span></>
                          )}
                        </td>
                        <td className="ccbhc-table__id">{client.id}</td>
                        <td className={`ccbhc-table__risk ${
                          client.alert === 'medicaid-loss' ? 'ccbhc-risk--critical' :
                          client.alert === 'wrong-payer' || client.riskReason.toLowerCase().includes('expired') ? 'ccbhc-risk--high' :
                          ''
                        }`}>{client.riskReason}</td>
                        <td>{client.lastServiceDate}</td>
                        <td>{client.treatmentPlanEnd}</td>
                      </tr>
                    ))
                  )}
                  {totalNotTriggered === 0 && (
                    <tr><td colSpan={5} style={{ padding: '16px', color: '#4b5563' }}>All clients triggered — great work!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Triggered */}
        {(() => {
          const allTriggered = teamClinicians.flatMap(clinician =>
            clinician.triggered.map((client, i) => ({ client, clinician, isFirstForClinician: i === 0 }))
          );
          const totalPages = Math.ceil(allTriggered.length / TRIGGERED_PAGE_SIZE);
          const pageRows = allTriggered.slice(triggeredPage * TRIGGERED_PAGE_SIZE, (triggeredPage + 1) * TRIGGERED_PAGE_SIZE);
          return (
            <div className="ccbhc-section">
              <div className="ccbhc-section__title-row">
                <span className="ccbhc-section__title">Triggered</span>
                <span className="ccbhc-section__count ccbhc-section__count--done">{totalTriggered}</span>
              </div>
              <div className="ccbhc-card">
                <div className="ccbhc-table-wrap">
                  <table className="ccbhc-table">
                    <thead>
                      <tr>
                        <th>Provider</th>
                        <th>Client</th>
                        <th>Triggered on</th>
                        <th>Plan ends</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map(({ client, clinician, isFirstForClinician }) => (
                        <tr key={client.id}>
                          <td>
                            {isFirstForClinician && (
                              <><span className="ccbhc-table__team">{clinician.name}</span><br /><span className="ccbhc-provider-cred">{clinician.credential}</span></>
                            )}
                          </td>
                          <td className="ccbhc-table__id">{client.id}</td>
                          <td>{client.triggeredDate}</td>
                          <td>{client.treatmentPlanEnd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="ccbhc-pagination">
                    <button
                      className="ccbhc-pagination__btn"
                      onClick={() => setTriggeredPage(p => p - 1)}
                      disabled={triggeredPage === 0}
                    >← Prev</button>
                    <span className="ccbhc-pagination__info">
                      {triggeredPage + 1} of {totalPages} &nbsp;·&nbsp; {allTriggered.length} clients
                    </span>
                    <button
                      className="ccbhc-pagination__btn"
                      onClick={() => setTriggeredPage(p => p + 1)}
                      disabled={triggeredPage === totalPages - 1}
                    >Next →</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

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

type DetailType = 'triage' | 'care-navigator' | 'treatment-plan-renewal' | 'pa-status' | 'pa-appeal' | 'schedule-service' | 'duplicate-enrollment';

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

  return (
    <div className="ccbhc-layout">
      <div className="ccbhc-main">
        {/* Metric cards */}
        <div className="ccbhc-org-metrics">
          <div className="ccbhc-org-metric-card">
            <div className="ccbhc-org-metric-card__label">Org trigger rate — May 2026</div>
            <div className="ccbhc-org-metric-card__value">94.2%</div>
            <div className="ccbhc-org-metric-card__meta"><span className="ccbhc-trend--positive">↑ +1.8% vs last month</span> · target 98%</div>
          </div>

          <div className="ccbhc-org-metric-card">
            <div className="ccbhc-org-metric-card__label">Revenue at risk</div>
            <div className="ccbhc-org-metric-card__value">47 clients</div>
            <div className="ccbhc-org-metric-card__meta">Not yet triggered · <span className="ccbhc-trend--negative">6 days remaining</span></div>
          </div>

          <div className="ccbhc-org-metric-card">
            <div className="ccbhc-org-metric-card__label">Retro-eligibility recoveries</div>
            <div className="ccbhc-org-metric-card__value">12 clients</div>
            <div className="ccbhc-org-metric-card__meta">Recovered this month · <span className="ccbhc-trend--positive">+3 vs April</span></div>
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
                  <SortTh label="Not triggered" colKey="atRisk"       active={teamSort.col === 'atRisk'}       dir={teamSort.dir} onSort={teamSort.toggle} />
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
                      <span className={row.atRisk >= 5 ? 'ccbhc-pct ccbhc-pct--red' : 'ccbhc-pct'}>{row.atRisk}</span>
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
                  <SortTh label="Client ID"    colKey="id"           active={riskSort.col === 'id'}           dir={riskSort.dir} onSort={riskSort.toggle} />
                  <SortTh label="Team"         colKey="team"         active={riskSort.col === 'team'}         dir={riskSort.dir} onSort={riskSort.toggle} />
                  <SortTh label="Primary reason" colKey="primaryRisk"  active={riskSort.col === 'primaryRisk'}  dir={riskSort.dir} onSort={riskSort.toggle} />
                  <SortTh label="Days left"    colKey="daysRemaining" active={riskSort.col === 'daysRemaining'} dir={riskSort.dir} onSort={riskSort.toggle} />
                </tr>
              </thead>
              <tbody>
                {sortedRisk.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onClientClick(c.id, ORG_CLIENT_CLINICIAN[c.id] ?? CLINICIANS[0].name)}>
                    <td className="ccbhc-table__id">{c.id}</td>
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
            <div key={i} className={`ccbhc-alert${a.critical ? ' ccbhc-alert--critical' : ''}`}>
              <div className="ccbhc-alert__icon">{a.icon}</div>
              <div className="ccbhc-alert__body">
                <div className="ccbhc-alert__header-row">
                  <div className={`ccbhc-alert__title${a.critical ? ' ccbhc-alert__title--critical' : ''}`}>{a.title}</div>
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
        <div className="ccbhc-summary-stat ccbhc-summary-stat--highlight">
          <span className="ccbhc-summary-stat__label">TSS work days saved</span>
          <span className="ccbhc-summary-stat__value"><span className="ccbhc-summary-stat__arrow">↑</span> 711</span>
        </div>
        <div className="ccbhc-summary-stat"><span className="ccbhc-summary-stat__label">Chase emails sent</span><span className="ccbhc-summary-stat__value"><span className="ccbhc-summary-stat__arrow">↑</span> 1,504</span></div>
        <div className="ccbhc-summary-stat"><span className="ccbhc-summary-stat__label">Eligibility checks run</span><span className="ccbhc-summary-stat__value"><span className="ccbhc-summary-stat__arrow">↑</span> 362</span></div>
        <div className="ccbhc-summary-stat"><span className="ccbhc-summary-stat__label">Exceptions auto-triaged</span><span className="ccbhc-summary-stat__value"><span className="ccbhc-summary-stat__arrow">↑</span> 24</span></div>
      </aside>
    </div>
  );
}

// ─── Screen 3 — Client Triage Detail ─────────────────────────────────────────

function TriageDetail({ clientId, clinicianName, onBack, onRouted }: { clientId: string; clinicianName: string; onBack: () => void; onRouted?: (id: string) => void }) {
  const [approved, setApproved] = useState(false);
  const [modifying, setModifying] = useState(false);

  // Find client across all clinicians
  const client = CLINICIANS.flatMap(c => c.notTriggered).find(c => c.id === clientId) ?? CLINICIANS[0].notTriggered[0];
  const isWrongPayer = client.alert === 'wrong-payer';
  const isMedicaidLoss = client.alert === 'medicaid-loss';

  const defaultRec = isWrongPayer ? 'Route to SDP (Jamie Lin) to schedule a CCBHC-triggering service this week'
    : isMedicaidLoss ? 'Initiate retro-eligibility recovery via Care Navigator (Riley Okafor)'
    : 'Notify Morgan Reyes to schedule a Medicaid-billed service before May 31';
  const [modifiedRec, setModifiedRec] = useState(defaultRec);

  return (
    <div className="ccbhc-triage">
      {/* Breadcrumb with back button */}
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>CCBHC Tracking</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>{clinicianName}</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <span className="ccbhc-breadcrumb__current">{clientId}</span>
      </div>

      {/* Client header card */}
      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">
              {clientId} — {isWrongPayer ? 'Wrong payer billed — CCBHC triggering service needed' : isMedicaidLoss ? 'Medicaid loss — retro-eligibility window open' : 'No triggering service scheduled this month'}
            </span>
            {isMedicaidLoss ? (
              <div className="ccbhc-retro-badge ccbhc-retro-badge--large">
                ⚡ Medicaid lost May 12 · Retro window: <strong>{client.retroWindow} days remaining</strong>
              </div>
            ) : (
              <MedicaidPill status={client.medicaidStatus} />
            )}
          </div>
          <div className="ccbhc-client-header__meta">
            Age 34 · Tulsa County · {isMedicaidLoss ? 'Medicaid Lost May 12' : 'Active Medicaid'}
          </div>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="ccbhc-triage-cols">

        {/* Left — Client context */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Client context</div>

          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Insurance status</div>
            {isMedicaidLoss ? (
              <div className="ccbhc-insurance-timeline">
                <div className="ccbhc-insurance-timeline__item ccbhc-insurance-timeline__item--past">Active through May 11</div>
                <div className="ccbhc-insurance-timeline__item ccbhc-insurance-timeline__item--event">May 12 — Coverage lapsed</div>
                <div className="ccbhc-insurance-timeline__item ccbhc-insurance-timeline__item--window">Retro window closes May 31</div>
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
            <span className="ccbhc-confidence-pill">High confidence</span>
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
                <div className="ccbhc-recommendation-card__label">
                  {modifying ? 'Modify action' : 'Recommended action'}
                </div>
                {modifying ? (
                  <div className="ccbhc-modify-block">
                    <textarea
                      className="ccbhc-modify-textarea"
                      value={modifiedRec}
                      onChange={e => setModifiedRec(e.target.value)}
                      rows={3}
                    />
                    <div className="ccbhc-alt-chips__label">Or choose one of the other suggested options</div>
                    <div className="ccbhc-alt-chips">
                      {[
                        isWrongPayer ? 'Notify Morgan Reyes to re-bill under Medicaid' : 'Schedule emergency visit this week',
                        'Mark as exception — exclude from PPS count',
                        'Escalate to ITM for manual review',
                      ].map(opt => (
                        <button key={opt} className={`ccbhc-alt-chip${modifiedRec === opt ? ' ccbhc-alt-chip--selected' : ''}`} onClick={() => setModifiedRec(opt)}>{opt}</button>
                      ))}
                    </div>
                    <div className="ccbhc-recommendation-card__actions">
                      <button className="ccbhc-primary-btn" onClick={() => { setModifying(false); setApproved(true); onRouted?.(clientId); }}>Save and route</button>
                      <button className="ccbhc-secondary-btn" onClick={() => setModifying(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="ccbhc-recommendation-card__action-row">
                      <span className="ccbhc-recommendation-card__action">{modifiedRec}</span>
                      <button className="ccbhc-edit-icon-btn" onClick={() => setModifying(true)} title="Modify recommendation">
        <svg width="15" height="15" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#pencil-clip)">
            <path fillRule="evenodd" clipRule="evenodd" d="M12.3607 1.5884C12.8979 1.05133 13.6264 0.749661 14.3861 0.749756C15.1457 0.749851 15.8742 1.0517 16.4112 1.5889C16.9483 2.1261 17.25 2.85465 17.2499 3.61428C17.2498 4.37385 16.948 5.10228 16.4108 5.63933L6.40057 15.6511L6.39969 15.652C6.13889 15.9119 5.81826 16.1039 5.46594 16.2111L2.20059 17.2013C2.00435 17.2603 1.79766 17.265 1.60071 17.2155C1.40375 17.166 1.22387 17.064 1.08014 16.9206C0.936422 16.7771 0.834225 16.5973 0.784392 16.4005C0.73456 16.2036 0.738952 15.9969 0.797103 15.8023L1.7894 12.5332C1.89744 12.1808 2.09038 11.8604 2.35125 11.6001L12.3607 1.5884ZM13.4212 2.64919L3.41184 12.6608C3.32415 12.7483 3.25986 12.8548 3.22377 12.972L2.43763 15.5619L5.02946 14.776C5.14675 14.7403 5.25351 14.6764 5.34039 14.5899L15.3502 4.57864C15.606 4.32285 15.7498 3.97589 15.7499 3.61409C15.7499 3.25229 15.6062 2.90529 15.3504 2.64943C15.0946 2.39357 14.7477 2.2498 14.3859 2.24976C14.0241 2.24971 13.6771 2.39339 13.4212 2.64919Z" fill="currentColor"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M10.7197 3.21967C11.0126 2.92678 11.4874 2.92678 11.7803 3.21967L14.7803 6.21967C15.0732 6.51256 15.0732 6.98744 14.7803 7.28033C14.4874 7.57322 14.0126 7.57322 13.7197 7.28033L10.7197 4.28033C10.4268 3.98744 10.4268 3.51256 10.7197 3.21967Z" fill="currentColor"/>
          </g>
          <defs><clipPath id="pencil-clip"><rect width="18" height="18" fill="white"/></clipPath></defs>
        </svg>
      </button>
                    </div>
                    <details className="ccbhc-why-preferred">
                      <summary>Why this recommendation was preferred</summary>
                      <p>
                        {isWrongPayer
                          ? 'Routing to the SDP for a same-week service is the fastest path to a Medicaid-billed triggering service within the remaining billing window. The client has no scheduling barriers and the SDP has availability.'
                          : 'Retro-eligibility recovery has a documented 82% success rate for clients with this coverage history. The 8-day window is sufficient if initiated today.'}
                      </p>
                    </details>
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
                <div className="ccbhc-approved-state__avatar">
                  {isWrongPayer ? 'JL' : 'RO'}
                </div>
                <div>
                  <div className="ccbhc-approved-state__assignee-name">
                    {isWrongPayer ? 'Jamie Lin' : 'Riley Okafor'}
                  </div>
                  <div className="ccbhc-approved-state__assignee-role">
                    {isWrongPayer ? 'SDP — notified via task queue' : 'Care Navigator — assigned workflow'}
                  </div>
                </div>
                <button className="ccbhc-approved-state__undo" onClick={() => setApproved(false)}>Undo routing</button>
              </div>
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

        </div>
      </div>
    </div>
  );
}

// ─── Care Navigator Detail ────────────────────────────────────────────────────

function CareNavigatorDetail({ clientId, clinicianName, onBack }: { clientId: string; clinicianName: string; onBack: () => void }) {
  const [selected, setSelected] = useState<'riley' | 'jordan'>('riley');
  const [done, setDone] = useState(false);

  return (
    <div className="ccbhc-triage">
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>CCBHC Tracking</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>{clinicianName}</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <span className="ccbhc-breadcrumb__current">{clientId}</span>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">{clientId} — Client unreachable — care navigator assignment needed</span>
            <MedicaidPill status="Active" />
          </div>
          <div className="ccbhc-client-header__meta">Age 29 · Delaware County · Active Medicaid</div>
        </div>
      </div>

      <div className="ccbhc-triage-cols">
        {/* Left */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Client context</div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Insurance</div>
            <div className="ccbhc-detail-value">Active Medicaid through Dec 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Assigned team</div>
            <div className="ccbhc-team-list">
              {[
                { name: 'Sam Whitcomb', role: 'BHC' },
                { name: 'Morgan Reyes', role: 'LCSW, Therapist' },
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
            <div className="ccbhc-detail-value">May 3, 2026 (individual therapy)</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Recent outreach</div>
            <div className="ccbhc-activity-timeline">
              {[
                { date: 'May 14', text: 'Phone call — no answer' },
                { date: 'May 18', text: 'Voicemail left' },
                { date: 'May 22', text: 'Text sent — no reply' },
              ].map((item, i) => (
                <div key={i} className="ccbhc-activity-item">
                  <div className="ccbhc-activity-item__dot ccbhc-activity-item__dot--faded" />
                  <div>
                    <div className="ccbhc-activity-item__date">{item.date}</div>
                    <div className="ccbhc-activity-item__text">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="ccbhc-triage-col ccbhc-triage-col--center">
          <div className="ccbhc-triage-section-title">
            <span className="ccbhc-ai-icon">✦</span> Eleos analysis
            <span className="ccbhc-confidence-pill">High confidence</span>
          </div>
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
                    { key: 'riley' as const, name: 'Riley Okafor', meta: 'Tulsa Team 4 · 3 active assignments' },
                    { key: 'jordan' as const, name: 'Jordan Wells', meta: 'Tulsa Team 3 · 5 active assignments' },
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
          <div className="ccbhc-triage-section-title">Other options</div>
          <div className="ccbhc-alt-card">
            <div className="ccbhc-alt-card__title">Escalate to ITM Sam Whitcomb for manual outreach</div>
          </div>
          <div className="ccbhc-alt-card">
            <div className="ccbhc-alt-card__title">Mark as attempted — document in record</div>
          </div>
          <details className="ccbhc-why-preferred">
            <summary>Why this recommendation was preferred</summary>
            <p>A care navigator assignment is the fastest path to re-engagement. Riley Okafor has availability and the fewest active assignments on the team.</p>
          </details>
        </div>
      </div>
    </div>
  );
}

// ─── Treatment Plan Renewal Detail ───────────────────────────────────────────

function TreatmentPlanRenewalDetail({ clientId, clinicianName, onBack }: { clientId: string; clinicianName: string; onBack: () => void }) {
  const [done, setDone] = useState(false);
  const [showFull, setShowFull] = useState(false);

  return (
    <div className="ccbhc-triage">
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>CCBHC Tracking</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>{clinicianName}</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <span className="ccbhc-breadcrumb__current">{clientId}</span>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">{clientId} — Treatment plan renewal pending clinician signature</span>
            <MedicaidPill status="Active" />
          </div>
          <div className="ccbhc-client-header__meta">Delaware County · Active Medicaid</div>
        </div>
      </div>

      <div className="ccbhc-triage-cols">
        {/* Left */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Client context</div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Insurance</div>
            <div className="ccbhc-detail-value">Active Medicaid through Oct 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Assigned</div>
            <div className="ccbhc-detail-value">Morgan Reyes (LCSW, Team 4 Tulsa)</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Plan expired</div>
            <div className="ccbhc-detail-value">May 1, 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Status</div>
            <div className="ccbhc-detail-value">Renewal drafted by Eleos — pending signature from Morgan Reyes</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Recent activity</div>
            <div className="ccbhc-activity-timeline">
              {[
                { date: 'May 1', text: 'Treatment plan expired' },
                { date: 'May 2', text: 'Renewal auto-drafted by Eleos' },
                { date: 'May 2', text: 'Signature request sent to Morgan Reyes' },
              ].map((item, i) => (
                <div key={i} className="ccbhc-activity-item">
                  <div className={`ccbhc-activity-item__dot${i > 0 ? ' ccbhc-activity-item__dot--faded' : ''}`} />
                  <div>
                    <div className="ccbhc-activity-item__date">{item.date}</div>
                    <div className="ccbhc-activity-item__text">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="ccbhc-triage-col ccbhc-triage-col--center">
          <div className="ccbhc-triage-section-title">
            <span className="ccbhc-ai-icon">✦</span> Renewal document
          </div>
          <div className="ccbhc-doc-card">
            <div className="ccbhc-doc-card__title">Treatment Plan Renewal — {clientId}</div>
            {[
              { label: 'Client', value: `${clientId} (JS)` },
              { label: 'Clinician', value: 'Morgan Reyes, LCSW' },
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
              <div className="ccbhc-doc-field"><span className="ccbhc-doc-field__label">Billing auth</span><span className="ccbhc-doc-field__value">SoonerCare — no PA required for individual therapy</span></div>
            </div>
          )}
          {!done ? (
            <div className="ccbhc-recommendation-card__actions" style={{ marginTop: 4 }}>
              <button className="ccbhc-primary-btn" onClick={() => setDone(true)}>Send reminder to Morgan Reyes</button>
              <button className="ccbhc-secondary-btn" onClick={() => setShowFull(s => !s)}>
                {showFull ? 'Collapse plan' : 'View full plan'}
              </button>
            </div>
          ) : (
            <div className="ccbhc-approved-state">
              <div className="ccbhc-approved-state__icon">✓</div>
              <div className="ccbhc-approved-state__title">Reminder sent</div>
              <div className="ccbhc-approved-state__desc">Morgan Reyes has been notified to sign the renewal.</div>
              <button className="ccbhc-secondary-btn" onClick={() => setDone(false)}>Undo</button>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="ccbhc-triage-col ccbhc-triage-col--right">
          <div className="ccbhc-triage-section-title">Workflow steps</div>
          <div className="ccbhc-steps">
            {[
              { label: 'Plan expiry detected', done: true },
              { label: 'Renewal auto-drafted', done: true },
              { label: 'Sent to Morgan Reyes for signature', done: true },
              { label: 'Clinician signs (pending)', done: false },
              { label: 'Plan activated in EHR', done: false },
              { label: 'CCBHC service scheduled', done: false },
            ].map((step, i) => (
              <div key={i} className={`ccbhc-step ${step.done ? 'ccbhc-step--done' : 'ccbhc-step--pending'}`}>
                <span className="ccbhc-step__icon">{step.done ? '✓' : '○'}</span>
                <span>{step.label}</span>
              </div>
            ))}
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

  return (
    <div className="ccbhc-triage">
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>CCBHC Tracking</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>{clinicianName}</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <span className="ccbhc-breadcrumb__current">{clientId}</span>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">{clientId} — Prior authorization pending — day 14 of 15</span>
            <MedicaidPill status="At Risk" />
          </div>
          <div className="ccbhc-client-header__meta">Pawnee County · Active Medicaid (SoonerCare)</div>
        </div>
      </div>

      <div className="ccbhc-triage-cols">
        {/* Left */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Client context</div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Insurance</div>
            <div className="ccbhc-detail-value">Active Medicaid (SoonerCare) through Aug 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Assigned</div>
            <div className="ccbhc-detail-value">Avery Patel (LPC, Pawnee Team 1)</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Service blocked</div>
            <div className="ccbhc-detail-value">Intensive Outpatient Program (IOP)</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">PA submitted</div>
            <div className="ccbhc-detail-value">May 11, 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Recent activity</div>
            <div className="ccbhc-activity-timeline">
              {[
                { date: 'May 11', text: 'PA submitted' },
                { date: 'May 15', text: 'Under review (SoonerCare portal)' },
                { date: 'May 22', text: 'No decision yet (day 11 of 15-day window)' },
              ].map((item, i) => (
                <div key={i} className="ccbhc-activity-item">
                  <div className={`ccbhc-activity-item__dot${i > 0 ? ' ccbhc-activity-item__dot--faded' : ''}`} />
                  <div>
                    <div className="ccbhc-activity-item__date">{item.date}</div>
                    <div className="ccbhc-activity-item__text">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="ccbhc-triage-col ccbhc-triage-col--center">
          <div className="ccbhc-triage-section-title">
            <span className="ccbhc-ai-icon">✦</span> PA status tracker
          </div>
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
            SoonerCare standard review window is 15 business days. Day 14 of 15 — decision expected tomorrow.
          </div>
          <div className="ccbhc-escalation-card">
            <div className="ccbhc-escalation-card__title">Escalation recommended</div>
            <div className="ccbhc-escalation-card__text">If no decision by May 27, Eleos will auto-submit an expedite request to SoonerCare.</div>
          </div>
          {!done ? (
            <>
              <div className="ccbhc-recommendation-card__actions">
                <button className="ccbhc-primary-btn" onClick={() => setDone(true)}>Request expedited review now</button>
                <button className="ccbhc-secondary-btn" onClick={() => setShowContact(s => !s)}>
                  {showContact ? 'Hide contact info' : 'Contact SoonerCare provider line'}
                </button>
              </div>
              {showContact && (
                <div className="ccbhc-meta-stat" style={{ marginTop: 10 }}>
                  <div className="ccbhc-meta-stat__label">SoonerCare Provider Services</div>
                  <div className="ccbhc-meta-stat__value">1-800-522-0114</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Mon–Fri 8 AM–5 PM CT · Reference PA-2026-10441</div>
                </div>
              )}
            </>
          ) : (
            <div className="ccbhc-approved-state">
              <div className="ccbhc-approved-state__icon">✓</div>
              <div className="ccbhc-approved-state__title">Request submitted</div>
              <div className="ccbhc-approved-state__desc">Expedite request submitted to SoonerCare portal.</div>
              <button className="ccbhc-secondary-btn" onClick={() => setDone(false)}>Undo</button>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="ccbhc-triage-col ccbhc-triage-col--right">
          <div className="ccbhc-triage-section-title">PA details</div>
          <div className="ccbhc-meta-stat">
            <div className="ccbhc-meta-stat__label">Expected decision</div>
            <div className="ccbhc-meta-stat__value">May 26</div>
          </div>
          <div className="ccbhc-meta-stat">
            <div className="ccbhc-meta-stat__label">Auto-escalation scheduled</div>
            <div className="ccbhc-meta-stat__value">May 27</div>
          </div>
          <div className="ccbhc-meta-stat">
            <div className="ccbhc-meta-stat__label">PA reference number</div>
            <div className="ccbhc-meta-stat__value">PA-2026-10441</div>
          </div>
          <div className="ccbhc-meta-stat">
            <div className="ccbhc-meta-stat__label">Payer contact</div>
            <div className="ccbhc-meta-stat__value" style={{ fontSize: 11, fontWeight: 500 }}>SoonerCare Provider Line{'\n'}1-800-522-0114</div>
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
  const defaultAppeal = `Client has CCBHC-qualifying diagnosis (F20.9 — Schizophrenia). Day services were delivered per documented treatment plan. Clinical necessity supported by treating clinician notes from May 6. SoonerCare policy §3.4.2 supports appeal for this service type.`;
  const [appealText, setAppealText] = useState(defaultAppeal);

  return (
    <div className="ccbhc-triage">
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>CCBHC Tracking</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>{clinicianName}</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <span className="ccbhc-breadcrumb__current">{clientId}</span>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">{clientId} — Appeal pending TSS review</span>
            <MedicaidPill status="At Risk" />
          </div>
          <div className="ccbhc-client-header__meta">Pawnee County · Active Medicaid (SoonerCare)</div>
        </div>
      </div>

      <div className="ccbhc-triage-cols">
        {/* Left */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Client context</div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Insurance</div>
            <div className="ccbhc-detail-value">Active Medicaid (SoonerCare) through Nov 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Assigned</div>
            <div className="ccbhc-detail-value">Avery Patel (LPC, Pawnee Team 2)</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Denied service</div>
            <div className="ccbhc-detail-value">CCBHC Day Service — May billing</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Denial date</div>
            <div className="ccbhc-detail-value">May 20, 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Denial reason</div>
            <div className="ccbhc-detail-value">Service not medically necessary per clinical guidelines</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Recent activity</div>
            <div className="ccbhc-activity-timeline">
              {[
                { date: 'May billing', text: 'Submitted' },
                { date: 'May 20', text: 'Denial received' },
                { date: 'May 21', text: 'Eleos auto-drafted appeal' },
              ].map((item, i) => (
                <div key={i} className="ccbhc-activity-item">
                  <div className={`ccbhc-activity-item__dot${i < 2 ? ' ccbhc-activity-item__dot--faded' : ''}`} />
                  <div>
                    <div className="ccbhc-activity-item__date">{item.date}</div>
                    <div className="ccbhc-activity-item__text">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="ccbhc-triage-col ccbhc-triage-col--center">
          <div className="ccbhc-triage-section-title">
            <span className="ccbhc-ai-icon">✦</span> Eleos analysis
            <span className="ccbhc-confidence-pill">High confidence</span>
          </div>
          <div className="ccbhc-diagnosis-card">
            <div className="ccbhc-diagnosis-card__title" style={{ fontSize: 12 }}>Denial summary</div>
            <div className="ccbhc-detail-value" style={{ fontSize: 12 }}>
              Denial code: CO-50 · Date: May 20, 2026<br />
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
                    <li>SoonerCare policy §3.4.2 supports appeal for this service type</li>
                  </ul>
                  <div className="ccbhc-recommendation-card__actions" style={{ marginTop: 8 }}>
                    <button className="ccbhc-primary-btn" onClick={() => setDone(true)}>Approve and submit</button>
                    <button className="ccbhc-secondary-btn" onClick={() => setModifying(true)}>Modify draft</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="ccbhc-approved-state">
              <div className="ccbhc-approved-state__icon">✓</div>
              <div className="ccbhc-approved-state__title">Appeal submitted</div>
              <div className="ccbhc-approved-state__desc">Appeal submitted to SoonerCare portal. Reference #APL-2026-3847.</div>
              <button className="ccbhc-secondary-btn" onClick={() => setDone(false)}>Undo</button>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="ccbhc-triage-col ccbhc-triage-col--right">
          <div className="ccbhc-triage-section-title">Appeal metadata</div>
          <div className="ccbhc-meta-stat">
            <div className="ccbhc-meta-stat__label">Deadline</div>
            <div className="ccbhc-meta-stat__value" style={{ fontSize: 11, fontWeight: 500 }}>Must file within 30 days of denial (by Jun 19)</div>
          </div>
          <div className="ccbhc-meta-stat">
            <div className="ccbhc-meta-stat__label">Similar appeals</div>
            <div className="ccbhc-meta-stat__value">74% approval rate</div>
          </div>
          <div className="ccbhc-alt-card" style={{ marginTop: 8 }}>
            <div className="ccbhc-alt-card__title">Request peer-to-peer review with SoonerCare medical director</div>
            <div className="ccbhc-alt-card__reason">Alternative if appeal is denied</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Service Detail ──────────────────────────────────────────────────

function ScheduleServiceDetail({ clientId, clinicianName, onBack }: { clientId: string; clinicianName: string; onBack: () => void }) {
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [done, setDone] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const slots = [
    { label: 'Wed May 27 — 10:00 AM', type: 'Morgan Reyes, individual therapy' },
    { label: 'Thu May 28 — 2:30 PM', type: 'Morgan Reyes, individual therapy' },
    { label: 'Fri May 29 — 9:00 AM', type: 'Group therapy — Tulsa Team 4' },
  ];

  return (
    <div className="ccbhc-triage">
      <div className="ccbhc-breadcrumb">
        <button className="ccbhc-back-btn" onClick={onBack}>← Back</button>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>CCBHC Tracking</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>{clinicianName}</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <span className="ccbhc-breadcrumb__current">{clientId}</span>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">{clientId} — No triggering service this month — 6 days remaining</span>
            <MedicaidPill status="Active" />
          </div>
          <div className="ccbhc-client-header__meta">Tulsa County · Active Medicaid</div>
        </div>
      </div>

      <div className="ccbhc-triage-cols">
        {/* Left */}
        <div className="ccbhc-triage-col ccbhc-triage-col--left">
          <div className="ccbhc-triage-section-title">Client context</div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Insurance</div>
            <div className="ccbhc-detail-value">Active Medicaid through Sep 2026</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Assigned</div>
            <div className="ccbhc-detail-value">Morgan Reyes (LCSW, Tulsa Team 4), SDP Jamie Lin</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Treatment plan</div>
            <div className="ccbhc-detail-value">Expires Jun 8, 2026 (14 days)</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Last service</div>
            <div className="ccbhc-detail-value">May 4, 2026 (individual therapy)</div>
          </div>
          <div className="ccbhc-detail-group">
            <div className="ccbhc-detail-label">Recent activity</div>
            <div className="ccbhc-activity-timeline">
              {[
                { date: 'May 4', text: 'Individual therapy — Medicaid billed' },
                { date: 'May 12', text: 'Appointment cancelled by client' },
                { date: 'May 19', text: 'No-show' },
              ].map((item, i) => (
                <div key={i} className="ccbhc-activity-item">
                  <div className={`ccbhc-activity-item__dot${i > 0 ? ' ccbhc-activity-item__dot--faded' : ''}`} />
                  <div>
                    <div className="ccbhc-activity-item__date">{item.date}</div>
                    <div className="ccbhc-activity-item__text">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="ccbhc-triage-col ccbhc-triage-col--center">
          <div className="ccbhc-triage-section-title">
            <span className="ccbhc-ai-icon">✦</span> Eleos recommendation
            <span className="ccbhc-confidence-pill">High confidence</span>
          </div>
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
                        <div><div className="ccbhc-slot__time">Mon Jun 2 — 3:00 PM</div><div className="ccbhc-slot__type">Group therapy — Tulsa Team 4</div></div>
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
          <div className="ccbhc-triage-section-title">Risk context</div>
          <div className="ccbhc-meta-stat">
            <div className="ccbhc-meta-stat__label">Days remaining this month</div>
            <div className="ccbhc-meta-stat__value">6 days</div>
          </div>
          <div className="ccbhc-escalation-card">
            <div className="ccbhc-escalation-card__title">PPS payment at risk</div>
            <div className="ccbhc-escalation-card__text">This client's May PPS payment will be forfeited if untriggered.</div>
          </div>
          <div className="ccbhc-alt-card">
            <div className="ccbhc-alt-card__title">2 missed appointments this month</div>
            <div className="ccbhc-alt-card__reason">Consider discussing barriers at next contact</div>
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
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>CCBHC Tracking</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <button className="ccbhc-breadcrumb__link" onClick={onBack}>{clinicianName}</button>
        <span className="ccbhc-breadcrumb__sep">›</span>
        <span className="ccbhc-breadcrumb__current">{clientId}</span>
      </div>

      <div className="ccbhc-client-header">
        <div className="ccbhc-client-header__info">
          <div className="ccbhc-client-header__id-row">
            <span className="ccbhc-client-header__id">{clientId} — Duplicate enrollment — billing conflict detected</span>
            <MedicaidPill status="At Risk" />
          </div>
          <div className="ccbhc-client-header__meta">Active in two teams simultaneously</div>
        </div>
      </div>

      {!done ? (
        <>
          <div className="ccbhc-enrollment-cols">
            <div className="ccbhc-enrollment-card ccbhc-enrollment-card--primary">
              <div className="ccbhc-enrollment-card__header">
                Delaware Team 1 record
                <span className="ccbhc-enrollment-card__badge">Primary (recommended)</span>
              </div>
              {[
                { label: 'Enrolled', value: 'Mar 3, 2026' },
                { label: 'Primary clinician', value: 'Sam Whitcomb (BHC)' },
                { label: 'Medicaid ID', value: '123-45-6789' },
                { label: 'Last service', value: 'May 14, 2026' },
                { label: 'Services this month', value: '2' },
                { label: 'County', value: 'Delaware' },
              ].map(f => (
                <div key={f.label} className="ccbhc-enrollment-field">
                  <span className="ccbhc-enrollment-field__label">{f.label}</span>
                  <span className="ccbhc-enrollment-field__value">{f.value}</span>
                </div>
              ))}
            </div>
            <div className="ccbhc-enrollment-card">
              <div className="ccbhc-enrollment-card__header">Pawnee Team 1 record</div>
              {[
                { label: 'Enrolled', value: 'Apr 17, 2026 (more recent)' },
                { label: 'Primary clinician', value: 'Avery Patel (LPC)' },
                { label: 'Medicaid ID', value: '123-45-6789' },
                { label: 'Last service', value: 'May 9, 2026' },
                { label: 'Services this month', value: '1' },
                { label: 'County', value: 'Pawnee' },
              ].map(f => (
                <div key={f.label} className="ccbhc-enrollment-field">
                  <span className="ccbhc-enrollment-field__label">{f.label}</span>
                  <span className="ccbhc-enrollment-field__value">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ccbhc-analysis-strip">
            <div className="ccbhc-analysis-strip__header">✦ Eleos analysis</div>
            <div className="ccbhc-analysis-strip__text">
              Delaware Team 1 record appears to be the primary enrollment. Pawnee record was created Apr 17 — likely a transfer that was not closed out.
            </div>
            <div className="ccbhc-analysis-strip__actions">
              <button className="ccbhc-primary-btn" onClick={() => handleKeep('delaware')}>Keep Delaware Team 1 (recommended)</button>
              <button className="ccbhc-secondary-btn" onClick={() => handleKeep('pawnee')}>Keep Pawnee Team 1</button>
              <button className="ccbhc-secondary-btn" onClick={handleEscalate}>Escalate to ITM</button>
            </div>
          </div>
        </>
      ) : (
        <div className="ccbhc-approved-state">
          <div className="ccbhc-approved-state__icon">✓</div>
          <div className="ccbhc-approved-state__title">Enrollment resolved</div>
          <div className="ccbhc-approved-state__desc">
            {kept === 'delaware'
              ? 'Delaware Team 1 record retained. Pawnee Team 1 enrollment closed. Sam Whitcomb notified.'
              : kept === 'pawnee'
              ? 'Pawnee Team 1 record retained. Delaware Team 1 enrollment closed. Avery Patel notified.'
              : 'Escalated to ITM for manual review. Sam Whitcomb has been notified.'}
          </div>
          <button className="ccbhc-secondary-btn" onClick={() => { setDone(false); setKept(null); }}>Undo</button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type MainView = 'caseload' | 'org';

export default function CCBHCTracker() {
  const [view, setView] = useState<MainView>('org');
  const [selected, setSelected] = useState<SelectedDetail | null>(null);
  const [routedClients, setRoutedClients] = useState<Set<string>>(new Set());

  const handleRouted = (id: string) => setRoutedClients(prev => new Set(prev).add(id));

  const handleClientClick = (id: string, clinicianName: string) => {
    const detailType = ORG_CLIENT_DETAIL_TYPE[id] ?? 'triage';
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
        return <ScheduleServiceDetail clientId={clientId} clinicianName={clinicianName} onBack={handleBack} />;
      case 'duplicate-enrollment':
        return <DuplicateEnrollmentDetail clientId={clientId} clinicianName={clinicianName} onBack={handleBack} />;
      default:
        return <TriageDetail clientId={clientId} clinicianName={clinicianName} onBack={handleBack} onRouted={handleRouted} />;
    }
  };

  return (
    <div className="ccbhc-root">
      <div className="ccbhc-page-header">
        <div className="ccbhc-page-header__left">
          <h1 className="ccbhc-page-title">CCBHC Tracking</h1>
          <span className="ccbhc-page-badge">Grand Mental Health · Oklahoma</span>
        </div>
        <div className="ccbhc-page-header__right" />
      </div>

      {!selected && (
        <div className="ccbhc-tabs">
          <button className={`ccbhc-tab${view === 'org' ? ' ccbhc-tab--active' : ''}`} onClick={() => setView('org')}>Organization view</button>
          <button className={`ccbhc-tab${view === 'caseload' ? ' ccbhc-tab--active' : ''}`} onClick={() => setView('caseload')}>Caseload view</button>
        </div>
      )}

      {selected ? (
        renderDetail()
      ) : view === 'caseload' ? (
        <CaseloadView onClientClick={(id) => handleClientClick(id, CLINICIANS.find(c => c.notTriggered.some(cl => cl.id === id))?.name ?? CLINICIANS[0].name)} routedClients={routedClients} />
      ) : (
        <OrgView onClientClick={handleClientClick} />
      )}
    </div>
  );
}
