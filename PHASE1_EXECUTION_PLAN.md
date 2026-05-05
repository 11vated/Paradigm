# PHASE 1 EXECUTION PLAN — Data Flow Integration

**Goal:** Connect backend APIs (server.ts) to frontend (React Studio) so real seeds, real genes, and real artifacts replace all mock data.

---

## TASK 1: Audit Current Mock Data Locations

### Files to inspect:
- `src/stores/seedStore.jsx` — Currently holds static state
- `src/components/studio/GalleryGrid.jsx` — Displays seed cards
- `src/components/studio/GeneEditor.jsx` — Edits gene values
- `src/components/studio/PreviewViewport.jsx` — Renders artifact
- `src/pages/StudioPage.jsx` — Main page orchestration

### Current Mock Patterns Found:
```jsx
// GalleryGrid.jsx (line ~25-40): Static array mapping
const mockSeeds = [{ id: '1', name: 'Algorithm...', fitness: 1.0 }, ...]

// GeneEditor.jsx: Hardcoded gene choices
const ARCHETYPE_CHOICES = ['warrior', 'mage', ...]

// PreviewViewport.jsx: Static fallback rendering
if (!artifact) return <FallbackMesh />
```

---

## TASK 2: Upgrade seedStore.jsx to Async Store

**Current state:** Synchronous Zustand store with local state only.

**Target state:** Async actions hitting `/api/seeds` endpoints.

### Implementation:

```javascript
// src/stores/seedStore.jsx (upgraded)
import { create } from 'zustand';

export const useSeedStore = create((set, get) => ({
  seeds: [],
  currentSeed: null,
  artifact: null,
  loading: false,
  error: null,

  // Fetch seeds with pagination + domain filter
  fetchSeeds: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', params.page);
      if (params.domain) query.set('domain', params.domain);
      if (params.sort) query.set('sort', params.sort);

      const res = await fetch(`/api/seeds?${query}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      set({ seeds: data.seeds, loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Fetch single seed
  fetchSeed: async (id) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/seeds/${id}`);
      const seed = await res.json();
      set({ currentSeed: seed, loading: false });
      return seed;
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Create seed via API
  createSeed: async (domain, genes) => {
    const res = await fetch('/api/seeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, genes })
    });
    const newSeed = await res.json();
    set(state => ({ seeds: [...state.seeds, newSeed] }));
    return newSeed;
  },

  // Mutate seed via API
  mutateSeed: async (id, rate = 0.1) => {
    const res = await fetch(`/api/seeds/${id}/mutate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate })
    });
    const mutated = await res.json();
    set(state => ({
      seeds: [...state.seeds, mutated],
      currentSeed: mutated
    }));
    return mutated;
  },

  // Breed seeds via API
  breedSeeds: async (parentAId, parentBId) => {
    const res = await fetch('/api/seeds/breed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_a_id: parentAId, parent_b_id: parentBId })
    });
    const child = await res.json();
    set(state => ({ seeds: [...state.seeds, child], currentSeed: child }));
    return child;
  },

  // Grow artifact via API
  growArtifact: async (seedId) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/seeds/${seedId}/grow`, { method: 'POST' });
      const artifact = await res.json();
      set({ artifact, loading: false });
      return artifact;
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Evolve population via API
  evolveSeeds: async (seedId, generations = 10, populationSize = 10) => {
    const res = await fetch(`/api/seeds/${seedId}/evolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generations, population_size: populationSize })
    });
    const result = await res.json();
    set(state => ({ seeds: [...state.seeds, ...result.population] }));
    return result;
  },

  // Clear state
  clearCurrent: () => set({ currentSeed: null, artifact: null }),
}));
```

---

## TASK 3: Wire GalleryGrid.jsx to Real Seeds

**Current:** Displays hardcoded seed cards with mocked fitness.

**Target:** Live data from `useSeedStore.fetchSeeds()`.

### Changes:
```jsx
// src/components/studio/GalleryGrid.jsx
import { useSeedStore } from '../../stores/seedStore';

export function GalleryGrid() {
  const { seeds, fetchSeeds, loading, error } = useSeedStore();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchSeeds({ domain: filter === 'all' ? undefined : filter });
  }, [filter]);

  if (loading) return <SkeletonGrid />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="gallery-grid">
      {seeds.map(seed => (
        <SeedCard
          key={seed.id}
          seed={seed}
          fitness={seed.$fitness?.overall}
          domain={seed.$domain}
          onClick={() => setCurrentSeed(seed)}
        />
      ))}
    </div>
  );
}
```

---

## TASK 4: Wire GeneEditor.jsx to Real Gene Values

**Current:** Widgets with hardcoded options, no actual seed binding.

**Target:** Read/write genes from `currentSeed.genes`.

### Changes:
```jsx
// src/components/studio/GeneEditor.jsx
export function GeneEditor() {
  const { currentSeed, mutateSeed } = useSeedStore();
  const [localGenes, setLocalGenes] = useState({});

  useEffect(() => {
    if (currentSeed?.genes) {
      setLocalGenes(currentSeed.genes);
    }
  }, [currentSeed]);

  const handleGeneChange = (geneName, newValue) => {
    if (!currentSeed) return;
    // Call API or local update
    setLocalGenes(prev => ({ ...prev, [geneName]: newValue }));
  };

  if (!currentSeed) return <EmptyState message="Select a seed to edit genes" />;

  return (
    <div className="gene-editor">
      {Object.entries(localGenes).map(([name, gene]) => (
        <GeneWidget
          key={name}
          name={name}
          type={gene.type}
          value={gene.value}
          onChange={(v) => handleGeneChange(name, v)}
        />
      ))}
    </div>
  );
}
```

---

## TASK 5: Wire PreviewViewport.jsx to Real Artifact Growth

**Current:** Shows fallback meshes/sprites, no real grow call.

**Target:** Call `growArtifact(seedId)` and render actual artifact.

### Changes:
```jsx
// src/components/studio/PreviewViewport.jsx
export function PreviewViewport() {
  const { currentSeed, artifact, growArtifact, loading } = useSeedStore();
  const [mode, setMode] = useState('3d');

  useEffect(() => {
    if (currentSeed && !artifact) {
      growArtifact(currentSeed.id);
    }
  }, [currentSeed]);

  if (loading) return <Spinner />;
  if (!artifact) return <EmptyState message="No artifact to preview" />;

  const { type, visual, stats } = artifact;

  return (
    <div className="preview-viewport">
      {mode === '3d' && <ThreeViewport artifact={artifact} />}
      {mode === '2d' && <Canvas2DViewport artifact={artifact} />}
      {mode === 'audio' && <AudioPreview artifact={artifact} />}
      <ArtifactMetadata artifact={artifact} />
    </div>
  );
}
```

---

## TASK 6: Test the Full Flow

### Steps:
1. Start server: `npm run dev` (runs `tsx server.ts`)
2. Open browser to `https://localhost:5173`
3. Verify:
   - [ ] Gallery loads real seeds from `GET /api/seeds`
   - [ ] Click seed → shows in PreviewViewport
   - [ ] Click "Mutate" → calls `POST /api/seeds/:id/mutate`
   - [ ] Click "Breed" → calls `POST /api/seeds/breed`
   - [ ] GeneEditor shows actual gene values from seed
   - [ ] PreviewViewport calls `POST /api/seeds/:id/grow`

### Expected API Calls:
```
GET  /api/seeds?page=1&limit=50
GET  /api/seeds/:id
POST /api/seeds/:id/mutate  { rate: 0.1 }
POST /api/seeds/breed       { parent_a_id, parent_b_id }
POST /api/seeds/:id/grow
```

---

## TASK 7: Handle SSE Live Updates (server.ts already has it)

**Current:** `StudioPage.jsx` has SSE setup but may not be processing events.

### Add to StudioPage.jsx:
```jsx
useEffect(() => {
  const evtSource = new EventSource('/api/seeds/live');

  evtSource.onmessage = (event) => {
    const update = JSON.parse(event.data);
    if (update.type === 'seed_created' || update.type === 'seed_updated') {
      useSeedStore.getState().fetchSeeds(); // Refresh list
    }
  };

  return () => evtSource.close();
}, []);
```

---

## SUCCESS CRITERIA FOR PHASE 1

| Criterion | Target | Check |
|-----------|--------|-------|
| Gallery loads from API | < 1s | [ ] |
| Seed detail view works | Click → preview | [ ] |
| Mutate creates new seed | API call → new card | [ ] |
| Breed creates new seed | API call → child card | [ ] |
| Gene editing works | Widget → API call | [ ] |
| Artifact preview works | Grow API → render | [ ] |
| SSE updates flow | New seed → gallery | [ ] |
| Error handling | Toast on failure | [ ] |
