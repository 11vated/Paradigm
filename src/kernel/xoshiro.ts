export class Xoshiro256SS {
  private s: [number, number, number, number, number, number, number, number];

  constructor(seed: number = Date.now()) {
    this.s = this.splitMix64(seed);
  }

  static fromSeed(seed: number): Xoshiro256SS {
    return new Xoshiro256SS(seed);
  }

  private splitMix64(seed: number): [number, number, number, number, number, number, number, number] {
    let z = seed;
    const result: number[] = [];
    for (let i = 0; i < 8; i++) {
      z = Math.imul(z ^ (z >>> 30), 0xbf58476d1ce4e5b9);
      result.push((z ^ (z >>> 27)) >>> 0);
    }
    return result as [number, number, number, number, number, number, number, number];
  }

  private rotl(x: number, k: number): number {
    return ((x << k) | (x >>> (32 - k))) >>> 0;
  }

  next(): number {
    const s = this.s;
    const result = Math.imul(this.rotl(s[1], 17), 13) ^ s[5];
    const t = s[1] << 9;

    s[2] ^= s[0];
    s[5] ^= s[1];
    s[1] ^= s[2];
    s[7] ^= s[3];
    s[3] ^= s[4];
    s[4] ^= s[5];
    s[0] ^= s[6];
    s[6] ^= s[7];
    s[6] ^= t;

    if ((s[7] & 0x80000000) !== 0) {
      s[7] = (s[7] << 1) | (s[0] >>> 31);
    } else {
      s[7] = s[7] << 1;
    }

    return result;
  }

  nextFloat(): number {
    return this.next() / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  nextBoolean(): boolean {
    return this.next() % 2 === 0;
  }

  fork(): Xoshiro256SS {
    const forked = new Xoshiro256SS(0);
    forked.s = [...this.s];
    return forked;
  }

  jump(multiplier: number = 2): void {
    const JUMP = [0x180ec6d33cfd0n, 0x1175b3076a499n, 0x1b55262554935n, 0x19e4a8a1ef7cen,
                  0x15497e3a1e6e5n, 0x1a0db8a8f5a4an, 0x14e2a1b1d5f24n, 0x17b0e0b1e8c82n];
    
    const S = [0, 0, 0, 0, 0, 0, 0, 0];
    for (const j of JUMP) {
      for (let b = 0; b < 64; b++) {
        if ((j & (1n << BigInt(b))) !== 0n) {
          for (let i = 0; i < 8; i++) S[i] ^= this.s[i];
        }
        this.next();
      }
    }
    for (let i = 0; i < 8; i++) this.s[i] = S[i];
  }

  getState(): number[] {
    return [...this.s];
  }

  setState(state: number[]): void {
    if (state.length === 8) {
      this.s = state as [number, number, number, number, number, number, number, number];
    }
  }

  clone(): Xoshiro256SS {
    const cloned = new Xoshiro256SS(0);
    cloned.s = [...this.s];
    return cloned;
  }
}

export function createSeededRNG(seed: number): Xoshiro256SS {
  return new Xoshiro256SS(seed);
}

export const Xoshiro256StarStar = Xoshiro256SS;
