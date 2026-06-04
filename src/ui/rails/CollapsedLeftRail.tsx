/**
 * CollapsedLeftRail — 56px icon strip for "calm" focus mode.
 *
 * Uses the new paradigm-os design tokens. Per spec §IV.2.
 */
import React from 'react';
import { useLayout } from '@/stores/layoutStore';
import { useAgentThreads } from '@/stores/agentThreads';
import { useMode, MODES, MODE_LABEL, type Mode } from '@/stores/modeStore';
import { useActiveSeed } from '@/stores/activeSeed';
import { SeedGlyph } from '@/ui/primitives/SeedGlyph';
import { domainColor } from '@/hooks/useDomainColor';
import { deriveCleanTitle } from '@/lib/kernel/types';

interface CollapsedLeftRailProps {
  onCosmos?: () => void;
}

export const CollapsedLeftRail: React.FC<CollapsedLeftRailProps> = ({ onCosmos }) => {
  const { setFocus } = useLayout();
  const { newThread } = useAgentThreads();
  const { mode, setMode } = useMode();
  const { seed } = useActiveSeed();

  const expand = () => setFocus('normal');
  const activeHue = domainColor(seed?.domain);

  return (
    <aside
      className="p-leftrail"
      aria-label="Quick navigation"
      style={{
        width: 56,
        flexShrink: 0,
        ['--p-active-seed-color' as never]: activeHue,
      } as React.CSSProperties}
    >
      <div className="p-leftrail-collapsed" style={{ height: '100%' }}>
        {/* Expand */}
        <button
          className="p-icon-button"
          onClick={expand}
          title="Expand left rail (⌘\\)"
          aria-label="Expand left rail"
        >
          ▸
        </button>

        {/* Active seed glyph (always visible at top) */}
        {seed && (
          <button
            className="p-icon-button"
            data-active="true"
            onClick={expand}
            title={`Active seed · ${deriveCleanTitle(seed.name, seed.hash)} · strata ${Math.round(((seed.strata?.overall ?? 0.73)*100))}% (always visible)`}
            style={{ width: 40, height: 40 }}
          >
            <SeedGlyph hash={seed.hash} domain={seed.domain} size={28} breathing />
          </button>
        )}

        {/* Quick actions */}
        <div style={{
          width: '100%',
          height: 1,
          background: 'var(--p-ink-4)',
          margin: '4px 0',
        }} />

        <button
          className="p-icon-button"
          onClick={() => newThread()}
          title="New thread"
          aria-label="New thread"
        >⚡</button>
        <button
          className="p-icon-button"
          onClick={expand}
          title="Library"
          aria-label="Library"
        >⌬</button>
        <button
          className="p-icon-button"
          onClick={onCosmos}
          title="Composition Atlas (⌘Space)"
          aria-label="Open Composition Atlas"
        >✦</button>

        {/* Mode quick-switch */}
        <div style={{
          width: '100%',
          height: 1,
          background: 'var(--p-ink-4)',
          margin: '4px 0',
        }} />

        {MODES.map((m: Mode, i) => (
          <button
            key={m}
            className="p-icon-button"
            data-active={mode === m}
            onClick={() => { setMode(m); expand(); }}
            title={`${i + 1} · ${MODE_LABEL[m]}`}
            aria-label={`Switch to ${MODE_LABEL[m]} mode`}
            style={{
              width: 32,
              height: 24,
              fontFamily: 'var(--p-font-mono)',
              fontSize: 'var(--p-text-1)',
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </aside>
  );
};

export default CollapsedLeftRail;
