import { DOMAIN_COLORS } from '@/lib/constants';

export default function GalleryGrid({ seeds, onSelect, selectedId }) {
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
    <div className="grid grid-cols-2 gap-px bg-neutral-900 p-px" data-testid="gallery-grid">
      {seeds.map((seed) => {
        const isSelected = seed.id === selectedId;
        const color = DOMAIN_COLORS[seed.$domain] || '#525252';
        const fitness = seed.$fitness?.overall || 0;
        return (
          <button
            key={seed.id}
            data-testid={`gallery-seed-${seed.id}`}
            onClick={() => onSelect(seed)}
            className={`bg-[#0a0a0a] p-3 text-left transition-all hover:bg-[#111] ${isSelected ? 'ring-1 ring-orange-500/50' : ''}`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="font-mono text-[8px] text-neutral-600 uppercase">{seed.$domain}</span>
            </div>
            <div className="font-heading text-[11px] text-neutral-300 truncate mb-1">
              {seed.$name || 'Untitled'}
            </div>
            <div className="fitness-bar mb-1">
              <div className="fitness-fill" style={{ width: `${fitness * 100}%` }} />
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[8px] text-neutral-700">G{seed.$lineage?.generation || 0}</span>
              <span className="font-mono text-[8px] text-neutral-700">{(fitness * 100).toFixed(0)}%</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
