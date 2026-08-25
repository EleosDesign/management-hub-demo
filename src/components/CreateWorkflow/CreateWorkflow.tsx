import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, type Easing } from "motion/react";
import "./CreateWorkflow.css";
import {
  createWorkflowEmptyState,
  createWorkflowScript,
  type Domain,
  type ReceiptDetailRow,
  type ScriptTurn,
} from "../../data/story";
import { useNavigate } from "react-router-dom";
import { ArrowUpRightIcon } from "../PlatformHome/ArrowUpRightIcon";
import { pressableButton, pressableCard, pressableIconButton } from "../../motion/interactions";

const ASSET = "/assets/create-workflow";
const SHARED_ASSET = "/assets/workflows-page";

const presetTheme: Record<
  Domain,
  { icon: string; gradientFrom: string; textColor: string }
> = {
  Compliance: {
    icon: `${SHARED_ASSET}/clipboard-text-fill.svg`,
    gradientFrom: "var(--color-cyan-50)",
    textColor: "var(--color-cyan-900)",
  },
  "Revenue Cycle": {
    icon: `${SHARED_ASSET}/money-wavy-fill.svg`,
    gradientFrom: "var(--color-deeppurple-50)",
    textColor: "var(--color-deeppurple-800)",
  },
  Clinical: {
    icon: `${SHARED_ASSET}/hand-heart-fill.svg`,
    gradientFrom: "var(--color-blue-50)",
    textColor: "var(--color-info-dark)",
  },
};

const receiptIcon: Record<ReceiptDetailRow["icon"], string> = {
  trigger: `${ASSET}/paper-plane-tilt-fill.svg`,
  population: `${ASSET}/users-fill.svg`,
  evidence: `${ASSET}/file-text-fill.svg`,
  caseTiming: `${ASSET}/clock-fill.svg`,
  owner: `${ASSET}/owner-fill.svg`,
};

type ReceiptSectionName = "Intent" | "Scope" | "Logic" | "Validation" | "Commitment";

const THINKING_DURATION_MS = 3000;
const WORD_STAGGER_S = 0.06;
const WORD_DURATION_S = 0.18;
const BETWEEN_TURN_GAP_S = 0.15;

/** Choreography for the reveal that follows submitting the workflow prompt:
 * the two columns fade in as empty shells, then the user's message, then
 * the receipt content, then (via startBatch) the thinking indicator and the
 * first AI turn. Each stage waits for the previous one's animation to
 * settle before starting. */
const COLUMN_FADE_S = 0.5;
const COLUMN_STAGE_GAP_S = 0.2;
const MESSAGE_FADE_S = 0.35;
const MESSAGE_STAGE_GAP_S = 0.25;
const RECEIPT_CONTENT_FADE_S = 0.45;
const RECEIPT_STAGE_GAP_S = 0.2;

type RevealStage = "columns" | "message" | "receipt" | "flow";
const revealStageOrder: RevealStage[] = ["columns", "message", "receipt", "flow"];

const columnVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: COLUMN_FADE_S, ease: "easeOut" as const } },
};

const receiptContentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: RECEIPT_CONTENT_FADE_S, ease: "easeOut" as const },
  },
};

const messageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: MESSAGE_FADE_S, ease: "easeOut" as const },
  },
};

function isGateTurn(turn: ScriptTurn) {
  return turn.kind === "confirm" || turn.kind === "question" || turn.kind === "validation-results";
}

/** How long AnimatedText takes to finish revealing a given string, in seconds. */
function textRevealDuration(text: string): number {
  const wordCount = text.split(" ").length;
  return (wordCount - 1) * WORD_STAGGER_S + WORD_DURATION_S;
}

/** How long a non-gate turn takes to finish revealing itself before the next
 * turn in the same batch may start — gates aren't included, they're the stop
 * point of a batch and wait for a click instead of a timer. */
function turnRevealDuration(turn: ScriptTurn): number {
  if (turn.kind === "statement") return textRevealDuration(turn.text) + BETWEEN_TURN_GAP_S;
  if (turn.kind === "validation-results") return 0.3 + BETWEEN_TURN_GAP_S;
  return 0;
}

/** Renders text as individually-animated words that settle into place. */
function AnimatedText({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <p className={className}>
      {words.flatMap((word, i) => {
        const span = (
          <motion.span
            key={`w-${i}`}
            className="cw-word"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: WORD_DURATION_S, delay: i * WORD_STAGGER_S, ease: "easeOut" }}
          >
            {word}
          </motion.span>
        );
        return i < words.length - 1 ? [span, " "] : [span];
      })}
    </p>
  );
}

/** Wraps the selector buttons so they only reveal once the text above them
 * has finished animating in — a sequence, not a simultaneous appearance.
 * Stays non-interactive until then, so a fast click can't land on a still-
 * invisible button. */
function RevealAfterText({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  const delay = textRevealDuration(text);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setRevealed(true), delay * 1000);
    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      style={{ pointerEvents: revealed ? "auto" : "none" }}
    >
      {children}
    </motion.div>
  );
}

export default function CreateWorkflow() {
  const [input, setInput] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [mountedCount, setMountedCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState("");
  const [revealStage, setRevealStage] = useState<RevealStage>("columns");
  const [textReveal, setTextReveal] = useState<{
    phase: "fade-out" | "reveal";
    text: string;
  } | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const pendingTimeoutsRef = useRef<number[]>([]);
  const lastConfirmTurnIndexRef = useRef<number | null>(null);
  const presetRevealTimeoutRef = useRef<number | null>(null);

  /** Live-tunable timing for the confirm chip-row selection transition —
   * fade the deselected chip, then ease the kept one into place. */
  const chipTransition = {
    layout: { duration: 0.25, delay: 0.1, ease: "easeOut" },
    fade: { duration: 0.3 },
  };

  const presetTextReveal = {
    fadeOutDuration: 0.15,
    delay: 0.1,
    fadeInDuration: 0.18,
  };

  const flowColumnsStyle = {
    columnGap: 16,
    transcript: {
      borderRadius: 16,
      padding: 16,
      gap: 16,
    },
    receipt: {
      borderRadius: 16,
      paddingY: 24,
      paddingRight: 16,
      paddingLeft: 16,
    },
  };

  function stageAtLeast(stage: RevealStage) {
    return revealStageOrder.indexOf(revealStage) >= revealStageOrder.indexOf(stage);
  }

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [mountedCount, submittedMessage, isThinking, revealStage]);

  useEffect(() => {
    return () => {
      pendingTimeoutsRef.current.forEach(clearTimeout);
      if (presetRevealTimeoutRef.current !== null) {
        window.clearTimeout(presetRevealTimeoutRef.current);
      }
    };
  }, []);

  function afterDelay(ms: number, fn: () => void) {
    const id = window.setTimeout(fn, ms);
    pendingTimeoutsRef.current.push(id);
  }

  /** Quickly fades out whatever text is currently showing, then drops the
   * preset's description straight into the real input (so it's submittable
   * immediately) and fades it in — also used when switching between
   * presets, restarting the sequence from scratch. */
  function revealPresetInput(text: string) {
    if (presetRevealTimeoutRef.current !== null) {
      window.clearTimeout(presetRevealTimeoutRef.current);
      presetRevealTimeoutRef.current = null;
    }

    function startReveal() {
      setInput(text);
      setTextReveal(null);
      requestAnimationFrame(() => setTextReveal({ phase: "reveal", text }));
      presetRevealTimeoutRef.current = window.setTimeout(() => {
        setTextReveal(null);
        presetRevealTimeoutRef.current = null;
      }, presetTextReveal.fadeInDuration * 1000);
    }

    if (input.trim()) {
      setTextReveal({ phase: "fade-out", text: input });
      presetRevealTimeoutRef.current = window.setTimeout(
        startReveal,
        (presetTextReveal.fadeOutDuration + presetTextReveal.delay) * 1000,
      );
    } else {
      startReveal();
    }
  }

  /** Reveals turns[fromIndex] onward, one at a time. Non-gate turns
   * auto-chain into the next after their own reveal duration; a gate turn
   * stops the chain and waits for the user to click an option. */
  function revealFrom(fromIndex: number) {
    const turns = createWorkflowScript.turns;
    if (fromIndex >= turns.length) return;
    const turn = turns[fromIndex];
    setMountedCount(fromIndex + 1);
    if (!isGateTurn(turn)) {
      afterDelay(turnRevealDuration(turn) * 1000, () => revealFrom(fromIndex + 1));
    }
  }

  /** Shows the "Thinking…" status for the turn at `fromIndex`, then starts
   * revealing the batch that follows. */
  function startBatch(fromIndex: number) {
    const turns = createWorkflowScript.turns;
    const label = turns[fromIndex]?.thinkingLabel ?? "Thinking";
    setIsThinking(true);
    setThinkingLabel(label);
    afterDelay(THINKING_DURATION_MS, () => {
      setIsThinking(false);
      revealFrom(fromIndex);
    });
  }

  const sectionGateOrder = useMemo(() => {
    const order: Partial<Record<ReceiptSectionName, number>> = {};
    let gateIndex = 0;
    for (const turn of createWorkflowScript.turns) {
      if (turn.kind === "confirm") {
        gateIndex++;
        order[turn.completesSection] = gateIndex;
      } else if (turn.kind === "question") {
        gateIndex++;
        if (turn.completesSection) order[turn.completesSection] = gateIndex;
      }
    }
    return order;
  }, []);

  const visibleTurns = useMemo(
    () =>
      createWorkflowScript.turns
        .slice(0, mountedCount)
        .map((turn, index) => ({ turn, index })),
    [mountedCount],
  );

  const isSectionSet = (section: ReceiptSectionName) => {
    if (section === "Validation") return answeredCount >= (sectionGateOrder["Commitment"] ?? Infinity);
    return answeredCount >= (sectionGateOrder[section] ?? Infinity);
  };

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setSubmittedMessage(trimmed);
    setRevealStage("columns");
    afterDelay((COLUMN_FADE_S + COLUMN_STAGE_GAP_S) * 1000, () => {
      setRevealStage("message");
      afterDelay((MESSAGE_FADE_S + MESSAGE_STAGE_GAP_S) * 1000, () => {
        setRevealStage("receipt");
        afterDelay((RECEIPT_CONTENT_FADE_S + RECEIPT_STAGE_GAP_S) * 1000, () => {
          setRevealStage("flow");
          startBatch(0);
        });
      });
    });
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleAnswer(turnIndex: number, optionIndex: number) {
    if (createWorkflowScript.turns[turnIndex].kind === "confirm") {
      lastConfirmTurnIndexRef.current = turnIndex;
    }
    setSelectedOptions((prev) => ({ ...prev, [turnIndex]: optionIndex }));
    setAnsweredCount((prev) => prev + 1);
    startBatch(turnIndex + 1);
  }

  /** Rewinds to just before the most recently answered confirm turn, so its
   * chip row becomes clickable again — a way to replay the selection
   * transition while tuning it live in the DialKit panel. */
  function handleReplayChipRow() {
    const turnIndex = lastConfirmTurnIndexRef.current;
    if (turnIndex === null) return;
    pendingTimeoutsRef.current.forEach(clearTimeout);
    pendingTimeoutsRef.current = [];
    setIsThinking(false);
    setAnsweredCount((prev) => Math.max(0, prev - 1));
    setSelectedOptions((prev) => {
      const next = { ...prev };
      delete next[turnIndex];
      return next;
    });
    setMountedCount(turnIndex + 1);
  }

  function renderTurn(item: { turn: ScriptTurn; index: number }, isPending: boolean) {
    const { turn, index } = item;
    const selected = selectedOptions[index];

    return (
      <motion.div
        key={index}
        className="cw-turn"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {turn.sectionDivider && (
          <div className="cw-divider">
            <span className="cw-divider__label">{turn.sectionDivider}</span>
            <span className="cw-divider__line" />
          </div>
        )}

        {turn.kind === "statement" && (
          <AnimatedText text={turn.text} className="cw-ai-line" />
        )}

        {turn.kind === "confirm" && (() => {
          const lastQ = turn.text.lastIndexOf(". ", turn.text.length - 2);
          const bodyText = lastQ !== -1 ? turn.text.slice(0, lastQ + 1) : turn.text;
          const questionText = lastQ !== -1 ? turn.text.slice(lastQ + 2) : "";
          return (
            <div className="cw-confirm">
              <AnimatedText text={bodyText} className="cw-ai-line" />
              {questionText && (
                <RevealAfterText text={bodyText}>
                  <p className="cw-confirm__question">{questionText}</p>
                </RevealAfterText>
              )}
              <RevealAfterText text={turn.text}>
                <div className="cw-chip-row">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {turn.options
                      .map((option, optionIndex) => ({ option, optionIndex }))
                      .filter(
                        ({ optionIndex }) =>
                          selected === undefined || optionIndex === selected,
                      )
                      .map(({ option, optionIndex }) => (
                        <motion.button
                          key={option.label}
                          type="button"
                          layout
                          exit={{ opacity: 0 }}
                          transition={{
                            layout: {
                              duration: chipTransition.layout.duration,
                              delay: chipTransition.layout.delay,
                              ease: chipTransition.layout.ease as Easing,
                            },
                            opacity: { duration: chipTransition.fade.duration, ease: "easeOut" },
                          }}
                          className={
                            "cw-chip" +
                            (selected === optionIndex ? " cw-chip--primary cw-chip--selected" : "")
                          }
                          disabled={!isPending}
                          onClick={() => handleAnswer(index, optionIndex)}
                        >
                          <span className="cw-chip__number">{optionIndex + 1}</span>
                          <span>{option.label}</span>
                        </motion.button>
                      ))}
                  </AnimatePresence>
                </div>
              </RevealAfterText>
            </div>
          );
        })()}

        {turn.kind === "question" && (
          <div className="cw-question">
            <div className="cw-question__meta">
              <span className="cw-question__label">
                Question {turn.questionNumber} of {turn.questionCount} ·{" "}
                {turn.topic}
              </span>
            </div>
            <AnimatedText text={turn.prompt} className="cw-ai-line" />
            <RevealAfterText text={turn.prompt}>
              <div className="cw-option-list">
                <AnimatePresence initial={false}>
                  {turn.options
                    .map((option, optionIndex) => ({ option, optionIndex }))
                    .filter(
                      ({ optionIndex }) =>
                        selected === undefined || optionIndex === selected,
                    )
                    .map(({ option, optionIndex }) => (
                      <motion.div
                        key={option.label}
                        layout
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <motion.button
                          type="button"
                          className={
                            "cw-option" +
                            (selected === optionIndex ? " cw-option--selected" : "")
                          }
                          disabled={!isPending}
                          onClick={() => handleAnswer(index, optionIndex)}
                        >
                          <span className="cw-option__number">{optionIndex + 1}</span>
                          <span>{option.label}</span>
                        </motion.button>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </RevealAfterText>
          </div>
        )}

        {turn.kind === "validation-results" && (
          <div className="cw-validation-card">
            <div className="cw-validation-card__rows">
              <div className="cw-validation-row">
                <span>Scanned</span>
                <span>{turn.scanned}</span>
              </div>
              <div className="cw-validation-row">
                <span>Matches</span>
                <span>{turn.matches}</span>
              </div>
              <div className="cw-validation-row">
                <span>High-confidence / ambiguous</span>
                <span>{turn.confidenceSplit}</span>
              </div>
              <div className="cw-validation-row">
                <span>Expected clinician evidence requests</span>
                <span>{turn.expectedEvidenceRequests}</span>
              </div>
            </div>
            <motion.button type="button" className="cw-validation-card__cta" onClick={() => handleAnswer(index, 0)} {...pressableButton}>
              {turn.sampleCasesLabel}
            </motion.button>
          </div>
        )}
      </motion.div>
    );
  }

  function renderReceiptSection({
    title,
    isSet,
    content,
    isLast = false,
  }: {
    title: string;
    isSet: boolean;
    content: ReactNode;
    isLast?: boolean;
  }) {
    return (
      <div className="cw-receipt-section" key={title}>
        <div className="cw-receipt-section__rail">
          <span
            className={
              "cw-receipt-dot" + (isSet ? " cw-receipt-dot--set" : "")
            }
          />
          {!isLast && <span className="cw-receipt-section__line" />}
        </div>
        <div className={"cw-receipt-section__body" + (!isSet ? " cw-receipt-section__body--pending" : "")}>
          <div className="cw-receipt-section__head">
            <span className="cw-receipt-section__title">{title}</span>
          </div>
          {content}
        </div>
      </div>
    );
  }

  function renderReceiptRow(row: ReceiptDetailRow, showIcon = true) {
    return (
      <div className="cw-receipt-row" key={row.label}>
        {showIcon && (
          <div className="cw-receipt-row__icon">
            <img src={receiptIcon[row.icon]} alt="" />
          </div>
        )}
        <div className="cw-receipt-row__text">
          <span className="cw-receipt-row__label">{row.label}</span>
          <span className="cw-receipt-row__value">{row.value}</span>
        </div>
      </div>
    );
  }

  const { receipt } = createWorkflowScript;
  const scopeSet = isSectionSet("Scope");
  const logicSet = isSectionSet("Logic");
  const validationSet = isSectionSet("Validation");

  return (
    <div className="create-workflow">
      <div className="cw-column">
        <div className="cw-card">
          <button className="cw-back-btn" type="button" onClick={() => navigate("/workflows")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Workflows
          </button>
          <h1 className="cw-title">Create a Workflow</h1>

          {submittedMessage === null ? (
            <div className="cw-empty">
              <div className="cw-prompt-box">
                <p
                  className="cw-prompt-box__headline"
                  style={{ cursor: "pointer" }}
                  onClick={() => revealPresetInput("Identify clients with fewer than three authorized units. Check whether recent documentation supports continued care. Create an RCM task, and notify the clinician when required evidence is missing")}
                >
                  {createWorkflowEmptyState.headline}
                </p>
                <div className="cw-prompt-box__input">
                  <div className="cw-textarea-wrap">
                    <textarea
                      className={"cw-textarea" + (textReveal ? " cw-textarea--revealing" : "")}
                      placeholder={createWorkflowEmptyState.placeholder}
                      value={input}
                      onChange={(e) => {
                        if (presetRevealTimeoutRef.current !== null) {
                          window.clearTimeout(presetRevealTimeoutRef.current);
                          presetRevealTimeoutRef.current = null;
                        }
                        setTextReveal(null);
                        setInput(e.target.value);
                      }}
                      onKeyDown={handleTextareaKeyDown}
                    />
                    {textReveal && (
                      <div
                        className={`cw-textarea-shimmer cw-textarea-shimmer--${textReveal.phase}`}
                        style={
                          {
                            "--fade-out-duration": `${presetTextReveal.fadeOutDuration}s`,
                            "--fade-in-duration": `${presetTextReveal.fadeInDuration}s`,
                          } as CSSProperties
                        }
                        aria-hidden="true"
                      >
                        {textReveal.text}
                      </div>
                    )}
                  </div>
                  <div className="cw-prompt-box__submit-row">
                    <motion.button
                      type="button"
                      className="cw-submit-button"
                      disabled={!input.trim()}
                      onClick={handleSubmit}
                      aria-label="Submit"
                      {...(input.trim() ? pressableIconButton : {})}
                    >
                      <img src={`${ASSET}/arrow-up.svg`} alt="" />
                    </motion.button>
                  </div>
                </div>
              </div>

              <div className="cw-presets">
                <span className="cw-presets__label">
                  Get started with workflows:
                </span>
                <div className="cw-presets__row-wrapper">
                  <div className="cw-presets__row">
                    {createWorkflowEmptyState.presets.map((preset) => {
                      const theme = presetTheme[preset.domain];
                      return (
                        <motion.button
                          type="button"
                          className="cw-preset-card"
                          key={preset.domain}
                          style={
                            {
                              "--preset-gradient-from": theme.gradientFrom,
                            } as CSSProperties
                          }
                          onClick={() => revealPresetInput(preset.description)}
                          {...pressableCard}
                        >
                          <div className="cw-preset-card__body">
                            <div className="cw-preset-card__label-row">
                              <img src={theme.icon} alt="" />
                              <span style={{ color: theme.textColor }}>
                                {preset.domain}
                              </span>
                            </div>
                            <p>{preset.description}</p>
                          </div>
                          <span className="cw-preset-card__corner">
                            <ArrowUpRightIcon color="var(--color-text-secondary-alt)" />
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <div className="cw-presets__fade" aria-hidden="true" />
                </div>
              </div>
            </div>
          ) : (
            <div className="cw-flow" style={{ gap: flowColumnsStyle.columnGap }}>
              <motion.div
                className="cw-transcript"
                ref={transcriptRef}
                initial="hidden"
                animate="visible"
                variants={columnVariants}
                style={{
                  borderRadius: flowColumnsStyle.transcript.borderRadius,
                  padding: flowColumnsStyle.transcript.padding,
                  gap: flowColumnsStyle.transcript.gap,
                }}
              >
                <motion.div
                  className="cw-user-bubble"
                  initial="hidden"
                  animate={stageAtLeast("message") ? "visible" : "hidden"}
                  variants={messageVariants}
                >
                  <p>{submittedMessage}</p>
                </motion.div>
                {visibleTurns.map((item, i) => {
                  const isLast = i === visibleTurns.length - 1;
                  const isPending =
                    isLast &&
                    isGateTurn(item.turn) &&
                    selectedOptions[item.index] === undefined;
                  return renderTurn(item, isPending);
                })}
                <AnimatePresence>
                  {isThinking && (
                    <motion.div
                      className="cw-thinking"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="cw-thinking__dot" />
                      <span className="cw-thinking__label">{thinkingLabel}…</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div
                className="cw-receipt"
                initial="hidden"
                animate="visible"
                variants={columnVariants}
                style={{
                  borderRadius: flowColumnsStyle.receipt.borderRadius,
                  padding: `${flowColumnsStyle.receipt.paddingY}px ${flowColumnsStyle.receipt.paddingRight}px ${flowColumnsStyle.receipt.paddingY}px ${flowColumnsStyle.receipt.paddingLeft}px`,
                }}
              >
                <p className="cw-receipt__label">Progress</p>
                <motion.div
                  className="cw-receipt__content"
                  initial="hidden"
                  animate={stageAtLeast("receipt") ? "visible" : "hidden"}
                  variants={receiptContentVariants}
                >
                  {renderReceiptSection({
                    title: "Intent",
                    isSet: isSectionSet("Intent"),
                    content: <p className="cw-receipt__text">{receipt.intent}</p>,
                  })}
                  {renderReceiptSection({
                    title: "Scope",
                    isSet: scopeSet,
                    content: scopeSet ? (
                      <div className="cw-receipt__rows">
                        {receipt.scope.map((row) => renderReceiptRow(row))}
                      </div>
                    ) : (
                      <p className="cw-receipt__pending">
                        {receipt.scopePendingLabel}
                      </p>
                    ),
                  })}
                  {renderReceiptSection({
                    title: "Logic",
                    isSet: logicSet,
                    content: logicSet ? (
                      <div className="cw-receipt__rows">
                        {receipt.logic.map((row) => renderReceiptRow(row))}
                      </div>
                    ) : (
                      <p className="cw-receipt__pending">
                        {receipt.logicPendingLabel}
                      </p>
                    ),
                  })}
                  {renderReceiptSection({
                    title: "Validation",
                    isSet: validationSet,
                    content: validationSet ? (
                      <div className="cw-receipt__rows">
                        {receipt.validation.map((row) => renderReceiptRow(row, false))}
                      </div>
                    ) : (
                      <p className="cw-receipt__pending">
                        {receipt.validationPending}
                      </p>
                    ),
                  })}
                  {renderReceiptSection({
                    title: "Commitment",
                    isSet: isSectionSet("Commitment"),
                    isLast: true,
                    content: (
                      <p className={isSectionSet("Commitment") ? "cw-receipt__text" : "cw-receipt__pending"}>
                        {receipt.commitmentPending}
                      </p>
                    ),
                  })}
                </motion.div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
