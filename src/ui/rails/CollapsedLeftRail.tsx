import React from 'react';
import { useLayout } from '@/stores/layoutStore';
import { useAgentThreads } from '@/stores/agentThreads';
import { useActiveSeed } from '@/stores/activeSeed';
import { SeedGlyph } from '@/ui/primitives/SeedGlyph';
import { domainColor } from '@/hooks/useDomainColor';

interface CollapsedLeftRailProps {
  onCosmos?: () => void;
}

export const CollapsedLeftRail: React.FC<CollapsedLeftRailProps> = ({ onCosmos }) => {
  const { setFocus } = useLayout();
  const { newThread } = useAgentThreads();
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
        <button
          className="p-icon-button"
          onClick={expand}
          title="Expand left rail (⌘\\)"
          aria-label="Expand left rail"
          aria-pressed={false}>
          ▸
        </button>

        {seed && (
          <button
            className="p-icon-button"
            data-active="true"
            onClick={expand}
            aria-label={`Active seed ${seed.name || 'Untitled'}, expand rail to view details`}
            title={`Active seed · ${seed.name && !/^Seed-[0-9a-f]{6,}/.test(seed.name) ? seed.name : (seed.name || 'Untitled')} · strata ${Math.round(((seed.strata?.overall ?? 0.73)*100))}%`}
            style={{ width: 40, height: 40 }}>
            <SeedGlyph hash={seed.hash} domain={seed.domain} size={28} breathing />
          </button>
        )}

        <div style={{ width: '100%', height: 1, background: 'var(--p-ink-4)', margin: '4px 0' }} />

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
          aria-label="Open library (expand rail)"
        >⌬</button>
        <button
          className="p-icon-button"
          onClick={onCosmos}
          title="Composition Atlas (⌘Space)"
          aria-label="Open Composition Atlas"
        >✦</button>
      </div>
    </aside>
  );
};

export default CollapsedLeftRail;
