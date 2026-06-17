/**
 * ModeCompass — 8-mode depth navigator for the center stage.
 *
 * Shows the 8 visible modes (the 9th & 10th — Substrate, Sovereignty — live
 * in the status bar / /substrate route). Each button reveals the mode's
 * purpose on hover. The active mode's hint is always visible at the top.
 */
import React from 'react';
import { useMode, COMPASS_MODES, MODE_LABEL, MODE_HINT, MODE_NUM, MODE_STRATA } from '@/stores/modeStore';

export const ModeCompass = React.memo(() => {
  const { mode, setMode } = useMode();

  return (
    <div
      role="navigation"
      aria-label="Mode compass"
      style={{
        position: 'absolute',
        right: 12,
        bottom: 36,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
        zIndex: 12,
        pointerEvents: 'auto',
        maxWidth: 280,
      }}
    >
      {/* Active mode hint (always visible when compass is open) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 2,
          textAlign: 'right',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--r-font-mono, monospace)',
            fontSize: 8,
            color: 'var(--r-ink-4)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {MODE_NUM[mode]} · {MODE_LABEL[mode]}
        </span>
        <span
          style={{
            fontFamily: 'var(--r-font-prose, sans-serif)',
            fontSize: 10,
            color: 'var(--r-ink-2)',
            fontStyle: 'italic',
            maxWidth: 240,
            lineHeight: 1.3,
          }}
        >
          {MODE_HINT[mode]}
        </span>
        <span
          style={{
            fontFamily: 'var(--r-font-mono, monospace)',
            fontSize: 7,
            color: 'var(--r-prism-core)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            opacity: 0.7,
          }}
        >
          strata · {MODE_STRATA[mode].join(' + ')}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxWidth: 240, justifyContent: 'flex-end' }}>
        {COMPASS_MODES.map((m) => {
          const active = m === mode;
          return (
            <button
              key={m}
              type="button"
              title={`${MODE_NUM[m]} · ${MODE_LABEL[m]} — ${MODE_HINT[m]}`}
              onClick={() => setMode(m)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '1px solid',
                borderColor: active
                  ? 'color-mix(in oklab, var(--r-prism-core) 60%, transparent)'
                  : 'var(--r-ink-4)',
                background: active
                  ? 'color-mix(in oklab, var(--r-prism-core) 15%, transparent)'
                  : 'rgba(0,0,0,0.2)',
                color: active ? 'var(--r-ink-0)' : 'var(--r-ink-3)',
                fontFamily: 'var(--r-font-num)',
                fontSize: 9,
                cursor: 'pointer',
              }}
            >
              {MODE_NUM[m]}
            </button>
          );
        })}
      </div>
    </div>
  );
});
