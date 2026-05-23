import React, { useState, useEffect, useCallback } from 'react';
import { useAgentThreads } from '@/stores/agentThreads';
import { useMode, MODES, MODE_LABEL, MODE_HINT, type Mode } from '@/stores/modeStore';
import { useActiveSeed } from '@/stores/activeSeed';
import { kernelSeedToActive } from '@/lib/ui/seedBridge';
import { listSeeds } from '@/services/api';

/* ── Domain color registry ──────────────────────────────────────────────── */
const DOMAIN_COLORS: Record<string, string> = {
  character: '#A78BFA', music: '#34D399', visual2d: '#F59E0B',
  world: '#10B981', molecule: '#60A5FA', quantum: '#818CF8',
  field: '#06B6D4', cosmology: '#7C3AED', website: '#F97316',
  app: '#EC4899', game: '#EAB308', narrative: '#A3E635',
  sprite: '#FB923C', agent: '#38BDF8', physics: '#F472B6',
  geometry3d: '#C084FC', audio: '#4ADE80', alife: '#FB923C',
};

const domainColor = (d?: string) => d ? (DOMAIN_COLORS[d] ?? '#6366F1') : '#6366F1';

/* ── Hash → seed glyph (deterministic 2-char) ───────────────────────────── */
const GLYPH_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
function hashGlyph(hash: string): string {
  if (!hash || hash.length < 4) return '??';
  const a = parseInt(hash.slice(0, 2), 16) % GLYPH_CHARS.length;
  const b = parseInt(hash.slice(2, 4), 16) % GLYPH_CHARS.length;
  return GLYPH_CHARS[a] + GLYPH_CHARS[b];
}

/* ── Seed Glyph Card ─────────────────────────────────────────────────────── */
const SeedGlyphIcon: React.FC<{ hash: string; domain?: string; size?: number }> = ({
  hash, domain, size = 32,
}) => {
  const color = domainColor(domain);
  const glyph = hashGlyph(hash);
  const hx = parseInt(hash.slice(0, 8), 16) || 0;
  const angle = (hx % 360);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        background: `linear-gradient(${angle}deg, ${color}22, ${color}44)`,
        border: `1px solid ${color}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontFamily: 'var(--r-font-mono)',
        fontWeight: 700,
        fontSize: size * 0.34,
        color,
        letterSpacing: '0.02em',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* subtle diagonal stripe */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(${angle + 45}deg, transparent 0, transparent 4px, ${color}08 4px, ${color}08 5px)`,
      }}/>
      <span style={{ position: 'relative', zIndex: 1 }}>{glyph}</span>
    </div>
  );
};

/* ── Collapsible Section ─────────────────────────────────────────────────── */
const Section: React.FC<{
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ label, children, action, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="r-rail-section">
      <div
        className="r-rail-section-header"
        onClick={() => setOpen(o => !o)}
        style={{ gap: 8 }}
      >
        <span className="r-rail-section-label">{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
          <span style={{ fontFamily: 'var(--r-font-mono)', fontSize: 9, color: 'var(--r-ink-4)', userSelect: 'none' }}>
            {open ? '−' : '+'}
          </span>
        </div>
      </div>
      {open && (
        <div className="r-rail-section-body">
          {children}
        </div>
      )}
    </section>
  );
};

/* ── Mode icon glyphs ────────────────────────────────────────────────────── */
const MODE_GLYPHS: Record<string, string> = {
  crucible:    '◈', atelier:    '⬡', anatomy:  '⬟',
  resonance:   '≋', lineage:    '⊕', codex:    '⊞',
  topology:    '⧉', evolution:  '⟳', substrate:'⊛', sovereignty: '◆',
};

interface LeftRailProps { onCosmos?: () => void; }

export const LeftRail: React.FC<LeftRailProps> = ({ onCosmos }) => {
  const { threads, currentThreadId, setCurrent, newThread } = useAgentThreads();
  const { mode, setMode } = useMode();
  const seed    = useActiveSeed(s => s.seed);
  const setSeed = useActiveSeed(s => s.setSeed);
  const [library, setLibrary]   = useState<Array<Record<string, unknown>>>([]);
  const [libSearch, setLibSearch] = useState('');

  useEffect(() => {
    listSeeds()
      .then(list => setLibrary(Array.isArray(list) ? list : []))
      .catch(() => setLibrary([]));
  }, [seed?.id]);

  const filteredLib = library.filter(s => {
    const q = libSearch.trim().toLowerCase();
    if (!q) return true;
    const name   = String((s as any).name   ?? '');
    const domain = String((s as any).domain ?? '');
    const hash   = String((s as any).hash ?? (s as any).$hash ?? '');
    return name.toLowerCase().includes(q) || domain.includes(q) || hash.includes(q);
  });

  return (
    <aside className="r-rail">

      {/* ── Active Seed Hero ─────────────────────────────────────────────── */}
      {seed ? (
        <div style={{
          padding: '14px 14px 12px',
          borderBottom: '1px solid var(--r-ink-5)',
          background: `linear-gradient(135deg, ${domainColor(seed.domain)}0A 0%, transparent 60%)`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SeedGlyphIcon hash={seed.hash} domain={seed.domain} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--r-font-display)',
                fontWeight: 600, fontSize: 13,
                color: 'var(--r-ink-0)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                marginBottom: 3,
              }}>
                {seed.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontFamily: 'var(--r-font-mono)', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: domainColor(seed.domain),
                }}>
                  {seed.domain}
                </span>
                <span style={{ color: 'var(--r-ink-4)', fontSize: 9 }}>·</span>
                <span style={{ fontFamily: 'var(--r-font-mono)', fontSize: 9, color: 'var(--r-ink-3)' }}>
                  gen {seed.generation ?? 0}
                </span>
                {seed.signature === 'verified' && (
                  <span style={{
                    fontFamily: 'var(--r-font-mono)', fontSize: 8, color: 'var(--r-ok)',
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 99, padding: '0 5px',
                  }}>✓ signed</span>
                )}
              </div>
            </div>
          </div>
          {/* Hash strip */}
          <div style={{
            marginTop: 10,
            fontFamily: 'var(--r-font-mono)', fontSize: 8,
            color: 'var(--r-ink-4)', letterSpacing: '0.08em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {seed.hash.slice(0, 32)}…
          </div>
        </div>
      ) : (
        <div style={{
          padding: '14px',
          borderBottom: '1px solid var(--r-ink-5)',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: 'var(--r-font-mono)', fontSize: 10,
            color: 'var(--r-ink-3)', textAlign: 'center',
            padding: '12px 0',
          }}>
            no seed active<br/>
            <span style={{ fontSize: 8, color: 'var(--r-ink-4)', marginTop: 4, display: 'block' }}>
              speak to the agent to begin
            </span>
          </div>
        </div>
      )}

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* MODES */}
        <Section label="Modes">
          <ul className="r-mode-list">
            {MODES.map((m: Mode, i) => {
              const active = m === mode;
              return (
                <li key={m}>
                  <button
                    className="r-mode-btn"
                    data-active={active}
                    onClick={() => setMode(m)}
                  >
                    <span className="r-mode-num">{i + 1}</span>
                    <span style={{
                      fontSize: 14, color: active ? 'var(--r-prism-core)' : 'var(--r-ink-3)',
                      lineHeight: 1, flexShrink: 0,
                    }}>
                      {MODE_GLYPHS[m] ?? '○'}
                    </span>
                    <span className="r-mode-label">{MODE_LABEL[m]}</span>
                    <span className="r-mode-hint">{MODE_HINT[m]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>

        {/* LIBRARY */}
        <Section
          label="Library"
          action={
            <span style={{
              fontFamily: 'var(--r-font-mono)', fontSize: 9,
              color: 'var(--r-ink-3)',
            }}>
              {filteredLib.length}
            </span>
          }
        >
          <input
            className="r-input"
            placeholder="search seeds…"
            value={libSearch}
            onChange={e => setLibSearch(e.target.value)}
            style={{ width: '100%', marginBottom: 8, fontSize: 12, padding: '7px 10px' }}
          />
          <div style={{ display: 'grid', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
            {filteredLib.slice(0, 16).map(s => {
              const id     = String((s as any).id ?? (s as any).$hash ?? '');
              const hash   = String((s as any).hash ?? (s as any).$hash ?? id);
              const name   = String((s as any).name ?? id.slice(0, 8));
              const domain = String((s as any).domain ?? '?');
              const active = seed?.id === id;
              const activeSeed = kernelSeedToActive(s);
              return (
                <button
                  key={id}
                  type="button"
                  className="r-seed-card"
                  data-active={active}
                  onClick={() => activeSeed && setSeed(activeSeed)}
                  style={{ width: '100%', textAlign: 'left', padding: '7px 8px' }}
                >
                  <SeedGlyphIcon hash={hash} domain={domain} size={28} />
                  <div className="r-seed-info">
                    <div className="r-seed-name" style={{ fontSize: 12 }}>{name}</div>
                    <div className="r-seed-meta">
                      <span style={{ color: domainColor(domain) }}>{domain}</span>
                      {' · '}
                      <span>{hash.slice(0, 6)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredLib.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--r-ink-3)', padding: '8px 0' }}>
                no seeds yet
              </div>
            )}
          </div>
        </Section>

        {/* THREADS */}
        <Section
          label="Threads"
          action={
            <button
              className="r-btn"
              style={{ height: 20, padding: '0 8px', fontSize: 10 }}
              onClick={() => newThread()}
            >
              + new
            </button>
          }
          defaultOpen={false}
        >
          <div style={{ display: 'grid', gap: 4 }}>
            {threads.map(t => {
              const active = t.id === currentThreadId;
              return (
                <button
                  key={t.id}
                  onClick={() => setCurrent(t.id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px',
                    background: active ? 'rgba(124,58,237,0.08)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(124,58,237,0.25)' : 'transparent'}`,
                    borderRadius: 'var(--r-radius-2)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    width: 4, height: 4, borderRadius: 99,
                    background: active ? 'var(--r-prism-core)' : 'var(--r-ink-3)',
                    flexShrink: 0,
                  }}/>
                  <span style={{
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontFamily: 'var(--r-font-display)', fontSize: 12,
                    color: active ? 'var(--r-ink-0)' : 'var(--r-ink-2)',
                  }}>
                    {t.title}
                  </span>
                  <span style={{ fontFamily: 'var(--r-font-mono)', fontSize: 9, color: 'var(--r-ink-4)' }}>
                    {t.turns.length}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* SOVEREIGNTY */}
        <Section label="Sovereignty" defaultOpen={false}>
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              { key: 'signature', val: seed?.signature ?? 'unsigned' },
              { key: 'anchor',    val: seed?.anchor    ?? 'none'     },
              { key: 'contract',  val: typeof seed?.contractScore === 'number' ? seed.contractScore.toFixed(3) : '—' },
            ].map(row => (
              <div key={row.key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 8px',
                background: 'var(--r-void-2)',
                borderRadius: 'var(--r-radius-1)',
                border: '1px solid var(--r-ink-5)',
              }}>
                <span style={{ fontFamily: 'var(--r-font-mono)', fontSize: 10, color: 'var(--r-ink-3)' }}>
                  {row.key}
                </span>
                <span style={{
                  fontFamily: 'var(--r-font-mono)', fontSize: 10,
                  color: (row.val === 'verified' || row.val === 'minted') ? 'var(--r-ok)'
                       : row.val === 'unsigned' || row.val === 'none' ? 'var(--r-ink-3)'
                       : 'var(--r-ink-1)',
                  fontWeight: 700,
                }}>
                  {row.val}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* COSMOS */}
        <Section label="Cosmos — 34 Engines" defaultOpen={false}>
          <button
            type="button"
            className="r-btn"
            data-tone="primary"
            onClick={onCosmos}
            style={{ width: '100%', height: 36, fontSize: 12 }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M5 0L6.18 3.82L10 5L6.18 6.18L5 10L3.82 6.18L0 5L3.82 3.82Z"/>
            </svg>
            Explore all domains
          </button>
        </Section>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--r-ink-5)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <div style={{ width: 6, height: 6, background: 'var(--r-ok)', borderRadius: 99, animation: 'r-pulse 3s ease-in-out infinite' }}/>
        <span style={{ fontFamily: 'var(--r-font-mono)', fontSize: 9, color: 'var(--r-ink-4)', letterSpacing: '0.1em' }}>
          XOSHIRO256** · DETERMINISTIC
        </span>
      </div>
    </aside>
  );
};
