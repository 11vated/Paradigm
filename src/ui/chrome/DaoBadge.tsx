import React from 'react';

interface DaoBadgeProps {
  proposalsActive?: number;
  votingPower?: number;
}

export const DaoBadge: React.FC<DaoBadgeProps> = ({
  proposalsActive = 0,
  votingPower = 0,
}) => (
  <span className="r-chip" title="DAO · open proposals · your voting power">
    <span style={{ color: 'var(--r-ink-3)' }}>dao</span>
    <span style={{ color: 'var(--r-ink-1)' }}>{proposalsActive}</span>
    <span style={{ color: 'var(--r-ink-3)' }}>·</span>
    <span style={{ color: 'var(--r-ink-2)' }}>vp {votingPower.toFixed(0)}</span>
  </span>
);
