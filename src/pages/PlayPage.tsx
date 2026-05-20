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
    <div className="max-w-2xl mx-auto p-8 text-zinc-100">
      <h1 className="text-3xl font-serif mb-2 text-amber-200">Paradigm · Play</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Any (friend, world) pair compiles deterministically to a playable game.
      </p>
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-zinc-500 mb-1">friend seed</label>
          <input value={friend} onChange={(e) => setFriend(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 font-mono" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-zinc-500 mb-1">world seed</label>
          <input value={world} onChange={(e) => setWorld(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 font-mono" />
        </div>
        <button onClick={() => navigate(`/play/${encodeURIComponent(friend)}/${encodeURIComponent(world)}`)}
          className="w-full px-4 py-3 bg-amber-700 hover:bg-amber-600 text-zinc-100 font-semibold rounded">
          Generate &amp; Play →
        </button>
      </div>
      <div className="border-t border-zinc-800 pt-6">
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">curated</div>
        <ul className="space-y-1">
          {CURATED.map((c) => (
            <li key={c.name}>
              <Link to={`/play/${c.friend}/${c.world}`}
                className="text-zinc-300 hover:text-amber-200">
                <span className="text-zinc-600 mr-2">›</span>{c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const PlayGame: React.FC = () => {
  const { friendSeed, worldSeed } = useParams();
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'ready'; artifact: any } | { kind: 'err'; msg: string }>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
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
      <div className="border-b border-zinc-900 px-8 py-3 text-xs flex items-center justify-between">
        <Link to="/play" className="text-zinc-500 hover:text-zinc-300">‹ Play</Link>
        <span className="text-zinc-500">
          <span className="text-zinc-300">{state.artifact.title}</span>
          <span className="text-zinc-700 mx-2">·</span>
          {state.artifact.meta.archetype}
        </span>
      </div>
      <PlayRuntime artifact={state.artifact} />
    </div>
  );
};

const PlayPage: React.FC = () => {
  const { friendSeed } = useParams();
  return friendSeed ? <PlayGame /> : <PlayLobby />;
};

export default PlayPage;
