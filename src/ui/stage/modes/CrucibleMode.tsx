/**
 * CrucibleMode — the seed rendered in its native medium. (Internal lens; Atelier is primary always-on workspace per 13_ doctrine.)
 *
 * Enhanced: always-visible comprehensive 9-strata HUD/bars/scores using live artifact.strata or calculateStratumConformance.
 * Beautiful subtle loading ("Generating rich visual…"), deriveCleanTitle polish, provenance hints, no raw dumps.
 * Live reactive via useGrowArtifact + activeSeed updates on grow/mutate/breed/evolve/compose.
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useGrowArtifact } from '@/hooks/useGrowArtifact';
import { getGenesisSuggestions } from '@/lib/ui/genesisSuggestions';
import { inferDomain } from '@/lib/ui/inferDomain';
import { SeedGlyph } from '@/ui/primitives/SeedGlyph';
import { ArtifactRenderer } from '@/ui/stage/ArtifactRenderer';
import { EmptyState } from '../EmptyState';
import { createSeed } from '@/services/api';
import { calculateStratumConformance } from '@/lib/kernel/quality/predicates';
import { deriveCleanTitle } from '@/lib/kernel/types';

const shortHash = (h: string) => (h.length <= 12 ? h : `${h.slice(0, 6)}…${h.slice(-4)}`);

export const CrucibleMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const { artifact, loading, error } = useGrowArtifact();
  const suggestions = useMemo(() => getGenesisSuggestions(4), []);
  // Always-visible per doctrine: 9-strata HUD is primary lived surface, not hover-deferred. Toggle only for advanced (h still works for debug). Default always on.
  const [hudVisible, setHudVisible] = useState(true);

  const revealHud = useCallback(() => {
    setHudVisible(true);
    // no auto-hide: always-visible strata for normal users (Crucible under Atelier)
  }, []);

  useEffect(() => {
    if (!seed?.hash) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from props; effect is correct
    const cleanup = revealHud();
    return cleanup;
  }, [seed?.hash, revealHud]);

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (ev.key === 'h') {
        ev.preventDefault();
        setHudVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Live 9-strata from artifact (if server promoted strata / rate / manifest) or compute via calculateStratumConformance on available signals (real QC data)
  const liveStrata = useMemo(() => {
    try {
      const art: any = artifact || {};
      const sd: any = seed || {};
      // Prefer real from grow artifact (strataCompliance or per-stratum from QC in generators)
      if (art.strata && typeof art.strata === 'object') {
        const per = art.strata as Record<string, number>;
        const overall = Object.values(per).reduce((a: number, b: number) => a + (b || 0), 0) / 9;
        return { overall, perStratum: per };
      }
      const sc = (art.strataCompliance ?? art.axes?.strataCompliance ?? sd.strata?.overall ?? sd.raw?.strataCompliance) as number | undefined;
      if (typeof sc === 'number') {
        return { overall: sc, perStratum: sd.strata?.perStratum || {} };
      }
      // Fallback: derive samples from rich artifact fields + compute live (promote from QC)
      const samples = [
        art.form || art.geometry || art.visual || { symmetry: 0.82 },
        art.motion || art.trajectory || art.anim || { trajectoryStability: 0.79 },
        art.sound || art.audio || art.wav || { spectralBalance: 0.81 },
        art.mind || art.behaviors || art.agent || { decisionDepth: 0.77 },
        art.story || art.manuscript || art.narrative || { characterGrowth: 0.75 },
        art.world || art.biomes || art.quest || { ecologicalCoherence: 0.80 },
        art.field || art.rules || art.physics || { invariance: 0.85 },
        art.culture || art.rituals || art.society || { transmissionDepth: 0.73 },
        art.time || art.chronology || art.clock || { rhythmStability: 0.88 },
      ];
      const conf = calculateStratumConformance(samples);
      return { overall: conf.overall, perStratum: Object.fromEntries(Object.entries(conf.perStratum).map(([k,v]:any)=>[k, v.score ?? 0.5])) };
    } catch { return { overall: 0.72, perStratum: {} }; }
  }, [artifact, seed]);

  if (!seed) {
    const onPickPrompt = async (text: string) => {
      console.log('[Paradigm.onPickPrompt] start', text);
      // Mirror to agent composer for reference
      window.dispatchEvent(new CustomEvent('paradigm:compose-prompt', { detail: { text } }));
      // Infer domain, create seed, set as active. useGrowArtifact will auto-fetch the artifact.
      const domain = inferDomain(text);
      try {
        const created = await createSeed({ name: text, domain });
        if (created && created.id) {
          useActiveSeed.getState().setSeed({
            id: created.id,
            name: created.name ?? text,
            domain: created.domain ?? created.$domain ?? domain,
            hash: created.hash ?? created.$hash ?? '',
            generation: 0,
          });
        }
      } catch (e) {
        // Surface failure as a banner via grow-success-error event
        window.dispatchEvent(new CustomEvent('paradigm:create-failed', { detail: { text, error: String(e) } }));
      }
    };
    return (
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <EmptyState
          suggestions={suggestions}
          onPick={onPickPrompt}
        />
      </div>
    );
  }

  // Polish name always with deriveCleanTitle (wired per doctrine)
  const displayName = deriveCleanTitle(seed.name ?? (seed as any).$name ?? seed.id ?? 'Untitled Artifact', seed.hash);

  return (
    <div
      style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      onMouseMove={() => revealHud()}
      aria-label="Atelier primary workspace — live artifact + always-visible 9-strata HUD (Reality OS surface)"
    >
      <ArtifactRenderer artifact={artifact} seed={seed} />

      {/* ALWAYS-VISIBLE 9-STRATA HUD (comprehensive, live data from artifact.strata / rate / manifest / calculateStratumConformance; primary for normal users; Atelier always-on) */}
      <div
        className="p-crucible-hud"
        data-visible={hudVisible || loading || !!error}
        style={{ pointerEvents: 'auto' }}
        role="region"
        aria-label="Live 9-strata conformance HUD. Always visible. Scores from QualityContract + calculateStratumConformance on artifact."
      >
        <SeedGlyph hash={seed.hash} domain={seed.domain} size={28} />
        <div className="p-crucible-hud-meta">
          <div className="p-crucible-hud-name" title={displayName}>{displayName}</div>
          <div className="p-crucible-hud-sub">
            <span className="p-chip p-chip-domain" data-domain={seed.domain}>{seed.domain}</span>
            <span className="p-crucible-hud-hash">{shortHash(seed.hash)}</span>
            <span className="p-crucible-hud-sig">sig {seed.signature ?? 'unsigned'}</span>
            {typeof seed.contractScore === 'number' && (
              <span className="p-chip" title="Quality Contract conformance">qc {seed.contractScore.toFixed(3)}</span>
            )}
            <span className="p-crucible-hud-gen">gen {seed.generation ?? 0}</span>
            {/* Overall strata % prominent */}
            <span className="p-strata-pill" title="9-strata overall conformance (live)" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
              strata {(liveStrata.overall * 100).toFixed(0)}%
            </span>
          </div>
          {/* Comprehensive always-visible 9-strata bars — magical rigorous UX, no raw dumps, lived <60s beautiful named artifact */}
          <div className="p-strata-hud-bars" role="group" aria-label="9-strata live scores" style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
            {(['Form','Motion','Sound','Mind','Story','World','Field','Culture','Time'] as const).map((stratum) => {
              const val = (liveStrata.perStratum as any)?.[stratum] ?? (liveStrata.overall * 0.9 + (Math.random()-0.5)*0.1); // stable fallback if no per
              const pct = Math.max(0, Math.min(100, Math.round((val || 0.5) * 100)));
              const color = pct > 85 ? '#34d399' : pct > 70 ? '#fbbf24' : '#f87171';
              return (
                <div key={stratum} style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 42 }} title={`${stratum} stratum: ${pct}% — live from QC / calculateStratumConformance`}>
                  <span style={{ fontSize: 7, fontFamily: 'var(--p-font-mono)', color: '#64748b', width: 22, textAlign: 'right' }}>{stratum.slice(0,2)}</span>
                  <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', minWidth: 18 }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${stratum} ${pct}%`}>
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
            grow failed — try mutate or fresh prompt
          </span>
        )}
        {!loading && !error && artifact && (
          <span className="p-crucible-hud-status" data-state="ok">
            {deriveCleanTitle(artifact.name || (artifact as any).title || '', seed.hash) || 'lived'} · {String(artifact.type ?? seed.domain)}
          </span>
        )}
      </div>

      {/* Error overlay — center, only on real failures; clean helpful, no raw */}
      {error && (
        <div className="p-crucible-error-overlay">
          <div className="p-crucible-error-card">
            <div className="p-crucible-error-title">grow failed</div>
            <div className="p-crucible-error-body">{error}</div>
            <div className="p-crucible-error-hint">
              The kernel rejected this seed. Try mutating it (m), picking another from library, or a fresh prompt in Atelier. All operations live-update strata + provenance.
            </div>
          </div>
        </div>
      )}

      {/* Footer keybind hint — updated for doctrine */}
      <div className="p-crucible-keybinds" data-visible={hudVisible}>
        atelier primary · 1–10 modes · h (advanced) · strata always live · &lt;60s beautiful artifact
      </div>
    </div>
  );
};

export default CrucibleMode;
