import React, { useEffect, useRef, useMemo } from 'react';
import { useAgentThreads, type Turn } from '@/stores/agentThreads';
import { SurfacedCardView } from './cards';

const RoleTag: React.FC<{ role: Turn['role'] }> = ({ role }) => {
  const map: Record<Turn['role'], { label: string; color: string }> = {
    user:   { label: 'YOU',     color: 'var(--r-prism-core)' },
    agent:  { label: 'AGENT',   color: 'var(--r-prism-resonant)' },
    system: { label: 'KERNEL',  color: 'var(--r-ink-3)' },
  };
  const { label, color } = map[role];
  return (
    <span style={{ fontFamily: 'var(--r-font-display)', fontSize: 8, letterSpacing: '0.22em', color }}>
      {label}
    </span>
  );
};

const TIER_LABEL: Record<string, string> = {
  kernel:   '●',
  fast:     '◎',
  standard: '◉',
  deep:     '◆',
};

export const Conversation: React.FC = () => {
  const { threads, currentThreadId, lens } = useAgentThreads();
  const thread = threads.find((t) => t.id === currentThreadId) ?? null;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Filter turns by active lens
  const filteredTurns = useMemo(() => {
    if (!thread) return [];
    if (lens === 'conversation') return thread.turns;

    return thread.turns.filter((u) => {
      if (!u.cards?.length) return false;
      switch (lens) {
        case 'plan':   return u.cards.some((c) => c.kind === 'plan');
        case 'source': return u.cards.some((c) => c.kind === 'gspl-source');
        case 'tools':  return u.cards.some((c) => c.kind === 'tool-calls');
        case 'memory': return u.cards.some((c) => c.kind === 'memory');
        default: return true;
      }
    });
  }, [thread, lens]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filteredTurns.length, filteredTurns[filteredTurns.length - 1]?.text]);

  if (!thread) {
    return (
      <div style={{ padding: 'var(--r-px-5)', color: 'var(--r-ink-3)', fontSize: 11 }}>
        no active thread
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: 'var(--r-px-4) var(--r-px-5)',
      }}
    >
      {filteredTurns.map((u) => (
        <article
          key={u.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr',
            gap: 8,
            padding: '8px 0',
            borderBottom: '1px solid rgba(255,255,255,0.02)',
          }}
        >
          <div style={{ paddingTop: 2 }}>
            <RoleTag role={u.role} />
            <div style={{ marginTop: 2, fontFamily: 'var(--r-font-num)', fontSize: 8, color: 'var(--r-ink-4)' }}>
              {u.at.slice(11, 19)}
            </div>
          </div>
          <div>
            <div
              style={{
                color: u.role === 'system' ? 'var(--r-ink-2)' : 'var(--r-ink-0)',
                fontSize: 12,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                fontStyle: u.role === 'system' ? 'italic' : 'normal',
              }}
            >
              {u.text}
              {u.streaming && (
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 11,
                    marginLeft: 3,
                    background: 'var(--r-prism-core)',
                    animation: 'r-cursor 0.9s steps(2) infinite',
                    verticalAlign: 'middle',
                  }}
                />
              )}
            </div>

            {/* Inference tier badge */}
            {u.inferenceTier && u.role === 'agent' && !u.streaming && (
              <div style={{ marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span
                  style={{
                    fontFamily: 'var(--r-font-num)',
                    fontSize: 7,
                    color: 'var(--r-ink-4)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {TIER_LABEL[u.inferenceTier] ?? '·'} {u.inferenceTier}
                </span>
                {u.fingerprint?.latencyMs && (
                  <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 7, color: 'var(--r-ink-4)' }}>
                    {u.fingerprint.latencyMs}ms
                  </span>
                )}
              </div>
            )}

            {/* Surfaced cards */}
            {u.cards?.length ? (
              <div style={{ marginTop: 6 }}>
                {u.cards.map((c) => (
                  <SurfacedCardView key={c.id} card={c} />
                ))}
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
};
