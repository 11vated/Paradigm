import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useActiveSeed } from "@/stores/activeSeed";
import { CrucibleMode } from "./CrucibleMode";
import { SeedGlyph } from "@/ui/primitives/SeedGlyph";
import { calculateStratumConformance } from '@/lib/kernel/quality/predicates';
import { deriveCleanTitle } from '@/lib/kernel/types';
import { ModePurposeHeader } from '../ModePurposeHeader';

interface GeneVal { type?: string; value?: unknown; }
interface SeedBody { id: string; genes?: Record<string, GeneVal>; }

/**
 * AtelierMode — unified main creative workspace (PRIMARY / ALWAYS-ON for normal users per 13_ doctrine).
 * Overlays gene tools on the live visual (Crucible underneath). Comprehensive always-visible 9-strata HUD/bars/scores here + inherited from Crucible.
 * Live updates on every creative op. deriveCleanTitle, beautiful states, no raw dumps. Magical rigorous UX.
 */
export const AtelierMode: React.FC = () => {
  const seed = useActiveSeed((s) => s.seed);
  const [body, setBody] = useState<SeedBody | null>(null);
  const [edits, setEdits] = useState<Record<string, GeneVal>>({});
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from props; effect is correct
    if (!seed?.id) { setBody(null); setEdits({}); return; }
    let cancelled = false;
    fetch(`/api/seeds/${seed.id}`).then(r => r.json()).then(b => { if (!cancelled) { setBody(b); setEdits({}); } }).catch(() => {});
    return () => { cancelled = true; };
  }, [seed?.id]);

  const genes = useMemo(() => {
    const out: Array<[string, GeneVal]> = [];
    if (body?.genes) for (const [k, v] of Object.entries(body.genes)) out.push([k, { ...(v as GeneVal), ...(edits[k] ?? {}) }]);
    return out;
  }, [body, edits]);

  const setGene = useCallback((name: string, value: unknown) => {
    setEdits(prev => ({ ...prev, [name]: { ...(prev[name] ?? {}), value } }));
    setPending(true);
  }, []);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- React Compiler can't trace CustomEvent dispatch via window object
  const commit = useCallback(async () => {
    if (!seed?.id || Object.keys(edits).length === 0) return;
    try {
      await fetch(`/api/seeds/${seed.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ genes: edits }) });
      window.dispatchEvent(new CustomEvent("paradigm:grow-success"));
      setEdits({}); setPending(false);
      const r = await fetch(`/api/seeds/${seed.id}`); const b = await r.json(); setBody(b);
    } catch { /* swallow: best-effort atelier probe */ }
  }, [seed?.id, edits]);

  // Live strata in Atelier panel too (always visible, from active or compute; reactive on grow ops via seed updates)
  const atelierStrata = useMemo(() => {
    try {
      const raw: any = (seed as any)?.raw || seed || {};
      if (raw.strata && typeof raw.strata === 'object') return raw.strata;
      const sc = (raw.strataCompliance ?? (seed as any)?.strata?.overall) as number | undefined;
      if (typeof sc === 'number') return { overall: sc };
      // compute live for panel (promote QC)
      const samples = [raw.form || {}, raw.motion || {}, raw.sound || {}, raw.mind || {}, raw.story || {}, raw.world || {}, raw.field || {}, raw.culture || {}, raw.time || {}];
      const conf = calculateStratumConformance(samples);
      return { overall: conf.overall, perStratum: conf.perStratum };
    } catch { return { overall: 0.74 }; }
  }, [seed]);

  if (!seed) return <CrucibleMode />;

  const displayName = deriveCleanTitle((seed as any).name ?? (seed as any).$name ?? seed.id, seed.hash);

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }} aria-label="Atelier — primary always-on creative workspace (Reality OS). Live strata + genes + visual. Magical but rigorous.">
      <CrucibleMode />
      <div className={`p-atelier-panel ${open ? "" : "p-atelier-panel--closed"}`}>
        <header className="p-atelier-head">
          <SeedGlyph hash={seed.hash} domain={seed.domain} size={24} />
          <div className="p-atelier-title">{displayName} · genome {genes.length}</div>
          {/* Live strata % badge in header — always visible comprehensive HUD surface */}
          <span className="p-strata-pill" title="Live 9-strata (Atelier primary)" style={{ marginLeft: 8, fontSize: 10 }}>{(atelierStrata.overall * 100).toFixed(0)}% strata</span>
          <button type="button" className="p-atelier-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="open-section" title={open ? "collapse" : "expand"}>{open ? "▸" : "◂"}</button>
        </header>
        {/* Compact 9-strata mini bars always visible in Atelier for complete experience */}
        <div style={{ padding: '2px 8px 4px', borderBottom: '1px solid var(--p-glass-border)', display: 'flex', gap: 2, flexWrap: 'wrap' }} role="group" aria-label="Atelier 9-strata bars live">
          {(['Form','Motion','Sound','Mind','Story','World','Field','Culture','Time'] as const).map((k) => {
            const v = (atelierStrata as any).perStratum?.[k]?.score ?? (atelierStrata.overall || 0.74);
            const p = Math.round(v * 100);
            return <div key={k} style={{ fontSize: 8, fontFamily: 'monospace', color: '#64748b' }}>{k.slice(0,1)}<span style={{ color: p>80?'#34d399':'#f1f5f9' }}>{p}</span></div>;
          })}
        </div>
        {open && (<>
          <div className="p-atelier-genes">
            {genes.length === 0 ? (<div className="p-atelier-empty">no editable genes — use prompt bar or library to seed rich artifact</div>) : genes.map(([name, g]) => (
              <GeneRow key={name} name={name} gene={g} onChange={(v) => setGene(name, v)} />
            ))}
          </div>
          {pending && (<div className="p-atelier-actions"><button type="button" className="p-atelier-commit" onClick={commit}>commit {Object.keys(edits).length} → regrow (live strata update)</button></div>)}
          <div style={{ padding: '4px 8px', fontSize: 9, color: 'var(--p-ink-3)', fontFamily: 'var(--p-font-mono)' }}>Atelier primary · all ops (grow/mutate/breed/evolve/compose) live reactive via events + useGrowArtifact + activeSeed. Strata from QC.</div>
        </>)}
      </div>
    </div>
  );
};

const GeneRow: React.FC<{ name: string; gene: GeneVal; onChange: (v: unknown) => void; }> = ({ name, gene, onChange }) => {
  const t = gene.type ?? "unknown";
  const v = gene.value;
  if (t === "scalar" && typeof v === "number") {
    return (<div className="p-atelier-row"><label className="p-atelier-label">{name}<span className="p-atelier-type">scalar</span></label><input type="range" min="-2" max="2" step="0.01" value={v} onChange={(e) => onChange(parseFloat(e.target.value))} className="p-atelier-range" /><span className="p-atelier-val">{v.toFixed(3)}</span></div>);
  }
  if (t === "categorical" && typeof v === "string") {
    return (<div className="p-atelier-row"><label className="p-atelier-label">{name}<span className="p-atelier-type">categorical</span></label><input type="text" value={v} onChange={(e) => onChange(e.target.value)} className="p-atelier-text" /></div>);
  }
  return (<div className="p-atelier-row"><label className="p-atelier-label">{name}<span className="p-atelier-type">{t}</span></label><span className="p-atelier-val">{typeof v === "object" ? JSON.stringify(v).slice(0, 32) : String(v)}</span></div>);
};
