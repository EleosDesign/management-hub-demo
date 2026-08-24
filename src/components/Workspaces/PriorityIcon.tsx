import type { Priority } from "../../data/story";

const priorityColor: Record<Priority, string> = {
  Critical: "var(--color-priority-critical)",
  High: "var(--color-priority-high)",
  Medium: "var(--color-priority-medium)",
};

/**
 * Inline (not <img>) so each priority tier can tint the same glyph family
 * via its own --color-priority-* token — an externally-referenced SVG file
 * bakes in one fixed color and can't do that per instance.
 */
export function PriorityIcon({ priority }: { priority: Priority }) {
  const color = priorityColor[priority];

  if (priority === "Critical") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M8 1.5C6.71442 1.5 5.45771 1.88122 4.38879 2.59545C3.31987 3.30968 2.48675 4.32484 1.99478 5.51256C1.50281 6.70028 1.37409 8.00721 1.6249 9.26809C1.8757 10.529 2.49476 11.6872 3.40381 12.5962C4.31285 13.5052 5.47104 14.1243 6.73191 14.3751C7.99279 14.6259 9.29972 14.4972 10.4874 14.0052C11.6752 13.5132 12.6903 12.6801 13.4046 11.6112C14.1188 10.5423 14.5 9.28558 14.5 8C14.4982 6.27665 13.8128 4.62441 12.5942 3.40582C11.3756 2.18722 9.72335 1.50182 8 1.5ZM7.5 5C7.5 4.86739 7.55268 4.74021 7.64645 4.64645C7.74021 4.55268 7.86739 4.5 8 4.5C8.13261 4.5 8.25979 4.55268 8.35355 4.64645C8.44732 4.74021 8.5 4.86739 8.5 5V8.5C8.5 8.63261 8.44732 8.75979 8.35355 8.85355C8.25979 8.94732 8.13261 9 8 9C7.86739 9 7.74021 8.94732 7.64645 8.85355C7.55268 8.75979 7.5 8.63261 7.5 8.5V5ZM8 11.5C7.85166 11.5 7.70666 11.456 7.58332 11.3736C7.45999 11.2912 7.36386 11.1741 7.30709 11.037C7.25032 10.9 7.23547 10.7492 7.26441 10.6037C7.29335 10.4582 7.36478 10.3246 7.46967 10.2197C7.57456 10.1148 7.7082 10.0433 7.85368 10.0144C7.99917 9.98547 8.14997 10.0003 8.28701 10.0571C8.42406 10.1139 8.54119 10.21 8.6236 10.3333C8.70601 10.4567 8.75 10.6017 8.75 10.75C8.75 10.9489 8.67098 11.1397 8.53033 11.2803C8.38968 11.421 8.19891 11.5 8 11.5Z"
          fill={color}
        />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1.75L15 13.75H1L8 1.75Z" fill={color} />
      <rect x="7.25" y="6.5" width="1.5" height="3.5" rx="0.75" fill="white" />
      <circle cx="8" cy="11.5" r="0.9" fill="white" />
    </svg>
  );
}
