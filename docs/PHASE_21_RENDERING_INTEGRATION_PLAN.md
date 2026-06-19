# Phase 21: Visual Rendering Integration Plan
**Timeline**: 2-3 weeks  
**Goal**: Connect artifact data to viewport rendering components

---

## Current Situation Analysis

### ✅ What Exists
1. **Viewport Components** (`src/components/studio/viewports/`)
   - `ThreeViewport.tsx` - 3D mesh rendering with Three.js
   - `TwoDViewport.tsx` - SVG and 2D image display
   - `AudioViewport.tsx` - Audio waveform and playback
   - `AnimViewport.tsx` - Animation playback
   - `GameViewport.tsx` - Interactive game rendering

2. **Rendering Engines** (`src/lib/rendering/`)
   - `universal-renderer.ts` - WebGPU path tracer
   - `photorealistic-renderer.ts` - CPU renderer
   - `webgpu-seed-renderer.ts` - GPU compute
   - `pbr-materials.ts` - PBR shading
   - `seed-render-service.ts` - Service layer

3. **Artifact Data** (from API)
   - Character artifacts include: `form.mesh` with vertices, indices, UVs, textures
   - Music artifacts include: `genes.melody`, `genes.tempo`, `genes.key`
   - Visual2D artifacts include: SVG data, image data

### ❌ The Gap
The viewport components expect specific data structures that don't match the current artifact format from the API. Need to:
1. Create adapter layer to transform API artifacts → viewport format
2. Wire artifact data to Three.js geometry
3. Implement texture loading and material setup
4. Add audio synthesis/playback
5. Handle all 27 domain types

---

## Implementation Plan

### Week 1: Core Rendering Infrastructure

#### Day 1-2: Artifact Adapter Layer
**File**: `src/lib/rendering/artifact-adapter.ts`

```typescript
/**
 * Transforms API artifact format → viewport-compatible format
 */
export interface ViewportArtifact {
  domain: string;
  meshData?: MeshData;
  svgContent?: string;
  audioData?: AudioData;
  imageData?: ImageData;
  // ... other formats
}

export function adaptArtifactForViewport(artifact: any): ViewportArtifact {
  const domain = artifact.domain || artifact.$domain;
  
  switch (domain) {
    case 'character':
      return adaptCharacterArtifact(artifact);
    case 'music':
      return adaptMusicArtifact(artifact);
    case 'visual2d':
      return adaptVisual2DArtifact(artifact);
    // ... handle all 27 domains
    default:
      return { domain, meshData: null };
  }
}

function adaptCharacterArtifact(artifact: any): ViewportArtifact {
  const mesh = artifact.form?.mesh;
  if (!mesh) return { domain: 'character' };
  
  return {
    domain: 'character',
    meshData: {
      vertices: mesh.vertices,
      indices: mesh.indices,
      normals: mesh.normals || null,
      uvs: mesh.uvs || null,
      colors: null,
    },
    textures: {
      albedo: artifact.form?.textures?.albedoRes,
      normal: artifact.form?.textures?.normalRes,
      roughness: artifact.form?.textures?.roughnessRes,
      metallic: artifact.form?.textures?.metallicRes,
    }
  };
}
```

**Tasks**:
- [ ] Create `artifact-adapter.ts` with domain-specific adapters
- [ ] Handle character domain (mesh + textures)
- [ ] Handle music domain (melody + audio synthesis)
- [ ] Handle visual2d domain (SVG + images)
- [ ] Add adapters for remaining 24 domains
- [ ] Write unit tests for each adapter

#### Day 3-4: Three.js Integration
**File**: `src/components/studio/viewports/ThreeViewport.tsx` (enhance existing)

**Tasks**:
- [ ] Import artifact adapter
- [ ] Transform artifact data before passing to `EmergentMesh`
- [ ] Load textures from artifact data
- [ ] Apply PBR materials with texture maps
- [ ] Handle LOD levels (1024/512/204 triangles)
- [ ] Add proper lighting setup
- [ ] Implement camera controls

**Code Changes**:
```typescript
// In ThreeViewport.tsx
import { adaptArtifactForViewport } from '@/lib/rendering/artifact-adapter';

export default function ThreeViewport({ artifact, seed }: ViewportProps) {
  const adaptedArtifact = useMemo(() => 
    adaptArtifactForViewport(artifact), 
    [artifact]
  );
  
  const meshData = adaptedArtifact.meshData;
  const textures = adaptedArtifact.textures;
  
  return (
    <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      
      {meshData && (
        <EmergentMesh 
          meshData={meshData} 
          textures={textures}
          color={DOMAIN_COLORS_HEX[artifact.domain] || '#00E5FF'} 
        />
      )}
      
      <OrbitControls />
      <Grid />
      <ContactShadows />
    </Canvas>
  );
}
```

#### Day 5: Audio Synthesis
**File**: `src/lib/audio/synthesizer.ts` (new)

**Tasks**:
- [ ] Create Web Audio API synthesizer
- [ ] Convert MIDI notes → audio frequencies
- [ ] Implement basic waveforms (sine, square, sawtooth)
- [ ] Add ADSR envelope
- [ ] Create audio buffer from melody data

**Code**:
```typescript
export class MelodySynthesizer {
  private audioContext: AudioContext;
  
  constructor() {
    this.audioContext = new AudioContext();
  }
  
  synthesizeMelody(notes: number[], tempo: number, key: string): AudioBuffer {
    // Convert MIDI notes to frequencies
    // Generate audio samples
    // Return AudioBuffer for playback
  }
}
```

---

### Week 2: Domain-Specific Rendering

#### Day 6-7: Visual Domains
**Domains**: visual2d, sprite, geometry3d, procedural

**Tasks**:
- [ ] SVG rendering in TwoDViewport
- [ ] Canvas 2D rendering for raster images
- [ ] Procedural geometry generation
- [ ] Sprite sheet handling

#### Day 8-9: Interactive Domains
**Domains**: game, fullgame, ui, animation

**Tasks**:
- [ ] Game viewport with input handling
- [ ] Animation timeline and playback
- [ ] UI component rendering
- [ ] Interactive controls

#### Day 10-11: Specialized Domains
**Domains**: physics, particle, shader, field

**Tasks**:
- [ ] Physics simulation visualization
- [ ] Particle system rendering (WebGPU)
- [ ] Shader preview (GLSL/WGSL)
- [ ] Field visualization (SDF, vector fields)

#### Day 12: Remaining Domains
**Domains**: narrative, ecosystem, alife, typography, architecture, vehicle, furniture, fashion, robotics, circuit, food, choreography, agent, friend, world

**Tasks**:
- [ ] Text rendering for narrative
- [ ] Ecosystem visualization
- [ ] Typography preview
- [ ] Fallback rendering for complex domains

---

### Week 3: Polish & Testing

#### Day 13-14: Performance Optimization
**Tasks**:
- [ ] Implement LOD system
- [ ] Add render caching
- [ ] Optimize texture loading
- [ ] Reduce draw calls
- [ ] Profile and optimize hot paths

#### Day 15-16: Error Handling & Loading States
**Tasks**:
- [ ] Add loading spinners
- [ ] Handle missing data gracefully
- [ ] Show error messages
- [ ] Implement retry logic
- [ ] Add fallback rendering

#### Day 17-18: Cross-Domain Testing
**Tasks**:
- [ ] Test all 27 domains
- [ ] Verify visual output quality
- [ ] Check performance metrics
- [ ] Test on different devices
- [ ] Validate determinism (same seed = same visual)

#### Day 19-20: UI/UX Polish
**Tasks**:
- [ ] Smooth transitions
- [ ] Responsive design
- [ ] Accessibility improvements
- [ ] Keyboard shortcuts
- [ ] Touch controls

#### Day 21: Final Integration & Documentation
**Tasks**:
- [ ] End-to-end testing
- [ ] Update documentation
- [ ] Create rendering guide
- [ ] Record demo videos
- [ ] Prepare release notes

---

## Success Criteria

### Must Have (Week 1)
- ✅ Character artifacts render as 3D meshes
- ✅ Music artifacts play audio
- ✅ Visual2D artifacts display images/SVG
- ✅ Adapter layer handles 10+ domains

### Should Have (Week 2)
- ✅ All 27 domains have rendering support
- ✅ Textures load and display correctly
- ✅ Animations play smoothly
- ✅ Performance is acceptable (>30 FPS)

### Nice to Have (Week 3)
- ✅ WebGPU path tracing for photorealistic rendering
- ✅ Advanced particle systems
- ✅ Real-time shader editing
- ✅ VR/AR support

---

## Technical Debt to Address

1. **Artifact Format Standardization**
   - Current: Inconsistent artifact structures across domains
   - Fix: Define canonical artifact schema
   - Timeline: Week 1, Day 1

2. **Texture Loading**
   - Current: Texture data in artifact but not loaded
   - Fix: Implement texture loader service
   - Timeline: Week 1, Day 3-4

3. **Audio Synthesis**
   - Current: MIDI notes but no audio output
   - Fix: Web Audio API synthesizer
   - Timeline: Week 1, Day 5

4. **Performance**
   - Current: No LOD, no caching
   - Fix: Implement optimization layer
   - Timeline: Week 3, Day 13-14

---

## Dependencies

### Required Libraries (already installed)
- ✅ `three` - 3D rendering
- ✅ `@react-three/fiber` - React Three.js integration
- ✅ `@react-three/drei` - Three.js helpers

### May Need to Install
- `tone.js` - Advanced audio synthesis (if Web Audio API insufficient)
- `lottie-web` - Animation playback (if needed)
- `pixi.js` - 2D rendering optimization (if Canvas 2D insufficient)

---

## Risk Mitigation

### Risk 1: Performance Issues
**Mitigation**: Implement LOD early, profile continuously, use Web Workers for heavy computation

### Risk 2: Browser Compatibility
**Mitigation**: Test on Chrome, Firefox, Safari; provide WebGL fallback for WebGPU

### Risk 3: Complex Domain Rendering
**Mitigation**: Start with simple domains, use fallback rendering for complex cases

### Risk 4: Texture Loading Delays
**Mitigation**: Show loading states, implement progressive loading, cache textures

---

## Next Steps

1. **Immediate** (Today):
   - Create `src/lib/rendering/artifact-adapter.ts`
   - Implement character domain adapter
   - Test with existing character artifact

2. **This Week**:
   - Complete adapter for 10 core domains
   - Wire adapters to viewport components
   - Implement texture loading

3. **Next Week**:
   - Complete all 27 domain adapters
   - Add audio synthesis
   - Implement advanced rendering features

4. **Week 3**:
   - Performance optimization
   - Cross-domain testing
   - Polish and documentation

---

**Status**: Ready to begin implementation  
**First Task**: Create artifact adapter layer  
**Expected Completion**: 2-3 weeks from start