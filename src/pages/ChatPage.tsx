/**
 * /chat/:id — conversation runtime with a Friend.
 *
 * Uses the persona-genes-driven heuristic engine; optional voice via VoiceGene.
 * History persists in memory for the session; Tier 1 step 3 will add episodic notes.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';
import { FriendAvatar } from '@/components/friend/FriendAvatar';
import { generateReply, greetingFor, speakAs, isSpeechAvailable } from '@/lib/friend';
import type { FriendSeedData, FriendArtifact, Turn } from '@/lib/friend';

export default function ChatPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [friend, setFriend] = useState<FriendSeedData | null>(null);
  const [artifact, setArtifact] = useState<FriendArtifact | null>(null);
  const [history, setHistory] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/api/v1/friend/${id}`);
        if (!r.ok) throw new Error(`Friend not found (HTTP ${r.status})`);
        const data = await r.json();
        if (!live) return;
        setFriend(data.friendSeed);
        setArtifact(data.artifact);
        const opener: Turn = { speaker: 'friend', text: greetingFor(data.friendSeed), turn: 0 };
        setHistory([opener]);
      } catch (e: any) { setErr(e.message); }
    })();
    return () => { live = false; };
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [history.length]);

  function send() {
    const text = draft.trim();
    if (!text || !friend) return;
    const userTurn: Turn = { speaker: 'user', text, turn: history.length };
    const reply = generateReply(friend, { history: [...history, userTurn], userText: text });
    const friendTurn: Turn = { speaker: 'friend', text: reply, turn: history.length + 1 };
    setHistory(h => [...h, userTurn, friendTurn]);
    setDraft('');
    if (voiceOn && isSpeechAvailable()) speakAs(friend, reply);
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <TopNav />
      <div className="max-w-4xl mx-auto p-4 grid grid-cols-[200px_1fr] gap-6">
        <aside className="space-y-3">
          {friend && artifact ? (
            <>
              <FriendAvatar artifact={artifact} seed={friend} size={180} animated />
              <div className="text-sm font-medium">{friend.name}</div>
              <div className="text-[11px] text-neutral-400">
                {friend.genes.persona.speechStyle} · curiosity {Math.round((friend.genes.persona.curiosity ?? 0) * 100)}%
              </div>
              <div className="flex flex-wrap gap-1">
                {friend.genes.persona.interests.slice(0, 4).map((tag, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">{tag}</span>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-400 mt-3">
                <input type="checkbox" checked={voiceOn} onChange={e => setVoiceOn(e.target.checked)} />
                voice on
              </label>
              <Link to={`/lineage/${friend.id}`} className="block text-xs text-neutral-500 hover:text-neutral-300 mt-2">view lineage →</Link>
            </>
          ) : (
            <div className="text-xs text-neutral-500">{err ?? 'Loading…'}</div>
          )}
        </aside>

        <main className="flex flex-col h-[calc(100vh-110px)] border border-neutral-800 rounded-lg bg-neutral-900/30">
          <div className="flex-1 overflow-auto p-4 space-y-3 text-sm">
            {history.map(t => (
              <div key={t.turn} className={t.speaker === 'friend' ? 'text-neutral-100' : 'text-neutral-300 text-right'}>
                <div className={`inline-block max-w-[80%] px-3 py-2 rounded-lg ${t.speaker === 'friend' ? 'bg-neutral-800 border border-neutral-700' : 'bg-emerald-900/40 border border-emerald-800'}`}>
                  {t.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="border-t border-neutral-800 p-3 flex gap-2">
            <textarea
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm resize-none"
              rows={2}
              placeholder="Say something…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKey}
              disabled={!friend}
            />
            <button
              onClick={send}
              disabled={!friend || !draft.trim()}
              className="px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-sm font-medium"
            >
              Send
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
