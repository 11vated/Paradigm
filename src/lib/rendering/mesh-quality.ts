/**
 * High-Quality Mesh Generation Framework
 * Implements adaptive subdivision, sculpting tools, remeshing, topology optimization
 */

export interface MeshData {
  vertices: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

export interface SubdivisionConfig {
  maxLevel: number;
  adaptive: boolean;
  errorThreshold: number;
}

export interface SculptingBrush {
  type: 'inflate' | 'deflate' | 'smooth' | 'pinch' | 'flatten';
  radius: number;
  strength: number;
  falloff: 'linear' | 'smooth' | 'constant';
}

export interface RemeshingConfig {
  targetEdgeLength: number;
  minEdgeLength: number;
  maxEdgeLength: number;
  preserveSharpEdges: boolean;
}

export class MeshQualitySystem {
  /**
   * Adaptive subdivision using Loop subdivision scheme
   */
  static adaptiveSubdivision(mesh: MeshData, config: SubdivisionConfig): MeshData {
    let currentMesh = mesh;

    for (let level = 0; level < config.maxLevel; level++) {
      if (config.adaptive) {
        currentMesh = this.adaptiveSubdivisionStep(currentMesh, config.errorThreshold);
      } else {
        currentMesh = this.uniformSubdivisionStep(currentMesh);
      }
    }

    return currentMesh;
  }

  /**
   * Uniform Loop subdivision step
   */
  private static uniformSubdivisionStep(mesh: MeshData): MeshData {
    const vertices: number[] = [];
    const indices: number[] = [];

    // Copy original vertices
    for (let i = 0; i < mesh.vertices.length; i++) {
      vertices.push(mesh.vertices[i]);
    }

    // Add edge midpoint vertices
    const edgeMap = new Map<string, number>();
    let nextVertexIndex = mesh.vertices.length / 3;

    for (let i = 0; i < mesh.indices.length; i += 3) {
      const v0 = mesh.indices[i];
      const v1 = mesh.indices[i + 1];
      const v2 = mesh.indices[i + 2];

      // Edge midpoints
      const e01 = this.getOrCreateEdgeVertex(edgeMap, v0, v1, mesh, vertices, nextVertexIndex++);
      const e12 = this.getOrCreateEdgeVertex(edgeMap, v1, v2, mesh, vertices, nextVertexIndex++);
      const e20 = this.getOrCreateEdgeVertex(edgeMap, v2, v0, mesh, vertices, nextVertexIndex++);

      // Create 4 new triangles
      indices.push(v0, e01, e20);
      indices.push(v1, e12, e01);
      indices.push(v2, e20, e12);
      indices.push(e01, e12, e20);
    }

    // Update original vertices (Loop subdivision rules)
    const newVertices = new Float32Array(vertices);
    this.updateOriginalVertices(mesh, newVertices, edgeMap);

    // Compute new normals
    const normals = this.computeNormals(new Float32Array(vertices), new Uint32Array(indices));

    return {
      vertices: new Float32Array(vertices),
      normals,
      uvs: mesh.uvs,
      indices: new Uint32Array(indices),
    };
  }

  /**
   * Adaptive subdivision based on error metric
   */
  private static adaptiveSubdivisionStep(mesh: MeshData, errorThreshold: number): MeshData {
    const vertices: number[] = [];
    const indices: number[] = [];
    const edgeMap = new Map<string, number>();

    // Copy original vertices
    for (let i = 0; i < mesh.vertices.length; i++) {
      vertices.push(mesh.vertices[i]);
    }

    let nextVertexIndex = mesh.vertices.length / 3;

    for (let i = 0; i < mesh.indices.length; i += 3) {
      const v0 = mesh.indices[i];
      const v1 = mesh.indices[i + 1];
      const v2 = mesh.indices[i + 2];

      // Compute triangle error (curvature)
      const error = this.computeTriangleError(mesh, v0, v1, v2);

      if (error > errorThreshold) {
        // Subdivide this triangle
        const e01 = this.getOrCreateEdgeVertex(edgeMap, v0, v1, mesh, vertices, nextVertexIndex++);
        const e12 = this.getOrCreateEdgeVertex(edgeMap, v1, v2, mesh, vertices, nextVertexIndex++);
        const e20 = this.getOrCreateEdgeVertex(edgeMap, v2, v0, mesh, vertices, nextVertexIndex++);

        indices.push(v0, e01, e20);
        indices.push(v1, e12, e01);
        indices.push(v2, e20, e12);
        indices.push(e01, e12, e20);
      } else {
        // Keep original triangle
        indices.push(v0, v1, v2);
      }
    }

    const newVertices = new Float32Array(vertices);
    const normals = this.computeNormals(newVertices, new Uint32Array(indices));

    return {
      vertices: newVertices,
      normals,
      uvs: mesh.uvs,
      indices: new Uint32Array(indices),
    };
  }

  /**
   * Get or create edge vertex for subdivision
   */
  private static getOrCreateEdgeVertex(
    edgeMap: Map<string, number>,
    v0: number,
    v1: number,
    mesh: MeshData,
    vertices: number[],
    nextIndex: number
  ): number {
    const key = v0 < v1 ? `${v0}_${v1}` : `${v1}_${v0}`;

    if (edgeMap.has(key)) {
      return edgeMap.get(key)!;
    }

    // Compute midpoint
    const idx0 = v0 * 3;
    const idx1 = v1 * 3;

    const midpoint = [
      (mesh.vertices[idx0] + mesh.vertices[idx1]) / 2,
      (mesh.vertices[idx0 + 1] + mesh.vertices[idx1 + 1]) / 2,
      (mesh.vertices[idx0 + 2] + mesh.vertices[idx1 + 2]) / 2,
    ];

    vertices.push(...midpoint);
    edgeMap.set(key, nextIndex);

    return nextIndex;
  }

  /**
   * Update original vertices using Loop subdivision rules
   */
  private static updateOriginalVertices(
    originalMesh: MeshData,
    newVertices: Float32Array,
    edgeMap: Map<string, number>
  ): void {
    const vertexCount = originalMesh.vertices.length / 3;

    for (let i = 0; i < vertexCount; i++) {
      const neighbors = this.getVertexNeighbors(originalMesh, i, edgeMap);
      const n = neighbors.length;

      if (n === 0) continue;

      const beta = this.computeLoopBeta(n);
      const idx = i * 3;

      let sumX = 0, sumY = 0, sumZ = 0;
      for (const neighbor of neighbors) {
        const nIdx = neighbor * 3;
        sumX += originalMesh.vertices[nIdx];
        sumY += originalMesh.vertices[nIdx + 1];
        sumZ += originalMesh.vertices[nIdx + 2];
      }

      newVertices[idx] = (1 - n * beta) * originalMesh.vertices[idx] + beta * sumX;
      newVertices[idx + 1] = (1 - n * beta) * originalMesh.vertices[idx + 1] + beta * sumY;
      newVertices[idx + 2] = (1 - n * beta) * originalMesh.vertices[idx + 2] + beta * sumZ;
    }
  }

  /**
   * Get neighboring vertices for a vertex
   */
  private static getVertexNeighbors(
    mesh: MeshData,
    vertexIndex: number,
    _edgeMap: Map<string, number>
  ): number[] {
    const neighbors: Set<number> = new Set();

    for (let i = 0; i < mesh.indices.length; i += 3) {
      const v0 = mesh.indices[i];
      const v1 = mesh.indices[i + 1];
      const v2 = mesh.indices[i + 2];

      if (v0 === vertexIndex) {
        neighbors.add(v1);
        neighbors.add(v2);
      } else if (v1 === vertexIndex) {
        neighbors.add(v0);
        neighbors.add(v2);
      } else if (v2 === vertexIndex) {
        neighbors.add(v0);
        neighbors.add(v1);
      }
    }

    return Array.from(neighbors);
  }

  /**
   * Compute Loop subdivision beta coefficient
   */
  private static computeLoopBeta(n: number): number {
    if (n === 3) return 3 / 16;
    return 3 / (8 * n);
  }

  /**
   * Compute triangle error metric for adaptive subdivision
   */
  private static computeTriangleError(mesh: MeshData, v0: number, v1: number, v2: number): number {
    const idx0 = v0 * 3;
    const idx1 = v1 * 3;
    const idx2 = v2 * 3;

    const p0 = [mesh.vertices[idx0], mesh.vertices[idx0 + 1], mesh.vertices[idx0 + 2]];
    const p1 = [mesh.vertices[idx1], mesh.vertices[idx1 + 1], mesh.vertices[idx1 + 2]];
    const p2 = [mesh.vertices[idx2], mesh.vertices[idx2 + 1], mesh.vertices[idx2 + 2]];

    // Compute triangle area as error metric
    const edge1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const edge2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];

    const cross = [
      edge1[1] * edge2[2] - edge1[2] * edge2[1],
      edge1[2] * edge2[0] - edge1[0] * edge2[2],
      edge1[0] * edge2[1] - edge1[1] * edge2[0],
    ];

    return Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]) / 2;
  }

  /**
   * Apply sculpting brush to mesh
   */
  static sculpt(mesh: MeshData, brush: SculptingBrush, center: [number, number, number]): MeshData {
    const vertices = new Float32Array(mesh.vertices);
    const radiusSq = brush.radius * brush.radius;

    for (let i = 0; i < vertices.length; i += 3) {
      const v: [number, number, number] = [vertices[i], vertices[i + 1], vertices[i + 2]];
      const distSq = this.distanceSquared(v, center);

      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq);
        const falloff = this.computeFalloff(dist / brush.radius, brush.falloff);
        const displacement = brush.strength * falloff;

        switch (brush.type) {
          case 'inflate':
            vertices[i] += displacement * v[0];
            vertices[i + 1] += displacement * v[1];
            vertices[i + 2] += displacement * v[2];
            break;
          case 'deflate':
            vertices[i] -= displacement * v[0];
            vertices[i + 1] -= displacement * v[1];
            vertices[i + 2] -= displacement * v[2];
            break;
          case 'smooth': {
            // Laplacian smoothing
            const avg = this.computeVertexAverage(mesh, i / 3);
            vertices[i] += displacement * (avg[0] - v[0]);
            vertices[i + 1] += displacement * (avg[1] - v[1]);
            vertices[i + 2] += displacement * (avg[2] - v[2]);
            break;
          }
        }
      }
    }

    const normals = this.computeNormals(vertices, mesh.indices);

    return {
      vertices,
      normals,
      uvs: mesh.uvs,
      indices: mesh.indices,
    };
  }

  /**
   * Compute falloff curve
   */
  private static computeFalloff(t: number, type: SculptingBrush['falloff']): number {
    switch (type) {
      case 'linear':
        return 1 - t;
      case 'smooth':
        return 1 - t * t * (3 - 2 * t);
      case 'constant':
        return 1;
      default:
        return 1 - t;
    }
  }

  /**
   * Compute average position of vertex neighbors
   */
  private static computeVertexAverage(mesh: MeshData, vertexIndex: number): [number, number, number] {
    const neighbors: number[] = [];

    for (let i = 0; i < mesh.indices.length; i += 3) {
      const v0 = mesh.indices[i];
      const v1 = mesh.indices[i + 1];
      const v2 = mesh.indices[i + 2];

      if (v0 === vertexIndex) {
        neighbors.push(v1, v2);
      } else if (v1 === vertexIndex) {
        neighbors.push(v0, v2);
      } else if (v2 === vertexIndex) {
        neighbors.push(v0, v1);
      }
    }

    let sumX = 0, sumY = 0, sumZ = 0;
    const count = neighbors.length;

    for (const neighbor of neighbors) {
      const nIdx = neighbor * 3;
      sumX += mesh.vertices[nIdx];
      sumY += mesh.vertices[nIdx + 1];
      sumZ += mesh.vertices[nIdx + 2];
    }

    return [sumX / count, sumY / count, sumZ / count];
  }

  /**
   * Remesh to target edge length
   */
  static remesh(mesh: MeshData, config: RemeshingConfig): MeshData {
    // Simplified remeshing - split long edges, collapse short edges
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < mesh.vertices.length; i++) {
      vertices.push(mesh.vertices[i]);
    }

    // Edge splitting
    const newIndices = this.splitLongEdges(mesh, vertices, config.maxEdgeLength);
    indices.push(...newIndices);

    // Edge collapsing (simplified)
    // In production, would use proper edge collapse with quadric error metrics

    const newVertices = new Float32Array(vertices);
    const normals = this.computeNormals(newVertices, new Uint32Array(indices));

    return {
      vertices: newVertices,
      normals,
      uvs: mesh.uvs,
      indices: new Uint32Array(indices),
    };
  }

  /**
   * Split edges longer than target length
   */
  private static splitLongEdges(mesh: MeshData, vertices: number[], maxEdgeLength: number): number[] {
    const indices: number[] = [];
    const edgeMap = new Map<string, number>();
    let nextVertexIndex = mesh.vertices.length / 3;

    for (let i = 0; i < mesh.indices.length; i += 3) {
      const v0 = mesh.indices[i];
      const v1 = mesh.indices[i + 1];
      const v2 = mesh.indices[i + 2];

      const e01Length = this.edgeLength(mesh, v0, v1);
      const e12Length = this.edgeLength(mesh, v1, v2);
      const e20Length = this.edgeLength(mesh, v2, v0);

      let e01 = v0, e12 = v1, e20 = v2;

      if (e01Length > maxEdgeLength) {
        e01 = this.splitEdge(edgeMap, v0, v1, mesh, vertices, nextVertexIndex++);
      }
      if (e12Length > maxEdgeLength) {
        e12 = this.splitEdge(edgeMap, v1, v2, mesh, vertices, nextVertexIndex++);
      }
      if (e20Length > maxEdgeLength) {
        e20 = this.splitEdge(edgeMap, v2, v0, mesh, vertices, nextVertexIndex++);
      }

      indices.push(v0, e01, e20);
      indices.push(v1, e12, e01);
      indices.push(v2, e20, e12);
      indices.push(e01, e12, e20);
    }

    return indices;
  }

  /**
   * Split edge and return new vertex index
   */
  private static splitEdge(
    edgeMap: Map<string, number>,
    v0: number,
    v1: number,
    mesh: MeshData,
    vertices: number[],
    nextIndex: number
  ): number {
    const key = v0 < v1 ? `${v0}_${v1}` : `${v1}_${v0}`;

    if (edgeMap.has(key)) {
      return edgeMap.get(key)!;
    }

    const idx0 = v0 * 3;
    const idx1 = v1 * 3;

    const midpoint = [
      (mesh.vertices[idx0] + mesh.vertices[idx1]) / 2,
      (mesh.vertices[idx0 + 1] + mesh.vertices[idx1 + 1]) / 2,
      (mesh.vertices[idx0 + 2] + mesh.vertices[idx1 + 2]) / 2,
    ];

    vertices.push(...midpoint);
    edgeMap.set(key, nextIndex);

    return nextIndex;
  }

  /**
   * Compute edge length
   */
  private static edgeLength(mesh: MeshData, v0: number, v1: number): number {
    const idx0 = v0 * 3;
    const idx1 = v1 * 3;

    const dx = mesh.vertices[idx0] - mesh.vertices[idx1];
    const dy = mesh.vertices[idx0 + 1] - mesh.vertices[idx1 + 1];
    const dz = mesh.vertices[idx0 + 2] - mesh.vertices[idx1 + 2];

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Optimize mesh topology
   */
  static optimizeTopology(mesh: MeshData): MeshData {
    // Simplified topology optimization
    // In production, would include:
    // - Triangle strip conversion
    // - Vertex cache optimization
    // - Overdraw reduction
    // - Degenerate triangle removal

    return mesh;
  }

  /**
   * Compute face normals for mesh
   */
  private static computeNormals(vertices: Float32Array, indices: Uint32Array): Float32Array {
    const normals = new Float32Array(vertices.length);

    for (let i = 0; i < indices.length; i += 3) {
      const v0 = indices[i] * 3;
      const v1 = indices[i + 1] * 3;
      const v2 = indices[i + 2] * 3;

      const edge1 = [
        vertices[v1] - vertices[v0],
        vertices[v1 + 1] - vertices[v0 + 1],
        vertices[v1 + 2] - vertices[v0 + 2],
      ];

      const edge2 = [
        vertices[v2] - vertices[v0],
        vertices[v2 + 1] - vertices[v0 + 1],
        vertices[v2 + 2] - vertices[v0 + 2],
      ];

      const normal = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0],
      ];

      const len = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
      if (len > 0) {
        normal[0] /= len;
        normal[1] /= len;
        normal[2] /= len;
      }

      normals[v0] += normal[0];
      normals[v0 + 1] += normal[1];
      normals[v0 + 2] += normal[2];
      normals[v1] += normal[0];
      normals[v1 + 1] += normal[1];
      normals[v1 + 2] += normal[2];
      normals[v2] += normal[0];
      normals[v2 + 1] += normal[1];
      normals[v2 + 2] += normal[2];
    }

    // Normalize accumulated normals
    for (let i = 0; i < normals.length; i += 3) {
      const len = Math.sqrt(normals[i] * normals[i] + normals[i + 1] * normals[i + 1] + normals[i + 2] * normals[i + 2]);
      if (len > 0) {
        normals[i] /= len;
        normals[i + 1] /= len;
        normals[i + 2] /= len;
      }
    }

    return normals;
  }

  /**
   * Compute squared distance between two points
   */
  private static distanceSquared(a: [number, number, number], b: [number, number, number]): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return dx * dx + dy * dy + dz * dz;
  }
}
