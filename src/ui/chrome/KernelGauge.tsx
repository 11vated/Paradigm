import React from 'react';

export const KernelGauge: React.FC = () => (
  <span
    className="r-chip"
    title="kernel determinism invariant · enforced at build by ESLint"
    style={{ borderColor: 'transparent', paddingLeft: 0 }}
  >
    <span
      aria-hidden
      style={{
        width: 6,
        height: 6,
        borderRadius: 9999,
        background: 'var(--r-ok)',
        boxShadow: '0 0 8px var(--r-ok)',
      }}
    />
    <span style={{ color: 'var(--r-ink-2)' }}>
      deterministic
    </span>
  </span>
);
