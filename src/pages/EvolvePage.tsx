import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';
const ARCS = ['heroic','mystery','survival','discovery','political','redemption'];
export default function EvolvePage() {
  const [brief, setBrief] = useState('a calm exploration with a melancholy hero');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setRunning(true); setErr(null);
    try {
      const r = await fetch('/api/v1/game/direct', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ brief, iterations: 40, paceBins: 4 }) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      setResult(await r.json());
    } catch (e: any) { setErr(e.message); }
    finally { setRunning(false); }
  }

  const grid: any[] = result?.search?.alternatives ? [result.search.chosen, ...result.search.alternatives] : [];
  const cellByKey = new Map<string, any>(grid.map(c => [`${c.archetype}@${c.paceBin}`, c]));
  const chosen = result?.search?.chosen;
  const spec = result?.spec;
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <TopNav />
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Evolve</h1>
        <p className="text-neutral-400 text-sm">Describe a game. Director picks targets; MAP-Elites searches.</p>
        <div className="flex gap-2">
          <input className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm" value={brief} onChange={e => setBrief(e.target.value)} placeholder="describe your game" aria-label="Game description" />
          <button onClick={go} disabled={running || !brief} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:opacity-40">{running ? 'Searching…' : 'Search'}</button>
        </div>
        {err && <div className="text-red-400 text-sm">{err}</div>}
        {spec && (
          <div className="border border-neutral-800 rounded p-3 bg-neutral-900/50 text-xs space-y-1">
            <div className="text-neutral-400 uppercase tracking-wider">Director Spec</div>
            <div>archetype: <span className="text-amber-400">{spec.archetype ?? '— any —'}</span> · pace: {spec.pace ?? '—'} · mood: {spec.mood ?? '—'}</div>
            {spec.rationale && spec.rationale.map((r: string, i: number) => <div key={i} className="text-neutral-500">· {r}</div>)}
          </div>
        )}
        {result?.search && (
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">MAP-Elites grid · {grid.length} cells filled</div>
            <div className="grid grid-cols-5 gap-1 text-xs">
              <div></div>
              {[0,1,2,3].map(b => <div key={b} className="text-center text-neutral-500">pace {b}</div>)}
              {ARCS.map(arc => (
                <React.Fragment key={arc}>
                  <div className="py-2 text-neutral-400">{arc}</div>
                  {[0,1,2,3].map(b => {
                    const c = cellByKey.get(`${arc}@${b}`);
                    const isChosen = chosen?.archetype === arc && chosen?.paceBin === b;
                    if (!c) return <div key={b} className="aspect-square border border-neutral-900 rounded bg-neutral-950" />;
                    const intensity = Math.round((c.score ?? 0) * 100);
                    return (
                      <Link key={b} to={`/play/${encodeURIComponent(c.friendSeed)}/${encodeURIComponent(c.worldSeed)}`} className={`aspect-square rounded border ${isChosen ? 'border-amber-500 ring-2 ring-amber-500/40' : 'border-neutral-800'} flex flex-col items-center justify-center hover:bg-neutral-800/60`} style={{ background: `rgba(59,130,246,${intensity/250 + 0.15})` }}>
                        <div className="font-mono text-[10px]">{(c.score ?? 0).toFixed(2)}</div>
                      </Link>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
