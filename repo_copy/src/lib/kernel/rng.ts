/**
 * Paradigm Absolute — Deterministic RNG: xoshiro256** + SplitMix64
 *
 * This is the ONLY source of randomness in the platform.
 * Given the same seed, it produces bit-identical sequences across
 * platforms (x86_64, ARM64, browser engines).
 *
 * Reference: Blackman & Vigna, "Scrambled Linear Pseudorandom Number Generators"
 */

/**
 * SplitMix64: used to initialize the xoshiro256** state from a single 64-bit seed.
 */
function splitmix64(seed: bigint): () => bigint {
  let state = BigInt.asUintN(64, seed);
  return () => {
    state = BigInt.asUintN(64, state + 0x9e3779b97f4a7c15n);
    let z = state;
    z = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n);
    z = BigInt.asUintN(64, (z ^ (z >> 27n)) * 0x94d049bb133111ebn);
    return BigInt.asUintN(64, z ^ (z >> 31n));
  };
}

/**
 * Rotate left for 64-bit unsigned integers.
 */
function rotl(x: bigint, k: bigint): bigint {
  return BigInt.asUintN(64, (x << k) | (x >> (64n - k)));
}

/**
 * xoshiro256** — the platform's deterministic PRNG.
 *
 * Usage:
 *   const rng = new Xoshiro256StarStar(seedHash);
 *   const val = rng.nextF64();        // [0, 1)
 *   const int = rng.nextInt(0, 10);   // [0, 10]
 *   const gaussian = rng.nextGaussian(); // ~N(0,1)
 */
export class Xoshiro256StarStar {
  private s0: bigint;
  private s1: bigint;
  private s2: bigint;
  private s3: bigint;

  /**
   * Initialize from a seed string (SHA-256 hex hash) or numeric seed.
   */
  constructor(seed: string | bigint) {
    let seedVal: bigint;
    if (typeof seed === 'string') {
      // Parse first 16 hex chars as a 64-bit seed
      const cleanHex = seed.replace(/[^0-9a-fA-F]/g, '').slice(0, 16) || '0';
      seedVal = BigInt('0x' + cleanHex);
    } else {
      seedVal = seed;
    }

    const sm = splitmix64(seedVal);
    this.s0 = sm();
    this.s1 = sm();
    this.s2 = sm();
    this.s3 = sm();
  }

  /**
   * Generate the next 64-bit unsigned integer.
   */
  nextU64(): bigint {
    const result = BigInt.asUintN(64, rotl(BigInt.asUintN(64, this.s1 * 5n), 7n) * 9n);

    const t = BigInt.asUintN(64, this.s1 << 17n);

    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;

    this.s2 ^= t;
    this.s3 = rotl(this.s3, 45n);

    // Ensure all state values stay in u64 range
    this.s0 = BigInt.asUintN(64, this.s0);
    this.s1 = BigInt.asUintN(64, this.s1);
    this.s2 = BigInt.asUintN(64, this.s2);
    this.s3 = BigInt.asUintN(64, this.s3);

    return result;
  }

  /**
   * Generate a uniform double in [0, 1).
   */
  nextF64(): number {
    const u = this.nextU64();
    // Use the top 53 bits for a double with full mantissa precision
    return Number(u >> 11n) / (2 ** 53);
  }

  /**
   * Generate a uniform integer in [min, max] (inclusive).
   */
  nextInt(min: number, max: number): number {
    const range = max - min + 1;
    return min + Math.floor(this.nextF64() * range);
  }

  /**
   * Generate a boolean with 50% probability.
   */
  nextBool(): boolean {
    return this.nextF64() < 0.5;
  }

  /**
   * Choose a random element from an array.
   */
  nextChoice<T>(arr: T[]): T {
    if (arr.length === 0) throw new Error('Cannot choose from empty array');
    return arr[this.nextInt(0, arr.length - 1)];
  }

  /**
   * Generate a standard normal (Gaussian) variate using Box-Muller.
   */
  private _hasSpare = false;
  private _spare = 0;

  nextGaussian(): number {
    if (this._hasSpare) {
      this._hasSpare = false;
      return this._spare;
    }

    let u: number, v: number, s: number;
    do {
      u = this.nextF64() * 2 - 1;
      v = this.nextF64() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);

    const mul = Math.sqrt(-2 * Math.log(s) / s);
    this._spare = v * mul;
    this._hasSpare = true;
    return u * mul;
  }

  /**
   * Create a child RNG from a fork key (for parallel deterministic streams).
   */
  fork(key: string): Xoshiro256StarStar {
    // Mix the current state with the key to produce a new independent stream
    let hash = 0n;
    for (let i = 0; i < key.length; i++) {
      hash = BigInt.asUintN(64, hash * 31n + BigInt(key.charCodeAt(i)));
    }
    const seed = BigInt.asUintN(64, this.nextU64() ^ hash);
    return new Xoshiro256StarStar(seed);
  }
}

/**
 * Create a deterministic RNG from a seed's content hash.
 * This is the standard entry point for all platform randomness.
 */
export function rngFromHash(hash: string): Xoshiro256StarStar {
  return new Xoshiro256StarStar(hash);
}
