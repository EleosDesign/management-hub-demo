import { motion } from "motion/react";
import "./WorkflowRegistry.css";
import {
  platformMetrics,
  runningRightNow,
  workspaceCards,
  type Domain,
  type WorkspaceId,
} from "../../data/story";
import { useNavigate } from "react-router-dom";
import { pressableButton } from "../../motion/interactions";

const PAGE = "/assets/workflows-page";

const domainIcon: Record<Domain, string> = {
  "Revenue Cycle": `${PAGE}/money-wavy-fill.svg`,
  Compliance: `${PAGE}/clipboard-text-fill.svg`,
  Clinical: `${PAGE}/hand-heart-fill.svg`,
};

const domainLogoIcon: Record<Domain, string> = {
  "Revenue Cycle": `${PAGE}/rcm-logo.svg`,
  Compliance: `${PAGE}/compliance-logo.svg`,
  Clinical: `${PAGE}/clinical-logo.svg`,
};

const domainLabelColor: Record<Domain, string> = {
  "Revenue Cycle": "var(--color-deeppurple-800)",
  Compliance: "var(--color-cyan-900)",
  Clinical: "var(--color-blue-900)",
};

const workspaceGradient: Record<WorkspaceId, string> = {
  "revenue-cycle": "linear-gradient(to bottom, var(--color-deeppurple-50, #ede7f6), #ffffff)",
  compliance: "linear-gradient(to bottom, var(--color-cyan-50, #e0f7fa), #ffffff)",
  clinical: "linear-gradient(to bottom, #e3f2fd, #ffffff)",
};

const workspaceDomain: Record<WorkspaceId, Domain> = {
  "revenue-cycle": "Revenue Cycle",
  compliance: "Compliance",
  clinical: "Clinical",
};

function stripBold(line: string) {
  return line.replace(/\*\*([^*]+)\*\*/g, "$1");
}

export default function WorkflowRegistry() {
  const navigate = useNavigate();

  return (
    <div className="workflow-registry">
      <div className="wr-column">

        {/* ── Hero card ──────────────────────────────────────────────── */}
        <div className="wr-hero">
          <div className="wr-hero__body">
            <div className="wr-hero__text">
              <p className="wr-hero__headline">Understand the work, Run the work, Improve the work.</p>
              <p className="wr-hero__sub">One agentic platform turns fragmented signals into managed work</p>
            </div>
            <div className="wr-hero__actions">
              <motion.button
                className="wr-hero__cta"
                type="button"
                onClick={() => navigate("/workflows/new")}
                {...pressableButton}
              >
                Create a workflow
              </motion.button>
              <button className="wr-hero__link" type="button" onClick={() => navigate("/workflows/running")}>
                See what's running
              </button>
            </div>
          </div>
          <img
            className="wr-hero__illustration"
            src={`${PAGE}/workflows-banner-illustration.svg`}
            alt=""
          />
        </div>

        {/* ── Running right now ──────────────────────────────────────── */}
        <section className="wr-section">
          <header className="wr-section__header">
            <img src={`${PAGE}/active-icon.svg`} alt="" className="wr-section__icon" />
            <h2 className="wr-section__title">Running right now</h2>
          </header>
          <div className="wr-ticker">
            {runningRightNow.map((item, i) => (
              <div className="wr-ticker__row" key={i}>
                <div className="wr-ticker__domain">
                  <img src={domainLogoIcon[item.domain]} alt="" className="wr-ticker__domain-logo" />
                  <img src={`${PAGE}/line-divider.svg`} alt="" className="wr-ticker__divider" />
                  <span className="wr-ticker__domain-label" style={{ color: domainLabelColor[item.domain] }}>
                    {item.domain}
                  </span>
                  <img src={`${PAGE}/line-divider.svg`} alt="" className="wr-ticker__divider" />
                </div>
                <p className="wr-ticker__line">{stripBold(item.line)}</p>
                <div className="wr-ticker__owner">
                  <span className="wr-ticker__owner-name">{item.owner}</span>
                  <img
                    src={`${PAGE}/owner-icon.svg`}
                    alt=""
                    className="wr-ticker__owner-icon"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Workflows in Numbers ───────────────────────────────────── */}
        <section className="wr-section">
          <header className="wr-section__header wr-section__header--between">
            <h2 className="wr-section__title">Workflows in Numbers</h2>
            <div className="wr-cowork-link">
              <span>Ask why these numbers moved</span>
              <img src={`${PAGE}/co-work-icon.svg`} alt="" />
            </div>
          </header>
          <div className="wr-stats-grid">
            {platformMetrics.map((metric) => (
              <div className="wr-stat-card" key={metric.label}>
                <span className="wr-stat-card__label">{metric.label}</span>
                <div>
                  <div className="wr-stat-card__value">{metric.value}</div>
                  <div className="wr-stat-card__caption">{metric.caption}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Workspaces ────────────────────────────────────────────── */}
        <section className="wr-section">
          <header className="wr-section__header wr-section__header--between">
            <div>
              <h2 className="wr-section__title">Workspaces</h2>
              <p className="wr-section__subtitle">One platform, shaped around each team's work</p>
            </div>
            <div className="wr-cowork-link">
              <span>Ask for an organizational brief</span>
              <img src={`${PAGE}/co-work-icon.svg`} alt="" />
            </div>
          </header>
          <div className="wr-workspaces">
            {workspaceCards.map((ws) => {
              const domain = workspaceDomain[ws.id];
              return (
                <div
                  className="wr-workspace-card"
                  key={ws.id}
                  style={{ background: workspaceGradient[ws.id] }}
                >
                  <div className="wr-workspace-card__body">
                    <div className="wr-workspace-card__info">
                      <div className="wr-workspace-card__identity">
                        <img src={domainIcon[domain]} alt="" className="wr-workspace-card__icon" />
                        <span className="wr-workspace-card__domain" style={{ color: domainLabelColor[domain] }}>
                          {ws.title}
                        </span>
                      </div>
                      <p className="wr-workspace-card__purpose">{ws.purposeLine}</p>
                      <p className="wr-workspace-card__count">{ws.activeWorkflowsLabel}</p>
                    </div>
                    <div className="wr-workspace-card__arrow">
                      <img src={`${PAGE}/arrow-up-right.svg`} alt="" />
                    </div>
                  </div>
                  <div className="wr-workspace-card__metric">
                    <span className="wr-workspace-card__metric-value">{ws.signatureMetricValue}</span>
                    <span className="wr-workspace-card__metric-label">{ws.signatureMetricLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
