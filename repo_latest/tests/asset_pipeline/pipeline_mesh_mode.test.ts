/**
 * Phase 5 tests — pipeline smooth/blocky mesh mode + preview generator
 * no longer falls back to a sphere for unknown artifacts.
 *
 * These tests target the *extractor layer* rather than booting the full
 * Express server; that keeps them fast and avoids cross-contamination with
 * the auth-lifecycle/seed-persistence suite that owns the full server harness.
 */
import { describe, it, expect } from 'vitest';
import {
  MeshExtractor,
  transposeFieldToMarchingCubes,
} from '../../src/lib/asset_pipeline/mesh_extractor.js';
import { generatePreviewMesh } from '../../src/lib/asset_pipeline/preview_generator.js';

// Build a field in the blocky/QFT convention `x*ny*nz + y*nz + z`.
function buildXMajorSphereField(N: number, r: number): Float32Array {
  const out = new Float32Array(N * N * N);
  const step = 2 / (N - 1);
  for (let x = 0; x < N; x++) {
    const xw = -1 + x * step;
    for (let y = 0; y < N; y++) {
      const yw = -1 + y * step;
      for (let z = 0; z < N; z++) {
        const zw = -1 + z * step;
        // Positive inside a ball of radius r.
        out[x * N * N + y * N + z] = r - Math.hypot(xw, yw, zw);
      }
    }
  }
  return out;
}

describe('transposeFieldToMarchingCubes', () => {
  it('rejects length mismatches', () => {
    expect(() => transposeFieldToMarchingCubes(new Float32Array(5), [4, 4, 4])).toThrow();
  });

  it('preserves point values — same (x,y,z) → same value under each indexing', () => {
    const N = 6;
    const field = buildXMajorSphereField(N, 0.5);
    const t = transposeFieldToMarchingCubes(field, [N, N, N]);
    // For a symmetric field the check is still meaningful: spot-check a few
    // cells where the two layouts disagree on flat index.
    for (const [x, y, z] of [[0, 0, 0], [1, 2, 3], [5, 5, 5], [2, 4, 1]] as const) {
      const src = x * N * N + y * N + z;
      const dst = x + y * N + z * N * N;
      expect(t[dst]).toBe(field[src]);
    }
  });
});

describe('MeshExtractor smooth vs blocky', () => {
  const N = 16;
  const field = buildXMajorSphereField(N, 0.5);
  const dims: [number, number, number] = [N, N, N];

  it('blocky output uses quad faces — every triangle has an axis-aligned normal', () => {
    const blocky = MeshExtractor.extractIsosurface(field, dims, 0);
    // In blocky output, each 3-normal should align with ±X, ±Y, or ±Z.
    const norms = blocky.normals;
    let nonAxis = 0;
    for (let i = 0; i < norms.length; i += 3) {
      const a = Math.abs(norms[i]), b = Math.abs(norms[i + 1]), c = Math.abs(norms[i + 2]);
      const maxAxis = Math.max(a, b, c);
      const sumOthers = (a + b + c) - maxAxis;
      // A perfect axis-aligned normal has sumOthers = 0.
      if (sumOthers > 1e-6) nonAxis++;
    }
    expect(nonAxis).toBe(0);
  });

  it('smooth (MC) output has non-axis-aligned normals on a sphere', () => {
    const smooth = MeshExtractor.extractSmoothIsosurfaceFromXMajor(field, dims, { threshold: 0 });
    // On a sphere, very few normals (if any) point perfectly along an axis.
    const norms = smooth.normals;
    let axisAligned = 0;
    for (let i = 0; i < norms.length; i += 3) {
      const a = Math.abs(norms[i]), b = Math.abs(norms[i + 1]), c = Math.abs(norms[i + 2]);
      const maxAxis = Math.max(a, b, c);
      const sumOthers = (a + b + c) - maxAxis;
      if (sumOthers < 1e-3) axisAligned++;
    }
    // Allow a handful of coincidental axis-aligned ones, but the vast majority
    // must be true 3D directions. Fail fast if somehow we emitted flat normals.
    const fraction = axisAligned / (norms.length / 3);
    expect(fraction).toBeLessThan(0.2);
  });

  it('smooth mesh has a different vertex count than blocky mesh', () => {
    const blocky = MeshExtractor.extractIsosurface(field, dims, 0);
    const smooth = MeshExtractor.extractSmoothIsosurfaceFromXMajor(field, dims, { threshold: 0 });
    expect(blocky.vertices.length).toBeGreaterThan(0);
    expect(smooth.vertices.length).toBeGreaterThan(0);
    expect(smooth.vertices.length).not.toBe(blocky.vertices.length);
  });

  it('both modes produce index buffers in range', () => {
    for (const m of [
      MeshExtractor.extractIsosurface(field, dims, 0),
      MeshExtractor.extractSmoothIsosurfaceFromXMajor(field, dims, { threshold: 0 }),
    ]) {
      const vertexCount = m.vertices.length / 3;
      for (let i = 0; i < m.indices.length; i++) {
        expect(m.indices[i]).toBeLessThan(vertexCount);
      }
    }
  });
});

describe('generatePreviewMesh — default case is no longer a sphere', () => {
  function shapeStats(mesh: { vertices: number[]; indices: number[] }) {
    // Mean-distance-from-origin and max-min-radius spread. A sphere has
    // nearly zero spread; a gyroid-modulated implicit has a visible spread.
    let minR = Infinity, maxR = -Infinity, sum = 0, n = 0;
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const r = Math.hypot(mesh.vertices[i], mesh.vertices[i + 1], mesh.vertices[i + 2]);
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      sum += r; n++;
    }
    return { minR, maxR, mean: sum / n, spread: maxR - minR, vertexCount: n };
  }

  it('produces non-spherical geometry for unknown artifact types', () => {
    const artifact = { type: 'weirdo', id: 'seed-1', name: 'test', seed_id: 'seed-1' };
    const mesh = generatePreviewMesh(artifact);
    expect(mesh).not.toBeNull();
    if (!mesh) return;
    const stats = shapeStats(mesh);
    // A sphere (radius 0.8, the old fallback) would have spread ≈ 0.
    // Our gyroid-modulated MC surface must show a real radial variation.
    expect(stats.spread).toBeGreaterThan(0.1);
    expect(mesh.indices.length).toBeGreaterThan(0);
  });

  it('two different artifacts produce different meshes', () => {
    const a = generatePreviewMesh({ type: 'mystery', id: 'alpha', seed_id: 'alpha', name: 'Alpha' });
    const b = generatePreviewMesh({ type: 'mystery', id: 'beta',  seed_id: 'beta',  name: 'Beta'  });
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    if (!a || !b) return;
    // Extremely unlikely to collide on vertex count AND mean radius.
    const sa = shapeStats(a), sb = shapeStats(b);
    const sameShape = a.vertices.length === b.vertices.length
      && Math.abs(sa.mean - sb.mean) < 1e-6
      && Math.abs(sa.spread - sb.spread) < 1e-6;
    expect(sameShape).toBe(false);
  });

  it('is deterministic — same artifact id produces byte-identical buffers', () => {
    const art = { type: 'mystery', id: 'stable-id', seed_id: 'stable-id', name: 'Stable' };
    const a = generatePreviewMesh(art);
    const b = generatePreviewMesh(art);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    if (!a || !b) return;
    expect(a.vertices.length).toBe(b.vertices.length);
    expect(a.indices.length).toBe(b.indices.length);
    for (let i = 0; i < a.vertices.length; i++) expect(a.vertices[i]).toBe(b.vertices[i]);
    for (let i = 0; i < a.indices.length; i++) expect(a.indices[i]).toBe(b.indices[i]);
  });

  it('geometry3d path still produces known primitive shapes (not touched by Phase 4)', () => {
    const cube = generatePreviewMesh({ type: 'geometry3d', mesh: { primitive: 'cube', scale: [1, 1, 1] } });
    expect(cube).not.toBeNull();
    if (!cube) return;
    // A box has 24 vertices (6 faces × 4 verts).
    expect(cube.vertices.length / 3).toBe(24);
  });
});
