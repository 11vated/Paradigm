/**
 * WebGPU Compute Shaders for Character V2 Generator
 * Enables GPU-acelerated parametric body modeling
 * 10,000+ vertices updated in parallel
 */

import type { CharacterParams } from './character-v2';

/**
 * WGSL Compute Shader for character vertex generation
 * Generates parametric body mesh on GPU
 */
export const CHARACTER_COMPUTE_WGSL = `
struct Vertex {
  position: vec3<f32>,
  normal: vec3<f32>,
  uv: vec2<f32>,
  boneIndex: u32,
}

struct CharacterUniforms {
  height: f32,
  torsoHeight: f32,
  torsoWidth: f32,
  headSize: f32,
  legLength: f32,
  armLength: f32,
  shoulderWidth: f32,
  waistWidth: f32,
  muscleMass: f32,
  fatDistribution: f32,
  time: f32,
}

@group(0) @binding(0) var<uniform> uniforms: CharacterUniforms;
@group(0) @binding(1) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(2) var<storage, read> muscleData: array<vec4<f32>>; // origin, insertion, strength, volume

// xoshiro256** RNG state (4 x u64 = 32 bytes)
@group(0) @binding(3) var<storage, read_write> rngState: array<u64, 4>;

// Hash function for GPU RNG
fn hash(seed: u64) -> u64 {
  var s = seed;
  s = s ^ (s >> 30u) * 0xbf58476d1ce4e5b9u;
  s = s ^ (s >> 27u) * 0x94d049bb133111ebu;
  s = s ^ (s >> 31u);
  return s;
}

// xoshiro256** nextU64
fn rng_next() -> u64 {
  let result = rotl(rngState[1] * 5u, 7u) * 9u;
  
  let t = rngState[1] << 17u;
  rngState[2] = rngState[2] ^ rngState[0];
  rngState[3] = rngState[3] ^ rngState[1];
  rngState[1] = rngState[1] ^ rngState[2];
  rngState[0] = rngState[0] ^ rngState[3];
  rngState[2] = rngState[2] ^ t;
  rngState[3] = rotl(rngState[3], 45u);
  
  return result;
}

// Generate f32 in [0, 1)
fn rng_next_f32() -> f32 {
  let u = rng_next() >> 11u;
  return f32(u) / f32(0x1_0000_0000u);
}

@compute @workgroup_size(64)
fn generateTorso(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx >= arrayLength(&vertices)) { return; }
  
  var v = &vertices[idx];
  
  // Generate torso vertices (parametric ellipsoid)
  let u = f32(idx % 32u) / 32.0;
  let v_angle = f32(idx / 32u) / 16.0;
  
  let x = uniforms.torsoWidth * 0.6 * cos(v_angle) * (1.0 + 0.2 * sin(uniforms.time));
  let y = uniforms.torsoHeight * (u - 0.5);
  let z = uniforms.torsoWidth * 0.4 * sin(v_angle);
  
  (*v).position = vec3<f32>(x, y, z);
  
  // Normal (simplified)
  let normal = normalize(vec3<f32>(x, 0.0, z));
  (*v).normal = normal;
  
  // Apply muscle deformation
  for (var i = 0u; i < arrayLength(&muscleData); i += 4u) {
    let origin = muscleData[i].xyz;
    let insertion = muscleData[i + 1u].xyz;
    let strength = muscleData[i + 2u].x;
    let volume = muscleData[i + 3u].x;
    
    let dist = distance((*v).position, origin);
    if (dist < 0.15) {
      let bulge = volume * 0.05 * (1.0 - dist / 0.15);
      (*v).position *= 1.0 + bulge;
    }
  }
  
  (*v).uv = vec2<f32>(u, v_angle / (2.0 * 3.14159));
}

@compute @workgroup_size(64)
fn generateHead(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  let baseIdx = 1000u; // Offset for head vertices
  if (idx + baseIdx >= arrayLength(&vertices)) { return; }
  
  var v = &vertices[baseIdx + idx];
  
  // Generate head sphere with face features
  let u = f32(idx % 16u) / 16.0;
  let v_angle = f32(idx / 16u) / 8.0;
  
  let radius = uniforms.headSize;
  let x = radius * sin(v_angle) * cos(u * 2.0 * 3.14159);
  let y = radius * cos(v_angle);
  let z = radius * sin(v_angle) * sin(u * 2.0 * 3.14159);
  
  (*v).position = vec3<f32>(x, y + uniforms.torsoHeight + uniforms.headSize, z);
  (*v).normal = normalize(vec3<f32>(x, y, z));
  
  // Face feature deformations (simplified — would use face params)
  let normalizedY = (y + radius) / (2.0 * radius);
  if (abs(x) > 0.08 && abs(x) < 0.1 && normalizedY > 0.45 && normalizedY < 0.55) {
    // Eye socket
    (*v).position.z -= 0.015;
  }
  
  (*v).uv = vec2<f32>(u, normalizedY);
}
`;

/**
 * Create GPU buffers for character generation
 */
export async function createCharacterBuffers(
  device: GPUDevice,
  params: CharacterParams,
  vertexCount: number
): Promise<{
  uniformBuffer: GPUBuffer;
  vertexBuffer: GPUBuffer;
  muscleBuffer: GPUBuffer;
  rngBuffer: GPUBuffer;
}> {
  // Uniform buffer
  const uniformData = new Float32Array([
    params.proportions.height,
    params.proportions.torsoHeight,
    params.proportions.shoulderWidth,
    params.proportions.headSize,
    params.proportions.legLength,
    params.proportions.armLength,
    params.proportions.shoulderWidth,
    params.proportions.waistWidth,
    params.proportions.muscleMass,
    params.proportions.fatDistribution,
    0.0 // time
  ]);

  const uniformBuffer = device.createBuffer({
    size: uniformData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
  });
  new Float32Array(uniformBuffer.getMappedRange()).set(uniformData);
  uniformBuffer.unmap();

  // Vertex buffer (read_write storage)
  const vertexBuffer = device.createBuffer({
    size: vertexCount * 8 * 4, // 8 floats per vertex (pos[3], normal[3], uv[2])
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });

  // Muscle data buffer (12 muscle groups × 4 vec4)
  const muscleData = new Float32Array(12 * 4 * 4); // 12 muscles, 4 vec4 each
  params.muscles.forEach((muscle, i) => {
    const offset = i * 16; // 16 floats per muscle
    muscleData[offset] = muscle.origin.x;
    muscleData[offset + 1] = muscle.origin.y;
    muscleData[offset + 2] = muscle.origin.z;
    muscleData[offset + 3] = 0; // padding

    muscleData[offset + 4] = muscle.insertion.x;
    muscleData[offset + 5] = muscle.insertion.y;
    muscleData[offset + 6] = muscle.insertion.z;
    muscleData[offset + 7] = 0; // padding

    muscleData[offset + 8] = muscle.strength;
    muscleData[offset + 9] = muscle.volume;
    muscleData[offset + 10] = muscle.restLength;
    muscleData[offset + 11] = 0; // padding

    muscleData[offset + 12] = 0; // padding
  });

  const muscleBuffer = device.createBuffer({
    size: muscleData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
  });
  new Float32Array(muscleBuffer.getMappedRange()).set(muscleData);
  muscleBuffer.unmap();

  // RNG state buffer (initialized from seed hash)
  const rngSeed = BigInt('0x' + (params.proportions.height * 1000).toString(16).slice(0, 16));
  const sm1 = rngSeed + 0x9e3779b97f4a7c15n;
  const s0 = hashBigInt(sm1);
  const s1 = hashBigInt(s0 + 0x9e3779b97f4a7c15n);
  const s2 = hashBigInt(s1 + 0x9e3779b97f4a7c15n);
  const s3 = hashBigInt(s2 + 0x9e3779b97f4a7c15n);

  const rngData = new BigUint64Array([s0, s1, s2, s3]);
  const rngBuffer = device.createBuffer({
    size: 32, // 4 × u64
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
  });
  new BigUint64Array(rngBuffer.getMappedRange()).set(rngData);
  rngBuffer.unmap();

  return { uniformBuffer, vertexBuffer, muscleBuffer, rngBuffer };
}

function hashBigInt(s: bigint): bigint {
  let x = s;
  x = x ^ (x >> 30n) * 0xbf58476d1ce4e5b9n;
  x = x ^ (x >> 27n) * 0x94d049bb133111ebn;
  x = x ^ (x >> 31n);
  return x;
}

/**
 * Build compute pipeline for character generation
 */
export async function buildCharacterPipeline(
  device: GPUDevice,
  shaderCode: string
): Promise<{
  torsoPipeline: GPUComputePipeline;
  headPipeline: GPUComputePipeline;
}> {
  const module = device.createShaderModule({ code: shaderCode });

  const torsoPipeline = await device.createComputePipelineAsync({
    layout: 'auto',
    compute: { module, entryPoint: 'generateTorso' }
  });

  const headPipeline = await device.createComputePipelineAsync({
    layout: 'auto',
    compute: { module, entryPoint: 'generateHead' }
  });

  return { torsoPipeline, headPipeline };
}
