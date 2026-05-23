import React, { useEffect, useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme } from '@/hooks/useSeedTheme';
import { PrismStrip } from '@/ui/primitives/PrismStrip';
import { kernelNowIso } from '@/lib/kernel/clock';

interface HeaderProps {
  status?: 'ready' | 'thinking' | 'tooling' | 'signing' | 'replaying';
  tier?: 'kernel' | 'fast' | 'standard' | 'deep';
  subAgentCount?: number;
}

const STATUS_COLOR: Record<NonNullable<HeaderProps['status']>, string> = {
  ready:     'var(--r-ok)',
  thinking:  'var(--r-prism-core)',
  tooling:   'var(--r-warn)',
  signing:   'var(--r-prism-sovereign)',
  replaying: 'var(--r-prism-grow)',
};

export const AgentHeader: React.FC<HeaderProps> = ({ status = 'ready', tier, subAgentCount }) => {
  const seed  = useActiveSeed(s => s.seed);
  const theme = useSeedTheme(seed?.hash);
  const [utc, setUtc] = useState(() => kernelNowIso().slice(11, 19));

  useEffect(() => {
    const id = window.setInterval(() => setUtc(kernelNowIso().slice(11, 19)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const statusColor = STATUS_COLOR[status];

  return (
    <header className="r-agent-header" style={{ flexDirection: 'column', height: 'auto', padding: '14px 16px 12px', gap: 10 }}>
      {/* Identity row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
        {/* Mark */}
        <div style={{
          width: 10, height: 10,
          background: 'var(--r-prism-sovereign)',
          transform: 'rotate(45deg)',
          flexShrink: 0,
          boxShadow: '0 0 10px rgba(217,119,6,0.5)',
        }}/>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{
              fontFamily: 'var(--r-font-display)',
              fontSize: 13, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--r-ink-0)',
            }}>
              Paradigm Agent
            </span>
            {tier && (
              <span className="r-chip" style={{
                borderColor: 'rgba(124,58,237,0.3)',
                color: 'var(--r-prism-core)',
                fontSize: 8,
              }}>
                {tier}
              </span>
            )}
            {(subAgentCount ?? 0) > 0 && (
              <span className="r-chip" style={{
                borderColor: 'rgba(217,119,6,0.3)',
                color: 'var(--r-prism-sovereign)',
                fontSize: 8,
              }}>
                +{subAgentCount} agents
              </span>
            )}
          </div>
          <div style={{
            fontFamily: 'var(--r-font-mono)', fontSize: 9,
            color: 'var(--r-ink-3)', letterSpacing: '0.06em',
            display: 'flex', gap: 8, flexWrap: 'wrap',
          }}>
            <span>kernel · {utc} UTC</span>
            <span style={{ color: 'var(--r-ink-5)' }}>·</span>
            <span>xoshiro256**</span>
            {seed && (
              <>
                <span style={{ color: 'var(--r-ink-5)' }}>·</span>
                <span style={{ color: theme.resonanceNote ? 'var(--r-ink-2)' : 'var(--r-ink-3)' }}>
                  res {theme.resonanceNote}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontFamily: 'var(--r-font-mono)', fontSize: 9,
          fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: statusColor,
          background: `${statusColor}14`,
          border: `1px solid ${statusColor}30`,
          borderRadius: 99, padding: '3px 8px',
          flexShrink: 0,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: 99,
            background: statusColor,
            boxShadow: `0 0 6px ${statusColor}`,
            animation: status !== 'ready' ? 'r-pulse 1.5s ease-in-out infinite' : undefined,
          }}/>
          {status}
        </div>
      </div>

      {/* Prism strip */}
      <PrismStrip hash={seed?.hash} thickness={2} />
    </header>
  );
};
