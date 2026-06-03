/**
 * /play — lobby for generating a game from any (friend, world) pair.
 * /play/:friendSeed/:worldSeed — direct runtime.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PlayRuntime } from '@/components/play/PlayRuntime';

const CURATED = [
  { friend: 'iris', world: 'vellichor', name: 'Iris in Vellichor' },
  { friend: 'atlas-the-bold', world: 'iron-marsh', name: 'Atlas in Iron Marsh' },
  { friend: 'sora', world: 'thrice-fallen', name: 'Sora in Thrice-Fallen' },
  { friend: 'nori-the-curious', world: 'oak-hollow', name: 'Nori in Oak Hollow' },
  { friend: 'wren-the-quiet', world: 'cinder-spire', name: 'Wren in Cinder Spire' },
];

const PlayLobby: React.FC = () => {
  const navigate = useNavigate();
  const [friend, setFriend] = useState('iris');
  const [world, setWorld] = useState('vellichor');
  return (
    <div className="max-w-2xl mx-auto p-8 text-zinc-100" role="main" aria-label="Play lobby: compile Friend × World to sovereign game runtime">
      <h1 className="text-3xl font-serif mb-2 text-amber-200">Paradigm · Play</h1>
      <p className="text-sm text-zinc-400 mb-8">Any (friend, world) pair compiles deterministically to a playable game. WCAG 2.2 AA · &lt;60s zero-onboard claim (see Onboarding + Studio).</p>
      <div className="space-y-4 mb-8">
        <div role="group" aria-label="friend seed input group">
          <label className="block text-xs uppercase tracking-[0.2em] text-zinc-500 mb-1">friend seed</label>
          <input
            aria-label="Friend seed name or hash"
            value={friend}
            onChange={(e) => setFriend(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/play/${encodeURIComponent(friend)}/${encodeURIComponent(world)}`); }}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 font-mono min-h-[44px] touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
          />
        </div>
        <div role="group" aria-label="world seed input group">
          <label className="block text-xs uppercase tracking-[0.2em] text-zinc-500 mb-1">world seed</label>
          <input
            aria-label="World seed name or hash"
            value={world}
            onChange={(e) => setWorld(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/play/${encodeURIComponent(friend)}/${encodeURIComponent(world)}`); }}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 font-mono min-h-[44px] touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
          />
        </div>
        <button
          type="button"
          onClick={() => navigate(`/play/${encodeURIComponent(friend)}/${encodeURIComponent(world)}`)}
          aria-label="Generate deterministic game from friend and world seeds and enter PlayRuntime"
          className="w-full px-4 py-3 bg-amber-700 hover:bg-amber-600 text-zinc-100 font-semibold rounded min-h-[44px] touch-manipulation motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          Generate &amp; Play →
        </button>
      </div>
      <div className="border-t border-zinc-800 pt-6">
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">curated</div>
        <ul className="space-y-1" role="listbox" aria-label="Curated friend-world pairs for instant play">
          {CURATED.map((c) => (
            <li key={c.name}>
              <Link
                to={`/play/${c.friend}/${c.world}`}
                aria-label={`Play curated ${c.name}`}
                className="text-zinc-300 hover:text-amber-200 min-h-[28px] inline-block focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber-400"
              >
                <span className="text-zinc-600 mr-2">›</span>{c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {/* Live provenance claim + strata note (actual data in runtime via PlayRuntime + Export) */}
      <div className="mt-6 pt-4 border-t border-zinc-900 text-[10px] text-emerald-400/80 font-mono" role="region" aria-label="Sovereign provenance and strata for games">
        Live in PlayRuntime: real calculateStratumConformance (Story/Mind/World/Field/Culture) + royalty + 5-clause QualityContract + ECDSA sig + C2PA. &lt;60s visible in Onboarding/Studio/Prompt. CLI `paradigm make` mirrors.
      </div>
    </div>
  );
};

const PlayGame: React.FC = () => {
  const { friendSeed, worldSeed } = useParams();
  // Use unknown + narrow; artifact shape from /api is GameArtifact (see PlayRuntime)
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'ready'; artifact: Record<string, unknown> } | { kind: 'err'; msg: string }>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from props; effect is correct
    setState({ kind: 'loading' });
    fetch('/api/v1/game/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendSeed, worldSeed }),
    }).then(async (r) => {
      const j = await r.json();
      if (cancelled) return;
      if (!r.ok) return setState({ kind: 'err', msg: j.error || `HTTP ${r.status}` });
      setState({ kind: 'ready', artifact: j.artifact });
    }).catch((e) => { if (!cancelled) setState({ kind: 'err', msg: String(e) }); });
    return () => { cancelled = true; };
  }, [friendSeed, worldSeed]);

  if (state.kind === 'loading') return <div className="p-8 text-zinc-500">Compiling game…</div>;
  if (state.kind === 'err') return <div className="p-8 text-red-400">Error: {state.msg}</div>;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="border-b border-zinc-900 px-8 py-3 text-xs flex items-center justify-between" role="navigation" aria-label="Play game header with title and back">
        <Link to="/play" aria-label="Back to play lobby" className="text-zinc-500 hover:text-zinc-300 min-h-[28px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber-400 motion-reduce:transition-none">‹ Play</Link>
        <span className="text-zinc-400" role="status" aria-live="polite">
          <span className="text-zinc-200">{(state.artifact as {title?:string}).title}</span>
          <span className="text-zinc-700 mx-2">·</span>
          {(state.artifact as {archetype?:string; meta?:{archetype?:string}}).archetype || ((state.artifact as {meta?:{archetype?:string}}).meta?.archetype) || 'game'}
          {(state.artifact as {pitch?:string}).pitch ? ` · ${(state.artifact as {pitch?:string}).pitch}` : ''}
        </span>
      </div>
      <PlayRuntime artifact={state.artifact as unknown as import('@/lib/game/types').GameArtifact & {hook?:string}} />
    </div>
  );
};

const PlayPage: React.FC = () => {
  const { friendSeed } = useParams();
  return friendSeed ? <PlayGame /> : <PlayLobby />;
};

export default PlayPage;
