
// TODO(typing-sprint): Legacy studio component (/classic/* routes). AGENTS.md sanctions this debt pending the Typing Sprint that converts these JSX-style files to fully typed TSX.
// Removed unused Dna import
import React from 'react';
import { DOMAIN_COLORS } from '@/lib/constants';
import { deriveCleanTitle } from '@/lib/kernel/types';
import { calculateStratumConformance } from '@/lib/kernel/quality/predicates';

const GalleryGrid = React.memo(function GalleryGrid({ seeds, onSelect, selectedId }: { seeds: any; onSelect: any; selectedId: any }) {
  if (!Array.isArray(seeds) || seeds.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 p-4" data-testid="gallery-empty">
        <p className="font-mono text-[10px] text-neutral-600 text-center">
          Gallery empty. Generate seeds to populate.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-testid="gallery-grid">
      {seeds.map((seed) => {
        const isSelected = seed.id === selectedId;
        const color = DOMAIN_COLORS[seed.$domain] || '#525252';
        const fitness = seed.$fitness?.overall || 0;
        return (
          <button
            key={seed.id}
            data-testid={`gallery-seed-${seed.id}`}
            onClick={() => onSelect(seed)}
            className={`flex flex-col text-left transition-all p-3 border rounded-sm ${
              isSelected 
                ? 'bg-[#0a0a0a] border-primary/50' 
                : 'bg-[#080808] border-[#1a1a1a] hover:border-[#333]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                <span className="font-mono text-[9px] text-[#999] uppercase tracking-widest">{seed.$domain}</span>
              </div>
              <span className="font-mono text-[9px] text-[#888]">G{seed.$lineage?.generation || 0}</span>
            </div>
            
            <div className="font-mono text-[11px] text-[#d4d4d4] truncate mb-3 w-full">
              {deriveCleanTitle(seed.$name || 'Untitled', seed.$hash)}
            </div>
            {/* Thumbs/status + strata for 100% library items */}
            {(() => {
              try {
                const raw = seed.raw || seed; const sc = raw.strataCompliance || (raw.strata && raw.strata.overall);
                const pct = typeof sc==='number' ? Math.round(sc*100) : Math.round(calculateStratumConformance([raw]).overall * 100);
                const hasStructured = !!(raw?.visual?.type === 'structured' || raw?.structuredData || raw?.summary || raw?.visual?.summary);
                const t = raw.svg ? '🖼' : raw.audioDataURL ? '♫' : raw.gltf ? '⬢' : raw.storyData ? '📖' : raw.previewData ? '</>' : hasStructured ? '📊' : '';
                const richSummary = raw.summary || raw.visual?.summary;
                const richMetrics = raw.metrics || raw.visual?.metrics;
                return (
                  <div style={{fontSize:9, color:'#888', marginBottom:2}}>
                    {t} strata {pct}% · gen{seed.$lineage?.generation||0}
                    {richSummary && <div style={{fontSize:8, color:'#aaa', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={richSummary}>{richSummary.slice(0,55)}</div>}
                    {richMetrics && <div style={{fontSize:7, color:'#666'}}>{Object.keys(richMetrics).slice(0,2).map(k => `${k}:${(richMetrics as any)[k]}`).join(' ')}</div>}
                    {(raw.gsplSource || raw.canonicalGspl) && (
                      <span style={{fontSize:7, color:'#0a0'}} title="GSPL orchestration source present (load via editor)">
                        GSPL
                        <button onClick={(e) => { e.stopPropagation(); const store = (window as any).useSeedStore?.getState?.(); if (store?.setGsplDraft) store.setGsplDraft(raw.gsplSource || raw.canonicalGspl); if (store?.loadArtifactToGsplDraft) store.loadArtifactToGsplDraft(raw); }} className="ml-1 underline text-[6px]">load</button>
                      </span>
                    )}
                  </div>
                );
              } catch { return null; }
            })()}
            
            <div className="flex items-center gap-2 w-full">
              <span className="font-mono text-[8px] text-[#888]">FIT</span>
              <div className="flex-1 h-[2px] bg-[#222] rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${fitness * 100}%` }} />
              </div>
              <span className="font-mono text-[8px] text-primary">{(fitness * 100).toFixed(0)}%</span>
            </div>
          </button>
        );
      })}
    </div>
  );
})

export default GalleryGrid;
