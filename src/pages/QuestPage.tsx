/**
 * /quest — visual composer for Friend × World → Quest.
 *
 * Pick a friend seed, pick a world seed, see the resulting quest brief
 * live. One click compiles it into a runnable game at /play.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const FRIENDS = ['iris', 'atlas-the-bold', 'sora', 'nori-the-curious', 'wren-the-quiet', 'vesper'];
const WORLDS = ['vellichor', 'iron-marsh', 'thrice-fallen', 'oak-hollow', 'cinder-spire', 'glasshalls'];

const Picker: React.FC<{ label: string; value: string; options: string[]; onChange: (v: string) => void }> = ({ label, value, options, onChange }) => (
  <div>
    <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">{label}</div>
    <input value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full mb-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 font-mono text-sm" />
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-2 py-1 rounded text-xs ${o === value ? 'bg-amber-700 text-zinc-100' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
          {o}
        </button>
      ))}
    </div>
  </div>
);

interface QuestData {
  id: string;
  title: string;
  genes: { archetype: string; tone: number; pacing: number; difficulty: number; stakes: number; acts: number };
  acts: Array<{ name: string; beats: string[] }>;
  protagonist: { name: string; archetype: string };
  setting: { name: string; era: string; biome: string };
  antagonist: { kind: string; description: string };
  meta: { generatorVersion: string };
}

const QuestPage: React.FC = () => {
  const [friend, setFriend] = useState('iris');
  const [world, setWorld] = useState('vellichor');
  const [quest, setQuest] = useState<QuestData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from props; effect is correct
    setErr(null);
    fetch('/api/v1/quest/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendSeed: friend, worldSeed: world }),
    }).then(async (r) => {
      const j = await r.json();
      if (cancelled) return;
      if (!r.ok) { setErr(j.error || `HTTP ${r.status}`); setQuest(null); return; }
      setQuest(j.quest);
    }).catch((e) => { if (!cancelled) setErr(String(e)); });
    return () => { cancelled = true; };
  }, [friend, world]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-3xl font-serif mb-1 text-amber-200">Quest · Friend × World</h1>
        <p className="text-sm text-zinc-500 mb-8">
          Multi-source composition. Two seeds collapse into one quest, deterministically.
        </p>

        <div className="grid grid-cols-[280px_1fr] gap-8">
          <aside className="space-y-6">
            <Picker label="friend" value={friend} options={FRIENDS} onChange={setFriend} />
            <div className="text-center text-zinc-700 text-lg">↓ × ↓</div>
            <Picker label="world" value={world} options={WORLDS} onChange={setWorld} />
            <div className="border-t border-zinc-800 pt-4">
              <Link to={`/play/${encodeURIComponent(friend)}/${encodeURIComponent(world)}`}
                className="block text-center px-4 py-3 bg-amber-700 hover:bg-amber-600 text-zinc-100 font-semibold rounded">
                Compile &amp; Play →
              </Link>
            </div>
          </aside>

          <main>
            {err && <div className="text-red-400 mb-4">Error: {err}</div>}
            {!quest && !err && <div className="text-zinc-500">Composing…</div>}
            {quest && (
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-amber-600 mb-2">{quest.genes.archetype}</div>
                <h2 className="text-2xl font-serif mb-2 text-zinc-100">{quest.title}</h2>
                <div className="text-sm text-zinc-500 mb-6">
                  <span className="text-zinc-300">{quest.protagonist.name}</span> ({quest.protagonist.archetype}){' '}
                  in <span className="text-zinc-300">{quest.setting.name}</span> · {quest.setting.era} / {quest.setting.biome}
                </div>
                <div className="grid grid-cols-4 gap-3 mb-8 text-xs">
                  {[
                    ['tone', quest.genes.tone],
                    ['pacing', quest.genes.pacing],
                    ['difficulty', quest.genes.difficulty],
                    ['stakes', quest.genes.stakes],
                  ].map(([k, v]) => (
                    <div key={k as string} className="bg-zinc-900 border border-zinc-800 rounded p-3">
                      <div className="text-zinc-500 uppercase tracking-[0.15em] mb-1">{k}</div>
                      <div className="text-zinc-100 font-mono">{(v as number).toFixed(2)}</div>
                      <div className="mt-1 h-1 bg-zinc-800 rounded">
                        <div className="h-1 bg-amber-700 rounded" style={{ width: `${(v as number) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mb-8 p-4 border-l-2 border-rose-700 bg-zinc-900/40">
                  <div className="text-xs uppercase tracking-[0.2em] text-rose-400 mb-1">antagonist · {quest.antagonist.kind}</div>
                  <p className="text-zinc-200 italic">{quest.antagonist.description}</p>
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">acts</div>
                <div className="space-y-4">
                  {quest.acts.map((act, i) => (
                    <div key={i} className="border-l-2 border-zinc-800 pl-4">
                      <div className="text-zinc-200 mb-2 font-medium">Act {i + 1} · {act.name}</div>
                      <ul className="space-y-1 text-sm text-zinc-400">
                        {act.beats.map((b, j) => (
                          <li key={j}><span className="text-zinc-700 mr-2">›</span>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-4 border-t border-zinc-900 text-xs text-zinc-600 font-mono">
                  quest {quest.id.slice(0, 16)} · gen {quest.meta.generatorVersion}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default QuestPage;
