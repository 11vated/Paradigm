/**
 * WebGPU Compute RNG — xoshiro256** in WGSL
 * Enables deterministic GPU compute for generators
 * Same seed = identical GPU results
 */

/**
 * WGSL Shader code for xoshiro256** RNG
 * Seed is derived from first 8 bytes of SHA-256 hash
 */
export const XOSHIRO256_WGSL = `
struct RNGState {
  s0: u64;
  s1: u64;
  s2: u64;
  s3: u64;
};

// SplitMix64 for initialization
fn splitmix64(seed: u64) -> u64 {
  var s = seed;
  s = s + 0x9e3779b97f4a7c15u;
  var z = s;
  z = (z ^ (z >> 30u)) * 0xbf58476d1ce4e5b9u;
  z = (z ^ (z >> 27u)) * 0x94d049bb133111ebu;
  z = z ^ (z >> 31u);
  return z;
}

// Initialize RNG state from seed hash
fn rng_init(seed_hash: u64) -> RNGState {
  var state: RNGState;
  state.s0 = splitmix64(seed_hash);
  state.s1 = splitmix64(state.s0);
  state.s2 = splitmix64(state.s1);
  state.s3 = splitmix64(state.s2);
  return state;
}

// xoshiro256** nextU64
fn rng_next(state: ptr<function, RNGState>) -> u64 {
  let result = rotl(state.s1 * 5u, 7u) * 9u;
  
  let t = state.s1 << 17u;
  state.s2 ^= state.s0;
  state.s3 ^= state.s1;
  state.s1 ^= state.s2;
  state.s0 ^= state.s3;
  state.s2 ^= t;
  state.s3 = rotl(state.s3, 45u);
  
  return result;
}

// Generate f32 in [0, 1)
fn rng_next_f32(state: ptr<function, RNGState>) -> f32 {
  let u = rng_next(state) >> 11u;
  return f32(u) / f32(0x1_0000_0000u);
}

// Generate f64 in [0, 1)
fn rng_next_f64(state: ptr<function, RNGState>) -> f64 {
  let u = rng_next(state) >> 11u;
  return f64(u) / f64(0x1_0000_0000_0000_0000u);
}
`;

/**
 * Helper: Convert seed hash string to u64 for GPU
 */
export function hashToU64(seedHash: string): bigint {
  const cleanHex = seedHash.replace(/[^0-9a-fA-F]/g, '').slice(0, 16) || '0';
  return BigInt('0x' + cleanHex);
}

/**
 * Create GPU buffer with RNG state for compute shaders
 */
export async function createRNGStateBuffer(
  device: GPUDevice,
  seedHash: string
): Promise<GPUBuffer> {
  const seed = hashToU64(seedHash);
  
  // Initialize state on CPU using SplitMix64
  const sm1 = seed + 0x9e3779b97f4a7c15n;
  let z = sm1;
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
  z = z ^ (z >> 31n);
  const s0 = z;
  
  const sm2 = s0 + 0x9e3779b97f4a7c15n;
  z = sm2;
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
  z = z ^ (z >> 31n);
  const s1 = z;
  
  const sm3 = s1 + 0x9e3779b97f4a7c15n;
  z = sm3;
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
  z = z ^ (z >> 31n);
  const s2 = z;
  
  const sm4 = s2 + 0x9e3779b97f4a7c15n;
  z = sm4;
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
  z = z ^ (z >> 31n);
  const s3 = z;
  
  // Write state to GPU buffer (4 x u64 = 32 bytes)
  const stateData = new BigUint64Array([s0, s1, s2, s3]);
  const buffer = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
  });
  
  const mapping = new BigUint64Array(buffer.getMappedRange());
  mapping.set(stateData);
  buffer.unmap();
  
  return buffer;
}
