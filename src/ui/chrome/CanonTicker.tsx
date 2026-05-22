import React from 'react';

interface CanonTickerProps {
  count?: number;
}

export const CanonTicker: React.FC<CanonTickerProps> = ({ count = 0 }) => (
  <span
    className="r-chip"
    title="Training canon · seeds registered in the last 24h"
    style={{ paddingRight: 6 }}
  >
    <span style={{ color: 'var(--r-ink-3)' }}>canon</span>
    <span style={{ color: 'var(--r-ink-1)' }}>+{count}</span>
  </span>
);
