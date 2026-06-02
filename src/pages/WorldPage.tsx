/**
 * /world — generate, view, and inspect deterministic Worlds.
 *
 * Mirrors the shape of /friend: a seed input on the left, a rendered
 * preview in the middle (locations + factions + hook), and a deterministic
 * fingerprint at the bottom.
 */
import React, { useState, useEffect } from 'react';

interface WorldArtifact {
  id: string;
  seedHash: string;
  name: string;
  phenotype: {
    era: string;
    biome: string;
    magicLevel: string;
    techLevel: string;
    mood: string;
    conflict: string;
  };
  locations: Array<{ name: string; type: string; description: string }>;
  factions: Array<{ name: string; alignment: string; stance: string }>;
  hook: string;
  meta: { generatorVersion: string };
}

const CURATED = ['vellichor', 'iron-marsh', 'thrice-fallen', 'oak-hollow', 'cinder-spire', 'glasshalls'];

const WorldPage: React.FC = () => {
  const [seed, setSeed] = useState('vellichor');
  const [pending, setPending] = useState('vellichor');
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; world: WorldArtifact; hash: string } | { kind: 'err'; msg: string }>({ kind: 'idle' });

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from props; effect is correct
    setState({ kind: 'loading' });
    fetch('/api/v1/world/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed }),
    }).then(async (r) => {
      const j = await r.json();
      if (cancelled) return;
      if (!r.ok) return setState({ kind: 'err', msg: j.error || `HTTP ${r.status}` });
      setState({ kind: 'ready', world: j.artifact, hash: j.hash });
    }).catch((e) => { if (!cancelled) setState({ kind: 'err', msg: String(e) }); });
    return () => { cancelled = true; };
  }, [seed]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto p-8 grid grid-cols-[260px_1fr] gap-8">
        <aside>
          <h1 className="text-2xl font-serif mb-1 text-amber-200">Worlds</h1>
          <p className="text-xs text-zinc-500 mb-6">Deterministic settings. Same seed → identical world.</p>
          <div className="mb-4">
            <label className="block text-xs uppercase tracking-[0.2em] text-zinc-500 mb-1">seed</label>
            <input
              value={pending}
              onChange={(e) => setPending(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setSeed(pending); }}
              onBlur={() => setSeed(pending)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 font-mono text-sm"
            />
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">curated</div>
          <ul className="space-y-1 text-sm">
            {CURATED.map((s) => (
              <li key={s}>
                <button onClick={() => { setPending(s); setSeed(s); }}
                  className={`text-left w-full ${s === seed ? 'text-amber-300' : 'text-zinc-400 hover:text-zinc-200'}`}>
                  <span className="text-zinc-600 mr-2">›</span>{s}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <main>
          {state.kind === 'loading' && <div className="text-zinc-500">Growing world…</div>}
          {state.kind === 'err' && <div className="text-red-400">Error: {state.msg}</div>}
          {state.kind === 'ready' && (
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-1">{state.world.phenotype.era} · {state.world.phenotype.biome}</div>
              <h2 className="text-3xl font-serif mb-1 text-zinc-100">{state.world.name}</h2>
              <div className="text-sm text-zinc-500 mb-6">
                magic <span className="text-zinc-300">{state.world.phenotype.magicLevel}</span>{' · '}
                tech <span className="text-zinc-300">{state.world.phenotype.techLevel}</span>{' · '}
                mood <span className="text-zinc-300">{state.world.phenotype.mood}</span>{' · '}
                conflict <span className="text-zinc-300">{state.world.phenotype.conflict}</span>
              </div>
              <div className="mb-8 p-4 border-l-2 border-amber-700 bg-zinc-900/40">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-600 mb-1">the hook</div>
                <p className="text-zinc-200 italic leading-relaxed">{state.world.hook}</p>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <section>
                  <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">locations</div>
                  <ul className="space-y-3">
                    {state.world.locations.map((l) => (
                      <li key={l.name} className="text-sm">
                        <div className="text-zinc-200">{l.name}</div>
                        <div className="text-xs text-zinc-500">{l.type}</div>
                        <div className="text-zinc-400 text-xs mt-1 leading-relaxed">{l.description}</div>
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">factions</div>
                  <ul className="space-y-3">
                    {state.world.factions.map((f) => (
                      <li key={f.name} className="text-sm">
                        <div className="text-zinc-200">{f.name}</div>
                        <div className="text-xs text-zinc-500">{f.alignment} · {f.stance}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
              <div className="border-t border-zinc-900 pt-4 text-xs text-zinc-600 font-mono flex justify-between">
                <span>hash {state.hash.slice(0, 16)}</span>
                <a href={`/play/iris/${encodeURIComponent(seed)}`} className="text-zinc-500 hover:text-amber-300">
                  play here →
                </a>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default WorldPage;
