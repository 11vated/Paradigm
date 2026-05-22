/**
 * CrucibleMode — the seed rendered in its native medium.
 *
 * This is the default center-stage mode (mode 1). It delegates to
 * PreviewViewport which routes to one of 7 viewport types based on
 * the seed's domain. A floating HUD overlay shows seed identity data.
 *
 * Keyboard:
 *   r — toggle photorealistic renderer (8 supported domains)
 *   h — toggle floating HUD visibility
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme } from '@/hooks/useSeedTheme';
import { PrismStrip } from '@/ui/primitives/PrismStrip';
import PreviewViewport from '@/components/studio/PreviewViewport';

const shortHash = (h: string) => (h.length <= 12 ? h : `${h.slice(0, 6)}…${h.slice(-4)}`);

const PHOTOREAL_DOMAINS = new Set([
  'character', 'vehicle', 'fashion', 'furniture',
  'architecture', 'interior-design', 'food', 'jewelry',
]);

export const CrucibleMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const theme = useSeedTheme(seed?.hash);
  const [photoreal, setPhotoreal] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  let hudTimer: ReturnType<typeof setTimeout>;

  // Auto-hide HUD after 4s, reveal on mouse move
  const revealHud = useCallback(() => {
    setHudVisible(true);
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => setHudVisible(false), 4000);
  }, []);

  useEffect(() => {
    // reset timer on seed change
    revealHud();
    return () => clearTimeout(hudTimer);
  }, [seed?.hash]);

  // r = photoreal toggle, h = HUD toggle
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (ev.key === 'r') {
        ev.preventDefault();
        if (seed?.domain && PHOTOREAL_DOMAINS.has(seed.domain)) {
          setPhotoreal((p) => !p);
        }
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

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseMove={revealHud}
    >
      <PreviewViewport
        artifact={null}
        seed={seed}
        loading={false}
      />

      {/* Floating HUD — auto-hides after 4s of inactivity */}
      {seed && (
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
            background: hudVisible
              ? 'rgba(11, 13, 18, 0.65)'
              : 'rgba(11, 13, 18, 0)',
            backdropFilter: hudVisible ? 'blur(12px)' : 'none',
            WebkitBackdropFilter: hudVisible ? 'blur(12px)' : 'none',
            border: hudVisible ? '1px solid var(--r-ink-4)' : '1px solid transparent',
            borderRadius: 'var(--r-radius-2)',
            transition: 'all 0.4s var(--r-ease)',
            pointerEvents: hudVisible ? 'auto' : 'none',
            zIndex: 10,
          }}
        >
          <div style={{ width: 64, flexShrink: 0 }}>
            <PrismStrip hash={seed.hash} thickness={2} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--r-font-display)', fontSize: 11, letterSpacing: '0.16em', color: 'var(--r-ink-0)' }}>
                {seed.name}
              </span>
              <span className="r-chip" style={{ fontSize: 8, padding: '0 6px' }}>
                {seed.domain}
              </span>
              <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 9, color: 'var(--r-ink-3)' }}>
                gen {seed.generation ?? 0}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--r-font-num)', fontSize: 9, color: 'var(--r-ink-3)' }}>
              <span title={seed.hash}>{shortHash(seed.hash)}</span>
              <span>·</span>
              <span style={{ color: seed.signature === 'verified' ? 'var(--r-ok)' : 'var(--r-ink-3)' }}>
                sig · {seed.signature ?? 'unsigned'}
              </span>
              <span>·</span>
              <span style={{ color: seed.anchor === 'minted' ? 'var(--r-ok)' : 'var(--r-ink-3)' }}>
                {seed.anchor ?? 'no anchor'}
              </span>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {typeof seed.contractScore === 'number' && (
              <span className="r-chip" title="quality contract score" style={{ borderColor: 'transparent' }}>
                <span style={{ color: 'var(--r-ink-3)' }}>q </span>
                <span style={{ color: seed.contractScore >= 0.9 ? 'var(--r-ok)' : 'var(--r-ink-1)' }}>
                  {seed.contractScore.toFixed(3)}
                </span>
              </span>
            )}
            <span className="r-chip" style={{ borderColor: 'transparent' }}>
              <span style={{ color: 'var(--r-ink-3)' }}>res </span>
              <span style={{ color: 'var(--r-ink-1)' }}>
                {theme.resonanceNote} · {theme.resonanceHz}Hz
              </span>
            </span>
            {supportsPhotoreal && (
              <button
                onClick={() => setPhotoreal((p) => !p)}
                className="r-chip"
                style={{
                  cursor: 'pointer',
                  borderColor: photoreal ? 'var(--r-prism-core)' : 'var(--r-ink-4)',
                  color: photoreal ? 'var(--r-prism-core)' : 'var(--r-ink-2)',
                  transition: 'all 0.2s var(--r-ease)',
                }}
                title="Toggle photorealistic renderer"
              >
                {photoreal ? '● photorealism' : '○ stylized'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom status — mode and key hints */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          height: 22,
          fontFamily: 'var(--r-font-num)',
          fontSize: 9,
          color: 'var(--r-ink-3)',
          letterSpacing: '0.06em',
          opacity: hudVisible ? 1 : 0,
          transition: 'opacity 0.4s var(--r-ease)',
        }}
      >
        <span style={{ color: 'var(--r-ink-2)' }}>mode · crucible</span>
        <span style={{ color: 'var(--r-ink-4)' }}>·</span>
        <span>1-7 switch · r photoreal · h hud</span>
        <span style={{ color: 'var(--r-ink-4)' }}>·</span>
        <span>{photoreal ? 'photoreal' : 'stylized'}</span>
      </div>
    </div>
  );
};
