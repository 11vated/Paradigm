/**
 * CollapsedLeftRail — icon strip when left pane is hidden (calm focus).
 */
import React from 'react';
import { useLayout } from '@/stores/layoutStore';
import { useAgentThreads } from '@/stores/agentThreads';
import { useMode, MODE_NUM, type Mode } from '@/stores/modeStore';
import { MODES, MODE_LABEL } from '@/stores/modeStore';

interface CollapsedLeftRailProps {
  onCosmos?: () => void;
}

export const CollapsedLeftRail: React.FC<CollapsedLeftRailProps> = ({ onCosmos }) => {
  const { setFocus, focusMode } = useLayout();
  const { newThread } = useAgentThreads();
  const { mode, setMode } = useMode();

  const expand = () => setFocus('normal');

  return (
    <aside
      aria-label="Quick navigation"
      style={{
        width: 56,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '8px 4px',
        borderRight: '1px solid var(--r-ink-4)',
        background: 'rgba(11, 13, 18, 0.55)',
      }}
    >
      <button
        type="button"
        title="Expand library (cmd+\)"
        onClick={expand}
        className="r-chip"
        style={{ width: 40, height: 28, fontSize: 14, cursor: 'pointer', borderColor: 'var(--r-ink-4)' }}
      >
        ⊞
      </button>
      <button type="button" title="New thread" onClick={() => newThread()} className="r-chip" style={{ width: 40, height: 28, fontSize: 12, cursor: 'pointer' }}>
        ⚡
      </button>
      <button type="button" title="Library" onClick={expand} className="r-chip" style={{ width: 40, height: 28, fontSize: 12, cursor: 'pointer' }}>
        📚
      </button>
      <button type="button" title="Domain Cosmos (cmd+space)" onClick={onCosmos} className="r-chip" style={{ width: 40, height: 28, fontSize: 12, cursor: 'pointer' }}>
        ✦
      </button>
      <div style={{ flex: 1 }} />
      {MODES.map((m: Mode) => (
        <button
          key={m}
          type="button"
          title={`${MODE_NUM[m]} ${MODE_LABEL[m]}`}
          onClick={() => { setMode(m); expand(); }}
          style={{
            width: 32,
            height: 24,
            fontSize: 9,
            fontFamily: 'var(--r-font-num)',
            border: '1px solid',
            borderColor: mode === m ? 'var(--r-prism-core)' : 'transparent',
            background: mode === m ? 'color-mix(in oklab, var(--r-prism-core) 10%, transparent)' : 'transparent',
            color: mode === m ? 'var(--r-ink-0)' : 'var(--r-ink-3)',
            cursor: 'pointer',
            borderRadius: 2,
          }}
        >
          {MODE_NUM[m]}
        </button>
      ))}
      {focusMode === 'calm' && (
        <span style={{ fontSize: 7, color: 'var(--r-ink-4)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          calm
        </span>
      )}
    </aside>
  );
};
