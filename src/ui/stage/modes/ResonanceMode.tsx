/**
 * ResonanceMode — frequency field + cross-domain bridges.
 */
import React, { useMemo } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme } from '@/hooks/useSeedTheme';
import PreviewViewport from '@/components/studio/PreviewViewport';
import { useGrowArtifact } from '@/hooks/useGrowArtifact';

export const ResonanceMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const theme = useSeedTheme(seed?.hash);
  const { artifact, loading } = useGrowArtifact();

  const waves = useMemo(() => {
    if (!seed?.hash) return [];
    const hz = theme.resonanceHz;
    return Array.from({ length: 12 }, (_, i) => ({
      phase: (i / 12) * Math.PI * 2,
      amp: 0.3 + 0.7 * Math.abs(Math.sin((hz + i * 37) * 0.01)),
    }));
  }, [seed?.hash, theme.resonanceHz]);

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
        {seed ? <PreviewViewport artifact={artifact} seed={seed} loading={loading} /> : null}
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: 24,
          background: `linear-gradient(to top, color-mix(in oklab, ${theme.resonant} 25%, transparent), transparent 60%)`,
          pointerEvents: 'none',
        }}
      >
        <div style={{ width: '100%', maxWidth: 480, height: 80, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          {waves.map((w, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${w.amp * 100}%`,
                background: `linear-gradient(to top, ${theme.core}, ${theme.resonant})`,
                opacity: 0.6,
                borderRadius: '2px 2px 0 0',
              }}
            />
          ))}
        </div>
        <p style={{ marginTop: 12, fontFamily: 'var(--r-font-num)', fontSize: 10, color: 'var(--r-ink-1)' }}>
          {theme.resonanceNote} · {theme.resonanceHz}Hz · standing-wave field
        </p>
      </div>
    </div>
  );
};
