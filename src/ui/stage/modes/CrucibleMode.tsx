/**
 * CrucibleMode — the seed rendered in its native medium.
 *
 * Per spec §IV.4: the artifact viewport with a deferred HUD.
 *  - HUD shows seed name, glyph, domain, contract score, signature state.
 *  - Body shows the live artifact via PreviewViewport.
 *  - Loading / error states are explicit and visible.
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

const shortHash = (h: string) => (h.length <= 12 ? h : `${h.slice(0, 6)}…${h.slice(-4)}`);

export const CrucibleMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const { artifact, loading, error } = useGrowArtifact();
  const suggestions = useMemo(() => getGenesisSuggestions(4), []);
  const [hudVisible, setHudVisible] = useState(true);

  const revealHud = useCallback(() => {
    setHudVisible(true);
    const t = window.setTimeout(() => setHudVisible(false), 4000);
    return () => clearTimeout(t);
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

  return (
    <div
      style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      onMouseMove={() => revealHud()}
    >
      <ArtifactRenderer artifact={artifact} seed={seed} />

      {/* Hovering HUD — top */}
      <div
        className="p-crucible-hud"
        data-visible={hudVisible || loading || !!error}
      >
        <SeedGlyph hash={seed.hash} domain={seed.domain} size={32} />
        <div className="p-crucible-hud-meta">
          <div className="p-crucible-hud-name">{seed.name ?? seed.id}</div>
          <div className="p-crucible-hud-sub">
            <span className="p-chip p-chip-domain" data-domain={seed.domain}>{seed.domain}</span>
            <span className="p-crucible-hud-hash">{shortHash(seed.hash)}</span>
            <span className="p-crucible-hud-sig">sig {seed.signature ?? 'unsigned'}</span>
            {typeof seed.contractScore === 'number' && (
              <span className="p-chip">q {seed.contractScore.toFixed(3)}</span>
            )}
            <span className="p-crucible-hud-gen">gen {seed.generation ?? 0}</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {loading && (
          <span className="p-crucible-hud-status" data-state="busy">
            <span className="p-spinner" />
            growing…
          </span>
        )}
        {!loading && error && (
          <span className="p-crucible-hud-status" data-state="error" title={error}>
            grow failed
          </span>
        )}
        {!loading && !error && artifact && (
          <span className="p-crucible-hud-status" data-state="ok">
            grown · {String(artifact.type ?? seed.domain)}
          </span>
        )}
      </div>

      {/* Error overlay — center, only on real failures */}
      {error && (
        <div className="p-crucible-error-overlay">
          <div className="p-crucible-error-card">
            <div className="p-crucible-error-title">grow failed</div>
            <div className="p-crucible-error-body">{error}</div>
            <div className="p-crucible-error-hint">
              The kernel rejected this seed. Try mutating it, picking another, or growing a fresh visual2d / world / website seed instead.
            </div>
          </div>
        </div>
      )}

      {/* Footer keybind hint */}
      <div className="p-crucible-keybinds" data-visible={hudVisible}>
        crucible · 1–10 modes · h toggle hud · r refresh
      </div>
    </div>
  );
};

export default CrucibleMode;
