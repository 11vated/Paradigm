import React, { useEffect, useState } from 'react';
import { getDAOState, getDAOProposals, proposeDAO, voteDAO, executeDAO } from '@/services/api';

interface DAOState {
  name: string; proposals: number; activeProposals: number;
  approvedGeneTypes: number; onChain: boolean;
  governorAddress: string | null; timelockAddress: string | null;
}

interface DAOProposal {
  id: string; title: string; description: string; proposer: string;
  type: string; status: string; votesFor: number; votesAgainst: number;
  votingDeadline: string; createdAt: string; executedAt?: string;
}

type Tab = 'all' | 'voting' | 'passed' | 'executed' | 'draft' | 'rejected';

const STATUS_COLORS: Record<string, string> = {
  voting: 'text-yellow-400 border-yellow-600/40 bg-yellow-950/30',
  passed: 'text-green-400 border-green-600/40 bg-green-950/30',
  rejected: 'text-red-400 border-red-600/40 bg-red-950/30',
  executed: 'text-blue-400 border-blue-600/40 bg-blue-950/30',
  draft: 'text-neutral-400 border-neutral-600/40 bg-neutral-800/30',
};

const TYPE_COLORS: Record<string, string> = {
  governance: 'text-purple-400', treasury: 'text-amber-400',
  gene_type: 'text-cyan-400', domain: 'text-emerald-400',
  royalty_curve: 'text-pink-400', substrate: 'text-indigo-400',
};

export default function DaoPage() {
  const [state, setState] = useState<DAOState | null>(null);
  const [proposals, setProposals] = useState<DAOProposal[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'governance', payload: '{}' });
  const [error, setError] = useState('');

  const load = async () => {
    try { setState(await getDAOState()); } catch { /* ignore */ }
    try { setProposals((await getDAOProposals()).proposals || []); } catch { /* ignore */ }
  };

    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from props; effect is correct
  useEffect(() => { load(); }, []);

  const filtered = tab === 'all' ? proposals : proposals.filter(p => p.status === tab);

  const handlePropose = async () => {
    setError('');
    try {
      await proposeDAO({ title: form.title, description: form.description, type: form.type, payload: JSON.parse(form.payload) });
      setShowForm(false); setForm({ title: '', description: '', type: 'governance', payload: '{}' });
      await load();
    } catch (e: any) { setError(e.message || 'Proposal failed'); }
  };

  const handleVote = async (id: string, support: boolean) => {
    try { await voteDAO(id, support); await load(); } catch (e: any) { setError(e.message); }
  };

  const handleExecute = async (id: string) => {
    try { await executeDAO(id); await load(); } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="h-screen w-screen bg-neutral-950 text-white flex flex-col overflow-hidden">
      <header className="h-10 px-3 flex items-center border-b border-neutral-900 gap-3 shrink-0">
        <span className="font-mono text-[10px] text-accent uppercase tracking-widest">Paradigm · DAO</span>
        <span className="font-mono text-[9px] text-neutral-600">governance · proposals · voting</span>
        <a href="/classic" className="ml-auto font-mono text-[9px] text-neutral-500 hover:text-white uppercase tracking-wider">← Studio</a>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-5xl mx-auto w-full">
        {error && <div className="text-red-400 text-xs font-mono bg-red-950/30 border border-red-800/40 rounded px-3 py-2">{error}</div>}

        {/* DAO State */}
        {state && (
          <div className="grid grid-cols-5 gap-3">
            {[['Proposals', state.proposals], ['Active', state.activeProposals], ['Gene Types', state.approvedGeneTypes], ['Mode', state.onChain ? 'On-chain' : 'Off-chain'], ['Constitutional', '12']].map(([l, v]) => (
              <div key={l as string} className="border border-neutral-800 rounded p-3 text-center">
                <div className="text-[18px] font-mono font-bold">{v}</div>
                <div className="text-[9px] text-neutral-500 uppercase tracking-wider mt-0.5">{l as string}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-neutral-800 pb-1">
          {(['all', 'voting', 'passed', 'executed', 'draft', 'rejected'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded-t ${tab === t ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
              {t}
            </button>
          ))}
          <button onClick={() => setShowForm(!showForm)}
            aria-expanded={showForm}
            aria-controls="dao-proposal-form"
            className="ml-auto px-3 py-1 text-[10px] font-mono uppercase tracking-wider bg-accent/20 text-accent border border-accent/30 rounded hover:bg-accent/30">
            + Propose
          </button>
        </div>

        {/* Create Proposal Form */}
        {showForm && (
          <div className="border border-neutral-800 rounded p-3 space-y-2 bg-neutral-900/50">
            <input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs font-mono text-white placeholder-neutral-600" aria-label="Proposal title" />
            <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs font-mono text-white placeholder-neutral-600" aria-label="Proposal description" />
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs font-mono text-white">
              {['governance', 'treasury', 'gene_type', 'domain', 'royalty_curve', 'substrate'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <textarea placeholder='Payload JSON' value={form.payload} onChange={e => setForm(f => ({ ...f, payload: e.target.value }))}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs font-mono text-white placeholder-neutral-600 h-16" aria-label="Proposal payload" />
            <div className="flex gap-2">
              <button onClick={handlePropose}
                className="px-3 py-1 text-xs font-mono bg-accent/20 text-accent border border-accent/30 rounded hover:bg-accent/30">Submit</button>
              <button onClick={() => setShowForm(false)}
                className="px-3 py-1 text-xs font-mono text-neutral-500 border border-neutral-700 rounded hover:text-white">Cancel</button>
            </div>
          </div>
        )}

        {/* Proposal List */}
        <div className="space-y-2">
          {filtered.length === 0 && <div className="text-neutral-600 text-xs font-mono text-center py-8">No {tab} proposals</div>}
          {filtered.map(p => (
            <div key={p.id} className="border border-neutral-800 rounded p-3 hover:border-neutral-700 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-neutral-500">{p.id}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 border rounded uppercase tracking-wider ${STATUS_COLORS[p.status] || 'text-neutral-400'}`}>{p.status}</span>
                <span className={`text-[9px] font-mono ${TYPE_COLORS[p.type] || 'text-neutral-400'}`}>{p.type}</span>
                <span className="ml-auto text-[9px] font-mono text-neutral-600">
                  {p.status === 'voting' ? `ends ${new Date(p.votingDeadline).toLocaleDateString()}` : `created ${new Date(p.createdAt).toLocaleDateString()}`}
                </span>
              </div>
              <div className="text-xs font-medium mb-1">{p.title}</div>
              {p.description && <div className="text-[10px] text-neutral-400 mb-2 line-clamp-2">{p.description}</div>}
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="text-green-400">✓ {p.votesFor}</span>
                <span className="text-red-400">✗ {p.votesAgainst}</span>
                <span className="text-neutral-600">{p.proposer ? `by ${p.proposer.slice(0, 8)}…` : ''}</span>
                <div className="ml-auto flex gap-1">
                  {p.status === 'voting' && (
                    <>
                      <button onClick={() => handleVote(p.id, true)}
                        className="px-2 py-0.5 text-[9px] font-mono bg-green-950/30 text-green-400 border border-green-800/40 rounded hover:bg-green-900/30">For</button>
                      <button onClick={() => handleVote(p.id, false)}
                        className="px-2 py-0.5 text-[9px] font-mono bg-red-950/30 text-red-400 border border-red-800/40 rounded hover:bg-red-900/30">Against</button>
                    </>
                  )}
                  {p.status === 'passed' && (
                    <button onClick={() => handleExecute(p.id)}
                      className="px-2 py-0.5 text-[9px] font-mono bg-blue-950/30 text-blue-400 border border-blue-800/40 rounded hover:bg-blue-900/30">Execute</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
