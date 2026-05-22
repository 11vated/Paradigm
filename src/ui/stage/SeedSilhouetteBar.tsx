import React from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useSeedTheme } from '@/hooks/useSeedTheme';
import { PrismStrip } from '@/ui/primitives/PrismStrip';

const StatusChip: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({
  label,
  value,
  tone,
}) => (
  <span className="r-chip" style={{ borderColor: 'transparent' }}>
    <span style={{ color: 'var(--r-ink-3)' }}>{label}</span>
    <span style={{ color: tone ?? 'var(--r-ink-1)' }}>{value}</span>
  </span>
);

export const SeedSilhouetteBar: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const theme = useSeedTheme(seed?.hash);

  return (
    <div
      style={{
        height: 44,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        borderBottom: '1px solid var(--r-ink-4)',
        background: 'rgba(255,255,255,0.012)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--r-font-display)',
          fontSize: 11,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--r-ink-1)',
        }}
      >
        {seed?.name ?? 'no active seed'}
      </span>

      <div style={{ width: 120 }}>
        <PrismStrip hash={seed?.hash} thickness={2} />
      </div>

      <StatusChip label="hash" value={
        <span style={{ fontFamily: 'var(--r-font-num)' }}>
          {seed ? seed.hash.slice(0, 10) + '…' : '—'}
        </span>
      } />
      <StatusChip label="domain" value={seed?.domain ?? '—'} />
      <StatusChip label="gen"    value={String(seed?.generation ?? 0)} />
      <StatusChip
        label="resonance"
        value={`${theme.resonanceNote} · ${theme.resonanceHz}Hz`}
      />

      <div style={{ flex: 1 }} />

      <StatusChip
        label="sig"
        value={seed?.signature ?? 'unsigned'}
        tone={seed?.signature === 'verified' ? 'var(--r-ok)' : 'var(--r-ink-2)'}
      />
      <StatusChip
        label="anchor"
        value={seed?.anchor ?? 'none'}
        tone={seed?.anchor === 'minted' ? 'var(--r-ok)' : 'var(--r-ink-2)'}
      />
      <StatusChip
        label="contract"
        value={typeof seed?.contractScore === 'number'
          ? seed.contractScore.toFixed(3)
          : '—'}
        tone={
          typeof seed?.contractScore === 'number' && seed.contractScore >= 0.9
            ? 'var(--r-ok)'
            : 'var(--r-ink-2)'
        }
      />
    </div>
  );
};
