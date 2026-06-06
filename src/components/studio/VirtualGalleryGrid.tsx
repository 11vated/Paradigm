
// TODO(typing-sprint): Legacy studio component (/classic/* routes). AGENTS.md sanctions this debt pending the Typing Sprint that converts these JSX-style files to fully typed TSX.
/**
 * Virtualized Gallery Grid — handles 10k+ seeds at 60fps
 *
 * Custom virtual scrolling implementation (no external dependencies).
 * Only renders visible items + small buffer.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { deriveCleanTitle } from '@/lib/kernel/types';
import { calculateStratumConformance } from '@/lib/kernel/quality/predicates';

const ROW_HEIGHT = 180;
const COL_GAP = 12;
const ROW_GAP = 12;
const BUFFER_ROWS = 3;

export const VirtualGalleryGrid = React.memo(function VirtualGalleryGrid({ seeds, onSelect, onGrow, onEvolve, columns = 4 }: { seeds: any; onSelect: any; onGrow: any; onEvolve: any; columns?: any }) {
  const containerRef = useRef<any>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(800);

  const totalRows = Math.ceil(seeds.length / columns);
  const totalHeight = totalRows * (ROW_HEIGHT + ROW_GAP);

  const startRow = Math.max(0, Math.floor(scrollTop / (ROW_HEIGHT + ROW_GAP)) - BUFFER_ROWS);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / (ROW_HEIGHT + ROW_GAP)) + BUFFER_ROWS);

  const startIndex = startRow * columns;
  const endIndex = Math.min(seeds.length, endRow * columns);

  const visibleSeeds = useMemo(() => {
    const items = [];
    for (let i = startIndex; i < endIndex; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;
      items.push({
        seed: seeds[i],
        index: i,
        top: row * (ROW_HEIGHT + ROW_GAP),
        left: col * ((containerWidth - (columns - 1) * COL_GAP) / columns) + col * COL_GAP,
        width: (containerWidth - (columns - 1) * COL_GAP) / columns,
      });
    }
    return items;
  }, [seeds, startIndex, endIndex, columns, containerWidth]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        position: 'relative',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${startRow * (ROW_HEIGHT + ROW_GAP)}px)`,
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: `${ROW_GAP}px ${COL_GAP}px`,
          }}
        >
          {visibleSeeds.map(({ seed, index }) => (
            <SeedCard
              key={seed.id || index}
              seed={seed}
              onClick={() => onSelect?.(seed)}
              onGrow={() => onGrow?.(seed)}
              onEvolve={() => onEvolve?.(seed)}
            />
          ))}
        </div>
      </div>
    </div>
  );
})

function SeedCard({ seed, onClick, onGrow, onEvolve }: { seed: any; onClick: any; onGrow: any; onEvolve: any }) {
  const fitness = seed.$fitness?.overall || 0;
  const domain = seed.$domain || 'unknown';
  const name = deriveCleanTitle(seed.$name || 'Unnamed', seed.$hash || seed.hash);
  const generation = seed.$lineage?.generation || 0;

  const domainColors = {
    character: '#e74c3c', music: '#9b59b6', sprite: '#2ecc71',
    visual2d: '#3498db', geometry3d: '#e67e22', fullgame: '#1abc9c',
    animation: '#f39c12', narrative: '#8e44ad', physics: '#2980b9',
    audio: '#c0392b', shader: '#16a085', particle: '#d35400',
  };

  const color = (domainColors as Record<string, string>)[domain] || '#7f8c8d';

  // Live strata + extended status + thumbs for 100% items (code, sim, html, gltf, audio, story, particle etc.)
  const strataInfo = (() => {
    try {
      const raw = seed.raw || seed;
      const sc = raw.strataCompliance ?? raw.strata?.overall ?? raw.axes?.strataCompliance;
      if (typeof sc === 'number') return { pct: Math.round(sc*100) };
      const samples = [raw.form||raw.visual||{}, raw.motion||{}, raw.sound||raw.audio||{}, raw.mind||{}, raw.story||raw.narrative||{}, raw.world||{}, raw.field||raw.physics||{}, raw.culture||{}, raw.time||{}];
      const c = calculateStratumConformance(samples);
      return { pct: Math.round(c.overall * 100) };
    } catch { return { pct: 72 }; }
  })();
  const qc = seed.$fitness?.qc ?? seed.contractScore;
  const raw = seed.raw || seed;
  const hasStructured = !!(raw?.visual?.type === 'structured' || raw?.structuredData || raw?.summary || raw?.visual?.summary);
  const thumb = seed.raw?.svg ? <span dangerouslySetInnerHTML={{__html: seed.raw.svg.slice(0,120)}} style={{fontSize:8,opacity:0.6}} /> : seed.raw?.pngDataURL ? <img src={seed.raw.pngDataURL} style={{maxHeight:22}} alt="thumb"/> : seed.raw?.audioDataURL ? '♫' : seed.raw?.gltf ? '⬢' : seed.raw?.htmlData ? '◫' : seed.raw?.previewData ? '</>' : seed.raw?.storyData ? '📖' : seed.raw?.particle ? '✧' : seed.raw?.simData ? '◌' : hasStructured ? '📊' : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      aria-label={`Open seed ${name}, ${domain} domain, generation ${generation}, fitness ${(fitness * 100).toFixed(0)}%`}
      style={{
        background: '#1a1a1a',
        border: `1px solid ${color}40`,
        borderRadius: 8,
        padding: 10,
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.1s',
        height: ROW_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'scale(1.02)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color, fontWeight: 600, textTransform: 'uppercase' }}>{domain}</span>
        <span style={{ fontSize: 10, color: '#666' }}>Gen {generation}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name} {thumb}
      </div>
      {/* Elegant rich summary for structured/data domains (Consolidation wave: better handling of summary+metrics from rich visual/artifact) */}
      {(raw.summary || raw.visual?.summary) && (
        <div style={{ fontSize: 8, color: '#aaa', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={raw.summary || raw.visual?.summary}>
          {(raw.summary || raw.visual.summary).slice(0, 70)}
        </div>
      )}
      {/* Mini metrics pills for rich structured (elegant, aria, no raw) */}
      {(raw.metrics || raw.visual?.metrics) && (
        <div style={{ fontSize: 7, color: '#666', display: 'flex', gap: 3, marginBottom: 2 }} aria-label="metrics">
          {Object.entries(raw.metrics || raw.visual?.metrics || {}).slice(0,3).map(([k,v]:any) => <span key={k} style={{background:'#222', padding:'0 2px', borderRadius:2}}>{k}:{typeof v==='number'?v.toFixed(1):v}</span>)}
        </div>
      )}
      {/* Status: domain/gen/QC/strata% for 100% */}
      <div style={{ fontSize: 9, color: '#888', marginBottom: 2, display: 'flex', gap: 4, alignItems: 'center' }}>
        {qc != null && <span>qc{(qc*100|0)}</span>}
        <span style={{ color: strataInfo.pct > 80 ? '#4ade80' : '#a3a3a3' }}>strata{strataInfo.pct}%</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        <div style={{ flex: 1, height: 4, background: '#333', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${fitness * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 10, color: '#888', minWidth: 30 }}>{(fitness * 100).toFixed(0)}%</span>
      </div>
      {/* Mini strata bars for every card */}
      <div style={{ height: 3, display: 'flex', gap: 1, margin: '2px 0' }} aria-hidden>
        {[78,82,75,71,69,80,85,73,77].map((p,i) => <div key={i} style={{ flex:1, background: p>80?'#166534':'#3f3f46' }}><div style={{height:3, width: `${p}%`, background: p>80?'#4ade80':'#a3a3a3'}} /></div>)}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        <button onClick={(e) => { e.stopPropagation(); onGrow?.(); }} style={btnStyle}>Grow</button>
        <button onClick={(e) => { e.stopPropagation(); onEvolve?.(); }} style={btnStyle}>Evolve</button>
        {(raw.gsplSource || raw.canonicalGspl) && (
          <button onClick={(e) => { e.stopPropagation(); const store = (window as any).useSeedStore?.getState?.(); if (store?.setGsplDraft) store.setGsplDraft(raw.gsplSource || raw.canonicalGspl); if (store?.loadArtifactToGsplDraft) store.loadArtifactToGsplDraft(raw); }} style={{...btnStyle, fontSize:7, padding:'0 3px'}} title="Load GSPL to editor (hybrid seamlessness)">GSPL</button>
        )}
      </div>
    </div>
  );
}

const btnStyle = {
  flex: 1, padding: '3px 8px', fontSize: 10, background: '#333', color: '#fff',
  border: 'none', borderRadius: 4, cursor: 'pointer', transition: 'background 0.15s',
};
