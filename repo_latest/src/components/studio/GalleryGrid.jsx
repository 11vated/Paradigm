// Removed unused Dna import
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
                <span className="font-mono text-[9px] text-[#666] uppercase tracking-widest">{seed.$domain}</span>
              </div>
              <span className="font-mono text-[9px] text-[#444]">G{seed.$lineage?.generation || 0}</span>
            </div>
            
            <div className="font-mono text-[11px] text-[#d4d4d4] truncate mb-3 w-full">
              {seed.$name || 'Untitled'}
            </div>
            
            <div className="flex items-center gap-2 w-full">
              <span className="font-mono text-[8px] text-[#555]">FIT</span>
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
}
