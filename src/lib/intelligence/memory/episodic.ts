/**
 * Episodic Memory — Layer 2 (encrypted, per-user, private)
 *
 * Records user-scoped events. AES-256-GCM at rest using a key derived
 * from the user's sovereignty signing key.
 *
 * Determinism: timestamps come from kernel/clock so tests stay byte-stable.
 */

import { kernelNow } from '../../kernel/clock';
import type { MemoryEntry, MemoryLayer, MemoryQuery } from './types';

export interface EpisodicMemoryOptions {
  userId: string;
  /** 32-byte symmetric key. Caller derives this from their sovereignty key. */
  encryptionKey?: Uint8Array;
  /** Optional persistence path (Node). If unset, store is in-memory only. */
  persistPath?: string;
}

export class EpisodicMemory implements MemoryLayer {
  readonly name = 'episodic' as const;
  private readonly opts: EpisodicMemoryOptions;
  private entries: Map<string, MemoryEntry> = new Map();
  private loaded = false;

  constructor(opts: EpisodicMemoryOptions) {
    this.opts = opts;
  }

  async get(key: string): Promise<MemoryEntry | undefined> {
    await this.ensureLoaded();
    return this.entries.get(key);
  }

  async put(entry: Omit<MemoryEntry, 'createdAt' | 'updatedAt'>): Promise<void> {
    await this.ensureLoaded();
    const now = kernelNow();
    const existing = this.entries.get(entry.key);
    const full: MemoryEntry = {
      ...entry,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.entries.set(entry.key, full);
    await this.flush();
  }

  async query(q: MemoryQuery): Promise<MemoryEntry[]> {
    await this.ensureLoaded();
    let results: MemoryEntry[] = [];
    for (const e of this.entries.values()) {
      if (q.topic && e.topic !== q.topic) continue;
      if (q.source && e.source !== q.source) continue;
      if (q.text) {
        const haystack = JSON.stringify(e.value).toLowerCase();
        if (!haystack.includes(q.text.toLowerCase())) continue;
      }
      results.push(e);
    }
    if (q.embedding) {
      results = results
        .map((e) => ({ e, sim: cosineF32(e.embedding, q.embedding!) }))
        .sort((a, b) => b.sim - a.sim)
        .map(({ e }) => e);
    } else {
      results.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return results.slice(0, q.limit ?? 20);
  }

  async remove(key: string): Promise<boolean> {
    await this.ensureLoaded();
    const ok = this.entries.delete(key);
    if (ok) await this.flush();
    return ok;
  }

  async *all(): AsyncIterable<MemoryEntry> {
    await this.ensureLoaded();
    for (const e of this.entries.values()) yield e;
  }

  // ─── Encryption + persistence ───────────────────────────────────────────

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    if (!this.opts.persistPath) return;
    try {
      const fs = await import('node:fs/promises');
      const raw = new Uint8Array(await fs.readFile(this.opts.persistPath));
      if (raw.length === 0) return;
      const plaintext = this.opts.encryptionKey
        ? await decryptBytes(raw, this.opts.encryptionKey)
        : raw;
      const decoded = JSON.parse(new TextDecoder().decode(plaintext)) as MemoryEntry[];
      if (Array.isArray(decoded)) {
        for (const e of decoded) this.entries.set(e.key, e);
      }
    } catch {
      // Missing / unreadable file → start fresh
    }
  }

  private async flush(): Promise<void> {
    if (!this.opts.persistPath) return;
    try {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      await fs.mkdir(path.dirname(this.opts.persistPath), { recursive: true });
      const serializable = Array.from(this.entries.values()).map((e) => ({
        ...e,
        // Float32Array is not JSON-safe; serialize as plain array
        embedding: e.embedding ? Array.from(e.embedding) : undefined,
      }));
      const plaintext = new TextEncoder().encode(JSON.stringify(serializable));
      const out = this.opts.encryptionKey
        ? await encryptBytes(plaintext, this.opts.encryptionKey)
        : plaintext;
      await fs.writeFile(this.opts.persistPath, out);
    } catch {
      // Non-fatal — episodic remains in memory.
    }
  }
}

// ─── AES-256-GCM helpers ────────────────────────────────────────────────────

async function encryptBytes(plaintext: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  const subtle = getSubtle();
  const cryptoKey = await subtle.importKey('raw', key as BufferSource, 'AES-GCM', false, ['encrypt']);
  const iv = deterministicIV(plaintext);
  const ct = new Uint8Array(
    await subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plaintext as BufferSource),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return out;
}

async function decryptBytes(blob: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  const subtle = getSubtle();
  const cryptoKey = await subtle.importKey('raw', key as BufferSource, 'AES-GCM', false, ['decrypt']);
  const iv = blob.slice(0, 12);
  const ct = blob.slice(12);
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ct as BufferSource);
  return new Uint8Array(pt);
}

function getSubtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: { subtle: SubtleCrypto } }).crypto;
  if (!c || !c.subtle) {
    throw new Error('SubtleCrypto unavailable — Node 19+ or modern browser required');
  }
  return c.subtle;
}

/**
 * Deterministic IV — same plaintext + same key → same ciphertext.
 * Acceptable for single-user episodic memory; would NOT be safe in
 * adversarial multi-tenant settings.
 */
function deterministicIV(plaintext: Uint8Array): Uint8Array {
  const iv = new Uint8Array(12);
  let h = 0x9e3779b9 >>> 0;
  for (let i = 0; i < plaintext.length; i++) {
    h = ((h * 16777619) ^ plaintext[i]) >>> 0;
  }
  for (let i = 0; i < 12; i++) {
    iv[i] = (h >>> ((i % 4) * 8)) & 0xff;
    h = ((h * 0x85ebca6b) ^ (h >>> 13)) >>> 0;
  }
  return iv;
}

function cosineF32(a: Float32Array | undefined, b: Float32Array): number {
  if (!a || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom < 1e-9 ? 0 : dot / denom;
}

// ─── Sovereignty key derivation (HKDF-SHA-256) ──────────────────────────────
/**
 * Derive a 32-byte AES-256-GCM key from the user's sovereignty private key.
 *
 *  derivedKey = HKDF-SHA-256(
 *    ikm    = pkcs8(privateKey),
 *    salt   = utf8(userId),
 *    info   = 'paradigm:episodic-memory:v1',
 *    length = 32 bytes,
 *  )
 *
 * Same sovereignty key + same userId → same derived key, byte-for-byte.
 * Different user namespace per userId; rotate by bumping the `info` string.
 */
export async function deriveEpisodicKeyFromSovereignty(
  privateKey: CryptoKey,
  userId: string,
): Promise<Uint8Array> {
  const subtle = (globalThis.crypto || (await import('node:crypto')).webcrypto).subtle;
  const pkcs8 = await subtle.exportKey('pkcs8', privateKey);
  const ikm = await subtle.importKey('raw', pkcs8, { name: 'HKDF' }, false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(userId),
      info: new TextEncoder().encode('paradigm:episodic-memory:v1'),
    },
    ikm,
    256,
  );
  return new Uint8Array(bits);
}

/**
 * Convenience factory — instantiate EpisodicMemory wired to the user's
 * sovereignty identity in one call. Key derivation is deterministic.
 */
export async function createEpisodicMemoryFromSovereignty(
  privateKey: CryptoKey,
  userId: string,
  opts: { persistPath?: string } = {},
): Promise<EpisodicMemory> {
  const key = await deriveEpisodicKeyFromSovereignty(privateKey, userId);
  return new EpisodicMemory({ userId, encryptionKey: key, persistPath: opts.persistPath });
}
