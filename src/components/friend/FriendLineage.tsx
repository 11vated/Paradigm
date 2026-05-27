/**
 * FriendLineage — compact ancestor/descendant view for a Friend.
 *
 * Renders the actual `/api/v1/friend/:id/lineage` response shape:
 *   { self, ancestors: LineageNode[], descendants: LineageNode[], depth }
 *
 * Each LineageNode is { id, name, generation, operator, parents[], children[] }.
 * Both ancestors and descendants are flat arrays; we reconstruct the tree
 * by walking `parents` (for ancestors) and `children` (for descendants).
 */

import React, { useEffect, useState } from 'react';
import type { LineageNode } from '@/lib/friend';
import { friendApi } from './api';

export interface FriendLineageProps {
  rootId: string | null;
  onNavigate?: (id: string) => void;
  depth?: number;
}

interface LineageResponse {
  self: { id: string; name: string; generation: number };
  ancestors: LineageNode[];
  descendants: LineageNode[];
  depth: number;
}

export const FriendLineage: React.FC<FriendLineageProps> = ({ rootId, onNavigate, depth = 6 }) => {
  const [data, setData] = useState<LineageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rootId) { setData(null); return; }
    setLoading(true);
    setError(null);
    (friendApi.lineage(rootId, depth) as unknown as Promise<LineageResponse>)
      .then(setData)
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [rootId, depth]);

  if (!rootId) {
    return (
      <div className="text-[10px] font-mono text-neutral-600 p-3 text-center">
        Select a Friend to see its lineage.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-white text-[10px] font-mono">
      <div className="px-2 py-1 border-b border-neutral-900 text-accent">
        Lineage · depth ≤ {data?.depth ?? depth}
      </div>
      {loading && <div className="text-neutral-600 p-2">loading…</div>}
      {error && <div className="text-red-400 p-2">{error}</div>}

      {data && (
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Ancestors (oldest at top, rooted by parents-of-parents) */}
          {data.ancestors.length > 0 && (
            <section>
              <div className="text-neutral-500 mb-1">
                Ancestors ({data.ancestors.length})
              </div>
              <AncestorChain ancestors={data.ancestors} onClick={onNavigate} />
              <div className="text-neutral-700 pl-2 my-1">│</div>
              <div className="text-neutral-700 pl-2">↓</div>
            </section>
          )}

          {/* Self */}
          <section>
            <div className="text-neutral-500 mb-1">Self</div>
            <div
              role="button"
              tabIndex={0}
              className="flex items-center gap-1 py-0.5 px-1 rounded bg-neutral-900 border border-accent/30 cursor-pointer"
              onClick={() => data.self.id && onNavigate?.(data.self.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); data.self.id && onNavigate?.(data.self.id); } }}
            >
              <span className="text-blue-400">◆</span>
              <span className="truncate flex-1">{data.self.name}</span>
              <span className="text-neutral-700 text-[9px]">gen {data.self.generation}</span>
            </div>
          </section>

          {/* Descendants */}
          {data.descendants.length > 0 && (
            <section>
              <div className="text-neutral-500 mb-1">
                Descendants ({data.descendants.length})
              </div>
              <DescendantTree
                rootId={data.self.id}
                nodes={data.descendants}
                onClick={onNavigate}
              />
            </section>
          )}

          {data.ancestors.length === 0 && data.descendants.length === 0 && (
            <div className="text-neutral-700 text-center py-2">
              No relations recorded.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Recursive descendant tree ──────────────────────────────────────────────

interface DescendantTreeProps {
  rootId: string;
  nodes: LineageNode[];
  onClick?: (id: string) => void;
}

const DescendantTree: React.FC<DescendantTreeProps> = ({ rootId, nodes, onClick }) => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // direct children of rootId are nodes whose parents contain rootId
  const directChildren = nodes.filter((n) => n.parents.includes(rootId));
  return (
    <div>
      {directChildren.map((c) => (
        <NodeRow key={c.id} node={c} byId={byId} depth={0} onClick={onClick} />
      ))}
    </div>
  );
};

interface NodeRowProps {
  node: LineageNode;
  byId: Map<string, LineageNode>;
  depth: number;
  onClick?: (id: string) => void;
}

const NodeRow: React.FC<NodeRowProps> = ({ node, byId, depth, onClick }) => {
  const opGlyph = node.operator === 'breed' ? '⚭' : node.operator === 'mutate' ? '~' : '◆';
  const opColor =
    node.operator === 'breed' ? 'text-emerald-400' :
    node.operator === 'mutate' ? 'text-amber-400' : 'text-blue-400';

  return (
    <div>
      <div
          role="button"
          tabIndex={0}
          className="flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer hover:bg-neutral-900"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          onClick={() => node.id && onClick?.(node.id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); node.id && onClick?.(node.id); } }}
        >
        <span className={opColor}>{opGlyph}</span>
        <span className="truncate flex-1">{node.name}</span>
        <span className="text-neutral-700 text-[9px]">gen {node.generation}</span>
      </div>
      {node.children.map((cid) => {
        const child = byId.get(cid);
        if (!child) return null;
        return <NodeRow key={cid} node={child} byId={byId} depth={depth + 1} onClick={onClick} />;
      })}
    </div>
  );
};

// ─── Ancestor chain (single linear walk back) ──────────────────────────────

const AncestorChain: React.FC<{ ancestors: LineageNode[]; onClick?: (id: string) => void }> = ({ ancestors, onClick }) => (
  <div>
    {ancestors.map((a) => {
      const opGlyph = a.operator === 'breed' ? '⚭' : a.operator === 'mutate' ? '~' : '◆';
      const opColor =
        a.operator === 'breed' ? 'text-emerald-400' :
        a.operator === 'mutate' ? 'text-amber-400' : 'text-blue-400';
      return (
        <div
          key={a.id}
          role="button"
          tabIndex={0}
          className="flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer hover:bg-neutral-900 opacity-70"
          onClick={() => a.id && onClick?.(a.id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.id && onClick?.(a.id); } }}
        >
          <span className={opColor}>{opGlyph}</span>
          <span className="truncate flex-1">{a.name}</span>
          <span className="text-neutral-700 text-[9px]">gen {a.generation}</span>
        </div>
      );
    })}
  </div>
);
