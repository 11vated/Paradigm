/**
 * FriendPanel — the Studio panel for creating, breeding, and mutating Friends.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │ [seed input]  [Generate]                    │
 *   │                                             │
 *   │  ┌─────────┐                                │
 *   │  │ Avatar  │     <— FriendAvatar            │
 *   │  │ 256x256 │                                │
 *   │  └─────────┘                                │
 *   │                                             │
 *   │  ──── BREED ────                            │
 *   │  parent A: [seed]                           │
 *   │  parent B: [seed]                           │
 *   │  salt:     [...]    [Breed]                 │
 *   │                                             │
 *   │  ──── MUTATE ────                           │
 *   │  magnitude: [slider]   [Mutate]             │
 *   │                                             │
 *   │  ──── Stats ────                            │
 *   │  <FriendStats />                            │
 *   └─────────────────────────────────────────────┘
 *
 * Calls /api/v1/friend/{generate,breed,mutate} directly.
 */

import React, { useState, useCallback } from 'react';
import { Loader2, Heart, Sparkles, Shuffle, Wand2 } from 'lucide-react';
import { FriendAvatar } from './FriendAvatar';
import { FriendStats } from './FriendStats';
import type { FriendSeedData, FriendArtifact } from '@/lib/friend';

interface FriendResponse {
  friendSeed: FriendSeedData;
  artifact: FriendArtifact;
}

type Mode = 'generate' | 'breed' | 'mutate';

export const FriendPanel: React.FC = () => {
  const [mode, setMode] = useState<Mode>('generate');
  const [generateInput, setGenerateInput] = useState('my-first-friend');

  const [parentA, setParentA] = useState('sky');
  const [parentB, setParentB] = useState('earth');
  const [breedSalt, setBreedSalt] = useState('first-child');

  const [mutateParent, setMutateParent] = useState('my-first-friend');
  const [mutateSalt, setMutateSalt] = useState('shift-1');
  const [magnitude, setMagnitude] = useState(0.25);

  const [current, setCurrent] = useState<FriendResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callApi = useCallback(async (path: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/friend/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
      setCurrent(data as FriendResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const handleGenerate = () =>
    callApi('generate', { seed: generateInput.trim() || 'unnamed' });

  const handleBreed = () =>
    callApi('breed', {
      parentA: parentA.trim(),
      parentB: parentB.trim(),
      salt: breedSalt.trim() || undefined,
    });

  const handleMutate = () =>
    callApi('mutate', {
      parent: mutateParent.trim(),
      magnitude,
      salt: mutateSalt.trim() || undefined,
    });

  const ModeBtn: React.FC<{
    id: Mode; icon: React.ComponentType<{ className?: string }>; label: string;
  }> = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setMode(id)}
      className={`flex items-center gap-1.5 px-2 py-1 border font-mono text-[10px] uppercase tracking-wider
        ${mode === id
          ? 'bg-neutral-900 text-white border-accent'
          : 'bg-transparent text-neutral-500 border-neutral-800 hover:text-neutral-300'}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-white">
      {/* Mode switcher */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-900">
        <ModeBtn id="generate" icon={Sparkles} label="Generate" />
        <ModeBtn id="breed"    icon={Heart}    label="Breed" />
        <ModeBtn id="mutate"   icon={Wand2}    label="Mutate" />
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3">
          {/* LEFT: controls */}
          <div className="space-y-4">
            {mode === 'generate' && (
              <div className="space-y-2">
                <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">
                  Seed string (any text)
                </label>
                <input
                  value={generateInput}
                  onChange={(e) => setGenerateInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  className="w-full h-8 bg-transparent border border-neutral-800 text-[11px] font-mono text-white px-2"
                  placeholder="e.g. nori-the-curious"
                />
                <button
                  onClick={handleGenerate}
                  disabled={busy || !generateInput.trim()}
                  className="w-full h-8 bg-accent text-black font-mono text-[10px] uppercase tracking-wider
                             flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {busy
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Sparkles className="w-3 h-3" />}
                  Generate Friend
                </button>
              </div>
            )}

            {mode === 'breed' && (
              <div className="space-y-2">
                <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">
                  Parent A
                </label>
                <input
                  value={parentA}
                  onChange={(e) => setParentA(e.target.value)}
                  className="w-full h-8 bg-transparent border border-neutral-800 text-[11px] font-mono text-white px-2"
                />
                <div className="text-center text-neutral-700 font-mono text-[10px]">×</div>
                <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">
                  Parent B
                </label>
                <input
                  value={parentB}
                  onChange={(e) => setParentB(e.target.value)}
                  className="w-full h-8 bg-transparent border border-neutral-800 text-[11px] font-mono text-white px-2"
                />
                <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider mt-2 block">
                  Salt (optional)
                </label>
                <input
                  value={breedSalt}
                  onChange={(e) => setBreedSalt(e.target.value)}
                  className="w-full h-8 bg-transparent border border-neutral-800 text-[11px] font-mono text-white px-2"
                />
                <button
                  onClick={handleBreed}
                  disabled={busy || !parentA.trim() || !parentB.trim()}
                  className="w-full h-8 bg-accent text-black font-mono text-[10px] uppercase tracking-wider
                             flex items-center justify-center gap-2 disabled:opacity-40 mt-1"
                >
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Heart className="w-3 h-3" />}
                  Breed
                </button>
              </div>
            )}

            {mode === 'mutate' && (
              <div className="space-y-2">
                <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">
                  Parent seed
                </label>
                <input
                  value={mutateParent}
                  onChange={(e) => setMutateParent(e.target.value)}
                  className="w-full h-8 bg-transparent border border-neutral-800 text-[11px] font-mono text-white px-2"
                />
                <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider mt-2 block">
                  Magnitude: {magnitude.toFixed(2)}
                </label>
                <input
                  type="range"
                  min={0} max={1} step={0.01}
                  value={magnitude}
                  onChange={(e) => setMagnitude(Number(e.target.value))}
                  className="w-full"
                />
                <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider mt-2 block">
                  Salt (optional)
                </label>
                <input
                  value={mutateSalt}
                  onChange={(e) => setMutateSalt(e.target.value)}
                  className="w-full h-8 bg-transparent border border-neutral-800 text-[11px] font-mono text-white px-2"
                />
                <button
                  onClick={handleMutate}
                  disabled={busy || !mutateParent.trim()}
                  className="w-full h-8 bg-accent text-black font-mono text-[10px] uppercase tracking-wider
                             flex items-center justify-center gap-2 disabled:opacity-40 mt-1"
                >
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shuffle className="w-3 h-3" />}
                  Mutate
                </button>
              </div>
            )}

            {error && (
              <div className="border border-red-900 bg-red-950/40 text-red-300 font-mono text-[10px] p-2">
                {error}
              </div>
            )}
          </div>

          {/* RIGHT: avatar */}
          <div className="flex items-start justify-center">
            <FriendAvatar artifact={current?.artifact ?? null} size={256} />
          </div>
        </div>

        {/* BELOW: stats */}
        {current && (
          <div className="border-t border-neutral-900">
            <FriendStats seed={current.friendSeed} artifact={current.artifact} />
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendPanel;
