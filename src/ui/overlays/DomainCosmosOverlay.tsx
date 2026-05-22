/**
 * DomainCosmosOverlay — cmd+space navigator across all engines.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { rngFromHash } from '@/lib/kernel/rng';
import { useActiveSeed } from '@/stores/activeSeed';
import { kernelSeedToActive } from '@/lib/ui/seedBridge';

interface EngineMeta {
  domain: string;
  label: string;
  contractScore?: number;
}

interface DomainCosmosOverlayProps {
  open: boolean;
  onClose: () => void;
}

export const DomainCosmosOverlay: React.FC<DomainCosmosOverlayProps> = ({ open, onClose }) => {
  const [search, setSearch] = useState('');
  const [engines, setEngines] = useState<EngineMeta[]>([]);
  const setSeed = useActiveSeed((s) => s.setSeed);

  useEffect(() => {
    if (!open) return;
    fetch('/api/cosmos/engines')
      .then((r) => r.json())
      .then((j) => setEngines(j.engines ?? []))
      .catch(() => {
        import('@/lib/kernel/engines').then(({ getAllDomains }) => {
          setEngines(
            getAllDomains().map((domain) => ({ domain, label: domain })),
          );
        });
      });
  }, [open]);

  const stars = useMemo(() => {
    const rng = rngFromHash('cosmos-ui-layout-v1').fork('positions');
    return engines.map((e) => ({
      ...e,
      x: 10 + rng.nextF64() * 80,
      y: 10 + rng.nextF64() * 70,
      size: 4 + rng.nextF64() * 8,
    }));
  }, [engines]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stars;
    return stars.filter(
      (s) => s.domain.includes(q) || s.label.toLowerCase().includes(q),
    );
  }, [stars, search]);

  const growHere = async (domain: string) => {
    try {
      const res = await fetch('/api/seeds/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, prompt: search || domain }),
      });
      const json = await res.json();
      const active = kernelSeedToActive(json.seed ?? json);
      if (active) setSeed(active);
    } catch {
      setSeed({
        id: `seed:${domain}`,
        name: `${domain} seed`,
        domain,
        hash: Array.from({ length: 64 }, (_, i) => {
          const r = rngFromHash(`grow-${domain}-${search}`).fork('h');
          return Math.floor(r.nextF64() * 16).toString(16);
        }).join(''),
        generation: 0,
      });
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Domain Cosmos"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(5, 5, 8, 0.92)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <header
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--r-ink-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontFamily: 'var(--r-font-display)', fontSize: 11, letterSpacing: '0.16em', color: 'var(--r-ink-0)' }}>
          ✦ Domain Cosmos
        </span>
        <span style={{ fontFamily: 'var(--r-font-num)', fontSize: 9, color: 'var(--r-ink-3)' }}>
          {engines.length}+ engines
        </span>
        <div style={{ flex: 1 }} />
        <button type="button" className="r-btn" onClick={onClose} style={{ height: 24, fontSize: 9 }}>
          esc
        </button>
      </header>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          {filtered.map((s) => (
            <g
              key={s.domain}
              style={{ cursor: 'pointer' }}
              onClick={() => void growHere(s.domain)}
            >
              <circle
                cx={s.x}
                cy={s.y}
                r={s.size / 10}
                fill="var(--r-prism-core)"
                opacity={0.35 + (s.contractScore ?? 0.5) * 0.4}
              />
              <title>{s.domain}</title>
            </g>
          ))}
        </svg>
      </div>

      <footer style={{ padding: 12, borderTop: '1px solid var(--r-ink-4)' }}>
        <input
          className="r-input"
          autoFocus
          placeholder="Search engines — warrior, music, world…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', fontFamily: 'var(--r-font-prose)', fontSize: 13 }}
        />
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {filtered.slice(0, 12).map((s) => (
            <button
              key={s.domain}
              type="button"
              className="r-chip"
              onClick={() => void growHere(s.domain)}
              style={{ cursor: 'pointer', fontSize: 10 }}
            >
              grow · {s.domain}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
};
