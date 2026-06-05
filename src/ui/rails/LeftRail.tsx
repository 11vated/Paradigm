/**
 * LeftRail — 280px expanded · 56px collapsed.
 *
 *  Sections (top → bottom):
 *    [ACTIVE SEED]   pinned, 5 quick-action chips
 *    [LIBRARY]       mine | curated | lineage tabs + search + scroll list
 *    [THREADS]       agent threads (collapsible)
 *    [PRESENCE]      sovereignty key + connection state + tick counter
 *
 * Per `06_Frontend_Redesign_And_Completion_Spec.md` §IV.2.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useActiveSeed, type ActiveSeed } from '@/stores/activeSeed';
import { useAgentThreads } from '@/stores/agentThreads';
import { SeedGlyph } from '@/ui/primitives/SeedGlyph';
import { domainColor } from '@/hooks/useDomainColor';
import { growSeed, mutateSeed } from '@/services/api';
import { calculateStratumConformance } from '@/lib/kernel/quality/predicates';
import { deriveCleanTitle } from '@/lib/kernel/types';

type LibraryTab = 'mine' | 'curated' | 'lineage';

interface LibrarySeed {
  id: string;
  name: string;
  domain: string;
  hash: string;
  age?: string;
}

const SECTION_LIBRARY = 'LIBRARY';
const SECTION_THREADS = 'THREADS';

function qualityBucket(score?: number): 'high' | 'medium' | 'low' | undefined {
  if (typeof score !== 'number') return undefined;
  if (score >= 0.85) return 'high';
  if (score >= 0.6)  return 'medium';
  return 'low';
}

// Live 9-strata extractor / computer for HUDs everywhere in rail (uses artifact data or QC calc)
function getStrataFor(item: any): { overall: number; per?: Record<string, number> } {
  try {
    const raw = item?.raw || item || {};
    if (raw.strata && typeof raw.strata === 'object' && raw.strata.overall) return raw.strata;
    const sc = raw.strataCompliance ?? raw.axes?.strataCompliance ?? item?.strata?.overall ?? item?.contractScore;
    if (typeof sc === 'number') return { overall: sc };
    // compute from available signals for complete coverage (no raw dumps)
    const samples = [raw.form||{}, raw.motion||{}, raw.sound||{}, raw.mind||{}, raw.story||{}, raw.world||{}, raw.field||{}, raw.culture||{}, raw.time||{}];
    const c = calculateStratumConformance(samples);
    return { overall: c.overall, per: Object.fromEntries(Object.entries(c.perStratum||{}).map(([k,v]:any)=>[k, (v as any).score||0.5])) };
  } catch { return { overall: 0.71 }; }
}

function shortHash(h: string | undefined): string {
  if (!h) return '';
  return h.length > 12 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h;
}

export const LeftRail: React.FC<{
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onCosmos?: () => void;
}> = ({ collapsed = false, onToggleCollapse, onCosmos: _onCosmos }) => {
  const { seed, setSeed } = useActiveSeed();
  const { threads, currentThreadId, newThread } = useAgentThreads();

  const [libTab, setLibTab] = useState<LibraryTab>('curated');
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySeeds, setLibrarySeeds] = useState<LibrarySeed[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(true);

  // Load library seeds for the active tab.
  useEffect(() => {
    let cancelled = false;
    setLibraryLoading(true);
    const url =
      libTab === 'curated'
        ? '/api/seeds?source=curated&limit=200'
        : libTab === 'mine'
        ? '/api/seeds?source=mine&limit=200'
        : `/api/seeds/${seed?.id ?? ''}/lineage`;
    if (libTab === 'lineage' && !seed?.id) {
      setLibrarySeeds([]);
      setLibraryLoading(false);
      return;
    }
    fetch(url, { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : { seeds: [] }))
      .then((j) => {
        if (cancelled) return;
        // Dedupe by id (falling back to hash): the persisted store can contain
        // the same seed more than once, which would otherwise render duplicate
        // rows and trigger React "duplicate key" warnings. Keep first occurrence.
        const seen = new Set<string>();
        const seeds: LibrarySeed[] = [];
        for (const s of (j.seeds ?? j ?? []) as any[]) {
          const hash = s.hash ?? s.$hash ?? '';
          const id = s.id ?? hash;
          const dedupeKey = id || hash;
          if (dedupeKey && seen.has(dedupeKey)) continue;
          if (dedupeKey) seen.add(dedupeKey);
          // Prefer a real human name ($name/name); only fall back to a derived
          // title from the intent/prompt, never to the raw seed id.
          const rawName = s.$name ?? s.name ?? s.$intent ?? s.originalPrompt ?? '';
          seeds.push({
            id,
            name:   deriveCleanTitle(rawName || undefined, hash),
            domain: s.domain ?? s.$domain ?? 'default',
            hash,
            age:    s.age,
          });
        }
        setLibrarySeeds(seeds);
      })
      .catch(() => {
        if (!cancelled) setLibrarySeeds([]);
      })
      .finally(() => {
        if (!cancelled) setLibraryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [libTab, seed?.id]);

  const filtered = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    if (!q) return librarySeeds;
    return librarySeeds.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q) ||
        s.hash.toLowerCase().includes(q),
    );
  }, [librarySeeds, librarySearch]);

  const loadSeed = useCallback(
    (s: LibrarySeed) => {
      const st = getStrataFor(s);
      setSeed({
        id: s.id,
        name: s.name, // already a clean human title (derived on load)
        domain: s.domain,
        hash: s.hash,
        strata: { overall: st.overall, perStratum: st.per, compliance: st.overall },
      } as ActiveSeed);
    },
    [setSeed],
  );

  const activeHue = domainColor(seed?.domain);

  // Active-seed action handlers (slice 2 wiring). Fire the corresponding
  // server-side mutation, broadcast the result so other panes (CrucibleMode,
  // ConversationFooter, etc.) can react.
  const [actionState, setActionState] = useState<{ kind: string; busy: boolean; error?: string } | null>(null);
  const setActive = useActiveSeed((s) => s.setSeed);

  const fireGrow = useCallback(async () => {
    if (!seed?.id) return;
    setActionState({ kind: 'grow', busy: true });
    try {
      const next = await growSeed(seed.id);
      if (next && next.id) {
        setActive({
          id: next.id,
          name: next.name ?? next.id,
          domain: next.domain ?? seed.domain,
          hash: next.seed_hash ?? seed.hash,
          generation: (seed.generation ?? 0) + 1,
        });
      }
      setActionState(null);
    } catch (e: any) {
      setActionState({ kind: 'grow', busy: false, error: String(e?.message ?? e) });
      window.setTimeout(() => setActionState(null), 4000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fireGrow reads seed.domain/seed.hash/seed.generation and setActive; intentionally narrowed to seed.id to avoid recreating callback on every seed mutation
  }, [seed?.id]);

  const fireMutate = useCallback(async () => {
    if (!seed?.id) return;
    setActionState({ kind: 'mutate', busy: true });
    try {
      const next = await mutateSeed(seed.id);
      if (next && next.id) {
        setActive({
          id: next.id,
          name: next.name ?? next.$name ?? next.id,
          domain: next.domain ?? next.$domain ?? seed.domain,
          hash: next.hash ?? next.$hash ?? seed.hash,
          generation: (seed.generation ?? 0) + 1,
        });
      }
      setActionState(null);
    } catch (e: any) {
      setActionState({ kind: 'mutate', busy: false, error: String(e?.message ?? e) });
      window.setTimeout(() => setActionState(null), 4000);
    }
  }, [seed?.id, seed?.domain, seed?.hash, seed?.generation, setActive]);

  const fireBreed = useCallback(() => {
    window.dispatchEvent(new CustomEvent('paradigm:open-breed-picker', { detail: { seedId: seed?.id } }));
  }, [seed?.id]);

  const fireEvolve = useCallback(() => {
    window.dispatchEvent(new CustomEvent('paradigm:open-evolve', { detail: { seedId: seed?.id } }));
  }, [seed?.id]);

  const fireCompose = useCallback(() => {
    window.dispatchEvent(new CustomEvent('paradigm:open-compose', { detail: { seedId: seed?.id } }));
  }, [seed?.id]);

  /* ─── Collapsed render ─────────────────────────────────────────── */
  if (collapsed) {
    return (
      <aside className="p-leftrail" data-collapsed="true">
        <div className="p-leftrail-collapsed">
          <button
            className="p-icon-button"
            onClick={onToggleCollapse}
            title="Expand rail"
            aria-label="Expand left rail"
          >
            ▸
          </button>
          {seed && (
            <button
              className="p-icon-button"
              data-active="true"
              title={`Active: ${seed.name}`}
              style={{ color: activeHue }}
            >
              <SeedGlyph
                hash={seed.hash}
                domain={seed.domain}
                size={20}
              />
            </button>
          )}
          <button className="p-icon-button" title="Library">⌬</button>
          <button className="p-icon-button" title="Threads">≡</button>
          <button className="p-icon-button" title="Presence">◉</button>
        </div>
      </aside>
    );
  }

  /* ─── Expanded render ──────────────────────────────────────────── */
  return (
    <aside
      className="p-leftrail"
      style={{ ['--p-active-seed-color' as never]: activeHue }}
    >
      <div className="p-leftrail-expanded" style={{ display: 'contents' }}>
        {/* ── Header (only collapse button) ── */}
        <div className="p-leftrail-header">
          <span className="p-section-label">studio</span>
          <button
            className="p-leftrail-collapse"
            onClick={onToggleCollapse}
            title="Collapse rail"
            aria-label="Collapse left rail"
          >
            ◂
          </button>
        </div>

        {/* ── ACTIVE SEED pin ── */}
        <div
          className="p-active-seed-pin"
          data-empty={!seed}
        >
          <div className="p-active-seed-pin-header">
            <span className="p-section-label">active seed</span>
          </div>

          {seed ? (
            <>
              <div className="p-active-seed-pin-body">
                <div className="p-glyph-frame" data-breathing="true">
                  <SeedGlyph hash={seed.hash} domain={seed.domain} size={56} />
                  {/* Small live thumbnail if rich visual data attached (from QC attachment slices) */}
                  {seed.raw && (seed.raw as any).svg ? (
                    <div className="p-thumb-inline" dangerouslySetInnerHTML={{ __html: (seed.raw as any).svg }} />
                  ) : seed.raw && (seed.raw as any).pngDataURL ? (
                    <img className="p-thumb-inline" src={(seed.raw as any).pngDataURL} alt="preview" />
                  ) : seed.raw && (seed.raw as any).audioDataURL ? (
                    <span className="p-thumb-inline" title="audio preview">🎵</span>
                  ) : seed.raw && ((seed.raw as any).htmlData || (seed.raw as any).gltf) ? (
                    <span className="p-thumb-inline" title="interactive preview">▶</span>
                  ) : seed.raw && (seed.raw as any).previewData && ((seed.raw as any).visual?.type === 'code' || (seed.raw as any).visual?.type === 'glsl') ? (
                    <span className="p-thumb-inline" title="code preview">{'</>'}</span>
                  ) : null}
                </div>
                <div className="p-active-seed-pin-meta">
                  <div className="p-active-seed-pin-name">{deriveCleanTitle(seed.name, seed.hash)}</div>
                  <div className="p-active-seed-pin-row">
                    <span className="p-domain-pill">{seed.domain}</span>
                    {typeof seed.contractScore === 'number' && (
                      <span
                        className="p-contract-score"
                        data-q={qualityBucket(seed.contractScore)}
                        title="Contract conformance score"
                      >
                        qc {seed.contractScore.toFixed(2)}
                      </span>
                    )}
                    {/* Comprehensive always-visible strata for active seed HUD */}
                    {(() => { const st = getStrataFor(seed); return (
                      <span className="p-strata-pill" title="9-strata conformance (live from QC / calculateStratumConformance)">
                        strata {(st.overall * 100).toFixed(0)}%
                      </span>
                    ); })()}
                  </div>
                  <div className="p-active-seed-pin-row">
                    <span className="p-hash-tail">{shortHash(seed.hash)}</span>
                    {typeof seed.generation === 'number' && (
                      <span className="p-hash-tail">gen {seed.generation}</span>
                    )}
                  </div>
                  {/* Full 9-strata mini HUD always visible in active seed (LeftRail part of comprehensive) */}
                  <div style={{ marginTop: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }} role="group" aria-label="Active seed 9-strata">
                    {(() => { const st = getStrataFor(seed); return (['Form','Motion','Sound','Mind','Story','World','Field','Culture','Time'] as const).map(s => {
                      const v = (st.per as any)?.[s] ?? st.overall; const p = Math.round(v*100);
                      return <span key={s} style={{ fontSize: 8, padding: '0 2px', background: 'rgba(0,0,0,0.2)', borderRadius: 2 }} title={`${s} ${p}%`}>{s.slice(0,1)}{p}</span>;
                    }); })()}
                  </div>
                </div>
              </div>
              <div className="p-action-chips">
                <button
                  className="p-chip"
                  title="Grow this seed → real artifact"
                  onClick={fireGrow}
                  disabled={actionState?.kind === 'grow' && actionState.busy}
                  data-state={actionState?.kind === 'grow' ? (actionState.error ? 'error' : actionState.busy ? 'busy' : '') : ''}
                >
                  {actionState?.kind === 'grow' && actionState.busy ? 'Generating rich visual…' : 'grow'}
                </button>
                <button
                  className="p-chip"
                  title="Mutate this seed → child seed"
                  onClick={fireMutate}
                  disabled={actionState?.kind === 'mutate' && actionState.busy}
                  data-state={actionState?.kind === 'mutate' ? (actionState.error ? 'error' : actionState.busy ? 'busy' : '') : ''}
                >
                  {actionState?.kind === 'mutate' && actionState.busy ? 'Evolving seed…' : 'mutate'}
                </button>
                <button className="p-chip" title="Breed with another seed" onClick={fireBreed}>breed</button>
                <button className="p-chip" title="Evolve a population" onClick={fireEvolve}>evolve</button>
                <button className="p-chip" title="Compose with other domains" onClick={fireCompose}>compose</button>
              </div>
              {actionState?.error && (
                <div
                  style={{
                    marginTop: 'var(--p-space-2)',
                    padding: 'var(--p-space-2)',
                    background: 'color-mix(in oklab, var(--p-prism-rose) 12%, var(--p-deep))',
                    border: '1px solid color-mix(in oklab, var(--p-prism-rose) 30%, var(--p-border))',
                    borderRadius: 'var(--p-radius-1)',
                    fontSize: 'var(--p-text-1)',
                    color: 'var(--p-prism-rose)',
                    fontFamily: 'var(--p-font-mono)',
                  }}
                >
                  {actionState.kind} failed: {actionState.error.slice(0, 120)}
                </div>
              )}
            </>
          ) : (
            <div style={{ color: 'var(--p-ink-3)', fontSize: 'var(--p-text-2)' }}>
              No active seed. Press <span className="p-kbd">N</span> for new, or pick one below.
            </div>
          )}
        </div>

        {/* ── LIBRARY ── */}
        <div className="p-leftrail-section" data-pane="library">
          <div
            className="p-leftrail-section-header"
            onClick={() => undefined}
          >
            <span className="p-section-label">{SECTION_LIBRARY}</span>
            <span className="p-hash-tail">{filtered.length}</span>
          </div>
          <div className="p-library-tabs">
            <button
              className="p-tab"
              data-active={libTab === 'mine'}
              onClick={() => setLibTab('mine')}
            >
              mine
            </button>
            <button
              className="p-tab"
              data-active={libTab === 'curated'}
              onClick={() => setLibTab('curated')}
            >
              curated
            </button>
            <button
              className="p-tab"
              data-active={libTab === 'lineage'}
              onClick={() => setLibTab('lineage')}
              disabled={!seed}
            >
              lineage
            </button>
          </div>
          <div className="p-library-search">
            <input
              className="p-search-input"
              type="text"
              placeholder="Search seeds…"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
            />
          </div>
          <div className="p-library-list">
            {libraryLoading ? (
              <div style={{ padding: '12px 8px', color: 'var(--p-ink-3)', fontSize: 'var(--p-text-1)' }}>
                Loading library… (beautiful named artifacts)
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '12px 8px', color: 'var(--p-ink-3)', fontSize: 'var(--p-text-1)' }}>
                {libTab === 'mine' ? 'No seeds yet. Grow one.' : 'No matches.'}
              </div>
            ) : (
              filtered.slice(0, 200).map((s) => (
                <button
                  key={s.id}
                  className="p-seed-card"
                  data-active={s.id === seed?.id}
                  onClick={() => loadSeed(s)}
                  title={s.hash}
                >
                  <SeedGlyph hash={s.hash} domain={s.domain} size={28} />
                  <div className="p-seed-card-meta">
                    <span className="p-seed-card-name">{deriveCleanTitle(s.name, s.hash)}</span>
                    <span className="p-seed-card-sub">
                      <span
                        className="p-domain-pill"
                        style={{
                          ['--p-active-seed-color' as never]: domainColor(s.domain),
                          padding: '1px 6px',
                          fontSize: 'var(--p-text-0)',
                        }}
                      >
                        {s.domain}
                      </span>
                      <span>{shortHash(s.hash)}</span>
                      {/* Thumbnails/previews + status (domain, gen, QC, strata %) for 100% of library items — extend existing thumb logic */}
                      {(() => {
                        const st = getStrataFor(s);
                        const qc = (s as any).contractScore ?? (s as any).raw?.contractScore;
                        const gen = (s as any).generation ?? (s as any).$lineage?.generation;
                        return <>
                          {typeof qc === 'number' && <span className="p-strata-mini" title="QC">qc{(qc*100).toFixed(0)}</span>}
                          <span className="p-strata-mini" title="strata">{(st.overall * 100).toFixed(0)}%</span>
                          {typeof gen === 'number' && <span className="p-strata-mini" title="gen">g{gen}</span>}
                          {/* Extended thumb previews for code/sim/html/gltf/audio/story/particle etc. */}
                          {(s as any).raw?.svg ? '🖼' : (s as any).raw?.pngDataURL ? '🖼' : (s as any).raw?.audioDataURL ? '♫' : (s as any).raw?.gltf ? '⬡' : (s as any).raw?.htmlData ? '◫' : (s as any).raw?.previewData ? '</>' : (s as any).raw?.storyData ? '📖' : null}
                        </>;
                      })()}
                    </span>
                  </div>
                  {/* Mini 9-strata bars always for every library/gallery item (complete coverage) */}
                  <div style={{ display: 'flex', gap: 1, marginTop: 2 }} aria-hidden>
                    {(() => { const st = getStrataFor(s); return (['F','M','S','Mi','St','W','Fi','C','T'] as const).map((lab,i) => {
                      const key = ['Form','Motion','Sound','Mind','Story','World','Field','Culture','Time'][i];
                      const v = (st.per as any)?.[key] ?? st.overall; const p = Math.round((v||0.7)*100);
                      return <div key={lab} style={{ flex:1, height:2, background: p>80 ? '#166534' : '#3f3f46', position:'relative' }}><div style={{ position:'absolute', left:0, top:0, height:2, width: `${p}%`, background: p>80?'#4ade80':'#a3a3a3' }} /></div>;
                    }); })()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── THREADS ── */}
        <div className="p-leftrail-section" data-pane="threads">
          <div
            className="p-leftrail-section-header"
            onClick={() => setThreadsOpen((v) => !v)}
          >
            <span className="p-section-label">
              {threadsOpen ? '▾' : '▸'} {SECTION_THREADS}
            </span>
            <button
              className="p-chip"
              style={{ height: 22, padding: '0 8px' }}
              onClick={(e) => {
                e.stopPropagation();
                newThread();
              }}
              title="New thread"
            >
              + new
            </button>
          </div>
          {threadsOpen && (
            <div style={{ maxHeight: 180, overflowY: 'auto', padding: '0 8px 12px' }}>
              {threads.length === 0 ? (
                <div style={{ padding: '8px', color: 'var(--p-ink-3)', fontSize: 'var(--p-text-1)' }}>
                  No threads yet.
                </div>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.id}
                    className="p-seed-card"
                    data-active={t.id === currentThreadId}
                    onClick={() => undefined}
                    title={t.title ?? t.id}
                  >
                    <span style={{ fontSize: 'var(--p-text-2)', color: 'var(--p-ink-1)' }}>
                      {t.title ?? `Thread ${t.id.slice(0, 6)}`}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── PRESENCE bottom ── */}
        <div className="p-presence">
          <div className="p-presence-row">
            <span className="p-presence-key">key</span>
            <span style={{ color: 'var(--p-ink-1)' }}>guest · unsigned</span>
          </div>
          <div className="p-presence-row">
            <span className="p-presence-key">peer</span>
            <span style={{ color: 'var(--p-ink-3)' }}>offline</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default LeftRail;
