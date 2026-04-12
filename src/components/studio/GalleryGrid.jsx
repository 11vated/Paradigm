// Removed unused Dna import

const DOMAIN_COLORS = {
  character: '#F97316', sprite: '#10B981', music: '#8B5CF6', visual2d: '#06B6D4',
  procedural: '#EC4899', narrative: '#F59E0B', audio: '#EF4444', fullgame: '#14B8A6',
  animation: '#A855F7', geometry3d: '#22D3EE', physics: '#F43F5E', ecosystem: '#2DD4BF',
  game: '#FB923C', alife: '#818CF8', shader: '#D946EF', particle: '#D946EF',
  architecture: '#A855F7', vehicle: '#22D3EE', food: '#FB923C', choreography: '#E879F9',
  ui: '#FBBF24', typography: '#94A3B8', furniture: '#78716C', fashion: '#F472B6',
  robotics: '#6366F1', circuit: '#4ADE80', algorithm: '#10B981', building: '#A855F7',
  camera: '#06B6D4', creature: '#F97316', 'cross-domain': '#F59E0B', fluid: '#22D3EE',
  framework: '#8B5CF6', fx: '#D946EF', lighting: '#FBBF24', materials: '#EC4899',
  plant: '#10B981', scene: '#14B8A6', style: '#F472B6', weather: '#2DD4BF'
};

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
