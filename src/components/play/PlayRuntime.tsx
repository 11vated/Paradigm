/**
 * PlayRuntime — renders a GameArtifact as a playable text adventure.
 *
 * Walks the deterministic scene graph. Tracks karma. Renders branching
 * choices. Shows the appropriate ending when karma threshold is met.
 */
import React, { useState, useMemo, useEffect } from 'react';

type Choice = { id: string; label: string; nextScene: string | null; karma?: number };
type Scene = { id: string; act: number; title: string; body: string; choices: Choice[]; isEnding?: boolean };
type GameArtifact = {
  title: string;
  hook: string;
  scenes: Scene[];
  endings: Array<{ id: string; karma: 'high' | 'mid' | 'low'; text: string }>;
  meta: { friendName: string; worldName: string; archetype: string };
};

export const PlayRuntime: React.FC<{ artifact: GameArtifact }> = ({ artifact }) => {
  const sceneById = useMemo(() => Object.fromEntries(artifact.scenes.map((s) => [s.id, s])), [artifact]);
  const firstScene = artifact.scenes[0]?.id;
  const [currentId, setCurrentId] = useState<string | null>(firstScene);
  const [karma, setKarma] = useState(0);
  const [history, setHistory] = useState<string[]>([]);

  // Reset state when artifact changes
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from props; effect is correct
  useEffect(() => { setCurrentId(firstScene); setKarma(0); setHistory([]); }, [firstScene]);

  if (!currentId) return <div className="text-zinc-400">No scenes in this game.</div>;
  const scene = sceneById[currentId];
  if (!scene) return <div className="text-red-400">Scene "{currentId}" not found.</div>;

  // Reached an ending stub? Pick a real ending by karma.
  if (scene.isEnding) {
    const tier: 'high' | 'mid' | 'low' = karma > 1 ? 'high' : karma < -1 ? 'low' : 'mid';
    const ending = artifact.endings.find((e) => e.karma === tier) ?? artifact.endings[0];
    return (
      <div className="max-w-2xl mx-auto p-8 text-zinc-100">
        <div className="mb-6 text-xs uppercase tracking-[0.2em] text-amber-400">Ending · {tier}</div>
        <h1 className="text-2xl font-serif mb-4 text-amber-200">{scene.title}</h1>
        <p className="leading-relaxed text-zinc-200 mb-8 whitespace-pre-wrap">{ending?.text ?? scene.body}</p>
        <div className="text-xs text-zinc-500 border-t border-zinc-800 pt-4">
          karma: {karma >= 0 ? '+' : ''}{karma} · {history.length} choices ·{' '}
          <button onClick={() => { setCurrentId(firstScene); setKarma(0); setHistory([]); }}
            className="underline hover:text-zinc-300">restart</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 text-zinc-100">
      <div className="mb-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
        Act {scene.act} · karma {karma >= 0 ? '+' : ''}{karma}
      </div>
      <h2 className="text-xl font-serif mb-4 text-zinc-200">{scene.title}</h2>
      <p className="leading-relaxed text-zinc-300 mb-8 whitespace-pre-wrap">{scene.body}</p>
      <div className="space-y-2">
        {scene.choices.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setKarma((k) => k + (c.karma ?? 0));
              setHistory((h) => [...h, c.id]);
              setCurrentId(c.nextScene);
            }}
            className="w-full text-left px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-200 hover:text-amber-200 transition-colors"
          >
            <span className="text-zinc-600 mr-2">›</span>{c.label}
            {c.karma != null && c.karma !== 0 && (
              <span className="ml-2 text-xs text-zinc-600">({c.karma > 0 ? '+' : ''}{c.karma})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
