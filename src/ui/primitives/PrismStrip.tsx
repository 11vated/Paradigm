/**
 * PrismStrip — the spectral signature of a seed.
 *
 * Renders a thin animated gradient whose 6 colour stops + frequency are
 * deterministically derived from the active seed's hash. Used as:
 *  - the underline of the active seed in the TopBar
 *  - the column dividers between panes
 *  - the band beneath the AgentPanel header
 *  - the resonance silhouette in the SeedSilhouetteBar
 */
import React, { useMemo } from 'react';
import { useSeedTheme, themeToCssVars } from '@/hooks/useSeedTheme';

interface PrismStripProps {
  /** Override the seed source. Defaults to the local activeSeed. */
  hash?: string | null;
  orient?: 'h' | 'v';
  /** Visual thickness override; defaults from CSS. */
  thickness?: number;
  /** Inline style hook-through. */
  style?: React.CSSProperties;
  className?: string;
}

export const PrismStrip: React.FC<PrismStripProps> = ({
  hash,
  orient = 'h',
  thickness,
  style,
  className,
}) => {
  const theme = useSeedTheme(hash ?? null);
  const cssVars = useMemo(() => themeToCssVars(theme), [theme]);

  const sizeStyle: React.CSSProperties =
    orient === 'h'
      ? thickness !== undefined ? { height: thickness } : {}
      : thickness !== undefined ? { width: thickness } : {};

  return (
    <div
      aria-hidden
      className={`r-prism${className ? ' ' + className : ''}`}
      data-orient={orient}
      style={{ ...cssVars, ...sizeStyle, ...style } as React.CSSProperties}
    />
  );
};
