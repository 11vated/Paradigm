# PARADIGM ABSOLUTE — TIER 1 DOMAIN IMPLEMENTATION GUIDE

**Weeks 5-8: Complete All 6 Tier 1 Domains**  
**Status:** EXECUTING

---

## WEEK 5: SPRITE DOMAIN

**Target:** 512×512 animated sprite sheets, ΔE<3.0, PNG+JSON

### Implementation Structure

```typescript
// src/lib/kernel/generators/sprite-v3.ts

interface SpriteParams {
  resolution: number;        // 64-512px
  paletteSize: number;       // 4-256 colors
  colors: [number, number, number][];
  symmetry: 'bilateral' | 'radial' | 'asymmetric';
  animationFrames: number;   // 8-64
  animationType: 'walk' | 'idle' | 'attack' | 'custom';
  style: 'pixel' | 'antialiased';
}

export async function generateSpriteV3(
  seed: Seed,
  outputPath: string
): Promise<{
  filePath: string;
  frames: number;
  resolution: number;
  paletteSize: number;
  atlas: string;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'default');
  const params = extractSpriteParams(seed, rng);
  
  // Generate base sprite frame
  const frames: HTMLCanvasElement[] = [];
  for (let i = 0; i < params.animationFrames; i++) {
    const frame = await generateSpriteFrame(params, i, rng);
    frames.push(frame);
  }
  
  // Pack into sprite sheet
  const atlas = packSpriteSheet(frames);
  
  // Export PNG+JSON
  const pngPath = await exportPNG(atlas, outputPath);
  const jsonPath = await exportAtlasData(params, frames, outputPath);
  
  return {
    filePath: pngPath,
    frames: params.animationFrames,
    resolution: params.resolution,
    paletteSize: params.paletteSize,
    atlas: jsonPath
  };
}

function generateSpriteFrame(
  params: SpriteParams,
  frameIndex: number,
  rng: Xoshiro256StarStar
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = params.resolution;
  canvas.height = params.resolution;
  const ctx = canvas.getContext('2d')!;
  
  // Apply symmetry
  if (params.symmetry === 'bilateral') {
    generateSymmetricSprite(ctx, params, frameIndex, rng);
  } else if (params.symmetry === 'radial') {
    generateRadialSprite(ctx, params, frameIndex, rng);
  } else {
    generateAsymmetricSprite(ctx, params, frameIndex, rng);
  }
  
  // Reduce palette
  reducePalette(ctx, params.paletteSize, params.colors, rng);
  
  return canvas;
}

function packSpriteSheet(frames: HTMLCanvasElement[]): HTMLCanvasElement {
  // Simple grid packing
  const frameSize = frames[0].width;
  const cols = Math.ceil(Math.sqrt(frames.length));
  const rows = Math.ceil(frames.length / cols);
  
  const atlas = document.createElement('canvas');
  atlas.width = cols * frameSize;
  atlas.height = rows * frameSize;
  const ctx = atlas.getContext('2d')!;
  
  frames.forEach((frame, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    ctx.drawImage(frame, col * frameSize, row * frameSize);
  });
  
  return atlas;
}

function extractSpriteParams(seed: Seed, rng: Xoshiro256StarStar): SpriteParams {
  return {
    resolution: 64 + Math.floor((seed.genes?.resolution?.value || 0.5) * 448), // 64-512
    paletteSize: 4 + Math.floor((seed.genes?.paletteSize?.value || 0.5) * 252), // 4-256
    colors: seed.genes?.colors?.value || [],
    symmetry: (seed.genes?.symmetry?.value || 'bilateral') as SpriteParams['symmetry'],
    animationFrames: 8 + Math.floor((seed.genes?.animationFrames?.value || 0.5) * 56), // 8-64
    animationType: (seed.genes?.animationType?.value || 'walk') as SpriteParams['animationType'],
    style: (seed.genes?.style?.value || 'pixel') as SpriteParams['style']
  };
}
```

**Lines:** ~400  
**Quality Target:** 100% (complete implementation)

---

## WEEK 6: MUSIC DOMAIN

**Target:** 44.1kHz WAV, 5 stems, MIDI, ±1 cent tuning

### Implementation Structure

```typescript
// src/lib/kernel/generators/music-v3.ts

interface MusicParams {
  tempo: number;           // 60-200 BPM
  key: string;             // 'C', 'G', 'D', etc.
  scale: string;           // 'major', 'minor', 'dorian', etc.
  timeSignature: string;   // '4/4', '3/4', '5/4'
  duration: number;        // seconds (30-300)
  instruments: string[];   // ['piano', 'strings', 'drums', etc.]
  genre: string;           // 'classical', 'jazz', 'electronic', etc.
  mood: string;            // 'uplifting', 'melancholy', etc.
}

interface Note {
  pitch: number;           // MIDI note (0-127)
  start: number;           // beats
  duration: number;        // beats
  velocity: number;        // 0-127
  instrument: string;
}

export async function generateMusicV3(
  seed: Seed,
  outputPath: string
): Promise<{
  wavPath: string;
  midiPath: string;
  stems: string[];
  duration: number;
  tempo: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'default');
  const params = extractMusicParams(seed, rng);
  
  // Generate composition
  const notes: Note[] = composeMusic(params, rng);
  
  // Synthesize audio (WebAudio API)
  const audioContext = new AudioContext({ sampleRate: 44100 });
  const stems = await synthesizeStems(notes, params, audioContext, rng);
  
  // Mix to stereo
  const mixed = mixStems(stems);
  
  // Export WAV (44.1kHz, 24-bit)
  const wavPath = await exportWAV(mixed, outputPath, rng);
  
  // Export MIDI
  const midiPath = await exportMIDI(notes, params, outputPath);
  
  return {
    wavPath,
    midiPath,
    stems: stems.map(s => s.path),
    duration: params.duration,
    tempo: params.tempo
  };
}

function composeMusic(params: MusicParams, rng: Xoshiro256StarStar): Note[] {
  const notes: Note[] = [];
  const scale = getScaleNotes(params.key, params.scale);
  const beatsPerMeasure = getTimeSignatureBeats(params.timeSignature);
  const totalMeasures = Math.floor((params.duration / 60) * params.tempo / beatsPerMeasure);
  
  // Generate chord progression
  const progression = generateChordProgression(params, rng);
  
  // Generate melody
  for (let measure = 0; measure < totalMeasures; measure++) {
    const chord = progression[measure % progression.length];
    const melodyNotes = generateMelodyForChord(chord, scale, params, rng);
    notes.push(...melodyNotes);
    
    // Generate harmony
    const harmonyNotes = generateHarmonyForChord(chord, scale, params, rng);
    notes.push(...harmonyNotes);
    
    // Generate bass
    const bassNotes = generateBassForChord(chord, params, rng);
    notes.push(...bassNotes);
    
    // Generate drums (if genre has drums)
    if (params.instruments.includes('drums')) {
      const drumNotes = generateDrumsForMeasure(measure, params, rng);
      notes.push(...drumNotes);
    }
  }
  
  return notes;
}

function synthesizeStems(
  notes: Note[],
  params: MusicParams,
  audioContext: AudioContext,
  rng: Xoshiro256StarStar
): Promise<Stem[]> {
  const stems: Stem[] = [];
  
  // Group notes by instrument
  const byInstrument = groupBy(notes, 'instrument');
  
  for (const [instrument, instrumentNotes] of Object.entries(byInstrument)) {
    const stem = synthesizeInstrument(instrument, instrumentNotes, params, audioContext, rng);
    stems.push(stem);
  }
  
  return stems;
}

function extractMusicParams(seed: Seed, rng: Xoshiro256StarStar): MusicParams {
  const genres = ['classical', 'jazz', 'electronic', 'pop', 'soundtrack'];
  const keys = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb'];
  const scales = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian'];
  const timeSigs = ['4/4', '3/4', '5/4', '6/8', '7/8'];
  
  return {
    tempo: 60 + (seed.genes?.tempo?.value || 0.5) * 140, // 60-200
    key: seed.genes?.key?.value || keys[rng.nextInt(0, keys.length - 1)],
    scale: seed.genes?.scale?.value || scales[rng.nextInt(0, scales.length - 1)],
    timeSignature: seed.genes?.timeSignature?.value || timeSigs[rng.nextInt(0, timeSigs.length - 1)],
    duration: 30 + (seed.genes?.duration?.value || 0.5) * 270, // 30-300
    instruments: seed.genes?.instruments?.value || ['piano'],
    genre: seed.genes?.genre?.value || genres[rng.nextInt(0, genres.length - 1)],
    mood: seed.genes?.mood?.value || 'neutral'
  };
}
```

**Lines:** ~600  
**Quality Target:** 100%

---

## WEEK 7: VISUAL2D DOMAIN

**Target:** 4K PNG/SVG, SSIM>0.85, layer system

### Implementation Structure

```typescript
// src/lib/kernel/generators/visual2d-v3.ts

interface Visual2DParams {
  style: string;           // 'abstract', 'fractal', 'geometric', 'organic'
  complexity: number;      // 0.0-1.0
  palette: number[];       // [hue1, hue2, hue3, ...]
  composition: string;     // 'centered', 'rule-of-thirds', 'golden-ratio'
  layers: number;          // 3-20
  resolution: number;      // 512-4096
}

export async function generateVisual2DV3(
  seed: Seed,
  outputPath: string
): Promise<{
  pngPath: string;
  svgPath: string;
  resolution: number;
  layers: number;
  ssim: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'default');
  const params = extractVisual2DParams(seed, rng);
  
  // Generate artwork
  const canvas = await generateArtwork(params, rng);
  
  // Apply color grading (LUT)
  applyColorGrading(canvas, params.palette, rng);
  
  // Export PNG (4K)
  const pngPath = await exportPNG(canvas, outputPath);
  
  // Export SVG (vector version)
  const svgPath = await exportSVG(canvas, outputPath);
  
  // Calculate SSIM (quality metric)
  const ssim = calculateSSIM(canvas);
  
  return {
    pngPath,
    svgPath,
    resolution: params.resolution,
    layers: params.layers,
    ssim
  };
}

async function generateArtwork(
  params: Visual2DParams,
  rng: Xoshiro256StarStar
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = params.resolution;
  canvas.height = params.resolution;
  const ctx = canvas.getContext('2d')!;
  
  // Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Generate layers
  for (let i = 0; i < params.layers; i++) {
    ctx.save();
    
    if (params.style === 'fractal') {
      renderFractalLayer(ctx, params, i, rng);
    } else if (params.style === 'geometric') {
      renderGeometricLayer(ctx, params, i, rng);
    } else if (params.style === 'organic') {
      renderOrganicLayer(ctx, params, i, rng);
    } else {
      renderAbstractLayer(ctx, params, i, rng);
    }
    
    // Apply blend mode
    ctx.globalCompositeOperation = getBlendMode(i, params.layers);
    ctx.restore();
  }
  
  // Apply composition
  applyComposition(canvas, params.composition);
  
  return canvas;
}

function renderFractalLayer(
  ctx: CanvasRenderingContext2D,
  params: Visual2DParams,
  layerIndex: number,
  rng: Xoshiro256StarStar
) {
  const fractalTypes = ['mandelbrot', 'julia', 'burningship', 'tricorn'];
  const type = fractalTypes[rng.nextInt(0, fractalTypes.length - 1)];
  
  // Render fractal based on type
  // (implementation uses escape-time algorithm)
}

function extractVisual2DParams(seed: Seed, rng: Xoshiro256StarStar): Visual2DParams {
  const styles = ['abstract', 'fractal', 'geometric', 'organic'];
  const compositions = ['centered', 'rule-of-thirds', 'golden-ratio', 'asymmetric'];
  
  return {
    style: seed.genes?.style?.value || styles[rng.nextInt(0, styles.length - 1)],
    complexity: seed.genes?.complexity?.value || 0.5,
    palette: seed.genes?.palette?.value || [],
    composition: seed.genes?.composition?.value || compositions[rng.nextInt(0, compositions.length - 1)],
    layers: 3 + Math.floor((seed.genes?.layers?.value || 0.5) * 17), // 3-20
    resolution: 512 + Math.floor((seed.genes?.resolution?.value || 0.5) * 3584) // 512-4096
  };
}
```

**Lines:** ~500  
**Quality Target:** 100%

---

## WEEK 8: GEOMETRY3D + FULLGAME

### Geometry3D (500K tris, manifold, GLTF/OBJ/STL)

```typescript
// src/lib/kernel/generators/geometry3d-v3.ts

interface Geometry3DParams {
  primitive: string;       // 'sphere', 'box', 'torus', 'sdf'
  subdivisions: number;    // 1-10
  material: string;        // 'metal', 'plastic', 'wood', 'stone'
  scale: [number, number, number];
  manifold: boolean;       // must be watertight
}

export async function generateGeometry3DV3(
  seed: Seed,
  outputPath: string
): Promise<{
  gltfPath: string;
  objPath: string;
  vertices: number;
  faces: number;
  manifold: boolean;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'default');
  const params = extractGeometry3DParams(seed, rng);
  
  // Generate mesh
  const geometry = generateMesh(params, rng);
  
  // Ensure manifold (watertight)
  if (params.manifold) {
    ensureManifold(geometry);
  }
  
  // Generate UVs
  unwrapUVs(geometry, params);
  
  // Generate LOD chain
  const lod = generateLODChain(geometry, [500000, 200000, 80000, 20000]);
  
  // Export GLTF
  const gltfPath = await exportGLTF(lod, outputPath);
  
  // Export OBJ
  const objPath = await exportOBJ(geometry, outputPath);
  
  return {
    gltfPath,
    objPath,
    vertices: geometry.attributes.position.count,
    faces: geometry.index ? geometry.index.count / 3 : 0,
    manifold: isManifold(geometry)
  };
}
```

**Lines:** ~400

---

### FullGame (Playable HTML5, <3s load, 60fps)

```typescript
// src/lib/kernel/generators/fullgame-v3.ts

interface FullGameParams {
  genre: string;           // 'action', 'rpg', 'puzzle', 'platformer'
  difficulty: number;      // 0.0-1.0
  levels: number;          // 3-20
  mechanics: string[];     // ['combat', 'exploration', 'puzzle']
  tileResolution: number;  // 32-256
}

export async function generateFullGameV3(
  seed: Seed,
  outputPath: string
): Promise<{
  htmlPath: string;
  levels: number;
  fileSize: number;
  loadTime: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'default');
  const params = extractFullGameParams(seed, rng);
  
  // Generate game world
  const world = generateGameWorld(params, rng);
  
  // Generate entities
  const entities = generateEntities(params, rng);
  
  // Generate rules
  const rules = generateGameRules(params, rng);
  
  // Generate UI
  const ui = generateGameUI(params, rng);
  
  // Generate audio
  const audio = generateGameAudio(params, rng);
  
  // Package as single HTML
  const html = packageGame(world, entities, rules, ui, audio, params);
  
  // Export
  const htmlPath = await exportHTML(html, outputPath);
  const fileSize = html.length;
  const loadTime = estimateLoadTime(fileSize);
  
  return {
    htmlPath,
    levels: params.levels,
    fileSize,
    loadTime
  };
}
```

**Lines:** ~500

---

## CUMULATIVE LINES

| Week | Domain | Lines | Status |
|---|---|---|---|
| 4 | Character | +400 | ✅ 80% |
| 5 | Sprite | +400 | ⏳ Next |
| 6 | Music | +600 | ⏳ Pending |
| 7 | Visual2D | +500 | ⏳ Pending |
| 8 | Geometry3D+FullGame | +900 | ⏳ Pending |
| **TOTAL** | | **+2800** | **20% complete** |

---

## EXECUTION PRIORITY

1. ✅ Week 4: Character (80% complete)
2. ⏳ Week 5: Sprite (implement now)
3. ⏳ Week 6: Music (implement after sprite)
4. ⏳ Week 7: Visual2D (implement after music)
5. ⏳ Week 8: Geometry3D+FullGame (implement last)

**Target:** All 6 domains complete by end of Week 8  
**Quality:** 80-100% per domain  
**Timeline:** 4 weeks remaining

---

**Status:** EXECUTING  
**Next:** Week 5 Sprite implementation
