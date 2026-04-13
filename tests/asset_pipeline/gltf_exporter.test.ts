import { describe, it, expect } from 'vitest';
import { exportToGLB, validateGLB } from '../../src/lib/asset_pipeline/gltf_exporter.js';
import { generateMaterial } from '../../src/lib/asset_pipeline/material_generator.js';

function makeMesh() {
  // Simple triangle
  return {
    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    indices: new Uint32Array([0, 1, 2]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  };
}

function makeColoredMesh() {
  return {
    ...makeMesh(),
    colors: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
  };
}

describe('glTF Exporter', () => {
  it('produces valid GLB binary (magic + version)', () => {
    const glb = exportToGLB(makeMesh(), 'TestMesh');
    const { valid, version } = validateGLB(glb);
    expect(valid).toBe(true);
    expect(version).toBe(2);
  });

  it('GLB size matches header', () => {
    const glb = exportToGLB(makeMesh(), 'TestMesh');
    const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
    const headerSize = view.getUint32(8, true);
    expect(headerSize).toBe(glb.length);
  });

  it('JSON chunk contains required glTF properties', () => {
    const glb = exportToGLB(makeMesh(), 'TestMesh');
    // Extract JSON chunk
    const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
    const jsonLength = view.getUint32(12, true);
    const jsonBytes = glb.slice(20, 20 + jsonLength);
    const jsonStr = new TextDecoder().decode(jsonBytes).trim();
    const gltf = JSON.parse(jsonStr);

    expect(gltf.asset.version).toBe('2.0');
    expect(gltf.asset.generator).toContain('Paradigm');
    expect(gltf.scenes).toHaveLength(1);
    expect(gltf.meshes).toHaveLength(1);
    expect(gltf.accessors.length).toBeGreaterThanOrEqual(3);
    expect(gltf.bufferViews.length).toBeGreaterThanOrEqual(3);
    expect(gltf.buffers).toHaveLength(1);
    expect(gltf.materials).toHaveLength(1);
  });

  it('includes vertex colors when present', () => {
    const glb = exportToGLB(makeColoredMesh(), 'ColorMesh');
    const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
    const jsonLength = view.getUint32(12, true);
    const jsonStr = new TextDecoder().decode(glb.slice(20, 20 + jsonLength)).trim();
    const gltf = JSON.parse(jsonStr);
    const attrs = gltf.meshes[0].primitives[0].attributes;
    expect(attrs.COLOR_0).toBeDefined();
  });

  it('applies PBR material from generator', () => {
    const seed = {
      $name: 'MetalSeed',
      $domain: 'geometry3d',
      genes: {
        palette: { type: 'vector', value: [0.8, 0.3, 0.1] },
        material: { type: 'categorical', value: 'metal' },
      },
    };
    const mat = generateMaterial(seed);
    expect(mat.metallic).toBe(0.9);
    expect(mat.roughness).toBe(0.3);
    expect(mat.baseColor[0]).toBeCloseTo(0.8);
  });

  it('deterministic: same input produces same output', () => {
    const mesh = makeMesh();
    const glb1 = exportToGLB(mesh, 'Test');
    const glb2 = exportToGLB(mesh, 'Test');
    expect(glb1.length).toBe(glb2.length);
    for (let i = 0; i < glb1.length; i++) {
      expect(glb1[i]).toBe(glb2[i]);
    }
  });
});

describe('Material Generator', () => {
  it('generates material from seed genes', () => {
    const seed = {
      $name: 'WoodChair',
      genes: {
        palette: { type: 'vector', value: [0.6, 0.4, 0.2] },
        material: { type: 'categorical', value: 'wood' },
      },
    };
    const mat = generateMaterial(seed);
    expect(mat.metallic).toBe(0.0);
    expect(mat.roughness).toBe(0.7);
    expect(mat.name).toContain('WoodChair');
  });

  it('defaults to plastic for unknown material', () => {
    const mat = generateMaterial({ genes: {} });
    expect(mat.metallic).toBe(0.0);
    expect(mat.roughness).toBe(0.4);
  });

  it('generates emissive from energy gene', () => {
    const seed = {
      genes: {
        core_power: { type: 'scalar', value: 0.8 },
        palette: { type: 'vector', value: [1, 0, 0] },
      },
    };
    const mat = generateMaterial(seed);
    expect(mat.emissiveFactor[0]).toBeGreaterThan(0);
  });
});
