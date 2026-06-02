/**
 * Advanced Material Models for Path Tracing
 * Implements Disney principled BSDF, microfacet GGX, Fresnel Schlick, 
 * subsurface scattering, clearcoat, sheen, iridescence, anisotropic reflections
 */

export interface DisneyMaterial {
  baseColor: [number, number, number];
  metallic: number;
  roughness: number;
  anisotropic: number;
  sheen: number;
  sheenTint: number;
  clearcoat: number;
  clearcoatRoughness: number;
  subsurface: number;
  specularTint: number;
  transmission: number;
  ior: number;
  thickness: number;
}

export interface BSDFSample {
  direction: [number, number, number];
  pdf: number;
  weight: [number, number, number];
}

export class AdvancedMaterialSystem {
  /**
   * Disney principled BRDF evaluation
   * Based on "Physically-Based Shading at Disney" by Burley et al.
   */
  static evaluateDisneyBRDF(
    material: DisneyMaterial,
    normal: [number, number, number],
    lightDir: [number, number, number],
    viewDir: [number, number, number]
  ): [number, number, number] {
    const N = normal;
    const L = lightDir;
    const V = viewDir;
    const H = this.normalize(this.add(L, V));
    
    const NdotL = Math.max(0, this.dot(N, L));
    const NdotV = Math.max(0, this.dot(N, V));
    const NdotH = Math.max(0, this.dot(N, H));
    const LdotH = Math.max(0, this.dot(L, H));
    
    if (NdotL === 0 || NdotV === 0) return [0, 0, 0];
    
    // Diffuse component (Disney diffuse)
    const FD90 = 0.5 + 2 * LdotH * LdotH * material.roughness;
    const FD = this.mix(FD90, 1, NdotL) * this.mix(FD90, 1, NdotV);
    const diffuse = this.scale(material.baseColor, FD / Math.PI);
    
    // Specular component
    const F0 = this.lerp([0.04, 0.04, 0.04], material.baseColor, material.metallic);
    const F = this.fresnelSchlick(LdotH, F0);
    
    const alpha = Math.max(0.001, material.roughness * material.roughness);
    const D = this.distributionGGX(NdotH, alpha);
    const G = this.geometrySmith(N, V, L, alpha);
    
    const specular = this.scale(
      this.scale(F, D * G),
      1 / (4 * NdotL * NdotV)
    );
    
    // Clearcoat component
    let clearcoat = [0, 0, 0];
    if (material.clearcoat > 0) {
      const Fc = this.fresnelSchlick(LdotH, [0.04, 0.04, 0.04]);
      const alphaCc = material.clearcoatRoughness * material.clearcoatRoughness;
      const Dc = this.distributionGGX(NdotH, alphaCc);
      const Gc = this.geometrySmith(N, V, L, alphaCc);
      
      clearcoat = this.scale(
        this.scale(Fc, Dc * Gc),
        material.clearcoat / (4 * NdotL * NdotV)
      );
    }
    
    // Sheen component
    let sheen: [number, number, number] = [0, 0, 0];
    if (material.sheen > 0) {
      const sheenColor: [number, number, number] = [1, 1, 1]; // Simplified sheen color
      const FH = this.fresnelSchlick(LdotH, [1, 1, 1]);
      sheen = this.scale(sheenColor, (FH[0] + FH[1] + FH[2]) / 3 * material.sheen * NdotL);
    }
    
    // Combine components
    const temp1: [number, number, number] = this.add(diffuse, specular as [number, number, number]);
    const temp2: [number, number, number] = this.add(temp1, clearcoat as [number, number, number]);
    return this.add(temp2, sheen);
  }

  /**
   * Sample Disney BSDF
   */
  static sampleDisneyBSDF(
    material: DisneyMaterial,
    normal: [number, number, number],
    viewDir: [number, number, number],
    u1: number,
    u2: number
  ): BSDFSample {
    const N = normal;
    const V = viewDir;
    
    // Decide between diffuse and specular based on Fresnel
    const F0 = this.lerp([0.04, 0.04, 0.04], material.baseColor, material.metallic);
    const NdotV = Math.max(0, this.dot(N, V));
    const F = this.fresnelSchlick(NdotV, F0);
    const avgF = (F[0] + F[1] + F[2]) / 3;
    
    let direction: [number, number, number];
    let pdf: number;
    let weight: [number, number, number];
    
    if (u1 < avgF) {
      // Sample specular
      const alpha = Math.max(0.001, material.roughness * material.roughness);
      const halfDir = this.sampleGGX(N, alpha, u1, u2);
      direction = this.reflect(this.negate(V), halfDir);
      pdf = this.specularPDF(N, V, direction, alpha);
      weight = this.evaluateDisneyBRDF(material, N, direction, V);
    } else {
      // Sample diffuse (cosine-weighted hemisphere)
      direction = this.sampleCosineHemisphere(N, u1, u2);
      pdf = this.diffusePDF(N, direction);
      weight = this.evaluateDisneyBRDF(material, N, direction, V);
    }
    
    return { direction, pdf, weight };
  }

  /**
   * GGX/Trowbridge-Reitz distribution
   */
  static distributionGGX(NdotH: number, alpha: number): number {
    const alpha2 = alpha * alpha;
    const denom = NdotH * NdotH * (alpha2 - 1) + 1;
    return alpha2 / (Math.PI * denom * denom);
  }

  /**
   * Geometry function (Smith method)
   */
  static geometrySmith(
    N: [number, number, number],
    V: [number, number, number],
    L: [number, number, number],
    alpha: number
  ): number {
    const NdotV = Math.max(0, this.dot(N, V));
    const NdotL = Math.max(0, this.dot(N, L));
    
    const ggx1 = this.geometrySchlickGGX(NdotV, alpha);
    const ggx2 = this.geometrySchlickGGX(NdotL, alpha);
    
    return ggx1 * ggx2;
  }

  static geometrySchlickGGX(NdotV: number, alpha: number): number {
    const k = alpha / 2;
    const denom = NdotV * (1 - k) + k;
    return NdotV / denom;
  }

  /**
   * Fresnel Schlick approximation
   */
  static fresnelSchlick(cosTheta: number, F0: [number, number, number]): [number, number, number] {
    const pow5 = Math.pow(1 - cosTheta, 5);
    return [
      F0[0] + (1 - F0[0]) * pow5,
      F0[1] + (1 - F0[1]) * pow5,
      F0[2] + (1 - F0[2]) * pow5,
    ];
  }

  /**
   * Sample GGX distribution
   */
  static sampleGGX(
    N: [number, number, number],
    alpha: number,
    u1: number,
    u2: number
  ): [number, number, number] {
    const phi = 2 * Math.PI * u1;
    const cosTheta = Math.sqrt((1 - u2) / (1 + (alpha * alpha - 1) * u2));
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    
    const x = Math.cos(phi) * sinTheta;
    const y = Math.sin(phi) * sinTheta;
    const z = cosTheta;
    
    // Build tangent space
    const up: [number, number, number] = Math.abs(N[1]) < 0.999 ? [0, 1, 0] : [1, 0, 0];
    const tangent = this.normalize(this.cross(up, N));
    const bitangent = this.cross(N, tangent);
    
    return this.add(
      this.add(
        this.scale(tangent, x),
        this.scale(bitangent, y)
      ),
      this.scale(N, z)
    );
  }

  /**
   * Sample cosine-weighted hemisphere
   */
  static sampleCosineHemisphere(
    N: [number, number, number],
    u1: number,
    u2: number
  ): [number, number, number] {
    const r = Math.sqrt(u1);
    const phi = 2 * Math.PI * u2;
    
    const x = r * Math.cos(phi);
    const y = r * Math.sin(phi);
    const z = Math.sqrt(1 - u1);
    
    // Build tangent space
    const up: [number, number, number] = Math.abs(N[1]) < 0.999 ? [0, 1, 0] : [1, 0, 0];
    const tangent = this.normalize(this.cross(up, N));
    const bitangent = this.cross(N, tangent);
    
    return this.add(
      this.add(
        this.scale(tangent, x),
        this.scale(bitangent, y)
      ),
      this.scale(N, z)
    );
  }

  /**
   * Specular PDF
   */
  static specularPDF(
    N: [number, number, number],
    V: [number, number, number],
    L: [number, number, number],
    alpha: number
  ): number {
    const H = this.normalize(this.add(V, L));
    const NdotH = Math.max(0, this.dot(N, H));
    const HdotV = Math.max(0, this.dot(H, V));
    
    const D = this.distributionGGX(NdotH, alpha);
    return D * NdotH / (4 * HdotV);
  }

  /**
   * Diffuse PDF (cosine-weighted)
   */
  static diffusePDF(N: [number, number, number], L: [number, number, number]): number {
    return Math.max(0, this.dot(N, L)) / Math.PI;
  }

  /**
   * Subsurface scattering approximation
   * Based on "Approximate Translucent Subsurface Scattering"
   */
  static subsurfaceScattering(
    material: DisneyMaterial,
    _thickness: number,
    NdotL: number,
    NdotV: number
  ): [number, number, number] {
    if (material.subsurface === 0) return [0, 0, 0];
    
    const ss = 1.25 * (1 - material.roughness) * (1 - material.subsurface);
    const scatter = ss * Math.pow(1 - NdotL, 5) * Math.pow(1 - NdotV, 3);
    
    return this.scale(material.baseColor, scatter);
  }

  /**
   * Iridescence (thin-film interference)
   */
  static iridescence(
    NdotV: number,
    ior: number,
    thickness: number
  ): [number, number, number] {
    const cosTheta = Math.sqrt(1 - (NdotV * NdotV) / (ior * ior));
    const delta = 2 * Math.PI * ior * thickness * cosTheta;
    
    const r = Math.sin(delta) * 0.5 + 0.5;
    const g = Math.sin(delta + 2 * Math.PI / 3) * 0.5 + 0.5;
    const b = Math.sin(delta + 4 * Math.PI / 3) * 0.5 + 0.5;
    
    return [r, g, b];
  }

  /**
   * Anisotropic reflections
   */
  static anisotropicReflection(
    material: DisneyMaterial,
    N: [number, number, number],
    T: [number, number, number],
    V: [number, number, number],
    L: [number, number, number]
  ): [number, number, number] {
    if (material.anisotropic === 0) return [0, 0, 0];
    
    const H = this.normalize(this.add(V, L));
    const TdotH = this.dot(T, H);
    const B = this.cross(N, T);
    const BdotH = this.dot(B, H);
    
    const alphaT = Math.max(0.001, material.roughness * (1 + material.anisotropic));
    const alphaB = Math.max(0.001, material.roughness * (1 - material.anisotropic));
    
    const D = this.distributionAnisotropicGGX(this.dot(N, H), TdotH, BdotH, alphaT, alphaB);
    
    return [D, D, D];
  }

  static distributionAnisotropicGGX(
    NdotH: number,
    _TdotH: number,
    _BdotH: number,
    alphaT: number,
    alphaB: number
  ): number {
    const ndotH = NdotH;
    const denom = ndotH * ndotH * (alphaT * alphaB - 1) + 1;
    return 1 / (Math.PI * alphaT * alphaB * denom * denom);
  }

  // Vector utilities
  static normalize(v: [number, number, number]): [number, number, number] {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return (len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0]) as [number, number, number];
  }

  static dot(a: [number, number, number], b: [number, number, number]): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  static cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ] as [number, number, number];
  }

  static add(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]] as [number, number, number];
  }

  static subtract(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as [number, number, number];
  }

  static scale(v: [number, number, number], s: number): [number, number, number] {
    return [v[0] * s, v[1] * s, v[2] * s] as [number, number, number];
  }

  static negate(v: [number, number, number]): [number, number, number] {
    return [-v[0], -v[1], -v[2]] as [number, number, number];
  }

  static reflect(I: [number, number, number], N: [number, number, number]): [number, number, number] {
    return this.subtract(I, this.scale(N, 2 * this.dot(I, N))) as [number, number, number];
  }

  static lerp(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ] as [number, number, number];
  }

  static mix(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}

/**
 * Convert PBR material to Disney material
 */
export function pbrToDisney(pbr: {
  baseColor: [number, number, number];
  metallic: number;
  roughness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  transmission?: number;
  ior?: number;
  anisotropy?: number;
}): DisneyMaterial {
  return {
    baseColor: pbr.baseColor,
    metallic: pbr.metallic,
    roughness: pbr.roughness,
    anisotropic: pbr.anisotropy || 0,
    sheen: pbr.sheen || 0,
    sheenTint: 0,
    clearcoat: pbr.clearcoat || 0,
    clearcoatRoughness: pbr.clearcoatRoughness || 0,
    subsurface: 0,
    specularTint: 0,
    transmission: pbr.transmission || 0,
    ior: pbr.ior || 1.5,
    thickness: 1,
  };
}
