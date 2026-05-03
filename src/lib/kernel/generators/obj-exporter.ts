/**
 * Custom OBJ Exporter — Node.js Compatible
 * Exports Three.js geometries to Wavefront OBJ format
 * Handles multiple objects, proper vertex indexing, and material groups
 */

import * as THREE from 'three';

export interface OBJExportOptions {
  includeNormals?: boolean;
  includeUVs?: boolean;
  materialName?: string;
}

/**
 * Export a Three.js object (Mesh, Group, etc.) to OBJ format
 * Returns OBJ string + MTL string if materials are present
 */
export function exportOBJ(
  object: THREE.Object3D,
  options: OBJExportOptions = {}
): { obj: string; mtl: string; materialNames: string[] } {
  const objLines: string[] = [];
  const mtlLines: string[] = [];
  const materialNames: string[] = [];

  // OBJ header
  objLines.push('# Paradigm Character Export');
  objLines.push(`# Generated: ${new Date().toISOString()}`);
  objLines.push('');

  if (options.materialName) {
    objLines.push(`mtllib ${options.materialName}.mtl`);
    objLines.push('');
  }

  let vertexOffset = 1; // OBJ uses 1-based indexing
  let normalOffset = 1;
  let uvOffset = 1;

  // Process object recursively
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mesh = child as THREE.Mesh;
      const geometry = mesh.geometry as THREE.BufferGeometry;

      // Get object name
      const objName = mesh.name || `object_${materialNames.length}`;
      objLines.push(`o ${objName}`);

      // Handle material
      if (mesh.material) {
        const matName = `mat_${materialNames.length}`;
        materialNames.push(matName);
        objLines.push(`usemtl ${matName}`);
        objLines.push(`g ${objName}_group`);

        // Generate MTL entry
        const mtlEntry = generateMTL(matName, mesh.material as THREE.Material);
        mtlLines.push(mtlEntry);
      }

      // Get vertex data
      const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
      const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
      const uvs = geometry.getAttribute('uv') as THREE.BufferAttribute;

      // Write vertices
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        objLines.push(`v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`);
      }

      // Write normals
      if (normals && options.includeNormals !== false) {
        for (let i = 0; i < normals.count; i++) {
          const x = normals.getX(i);
          const y = normals.getY(i);
          const z = normals.getZ(i);
          objLines.push(`vn ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`);
        }
      }

      // Write UVs
      if (uvs && options.includeUVs !== false) {
        for (let i = 0; i < uvs.count; i++) {
          const u = uvs.getX(i);
          const v = uvs.getY(i);
          objLines.push(`vt ${u.toFixed(6)} ${v.toFixed(6)}`);
        }
      }

      // Write faces
      if (geometry.index) {
        // Indexed geometry
        const indices = geometry.index;
        for (let i = 0; i < indices.count; i += 3) {
          const i1 = indices.getX(i) + vertexOffset;
          const i2 = indices.getX(i + 1) + vertexOffset;
          const i3 = indices.getX(i + 2) + vertexOffset;

          if (normals && uvs) {
            objLines.push(`f ${i1}/${i1 + uvOffset - 1}/${i1 + normalOffset - 1} ${i2}/${i2 + uvOffset - 1}/${i2 + normalOffset - 1} ${i3}/${i3 + uvOffset - 1}/${i3 + normalOffset - 1}`);
          } else if (normals) {
            objLines.push(`f ${i1}//${i1 + normalOffset - 1} ${i2}//${i2 + normalOffset - 1} ${i3}//${i3 + normalOffset - 1}`);
          } else {
            objLines.push(`f ${i1} ${i2} ${i3}`);
          }
        }
      } else {
        // Non-indexed geometry
        for (let i = 0; i < positions.count; i += 3) {
          const i1 = i + vertexOffset;
          const i2 = i + vertexOffset + 1;
          const i3 = i + vertexOffset + 2;

          objLines.push(`f ${i1} ${i2} ${i3}`);
        }
      }

      objLines.push('');

      // Update offsets
      vertexOffset += positions.count;
      if (normals) normalOffset += normals.count;
      if (uvs) uvOffset += uvs.count;
    }
  });

  return {
    obj: objLines.join('\n'),
    mtl: mtlLines.join('\n'),
    materialNames
  };
}

/**
 * Generate MTL (Material Library) entry for a material
 */
function generateMTL(materialName: string, material: THREE.Material): string {
  const lines: string[] = [];
  lines.push(`newmtl ${materialName}`);

  if (material instanceof THREE.MeshStandardMaterial) {
    const mat = material as THREE.MeshStandardMaterial;

    // Ambient color (Ka) - use color * 0.2
    lines.push(`Ka ${mat.color.r * 0.2} ${mat.color.g * 0.2} ${mat.color.b * 0.2}`);

    // Diffuse color (Kd)
    lines.push(`Kd ${mat.color.r} ${mat.color.g} ${mat.color.b}`);

    // Specular color (Ks) - based on metalness
    const specIntensity = mat.metalness;
    lines.push(`Ks ${specIntensity} ${specIntensity} ${specIntensity}`);

    // Shininess (Ns) - based on roughness (inverse)
    const shininess = (1 - mat.roughness) * 1000;
    lines.push(`Ns ${shininess.toFixed(2)}`);

    // Illumination model (2 = ambient + diffuse + specular)
    lines.push('illum 2');

    // Transparency (d)
    lines.push(`d ${mat.opacity}`);

    // Emissive color (Ke) - not standard MTL but some tools support it
    if (mat.emissive && (mat.emissive.r > 0 || mat.emissive.g > 0 || mat.emissive.b > 0)) {
      lines.push(`Ke ${mat.emissive.r} ${mat.emissive.g} ${mat.emissive.b}`);
    }
  } else {
    // Default material
    lines.push('Ka 0.2 0.2 0.2');
    lines.push('Kd 0.8 0.8 0.8');
    lines.push('Ks 0.5 0.5 0.5');
    lines.push('Ns 50.0');
    lines.push('illum 2');
    lines.push('d 1.0');
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Export a single geometry to OBJ (simplified version)
 */
export function geometryToOBJ(
  geometry: THREE.BufferGeometry,
  material?: THREE.Material,
  name?: string
): { obj: string; mtl: string } {
  const mesh = new THREE.Mesh(geometry, material);
  if (name) mesh.name = name;
  return exportOBJ(mesh);
}
