import React, { useMemo, useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme } from '@/hooks/useSeedTheme';
import { useMode, MODES, MODE_LABEL } from '@/stores/modeStore';
import { useAgentThreads } from '@/stores/agentThreads';

const NODE_SIZE = 12;

export const TopologyMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const theme = useSeedTheme(seed?.hash);
  const { mode } = useMode();
  const { threads } = useAgentThreads();
  const [hovered, setHovered] = useState<string | null>(null);

  const nodes = useMemo(() => {
    const m: Array<{ id: string; label: string; type: 'mode'; active: boolean; x: number; y: number }> = MODES.map((k, i) => ({
      id: k, label: MODE_LABEL[k], type: 'mode' as const, active: k === mode,
      x: 120 + i * 90, y: 80,
    }));
    const t: Array<{ id: string; label: string; type: 'thread'; active: boolean; x: number; y: number }> = threads.map((th, i) => ({
      id: th.id, label: th.title, type: 'thread' as const, active: false,
      x: 120 + (i % 7) * 90, y: 200 + Math.floor(i / 7) * 50,
    }));
    return [...m, ...t];
  }, [mode, threads]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ padding: 'var(--r-px-4) var(--r-px-5)', borderBottom: '1px solid var(--r-ink-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--r-font-display)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.core }}>Topology · Functor Neighborhood</span>
        <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 9, color: 'var(--r-ink-3)' }}>{nodes.length} nodes</span>
      </header>
      <div style={{ flex: 1, position: 'relative', overflow: 'auto' }}>
        <svg width="800" height={300 + Math.ceil(threads.length / 7) * 60} style={{ display: 'block' }}>
          {nodes.map((n) => (
            <g key={n.id} onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'default' }}>
              {Array.from({ length: 3 }, (_, i) => (
                <circle
                  key={i}
                  cx={n.x + (i - 1) * 60}
                  cy={n.y + 40}
                  r={3}
                  fill="var(--r-ink-4)"
                  opacity={0.3}
                />
              ))}
              <circle
                cx={n.x} cy={n.y} r={NODE_SIZE}
                fill={n.active ? theme.core : n.type === 'mode' ? 'var(--r-ink-4)' : 'var(--r-ink-3)'}
                stroke={n.active ? theme.resonant : 'none'}
                strokeWidth={n.active ? 2 : 0}
                opacity={n.active ? 1 : 0.5}
              />
              <text x={n.x} y={n.y + NODE_SIZE + 14} textAnchor="middle" fill={hovered === n.id ? 'var(--r-ink-0)' : 'var(--r-ink-3)'} fontSize={8} fontFamily="var(--r-font-num)">
                {n.label.length > 12 ? `${n.label.slice(0, 10)}…` : n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
