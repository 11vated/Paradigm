/**
 * MarketplacePulse — scrolling micro-strip of recent network events.
 *
 * Phase A: deterministic placeholder events derived from the date so the
 * strip is alive without depending on a working backend yet. Phase F
 * replaces this with /api/ambient/marketplace/stream.
 */
import React, { useMemo } from 'react';

interface PulseEvent {
  kind: 'mint' | 'breed' | 'list' | 'royalty' | 'sign';
  text: string;
}

const PLACEHOLDER: PulseEvent[] = [
  { kind: 'mint',    text: 'mint · friend#a3f2 · 2.40 ETH' },
  { kind: 'breed',   text: 'breed · sprite#bb71 × sprite#ce40' },
  { kind: 'royalty', text: 'royalty · +0.14 PARA · world#7f' },
  { kind: 'list',    text: 'list · narrative#9a · 0.08 ETH' },
  { kind: 'sign',    text: 'sign · friend#c1d4 · ed25519' },
  { kind: 'mint',    text: 'mint · world#88a1 · 1.10 ETH' },
];

export const MarketplacePulse: React.FC = () => {
  // For Phase A, just rotate the placeholder list slowly so the strip
  // feels live without polling. Deterministic per-day order.
  const events = useMemo(() => {
    const day = Math.floor(Date.now() / 86_400_000);
    const start = day % PLACEHOLDER.length;
    return [
      ...PLACEHOLDER.slice(start),
      ...PLACEHOLDER.slice(0, start),
    ];
  }, []);

  return (
    <div
      className="r-marketplace"
      style={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        position: 'relative',
        height: 24,
        maskImage:
          'linear-gradient(to right, transparent 0, #000 32px, #000 calc(100% - 32px), transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0, #000 32px, #000 calc(100% - 32px), transparent 100%)',
      }}
      aria-label="Marketplace pulse"
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          whiteSpace: 'nowrap',
          fontFamily: 'var(--r-font-display)',
          fontSize: 11,
          color: 'var(--r-ink-2)',
          letterSpacing: '0.04em',
          animation: 'r-pulse-scroll 60s linear infinite',
        }}
      >
        {[...events, ...events, ...events].map((e, i) => (
          <span key={`${e.text}-${i}`} style={{ display: 'inline-flex', gap: 6 }}>
            <span style={{ color: 'var(--r-ink-3)' }}>·</span>
            {e.text}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes r-pulse-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.33%); }
        }
      `}</style>
    </div>
  );
};
