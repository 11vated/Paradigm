import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';

interface LineageNode {
  id: string;
  name: string;
  generation: number;
  operator: 'genesis' | 'breed' | 'mutate';
  parents: string[];
  children: string[];
}

export default function LineagePage() {
  const { id } = useParams<{ id: string }>();
  const [self, setSelf] = useState<LineageNode | null>(null);
  const [ancestors, setAncestors] = useState<LineageNode[]>([]);
  const [descendants, setDescendants] = useState<LineageNode[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setErr(null); setSelf(null);
    fetch(`/api/v1/friend/${id}/lineage?depth=6`)
      .then(r => r.json())
      .then((d) => {
        setSelf(d.self ?? null);
        setAncestors(d.ancestors ?? []);
        setDescendants(d.descendants ?? []);
      })
      .catch(e => setErr(String(e)));
  }, [id]);

  const Node = ({ n, accent }: { n: LineageNode; accent: string }) => (
    <Link to={`/lineage/${n.id}`} className={`block px-3 py-2 rounded-lg border ${accent} hover:bg-neutral-800/60 transition-colors`}>
      <div className="text-xs text-neutral-400 font-mono">gen {n.generation} · {n.operator}</div>
      <div className="text-sm font-semibold text-neutral-100">{n.name}</div>
      <div className="text-[10px] text-neutral-500 font-mono">{n.id.slice(0, 12)}…</div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <TopNav />
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <header className="border-b border-neutral-800 pb-4">
          <h1 className="text-2xl font-bold">Lineage</h1>
          <div className="text-xs text-neutral-500 font-mono mt-1">{id}</div>
        </header>
        {err && <div className="text-red-400 text-sm">{err}</div>}
        {!id && <div className="text-neutral-500">No friend id in URL.</div>}
        {self && (
          <>
            <section>
              <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Ancestors ({ancestors.length})</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ancestors.length === 0 && <div className="text-neutral-600 text-sm col-span-full">— (genesis)</div>}
                {ancestors.map(a => <Node key={a.id} n={a} accent="border-amber-700/40 bg-amber-950/20" />)}
              </div>
            </section>
            <section className="border-2 border-blue-500/50 rounded-lg p-4 bg-blue-950/20">
              <div className="text-xs uppercase tracking-wider text-blue-400 mb-2">Self</div>
              <Node n={self} accent="border-blue-700/50" />
            </section>
            <section>
              <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Descendants ({descendants.length})</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {descendants.length === 0 && <div className="text-neutral-600 text-sm col-span-full">— (no children yet)</div>}
                {descendants.map(d => <Node key={d.id} n={d} accent="border-emerald-700/40 bg-emerald-950/20" />)}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
