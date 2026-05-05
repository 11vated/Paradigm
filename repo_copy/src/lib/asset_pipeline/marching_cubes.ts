/**
 * Marching Cubes — smooth isosurface extraction (Phase 4).
 *
 * Given a scalar field F(x,y,z) on a regular grid and an iso threshold T,
 * produce a triangle mesh approximating the level set F = T.
 *
 * Differences vs the existing blocky `extractIsosurface`:
 *   - Smooth: vertices lie on interpolated edge crossings, not voxel corners.
 *   - Per-vertex gradient normals from the field (central differences),
 *     so shading is smooth — no flat minecraft faces.
 *   - Vertex dedup: every grid edge that crosses the iso gets *one* vertex,
 *     shared across all triangles that touch it. This gives us shared normals
 *     and ~3-6× smaller index buffers than the naive variant.
 *
 * Reference for the 256-case triangulation table: Paul Bourke's canonical MC
 * tables (public domain). Edge table + tri table are below — the layout is
 * the standard one used by every open-source MC implementation.
 *
 * Determinism: no RNG, no Map iteration order dependencies. Vertex order is
 * fully determined by (x,y,z) traversal and edge index.
 */
import type { MeshData } from './mesh_extractor.js';

// ── Cube vertex + edge layout ──────────────────────────────────────────────
//
//            v4 -------- v5
//           /|          /|
//          v7 -------- v6|
//          | |         | |
//          | v0 -------|v1
//          |/          |/
//          v3 -------- v2
//
// v0 = (x,   y,   z)
// v1 = (x+1, y,   z)
// v2 = (x+1, y,   z+1)
// v3 = (x,   y,   z+1)
// v4 = (x,   y+1, z)
// v5 = (x+1, y+1, z)
// v6 = (x+1, y+1, z+1)
// v7 = (x,   y+1, z+1)
//
// Edges (12): bottom ring 0..3, top ring 4..7, vertical struts 8..11.

/** Unit-cube corner offsets for the 8 vertices, matching the diagram above. */
const CORNER_OFFSETS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1],
  [0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1],
];

/** For each of the 12 edges, the two cube corners it connects. */
const EDGE_CORNERS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 0], // bottom
  [4, 5], [5, 6], [6, 7], [7, 4], // top
  [0, 4], [1, 5], [2, 6], [3, 7], // struts
];

// ── MC lookup tables ────────────────────────────────────────────────────────
//
// EDGE_TABLE[cubeIndex] is a 12-bit mask: bit e set ↔ edge e is crossed.
// TRI_TABLE[cubeIndex] is a list of edge indices in groups of 3 (triangles),
// terminated by -1. Up to 5 triangles per cube.

/* eslint-disable */
const EDGE_TABLE: ReadonlyArray<number> = [
  0x0  , 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c, 0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
  0x190, 0x99 , 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c, 0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
  0x230, 0x339, 0x33 , 0x13a, 0x636, 0x73f, 0x435, 0x53c, 0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
  0x3a0, 0x2a9, 0x1a3, 0xaa , 0x7a6, 0x6af, 0x5a5, 0x4ac, 0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
  0x460, 0x569, 0x663, 0x76a, 0x66 , 0x16f, 0x265, 0x36c, 0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
  0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff , 0x3f5, 0x2fc, 0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
  0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55 , 0x15c, 0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
  0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc , 0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
  0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc, 0xcc , 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
  0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c, 0x15c, 0x55 , 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
  0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc, 0x2fc, 0x3f5, 0xff , 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
  0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c, 0x36c, 0x265, 0x16f, 0x66 , 0x76a, 0x663, 0x569, 0x460,
  0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac, 0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa , 0x1a3, 0x2a9, 0x3a0,
  0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c, 0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33 , 0x339, 0x230,
  0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c, 0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99 , 0x190,
  0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c, 0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0  ,
];

// Triangle table — 256 entries, each a variable-length list of edges, -1 terminated.
// Compact form: we store exactly 16 entries per row (padded with -1), flat, for speed.
const TRI_TABLE: Int8Array = new Int8Array([
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,1,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  1,8,3,9,8,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,8,3,1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  9,2,10,0,2,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  2,8,3,2,10,8,10,9,8,-1,-1,-1,-1,-1,-1,-1,
  3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,11,2,8,11,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  1,9,0,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  1,11,2,1,9,11,9,8,11,-1,-1,-1,-1,-1,-1,-1,
  3,10,1,11,10,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,10,1,0,8,10,8,11,10,-1,-1,-1,-1,-1,-1,-1,
  3,9,0,3,11,9,11,10,9,-1,-1,-1,-1,-1,-1,-1,
  9,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  4,3,0,7,3,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,1,9,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  4,1,9,4,7,1,7,3,1,-1,-1,-1,-1,-1,-1,-1,
  1,2,10,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  3,4,7,3,0,4,1,2,10,-1,-1,-1,-1,-1,-1,-1,
  9,2,10,9,0,2,8,4,7,-1,-1,-1,-1,-1,-1,-1,
  2,10,9,2,9,7,2,7,3,7,9,4,-1,-1,-1,-1,
  8,4,7,3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  11,4,7,11,2,4,2,0,4,-1,-1,-1,-1,-1,-1,-1,
  9,0,1,8,4,7,2,3,11,-1,-1,-1,-1,-1,-1,-1,
  4,7,11,9,4,11,9,11,2,9,2,1,-1,-1,-1,-1,
  3,10,1,3,11,10,7,8,4,-1,-1,-1,-1,-1,-1,-1,
  1,11,10,1,4,11,1,0,4,7,11,4,-1,-1,-1,-1,
  4,7,8,9,0,11,9,11,10,11,0,3,-1,-1,-1,-1,
  4,7,11,4,11,9,9,11,10,-1,-1,-1,-1,-1,-1,-1,
  9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  9,5,4,0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,5,4,1,5,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  8,5,4,8,3,5,3,1,5,-1,-1,-1,-1,-1,-1,-1,
  1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  3,0,8,1,2,10,4,9,5,-1,-1,-1,-1,-1,-1,-1,
  5,2,10,5,4,2,4,0,2,-1,-1,-1,-1,-1,-1,-1,
  2,10,5,3,2,5,3,5,4,3,4,8,-1,-1,-1,-1,
  9,5,4,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,11,2,0,8,11,4,9,5,-1,-1,-1,-1,-1,-1,-1,
  0,5,4,0,1,5,2,3,11,-1,-1,-1,-1,-1,-1,-1,
  2,1,5,2,5,8,2,8,11,4,8,5,-1,-1,-1,-1,
  10,3,11,10,1,3,9,5,4,-1,-1,-1,-1,-1,-1,-1,
  4,9,5,0,8,1,8,10,1,8,11,10,-1,-1,-1,-1,
  5,4,0,5,0,11,5,11,10,11,0,3,-1,-1,-1,-1,
  5,4,8,5,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1,
  9,7,8,5,7,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  9,3,0,9,5,3,5,7,3,-1,-1,-1,-1,-1,-1,-1,
  0,7,8,0,1,7,1,5,7,-1,-1,-1,-1,-1,-1,-1,
  1,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  9,7,8,9,5,7,10,1,2,-1,-1,-1,-1,-1,-1,-1,
  10,1,2,9,5,0,5,3,0,5,7,3,-1,-1,-1,-1,
  8,0,2,8,2,5,8,5,7,10,5,2,-1,-1,-1,-1,
  2,10,5,2,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1,
  7,9,5,7,8,9,3,11,2,-1,-1,-1,-1,-1,-1,-1,
  9,5,7,9,7,2,9,2,0,2,7,11,-1,-1,-1,-1,
  2,3,11,0,1,8,1,7,8,1,5,7,-1,-1,-1,-1,
  11,2,1,11,1,7,7,1,5,-1,-1,-1,-1,-1,-1,-1,
  9,5,8,8,5,7,10,1,3,10,3,11,-1,-1,-1,-1,
  5,7,0,5,0,9,7,11,0,1,0,10,11,10,0,-1,
  11,10,0,11,0,3,10,5,0,8,0,7,5,7,0,-1,
  11,10,5,7,11,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,8,3,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  9,0,1,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  1,8,3,1,9,8,5,10,6,-1,-1,-1,-1,-1,-1,-1,
  1,6,5,2,6,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  1,6,5,1,2,6,3,0,8,-1,-1,-1,-1,-1,-1,-1,
  9,6,5,9,0,6,0,2,6,-1,-1,-1,-1,-1,-1,-1,
  5,9,8,5,8,2,5,2,6,3,2,8,-1,-1,-1,-1,
  2,3,11,10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  11,0,8,11,2,0,10,6,5,-1,-1,-1,-1,-1,-1,-1,
  0,1,9,2,3,11,5,10,6,-1,-1,-1,-1,-1,-1,-1,
  5,10,6,1,9,2,9,11,2,9,8,11,-1,-1,-1,-1,
  6,3,11,6,5,3,5,1,3,-1,-1,-1,-1,-1,-1,-1,
  0,8,11,0,11,5,0,5,1,5,11,6,-1,-1,-1,-1,
  3,11,6,0,3,6,0,6,5,0,5,9,-1,-1,-1,-1,
  6,5,9,6,9,11,11,9,8,-1,-1,-1,-1,-1,-1,-1,
  5,10,6,4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  4,3,0,4,7,3,6,5,10,-1,-1,-1,-1,-1,-1,-1,
  1,9,0,5,10,6,8,4,7,-1,-1,-1,-1,-1,-1,-1,
  10,6,5,1,9,7,1,7,3,7,9,4,-1,-1,-1,-1,
  6,1,2,6,5,1,4,7,8,-1,-1,-1,-1,-1,-1,-1,
  1,2,5,5,2,6,3,0,4,3,4,7,-1,-1,-1,-1,
  8,4,7,9,0,5,0,6,5,0,2,6,-1,-1,-1,-1,
  7,3,9,7,9,4,3,2,9,5,9,6,2,6,9,-1,
  3,11,2,7,8,4,10,6,5,-1,-1,-1,-1,-1,-1,-1,
  5,10,6,4,7,2,4,2,0,2,7,11,-1,-1,-1,-1,
  0,1,9,4,7,8,2,3,11,5,10,6,-1,-1,-1,-1,
  9,2,1,9,11,2,9,4,11,7,11,4,5,10,6,-1,
  8,4,7,3,11,5,3,5,1,5,11,6,-1,-1,-1,-1,
  5,1,11,5,11,6,1,0,11,7,11,4,0,4,11,-1,
  0,5,9,0,6,5,0,3,6,11,6,3,8,4,7,-1,
  6,5,9,6,9,11,4,7,9,7,11,9,-1,-1,-1,-1,
  10,4,9,6,4,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  4,10,6,4,9,10,0,8,3,-1,-1,-1,-1,-1,-1,-1,
  10,0,1,10,6,0,6,4,0,-1,-1,-1,-1,-1,-1,-1,
  8,3,1,8,1,6,8,6,4,6,1,10,-1,-1,-1,-1,
  1,4,9,1,2,4,2,6,4,-1,-1,-1,-1,-1,-1,-1,
  3,0,8,1,2,9,2,4,9,2,6,4,-1,-1,-1,-1,
  0,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  8,3,2,8,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1,
  10,4,9,10,6,4,11,2,3,-1,-1,-1,-1,-1,-1,-1,
  0,8,2,2,8,11,4,9,10,4,10,6,-1,-1,-1,-1,
  3,11,2,0,1,6,0,6,4,6,1,10,-1,-1,-1,-1,
  6,4,1,6,1,10,4,8,1,2,1,11,8,11,1,-1,
  9,6,4,9,3,6,9,1,3,11,6,3,-1,-1,-1,-1,
  8,11,1,8,1,0,11,6,1,9,1,4,6,4,1,-1,
  3,11,6,3,6,0,0,6,4,-1,-1,-1,-1,-1,-1,-1,
  6,4,8,11,6,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  7,10,6,7,8,10,8,9,10,-1,-1,-1,-1,-1,-1,-1,
  0,7,3,0,10,7,0,9,10,6,7,10,-1,-1,-1,-1,
  10,6,7,1,10,7,1,7,8,1,8,0,-1,-1,-1,-1,
  10,6,7,10,7,1,1,7,3,-1,-1,-1,-1,-1,-1,-1,
  1,2,6,1,6,8,1,8,9,8,6,7,-1,-1,-1,-1,
  2,6,9,2,9,1,6,7,9,0,9,3,7,3,9,-1,
  7,8,0,7,0,6,6,0,2,-1,-1,-1,-1,-1,-1,-1,
  7,3,2,6,7,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  2,3,11,10,6,8,10,8,9,8,6,7,-1,-1,-1,-1,
  2,0,7,2,7,11,0,9,7,6,7,10,9,10,7,-1,
  1,8,0,1,7,8,1,10,7,6,7,10,2,3,11,-1,
  11,2,1,11,1,7,10,6,1,6,7,1,-1,-1,-1,-1,
  8,9,6,8,6,7,9,1,6,11,6,3,1,3,6,-1,
  0,9,1,11,6,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  7,8,0,7,0,6,3,11,0,11,6,0,-1,-1,-1,-1,
  7,11,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  3,0,8,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,1,9,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  8,1,9,8,3,1,11,7,6,-1,-1,-1,-1,-1,-1,-1,
  10,1,2,6,11,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  1,2,10,3,0,8,6,11,7,-1,-1,-1,-1,-1,-1,-1,
  2,9,0,2,10,9,6,11,7,-1,-1,-1,-1,-1,-1,-1,
  6,11,7,2,10,3,10,8,3,10,9,8,-1,-1,-1,-1,
  7,2,3,6,2,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  7,0,8,7,6,0,6,2,0,-1,-1,-1,-1,-1,-1,-1,
  2,7,6,2,3,7,0,1,9,-1,-1,-1,-1,-1,-1,-1,
  1,6,2,1,8,6,1,9,8,8,7,6,-1,-1,-1,-1,
  10,7,6,10,1,7,1,3,7,-1,-1,-1,-1,-1,-1,-1,
  10,7,6,1,7,10,1,8,7,1,0,8,-1,-1,-1,-1,
  0,3,7,0,7,10,0,10,9,6,10,7,-1,-1,-1,-1,
  7,6,10,7,10,8,8,10,9,-1,-1,-1,-1,-1,-1,-1,
  6,8,4,11,8,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  3,6,11,3,0,6,0,4,6,-1,-1,-1,-1,-1,-1,-1,
  8,6,11,8,4,6,9,0,1,-1,-1,-1,-1,-1,-1,-1,
  9,4,6,9,6,3,9,3,1,11,3,6,-1,-1,-1,-1,
  6,8,4,6,11,8,2,10,1,-1,-1,-1,-1,-1,-1,-1,
  1,2,10,3,0,11,0,6,11,0,4,6,-1,-1,-1,-1,
  4,11,8,4,6,11,0,2,9,2,10,9,-1,-1,-1,-1,
  10,9,3,10,3,2,9,4,3,11,3,6,4,6,3,-1,
  8,2,3,8,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1,
  0,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  1,9,0,2,3,4,2,4,6,4,3,8,-1,-1,-1,-1,
  1,9,4,1,4,2,2,4,6,-1,-1,-1,-1,-1,-1,-1,
  8,1,3,8,6,1,8,4,6,6,10,1,-1,-1,-1,-1,
  10,1,0,10,0,6,6,0,4,-1,-1,-1,-1,-1,-1,-1,
  4,6,3,4,3,8,6,10,3,0,3,9,10,9,3,-1,
  10,9,4,6,10,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  4,9,5,7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,8,3,4,9,5,11,7,6,-1,-1,-1,-1,-1,-1,-1,
  5,0,1,5,4,0,7,6,11,-1,-1,-1,-1,-1,-1,-1,
  11,7,6,8,3,4,3,5,4,3,1,5,-1,-1,-1,-1,
  9,5,4,10,1,2,7,6,11,-1,-1,-1,-1,-1,-1,-1,
  6,11,7,1,2,10,0,8,3,4,9,5,-1,-1,-1,-1,
  7,6,11,5,4,10,4,2,10,4,0,2,-1,-1,-1,-1,
  3,4,8,3,5,4,3,2,5,10,5,2,11,7,6,-1,
  7,2,3,7,6,2,5,4,9,-1,-1,-1,-1,-1,-1,-1,
  9,5,4,0,8,6,0,6,2,6,8,7,-1,-1,-1,-1,
  3,6,2,3,7,6,1,5,0,5,4,0,-1,-1,-1,-1,
  6,2,8,6,8,7,2,1,8,4,8,5,1,5,8,-1,
  9,5,4,10,1,6,1,7,6,1,3,7,-1,-1,-1,-1,
  1,6,10,1,7,6,1,0,7,8,7,0,9,5,4,-1,
  4,0,10,4,10,5,0,3,10,6,10,7,3,7,10,-1,
  7,6,10,7,10,8,5,4,10,4,8,10,-1,-1,-1,-1,
  6,9,5,6,11,9,11,8,9,-1,-1,-1,-1,-1,-1,-1,
  3,6,11,0,6,3,0,5,6,0,9,5,-1,-1,-1,-1,
  0,11,8,0,5,11,0,1,5,5,6,11,-1,-1,-1,-1,
  6,11,3,6,3,5,5,3,1,-1,-1,-1,-1,-1,-1,-1,
  1,2,10,9,5,11,9,11,8,11,5,6,-1,-1,-1,-1,
  0,11,3,0,6,11,0,9,6,5,6,9,1,2,10,-1,
  11,8,5,11,5,6,8,0,5,10,5,2,0,2,5,-1,
  6,11,3,6,3,5,2,10,3,10,5,3,-1,-1,-1,-1,
  5,8,9,5,2,8,5,6,2,3,8,2,-1,-1,-1,-1,
  9,5,6,9,6,0,0,6,2,-1,-1,-1,-1,-1,-1,-1,
  1,5,8,1,8,0,5,6,8,3,8,2,6,2,8,-1,
  1,5,6,2,1,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  1,3,6,1,6,10,3,8,6,5,6,9,8,9,6,-1,
  10,1,0,10,0,6,9,5,0,5,6,0,-1,-1,-1,-1,
  0,3,8,5,6,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  10,5,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  11,5,10,7,5,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  11,5,10,11,7,5,8,3,0,-1,-1,-1,-1,-1,-1,-1,
  5,11,7,5,10,11,1,9,0,-1,-1,-1,-1,-1,-1,-1,
  10,7,5,10,11,7,9,8,1,8,3,1,-1,-1,-1,-1,
  11,1,2,11,7,1,7,5,1,-1,-1,-1,-1,-1,-1,-1,
  0,8,3,1,2,7,1,7,5,7,2,11,-1,-1,-1,-1,
  9,7,5,9,2,7,9,0,2,2,11,7,-1,-1,-1,-1,
  7,5,2,7,2,11,5,9,2,3,2,8,9,8,2,-1,
  2,5,10,2,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1,
  8,2,0,8,5,2,8,7,5,10,2,5,-1,-1,-1,-1,
  9,0,1,5,10,3,5,3,7,3,10,2,-1,-1,-1,-1,
  9,8,2,9,2,1,8,7,2,10,2,5,7,5,2,-1,
  1,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,8,7,0,7,1,1,7,5,-1,-1,-1,-1,-1,-1,-1,
  9,0,3,9,3,5,5,3,7,-1,-1,-1,-1,-1,-1,-1,
  9,8,7,5,9,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  5,8,4,5,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1,
  5,0,4,5,11,0,5,10,11,11,3,0,-1,-1,-1,-1,
  0,1,9,8,4,10,8,10,11,10,4,5,-1,-1,-1,-1,
  10,11,4,10,4,5,11,3,4,9,4,1,3,1,4,-1,
  2,5,1,2,8,5,2,11,8,4,5,8,-1,-1,-1,-1,
  0,4,11,0,11,3,4,5,11,2,11,1,5,1,11,-1,
  0,2,5,0,5,9,2,11,5,4,5,8,11,8,5,-1,
  9,4,5,2,11,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  2,5,10,3,5,2,3,4,5,3,8,4,-1,-1,-1,-1,
  5,10,2,5,2,4,4,2,0,-1,-1,-1,-1,-1,-1,-1,
  3,10,2,3,5,10,3,8,5,4,5,8,0,1,9,-1,
  5,10,2,5,2,4,1,9,2,9,4,2,-1,-1,-1,-1,
  8,4,5,8,5,3,3,5,1,-1,-1,-1,-1,-1,-1,-1,
  0,4,5,1,0,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  8,4,5,8,5,3,9,0,5,0,3,5,-1,-1,-1,-1,
  9,4,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  4,11,7,4,9,11,9,10,11,-1,-1,-1,-1,-1,-1,-1,
  0,8,3,4,9,7,9,11,7,9,10,11,-1,-1,-1,-1,
  1,10,11,1,11,4,1,4,0,7,4,11,-1,-1,-1,-1,
  3,1,4,3,4,8,1,10,4,7,4,11,10,11,4,-1,
  4,11,7,9,11,4,9,2,11,9,1,2,-1,-1,-1,-1,
  9,7,4,9,11,7,9,1,11,2,11,1,0,8,3,-1,
  11,7,4,11,4,2,2,4,0,-1,-1,-1,-1,-1,-1,-1,
  11,7,4,11,4,2,8,3,4,3,2,4,-1,-1,-1,-1,
  2,9,10,2,7,9,2,3,7,7,4,9,-1,-1,-1,-1,
  9,10,7,9,7,4,10,2,7,8,7,0,2,0,7,-1,
  3,7,10,3,10,2,7,4,10,1,10,0,4,0,10,-1,
  1,10,2,8,7,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  4,9,1,4,1,7,7,1,3,-1,-1,-1,-1,-1,-1,-1,
  4,9,1,4,1,7,0,8,1,8,7,1,-1,-1,-1,-1,
  4,0,3,7,4,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  4,8,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  9,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  3,0,9,3,9,11,11,9,10,-1,-1,-1,-1,-1,-1,-1,
  0,1,10,0,10,8,8,10,11,-1,-1,-1,-1,-1,-1,-1,
  3,1,10,11,3,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  1,2,11,1,11,9,9,11,8,-1,-1,-1,-1,-1,-1,-1,
  3,0,9,3,9,11,1,2,9,2,11,9,-1,-1,-1,-1,
  0,2,11,8,0,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  3,2,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  2,3,8,2,8,10,10,8,9,-1,-1,-1,-1,-1,-1,-1,
  9,10,2,0,9,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  2,3,8,2,8,10,0,1,8,1,10,8,-1,-1,-1,-1,
  1,10,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  1,3,8,9,1,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,9,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,3,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
]);
/* eslint-enable */

// ── Field helpers ───────────────────────────────────────────────────────────

/** Index into a flat (nx,ny,nz) field. x fastest, then y, then z. */
export function fieldIndex(x: number, y: number, z: number, nx: number, ny: number): number {
  return x + y * nx + z * nx * ny;
}

/**
 * Central-difference gradient at a grid node. Returns a unit vector.
 * Falls back to forward/backward difference at boundaries. Used as per-vertex
 * normal direction — the gradient of F points along the outward normal of the
 * level set F = T (assuming "inside" is F > T, which MC also assumes).
 */
function fieldGradient(
  field: Float32Array,
  x: number, y: number, z: number,
  nx: number, ny: number, nz: number,
  out: [number, number, number],
): void {
  const gx = (x > 0 && x < nx - 1)
    ? (field[fieldIndex(x + 1, y, z, nx, ny)] - field[fieldIndex(x - 1, y, z, nx, ny)]) * 0.5
    : x === 0
      ? field[fieldIndex(1, y, z, nx, ny)] - field[fieldIndex(0, y, z, nx, ny)]
      : field[fieldIndex(nx - 1, y, z, nx, ny)] - field[fieldIndex(nx - 2, y, z, nx, ny)];
  const gy = (y > 0 && y < ny - 1)
    ? (field[fieldIndex(x, y + 1, z, nx, ny)] - field[fieldIndex(x, y - 1, z, nx, ny)]) * 0.5
    : y === 0
      ? field[fieldIndex(x, 1, z, nx, ny)] - field[fieldIndex(x, 0, z, nx, ny)]
      : field[fieldIndex(x, ny - 1, z, nx, ny)] - field[fieldIndex(x, ny - 2, z, nx, ny)];
  const gz = (z > 0 && z < nz - 1)
    ? (field[fieldIndex(x, y, z + 1, nx, ny)] - field[fieldIndex(x, y, z - 1, nx, ny)]) * 0.5
    : z === 0
      ? field[fieldIndex(x, y, 1, nx, ny)] - field[fieldIndex(x, y, 0, nx, ny)]
      : field[fieldIndex(x, y, nz - 1, nx, ny)] - field[fieldIndex(x, y, nz - 2, nx, ny)];
  // Outward normal of an iso level is -grad(F) when F>T means inside. Tests
  // cover a simple inside-positive convention so we negate here.
  const lx = -gx, ly = -gy, lz = -gz;
  const mag = Math.hypot(lx, ly, lz);
  if (mag < 1e-12) {
    out[0] = 0; out[1] = 1; out[2] = 0;
    return;
  }
  const inv = 1 / mag;
  out[0] = lx * inv; out[1] = ly * inv; out[2] = lz * inv;
}

// ── Main entry point ────────────────────────────────────────────────────────

export interface MarchingCubesOptions {
  /** Iso threshold. Defaults to 0 — useful for signed distance fields. */
  threshold?: number;
  /**
   * World-space center of the output mesh. Defaults to the grid's geometric
   * center, so a symmetric field produces a mesh centered on the origin.
   */
  center?: [number, number, number];
  /**
   * Uniform scale applied to grid-space coordinates. Defaults to 1 (one unit
   * per grid step). For a 32³ grid rendering in a ~2-unit preview, use 2/32.
   */
  scale?: number;
}

/**
 * Build a smooth triangulated isosurface from a scalar field.
 *
 * Notes on correctness:
 *  - Ambiguous face cases (5,10,etc.) are *not* disambiguated here. The result
 *    on degenerate patterns may have topological quirks, but this matches
 *    every widely-used implementation and is acceptable for seed previews.
 *  - Edge-midpoint interpolation is linear: `v = a + t*(b-a)` where `t` clamps
 *    inside [0,1] for numerical stability. When both corners are exactly at
 *    the threshold we fall back to the geometric midpoint.
 */
export function marchingCubes(
  field: Float32Array,
  dims: [number, number, number],
  options: MarchingCubesOptions = {},
): MeshData {
  const [nx, ny, nz] = dims;
  if (field.length !== nx * ny * nz) {
    throw new Error(`marchingCubes: field length ${field.length} ≠ ${nx}*${ny}*${nz}`);
  }
  const threshold = options.threshold ?? 0;
  const scale = options.scale ?? 1;
  const cx = options.center?.[0] ?? (nx - 1) * 0.5 * scale;
  const cy = options.center?.[1] ?? (ny - 1) * 0.5 * scale;
  const cz = options.center?.[2] ?? (nz - 1) * 0.5 * scale;

  const verts: number[] = [];
  const norms: number[] = [];
  const tris: number[] = [];

  // Vertex dedup: key on (voxel x, y, z, edge-axis). edge-axis is 0/1/2 for
  // X/Y/Z-aligned edges. This uniquely identifies any grid edge by the "lower"
  // endpoint coordinate + its direction.
  // Packing: ((z*ny + y)*nx + x)*3 + axis. Axis 0..2.
  const EDGE_AXIS_X = 0, EDGE_AXIS_Y = 1, EDGE_AXIS_Z = 2;
  const edgeVertexIndex = new Map<number, number>();

  // For each of the 12 cube edges, the base voxel offset + axis to use for the key.
  // Derived from the canonical edge layout so all 8 cubes sharing an edge
  // agree on the same key.
  const EDGE_KEY: ReadonlyArray<readonly [number, number, number, number]> = [
    [0, 0, 0, EDGE_AXIS_X], // 0: v0→v1
    [1, 0, 0, EDGE_AXIS_Z], // 1: v1→v2
    [0, 0, 1, EDGE_AXIS_X], // 2: v3→v2 = (0,0,1)→(1,0,1) in X
    [0, 0, 0, EDGE_AXIS_Z], // 3: v0→v3
    [0, 1, 0, EDGE_AXIS_X], // 4: v4→v5
    [1, 1, 0, EDGE_AXIS_Z], // 5: v5→v6
    [0, 1, 1, EDGE_AXIS_X], // 6: v7→v6
    [0, 1, 0, EDGE_AXIS_Z], // 7: v4→v7
    [0, 0, 0, EDGE_AXIS_Y], // 8: v0→v4
    [1, 0, 0, EDGE_AXIS_Y], // 9: v1→v5
    [1, 0, 1, EDGE_AXIS_Y], // 10: v2→v6
    [0, 0, 1, EDGE_AXIS_Y], // 11: v3→v7
  ];

  const gBuf: [number, number, number] = [0, 0, 0];
  const gA: [number, number, number] = [0, 0, 0];
  const gB: [number, number, number] = [0, 0, 0];

  /**
   * Return the deduped vertex index for edge `edgeIdx` in cube (x,y,z).
   * Computes & caches the vertex on first call.
   */
  const vertexForEdge = (x: number, y: number, z: number, edgeIdx: number): number => {
    const ekey = EDGE_KEY[edgeIdx];
    const ex = x + ekey[0], ey = y + ekey[1], ez = z + ekey[2], axis = ekey[3];
    const key = (((ez * ny + ey) * nx + ex) * 3) + axis;
    const cached = edgeVertexIndex.get(key);
    if (cached !== undefined) return cached;

    const [cornerA, cornerB] = EDGE_CORNERS[edgeIdx];
    const [ax, ay, az] = CORNER_OFFSETS[cornerA];
    const [bx, by, bz] = CORNER_OFFSETS[cornerB];
    const Ax = x + ax, Ay = y + ay, Az = z + az;
    const Bx = x + bx, By = y + by, Bz = z + bz;
    const Va = field[fieldIndex(Ax, Ay, Az, nx, ny)];
    const Vb = field[fieldIndex(Bx, By, Bz, nx, ny)];

    // Interpolation parameter: linear solve for V(t) = T.
    // If Vb === Va (shouldn't happen when signs differ, but be defensive)
    // fall back to the midpoint.
    const denom = Vb - Va;
    let t: number;
    if (Math.abs(denom) < 1e-12) {
      t = 0.5;
    } else {
      t = (threshold - Va) / denom;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
    }

    const vx = (Ax + t * (Bx - Ax)) * scale - cx;
    const vy = (Ay + t * (By - Ay)) * scale - cy;
    const vz = (Az + t * (Bz - Az)) * scale - cz;

    // Interpolate gradient-based normals at the two endpoints, then blend
    // with the same parameter. Good results on smooth fields and matches
    // the standard MC "smooth normals" recipe.
    fieldGradient(field, Ax, Ay, Az, nx, ny, nz, gA);
    fieldGradient(field, Bx, By, Bz, nx, ny, nz, gB);
    let nxv = gA[0] + t * (gB[0] - gA[0]);
    let nyv = gA[1] + t * (gB[1] - gA[1]);
    let nzv = gA[2] + t * (gB[2] - gA[2]);
    const nmag = Math.hypot(nxv, nyv, nzv);
    if (nmag < 1e-12) {
      // Degenerate — use the local gradient at vertex A.
      fieldGradient(field, Ax, Ay, Az, nx, ny, nz, gBuf);
      nxv = gBuf[0]; nyv = gBuf[1]; nzv = gBuf[2];
    } else {
      const inv = 1 / nmag;
      nxv *= inv; nyv *= inv; nzv *= inv;
    }

    const newIdx = verts.length / 3;
    verts.push(vx, vy, vz);
    norms.push(nxv, nyv, nzv);
    edgeVertexIndex.set(key, newIdx);
    return newIdx;
  };

  // Walk every cube in the lattice.
  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        let cubeIndex = 0;
        // Build the 8-bit lookup key: bit i set iff corner i is "below" the surface.
        // Corner index order matches CORNER_OFFSETS above.
        for (let i = 0; i < 8; i++) {
          const [ox, oy, oz] = CORNER_OFFSETS[i];
          const v = field[fieldIndex(x + ox, y + oy, z + oz, nx, ny)];
          if (v < threshold) cubeIndex |= (1 << i);
        }
        if (EDGE_TABLE[cubeIndex] === 0) continue;

        const base = cubeIndex * 16;
        for (let i = 0; i < 16; i += 3) {
          const a = TRI_TABLE[base + i];
          if (a === -1) break;
          const b = TRI_TABLE[base + i + 1];
          const c = TRI_TABLE[base + i + 2];
          const ia = vertexForEdge(x, y, z, a);
          const ib = vertexForEdge(x, y, z, b);
          const ic = vertexForEdge(x, y, z, c);
          tris.push(ia, ib, ic);
        }
      }
    }
  }

  return {
    vertices: new Float32Array(verts),
    indices: new Uint32Array(tris),
    normals: new Float32Array(norms),
  };
}
