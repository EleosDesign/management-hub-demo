import type { Transition } from "motion/react";

/* ─────────────────────────────────────────────────────────────────────
 * INTERACTION FEEDBACK
 *
 * Shared hover/tap presets for every clickable element in the app —
 * buttons, icon buttons, and cards each get one consistent feel instead
 * of being tuned per component. Spread onto a `motion.*` element:
 *
 *   <motion.button {...pressableButton} onClick={...}>
 *
 * Tune the values here; every consumer picks it up automatically.
 * ───────────────────────────────────────────────────────────────────── */

const BUTTON_SPRING: Transition = { type: "spring", stiffness: 500, damping: 30 };
const CARD_SPRING: Transition = { type: "spring", stiffness: 300, damping: 26 };

/** Standard text/icon buttons — "Create a workflow", tab CTAs, etc.
 * No hover motion — the pointer cursor is the hover cue; tap still animates. */
export const pressableButton = {
  whileTap: { scale: 0.96 },
  transition: BUTTON_SPRING,
};

/** Small square icon-only buttons (35×35 "more options" / search / co-work) —
 * a slightly bigger swing on tap so the feedback reads at that size. */
export const pressableIconButton = {
  whileTap: { scale: 0.9 },
  transition: BUTTON_SPRING,
};

/** Large clickable surfaces — workspace cards, preset cards.
 * No hover motion — the pointer cursor is the hover cue; tap still animates. */
export const pressableCard = {
  whileTap: { scale: 0.98, y: 0 },
  transition: CARD_SPRING,
};
