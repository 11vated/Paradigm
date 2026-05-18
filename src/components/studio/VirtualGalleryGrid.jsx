/**
 * Virtualized Gallery Grid — handles 10k+ seeds at 60fps
 *
 * Custom virtual scrolling implementation (no external dependencies).
 * Only renders visible items + small buffer.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const ROW_HEIGHT = 180;
const COL_GAP = 12;
const ROW_GAP = 12;
const BUFFER_ROWS = 3;

export function VirtualGalleryGrid({ seeds, onSelect, onGrow, onEvolve, columns = 4 }) {
  const containerRef = useRef(null);
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
}

function SeedCard({ seed, onClick, onGrow, onEvolve }) {
  const fitness = seed.$fitness?.overall || 0;
  const domain = seed.$domain || 'unknown';
  const name = seed.$name || 'Unnamed';
  const generation = seed.$lineage?.generation || 0;

  const domainColors = {
    character: '#e74c3c', music: '#9b59b6', sprite: '#2ecc71',
    visual2d: '#3498db', geometry3d: '#e67e22', fullgame: '#1abc9c',
    animation: '#f39c12', narrative: '#8e44ad', physics: '#2980b9',
    audio: '#c0392b', shader: '#16a085', particle: '#d35400',
  };

  const color = domainColors[domain] || '#7f8c8d';

  return (
    <div
      onClick={onClick}
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
        {name}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        <div style={{ flex: 1, height: 4, background: '#333', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${fitness * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 10, color: '#888', minWidth: 30 }}>{(fitness * 100).toFixed(0)}%</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        <button onClick={(e) => { e.stopPropagation(); onGrow?.(); }} style={btnStyle}>Grow</button>
        <button onClick={(e) => { e.stopPropagation(); onEvolve?.(); }} style={btnStyle}>Evolve</button>
      </div>
    </div>
  );
}

const btnStyle = {
  flex: 1, padding: '3px 8px', fontSize: 10, background: '#333', color: '#fff',
  border: 'none', borderRadius: 4, cursor: 'pointer', transition: 'background 0.15s',
};
