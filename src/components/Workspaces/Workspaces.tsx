import { motion } from "motion/react";
import "./Workspaces.css";
import { PageHeader } from "../PageHeader/PageHeader";
import { PriorityIcon } from "./PriorityIcon";
import { DotsIcon } from "./DotsIcon";
import { pressableButton, pressableIconButton } from "../../motion/interactions";
import {
  rcmWorkspaceOverview,
  complianceWorkspaceOverview,
  clinicalWorkspaceOverview,
  workflows,
  type WorkspaceId,
  type WorkspaceOverview,
  type WorkflowStatus,
} from "../../data/story";

const SHARED_ASSET = "/assets/workflows-page";
const REGISTRY_ASSET = "/assets/workflows-registry";

interface WorkspaceTheme {
  headerTitle: string;
  icon: string;
  accent: string;
  impactCardBg: string;
  dotsColor: string;
}

const workspaceTheme: Record<WorkspaceId, WorkspaceTheme> = {
  "revenue-cycle": {
    headerTitle: "Revenue Cycle Workspace",
    icon: `${SHARED_ASSET}/money-wavy-fill.svg`,
    accent: "var(--color-deeppurple-800)",
    impactCardBg: "var(--color-deeppurple-700)",
    dotsColor: "var(--color-deeppurple-900)",
  },
  compliance: {
    headerTitle: "Compliance Ops Workspace",
    icon: `${SHARED_ASSET}/clipboard-text-fill.svg`,
    accent: "var(--color-cyan-900)",
    impactCardBg: "var(--color-cyan-900)",
    dotsColor: "var(--color-cyan-900)",
  },
  clinical: {
    headerTitle: "Clinical Ops Workspace",
    icon: `${SHARED_ASSET}/hand-heart-fill.svg`,
    accent: "var(--color-blue-900)",
    impactCardBg: "var(--color-blue-900)",
    dotsColor: "var(--color-blue-900)",
  },
};

const chartGradient: Record<WorkspaceId, { from: string; to: string }> = {
  "revenue-cycle": { from: "var(--color-deeppurple-300)", to: "var(--color-deeppurple-800)" },
  compliance: { from: "var(--color-cyan-300)", to: "var(--color-cyan-900)" },
  clinical: { from: "var(--color-blue-300)", to: "var(--color-blue-900)" },
};

const insightCardBg: Record<"teal" | "blue", string> = {
  teal: "var(--color-cyan-900)",
  blue: "var(--color-blue-900)",
};

const overviewByWorkspace: Record<WorkspaceId, WorkspaceOverview> = {
  "revenue-cycle": rcmWorkspaceOverview,
  compliance: complianceWorkspaceOverview,
  clinical: clinicalWorkspaceOverview,
};

const statusIcon: Record<WorkflowStatus, string> = {
  Active: `${REGISTRY_ASSET}/broadcast-fill.svg`,
  "Needs Attention": `${REGISTRY_ASSET}/warning-circle-fill.svg`,
  Testing: `${REGISTRY_ASSET}/flask-fill.svg`,
  Draft: `${REGISTRY_ASSET}/file-text-fill.svg`,
  Paused: `${REGISTRY_ASSET}/pause-circle-fill.svg`,
};

const workflowsById = new Map(workflows.map((wf) => [wf.id, wf]));

export default function Workspaces({ workspaceId }: { workspaceId: WorkspaceId }) {
  const theme = workspaceTheme[workspaceId];
  const gradient = chartGradient[workspaceId];
  const overview = overviewByWorkspace[workspaceId];
  const maxChartValue = Math.max(...overview.chart.weeklyValues);

  return (
    <div className="workspaces">
      <div className="ws-column">
        <div className="ws-frame">
          <PageHeader />

          <div className="ws-card">
            <header className="ws-header" style={{ background: theme.accent }}>
              <div className="ws-header__title">
                <img className="ws-header__icon" src={theme.icon} alt="" />
                <span>{theme.headerTitle}</span>
              </div>
              <div className="ws-header__actions">
                <motion.button
                  className="ws-btn-white"
                  type="button"
                  style={{ color: theme.impactCardBg }}
                  {...pressableButton}
                >
                  Create a workflow
                </motion.button>
                <motion.button
                  className="ws-icon-button-white"
                  type="button"
                  aria-label="More options"
                  {...pressableIconButton}
                >
                  <DotsIcon color={theme.dotsColor} />
                </motion.button>
              </div>
            </header>

            <div className="ws-body">
              <div className="ws-tabs">
                {overview.tabs.map((tab, index) => {
                  const active = index === 0;
                  return (
                    <div
                      className={`ws-tab${active ? " ws-tab--active" : ""}`}
                      key={tab.label}
                      style={active ? { borderColor: theme.accent, color: theme.accent } : undefined}
                    >
                      <span>
                        {tab.label}
                        {tab.count !== undefined ? ` (${tab.count})` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="ws-stats-grid">
                {overview.stats.map((stat) => (
                  <div className="ws-stat-card" key={stat.label}>
                    <span className="ws-stat-card__label">{stat.label}</span>
                    <div>
                      <div className="ws-stat-card__value" style={{ color: theme.accent }}>
                        {stat.value}
                      </div>
                      {stat.caption && <div className="ws-stat-card__caption">{stat.caption}</div>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="ws-content-row">
                <div className="ws-panels">
                  <div className="ws-panel">
                    <div className="ws-panel__head">
                      <div className="ws-panel__head-text">
                        <span className="ws-panel__eyebrow">Today</span>
                        <span className="ws-panel__title">Work needing attention</span>
                      </div>
                      <motion.button className="ws-panel__cta" type="button" {...pressableButton}>
                        Open Queue
                      </motion.button>
                    </div>
                    <div className="ws-rows">
                      {overview.attentionItems.map((item) => (
                        <div className="ws-row" key={item.client}>
                          <div className="ws-row__identity">
                            <span className="ws-row__icon-badge">
                              <PriorityIcon priority={item.priority} />
                            </span>
                            <div className="ws-row__text">
                              <span className="ws-row__name">{item.client}</span>
                              <span className="ws-row__line">{item.line}</span>
                            </div>
                          </div>
                          <div className="ws-row__meta">
                            <span>
                              {item.due} · {item.owner}
                            </span>
                            <img className="ws-row__chevron" src={`${REGISTRY_ASSET}/right-chevron.svg`} alt="" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="ws-panel">
                    <div className="ws-panel__head">
                      <div className="ws-panel__head-text">
                        <span className="ws-panel__eyebrow">Automation</span>
                        <span className="ws-panel__title">Work needing attention</span>
                      </div>
                      <motion.button className="ws-panel__cta" type="button" {...pressableButton}>
                        View All
                      </motion.button>
                    </div>
                    <div className="ws-rows">
                      {overview.runningWorkflowIds.map((id) => {
                        const wf = workflowsById.get(id);
                        if (!wf) return null;
                        return (
                          <div className="ws-row" key={id}>
                            <div className="ws-row__identity">
                              <span className="ws-row__icon-badge">
                                <img src={statusIcon[wf.status]} alt="" />
                              </span>
                              <div className="ws-row__text">
                                <span className="ws-row__name">{wf.name}</span>
                                <span className="ws-row__line">{wf.caption}</span>
                              </div>
                            </div>
                            <img className="ws-row__chevron" src={`${REGISTRY_ASSET}/right-chevron.svg`} alt="" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="ws-side">
                  {overview.rightColumnCard.type === "impact" ? (
                    <div className="ws-highlight-card" style={{ background: theme.impactCardBg }}>
                      <div className="ws-highlight-card__head">
                        <span className="ws-impact-card__value">{overview.rightColumnCard.value}</span>
                        <span className="ws-impact-card__label">Preventable revenue protected</span>
                      </div>
                      <p className="ws-highlight-card__body">{overview.rightColumnCard.description}</p>
                      <motion.button
                        className="ws-btn-white"
                        type="button"
                        style={{ color: theme.impactCardBg }}
                        {...pressableButton}
                      >
                        {overview.rightColumnCard.buttonLabel}
                      </motion.button>
                    </div>
                  ) : (
                    <div
                      className="ws-highlight-card"
                      style={{ background: insightCardBg[overview.rightColumnCard.color] }}
                    >
                      <div className="ws-highlight-card__head">
                        <span className="ws-insight-card__eyebrow">{overview.rightColumnCard.headline}</span>
                        <span className="ws-insight-card__headline">{overview.rightColumnCard.subheadline}</span>
                      </div>
                      <p className="ws-highlight-card__body">{overview.rightColumnCard.body}</p>
                      <motion.button
                        className="ws-btn-white"
                        type="button"
                        style={{ color: insightCardBg[overview.rightColumnCard.color] }}
                        {...pressableButton}
                      >
                        {overview.rightColumnCard.buttonLabel}
                      </motion.button>
                    </div>
                  )}

                  <div className="ws-chart-card">
                    <div className="ws-chart-card__head">
                      <span className="ws-chart-card__period">{overview.chart.periodLabel}</span>
                      <div className="ws-chart-card__title-row">
                        <span className="ws-chart-card__title">{overview.chart.title}</span>
                        <span className="ws-chart-card__final-value">{overview.chart.finalValueLabel}</span>
                      </div>
                    </div>
                    <div className="ws-chart-bars">
                      {overview.chart.weeklyValues.map((value, index) => (
                        <div className="ws-chart-bar" key={overview.chart.weekLabels[index]}>
                          <div className="ws-chart-bar__track">
                            <div
                              className="ws-chart-bar__fill"
                              style={{
                                height: `${(value / maxChartValue) * 100}%`,
                                backgroundImage: `linear-gradient(180deg, ${gradient.from}, ${gradient.to})`,
                              }}
                            />
                          </div>
                          <span className="ws-chart-bar__label" style={{ color: theme.accent }}>
                            {overview.chart.weekLabels[index]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
