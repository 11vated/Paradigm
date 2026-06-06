/**
 * ModePurposeHeader — small, always-visible header that gives the active
 * mode a clear purpose, dominant strata, and a 3×3 StrataRadar grid.
 *
 * Used by all 8 visible mode components to satisfy the "give each mode a
 * real purpose" requirement. Sits in the top-left of the center stage and
 * does not interfere with the existing artifact renderer's HUD.
 */
import React, { useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import {
  useMode, MODE_LABEL, MODE_HINT, MODE_NUM, MODE_STRATA, COMPASS_MODES, type Mode,
} from '@/stores/modeStore';
import { StrataRadar } from '@/components/studio/StrataRadar';

interface ModePurposeHeaderProps {
  /** Show the dominant strata (default true). */
  showStrata?: boolean;
  /** Show the inline 3×3 StrataRadar (default true). */
  showRadar?: boolean;
  /** Show mode-switcher mini pills (default true for 8-mode quick switch). */
  showSwitcher?: boolean;
  /** Override mode — defaults to active mode. */
  mode?: Mode;
}

export const ModePurposeHeader: React.FC<ModePurposeHeaderProps> = ({
  showStrata = true,
  showRadar = true,
  showSwitcher = true,
  mode: modeOverride,
}) => {
  const activeMode = useMode((s) => s.mode);
  const setMode = useMode((s) => s.setMode);
  const mode = modeOverride ?? activeMode;
  const seed = useActiveSeed((s) => s.seed);
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        className="p-mode-purpose-mini"
        onClick={() => setCollapsed(false)}
        title={`${MODE_NUM[mode]} · ${MODE_LABEL[mode]} — click to expand`}
        style={{
          position: 'absolute',
          left: 12,
          top: 12,
          zIndex: 13,
          all: 'unset',
          cursor: 'pointer',
          padding: '4px 10px',
          background: 'rgba(124,71,255,0.12)',
          border: '1px solid rgba(124,71,255,0.3)',
          borderRadius: 2,
          fontFamily: 'var(--r-font-mono, monospace)',
          fontSize: 9,
          color: 'var(--r-prism-core, #7c47ff)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        ▸ {MODE_NUM[mode]} · {MODE_LABEL[mode]}
      </button>
    );
  }

  return (
    <aside
      className="p-mode-purpose"
      data-mode={mode}
      role="region"
      aria-label={`${MODE_LABEL[mode]} mode purpose`}
      style={{
        position: 'absolute',
        left: 12,
        top: 12,
        zIndex: 13,
        maxWidth: 320,
        padding: '8px 10px',
        background: 'rgba(5, 5, 9, 0.78)',
        border: '1px solid rgba(124,71,255,0.25)',
        borderLeft: '2px solid var(--r-prism-core, #7c47ff)',
        borderRadius: 2,
        backdropFilter: 'blur(6px)',
        fontFamily: 'var(--r-font-prose, sans-serif)',
        color: 'var(--r-ink-1, #cfcfd9)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--r-font-num, monospace)',
            fontSize: 9,
            color: 'var(--r-prism-core, #7c47ff)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {MODE_NUM[mode]} · {MODE_LABEL[mode]}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Collapse mode header"
          style={{
            all: 'unset',
            cursor: 'pointer',
            marginLeft: 'auto',
            fontSize: 10,
            color: 'var(--r-ink-4)',
            padding: '0 4px',
          }}
        >
          ▴
        </button>
      </header>

      <p
        style={{
          fontSize: 11,
          lineHeight: 1.4,
          color: 'var(--r-ink-2)',
          margin: 0,
          fontStyle: 'italic',
        }}
      >
        {MODE_HINT[mode]}
      </p>

      {showStrata && (
        <div
          style={{
            marginTop: 4,
            fontFamily: 'var(--r-font-mono, monospace)',
            fontSize: 8,
            color: 'var(--r-prism-core, #7c47ff)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            opacity: 0.85,
          }}
        >
          dominant strata · {MODE_STRATA[mode].join(' + ')}
        </div>
      )}

      {showRadar && seed && (
        <div style={{ marginTop: 8 }}>
          <StrataRadar seed={seed} density="compact" />
        </div>
      )}

      {showSwitcher && (
        <div
          role="group"
          aria-label="Quick mode switcher"
          style={{
            display: 'flex',
            gap: 2,
            marginTop: 8,
            flexWrap: 'wrap',
          }}
        >
          {COMPASS_MODES.map((m) => {
            const active = m === mode;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                title={`${MODE_NUM[m]} · ${MODE_LABEL[m]}`}
                data-active={active}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: 2,
                  fontFamily: 'var(--r-font-mono, monospace)',
                  fontSize: 8,
                  background: active ? 'var(--r-prism-core, #7c47ff)' : 'rgba(255,255,255,0.04)',
                  color: active ? 'var(--r-void-0)' : 'var(--r-ink-3)',
                  border: '1px solid',
                  borderColor: active ? 'var(--r-prism-core, #7c47ff)' : 'var(--r-ink-5)',
                }}
              >
                {MODE_NUM[m]} {MODE_LABEL[m].slice(0, 4)}
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
};

export default ModePurposeHeader;
