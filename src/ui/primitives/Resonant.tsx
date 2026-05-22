/**
 * Resonant — a wrapper that emits a 1-shot resonance pulse on mount or
 * whenever its `pulse` key changes. Used to make every kernel op visually
 * felt without overwhelming motion.
 */
import React, { useEffect, useRef } from 'react';

interface ResonantProps {
  /** Toggle / increment to retrigger the pulse. */
  pulse?: number | string | null;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
}

export const Resonant: React.FC<ResonantProps> = ({
  pulse,
  className,
  style,
  children,
  as = 'div',
}) => {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('data-pulse', 'on');
    const t = window.setTimeout(() => el.removeAttribute('data-pulse'), 480);
    return () => window.clearTimeout(t);
  }, [pulse]);

  return React.createElement(
    as,
    { ref: ref as any, className, style },
    children,
  );
};
