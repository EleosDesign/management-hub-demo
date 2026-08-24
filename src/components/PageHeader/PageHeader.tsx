import { motion } from "motion/react";
import "./PageHeader.css";
import { orgInfo } from "../../data/story";
import { pressableIconButton } from "../../motion/interactions";

const ASSET = "/assets/workflows-page";

export function PageHeader() {
  return (
    <header className="ph-header">
      <div className="ph-header__identity">
        <div className="ph-avatar">
          <img src={`${ASSET}/user-avatar.png`} alt="" />
        </div>
        <div className="ph-greeting">
          <span className="ph-greeting__name">Hi {orgInfo.loggedInUser},</span>
          <span className="ph-greeting__org">
            {orgInfo.homeGreetingName} · {orgInfo.dateShown}
          </span>
        </div>
      </div>
      <div className="ph-header__actions">
        <motion.button
          className="ph-co-work-button"
          type="button"
          aria-label="Co-work"
          {...pressableIconButton}
        >
          <img src={`${ASSET}/co-work-icon-fill.svg`} alt="" />
        </motion.button>
        <motion.button
          className="ph-icon-button"
          type="button"
          aria-label="Search"
          {...pressableIconButton}
        >
          <img src={`${ASSET}/search-icon.svg`} alt="" />
        </motion.button>
      </div>
    </header>
  );
}
