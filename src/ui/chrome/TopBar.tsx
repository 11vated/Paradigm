/**
 * TopBar — 48px identity strip.
 *
 *   [WORDMARK]    [ACTIVE SEED STRIP]    [search] [kernel] [sovereignty] [domains]
 *
 * Per `06_Frontend_Redesign_And_Completion_Spec.md` §IV.1.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { SeedGlyph } from '@/ui/primitives/SeedGlyph';
import { domainColor } from '@/hooks/useDomainColor';
import { createSeed } from '@/services/api';

export interface TopBarProps {
  onCosmos?: () => void;
}

function shortHash(h: string | undefined): string {
  if (!h) return '';
  return h.length > 12 ? `${h.slice(0, 4)}…${h.slice(-4)}` : h;
}

export const TopBar: React.FC<TopBarProps> = ({ onCosmos }) => {
  const { seed } = useActiveSeed();
  const setSeed = useActiveSeed((s: any) => s.setSeed);
  const [kernelTick, setKernelTick] = useState(0);
  const [creatingSeed, setCreatingSeed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Engine count for atlas chip
  const [engineCount, setEngineCount] = useState(0);
  useEffect(() => {
    fetch('/api/cosmos/engines')
      .then((r) => r.json())
      .then((j) => setEngineCount(j.count ?? (j.engines?.length ?? 0)))
      .catch(() => {});
  }, []);

  // Tick the kernel-state counter on a 2s heartbeat. Visual only — the real
  // RNG advance is driven by grow operations, not by this counter.
  useEffect(() => {
    const id = setInterval(() => setKernelTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const sovState =
    seed?.signature === 'verified' || seed?.signature === 'signed'
      ? seed?.anchor === 'minted'
        ? 'anchored'
        : 'signed'
      : 'unsigned';

  const domainHue = domainColor(seed?.domain);

  return (
    <header
      className="p-topbar"
      style={{ ['--p-active-seed-color' as never]: domainHue }}
    >
      {/* Left: wordmark */}
      <a className="p-topbar-brand" href="#" aria-label="Paradigm home">
        <span className="p-topbar-mark">
          <SeedGlyph hash="paradigm:wordmark" domain="character" size={28} />
        </span>
        <span className="p-topbar-wordmark">
          PARA<em>DIGM</em>
        </span>
      </a>

      {/* Center: active seed strip */}
      <div className="p-topbar-center">
        {seed ? (
          <div className="p-active-seed-strip" title={`Active seed · ${seed.hash}`}>
            <span className="p-active-seed-glyph">
              <SeedGlyph hash={seed.hash} domain={seed.domain} size={20} />
            </span>
            <span className="p-active-seed-name">{seed.name}</span>
            <span className="p-domain-pill">{seed.domain}</span>
            <span className="p-hash-tail">{shortHash(seed.hash)}</span>
            {typeof seed.generation === 'number' && (
              <span className="p-hash-tail">· gen {seed.generation}</span>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="p-active-seed-strip"
            data-empty="true"
          >
            <span>// no seed</span>
            <span className="p-kbd">N</span>
            <span>new</span>
          </button>
        )}
      </div>

      {/* Right: search + kernel + sovereignty + domain count */}
      <div className="p-topbar-right">
        <button className="p-topbar-action" aria-label="Open command palette">
          <span>search</span>
          <span className="p-kbd">⌘K</span>
        </button>

        <button
          className="p-kernel-badge"
          title="Click for kernel inspector"
          aria-label={`Kernel state, tick ${kernelTick}`}
        >
          <span className="p-kernel-dot" />
          <span>xoshiro256** · t{kernelTick.toString(36)}</span>
        </button>

        <button
          className="p-sov-badge"
          data-state={sovState}
          title={`Sovereignty: ${sovState}`}
        >
          {sovState === 'anchored' && '⛓ '}
          {sovState === 'signed' && '✓ '}
          {sovState}
        </button>

        <button
          className="p-topbar-action"
          title={`Composition Atlas — ${engineCount} engines`}
          onClick={onCosmos}
        >
          <span>{engineCount} engines</span>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
