/**
 * FriendPanel — the full Studio surface for Friends.
 *
 * 3-pane layout:
 *   ┌── library (240px) ──┬─── center ───┬── right rail (260px) ──┐
 *   │ gallery + drag-to-  │ avatar + ops │ tabs:                  │
 *   │ breed + delete      │ + stats      │  - lineage             │
 *   │                     │              │  - sovereignty         │
 *   └─────────────────────┴──────────────┴────────────────────────┘
 *
 * Drag a Friend onto another in the library to breed them. Click any
 * Friend in the library or in the lineage tree to load it center.
 */

import React, { useState, useCallback } from 'react';
import { Loader2, Heart, Sparkles, Shuffle, Wand2, GitBranch, ShieldCheck } from 'lucide-react';
import { FriendAvatar } from './FriendAvatar';
import { Friend3DAvatar } from './Friend3DAvatar';
import { FriendStats } from './FriendStats';
import { FriendLibrary } from './FriendLibrary';
import { FriendLineage } from './FriendLineage';
import { FriendSovereigntyCard } from './FriendSovereigntyCard';
import { friendApi, type FriendGenerateResponse } from './api';
import type { FriendSeedData, FriendArtifact } from '@/lib/friend';

type Op = 'generate' | 'breed' | 'mutate';
type RightTab = 'lineage' | 'sovereignty';

export const FriendPanel: React.FC = () => {
  // Center state — the currently-loaded Friend.
  const [seed, setSeed] = useState<FriendSeedData | null>(null);
  const [artifact, setArtifact] = useState<FriendArtifact | null>(null);

  // Operation form state.
  const [op, setOp] = useState<Op>('generate');
  const [seedString, setSeedString] = useState('my-first-friend');
  const [parentA, setParentA] = useState('');
  const [parentB, setParentB] = useState('');
  const [breedSalt, setBreedSalt] = useState('1');
  const [magnitude, setMagnitude] = useState(0.15);
  const [mutateSalt, setMutateSalt] = useState('shift-1');

  // Library + UI state.
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('lineage');

  const loadResponse = useCallback((r: FriendGenerateResponse) => {
    setSeed(r.friendSeed);
    setArtifact(r.artifact);
    setRefreshKey((k) => k + 1);
    setError(null);
  }, []);

  const wrapCall = useCallback(async (fn: () => Promise<FriendGenerateResponse>) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      loadResponse(r);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, [loadResponse]);

  const handleGenerate = () => wrapCall(() => friendApi.generate({ seed: seedString }));

  const handleBreed = () =>
    wrapCall(() => {
      // Prefer ids if they look like 16-hex ids; otherwise treat as seed strings.
      const isId = (s: string) => /^[0-9a-f]{16}$/i.test(s);
      const body: Parameters<typeof friendApi.breed>[0] = { salt: breedSalt || undefined };
      if (isId(parentA)) body.parentAId = parentA; else body.parentA = parentA;
      if (isId(parentB)) body.parentBId = parentB; else body.parentB = parentB;
      return friendApi.breed(body);
    });

  const handleMutate = () =>
    wrapCall(() => {
      const isId = (s: string) => /^[0-9a-f]{16}$/i.test(s);
      const body: Parameters<typeof friendApi.mutate>[0] = { magnitude, salt: mutateSalt || undefined };
      if (seed && isId(seed.id)) body.parentId = seed.id;
      else if (seedString) body.parent = seedString;
      else if (seed) body.parentId = seed.id;
      return friendApi.mutate(body);
    });

  const handleSelect = useCallback(async (f: FriendSeedData) => {
    setBusy(true);
    try {
      const r = await friendApi.get(f.id);
      setSeed(r.friendSeed);
      setArtifact(r.artifact);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const handleLibraryBreed = useCallback((a: FriendSeedData, b: FriendSeedData) => {
    setOp('breed');
    setParentA(a.id);
    setParentB(b.id);
    setBreedSalt(`${a.id.slice(0, 4)}-${b.id.slice(0, 4)}`);
    wrapCall(() => friendApi.breed({
      parentAId: a.id, parentBId: b.id,
      salt: `${a.id.slice(0, 4)}-${b.id.slice(0, 4)}`,
    }));
  }, [wrapCall]);

  return (
    <div className="flex h-full w-full bg-neutral-950 text-white">
      {/* ── LEFT: Library ─────────────────────────────────────────────── */}
      <div className="w-[260px] border-r border-neutral-900 flex-shrink-0">
        <FriendLibrary
          refreshKey={refreshKey}
          selectedId={seed?.id}
          onSelect={handleSelect}
          onBreed={handleLibraryBreed}
          onRemove={(id) => { if (seed?.id === id) { setSeed(null); setArtifact(null); } }}
        />
      </div>

      {/* ── CENTER: Avatar + controls + stats ─────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* op tabs */}
        <div className="flex border-b border-neutral-900 text-[10px] font-mono">
          <OpTab cur={op} mine="generate" set={setOp} icon={<Sparkles className="w-3 h-3" />} label="generate" />
          <OpTab cur={op} mine="breed" set={setOp} icon={<Heart className="w-3 h-3" />} label="breed" />
          <OpTab cur={op} mine="mutate" set={setOp} icon={<Shuffle className="w-3 h-3" />} label="mutate" />
          {error && <div className="ml-auto px-2 py-1.5 text-red-400 truncate max-w-[40%]" title={error}>{error}</div>}
        </div>

        {/* control row */}
        <div className="p-2 border-b border-neutral-900 bg-neutral-925" style={{ background: 'rgb(13 13 13)' }}>
          {op === 'generate' && (
            <div className="flex gap-2 items-center">
              <input
                value={seedString}
                onChange={(e) => setSeedString(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-[11px] font-mono"
                placeholder="seed string — anything; same string → same friend"
                aria-label="Seed string"
              />
              <Btn onClick={handleGenerate} disabled={busy} icon={<Wand2 className="w-3 h-3" />} busy={busy}>
                Generate
              </Btn>
            </div>
          )}
          {op === 'breed' && (
            <div className="flex gap-2 items-center">
              <input
                value={parentA} onChange={(e) => setParentA(e.target.value)}
                className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-[11px] font-mono"
                placeholder="parent A — seed string OR 16-hex id"
                aria-label="Parent A"
              />
              <span className="text-neutral-700">×</span>
              <input
                value={parentB} onChange={(e) => setParentB(e.target.value)}
                className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-[11px] font-mono"
                placeholder="parent B"
                aria-label="Parent B"
              />
              <input
                value={breedSalt} onChange={(e) => setBreedSalt(e.target.value)}
                className="w-20 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-[11px] font-mono"
                placeholder="salt"
                aria-label="Breed salt"
              />
              <Btn onClick={handleBreed} disabled={busy} icon={<Heart className="w-3 h-3" />} busy={busy}>
                Breed
              </Btn>
            </div>
          )}
          {op === 'mutate' && (
            <div className="flex gap-2 items-center">
              <input
                value={seed?.id ?? seedString}
                onChange={(e) => setSeedString(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-[11px] font-mono"
                placeholder="parent — pick from library or type a seed string"
                aria-label="Mutate parent"
              />
              <span className="text-[10px] font-mono text-neutral-500">σ</span>
              <input
                type="range" min={0} max={1} step={0.01}
                value={magnitude} onChange={(e) => setMagnitude(Number(e.target.value))}
                className="w-32"
                aria-label="Mutation magnitude"
              />
              <span className="text-[10px] font-mono text-accent w-10 text-right">{magnitude.toFixed(2)}</span>
              <input
                value={mutateSalt} onChange={(e) => setMutateSalt(e.target.value)}
                className="w-20 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-[11px] font-mono"
                placeholder="salt"
                aria-label="Mutation salt"
              />
              <Btn onClick={handleMutate} disabled={busy} icon={<Shuffle className="w-3 h-3" />} busy={busy}>
                Mutate
              </Btn>
            </div>
          )}
        </div>

        {/* avatar + stats */}
        <div className="flex-1 overflow-auto p-4 flex gap-4">
          <div className="flex-shrink-0">
            <FriendAvatar artifact={artifact} seed={seed} size={320} animated />
            {seed && <Friend3DAvatar friend={seed} size={320} />}
            {seed && (
              <div className="mt-2 text-center font-mono text-[10px] text-neutral-400">
                <div className="text-accent text-[12px]">{seed.name}</div>
                <div className="text-neutral-600">{seed.id}</div>
                <div className="text-neutral-700">gen {seed.derivation?.generation ?? 0} · {seed.derivation?.operator ?? 'genesis'}</div>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 overflow-y-auto pr-2">
            <FriendStats seed={seed} artifact={artifact} />
          </div>
        </div>
      </div>

      {/* ── RIGHT: Lineage + Sovereignty tabs ─────────────────────────── */}
      <div className="w-[300px] border-l border-neutral-900 flex-shrink-0 flex flex-col">
        <div className="flex border-b border-neutral-900 text-[10px] font-mono">
          <RightTabBtn cur={rightTab} mine="lineage" set={setRightTab} icon={<GitBranch className="w-3 h-3" />} label="lineage" />
          <RightTabBtn cur={rightTab} mine="sovereignty" set={setRightTab} icon={<ShieldCheck className="w-3 h-3" />} label="sovereignty" />
        </div>
        <div className="flex-1 overflow-hidden">
          {rightTab === 'lineage' && (
            <FriendLineage rootId={seed?.id ?? null} onNavigate={(id) => handleSelect({ id } as FriendSeedData)} />
          )}
          {rightTab === 'sovereignty' && (
            <FriendSovereigntyCard friend={seed} onFriendUpdated={(f) => { setSeed(f); setRefreshKey((k) => k + 1); }} />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── tiny helpers ────────────────────────────────────────────────────────────

const Btn: React.FC<{ onClick: () => void; disabled?: boolean; busy?: boolean; icon: React.ReactNode; children: React.ReactNode }> = ({
  onClick, disabled, busy, icon, children,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="px-3 py-1 bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-30 disabled:cursor-not-allowed rounded text-[11px] font-mono flex items-center gap-1.5"
  >
    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
    {children}
  </button>
);

interface TabProps<T extends string> {
  cur: T;
  mine: T;
  set: (v: T) => void;
  icon: React.ReactNode;
  label: string;
}

function OpTab({ cur, mine, set, icon, label }: TabProps<Op>) {
  const active = cur === mine;
  return (
    <button
      onClick={() => set(mine)}
      className={`px-3 py-1.5 flex items-center gap-1.5 ${active ? 'bg-neutral-900 text-accent' : 'text-neutral-500 hover:text-white'}`}
    >
      {icon}{label}
    </button>
  );
}

function RightTabBtn({ cur, mine, set, icon, label }: TabProps<RightTab>) {
  const active = cur === mine;
  return (
    <button
      onClick={() => set(mine)}
      className={`flex-1 px-2 py-1.5 flex items-center justify-center gap-1.5 ${active ? 'bg-neutral-900 text-accent' : 'text-neutral-500 hover:text-white'}`}
    >
      {icon}{label}
    </button>
  );
}
