/**
 * LeftRail — Threads · Library · Sovereignty · Modes.
 *
 * Four collapsible sections. The Modes section doubles as a status
 * panel for the canvas (the active mode glows).
 */
import React, { useState } from 'react';
import { useAgentThreads } from '@/stores/agentThreads';
import { useMode, MODES, MODE_LABEL, MODE_HINT, type Mode } from '@/stores/modeStore';
import { useActiveSeed } from '@/stores/activeSeed';
import { PrismStrip } from '@/ui/primitives/PrismStrip';

const Section: React.FC<{
  label: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ label, children, aside, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      style={{
        borderBottom: '1px solid var(--r-ink-4)',
        padding: 'var(--r-px-5) var(--r-px-5)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: open ? 'var(--r-px-3)' : 0,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <span
          style={{
            fontFamily: 'var(--r-font-display)',
            fontSize: 9,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--r-ink-3)',
          }}
        >
          {label}
        </span>
        <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 8, color: 'var(--r-ink-4)' }}>
          {open ? '−' : '+'}
        </span>
      </header>
      {open && children}
    </section>
  );
};

export const LeftRail: React.FC = () => {
  const { threads, currentThreadId, setCurrent, newThread } = useAgentThreads();
  const { mode, setMode } = useMode();
  const seed = useActiveSeed((s) => s.seed);

  return (
    <aside
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
        overflowY: 'auto',
      }}
    >
      <Section
        label="Threads"
        aside={
          <button
            onClick={(e) => { e.stopPropagation(); newThread(); }}
            className="r-btn"
            style={{ height: 18, padding: '0 6px', fontSize: 9 }}
          >
            +
          </button>
        }
      >
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 3 }}>
          {threads.map((t) => {
            const active = t.id === currentThreadId;
            return (
              <li key={t.id}>
                <button
                  onClick={() => setCurrent(t.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 6px',
                    background: active
                      ? 'color-mix(in oklab, var(--r-prism-core) 8%, transparent)'
                      : 'transparent',
                    border: '1px solid',
                    borderColor: active
                      ? 'color-mix(in oklab, var(--r-prism-core) 40%, var(--r-ink-4))'
                      : 'transparent',
                    color: active ? 'var(--r-ink-0)' : 'var(--r-ink-2)',
                    fontFamily: 'var(--r-font-prose)',
                    fontSize: 11,
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 'var(--r-radius-1)',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: 9999,
                      background: active ? 'var(--r-prism-core)' : 'var(--r-ink-3)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--r-font-num)',
                      fontSize: 9,
                      color: 'var(--r-ink-3)',
                    }}
                  >
                    {t.turns.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section label="Library">
        {seed ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              padding: '5px 6px',
              border: '1px solid var(--r-ink-4)',
              borderRadius: 'var(--r-radius-1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PrismStrip hash={seed.hash} thickness={2} style={{ width: 24 }} />
              <span style={{ fontSize: 11, color: 'var(--r-ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {seed.name}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--r-font-num)',
                fontSize: 9,
                color: 'var(--r-ink-3)',
                letterSpacing: '0.04em',
              }}
            >
              {seed.domain} · gen {seed.generation ?? 0}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--r-ink-3)' }}>no seed yet</div>
        )}
      </Section>

      <Section label="Sovereignty" defaultOpen={false}>
        <div style={{ fontSize: 10, color: 'var(--r-ink-3)', display: 'grid', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>signature</span>
            <span style={{ color: seed?.signature === 'verified' ? 'var(--r-ok)' : 'var(--r-ink-2)' }}>
              {seed?.signature ?? 'unsigned'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>anchor</span>
            <span style={{ color: seed?.anchor === 'minted' ? 'var(--r-ok)' : 'var(--r-ink-2)' }}>
              {seed?.anchor ?? 'none'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>contract</span>
            <span style={{ color: typeof seed?.contractScore === 'number' && seed.contractScore >= 0.9 ? 'var(--r-ok)' : 'var(--r-ink-2)' }}>
              {typeof seed?.contractScore === 'number' ? seed.contractScore.toFixed(3) : '—'}
            </span>
          </div>
        </div>
      </Section>

      <Section label="Modes">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 1 }}>
          {MODES.map((m: Mode, i) => {
            const active = m === mode;
            return (
              <li key={m}>
                <button
                  onClick={() => setMode(m)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    padding: '4px 6px',
                    background: active
                      ? 'color-mix(in oklab, var(--r-prism-core) 6%, transparent)'
                      : 'transparent',
                    border: '1px solid',
                    borderColor: active
                      ? 'color-mix(in oklab, var(--r-prism-core) 35%, transparent)'
                      : 'transparent',
                    color: active ? 'var(--r-ink-0)' : 'var(--r-ink-2)',
                    cursor: 'pointer',
                    borderRadius: 'var(--r-radius-1)',
                    textAlign: 'left',
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--r-font-num)',
                      fontSize: 9,
                      color: 'var(--r-ink-4)',
                      width: 12,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ flex: 1 }}>{MODE_LABEL[m]}</span>
                  <span style={{ fontSize: 8, color: 'var(--r-ink-4)' }}>{MODE_HINT[m]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <div
        style={{
          marginTop: 'auto',
          padding: 'var(--r-px-5)',
          fontFamily: 'var(--r-font-num)',
          fontSize: 8,
          color: 'var(--r-ink-4)',
          borderTop: '1px solid var(--r-ink-4)',
        }}
      >
        xoshiro256** · deterministic
      </div>
    </aside>
  );
};
