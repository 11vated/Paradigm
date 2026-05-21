/**
 * Browser-side shim for Node's `crypto` module.
 *
 * Many substrate modules (`src/lib/friend/*`, `src/lib/world/*`, etc.) import
 * Node's built-in `crypto` for SHA-256 hashing, ECDSA, etc. Those modules are
 * also imported by the React UI (e.g. `HomePage` -> `@/lib/friend`), so the
 * browser bundle needs *something* exporting the same names — otherwise Vite
 * externalizes `crypto` to a Proxy that throws on every property access at
 * module-evaluation time, crashing the entire React tree to a blank page.
 *
 * What this shim provides:
 *   - `createHash('sha256')` with `.update(data).digest('hex' | undefined)` —
 *     real, sync, byte-identical to Node's output. Determinism preserved.
 *   - `randomBytes(n)` backed by Web Crypto's `getRandomValues` when available.
 *     NOTE: Non-deterministic — only call this from non-kernel/UI code paths.
 *   - Stubs for `createSign`, `createVerify`, `generateKeyPairSync`,
 *     `randomUUID` that throw a descriptive error *when called* (not at import
 *     time). UI code paths that merely import these names will work fine; only
 *     actually invoking server-only crypto operations in the browser will fail
 *     loud.
 *
 * This shim is wired in via `vite.config.ts` `resolve.alias` for `crypto`.
 * Server-side code (run via `tsx server.ts`) is not affected — Node resolves
 * the real `crypto` module directly without Vite.
 */

// ─── SHA-256 (pure JS, sync, deterministic) ──────────────────────────────────
// Compact RFC-6234 implementation. Output matches Node's
// crypto.createHash('sha256').update(input).digest('hex').

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function utf8Encode(str: string): Uint8Array {
  // Browser environment — always has TextEncoder.
  return new TextEncoder().encode(str);
}

function sha256Bytes(input: Uint8Array): Uint8Array {
  // Padding: 1 bit + zeros + 64-bit length
  const bitLen = input.length * 8;
  const padLen = (input.length % 64 < 56) ? 56 - (input.length % 64) : 120 - (input.length % 64);
  const buf = new Uint8Array(input.length + padLen + 8);
  buf.set(input);
  buf[input.length] = 0x80;
  // 64-bit big-endian length (we only fill the low 32 bits — inputs > 4GB unsupported).
  const lenView = new DataView(buf.buffer, buf.byteOffset + buf.length - 8, 8);
  lenView.setUint32(0, Math.floor(bitLen / 0x100000000), false);
  lenView.setUint32(4, bitLen >>> 0, false);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const W = new Uint32Array(64);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.length);

  for (let block = 0; block < buf.length; block += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(block + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = ((W[i - 15] >>> 7) | (W[i - 15] << 25)) ^ ((W[i - 15] >>> 18) | (W[i - 15] << 14)) ^ (W[i - 15] >>> 3);
      const s1 = ((W[i - 2] >>> 17) | (W[i - 2] << 15)) ^ ((W[i - 2] >>> 19) | (W[i - 2] << 13)) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, H[i], false);
  return out;
}

function toHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

type HashInput = string | Uint8Array | ArrayBuffer;

function coerceBytes(data: HashInput): Uint8Array {
  if (typeof data === 'string') return utf8Encode(data);
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  throw new TypeError('createHash().update() expected string, Uint8Array, or ArrayBuffer');
}

interface Hasher {
  update(data: HashInput): Hasher;
  digest(): Uint8Array;
  digest(encoding: 'hex'): string;
}

export function createHash(algorithm: string): Hasher {
  if (algorithm !== 'sha256') {
    throw new Error(`[browser-crypto-shim] Only 'sha256' is supported in the browser, got '${algorithm}'.`);
  }
  const chunks: Uint8Array[] = [];
  const hasher: Hasher = {
    update(data: HashInput) {
      chunks.push(coerceBytes(data));
      return hasher;
    },
    digest(encoding?: 'hex'): any {
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { merged.set(c, off); off += c.length; }
      const bytes = sha256Bytes(merged);
      return encoding === 'hex' ? toHex(bytes) : bytes;
    },
  };
  return hasher;
}

// ─── Non-deterministic primitives (browser uses Web Crypto) ──────────────────

export function randomBytes(size: number): Uint8Array {
  const out = new Uint8Array(size);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(out);
  } else {
    throw new Error('[browser-crypto-shim] randomBytes: Web Crypto not available.');
  }
  return out;
}

export function randomUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback: build a v4-shaped UUID from randomBytes.
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = toHex(b);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ─── Server-only operations (throw on call, not on import) ───────────────────

function notInBrowser(name: string): never {
  throw new Error(
    `[browser-crypto-shim] '${name}' is a Node-only operation and cannot run in the browser. ` +
    `Move this call to a server route, or use Web Crypto / a sovereignty adapter instead.`,
  );
}

export const createSign = (..._args: unknown[]) => notInBrowser('createSign');
export const createVerify = (..._args: unknown[]) => notInBrowser('createVerify');
export const generateKeyPairSync = (..._args: unknown[]) => notInBrowser('generateKeyPairSync');
export const generateKeyPair = (..._args: unknown[]) => notInBrowser('generateKeyPair');
export const createCipheriv = (..._args: unknown[]) => notInBrowser('createCipheriv');
export const createDecipheriv = (..._args: unknown[]) => notInBrowser('createDecipheriv');
export const createHmac = (..._args: unknown[]) => notInBrowser('createHmac');
export const pbkdf2Sync = (..._args: unknown[]) => notInBrowser('pbkdf2Sync');
export const scryptSync = (..._args: unknown[]) => notInBrowser('scryptSync');
export const sign = (..._args: unknown[]) => notInBrowser('sign');
export const verify = (..._args: unknown[]) => notInBrowser('verify');
export const timingSafeEqual = (..._args: unknown[]) => notInBrowser('timingSafeEqual');

// `subtle` is a real thing in the browser — pass through.
export const webcrypto = typeof globalThis.crypto !== 'undefined'
  ? globalThis.crypto
  : undefined;

// Default export — many modules use `import crypto from 'crypto'`.
const cryptoDefault = {
  createHash,
  randomBytes,
  randomUUID,
  createSign,
  createVerify,
  generateKeyPairSync,
  generateKeyPair,
  createCipheriv,
  createDecipheriv,
  createHmac,
  pbkdf2Sync,
  scryptSync,
  sign,
  verify,
  timingSafeEqual,
  webcrypto,
  subtle: typeof globalThis.crypto !== 'undefined' ? globalThis.crypto.subtle : undefined,
};

export default cryptoDefault;
