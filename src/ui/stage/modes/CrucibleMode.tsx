/**
 * CrucibleMode — the seed rendered in its native medium.
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme } from '@/hooks/useSeedTheme';
import { useGrowArtifact } from '@/hooks/useGrowArtifact';
import { getGenesisSuggestions } from '@/lib/ui/genesisSuggestions';
import { PrismStrip } from '@/ui/primitives/PrismStrip';
import PreviewViewport from '@/components/studio/PreviewViewport';
import { EmptyState } from '../EmptyState';
import { ModeCompass } from '../ModeCompass';

const shortHash = (h: string) => (h.length <= 12 ? h : `${h.slice(0, 6)}…${h.slice(-4)}`);

const PHOTOREAL_DOMAINS = new Set([
  'character', 'vehicle', 'fashion', 'furniture',
  'architecture', 'interior-design', 'food', 'jewelry',
]);

type Fidelity = 'abstract' | 'stylized' | 'photoreal';

export const CrucibleMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const theme = useSeedTheme(seed?.hash);
  const { artifact, loading } = useGrowArtifact();
  const suggestions = useMemo(() => getGenesisSuggestions(4), []);
  const [fidelity, setFidelity] = useState<Fidelity>('stylized');
  const [hudVisible, setHudVisible] = useState(true);

  const revealHud = useCallback(() => {
    setHudVisible(true);
    const t = window.setTimeout(() => setHudVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const cleanup = revealHud();
    return cleanup;
  }, [seed?.hash, revealHud]);

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (ev.key === 'r' && seed?.domain && PHOTOREAL_DOMAINS.has(seed.domain)) {
        ev.preventDefault();
        setFidelity((f) =>
          f === 'stylized' ? 'photoreal' : f === 'photoreal' ? 'abstract' : 'stylized',
        );
      }
      if (ev.key === 'h') {
        ev.preventDefault();
        setHudVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [seed?.domain]);

  const supportsPhotoreal = seed?.domain ? PHOTOREAL_DOMAINS.has(seed.domain) : false;
  const photoreal = fidelity === 'photoreal';

  if (!seed) {
    return (
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <EmptyState
          suggestions={suggestions}
          onPick={(text) => {
            window.dispatchEvent(new CustomEvent('paradigm:compose-prompt', { detail: { text } }));
          }}
        />
        <ModeCompass />
      </div>
    );
  }

  return (
    <div
      style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      onMouseMove={() => revealHud()}
    >
      <PreviewViewport artifact={artifact} seed={seed} loading={loading} />

      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 12px',
          background: hudVisible ? 'rgba(11, 13, 18, 0.65)' : 'rgba(11, 13, 18, 0)',
          backdropFilter: hudVisible ? 'blur(12px)' : 'none',
          border: hudVisible ? '1px solid var(--r-ink-4)' : '1px solid transparent',
          borderRadius: 'var(--r-radius-2)',
          transition: 'all 0.4s var(--r-ease)',
          pointerEvents: hudVisible ? 'auto' : 'none',
          zIndex: 10,
        }}
      >
        <PrismStrip hash={seed.hash} thickness={2} style={{ width: 64 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--r-font-display)', fontSize: 11, color: 'var(--r-ink-0)' }}>
              {seed.name}
            </span>
            <span className="r-chip" style={{ fontSize: 8 }}>{seed.domain}</span>
          </div>
          <div style={{ fontFamily: 'var(--r-font-num)', fontSize: 9, color: 'var(--r-ink-3)' }}>
            {shortHash(seed.hash)} · sig {seed.signature ?? 'unsigned'} · {seed.anchor ?? 'none'}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {typeof seed.contractScore === 'number' && (
          <span className="r-chip" style={{ fontSize: 8 }}>
            q {seed.contractScore.toFixed(3)}
          </span>
        )}
        <span className="r-chip" style={{ fontSize: 8 }}>
          {theme.resonanceNote} · {theme.resonanceHz}Hz
        </span>
        {supportsPhotoreal && (
          <button
            type="button"
            onClick={() =>
              setFidelity((f) =>
                f === 'stylized' ? 'photoreal' : f === 'photoreal' ? 'abstract' : 'stylized',
              )
            }
            className="r-chip"
            style={{
              cursor: 'pointer',
              borderColor: photoreal ? 'var(--r-prism-core)' : 'var(--r-ink-4)',
              color: photoreal ? 'var(--r-prism-core)' : 'var(--r-ink-2)',
            }}
          >
            {fidelity}
          </button>
        )}
      </div>

      <ModeCompass />

      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 12,
          fontFamily: 'var(--r-font-num)',
          fontSize: 9,
          color: 'var(--r-ink-3)',
          opacity: hudVisible ? 1 : 0,
        }}
      >
        crucible · 1-7 modes · r fidelity · h hud
      </div>
    </div>
  );
};
