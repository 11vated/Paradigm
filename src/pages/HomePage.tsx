/**
 * / — Paradigm home. Shows your most-bonded Friend, latest moments,
 * and entry points to the substrate (chat, world, quest, play, evolve, repl, studio).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';
import { FriendAvatar } from '@/components/friend/FriendAvatar';
import type { FriendSeedData, FriendArtifact } from '@/lib/friend';
import { greetingFor } from '@/lib/friend';

interface FriendNote { turn: number; kind: string; text: string; recordedAt: string; }

interface FriendListItem {
  id: string;
  name: string;
  generation: number;
  bondStrength?: number;
}

export default function HomePage() {
  const [friend, setFriend] = useState<FriendSeedData | null>(null);
  const [artifact, setArtifact] = useState<FriendArtifact | null>(null);
  const [count, setCount] = useState<number>(0);
  const [notes, setNotes] = useState<FriendNote[]>([]);
  const [_allFriends, setAllFriends] = useState<FriendListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch('/api/v1/friend/list?limit=100');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!live) return;
        setAllFriends(data.friends ?? []);
        setCount(data.total ?? data.friends?.length ?? 0);
        // Pick the highest-generation friend as "most-bonded" — a proxy until
        // bondStrength is tracked. Generation is monotonic with intentional curation.
        const best = (data.friends ?? []).sort((a: any, b: any) => (b.generation ?? 0) - (a.generation ?? 0))[0];
        if (best) {
          const r2 = await fetch(`/api/v1/friend/${best.id}`);
          if (r2.ok) {
            const fd = await r2.json();
            if (live) { setFriend(fd.friendSeed); setArtifact(fd.artifact); }
          }
          const r3 = await fetch(`/api/v1/friend/${best.id}/notes?limit=5`);
          if (r3.ok) {
            const nd = await r3.json();
            if (live) setNotes(nd.notes ?? []);
          }
        }
      } catch (e: any) { setErr(e.message); }
    })();
    return () => { live = false; };
  }, []);

  const greeting = friend ? greetingFor(friend) : 'Paradigm';
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <TopNav />
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <header>
          <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">paradigm — your sovereign substrate</div>
          <h1 className="text-3xl font-serif mt-1">{greeting}</h1>
          <div className="text-sm text-neutral-400 mt-2">
            {count > 0 ? `${count} friend${count === 1 ? '' : 's'} in your library` : 'No friends yet. Compose your first below.'}
          </div>
        </header>

        {err && <div className="text-sm text-red-400">{err}</div>}

        {friend && artifact && (
          <section className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
            <div className="space-y-3">
              <FriendAvatar artifact={artifact} seed={friend} size={260} animated />
              <div className="text-sm font-medium">{friend.name}</div>
              <div className="text-[11px] text-neutral-400">
                gen {friend.derivation?.generation ?? 0} · {friend.genes.persona.speechStyle}
              </div>
              <div className="flex flex-wrap gap-1">
                {friend.genes.persona.interests.slice(0, 5).map((tag, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">{tag}</span>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Link to={`/chat/${friend.id}`} className="text-xs px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 font-medium">talk to {friend.name.split(' ')[0]}</Link>
                <Link to={`/friend`} className="text-xs px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700">studio</Link>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">recent moments</div>
                {notes.length === 0 ? (
                  <div className="text-sm text-neutral-500 italic">No moments yet. <Link to={`/chat/${friend.id}`} className="text-emerald-400 hover:text-emerald-300">Start a conversation</Link>.</div>
                ) : (
                  <ul className="space-y-1.5">
                    {notes.map(n => (
                      <li key={n.recordedAt + ':' + n.turn} className="text-sm">
                        <span className={`inline-block w-12 text-[10px] uppercase ${n.kind === 'friend' ? 'text-emerald-400' : 'text-neutral-500'}`}>{n.kind}</span>
                        <span className="text-neutral-200">{n.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="text-xs uppercase tracking-wider text-neutral-500 mb-3">explore the substrate</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Tile to="/classic/friend"  title="Friend"  sub="compose a companion" />
            <Tile to="/classic/world"   title="World"   sub="conjure a setting" />
            <Tile to="/classic/quest"   title="Quest"   sub="friend × world" />
            <Tile to="/classic/play"    title="Play"    sub="walk a game" />
            <Tile to="/classic/evolve"  title="Evolve"  sub="director + MAP-elites" />
            <Tile to="/classic/repl"    title="REPL"    sub="GSPL live" />
            <Tile to="/classic/lineage/demo" title="Lineage" sub="ancestry trees" />
            <Tile to="/"  title="Studio"  sub="full kernel" />
          </div>
        </section>

        <footer className="text-xs text-neutral-600 pt-8 border-t border-neutral-900">
          <Link to="/" className="hover:text-neutral-400">paradigm</Link>
          {' · '}
          deterministic substrate · sovereign genomes · evolvable artifacts
        </footer>
      </div>
    </div>
  );
}

function Tile({ to, title, sub }: { to: string; title: string; sub: string }) {
  return (
    <Link
      to={to}
      className="block px-4 py-3 rounded-lg border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 hover:border-neutral-700 transition-colors"
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[11px] text-neutral-500">{sub}</div>
    </Link>
  );
}
