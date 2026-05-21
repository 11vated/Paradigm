/**
 * SovereignAgentPanel — Studio panel for the Reality-OS Cognitive Substrate.
 *
 * Connects the user's natural-language prompt to the 6-stage Sovereign Agent
 * via /api/sovereign-agent/*. Surfaces:
 *   - intent (top + sub + domains)
 *   - per-stage timings
 *   - $reality annotation (dominant dimension + magnitude)
 *   - oracle score + axes (when validate ran)
 *   - feedback-loop iteration count
 *   - canon recall ("similar seeds I've made")
 *   - "Promote to canon" → bumps userApproved (UI stub)
 */
import React, { useState, useCallback } from 'react';
import { Sparkles, Brain, Activity, Search, Loader2, Check, AlertCircle } from 'lucide-react';
import {
  runSovereignAgent,
  canonSearch,
  ingestSeedToCanon,
  type SovereignAgentRunResponse,
  type CanonHit,
} from '@/lib/sovereign-agent-client';

export function SovereignAgentPanel(): React.ReactElement {
  const [utterance, setUtterance] = useState('a melancholy ocean ally named Aria');
  const [feedbackLoop, setFeedbackLoop] = useState(true);
  const [report, setReport] = useState<SovereignAgentRunResponse | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [hits, setHits] = useState<CanonHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [promoted, setPromoted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onRun = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    setPromoted(null);
    try {
      const r = await runSovereignAgent(utterance, { feedbackLoop });
      if (!r.ok) setError(r.error || 'agent.run failed');
      setReport(r);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [utterance, feedbackLoop]);

  const onSearch = useCallback(async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const r = await canonSearch(searchQ, 10);
      setHits(r.hits ?? []);
    } finally {
      setSearching(false);
    }
  }, [searchQ]);

  const onPromote = useCallback(async () => {
    if (!report?.seed) return;
    const r = await ingestSeedToCanon(report.seed);
    if (r.ok && r.id) setPromoted(r.id);
  }, [report]);

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-semibold">Sovereign Agent</h2>
        <span className="text-xs text-zinc-500 ml-auto">6-stage pipeline · 8 sub-agents · Reality-OS substrate</span>
      </header>

      <section className="space-y-2">
        <label className="text-xs text-zinc-400">Utterance</label>
        <textarea
          value={utterance}
          onChange={(e) => setUtterance(e.target.value)}
          rows={2}
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm font-mono"
          placeholder="e.g. a luminous baroque cathedral with melancholy choir"
        />
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={feedbackLoop} onChange={(e) => setFeedbackLoop(e.target.checked)} />
            Oracle feedback loop
          </label>
          <button
            onClick={onRun}
            disabled={loading || !utterance.trim()}
            className="ml-auto inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            agent.run()
          </button>
        </div>
      </section>

      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded p-2 flex gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" /> {error}
        </div>
      )}

      {report && report.ok && (
        <section className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <Kv k="intent.top" v={report.intent?.top} />
            <Kv k="intent.sub" v={report.intent?.sub ?? '(none)'} />
            <Kv k="domains" v={report.intent?.domains?.join(', ')} />
            <Kv k="planHash" v={report.planHash?.slice(0, 16) + '…'} mono />
            <Kv k="seedHash" v={(report.seed?.$hash ?? '').slice(0, 16) + '…'} mono />
            <Kv k="iterations" v={String(report.iterations ?? 0)} />
          </div>

          {report.reality && (
            <div className="border border-zinc-800 rounded p-2 bg-zinc-900/50">
              <div className="text-zinc-500 mb-1 flex items-center gap-1">
                <Activity className="w-3 h-3" /> $reality annotation
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Kv k="dominant" v={report.reality.dominant} />
                <Kv k="magnitude" v={report.reality.magnitude.toFixed(3)} />
                <Kv k="dims" v={Object.entries(report.reality.signature?.weights ?? {}).filter(([, w]) => (w as number) > 0).length + ' active'} />
              </div>
            </div>
          )}

          {report.oracle && (
            <div className="border border-zinc-800 rounded p-2 bg-zinc-900/50">
              <div className="text-zinc-500 mb-1">Oracle scorecard</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono">{report.oracle.overall.toFixed(2)}</span>
                <span className="text-zinc-500">overall · {report.signed ? 'signed' : 'unsigned'}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                {Object.entries(report.oracle.axes).map(([axis, score]) => (
                  <div key={axis} className="flex justify-between">
                    <span className="text-zinc-400">{axis}</span>
                    <span className="font-mono">{(score as number).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.timings && (
            <div className="border border-zinc-800 rounded p-2 bg-zinc-900/50">
              <div className="text-zinc-500 mb-1">Per-stage timing (ms)</div>
              <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                {Object.entries(report.timings).map(([s, ms]) => (
                  <div key={s} className="flex justify-between">
                    <span className="text-zinc-400">{s}</span>
                    <span className="font-mono">{ms}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onPromote}
              disabled={!report.seed || !!promoted}
              className="text-xs inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 rounded"
            >
              {promoted ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {promoted ? `In canon: ${promoted.slice(0, 12)}…` : 'Promote to canon'}
            </button>
          </div>
        </section>
      )}

      <section className="space-y-2 pt-3 border-t border-zinc-800">
        <label className="text-xs text-zinc-400 flex items-center gap-1">
          <Search className="w-3.5 h-3.5" /> Canon recall (semantic)
        </label>
        <div className="flex gap-2">
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            placeholder="characters like Aria, ocean vibes, baroque…"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm"
          />
          <button onClick={onSearch} disabled={searching || !searchQ.trim()}
            className="text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white px-3 py-1.5 rounded">
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </button>
        </div>
        {hits.length > 0 && (
          <ul className="text-xs space-y-1 max-h-48 overflow-y-auto">
            {hits.map((h) => (
              <li key={h.hash} className="border border-zinc-800 rounded px-2 py-1.5 flex items-center gap-2">
                <span className="text-purple-400 font-mono w-12 shrink-0">{h.similarity.toFixed(2)}</span>
                <span className="text-zinc-300 truncate flex-1">{h.text}</span>
                <span className="text-zinc-500 font-mono shrink-0">{h.hash.slice(0, 10)}…</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kv({ k, v, mono }: { k: string; v?: string; mono?: boolean }): React.ReactElement {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-zinc-500 w-20 shrink-0 text-right">{k}</span>
      <span className={mono ? 'font-mono text-zinc-200' : 'text-zinc-200'}>{v ?? '—'}</span>
    </div>
  );
}

export default SovereignAgentPanel;
