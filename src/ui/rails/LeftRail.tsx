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
        const seeds: LibrarySeed[] = (j.seeds ?? j ?? []).map((s: any) => ({
          id:     s.id ?? s.hash ?? s.$hash ?? '',
          name:   s.name ?? s.id ?? 'untitled',
          domain: s.domain ?? s.$domain ?? 'default',
          hash:   s.hash ?? s.$hash ?? '',
          age:    s.age,
        }));
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
      setSeed({
        id: s.id,
        name: s.name,
        domain: s.domain,
        hash: s.hash,
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
                </div>
                <div className="p-active-seed-pin-meta">
                  <div className="p-active-seed-pin-name">{seed.name}</div>
                  <div className="p-active-seed-pin-row">
                    <span className="p-domain-pill">{seed.domain}</span>
                    {typeof seed.contractScore === 'number' && (
                      <span
                        className="p-contract-score"
                        data-q={qualityBucket(seed.contractScore)}
                        title="Contract conformance score"
                      >
                        {seed.contractScore.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="p-active-seed-pin-row">
                    <span className="p-hash-tail">{shortHash(seed.hash)}</span>
                    {typeof seed.generation === 'number' && (
                      <span className="p-hash-tail">gen {seed.generation}</span>
                    )}
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
                  {actionState?.kind === 'grow' && actionState.busy ? 'growing…' : 'grow'}
                </button>
                <button
                  className="p-chip"
                  title="Mutate this seed → child seed"
                  onClick={fireMutate}
                  disabled={actionState?.kind === 'mutate' && actionState.busy}
                  data-state={actionState?.kind === 'mutate' ? (actionState.error ? 'error' : actionState.busy ? 'busy' : '') : ''}
                >
                  {actionState?.kind === 'mutate' && actionState.busy ? 'mutating…' : 'mutate'}
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
                Loading…
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
                    <span className="p-seed-card-name">{s.name}</span>
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
                    </span>
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
