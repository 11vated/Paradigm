/**
 * Root — the Reality OS three-pane studio.
 *
 *   ┌─ TopBar (28px) ─────────────────────────────────────────────────┐
 *   │ wordmark · mode · kernel gauge · cosmos · you                   │
 *   ├─ LeftRail │     CenterStage          │ AgentPanel ──────────────┤
 *   │ threads   │ living artifact          │ identity · cards · chat  │
 *   │ library   │ (mode-routed canvas)     │ composer · footer        │
 *   │ sovereignty│                         │                          │
 *   │ modes     │                         │                          │
 *   ├───────────┴──────────────────────────┴──────────────────────────┤
 *   │ AmbientStrip — hidden until federated data exists               │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * The shell is keyboard-first:
 *   1-7      — switch center stage mode (no modifier)
 *   r        — toggle photoreal renderer (in Crucible)
 *   cmd+\    — calm focus (collapse left rail)
 *   cmd+↩   — expand agent fullscreen
 *   esc      — restore layout
 */
import React, { useMemo } from 'react';
import '@/styles/reality-os.css';

import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme, themeToCssVars } from '@/hooks/useSeedTheme';
import { usePaneLayout } from '@/hooks/usePaneLayout';

import { TopBar } from '@/ui/chrome/TopBar';
import { AmbientStrip } from '@/ui/chrome/AmbientStrip';
import { LeftRail } from '@/ui/rails/LeftRail';
import { AgentPanel } from '@/ui/rails/AgentPanel';
import { CenterStage } from '@/ui/stage/CenterStage';

const Gripper: React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    bind: ReturnType<typeof usePaneLayout>['leftGripper'];
  }
> = ({ bind, style, ...rest }) => (
  <div
    role="separator"
    aria-orientation="vertical"
    {...rest}
    {...bind}
    style={{
      width: 4,
      cursor: 'col-resize',
      background: 'transparent',
      position: 'relative',
      flexShrink: 0,
      ...style,
    }}
  >
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: '12px 1px',
        background: 'var(--r-ink-4)',
        opacity: 0.6,
      }}
    />
  </div>
);

export const Root: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const theme = useSeedTheme(seed?.hash);
  const cssVars = useMemo(() => themeToCssVars(theme), [theme]);
  const {
    leftPct,
    agentPct,
    centerPct,
    focusMode,
    leftGripper,
    agentGripper,
  } = usePaneLayout();

  const calm = focusMode === 'calm';
  const agentFull = focusMode === 'agent-fullscreen';

  // In agent-fullscreen, the agent column expands to ~78%, center pinned to ~22%,
  // left rail hidden. Restore via Escape (handled in usePaneLayout).
  const computedLeftPct  = agentFull ? 0   : (calm ? 0  : leftPct);
  const computedAgentPct = agentFull ? 78  : agentPct;
  const computedCenterPct = Math.max(8, 100 - computedLeftPct - computedAgentPct);

  return (
    <div
      data-paradigm-shell="reality-os"
      style={{
        ...cssVars,
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      } as React.CSSProperties}
    >
      <div className="r-grid" />
      <TopBar />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'stretch',
          position: 'relative',
          zIndex: 'var(--r-z-pane)' as unknown as number,
        }}
      >
        {computedLeftPct > 0 && (
          <>
            <div
              style={{
                width: `${computedLeftPct}%`,
                minWidth: 'var(--r-rail-min)',
                maxWidth: 'var(--r-rail-max)',
                height: '100%',
                borderRight: '1px solid var(--r-ink-4)',
                background: 'rgba(11, 13, 18, 0.55)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              <LeftRail />
            </div>
            <Gripper bind={leftGripper} />
          </>
        )}

        <div
          style={{
            flex: 1,
            width: `${computedCenterPct}%`,
            minWidth: 0,
            height: '100%',
          }}
        >
          <CenterStage />
        </div>

        <Gripper bind={agentGripper} />

        <div
          style={{
            width: `${computedAgentPct}%`,
            minWidth: 'var(--r-agent-min)',
            maxWidth: 'var(--r-agent-max)',
            height: '100%',
          }}
        >
          <AgentPanel />
        </div>
      </div>

      <AmbientStrip />
    </div>
  );
};

export default Root;
