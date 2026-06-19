import React, { useEffect, useState, useCallback } from 'react';
import { useActiveSeed } from '@/stores/activeSeed';
import { SeedGlyph } from '@/ui/primitives/SeedGlyph';

const GRID_SIZE = 16;

interface Cell { x: number; y: number; seed?: any; fitness: number; }
interface Archive { cells: Cell[]; generation: number; coverage: number; best: number; domain: string; }

export const EvolveTab: React.FC = () => {
  const seed: any = useActiveSeed((s: any) => s.seed);
  const setSeed = useActiveSeed((s: any) => s.setSeed);
  const domain = seed?.domain ?? seed?.$domain ?? 'visual2d';

  const [archive, setArchive] = useState<Archive | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);

  const fetchArchive = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetch('/api/evolve/map-elites?domain=' + encodeURIComponent(domain));
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message ?? r.statusText);
      const cells: Cell[] = [];
      const rawCells = j?.archive?.cells ?? j?.cells ?? {};
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          const key = x + ',' + y;
          const raw = rawCells[key];
          cells.push({ x, y, seed: raw?.seed ?? null, fitness: raw?.fitness ?? 0 });
        }
      }
      setArchive({ cells, generation: j?.archive?.generation ?? j?.generation ?? 0, coverage: j?.archive?.coverage ?? j?.coverage ?? 0, best: j?.archive?.best ?? j?.best ?? 0, domain });
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }, [domain]);

  useEffect(() => { fetchArchive(); }, [fetchArchive]);

  const evolveStep = useCallback(async (generations: number) => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/evolve/map-elites/step', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, generations }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message ?? 'step failed');
      await fetchArchive();
    } catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setBusy(false); }
  }, [domain, fetchArchive]);

  const onPickCell = (cell: Cell) => {
    if (!cell.seed) return;
    const s = cell.seed;
    setSeed({ id: s.id ?? s.$id, name: s.$name ?? s.name ?? 'evolved-' + cell.x + '-' + cell.y, domain: s.$domain ?? s.domain ?? domain, hash: s.$hash ?? s.hash ?? '' });
  };

  const filledCount = archive ? archive.cells.filter((c) => !!c.seed).length : 0;
  const covPct = archive ? ((filledCount / (GRID_SIZE * GRID_SIZE)) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-evo-page" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="p-evo-header">
        <div className="p-evo-head-left">
          <div className="p-evo-title">MAP-ELITES ARCHIVE</div>
          <div className="p-evo-sub">{domain} · {GRID_SIZE}×{GRID_SIZE} grid · quality-diversity</div>
        </div>
        <div className="p-evo-stats">
          <div className="p-evo-stat"><span className="p-evo-stat-k">gen</span><span className="p-evo-stat-v">{archive?.generation ?? 0}</span></div>
          <div className="p-evo-stat"><span className="p-evo-stat-k">filled</span><span className="p-evo-stat-v">{filledCount} / {GRID_SIZE * GRID_SIZE}</span></div>
          <div className="p-evo-stat"><span className="p-evo-stat-k">coverage</span><span className="p-evo-stat-v">{covPct}%</span></div>
          <div className="p-evo-stat"><span className="p-evo-stat-k">best</span><span className="p-evo-stat-v">{(archive?.best ?? 0).toFixed(3)}</span></div>
        </div>
        <div className="p-evo-actions">
          <button className="p-evo-btn" onClick={() => evolveStep(10)} disabled={busy}>{busy ? 'evolving…' : '+10 gens'}</button>
          <button className="p-evo-btn" onClick={() => evolveStep(50)} disabled={busy}>+50 gens</button>
          <button className="p-evo-btn" onClick={fetchArchive} disabled={busy}>refresh</button>
        </div>
      </div>

      {err ? <div className="p-evo-err">{err}</div> : null}

      <div className="p-evo-grid">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
          const x = idx % GRID_SIZE;
          const y = Math.floor(idx / GRID_SIZE);
          const cell = archive?.cells.find((c) => c.x === x && c.y === y);
          const filled = !!cell?.seed;
          const fit = cell?.fitness ?? 0;
          const intensity = Math.max(0.1, Math.min(1.0, fit));
          return (
            <button
              key={idx}
              className="p-evo-cell"
              data-filled={filled ? 'true' : 'false'}
              style={{ opacity: filled ? 0.55 + intensity * 0.45 : 0.15 }}
              onClick={() => cell && onPickCell(cell)}
              onMouseEnter={() => setHover(cell ?? null)}
              onMouseLeave={() => setHover(null)}
              title={filled ? 'fitness ' + fit.toFixed(3) : 'unfilled niche (' + x + ',' + y + ')'}
            >
              {filled ? (
                <SeedGlyph
                  hash={(cell!.seed?.$hash ?? cell!.seed?.hash ?? (x + '-' + y)) as string}
                  domain={domain}
                  size={18}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="p-evo-detail">
        {hover && hover.seed ? (
          <>
            <SeedGlyph hash={(hover.seed.$hash ?? hover.seed.hash ?? '') as string} domain={domain} size={28} />
            <div className="p-evo-detail-stack">
              <div className="p-evo-detail-name">{hover.seed.$name ?? hover.seed.name ?? 'evolved-' + hover.x + '-' + hover.y}</div>
              <div className="p-evo-detail-meta">fitness {hover.fitness.toFixed(3)} · cell ({hover.x}, {hover.y}) · click to activate</div>
            </div>
          </>
        ) : (
          <div className="p-evo-detail-empty">hover a cell to inspect · evolve to fill the archive</div>
        )}
      </div>
    </div>
  );
};
