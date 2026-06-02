import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useActiveSeed } from "@/stores/activeSeed";
import { CrucibleMode } from "./CrucibleMode";
import { SeedGlyph } from "@/ui/primitives/SeedGlyph";

interface GeneVal { type?: string; value?: unknown; }
interface SeedBody { id: string; genes?: Record<string, GeneVal>; }

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

  if (!seed) return <CrucibleMode />;

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      <CrucibleMode />
      <div className={`p-atelier-panel ${open ? "" : "p-atelier-panel--closed"}`}>
        <header className="p-atelier-head">
          <SeedGlyph hash={seed.hash} domain={seed.domain} size={24} />
          <div className="p-atelier-title">genome · {genes.length}</div>
          <button type="button" className="p-atelier-toggle" onClick={() => setOpen(o => !o)} title={open ? "collapse" : "expand"}>{open ? "▸" : "◂"}</button>
        </header>
        {open && (<>
          <div className="p-atelier-genes">
            {genes.length === 0 ? (<div className="p-atelier-empty">no editable genes</div>) : genes.map(([name, g]) => (
              <GeneRow key={name} name={name} gene={g} onChange={(v) => setGene(name, v)} />
            ))}
          </div>
          {pending && (<div className="p-atelier-actions"><button type="button" className="p-atelier-commit" onClick={commit}>commit {Object.keys(edits).length} → regrow</button></div>)}
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
