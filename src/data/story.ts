/**
 * Story bible — canonical source for every name, number, status, and string
 * shown in the Eleos Agentic Work Platform concept demo.
 *
 * Source: eleos-demo-claude-code-brief.md, "STORY BIBLE" section.
 * No component may hardcode content that belongs here — render from this module.
 *
 * A few fields are marked OPEN QUESTION below: the brief does not specify a
 * value, and no value has been invented to fill the gap. Resolve these before
 * building the screen(s) that depend on them.
 */

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

export type Domain = "Revenue Cycle" | "Compliance" | "Clinical";

export type WorkflowStatus =
  | "Active"
  | "Draft"
  | "Paused"
  | "Needs Attention"
  | "Testing";

export type Priority = "Critical" | "High" | "Medium";

export type OwnerIconType = "person" | "group";

// ---------------------------------------------------------------------------
// Organization & framing
// ---------------------------------------------------------------------------

export interface OrgInfo {
  name: string;
  homeGreetingName: string;
  domainOrgUnits: {
    "Revenue Cycle": string;
    Compliance: string;
    Clinical: string;
  };
  loggedInUser: string;
  loggedInUserRole: string;
  dateShown: string;
  heroCopyPrimary: string;
  heroCopySecondary: string;
  /** Applies to every chart in the demo. Errata #12: PNGs say "Last 9 weeks", W2–W9 — bible wins. */
  chartPeriodLabel: string;
  chartWeekLabels: string[];
}

export const orgInfo: OrgInfo = {
  name: "Riverside",
  homeGreetingName: "Riverside Organization",
  domainOrgUnits: {
    "Revenue Cycle": "Riverside Revenue Cycle",
    Compliance: "Riverside Compliance Ops",
    Clinical: "Riverside Clinical Ops",
  },
  loggedInUser: "Jasmine",
  loggedInUserRole: "platform admin persona",
  dateShown: "Thursday, June 14 2027",
  heroCopyPrimary: "Understand the work, Run the work, Improve the work.",
  heroCopySecondary:
    "One agentic platform turns fragmented signals into managed work",
  chartPeriodLabel: "Last 8 weeks",
  chartWeekLabels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
};

// ---------------------------------------------------------------------------
// Platform metrics (Home + Registry header)
// ---------------------------------------------------------------------------

export interface PlatformMetric {
  label: string;
  value: string;
  caption: string;
}

/**
 * "Active" = deployed = status in {Active, Needs Attention, Testing}.
 * Draft and Paused are not deployed. RCM 3 + Compliance 3 + Clinical 2 = 8.
 */
export const platformMetrics: PlatformMetric[] = [
  {
    label: "Active workflows",
    value: "8",
    caption: "across 3 workspaces",
  },
  {
    label: "Work created today",
    value: "94",
    caption: "61 completed automatically",
  },
  {
    label: "Awaiting people",
    value: "9",
    caption: "human judgment or action",
  },
  {
    label: "Completed on time",
    value: "84%",
    caption: "+7 points this quarter",
  },
];

// ---------------------------------------------------------------------------
// Workflow registry (10 workflows — full canonical set)
// ---------------------------------------------------------------------------

export type WorkflowId =
  | "authorization-exhaustion"
  | "eligibility-continuity"
  | "pre-claim-denial-prevention"
  | "medicaid-redetermination"
  | "denial-triage"
  | "golden-thread-alignment"
  | "safety-plan-required"
  | "documentation-timeliness"
  | "outcome-deterioration"
  | "engagement-dropout-risk";

export interface Workflow {
  id: WorkflowId;
  name: string;
  domain: Domain;
  orgUnit: string;
  status: WorkflowStatus;
  /** Right-column caption in the registry list. */
  caption: string;
}

/**
 * Errata #1 (name spelling), #2 (domain), #3 (org unit), #14 (row count: PNG
 * shows 7, bible is canonical at 10) are already resolved in this table.
 */
export const workflows: Workflow[] = [
  {
    id: "authorization-exhaustion",
    name: "Authorization Exhaustion",
    domain: "Revenue Cycle",
    orgUnit: "Riverside Revenue Cycle",
    status: "Active",
    caption: "3 cases open · updated 2m ago",
  },
  {
    id: "eligibility-continuity",
    name: "Eligibility Continuity",
    domain: "Revenue Cycle",
    orgUnit: "Riverside Revenue Cycle",
    status: "Active",
    caption: "12 cases open · updated 14m ago",
  },
  {
    id: "pre-claim-denial-prevention",
    name: "Pre-Claim Denial Prevention",
    domain: "Revenue Cycle",
    orgUnit: "Riverside Revenue Cycle",
    status: "Active",
    caption: "1 blocked claim in review",
  },
  {
    id: "medicaid-redetermination",
    name: "Medicaid Redetermination",
    domain: "Revenue Cycle",
    orgUnit: "Riverside Revenue Cycle",
    status: "Draft",
    caption: "awaiting review",
  },
  {
    id: "denial-triage",
    name: "Denial Triage",
    domain: "Revenue Cycle",
    orgUnit: "Riverside Revenue Cycle",
    status: "Paused",
    caption: "awaiting payer policy update",
  },
  {
    id: "golden-thread-alignment",
    name: "Golden Thread Alignment",
    domain: "Compliance",
    orgUnit: "Riverside Compliance Ops",
    status: "Active",
    caption: "4 corrections routed today",
  },
  {
    id: "safety-plan-required",
    name: "Safety Plan Required",
    domain: "Compliance",
    orgUnit: "Riverside Compliance Ops",
    status: "Needs Attention",
    caption: "2 policy exceptions flagged",
  },
  {
    id: "documentation-timeliness",
    name: "Documentation Timeliness",
    domain: "Compliance",
    orgUnit: "Riverside Compliance Ops",
    status: "Active",
    caption: "6 reminders sent today",
  },
  {
    id: "outcome-deterioration",
    name: "Outcome Deterioration",
    domain: "Clinical",
    orgUnit: "Riverside Clinical Ops",
    status: "Active",
    caption: "5 work items",
  },
  {
    id: "engagement-dropout-risk",
    name: "Engagement & Dropout Risk",
    domain: "Clinical",
    orgUnit: "Riverside Clinical Ops",
    status: "Testing",
    caption: "30-day backtest running",
  },
];

// ---------------------------------------------------------------------------
// Selected-workflow panel — Authorization Exhaustion (default selection)
// ---------------------------------------------------------------------------

export interface WorkflowAction {
  label: string;
  /** e.g. "only if evidence missing" for "Prompt clinician" */
  conditional?: string;
}

export interface WorkflowDetail {
  workflowId: WorkflowId;
  domainChip: Domain;
  status: WorkflowStatus;
  name: string;
  purpose: string;
  measuredImpact: {
    value: string;
    caption: string;
  };
  trigger: string;
  contextChips: string[];
  /** Numbered list, in order. */
  agentWork: string[];
  actions: WorkflowAction[];
  humanApproval: {
    required: string;
    automatic: string;
  };
  /** Chips with arrows. */
  destinations: string[];
  footerLinkLabel: string;
}

/**
 * Errata #4 (actions), #5 ("~9 auth lapses avoided", not "23") resolved here.
 */
export const authorizationExhaustionDetail: WorkflowDetail = {
  workflowId: "authorization-exhaustion",
  domainChip: "Revenue Cycle",
  status: "Active",
  name: "Authorization Exhaustion",
  purpose:
    "Finds clients running out of authorized units and assembles continued-care evidence",
  measuredImpact: {
    value: "~9 auth lapses avoided",
    caption: "30-day backtest · illustrative",
  },
  trigger: "Daily and after every completed service",
  contextChips: [
    "Authorizations",
    "Schedule",
    "Progress notes",
    "Treatment plans",
    "Payer policy",
  ],
  agentWork: [
    "Calculate remaining units",
    "Project exhaustion date",
    "Check evidence",
    "Route next action",
  ],
  actions: [
    { label: "Create RCM task" },
    { label: "Prepare packet" },
    { label: "Prompt clinician", conditional: "only if evidence missing" },
  ],
  humanApproval: {
    required: "payer submission",
    automatic: "record updates (the clinician's edit is the approval)",
  },
  destinations: ["RCM queue", "Clinician sidebar"],
  footerLinkLabel: "View full workflow →",
};

export const workflowDetails: Record<WorkflowId, WorkflowDetail> = {
  "authorization-exhaustion": authorizationExhaustionDetail,
  "eligibility-continuity": {
    workflowId: "eligibility-continuity",
    domainChip: "Revenue Cycle",
    status: "Active",
    name: "Eligibility Continuity",
    purpose: "Monitors payer eligibility and flags lapses before scheduled services",
    measuredImpact: { value: "~12 claim denials prevented", caption: "30-day backtest · illustrative" },
    trigger: "Nightly and before every scheduled appointment",
    contextChips: ["Eligibility", "Schedule", "Payer policy"],
    agentWork: ["Check current eligibility", "Compare against scheduled services", "Flag expiring coverage", "Route alerts"],
    actions: [{ label: "Create eligibility task" }, { label: "Notify scheduler" }],
    humanApproval: { required: "payer resubmission", automatic: "routine status updates" },
    destinations: ["RCM queue", "Scheduler"],
    footerLinkLabel: "View full workflow →",
  },
  "pre-claim-denial-prevention": {
    workflowId: "pre-claim-denial-prevention",
    domainChip: "Revenue Cycle",
    status: "Active",
    name: "Pre-Claim Denial Prevention",
    purpose: "Reviews claims for likely denial triggers before submission",
    measuredImpact: { value: "~$8K recovered per month", caption: "30-day backtest · illustrative" },
    trigger: "Before each claim submission",
    contextChips: ["Claims", "Payer rules", "Progress notes"],
    agentWork: ["Parse claim data", "Match against payer rules", "Flag high-risk fields", "Suggest corrections"],
    actions: [{ label: "Flag claim for review" }, { label: "Notify biller" }],
    humanApproval: { required: "claim edits", automatic: "low-risk submissions" },
    destinations: ["Billing queue", "RCM dashboard"],
    footerLinkLabel: "View full workflow →",
  },
  "medicaid-redetermination": {
    workflowId: "medicaid-redetermination",
    domainChip: "Revenue Cycle",
    status: "Draft",
    name: "Medicaid Redetermination",
    purpose: "Tracks clients approaching Medicaid redetermination deadlines and coordinates outreach",
    measuredImpact: { value: "Pending activation", caption: "awaiting backtest data" },
    trigger: "Monthly, 60 days before redetermination date",
    contextChips: ["Medicaid", "Client roster", "Schedule"],
    agentWork: ["Identify upcoming redeterminations", "Compile client contact info", "Draft outreach", "Log attempt"],
    actions: [{ label: "Schedule outreach" }, { label: "Create case note" }],
    humanApproval: { required: "all client contact", automatic: "internal logging" },
    destinations: ["Care coordinator queue"],
    footerLinkLabel: "View full workflow →",
  },
  "denial-triage": {
    workflowId: "denial-triage",
    domainChip: "Revenue Cycle",
    status: "Paused",
    name: "Denial Triage",
    purpose: "Categorizes denied claims by root cause and routes to the right team for appeal",
    measuredImpact: { value: "Paused — policy update pending", caption: "" },
    trigger: "On denial receipt",
    contextChips: ["Denials", "Payer policy", "Appeals history"],
    agentWork: ["Parse denial reason", "Categorize by type", "Identify appeal window", "Route to team"],
    actions: [{ label: "Create appeal task" }, { label: "Notify RCM lead" }],
    humanApproval: { required: "all appeals", automatic: "categorization and routing" },
    destinations: ["Appeals queue", "RCM manager"],
    footerLinkLabel: "View full workflow →",
  },
  "golden-thread-alignment": {
    workflowId: "golden-thread-alignment",
    domainChip: "Compliance",
    status: "Active",
    name: "Golden Thread Alignment",
    purpose: "Checks that treatment goals, progress notes, and authorizations form a consistent clinical record",
    measuredImpact: { value: "~4 corrections routed daily", caption: "30-day backtest · illustrative" },
    trigger: "After every progress note submission",
    contextChips: ["Treatment plans", "Progress notes", "Authorizations"],
    agentWork: ["Parse submitted note", "Compare to treatment goals", "Check authorization alignment", "Flag gaps"],
    actions: [{ label: "Route correction to clinician" }, { label: "Log compliance event" }],
    humanApproval: { required: "note amendments", automatic: "compliance logging" },
    destinations: ["Clinician sidebar", "Compliance dashboard"],
    footerLinkLabel: "View full workflow →",
  },
  "safety-plan-required": {
    workflowId: "safety-plan-required",
    domainChip: "Compliance",
    status: "Needs Attention",
    name: "Safety Plan Required",
    purpose: "Detects clients with risk indicators who are missing a current safety plan on file",
    measuredImpact: { value: "2 policy exceptions flagged", caption: "active · needs review" },
    trigger: "Daily and on any risk-flag event",
    contextChips: ["Risk assessments", "Safety plans", "Progress notes"],
    agentWork: ["Scan for risk indicators", "Check safety plan status", "Assess policy exception", "Escalate if needed"],
    actions: [{ label: "Notify clinician" }, { label: "Create compliance task" }],
    humanApproval: { required: "all safety plan creation", automatic: "detection and alerting" },
    destinations: ["Clinician inbox", "Compliance queue"],
    footerLinkLabel: "View full workflow →",
  },
  "documentation-timeliness": {
    workflowId: "documentation-timeliness",
    domainChip: "Compliance",
    status: "Active",
    name: "Documentation Timeliness",
    purpose: "Monitors note completion deadlines and sends escalating reminders to clinicians",
    measuredImpact: { value: "~6 reminders sent daily", caption: "30-day average · illustrative" },
    trigger: "24h, 48h, and 72h after a session with no note submitted",
    contextChips: ["Schedule", "Progress notes", "Clinician roster"],
    agentWork: ["Identify overdue notes", "Calculate days overdue", "Select reminder template", "Send notification"],
    actions: [{ label: "Send reminder" }, { label: "Escalate to supervisor", conditional: "if 72h+ overdue" }],
    humanApproval: { required: "supervisor escalations", automatic: "standard reminders" },
    destinations: ["Clinician inbox", "Supervisor dashboard"],
    footerLinkLabel: "View full workflow →",
  },
  "outcome-deterioration": {
    workflowId: "outcome-deterioration",
    domainChip: "Clinical",
    status: "Active",
    name: "Outcome Deterioration",
    purpose: "Detects clients showing worsening outcomes across standardized measures and surfaces early alerts",
    measuredImpact: { value: "~5 early alerts per week", caption: "30-day backtest · illustrative" },
    trigger: "After every outcome measure submission",
    contextChips: ["Outcome measures", "Treatment plans", "Progress notes"],
    agentWork: ["Pull latest scores", "Compare to baseline", "Identify deterioration pattern", "Alert care team"],
    actions: [{ label: "Alert care coordinator" }, { label: "Flag for treatment review" }],
    humanApproval: { required: "treatment plan changes", automatic: "scoring and alerting" },
    destinations: ["Care coordinator", "Clinical dashboard"],
    footerLinkLabel: "View full workflow →",
  },
  "engagement-dropout-risk": {
    workflowId: "engagement-dropout-risk",
    domainChip: "Clinical",
    status: "Testing",
    name: "Engagement & Dropout Risk",
    purpose: "Identifies clients at risk of dropping out based on attendance patterns and engagement signals",
    measuredImpact: { value: "30-day backtest running", caption: "testing · results pending" },
    trigger: "Weekly and after any missed appointment",
    contextChips: ["Schedule", "Attendance history", "Progress notes"],
    agentWork: ["Calculate attendance rate", "Score engagement signals", "Predict dropout risk", "Route to care team"],
    actions: [{ label: "Notify care coordinator" }, { label: "Schedule check-in" }],
    humanApproval: { required: "outreach decisions", automatic: "risk scoring" },
    destinations: ["Care coordinator queue", "Clinical ops"],
    footerLinkLabel: "View full workflow →",
  },
};

// ---------------------------------------------------------------------------
// Platform Home — Running right now (ticker)
// ---------------------------------------------------------------------------

export interface TickerItem {
  domain: Domain;
  /** Bold segments preserved with markdown-style **bold** markers, verbatim from the bible. */
  line: string;
  owner: string;
  ownerIconType: OwnerIconType;
}

export const runningRightNow: TickerItem[] = [
  {
    domain: "Revenue Cycle",
    line: "**Marcus Doyle** · 2/12 units left, auth expires 9d",
    owner: "S. Okafor",
    ownerIconType: "person",
  },
  {
    domain: "Compliance",
    line: "Note flagged for **J. Kim** · Golden Thread gap",
    owner: "D. Whitfield",
    ownerIconType: "person",
  },
  {
    domain: "Clinical",
    line: "**T. Brooks** · 3 no-shows in 14 days",
    owner: "Care team",
    ownerIconType: "group",
  },
];

// ---------------------------------------------------------------------------
// Platform Home — Workspace cards
// ---------------------------------------------------------------------------

export type WorkspaceId = "revenue-cycle" | "compliance" | "clinical";

export interface WorkspaceCard {
  id: WorkspaceId;
  title: string;
  purposeLine: string;
  activeWorkflowsLabel: string;
  signatureMetricValue: string;
  signatureMetricLabel: string;
}

/** Errata #13: Compliance card is "3 active workflows" — PNG says 2. */
export const workspaceCards: WorkspaceCard[] = [
  {
    id: "revenue-cycle",
    title: "Revenue Cycle",
    purposeLine: "Protect revenue by preventing avoidable work.",
    activeWorkflowsLabel: "3 active workflows",
    signatureMetricValue: "$186K",
    signatureMetricLabel: "preventable revenue",
  },
  {
    id: "compliance",
    title: "Compliance Operations",
    purposeLine:
      "Turn continuous review into a managed correction loop",
    activeWorkflowsLabel: "3 active workflows",
    signatureMetricValue: "92%",
    signatureMetricLabel: "corrected before sign-off",
  },
  {
    id: "clinical",
    title: "Clinical Operations",
    purposeLine: "Convert population signals into focused interventions.",
    activeWorkflowsLabel: "2 active workflows",
    signatureMetricValue: "73",
    signatureMetricLabel: "at-risk clients re-engaged",
  },
];

export interface CoWorkEntryPoint {
  label: string;
  location: string;
}

/** Both dead in v1, styled live. */
export const coWorkEntryPoints: CoWorkEntryPoint[] = [
  { label: "Ask why these numbers moved", location: "next to Workflows in Numbers" },
  { label: "Ask for an organizational brief", location: "next to Workspaces" },
];

// ---------------------------------------------------------------------------
// Create a Workflow
// ---------------------------------------------------------------------------

export interface PresetCard {
  domain: Domain;
  description: string;
}

export interface CreateWorkflowEmptyState {
  headline: string;
  placeholder: string;
  presets: PresetCard[];
}

/** Errata #11: PNG repeats one description on every preset card — per-domain copy per bible. */
export const createWorkflowEmptyState: CreateWorkflowEmptyState = {
  headline: "What should this workflow do?",
  placeholder:
    "Describe it in your own words, we'll figure out the rest together.",
  presets: [
    {
      domain: "Compliance",
      description: "Turn continuous review into a managed correction loop",
    },
    {
      domain: "Revenue Cycle",
      description: "Protect revenue by preventing avoidable work",
    },
    {
      domain: "Clinical",
      description: "Convert population signals into focused interventions",
    },
  ],
};

export interface QuickReplyOption {
  label: string;
}

interface BaseScriptTurn {
  /** Renders a "— LABEL —" divider immediately above this turn. */
  sectionDivider?: "SCOPE" | "LOGIC" | "VALIDATION";
  /**
   * Status line shown in the "Thinking…" indicator while this turn (and any
   * immediately-following auto turns) are being prepared. Turns without one
   * are revealed silently alongside the nearest preceding turn that has one.
   */
  thinkingLabel?: string;
}

/** A yes/no-style confirmation the AI asks before moving to the next section. */
export interface ConfirmTurn extends BaseScriptTurn {
  kind: "confirm";
  text: string;
  options: [QuickReplyOption, QuickReplyOption];
  completesSection: "Intent" | "Scope" | "Validation" | "Commitment";
}

/** A plain AI line with no reply required — renders immediately. */
export interface StatementTurn extends BaseScriptTurn {
  kind: "statement";
  text: string;
}

/** One of the numbered Logic clarifying questions. */
export interface QuestionTurn extends BaseScriptTurn {
  kind: "question";
  questionNumber: number;
  questionCount: number;
  topic: string;
  prompt: string;
  options: [QuickReplyOption, QuickReplyOption, QuickReplyOption];
  /** Set once the last question in the section has been answered. */
  completesSection?: "Logic";
}

/** The dry-run backtest results card — terminal turn of this scripted flow. */
export interface ValidationResultsTurn extends BaseScriptTurn {
  kind: "validation-results";
  completesSection?: "Validation";
  scanned: string;
  matches: string;
  confidenceSplit: string;
  expectedEvidenceRequests: string;
  sampleCasesLabel: string;
}

export type ScriptTurn =
  | ConfirmTurn
  | StatementTurn
  | QuestionTurn
  | ValidationResultsTurn;

export interface ReceiptDetailRow {
  icon: "trigger" | "population" | "evidence" | "caseTiming" | "owner";
  label: string;
  value: string;
}

export interface WorkflowReceipt {
  intent: string;
  scopePendingLabel: string;
  scope: ReceiptDetailRow[];
  logicPendingLabel: string;
  logic: ReceiptDetailRow[];
  validationPending: string;
  validation: ReceiptDetailRow[];
  commitmentPending: string;
}

export interface CreateWorkflowScript {
  turns: ScriptTurn[];
  receipt: WorkflowReceipt;
}

/**
 * The one designed conversation (Authorization Exhaustion / Marcus Doyle —
 * see the anchor case). This is a single-story deterministic demo: whatever
 * the user types or picks from the empty state, submitting always enters
 * this same scripted conversation. Verbatim from Figma nodes 70:4907,
 * 70:4982, 70:5076, 70:5209, 70:5417 (get_design_context, not layer names —
 * this file's layer names are stale duplicate-instance names).
 *
 * Errata: Figma's "Question 3 of 3 · Case ownership" reuses Question 2's
 * options verbatim (a copy-paste error in the design file — they don't
 * answer the ownership question asked in the same frame). The options below
 * are derived directly from that question's own prompt text instead.
 */
export const createWorkflowScript: CreateWorkflowScript = {
  turns: [
    {
      kind: "confirm",
      completesSection: "Intent",
      thinkingLabel: "Reading your request",
      text: "Got it — watch for clients under three authorized units, check whether their notes justify continuing care, open an RCM case, and loop in the clinician if that evidence isn't there yet. Does that look right?",
      options: [{ label: "Yes, that's it." }, { label: "Not Quite" }],
    },
    {
      kind: "confirm",
      completesSection: "Scope",
      sectionDivider: "SCOPE",
      thinkingLabel: "Reviewing scope",
      text: "This runs daily, and whenever a service is completed — for clients with fewer than three units left on their active authorization for individual therapy (90834). Look right?",
      options: [{ label: "Yes, that's it." }, { label: "Not Quite" }],
    },
    {
      kind: "statement",
      sectionDivider: "LOGIC",
      thinkingLabel: "Working out the evidence logic",
      text: "Now let's figure out what counts as evidence of continued care, and what happens when it's missing. I have three quick questions.",
    },
    {
      kind: "question",
      questionNumber: 1,
      questionCount: 3,
      topic: "Evidence definition",
      prompt:
        "What counts as recent documentation? A note signed in the last 14 days that references the treatment plan, any note in the current authorization period, or something else?",
      options: [
        { label: "Note in last 14 days, referencing the plan" },
        { label: "Any note in current auth period" },
        { label: "Something else" },
      ],
    },
    {
      kind: "question",
      questionNumber: 2,
      questionCount: 3,
      topic: "Case timing",
      thinkingLabel: "Noting evidence rules",
      prompt:
        "Got it. Every match should open an RCM case right away — should it go in marked 'needs evidence' when documentation is missing, and update automatically once it's added, or should the case wait to open until the evidence question is resolved?",
      options: [
        { label: "Open immediately, needs-evidence state, updates automatically" },
        { label: "Wait until resolved" },
        { label: "Something else" },
      ],
    },
    {
      kind: "question",
      questionNumber: 3,
      questionCount: 3,
      topic: "Case ownership",
      completesSection: "Logic",
      thinkingLabel: "Setting case timing",
      prompt:
        "Last one — who should own cases this creates by default? Route by caseload rules, or assign everything to one specific person?",
      options: [
        { label: "Route by caseload rules" },
        { label: "Assign to one specific person" },
        { label: "Something else" },
      ],
    },
    {
      kind: "statement",
      thinkingLabel: "Running a 30-day validation backtest",
      text: "That covers it. If evidence turns up missing at any point before sign-off, I'll flag it on the clinician's note directly — that part was already in your original ask, so I didn't need to check it separately.",
    },
    {
      kind: "statement",
      sectionDivider: "VALIDATION",
      text: "Before this goes live, let's run it against the last 30 days to see what it would have found:",
    },
    {
      kind: "validation-results",
      scanned: "1,900 completed services",
      matches: "41 unit-exhaustion cases",
      confidenceSplit: "33/8",
      expectedEvidenceRequests: "11",
      sampleCasesLabel: "See 3 sample cases",
    },
    {
      kind: "confirm",
      thinkingLabel: "Pulling sample cases",
      text: "3 sample cases: Maria Chen (2 units, no note), James Okafor (1 unit, note 22d old), Sofia Reyes (auth expires next week). All three would have fired. Ready to go live?",
      options: [
        { label: "Yes, go live" },
        { label: "Not yet" },
      ],
      completesSection: "Commitment",
    },
    {
      kind: "statement",
      thinkingLabel: "Activating workflow",
      text: "You're live. The workflow will run daily and on every service completion — I'll flag any missing evidence directly on the clinician's note.",
    },
  ],
  receipt: {
    intent:
      "<3 units (90834); check evidence; open case; notify clinician if missing",
    scopePendingLabel: "which documents apply",
    scope: [
      { icon: "trigger", label: "Trigger", value: "Daily or on completion" },
      {
        icon: "population",
        label: "Population",
        value: "<3 units left, 90834 authorization",
      },
    ],
    logicPendingLabel: "how the evidence check works",
    logic: [
      {
        icon: "evidence",
        label: "Evidence",
        value: "note, 14 days, references plan",
      },
      {
        icon: "caseTiming",
        label: "Case timing",
        value: "opens immediately, auto-updates",
      },
      { icon: "owner", label: "Owner", value: "caseload routing" },
    ],
    validationPending: "test against the last 30 days",
    validation: [
      { icon: "population" as const, label: "Scanned", value: "1,900 services" },
      { icon: "evidence" as const, label: "Matches", value: "41 cases (33 high-confidence)" },
      { icon: "caseTiming" as const, label: "Sample cases", value: "Maria Chen, James Okafor, Sofia Reyes" },
    ],
    commitmentPending: "runs daily and on every service completion",
  },
};

// ---------------------------------------------------------------------------
// Workspace Overview — shared shapes
// ---------------------------------------------------------------------------

export interface WorkspaceTab {
  label: string;
  count?: number;
}

export interface StatCard {
  label: string;
  value: string;
  caption: string;
}

export interface AttentionItem {
  priority: Priority;
  client: string;
  line: string;
  due: string;
  owner: string;
}

export interface ImpactCard {
  type: "impact";
  value: string;
  description: string;
  buttonLabel: string;
}

export interface InsightCard {
  type: "insight";
  color: "teal" | "blue";
  headline: string;
  subheadline: string;
  body: string;
  buttonLabel: string;
}

export interface WorkspaceChart {
  title: string;
  finalValueLabel: string;
  periodLabel: string;
  weekLabels: string[];
  weeklyValues: number[];
}

export interface WorkspaceOverview {
  id: WorkspaceId;
  tabs: WorkspaceTab[];
  stats: StatCard[];
  attentionItems: AttentionItem[];
  runningWorkflowIds: WorkflowId[];
  rightColumnCard: ImpactCard | InsightCard;
  chart: WorkspaceChart;
}

// ---------------------------------------------------------------------------
// RCM Workspace — Overview
// ---------------------------------------------------------------------------

/**
 * Errata #6 (Marcus line/owner), #7 (3 distinct cases, not 3x R. Chen),
 * #8 (second card header is "Automation / Running workflows"),
 * #15 (Running workflows (5)) resolved here.
 */
export const rcmWorkspaceOverview: WorkspaceOverview = {
  id: "revenue-cycle",
  tabs: [
    { label: "Overview" },
    { label: "Work queue", count: 3 },
    { label: "Running workflows", count: 5 },
    { label: "Analytics" },
  ],
  stats: [
    {
      label: "Work due today",
      value: "6",
      caption: "3 high priority",
    },
    {
      label: "Auths at risk",
      value: "3",
      caption: "from Authorization Exhaustion",
    },
    {
      label: "Blocked claims",
      value: "5",
      caption: "2 need documentation",
    },
    {
      label: "Completed on time",
      value: "82%",
      caption: "+5 points this quarter",
    },
  ],
  attentionItems: [
    {
      priority: "Critical",
      client: "R. Chen",
      line: "Authorization expired · visit scheduled today",
      due: "Today",
      owner: "M. Fitzgerald",
    },
    {
      priority: "High",
      client: "Marcus Doyle",
      line: "2/12 units left · evidence missing · auth expires in 9d",
      due: "9 days",
      owner: "S. Okafor",
    },
    {
      priority: "High",
      client: "T. Alvarez",
      line: "Claim blocked · documentation mismatch",
      due: "Today, 3pm",
      owner: "D. Marsh",
    },
  ],
  runningWorkflowIds: [
    "authorization-exhaustion",
    "eligibility-continuity",
    "pre-claim-denial-prevention",
    "medicaid-redetermination",
    "denial-triage",
  ],
  rightColumnCard: {
    type: "impact",
    value: "$186K",
    description:
      "Illustrative value from coverage, authorization and pre-claim workflows this month.",
    buttonLabel: "Explore Impact",
  },
  chart: {
    title: "Work completed on time",
    finalValueLabel: "82%",
    periodLabel: "Last 8 weeks",
    weekLabels: orgInfo.chartWeekLabels,
    weeklyValues: [55, 60, 52, 68, 74, 70, 80, 82],
  },
};

// ---------------------------------------------------------------------------
// Compliance Ops Workspace — Overview
// ---------------------------------------------------------------------------

/** Errata #9 (K. Boyd owner is L. Prescott, not R. Chen) resolved here. */
export const complianceWorkspaceOverview: WorkspaceOverview = {
  id: "compliance",
  tabs: [
    { label: "Overview" },
    { label: "Work queue", count: 3 },
    { label: "Running workflows", count: 3 },
    { label: "Analytics" },
  ],
  stats: [
    {
      label: "Compliance rate",
      value: "94%",
      caption: "+2 pts this quarter",
    },
    {
      label: "Exceptions awaiting review",
      value: "2",
      caption: "Safety Plan Required flagged",
    },
    {
      label: "Corrected before sign-off",
      value: "92%",
      caption: "",
    },
    {
      label: "Repeat issue rate",
      value: "6%",
      caption: "down from 11%",
    },
  ],
  attentionItems: [
    {
      priority: "Critical",
      client: "K. Boyd",
      line: "Risk language detected · no safety plan on file",
      due: "Today",
      owner: "L. Prescott",
    },
    {
      priority: "High",
      client: "J. Kim",
      line: "Golden Thread gap · note doesn't reference treatment goals",
      due: "Today",
      owner: "D. Whitfield",
    },
    {
      priority: "Medium",
      client: "P. Nguyen",
      line: "Golden Thread gap · goal reference unclear",
      due: "Tomorrow",
      owner: "D. Whitfield",
    },
  ],
  runningWorkflowIds: [
    "golden-thread-alignment",
    "safety-plan-required",
    "documentation-timeliness",
  ],
  rightColumnCard: {
    type: "insight",
    color: "teal",
    headline: "Exceptions become better rules",
    subheadline: "3 reviewed → 1 rule tuned",
    body:
      'The "semantic reference" threshold was loosened this week after reviewers dismissed 3 false positives. Clinicians now see fewer false Golden Thread flags for goal-adjacent language.',
    buttonLabel: "See rule history",
  },
  chart: {
    title: "Compliance rate",
    finalValueLabel: "94%",
    periodLabel: "Last 8 weeks",
    weekLabels: orgInfo.chartWeekLabels,
    weeklyValues: [62, 65, 68, 70, 78, 82, 90, 94],
  },
};

// ---------------------------------------------------------------------------
// Clinical Ops Workspace — Overview
// ---------------------------------------------------------------------------

/** Errata #10: use "Dr. Ahn" everywhere, never "D. Ahn". */
export const clinicalWorkspaceOverview: WorkspaceOverview = {
  id: "clinical",
  tabs: [
    { label: "Overview" },
    { label: "Work queue", count: 3 },
    { label: "Running workflows", count: 2 },
    { label: "Analytics" },
  ],
  stats: [
    {
      label: "Clients needing attention",
      value: "5",
      caption: "review recommended",
    },
    {
      label: "Engagement risk",
      value: "12",
      caption: "projected, 30-day backtest",
    },
    {
      label: "Treatment plans needing review",
      value: "3",
      caption: "tracked manually today",
    },
    {
      label: "Caseload activity",
      value: "42",
      caption: "active clients, 3 clinicians",
    },
  ],
  attentionItems: [
    {
      priority: "High",
      client: "R. Kowalski",
      line: "PHQ-9 increased 7 points over 3 sessions",
      due: "Today",
      owner: "Dr. Ahn",
    },
    {
      priority: "Medium",
      client: "S. Delgado",
      line: "GAD-7 trend flagged · no treatment plan update in 60 days",
      due: "Tomorrow",
      owner: "M. Reyes, LCSW",
    },
    {
      priority: "Medium",
      client: "N. Whitaker",
      line: "Outcome measure trend declining · review scheduled",
      due: "Thursday",
      owner: "Dr. Ahn",
    },
  ],
  runningWorkflowIds: ["outcome-deterioration", "engagement-dropout-risk"],
  rightColumnCard: {
    type: "insight",
    color: "blue",
    headline: "Where to spend limited attention",
    subheadline: "3 clients, ranked",
    body:
      "R. Kowalski's deterioration outranks two lower-confidence signals — reviewing her plan first addresses the most time-sensitive risk.",
    buttonLabel: "See prioritized list",
  },
  chart: {
    title: "Assignment & intervention completion",
    finalValueLabel: "71%",
    periodLabel: "Last 8 weeks",
    weekLabels: orgInfo.chartWeekLabels,
    weeklyValues: [50, 54, 58, 56, 62, 65, 68, 71],
  },
};

/**
 * "Treatment plans needing review" deliberately has no workflow source — it
 * is tracked manually today. This gap is intentional per the story bible;
 * do not attach a workflowId to it.
 */
export const treatmentPlansReviewHasNoWorkflowSource = true as const;

// ---------------------------------------------------------------------------
// Anchor case (for later scenes — Co-Work, EHR sidebar, closed-loop)
// ---------------------------------------------------------------------------

export interface MarcusDoyleCase {
  clientName: "Marcus Doyle";
  service: string;
  authorizationUnitsTotal: number;
  authorizationUnitsRemaining: number;
  authorizationExpiresInDays: number;
  scheduledVisitsAtRisk: number;
  continuedCareEvidenceMissing: string;
  caseOwner: string;
  caseOwnerRoutingMethod: string;
  workflowSource: WorkflowId;
}

export const marcusDoyleCase: MarcusDoyleCase = {
  clientName: "Marcus Doyle",
  service: "individual therapy 90834",
  authorizationUnitsTotal: 12,
  authorizationUnitsRemaining: 2,
  authorizationExpiresInDays: 9,
  scheduledVisitsAtRisk: 4,
  continuedCareEvidenceMissing: "updated functional-impairment statement",
  caseOwner: "S. Okafor",
  caseOwnerRoutingMethod: "caseload routing",
  workflowSource: "authorization-exhaustion",
};

export interface TAlvarezCase {
  clientName: "T. Alvarez";
  claimId: string;
  stagedCode: string;
  correctCode: string;
  correctCodeDescription: string;
  noteDate: string;
  owner: string;
  workflowSource: WorkflowId;
  value: string;
}

export const tAlvarezCase: TAlvarezCase = {
  clientName: "T. Alvarez",
  claimId: "#4471",
  stagedCode: "90837",
  correctCode: "90847",
  correctCodeDescription: "family session, spouse present, note Aug 5",
  noteDate: "Aug 5",
  owner: "D. Marsh",
  workflowSource: "pre-claim-denial-prevention",
  value: "$340",
};
