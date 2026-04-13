import { useState, useEffect } from 'react';
import { Library, Download, Loader2, Sparkles } from 'lucide-react';
import { api, getSimilarSeeds } from '@/services/api';
import { DOMAIN_COLORS } from '@/lib/constants';

export default function SeedLibrary({ onImport, activeSeed }) {
  const [library, setLibrary] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [importing, setImporting] = useState(null);
  const [similarSeeds, setSimilarSeeds] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);

  useEffect(() => {
    api.get('/library').then(r => setLibrary(r.data)).catch(() => {});
  }, []);

  const handleImport = async (seed) => {
    setImporting(seed.$name);
    try {
      const res = await api.post('/library/import', { seed_hash: seed.$hash });
      if (res.data) onImport(res.data);
    } catch (e) { console.error(e); }
    setImporting(null);
  };

  const handleFindSimilar = async () => {
    if (!activeSeed) return;
    setIsSearching(true);
    setShowSimilar(true);
    try {
      const results = await getSimilarSeeds(activeSeed.id, 10);
      setSimilarSeeds(results);
    } catch (e) {
      console.error("Failed to find similar seeds:", e);
    }
    setIsSearching(false);
  };

  if (!library || !Array.isArray(library.seeds)) {
    return (
      <div className="flex items-center justify-center h-48" data-testid="seed-library-loading">
        <Loader2 className="w-4 h-4 text-neutral-600 animate-spin" />
      </div>
    );
  }

  const seedsToDisplay = showSimilar ? similarSeeds : (selectedDomain === 'all' ? library.seeds : library.seeds.filter(s => s.$domain === selectedDomain));
  const domains = [...new Set(library.seeds.map(s => s.$domain))].sort();

  return (
    <div className="p-3 space-y-3" data-testid="seed-library">
      <div className="flex items-center gap-2">
        <Library className="w-3 h-3 text-yellow-500" />
        <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Seed Commons</span>
        <span className="font-mono text-[9px] text-neutral-700 ml-auto">{library.stats?.total_seeds || 0} seeds</span>
      </div>

      <div className="flex flex-wrap gap-1">
        <button onClick={() => { setSelectedDomain('all'); setShowSimilar(false); }}
          className={`px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider border transition-colors ${!showSimilar && selectedDomain === 'all' ? 'border-orange-500 text-orange-500' : 'border-neutral-800 text-neutral-600 hover:border-neutral-700'}`}
          data-testid="library-filter-all">
          All
        </button>
        {domains.map(d => (
          <button key={d} onClick={() => { setSelectedDomain(d); setShowSimilar(false); }}
            className={`px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider border transition-colors ${!showSimilar && selectedDomain === d ? 'border-orange-500 text-orange-500' : 'border-neutral-800 text-neutral-600 hover:border-neutral-700'}`}
            data-testid={`library-filter-${d}`}>
            {d}
          </button>
        ))}
        
        {activeSeed && (
          <button onClick={handleFindSimilar}
            className={`ml-auto px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider border transition-colors flex items-center gap-1 ${showSimilar ? 'border-cyan-500 text-cyan-500 bg-cyan-500/10' : 'border-neutral-800 text-neutral-400 hover:border-cyan-500 hover:text-cyan-500'}`}
            data-testid="library-find-similar">
            <Sparkles className="w-2.5 h-2.5" />
            Find Similar
          </button>
        )}
      </div>

      <div className="space-y-px max-h-[400px] overflow-y-auto">
        {isSearching ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
          </div>
        ) : seedsToDisplay.length === 0 ? (
          <div className="text-center py-8 font-mono text-[10px] text-neutral-600">
            {showSimilar ? "No similar seeds found. Try generating an embedding for the active seed." : "No seeds found in this domain."}
          </div>
        ) : (
          seedsToDisplay.map((seed, i) => {
            const color = DOMAIN_COLORS[seed.$domain] || '#525252';
            return (
              <div key={i} className="flex items-center gap-2 p-2 bg-black/20 hover:bg-black/40 transition-colors group" data-testid={`library-seed-${i}`}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="font-heading text-[11px] text-neutral-300 truncate">{seed.$name}</div>
                  <div className="font-mono text-[8px] text-neutral-600">
                    {seed.$domain} / {Object.keys(seed.genes || {}).length} genes
                    {seed._similarityScore !== undefined && (
                      <span className="ml-2 text-cyan-500/80">
                        Match: {(seed._similarityScore * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleImport(seed)} disabled={importing === seed.$name}
                  className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-orange-500 text-black font-bold text-[8px] uppercase tracking-wider hover:bg-orange-400 transition-all flex items-center gap-1"
                  data-testid={`library-import-${i}`}>
                  {importing === seed.$name ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Download className="w-2.5 h-2.5" />}
                  Import
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
