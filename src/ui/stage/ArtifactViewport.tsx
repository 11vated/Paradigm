import React, { useMemo, useState, useCallback } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useGrowArtifact } from '@/hooks/useGrowArtifact';
import { calculateStratumConformance } from '@/lib/kernel/quality/predicates';
import { deriveCleanTitle } from '@/lib/kernel/types';
import { SeedGlyph } from '@/ui/primitives/SeedGlyph';
import { ArtifactRenderer } from './ArtifactRenderer';
import { SubstrateField } from './SubstrateField';
import { getGenesisSuggestions } from '@/lib/ui/genesisSuggestions';
import { inferDomain } from '@/lib/ui/inferDomain';
import { createSeed } from '@/services/api';

const GENESIS_PROMPTS = [
  { domain: 'character', text: 'A melancholy ocean character at twilight' },
  { domain: 'world',     text: 'A volcanic archipelago with six warring factions' },
  { domain: 'music',     text: 'Generative jazz composition in D minor, 143 BPM' },
  { domain: 'visual2d',  text: 'Luminous geometric mandala in deep violet and gold' },
  { domain: 'molecule',  text: 'Caffeine (C8H10N4O2) at optimized geometry' },
  { domain: 'quantum',   text: 'Double-well potential wavefunction, delocalized state' },
  { domain: 'website',   text: 'A brutalist portfolio site for a digital sculptor' },
  { domain: 'cosmology', text: 'Spiral galaxy collision, 200 bodies, Barnes-Hut' },
];

const shortHash = (h: string | undefined) => {
  if (!h) return '';
  return h.length <= 12 ? h : `${h.slice(0, 6)}…${h.slice(-4)}`;
};

const STRATA_KEYS = ['Form','Motion','Sound','Mind','Story','World','Field','Culture','Time'] as const;

export const ArtifactViewport: React.FC = React.memo(() => {
  const seed = useActiveSeed((s) => s.seed);
  const { artifact, loading, error, refetch } = useGrowArtifact();

  const liveStrata = useMemo(() => {
    try {
      const art: any = artifact || {};
      if (art.strata && typeof art.strata === 'object') {
        const per = art.strata as Record<string, number>;
        const overall = Object.values(per).reduce((a: number, b: number) => a + (b || 0), 0) / 9;
        return { overall, perStratum: per };
      }
      const sc = (art.strataCompliance ?? art.axes?.strataCompliance ?? (seed as any)?.strata?.overall) as number | undefined;
      if (typeof sc === 'number') {
        return { overall: sc, perStratum: (seed as any)?.strata?.perStratum || {} };
      }
      const samples = [
        art.form || {}, art.motion || {}, art.sound || {}, art.mind || {},
        art.story || {}, art.world || {}, art.field || {}, art.culture || {}, art.time || {},
      ];
      const conf = calculateStratumConformance(samples);
      return {
        overall: conf.overall,
        perStratum: Object.fromEntries(
          Object.entries(conf.perStratum).map(([k, v]: any) => [k, v.score ?? 0.5])
        ),
      };
    } catch {
      return { overall: 0.72, perStratum: {} };
    }
  }, [artifact, seed]);

  const onCreate = useCallback(async (text: string) => {
    const domain = inferDomain(text);
    try {
      const created = await createSeed({ name: text, domain });
      if (created?.id) {
        useActiveSeed.getState().setSeed({
          id: created.id,
          name: created.name ?? text,
          domain: created.domain ?? created.$domain ?? domain,
          hash: created.hash ?? created.$hash ?? '',
          generation: 0,
        });
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent('paradigm:create-failed', { detail: { text, error: String(e) } }));
    }
  }, []);

  if (!seed) {
    return (
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <SubstrateField />
        <div className="p-empty">
          <div className="p-empty-inner p-fade-up">
            <SeedGlyph
              hash="paradigm:genesis"
              domain="character"
              size={120}
              breathing
              className="p-empty-glyph"
            />
            <h1 className="p-empty-title">
              The substrate awaits<br />your first seed.
            </h1>
            <p className="p-empty-sub">
              Speak a creation into existence. Describe a world, a molecule, a piece
              of music — anything digital. GSPL grows it deterministically from a
              single sovereign seed.
            </p>
            <div className="p-empty-prompts">
              {GENESIS_PROMPTS.map((p) => (
                <button
                  key={p.text}
                  className="p-prompt-card"
                  onClick={() => onCreate(p.text)}
                  type="button"
                >
                  <span className="p-prompt-card-domain">{p.domain}</span>
                  <span className="p-prompt-card-text">{p.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = deriveCleanTitle(
    seed.name ?? (seed as any).$name ?? seed.id ?? 'Untitled',
    seed.hash,
  );

  return (
    <div
      style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      aria-label="Artifact viewport — live artifact with provenance HUD"
    >
      <SubstrateField />
      <ArtifactRenderer artifact={artifact as any} seed={seed} />
      <div
        className="p-crucible-hud"
        data-visible={loading || !!error || true}
        style={{ pointerEvents: 'auto' }}
        role="region"
        aria-label="Artifact identity and quality HUD"
      >
        <SeedGlyph hash={seed.hash} domain={seed.domain} size={28} />
        <div className="p-crucible-hud-meta">
          <div className="p-crucible-hud-name" title={displayName}>
            {displayName}
          </div>
          {(seed as any).etymology && (
            <div
              className="p-crucible-hud-etymology"
              style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', marginTop: 1, lineHeight: 1.3, maxWidth: 360 }}
            >
              {(seed as any).etymology}
            </div>
          )}
          <div className="p-crucible-hud-sub">
            <span className="p-chip p-chip-domain" data-domain={seed.domain}>
              {seed.domain}
            </span>
            <span className="p-crucible-hud-hash">{shortHash(seed.hash)}</span>
            <span className="p-crucible-hud-sig">
              sig {seed.signature ?? 'unsigned'}
            </span>
            {typeof seed.contractScore === 'number' && (
              <span className="p-chip" title="Quality Contract conformance">
                qc {seed.contractScore.toFixed(3)}
              </span>
            )}
            <span className="p-crucible-hud-gen">gen {seed.generation ?? 0}</span>
            <span
              className="p-strata-pill"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
            >
              strata {(liveStrata.overall * 100).toFixed(0)}%
            </span>
          </div>
          <div
            className="p-strata-hud-bars"
            role="group"
            aria-label="9-strata live scores"
            style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}
          >
            {STRATA_KEYS.map((stratum) => {
              const val = (liveStrata.perStratum as any)?.[stratum] ?? liveStrata.overall;
              const pct = Math.max(0, Math.min(100, Math.round((val || 0.5) * 100)));
              const color = pct > 85 ? '#34d399' : pct > 70 ? '#fbbf24' : '#f87171';
              return (
                <div
                  key={stratum}
                  style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 42 }}
                  title={`${stratum} stratum: ${pct}%`}
                >
                  <span style={{ fontSize: 7, fontFamily: 'var(--p-font-mono)', color: '#64748b', width: 22, textAlign: 'right' }}>
                    {stratum.slice(0, 2)}
                  </span>
                  <div
                    style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', minWidth: 18 }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuetext={`${stratum} ${pct}%`}
                  >
                    <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 120ms linear' }} />
                  </div>
                  <span style={{ fontSize: 7, fontFamily: 'var(--p-font-mono)', color, width: 18 }}>{pct}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {loading && (
          <span className="p-crucible-hud-status" data-state="busy">
            <span className="p-spinner" />
            Generating rich visual…
          </span>
        )}
        {!loading && error && (
          <span className="p-crucible-hud-status" data-state="error" title={error}>
            grow failed
            <button
              type="button"
              onClick={() => refetch()}
              style={{ marginLeft: 8, background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: '#e6edf3', borderRadius: 4, padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
            >
              retry
            </button>
          </span>
        )}
        {!loading && !error && artifact && (
          <span className="p-crucible-hud-status" data-state="ok">
            {deriveCleanTitle((artifact as any).name || '', seed.hash) || 'lived'} · {(artifact as any).type ?? seed.domain}
          </span>
        )}
      </div>
      {error && (
        <div className="p-crucible-error-overlay">
          <div className="p-crucible-error-card">
            <div className="p-crucible-error-title">grow failed</div>
            <div className="p-crucible-error-body">{error}</div>
            <div className="p-crucible-error-hint">
              The kernel rejected this seed. Try mutating it, picking another from
              library, or a fresh prompt. All operations live-update strata + provenance.
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ArtifactViewport;
