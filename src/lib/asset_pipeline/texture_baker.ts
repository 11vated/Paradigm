import { MeshData } from './mesh_extractor.js';

export class TextureBaker {
  // Bakes field data into vertex colors (a simple form of texturing for our voxel meshes)
  static bakeVertexColors(mesh: MeshData, field: Float32Array, dims: [number, number, number], colorMap: (val: number) => [number, number, number]): MeshData {
    const colors = new Float32Array(mesh.vertices.length);
    const [nx, ny, nz] = dims;
    
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      // Map vertex position back to grid coordinates
      const vx = mesh.vertices[i] + nx / 2;
      const vy = mesh.vertices[i+1] + ny / 2;
      const vz = mesh.vertices[i+2] + nz / 2;
      
      // Nearest neighbor interpolation for simplicity
      const gx = Math.max(0, Math.min(nx - 1, Math.round(vx)));
      const gy = Math.max(0, Math.min(ny - 1, Math.round(vy)));
      const gz = Math.max(0, Math.min(nz - 1, Math.round(vz)));
      
      const idx = gx * ny * nz + gy * nz + gz;
      const val = field[idx];
      
      const [r, g, b] = colorMap(val);
      colors[i] = r;
      colors[i+1] = g;
      colors[i+2] = b;
    }
    
    mesh.colors = colors;
    return mesh;
  }
}
