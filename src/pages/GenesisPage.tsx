/**
 * Genesis — Paradigm's public hero loop.
 *
 * In under 60 seconds a visitor receives THEIR genesis seed, sees the
 * substrate compute its grade, license, and cost-if-remixed, and can
 * fork from anyone else's permalink. Every visit grows the corpus.
 *
 * Doctrine v2 Part XII (Public Site GA) — closes the exit gate
 * "homepage hero loop playable; conversion measurement live."
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// ─── Types (mirror the server payload) ────────────────────────────────────────
interface SoulCard {
  palette: [string, string, string];
  glyph: { seed: string; symmetry: number; density: number };
  name: string;
  tone: { pitchHz: number; rhythm: number };
}

interface GenesisSeed {
  $domain: 'genesis';
  $hash: string;
  $name: string;
  $lineage: { parents: string[]; depth: number };
  $sovereignty: { authorToken: string; created: 0 };
  genes: { soulCard: SoulCard; disposition: number; curiosity: number; resonance: number };
}

interface CostSplit {
  address: string;
  role: 'author' | 'platform' | 'ancestor';
  cents: number;
  percentageBp: number;
  depth: number;
}

interface CostResult {
  allowed: boolean;
  totalCostCents: number;
  licenseSurchargeCents: number;
  splits: CostSplit[];
  manifest: string;
}

interface GenesisPackage {
  seed: GenesisSeed;
  license: {
    type: string;
    custodian: string;
    royaltyBp?: number;
    attribution?: { required: boolean; canonicalLine?: string };
  };
  costIfRemixed: CostResult;
  costIfCommercial: CostResult;
  grade: {
    score: number;
    clauses: Array<{ id: string; passed: boolean; weight: number; reason?: string }>;
  };
  permalink: string;
  forkUrl: string;
  sessionToken?: string;
  lineage?: Array<{ seedId: string; authorAddress: string; parents: string[] }>;
  parent?: { permalink: string; $hash: string };
}

// ─── Soul Card Renderer ───────────────────────────────────────────────────────

function SoulGlyph({ card, size = 240 }: { card: SoulCard; size?: number }) {
  // Procedural SVG glyph from the soul card.
  const paths = useMemo(() => {
    const rng = pseudoRng(card.glyph.seed);
    const cx = size / 2, cy = size / 2;
    const sym = card.glyph.symmetry;
    const density = card.glyph.density;
    const radius = size * 0.4;
    const segments = Math.max(3, Math.floor(8 + density * 24));
    const points: Array<[number, number]> = [];
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const r = radius * (0.5 + rng() * 0.5);
      points.push([cx + Math.cos(theta) * r, cy + Math.sin(theta) * r]);
    }
    const path = 'M ' + points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L ') + ' Z';
    const rays: string[] = [];
    for (let s = 0; s < sym; s++) {
      const angle = (s / sym) * 360;
      rays.push(`<g transform="rotate(${angle} ${cx} ${cy})"><path d="${path}" /></g>`);
    }
    return rays.join('');
  }, [card.glyph.seed, card.glyph.symmetry, card.glyph.density, size]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ background: card.palette[2], borderRadius: '50%', boxShadow: '0 0 60px rgba(0,0,0,0.4)' }}
    >
      <defs>
        <radialGradient id={`g-${card.glyph.seed}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={card.palette[0]} stopOpacity="0.9" />
          <stop offset="100%" stopColor={card.palette[1]} stopOpacity="0.3" />
        </radialGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={size * 0.45} fill={`url(#g-${card.glyph.seed})`} />
      <g
        fill="none"
        stroke={card.palette[0]}
        strokeOpacity="0.6"
        strokeWidth="1"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: paths }}
      />
    </svg>
  );
}

function pseudoRng(hex: string): () => number {
  let state = parseInt(hex.slice(0, 8), 16) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'paradigm:genesis:session';

export default function GenesisPage() {
  const navigate = useNavigate();
  const { shortHash } = useParams<{ shortHash?: string }>();
  const [pkg, setPkg] = useState<GenesisPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLineage, setShowLineage] = useState(false);

  const loadOwnGenesis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(SESSION_KEY) : null;
      const r = await fetch('/api/genesis', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(stored ? { sessionToken: stored } : {}),
      });
      if (!r.ok) throw new Error(`POST /api/genesis → ${r.status}`);
      const json = (await r.json()) as GenesisPackage;
      if (json.sessionToken && typeof window !== 'undefined') {
        window.localStorage.setItem(SESSION_KEY, json.sessionToken);
      }
      setPkg(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadByHash = useCallback(async (h: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/genesis/${h}`);
      if (!r.ok) throw new Error(`GET /api/genesis/${h} → ${r.status}`);
      setPkg((await r.json()) as GenesisPackage);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fork = useCallback(async () => {
    if (!pkg) return;
    setLoading(true);
    setError(null);
    try {
      const forkerToken = typeof window !== 'undefined' ? window.localStorage.getItem(SESSION_KEY) : null;
      const sh = pkg.seed.$hash.slice(0, 16);
      const r = await fetch(`/api/genesis/${sh}/fork`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ forkerToken: forkerToken ?? undefined }),
      });
      if (!r.ok) throw new Error(`POST /fork → ${r.status}`);
      const child = (await r.json()) as GenesisPackage;
      if (child.sessionToken && typeof window !== 'undefined') {
        window.localStorage.setItem(SESSION_KEY, child.sessionToken);
      }
      navigate(`/genesis/${child.seed.$hash.slice(0, 16)}`);
      setPkg(child);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [pkg, navigate]);

  useEffect(() => {
    if (shortHash) {
      loadByHash(shortHash);
    } else {
      loadOwnGenesis();
    }
  }, [shortHash, loadByHash, loadOwnGenesis]);

  if (loading && !pkg) {
    return <FullPage><p style={{ opacity: 0.6 }}>genesis…</p></FullPage>;
  }
  if (error) {
    return <FullPage><p style={{ color: '#ff7878' }}>{error}</p></FullPage>;
  }
  if (!pkg) {
    return <FullPage><p>nothing here yet</p></FullPage>;
  }

  const card = pkg.seed.genes.soulCard;
  const bg = `linear-gradient(135deg, ${card.palette[2]} 0%, #0a0a0a 100%)`;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: bg,
        color: '#f4f1ea',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '4rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ maxWidth: 720, width: '100%' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem', opacity: 0.85 }}>
          <p style={{ letterSpacing: '0.3em', fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.6 }}>
            paradigm · genesis
          </p>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 300, marginTop: '0.5rem' }}>
            {pkg.parent ? 'A new seed in your lineage' : 'Your seed in the substrate'}
          </h1>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
          <SoulGlyph card={card} size={260} />
          <h2 style={{ fontSize: '2.5rem', fontWeight: 200, marginTop: '1.5rem', letterSpacing: '0.04em' }}>
            {card.name}
          </h2>
          <p style={{ opacity: 0.5, fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            {pkg.seed.$hash.slice(0, 24)}…
          </p>
        </section>

        <section style={paneStyle}>
          <Stat label="grade" value={`${pkg.grade.score}/100`} hue={pkg.grade.score >= 80 ? '#9ee8a4' : '#d8c46c'} />
          <Stat label="license" value={pkg.license.type} />
          <Stat label="depth" value={String(pkg.seed.$lineage.depth)} />
        </section>

        <section style={paneStyle}>
          <Stat label="disposition" value={pkg.seed.genes.disposition.toFixed(3)} />
          <Stat label="curiosity" value={pkg.seed.genes.curiosity.toFixed(3)} />
          <Stat label="resonance" value={pkg.seed.genes.resonance.toFixed(3)} />
        </section>

        <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.25)', borderRadius: '0.75rem' }}>
          <p style={{ fontSize: '0.7rem', opacity: 0.5, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            cost if forked commercially
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 300 }}>
              ${(pkg.costIfCommercial.totalCostCents / 100).toFixed(2)}
            </span>
            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>
              on a $10.00 sale ·  {pkg.costIfCommercial.licenseSurchargeCents}¢ to author
            </span>
          </div>
          {pkg.costIfCommercial.splits.length > 0 && (
            <ul style={{ marginTop: '1rem', listStyle: 'none', padding: 0, fontSize: '0.75rem', fontFamily: 'ui-monospace, monospace' }}>
              {pkg.costIfCommercial.splits.slice(0, 4).map((s, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', opacity: 0.7 }}>
                  <span>{s.role}{s.depth > 0 ? ` (depth ${s.depth})` : ''}</span>
                  <span>${(s.cents / 100).toFixed(2)} · {s.percentageBp / 100}%</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {pkg.lineage && pkg.lineage.length > 1 && (
          <section style={{ marginTop: '2rem' }}>
            <button
              type="button"
              onClick={() => setShowLineage((s) => !s)}
              style={{ ...buttonStyle, opacity: 0.7 }}
            >
              {showLineage ? 'hide' : 'show'} lineage chain ({pkg.lineage.length})
            </button>
            {showLineage && (
              <ol style={{ marginTop: '1rem', padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.25)', borderRadius: '0.5rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}>
                {pkg.lineage.map((n, i) => (
                  <li key={n.seedId} style={{ padding: '0.4rem 0', opacity: 1 - i * 0.15 }}>
                    <a
                      href={`/genesis/${n.seedId.slice(0, 16)}`}
                      style={{ color: card.palette[0], textDecoration: 'none' }}
                    >
                      {n.seedId.slice(0, 16)}…
                    </a>
                    <span style={{ marginLeft: '1rem', opacity: 0.4 }}>{n.authorAddress.slice(0, 12)}…</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        <section style={{ marginTop: '3rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" onClick={fork} style={{ ...buttonStyle, background: card.palette[0] }}>
            fork into your own
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(`${window.location.origin}${pkg.permalink}`).catch(() => {});
              }
            }}
            style={buttonStyle}
          >
            copy permalink
          </button>
        </section>

        <footer style={{ marginTop: '4rem', textAlign: 'center', opacity: 0.4, fontSize: '0.7rem', lineHeight: 1.8 }}>
          deterministic · signed · lineage-rooted · royalty-aware<br />
          this artifact was generated by the same substrate that ships every paradigm seed
        </footer>
      </div>
    </main>
  );
}

function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f4f1ea',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {children}
    </main>
  );
}

function Stat({ label, value, hue }: { label: string; value: string; hue?: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '0 0.5rem' }}>
      <p style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: '1.2rem', fontWeight: 300, marginTop: '0.25rem', color: hue ?? '#f4f1ea' }}>{value}</p>
    </div>
  );
}

const paneStyle: React.CSSProperties = {
  display: 'flex',
  background: 'rgba(0,0,0,0.25)',
  borderRadius: '0.75rem',
  padding: '1rem 0.5rem',
  marginBottom: '0.75rem',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)',
  color: '#f4f1ea',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  fontSize: '0.85rem',
  letterSpacing: '0.03em',
};
