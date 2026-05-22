import React from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme } from '@/hooks/useSeedTheme';

const shortHash = (h: string) => (h.length <= 12 ? h : `${h.slice(0, 6)}…${h.slice(-4)}`);

const GeneBlock: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ padding: 'var(--r-px-3) var(--r-px-4)', borderLeft: `2px solid ${color}`, background: 'rgba(255,255,255,0.012)', borderRadius: '0 var(--r-radius-1) var(--r-radius-1) 0' }}>
    <div style={{ fontFamily: 'var(--r-font-display)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color }}>{label}</div>
    <div style={{ fontFamily: 'var(--r-font-num)', fontSize: 12, color: 'var(--r-ink-1)', marginTop: 2, wordBreak: 'break-all' }}>{value}</div>
  </div>
);

export const AnatomyMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const theme = useSeedTheme(seed?.hash);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ padding: 'var(--r-px-4) var(--r-px-5)', borderBottom: '1px solid var(--r-ink-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--r-font-display)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.core }}>Anatomy · Gene Composition</span>
        <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 9, color: 'var(--r-ink-3)' }}>{seed?.name ?? '—'}</span>
      </header>
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--r-px-5)', display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', alignContent: 'start' }}>
        {seed ? (
          <>
            <GeneBlock label="name" value={seed.name} color={theme.core} />
            <GeneBlock label="domain" value={seed.domain} color={theme.resonant} />
            <GeneBlock label="hash" value={shortHash(seed.hash)} color={theme.gradA} />
            <GeneBlock label="full hash" value={seed.hash} color={theme.gradB} />
            <GeneBlock label="generation" value={String(seed.generation ?? 0)} color={theme.warm} />
            <GeneBlock label="signature" value={seed.signature ?? 'unsigned'} color={theme.cool} />
            <GeneBlock label="anchor" value={seed.anchor ?? 'none'} color="var(--r-ink-3)" />
            {typeof seed.contractScore === 'number' && (
              <GeneBlock label="contract score" value={seed.contractScore.toFixed(4)} color={seed.contractScore >= 0.9 ? 'var(--r-ok)' : 'var(--r-warn)'} />
            )}
            <GeneBlock label="resonance" value={`${theme.resonanceNote} · ${theme.resonanceHz}Hz`} color="var(--r-prism-resonant)" />
            <GeneBlock label="id" value={seed.id} color="var(--r-ink-4)" />
          </>
        ) : (
          <span style={{ color: 'var(--r-ink-3)', fontSize: 11, fontStyle: 'italic' }}>no active seed</span>
        )}
      </div>
    </div>
  );
};
