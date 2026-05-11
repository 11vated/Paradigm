import * as THREE from 'three';
import { MeshData } from './mesh_extractor.js';
import { type TextureMapSet } from '../rendering/texture-synthesis.js';

export type UVUnwrapMethod = 'planar' | 'cylindrical' | 'spherical' | 'triplanar' | 'box';
export type TextureCompressionFormat = 'none' | 'bc7' | 'astc' | 'etc2' | 'dxt5';

export interface UVUnwrapOptions {
  method: UVUnwrapMethod;
  scale?: number;
  offset?: [number, number];
  rotation?: number;
}

export interface TextureAtlasOptions {
  maxResolution: number;
  padding: number;
  channelSeparation?: boolean;
}

export interface MipmapOptions {
  maxLevels?: number;
  filter: 'nearest' | 'linear' | 'mipmap' | 'mipmap_linear';
}

export interface TextureCompressionOptions {
  format: TextureCompressionFormat;
  quality: 'low' | 'medium' | 'high';
}

export class TextureBaker {
  /**
   * Bakes field data into vertex colors (a simple form of texturing for our voxel meshes)
   */
  static bakeVertexColors(mesh: MeshData, field: Float32Array, dims: [number, number, number], colorMap: (val: number) => [number, number, number]): MeshData {
    const colors = new Float32Array(mesh.vertices.length);
    const [nx, ny, nz] = dims;
    
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const vx = mesh.vertices[i] + nx / 2;
      const vy = mesh.vertices[i+1] + ny / 2;
      const vz = mesh.vertices[i+2] + nz / 2;
      
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

  /**
   * Generate UV coordinates for a mesh using specified unwrapping method
   */
  static generateUVs(mesh: MeshData, options: UVUnwrapOptions): Float32Array {
    const uvs = new Float32Array((mesh.vertices.length / 3) * 2);
    const scale = options.scale || 1.0;
    const offset = options.offset || [0, 0];
    const rotation = options.rotation || 0;
    
    // Compute mesh bounds for normalization
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      minX = Math.min(minX, mesh.vertices[i]);
      maxX = Math.max(maxX, mesh.vertices[i]);
      minY = Math.min(minY, mesh.vertices[i+1]);
      maxY = Math.max(maxY, mesh.vertices[i+1]);
      minZ = Math.min(minZ, mesh.vertices[i+2]);
      maxZ = Math.max(maxZ, mesh.vertices[i+2]);
    }
    
    const sizeX = maxX - minX || 1;
    const sizeY = maxY - minY || 1;
    const sizeZ = maxZ - minZ || 1;
    
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const idx = (i / 3) * 2;
      const x = mesh.vertices[i];
      const y = mesh.vertices[i+1];
      const z = mesh.vertices[i+2];
      
      let u = 0, v = 0;
      
      switch (options.method) {
        case 'planar':
          u = ((x - minX) / sizeX) * scale + offset[0];
          v = ((y - minY) / sizeY) * scale + offset[1];
          break;
          
        case 'cylindrical':
          const angle = Math.atan2(z - minZ - sizeZ/2, x - minX - sizeX/2);
          u = ((angle / (Math.PI * 2)) + 0.5) * scale + offset[0];
          v = ((y - minY) / sizeY) * scale + offset[1];
          break;
          
        case 'spherical':
          const nx = (x - minX - sizeX/2) / (sizeX/2);
          const ny = (y - minY - sizeY/2) / (sizeY/2);
          const nz = (z - minZ - sizeZ/2) / (sizeZ/2);
          const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
          const theta = Math.acos(ny / len);
          const phi = Math.atan2(nz, nx);
          u = ((phi / (Math.PI * 2)) + 0.5) * scale + offset[0];
          v = (theta / Math.PI) * scale + offset[1];
          break;
          
        case 'triplanar':
          // Blend three planar projections based on normal direction
          const nxTri = Math.abs(x - minX - sizeX/2) / (sizeX/2);
          const nyTri = Math.abs(y - minY - sizeY/2) / (sizeY/2);
          const nzTri = Math.abs(z - minZ - sizeZ/2) / (sizeZ/2);
          const total = nxTri + nyTri + nzTri || 1;
          u = (nxTri * ((x - minX) / sizeX) + nyTri * ((y - minY) / sizeY) + nzTri * ((z - minZ) / sizeZ)) / total * scale + offset[0];
          v = (nxTri * ((y - minY) / sizeY) + nyTri * ((z - minZ) / sizeZ) + nzTri * ((x - minX) / sizeX)) / total * scale + offset[1];
          break;
          
        case 'box':
          // Project onto the face with largest normal component
          // For simplicity, use absolute position
          const absX = Math.abs(x - minX - sizeX/2);
          const absY = Math.abs(y - minY - sizeY/2);
          const absZ = Math.abs(z - minZ - sizeZ/2);
          
          if (absX >= absY && absX >= absZ) {
            u = ((y - minY) / sizeY) * scale + offset[0];
            v = ((z - minZ) / sizeZ) * scale + offset[1];
          } else if (absY >= absZ) {
            u = ((x - minX) / sizeX) * scale + offset[0];
            v = ((z - minZ) / sizeZ) * scale + offset[1];
          } else {
            u = ((x - minX) / sizeX) * scale + offset[0];
            v = ((y - minY) / sizeY) * scale + offset[1];
          }
          break;
      }
      
      // Apply rotation
      if (rotation !== 0) {
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        const uCentered = u - 0.5;
        const vCentered = v - 0.5;
        u = uCentered * cosR - vCentered * sinR + 0.5;
        v = uCentered * sinR + vCentered * cosR + 0.5;
      }
      
      uvs[idx] = u;
      uvs[idx + 1] = v;
    }
    
    return uvs;
  }

  /**
   * Generate texture atlas from multiple texture sets
   */
  static generateTextureAtlas(
    textureSets: { textureMaps: TextureMapSet; materialId: string }[],
    options: TextureAtlasOptions
  ): { atlas: Float32Array; layout: { materialId: string; x: number; y: number; width: number; height: number }[] } {
    const maxRes = options.maxResolution;
    const padding = options.padding;
    
    // Calculate total area needed
    let totalArea = 0;
    for (const set of textureSets) {
      const albedoTexture = set.textureMaps.albedo as THREE.Texture;
      const resolution = albedoTexture.image ? Math.sqrt((albedoTexture.image as HTMLCanvasElement).width * (albedoTexture.image as HTMLCanvasElement).height) : 1024;
      totalArea += (resolution + padding) * (resolution + padding);
    }
    
    // Determine atlas dimensions (power of 2)
    const atlasSize = Math.pow(2, Math.ceil(Math.log2(Math.sqrt(totalArea))));
    
    // Simple layout: pack textures in a grid
    const atlas = new Float32Array(atlasSize * atlasSize * 4);
    const layout: { materialId: string; x: number; y: number; width: number; height: number }[] = [];
    
    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;
    
    for (const set of textureSets) {
      const albedoTex = set.textureMaps.albedo as THREE.Texture;
      const texRes = albedoTex.image ? Math.sqrt((albedoTex.image as HTMLCanvasElement).width * (albedoTex.image as HTMLCanvasElement).height) : 1024;
      const texSize = texRes + padding;
      
      if (currentX + texSize > atlasSize) {
        currentX = 0;
        currentY += rowHeight;
        rowHeight = 0;
      }
      
      if (currentY + texSize > atlasSize) {
        throw new Error('Texture atlas too small for all textures');
      }
      
      // Copy albedo to atlas
      for (let y = 0; y < texRes; y++) {
        for (let x = 0; x < texRes; x++) {
          const srcIdx = (y * texRes + x) * 4;
          const dstIdx = ((currentY + y) * atlasSize + (currentX + x)) * 4;
          
          atlas[dstIdx] = set.textureMaps.albedo[srcIdx];
          atlas[dstIdx + 1] = set.textureMaps.albedo[srcIdx + 1];
          atlas[dstIdx + 2] = set.textureMaps.albedo[srcIdx + 2];
          atlas[dstIdx + 3] = set.textureMaps.albedo[srcIdx + 3];
        }
      }
      
      layout.push({
        materialId: set.materialId,
        x: currentX,
        y: currentY,
        width: texRes,
        height: texRes,
      });
      
      currentX += texSize;
      rowHeight = Math.max(rowHeight, texSize);
    }
    
    return { atlas, layout };
  }

  /**
   * Generate mipmaps for a texture
   */
  static generateMipmaps(texture: Float32Array, resolution: number, options: MipmapOptions): Float32Array[] {
    const maxLevels = options.maxLevels || Math.floor(Math.log2(resolution)) + 1;
    const mipmaps: Float32Array[] = [texture];
    
    let currentRes = resolution;
    let currentTex = texture;
    
    for (let level = 1; level < maxLevels; level++) {
      const nextRes = Math.max(1, Math.floor(currentRes / 2));
      const nextTex = new Float32Array(nextRes * nextRes * 4);
      
      for (let y = 0; y < nextRes; y++) {
        for (let x = 0; x < nextRes; x++) {
          const srcX = x * 2;
          const srcY = y * 2;
          
          let r = 0, g = 0, b = 0, a = 0;
          let count = 0;
          
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const sx = Math.min(srcX + dx, currentRes - 1);
              const sy = Math.min(srcY + dy, currentRes - 1);
              const srcIdx = (sy * currentRes + sx) * 4;
              
              if (options.filter === 'nearest') {
                if (dx === 0 && dy === 0) {
                  r = currentTex[srcIdx];
                  g = currentTex[srcIdx + 1];
                  b = currentTex[srcIdx + 2];
                  a = currentTex[srcIdx + 3];
                  count = 1;
                }
              } else {
                r += currentTex[srcIdx];
                g += currentTex[srcIdx + 1];
                b += currentTex[srcIdx + 2];
                a += currentTex[srcIdx + 3];
                count++;
              }
            }
          }
          
          if (options.filter !== 'nearest') {
            r /= count;
            g /= count;
            b /= count;
            a /= count;
          }
          
          const dstIdx = (y * nextRes + x) * 4;
          nextTex[dstIdx] = r;
          nextTex[dstIdx + 1] = g;
          nextTex[dstIdx + 2] = b;
          nextTex[dstIdx + 3] = a;
        }
      }
      
      mipmaps.push(nextTex);
      currentTex = nextTex;
      currentRes = nextRes;
      
      if (currentRes === 1) break;
    }
    
    return mipmaps;
  }

  /**
   * Compress texture (placeholder - actual compression would use external libraries)
   */
  static compressTexture(texture: Float32Array, resolution: number, options: TextureCompressionOptions): Uint8Array {
    // Placeholder for actual compression
    // In production, this would use:
    // - BC7: Basis Universal or DirectXTex
    // - ASTC: astcenc
    // - ETC2: etc2comp
    
    const output = new Uint8Array(texture.length);
    for (let i = 0; i < texture.length; i++) {
      output[i] = Math.floor(texture[i] * 255);
    }
    
    return output;
  }

  /**
   * Bake texture maps to mesh UVs
   */
  static bakeTextureToMesh(mesh: MeshData, textureMaps: TextureMapSet, uvs: Float32Array): MeshData {
    const albedoTex = textureMaps.albedo as THREE.Texture;
    const texRes = albedoTex.image ? Math.sqrt((albedoTex.image as HTMLCanvasElement).width * (albedoTex.image as HTMLCanvasElement).height) : 1024;
    
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const uvIdx = (i / 3) * 2;
      const u = uvs[uvIdx];
      const v = uvs[uvIdx + 1];
      
      const texX = Math.floor(u * texRes) % texRes;
      const texY = Math.floor(v * texRes) % texRes;
      const texIdx = (texY * texRes + texX) * 4;
      
      mesh.colors[i] = textureMaps.albedo[texIdx];
      mesh.colors[i + 1] = textureMaps.albedo[texIdx + 1];
      mesh.colors[i + 2] = textureMaps.albedo[texIdx + 2];
    }
    
    return mesh;
  }
}
