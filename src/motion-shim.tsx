/**
 * Shim for motion/react — passes through to plain React elements
 * when the real `motion` package isn't available.
 */
import React from 'react';

type AnyProps = Record<string, unknown>;

function makeMotionComponent(tag: string) {
  return React.forwardRef<HTMLElement, AnyProps>(function MotionEl(
    { children, whileHover, whileTap, initial, animate, exit, transition, layout, variants, ...rest },
    ref
  ) {
    return React.createElement(tag, { ...rest, ref }, children);
  });
}

const tags = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'button', 'a', 'ul', 'li', 'section', 'article', 'header',
  'footer', 'main', 'nav', 'aside', 'img', 'input', 'form',
  'label', 'select', 'textarea', 'svg', 'path', 'circle', 'rect',
];

export const motion: Record<string, ReturnType<typeof makeMotionComponent>> = {};
for (const tag of tags) {
  motion[tag] = makeMotionComponent(tag);
}

export function AnimatePresence({ children }: { children?: React.ReactNode; mode?: string; initial?: boolean }) {
  return <>{children}</>;
}

export type Easing = string | number[];
