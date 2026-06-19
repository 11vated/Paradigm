/**
 * Root — Reality OS three-pane studio (magic-first).
 */
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import '@/styles/paradigm-os.css';

import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme, themeToCssVars } from '@/hooks/useSeedTheme';
import { usePaneLayout } from '@/hooks/usePaneLayout';
import { useLayout } from '@/stores/layoutStore';
import { useCreativeActs } from '@/hooks/useCreativeActs';
import { getInstallGenesisHash } from '@/lib/ui/genesisSuggestions';

import { TopBar } from '@/ui/chrome/TopBar';
import { AmbientStrip } from '@/ui/chrome/AmbientStrip';
import { StatusBar } from '@/ui/chrome/StatusBar';
import { LeftRail } from '@/ui/rails/LeftRail';
import { CollapsedLeftRail } from '@/ui/rails/CollapsedLeftRail';
import { AgentPanel } from '@/ui/rails/AgentPanel';
import { CenterStage } from '@/ui/stage/CenterStage';
import { DomainCosmosOverlay } from '@/ui/overlays/DomainCosmosOverlay';
import { Onboarding } from '@/components/onboarding/Onboarding';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// AAA skip link for keyboard users (WCAG 2.2 AAA best practice)
const SkipLink: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-amber-400 focus:text-black focus:rounded focus:font-medium focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-amber-600 min-h-[44px] flex items-center"
  >
    Skip to main content
  </a>
);

const Gripper: React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    bind: ReturnType<typeof usePaneLayout>['leftGripper'];
    name?: string;
  }
> = ({ bind, style, name, ...rest }) => (
  <div
    role="separator"
    aria-orientation="vertical"
    data-testid={name ? `gripper-${name}` : 'gripper'}
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
  const themeHash = seed?.hash ?? getInstallGenesisHash();
  const theme = useSeedTheme(themeHash);
  const cssVars = useMemo(() => themeToCssVars(theme), [theme]);

  // Bridge legacy --r-* (used in this shell's inline layout) to the active
  // paradigm-os tokens (--p-*) so widths, borders, and dark substrate render.
  // Dynamic prism colors (--r-prism-*) come from seed theme above.
  const shellVars = useMemo(() => ({
    ...cssVars,
    '--r-void': 'var(--p-void)',
    '--r-ink-4': 'var(--p-ink-4)',
    '--r-rail-min': 'var(--p-leftrail-w)',
    '--r-rail-max': '400px',
    '--r-agent-min': 'var(--p-agent-w)',
    '--r-agent-max': '640px',
    '--r-z-pane': '10',
  } as React.CSSProperties), [cssVars]);

  const [cosmosOpen, setCosmosOpen] = useState(false);
  const openCosmos = useCallback(() => setCosmosOpen(true), []);
  const closeCosmos = useCallback(() => setCosmosOpen(false), []);

  useCreativeActs({ onCosmos: openCosmos });

  const { setFocus } = useLayout();
  const {
    leftPct,
    agentPct,
    focusMode,
    leftGripper,
    agentGripper,
  } = usePaneLayout();

  const calm = focusMode === 'calm';
  const agentFull = focusMode === 'agent-fullscreen';

  const computedLeftPct = agentFull ? 0 : calm ? 0 : leftPct;
  const computedAgentPct = agentFull ? 78 : agentPct;
  const computedCenterPct = Math.max(8, 100 - computedLeftPct - computedAgentPct);

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === ' ') {
        ev.preventDefault();
        setCosmosOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div
      data-paradigm-shell="paradigm-os"
      data-testid="root-shell"
      style={{
        ...shellVars,
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: `radial-gradient(ellipse 120% 80% at 50% 0%, color-mix(in oklab, var(--r-prism-core) 6%, var(--r-void)), var(--r-void))`,
        backgroundColor: '#030306',
        color: '#e6edf3',
      } as React.CSSProperties}
    >
      <TopBar onCosmos={openCosmos} />
      <SkipLink />
      <Onboarding onComplete={() => {}} onSkip={() => {}} />

      <div
        id="main-content"
        data-testid="main-content"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'stretch',
          position: 'relative',
          zIndex: 'var(--r-z-pane)' as unknown as number,
        }}
      >
        {calm && !agentFull && (
          <div data-testid="collapsed-left-rail">
            <CollapsedLeftRail onCosmos={openCosmos} />
          </div>
        )}

        {computedLeftPct > 0 && (
          <>
            <div
              data-testid="left-rail"
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
              <ErrorBoundary fallback={() => <div className="p-4 text-sm text-destructive">Left rail crashed</div>}>
                <LeftRail onCosmos={openCosmos} onToggleCollapse={() => setFocus('calm')} />
              </ErrorBoundary>
            </div>
            <Gripper bind={leftGripper} name="left" />
          </>
        )}

        <div
          data-testid="center-stage"
          style={{
            flex: 1,
            width: `${computedCenterPct}%`,
            minWidth: 0,
            height: '100%',
          }}
        >
          <ErrorBoundary fallback={() => <div className="p-4 text-sm text-destructive">Center stage crashed</div>}>
            <CenterStage />
          </ErrorBoundary>
        </div>

        <Gripper bind={agentGripper} name="agent" />

        <div
          data-testid="agent-panel"
          style={{
            width: `${computedAgentPct}%`,
            minWidth: 'var(--r-agent-min)',
            maxWidth: 'var(--r-agent-max)',
            height: '100%',
          }}
        >
          <ErrorBoundary fallback={() => <div className="p-4 text-sm text-destructive">Agent panel crashed</div>}>
            <AgentPanel />
          </ErrorBoundary>
        </div>
      </div>

      <StatusBar />
      <AmbientStrip />
      <DomainCosmosOverlay open={cosmosOpen} onClose={closeCosmos} />
    </div>
  );
};

export default Root;
