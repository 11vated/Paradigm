import React from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { useMode, MODE_LABEL } from '@/stores/modeStore';
import { KernelGauge } from './KernelGauge';

interface TopBarProps { onCosmos?: () => void; }

const ParadigmMark: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer diamond */}
    <path d="M11 1L21 11L11 21L1 11Z" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3"/>
    {/* Inner diamond — filled */}
    <path d="M11 5L17 11L11 17L5 11Z" fill="currentColor" opacity="0.9"/>
    {/* Core dot */}
    <circle cx="11" cy="11" r="2" fill="var(--r-void)" />
  </svg>
);

const DOMAIN_COLORS: Record<string, string> = {
  character: '#A78BFA', music: '#34D399', visual2d: '#F59E0B', world: '#10B981',
  molecule: '#60A5FA', quantum: '#818CF8', field: '#06B6D4', cosmology: '#7C3AED',
  website: '#F97316', app: '#EC4899', game: '#EAB308', narrative: '#A3E635',
  sprite: '#FB923C', agent: '#38BDF8',
};

export const TopBar: React.FC<TopBarProps> = ({ onCosmos }) => {
  const seed  = useActiveSeed((s) => s.seed);
  const { mode } = useMode();
  const domainColor = seed?.domain ? (DOMAIN_COLORS[seed.domain] ?? '#6366F1') : null;

  return (
    <header role="banner" className="r-topbar">
      {/* ── Wordmark ─────────────────────────────────────────────────────── */}
      <div className="r-topbar-wordmark" style={{ color: 'var(--r-prism-core)' }}>
        <div className="r-topbar-mark">
          <ParadigmMark />
        </div>
        <span className="r-topbar-name">Paradigm</span>
      </div>

      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <div className="r-topbar-breadcrumb">
        <span className="r-sep">/</span>
        <span className="r-active" style={{ color: 'var(--r-ink-0)' }}>
          {MODE_LABEL[mode]}
        </span>
        {seed && (
          <>
            <span className="r-sep">/</span>
            <span
              style={{
                color: domainColor ?? 'var(--r-ink-2)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                fontSize: 10,
              }}
            >
              {seed.domain}
            </span>
            <span className="r-sep">·</span>
            <span style={{ color: 'var(--r-ink-3)', fontSize: 10 }}>
              {seed.name?.length > 28 ? seed.name.slice(0, 28) + '…' : seed.name}
            </span>
          </>
        )}
      </div>

      {/* ── Center — kernel status ───────────────────────────────────────── */}
      <div className="r-topbar-center">
        <KernelGauge />
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="r-topbar-actions">
        <button
          type="button"
          className="r-btn"
          data-tone="primary"
          onClick={onCosmos}
          title="Domain Cosmos (⌘ Space)"
          style={{ height: 28, padding: '0 12px', fontSize: 11 }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M5 0L6.18 3.82L10 5L6.18 6.18L5 10L3.82 6.18L0 5L3.82 3.82Z"/>
          </svg>
          Cosmos
        </button>
        <div
          className="r-chip"
          style={{
            background: 'rgba(16,185,129,0.08)',
            borderColor: 'rgba(16,185,129,0.2)',
            color: 'var(--r-ok)',
          }}
        >
          ● deterministic
        </div>
      </div>
    </header>
  );
};
