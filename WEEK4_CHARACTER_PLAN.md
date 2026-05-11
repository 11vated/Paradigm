# WEEK 4: CHARACTER DOMAIN — WORLD-CLASS IMPLEMENTATION

**Start Date:** 2026-05-11  
**Target:** 50K triangles, 4K PBR textures, 64 bones, 13 animations, GLTF 2.0 export  
**Status:** ⏳ **IN PROGRESS**

---

## CURRENT STATE ANALYSIS

### What Exists (character-v3.ts)

✅ **Foundation:**
- Parameter extraction from seed genes
- Body proportion calculation (height, shoulder width, muscle mass, etc.)
- Face feature generation (eye spacing, nose width, mouth width, etc.)
- Basic body mesh generation (torso sphere with muscle deformation)
- Basic head mesh generation (sphere with facial features)
- Skeleton structure (root, spine, head, shoulders)
- UV unwrapping (cylindrical projection)
- Placeholder texture generation
- Animation clip structure

❌ **Gaps (World-Class Requirements):**
1. **Mesh Quality:** Currently uses simple spheres, needs anatomically correct mesh
2. **Texture Generation:** Placeholder solid colors, needs procedural skin textures with pores, wrinkles, subsurface scattering
3. **Skeletal Rig:** Only 5 bones, needs 64 bones with proper hierarchy
4. **Skinning:** No skin weights computed
5. **Blend Shapes:** No facial expressions implemented
6. **Animations:** Empty animation clips
7. **LOD Chain:** No level-of-detail generation
8. **PBR Materials:** Basic MeshStandardMaterial, needs full PBR with texture maps

---

## WORLD-CLASS ENHANCEMENT PLAN

### Enhancement 1: Anatomically Correct Body Mesh

**Current:** Sphere geometries scaled by proportions  
**Target:** Parametric human body with anatomical landmarks

**Implementation:**
```typescript
function generateAnatomicalBodyMesh(params: CharacterParams, rng: Xoshiro256StarStar): THREE.BufferGeometry {
  // Use SMPL-like parametric model
  // 6890 vertices with anatomical blend shapes
  const baseMesh = loadBaseHumanMesh(); // 6890 vertices
  
  // Apply shape blend shapes (10 shape parameters)
  applyShapeBlendShapes(baseMesh, {
    height: params.proportions.height,
    weight: params.proportions.muscleMass + params.proportions.fatDistribution,
    shoulderWidth: params.proportions.shoulderWidth,
    waistWidth: params.proportions.waistWidth,
    // ... 6 more shape parameters
  });
  
  // Apply muscle deformation based on muscleMass gene
  applyMuscleDeformation(baseMesh, params.muscles);
  
  // Subdivide for photorealistic quality
  if (params.quality === 'photorealistic') {
    baseMesh = subdivideMesh(baseMesh, 2); // 6890 → 27,560 → 110,240 vertices
    baseMesh = decimateMesh(baseMesh, 50000); // Target 50K triangles
  }
  
  return baseMesh;
}
```

---

### Enhancement 2: Procedural Skin Texture Generation

**Current:** Solid color fill  
**Target:** 4K PBR texture set with skin details

**Implementation:**
```typescript
async function generateSkinTextureSet(
  params: CharacterParams,
  resolution: number,
  rng: Xoshiro256StarStar
): Promise<Record<string, THREE.Texture>> {
  const textures: Record<string, THREE.Texture> = {};
  
  // Albedo (base color) with skin variation
  const albedo = await generateSkinAlbedo(params.skinTone, resolution, rng);
  textures.albedo = albedo;
  
  // Normal map with skin pores and wrinkles
  const normal = await generateSkinNormal(resolution, rng);
  textures.normal = normal;
  
  // Roughness map (oily T-zone, dry cheeks)
  const roughness = await generateSkinRoughness(resolution, rng);
  textures.roughness = roughness;
  
  // Metallic map (skin is non-metallic)
  textures.metallic = createConstantTexture(0.0, resolution);
  
  // Ambient occlusion (creases, folds)
  const ao = await generateSkinAO(resolution, rng);
  textures.ao = ao;
  
  // Height/displacement map for parallax
  const height = await generateSkinHeight(resolution, rng);
  textures.height = height;
  
  // Subsurface scattering map (thinner skin areas)
  const sss = await generateSkinSSS(resolution, rng);
  textures.sss = sss;
  
  return textures;
}

async function generateSkinAlbedo(
  skinTone: [number, number, number],
  resolution: number,
  rng: Xoshiro256StarStar
): Promise<THREE.Texture> {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d')!;
  
  // Base skin color
  ctx.fillStyle = `rgb(${skinTone[0]*255}, ${skinTone[1]*255}, ${skinTone[2]*255})`;
  ctx.fillRect(0, 0, resolution, resolution);
  
  // Add skin variation (freckles, moles, pores)
  addSkinVariation(ctx, resolution, rng, {
    freckleDensity: rng.nextF64() * 0.3,
    poreSize: 0.5 + rng.nextF64() * 0.5,
    variationScale: 0.1 + rng.nextF64() * 0.2
  });
  
  // Add subsurface scattering color variation
  addSubsurfaceVariation(ctx, resolution, rng);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
```

---

### Enhancement 3: Full 64-Bone Skeletal Rig

**Current:** 5 bones (root, spine, head, 2 shoulders)  
**Target:** 64 bones with proper hierarchy

**Bone Hierarchy:**
```
root (pelvis)
├── spine
│   ├── spine1
│   │   ├── spine2
│   │   │   ├── spine3
│   │   │   │   ├── neck
│   │   │   │   │   └── head
│   │   │   │   │       └── jaw
│   │   │   │   │           ├── jawLeft
│   │   │   │   │           └── jawRight
│   │   │   │   ├── l_clavicle
│   │   │   │   │   ├── l_upperarm
│   │   │   │   │   │   ├── l_lowerarm
│   │   │   │   │   │   │   └── l_hand
│   │   │   │   │   │   │     ├── l_thumb1
│   │   │   │   │   │   │     │   ├── l_thumb2
│   │   │   │   │   │   │     │   └── l_thumb3
│   │   │   │   │   │   │     ├── l_index1
│   │   │   │   │   │   │     │   ├── l_index2
│   │   │   │   │   │   │     │   └── l_index3
│   │   │   │   │   │   │     ├── l_middle1
│   │   │   │   │   │   │     │   ├── l_middle2
│   │   │   │   │   │   │     │   └── l_middle3
│   │   │   │   │   │   │     ├── l_ring1
│   │   │   │   │   │   │     │   ├── l_ring2
│   │   │   │   │   │   │     │   └── l_ring3
│   │   │   │   │   │   │     └── l_pinky1
│   │   │   │   │   │   │         ├── l_pinky2
│   │   │   │   │   │   │         └── l_pinky3
│   │   │   │   ├── r_clavicle
│   │   │   │   │   └── (same as left)
│   ├── l_thigh
│   │   ├── l_calf
│   │   │   └── l_foot
│   │   │       ├── l_ball
│   │   │       └── l_toes
│   └── r_thigh
│       └── (same as left)
```

**Total:** 64 bones (including all finger bones)

---

### Enhancement 4: 52 ARKit Blend Shapes

**Target:** Full facial expression system

**Blend Shapes:**
```
1. neutral
2. smile
3. frown
4. mouthLeft
5. mouthRight
6. noseSneerLeft
7. noseSneerRight
8. eyeBlinkLeft
9. eyeBlinkRight
10. eyeWideLeft
11. eyeWideRight
12. eyeSquintLeft
13. eyeSquintRight
14. browDownLeft
15. browDownRight
16. browInnerUp
17. browOuterUpLeft
18. browOuterUpRight
19. cheekPuff
20. cheekSquintLeft
21. cheekSquintRight
22. jawOpen
23. jawLeft
24. jawRight
25. jawForward
26. tongueOut
27. mouthRollLower
28. mouthRollUpper
29. mouthShrugLower
30. mouthShrugUpper
31. mouthClose
32. mouthFunnel
33. mouthPucker
34. mouthDimpleLeft
35. mouthDimpleRight
36. mouthStretchLeft
37. mouthStretchRight
38. mouthPressLeft
39. mouthPressRight
40. mouthSmileLeft
41. mouthSmileRight
42. mouthFrownLeft
43. mouthFrownRight
44. mouthLowerDownLeft
45. mouthLowerDownRight
46. mouthUpperUpLeft
47. mouthUpperUpRight
48. eyeLookInLeft
49. eyeLookInRight
50. eyeLookOutLeft
51. eyeLookOutRight
52. eyeLookUpLeft/Right (combined)
```

---

### Enhancement 5: 13 Animations

**Animation List:**
1. idle (breathing, subtle sway)
2. walk (natural gait cycle)
3. run (full sprint cycle)
4. jump (takeoff, apex, landing)
5. attack_melee (punch combo)
6. attack_ranged (shoot bow)
7. cast_spell (magic casting)
8. death (fall down)
9. sit (sit down, seated idle)
10. crouch (crouch down, crouch idle)
11. climb (ladder climbing)
12. swim (swimming stroke)
13. dance (generic dance loop)

---

### Enhancement 6: LOD Chain

**LOD Levels:**
- LOD0: 50K triangles (photorealistic, close-up)
- LOD1: 20K triangles (medium distance)
- LOD2: 8K triangles (far distance)
- LOD3: 2K triangles (very far / silhouette)

**Generation:**
```typescript
function generateLODChain(mesh: THREE.Mesh): THREE.LOD {
  const lod = new THREE.LOD();
  
  // LOD0: Full quality
  const lod0 = mesh.clone();
  lod.addLevel(lod0, 0);
  
  // LOD1: 40% triangles
  const lod1 = decimateMesh(mesh.clone(), 20000);
  lod.addLevel(lod1, 20);
  
  // LOD2: 16% triangles
  const lod2 = decimateMesh(mesh.clone(), 8000);
  lod.addLevel(lod2, 50);
  
  // LOD3: 4% triangles
  const lod3 = decimateMesh(mesh.clone(), 2000);
  lod.addLevel(lod3, 100);
  
  return lod;
}
```

---

## IMPLEMENTATION STATUS

| Enhancement | Status | Lines | ETA |
|---|---|---|---|
| Anatomical Body Mesh | ⏳ Pending | +200 | 2 hours |
| Skin Texture Generation | ⏳ Pending | +300 | 3 hours |
| 64-Bone Skeletal Rig | ⏳ Pending | +150 | 1 hour |
| Skinning Weights | ⏳ Pending | +100 | 2 hours |
| 52 Blend Shapes | ⏳ Pending | +400 | 4 hours |
| 13 Animations | ⏳ Pending | +500 | 5 hours |
| LOD Chain | ⏳ Pending | +80 | 1 hour |
| **TOTAL** | | **+1730 lines** | **18 hours** |

---

## QUALITY BENCHMARKS

| Metric | Target | Verification |
|---|---|---|
| Triangle count | 20K-100K | Count in exported GLTF |
| Texture resolution | 4K (4096×4096) | Check texture dimensions |
| Bone count | 64 bones | Count in skeleton |
| Blend shapes | 52 ARKit | Count morph targets |
| Animations | 13 clips | Count AnimationClips |
| Export format | GLTF 2.0 binary | Validate with glTF validator |
| PBR materials | Albedo, Normal, Roughness, Metallic, AO, Height, SSS | Check texture maps |
| FPS (50K tris) | 60fps @ 1080p | Benchmark in Three.js viewer |

---

## NEXT ACTIONS

1. **Implement anatomical body mesh** (replace sphere primitives)
2. **Implement skin texture generation** (procedural pores, wrinkles, SSS)
3. **Implement full 64-bone rig** (complete hierarchy)
4. **Implement skinning weights** (vertex-to-bone assignment)
5. **Implement 52 blend shapes** (facial expressions)
6. **Implement 13 animations** (keyframe clips)
7. **Implement LOD chain** (4 levels)
8. **Test and verify** (export, validate, benchmark)

---

**Estimated Completion:** End of Week 4 (18 hours of focused implementation)
