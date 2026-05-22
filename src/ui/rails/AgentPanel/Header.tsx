import React, { useEffect, useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme } from '@/hooks/useSeedTheme';
import { PrismStrip } from '@/ui/primitives/PrismStrip';
import { kernelNowIso } from '@/lib/kernel/clock';

interface HeaderProps {
  status?: 'ready' | 'thinking' | 'tooling' | 'signing' | 'replaying';
  /** Active inference tier label */
  tier?: 'kernel' | 'fast' | 'standard' | 'deep';
  subAgentCount?: number;
}

const STATUS_DOT: Record<NonNullable<HeaderProps['status']>, string> = {
  ready:     'var(--r-ok)',
  thinking:  'var(--r-prism-core)',
  tooling:   'var(--r-warn)',
  signing:   'var(--r-prism-resonant)',
  replaying: 'var(--r-prism-grad-b)',
};

const TIER_COLOR: Record<string, string> = {
  kernel:   'var(--r-ink-3)',
  fast:     'var(--r-prism-cool)',
  standard: 'var(--r-prism-core)',
  deep:     'var(--r-prism-resonant)',
};

export const AgentHeader: React.FC<HeaderProps> = ({ status = 'ready', tier, subAgentCount }) => {
  const seed = useActiveSeed((s) => s.seed);
  const theme = useSeedTheme(seed?.hash);
  const [utc, setUtc] = useState(() => kernelNowIso().slice(11, 19));

  useEffect(() => {
    const id = window.setInterval(() => setUtc(kernelNowIso().slice(11, 19)), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header
      style={{
        position: 'relative',
        padding: 'var(--r-px-4) var(--r-px-5) var(--r-px-3)',
        borderBottom: '1px solid var(--r-ink-4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            transform: 'rotate(45deg)',
            background: 'var(--r-prism-core)',
            boxShadow: '0 0 8px var(--r-prism-core)',
            flexShrink: 0,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontFamily: 'var(--r-font-display)',
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--r-ink-0)',
              }}
            >
              Paradigm Agent
            </span>
            {tier && (
              <span
                className="r-chip"
                style={{
                  borderColor: TIER_COLOR[tier] ?? 'var(--r-ink-4)',
                  color: TIER_COLOR[tier] ?? 'var(--r-ink-2)',
                  fontSize: 7,
                  padding: '0 5px',
                  height: 16,
                }}
                title="inference tier"
              >
                {tier}
              </span>
            )}
            {subAgentCount !== undefined && subAgentCount > 0 && (
              <span
                className="r-chip"
                style={{ borderColor: 'var(--r-prism-resonant)', color: 'var(--r-prism-resonant)', fontSize: 7, padding: '0 5px', height: 16 }}
                title="active sub-agents"
              >
                +{subAgentCount}
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: 'var(--r-font-num)',
              fontSize: 9,
              color: 'var(--r-ink-3)',
              letterSpacing: '0.06em',
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span title="kernel UTC clock">kernel · {utc} UTC</span>
            <span style={{ color: 'var(--r-ink-4)' }}>·</span>
            <span title="rng family">xoshiro256**</span>
            {seed && (
              <>
                <span style={{ color: 'var(--r-ink-4)' }}>·</span>
                <span title="resonance note (seed-derived)">res · {theme.resonanceNote}</span>
              </>
            )}
          </div>
        </div>

        <span
          className="r-chip"
          style={{
            borderColor: 'transparent',
            color: 'var(--r-ink-1)',
            paddingLeft: 0,
            flexShrink: 0,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 5,
              height: 5,
              borderRadius: 9999,
              background: STATUS_DOT[status],
              boxShadow: `0 0 6px ${STATUS_DOT[status]}`,
            }}
          />
          {status}
        </span>
      </div>

      <div style={{ marginTop: 8 }}>
        <PrismStrip hash={seed?.hash} thickness={2} />
      </div>
    </header>
  );
};
