import { GitBranch } from 'lucide-react';
import { OP_COLORS } from '@/lib/constants';

export default function LineageTree({ seed, gallery, onSelect }) {
  if (!seed) {
    return (
      <div className="flex items-center justify-center h-48 p-4" data-testid="lineage-empty">
        <p className="font-mono text-[10px] text-neutral-600 text-center">
          Select a seed to view its lineage tree.
        </p>
      </div>
    );
  }

  const parentHashes = seed.$lineage?.parents || [];
  const parents = gallery.filter(s => parentHashes.includes(s.$hash));
  const children = gallery.filter(s =>
    s.$lineage?.parents?.includes(seed.$hash) && s.id !== seed.id
  );

  return (
    <div className="p-3 space-y-3" data-testid="lineage-tree">
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-3 h-3 text-neutral-600" />
        <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Lineage</span>
      </div>

      {/* Parents */}
      {parents.length > 0 && (
        <div className="space-y-1">
          <span className="font-mono text-[8px] text-neutral-700 uppercase tracking-wider">Parents</span>
          {parents.map(p => (
            <button
              key={p.id}
              data-testid={`lineage-parent-${p.id}`}
              onClick={() => onSelect(p)}
              className="w-full text-left p-2 border border-neutral-900 hover:border-neutral-700 transition-colors"
            >
              <div className="font-mono text-[10px] text-neutral-400 truncate">{p.$name}</div>
              <div className="font-mono text-[8px] text-neutral-700">{p.$hash?.slice(0, 24)}...</div>
            </button>
          ))}
        </div>
      )}

      {/* Current */}
      <div className="p-3 border border-orange-500/30 bg-orange-500/5" data-testid="lineage-current">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="font-heading text-xs font-bold text-white">{seed.$name}</span>
        </div>
        <div className="font-mono text-[9px] text-neutral-500 space-y-0.5">
          <div>OP: <span style={{ color: OP_COLORS[seed.$lineage?.operation] || '#525252' }}>{seed.$lineage?.operation}</span></div>
          <div>GEN: {seed.$lineage?.generation || 0}</div>
          <div className="truncate">HASH: {seed.$hash?.slice(0, 32)}...</div>
        </div>
      </div>

      {/* Children */}
      {children.length > 0 && (
        <div className="space-y-1">
          <span className="font-mono text-[8px] text-neutral-700 uppercase tracking-wider">Children ({children.length})</span>
          {children.slice(0, 10).map(c => (
            <button
              key={c.id}
              data-testid={`lineage-child-${c.id}`}
              onClick={() => onSelect(c)}
              className="w-full text-left p-2 border border-neutral-900 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: OP_COLORS[c.$lineage?.operation] || '#525252' }} />
                <span className="font-mono text-[10px] text-neutral-400 truncate">{c.$name}</span>
                <span className="font-mono text-[8px] text-neutral-700 ml-auto">{c.$lineage?.operation}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
