import { useState } from "react";
import { motion } from "motion/react";
import "./WorkflowRegistry.css";
import {
  platformMetrics,
  workflows,
  workflowDetails,
  type Domain,
  type WorkflowId,
  type WorkflowStatus,
} from "../../data/story";
import { useNavigate } from "react-router-dom";
import { pressableButton, pressableIconButton } from "../../motion/interactions";

const ASSET = "/assets/workflows-registry";
const SHARED_ASSET = "/assets/workflows-page";

const domainIcon: Record<Domain, string> = {
  "Revenue Cycle": `${SHARED_ASSET}/money-wavy-fill.svg`,
  Compliance: `${SHARED_ASSET}/clipboard-text-fill.svg`,
  Clinical: `${SHARED_ASSET}/hand-heart-fill.svg`,
};

const domainLabelColor: Record<Domain, string> = {
  "Revenue Cycle": "var(--color-deeppurple-900)",
  Compliance: "var(--color-cyan-900)",
  Clinical: "var(--color-blue-900)",
};

const statusMeta: Record<WorkflowStatus, { icon: string; label: string }> = {
  Active: {
    icon: `${ASSET}/broadcast-fill.svg`,
    label: "Active",
  },
  "Needs Attention": {
    icon: `${ASSET}/warning-circle-fill.svg`,
    label: "Needs attention",
  },
  Testing: {
    icon: `${ASSET}/flask-fill.svg`,
    label: "Testing",
  },
  Draft: {
    icon: `${ASSET}/file-text-fill.svg`,
    label: "Draft",
  },
  Paused: {
    icon: `${ASSET}/pause-circle-fill.svg`,
    label: "Paused",
  },
};

const dimCaptionStatuses: WorkflowStatus[] = ["Draft", "Paused"];

const registryTabs = ["All", "Needs Attention", "Active", "Testing", "Draft", "Paused"];

export default function WorkflowRegistry() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<WorkflowId>(workflows[0].id);
  const detail = workflowDetails[selectedId];

  return (
    <div className="workflow-registry">
      <div className="wr-column">
        <header className="wr-header">
          <h1 className="wr-header__title">Workflows Registry</h1>
          <div className="wr-header__actions">
            <motion.button
              className="wr-btn-outline"
              type="button"
              onClick={() => navigate("/workflows/new")}
              {...pressableButton}
            >
              Create a workflow
            </motion.button>
            <motion.button
              className="wr-icon-button"
              type="button"
              aria-label="More options"
              {...pressableIconButton}
            >
              <img src={`${ASSET}/dots-three-outline-vertical-fill.svg`} alt="" />
            </motion.button>
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

        <div className="wr-content-row">
          <div className="wr-list">
            <div className="wr-tabs">
              {registryTabs.map((tab) => (
                <div className={`wr-tab${tab === "All" ? " wr-tab--active" : ""}`} key={tab}>
                  <span>{tab}</span>
                </div>
              ))}
            </div>
            <div className="wr-rows">
              {workflows.map((wf) => {
                const meta = statusMeta[wf.status];
                const selected = wf.id === selectedId;
                return (
                  <div
                    className={`wr-row${selected ? " wr-row--selected" : ""}`}
                    key={wf.id}
                    onClick={() => setSelectedId(wf.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="wr-row__identity">
                      <img className="wr-row__domain-icon" src={domainIcon[wf.domain]} alt="" />
                      <div className="wr-row__identity-text">
                        <span className="wr-row__name">{wf.name}</span>
                        <span className="wr-row__meta" style={{ color: domainLabelColor[wf.domain] }}>
                          {wf.domain} · {wf.orgUnit}
                        </span>
                      </div>
                      <img className="wr-row__divider" src={`${SHARED_ASSET}/line-divider.svg`} alt="" />
                    </div>
                    <div className="wr-row__status">
                      <span className="wr-status-badge">
                        <img src={meta.icon} alt="" />
                        <span>{meta.label}</span>
                      </span>
                    </div>
                    <div className="wr-row__caption">
                      <span
                        className={
                          dimCaptionStatuses.includes(wf.status)
                            ? "wr-row__caption-text wr-row__caption-text--dim"
                            : "wr-row__caption-text"
                        }
                      >
                        {wf.caption}
                      </span>
                    </div>
                    <img className="wr-row__chevron" src={`${ASSET}/right-chevron.svg`} alt="" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="wr-detail-shadow">
          <div className="wr-detail">
            <div className="wr-detail__bg" aria-hidden="true" />
            <div className="wr-detail__head">
              <div className="wr-detail__domain">
                <img src={domainIcon[detail.domainChip]} alt="" />
                <span style={{ color: domainLabelColor[detail.domainChip] }}>
                  {detail.domainChip}
                </span>
              </div>
              <div className="wr-detail__head-actions">
                <span className="wr-detail__status-badge">
                  <img src={`${ASSET}/broadcast-fill-teal.svg`} alt="" />
                  <span>{detail.status}</span>
                </span>
                <motion.button
                  className="wr-icon-button wr-icon-button--sm"
                  type="button"
                  aria-label="More options"
                  {...pressableIconButton}
                >
                  <img src={`${ASSET}/dots-three-outline-vertical-fill.svg`} alt="" />
                </motion.button>
              </div>
            </div>

            <div className="wr-detail__title-block">
              <h2>{detail.name}</h2>
              <p>{detail.purpose}</p>
            </div>

            <div className="wr-detail__impact">
              <div className="wr-detail__impact-text">
                <span className="wr-detail__impact-label">Measured impact</span>
                <span className="wr-detail__impact-value">
                  {detail.measuredImpact.value}
                </span>
              </div>
              <img src={`${ASSET}/medal-fill.svg`} alt="" />
            </div>

            <div className="wr-detail__field">
              <span className="wr-detail__field-label">Trigger</span>
              <span className="wr-detail__field-value">{detail.trigger}</span>
            </div>

            <div className="wr-detail__field">
              <span className="wr-detail__field-label">Context</span>
              <div className="wr-detail__chips">
                {detail.contextChips.map((chip) => (
                  <span className="wr-detail__chip" key={chip}>
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="wr-detail__field">
              <span className="wr-detail__field-label">Agent work</span>
              <ol className="wr-detail__agent-work">
                {detail.agentWork.map((step, index) => (
                  <li key={step}>
                    <span>{index + 1}.</span> {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="wr-detail__field">
              <span className="wr-detail__field-label">Actions</span>
              <div className="wr-detail__actions">
                {detail.actions.map((action, index) => (
                  <div className="wr-detail__action" key={action.label}>
                    {index > 0 && (
                      <img
                        className="wr-detail__action-connector"
                        src={`${ASSET}/action-connector-line.svg`}
                        alt=""
                      />
                    )}
                    <div className="wr-detail__action-row">
                      <img src={`${ASSET}/ellipse-dot.svg`} alt="" />
                      <span>
                        {action.label}
                        {action.conditional && <em> — {action.conditional}</em>}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="wr-detail__fade" aria-hidden="true" />
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
