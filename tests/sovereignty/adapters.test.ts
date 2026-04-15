/**
 * Phase 7.3 — sovereignty adapter tests.
 *
 * Exercises the Local* implementations of Signer, Anchor, Pin end-to-end.
 * No external services, no ethers/arweave/ipfs dependencies required. If
 * these go green, the sovereignty flow is wired correctly — swapping in a
 * real chain/pin later is a config change, not a refactor.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  LocalHmacSigner,
  LocalDryRunAnchor,
  LocalFilePin,
  mintSeedSovereignty,
} from '../../src/lib/sovereignty/adapters.js';

// ─── LocalHmacSigner ───────────────────────────────────────────────────────

describe('LocalHmacSigner', () => {
  it('signs a seed deterministically with the same key', async () => {
    const s1 = new LocalHmacSigner({ key: 'shared-secret' });
    const s2 = new LocalHmacSigner({ key: 'shared-secret' });
    const seed = { genes: { x: 1 }, $domain: 'character' };
    const a = await s1.sign(seed);
    const b = await s2.sign(seed);
    expect(a.signature).toBe(b.signature);
    expect(a.digest).toBe(b.digest);
  });

  it('produces different signatures for different keys', async () => {
    const s1 = new LocalHmacSigner({ key: 'a' });
    const s2 = new LocalHmacSigner({ key: 'b' });
    const seed = { genes: { x: 1 } };
    const a = await s1.sign(seed);
    const b = await s2.sign(seed);
    expect(a.signature).not.toBe(b.signature);
  });

  it('verify() returns true for a self-produced signature', async () => {
    const signer = new LocalHmacSigner({ key: 'k' });
    const seed = { genes: { x: 1 } };
    const sig = await signer.sign(seed);
    expect(await signer.verify(seed, sig)).toBe(true);
  });

  it('verify() returns false if the seed is tampered with', async () => {
    const signer = new LocalHmacSigner({ key: 'k' });
    const seed = { genes: { x: 1 } };
    const sig = await signer.sign(seed);
    expect(await signer.verify({ genes: { x: 2 } }, sig)).toBe(false);
  });

  it('verify() returns false if the signature is swapped out', async () => {
    const signer = new LocalHmacSigner({ key: 'k' });
    const sig = await signer.sign({ genes: { x: 1 } });
    const bad = { ...sig, signature: ('0x' + '00'.repeat(32)) as `0x${string}` };
    expect(await signer.verify({ genes: { x: 1 } }, bad)).toBe(false);
  });

  it('verify() is immune to ownership changes', async () => {
    const signer = new LocalHmacSigner({ key: 'k' });
    const base = { genes: { x: 1 } };
    const sig = await signer.sign({ ...base, $owner: 'alice' });
    // Signed as alice, now owned by bob — signature still valid because
    // $owner is stripped from the canonical form.
    expect(await signer.verify({ ...base, $owner: 'bob' }, sig)).toBe(true);
  });

  it('verify() rejects a signature from a different algorithm', async () => {
    const signer = new LocalHmacSigner({ key: 'k' });
    const sig = await signer.sign({ x: 1 });
    const wrongAlgo = { ...sig, algorithm: 'eip712-ecdsa' as const };
    expect(await signer.verify({ x: 1 }, wrongAlgo)).toBe(false);
  });

  it('verify() rejects a signature from a different signer id', async () => {
    const signer = new LocalHmacSigner({ id: 'real', key: 'k' });
    const sig = await signer.sign({ x: 1 });
    const spoofed = { ...sig, signer: 'attacker' };
    expect(await signer.verify({ x: 1 }, spoofed)).toBe(false);
  });
});

// ─── LocalDryRunAnchor ─────────────────────────────────────────────────────

describe('LocalDryRunAnchor', () => {
  it('produces a deterministic token id per seed digest', async () => {
    const a1 = new LocalDryRunAnchor();
    const a2 = new LocalDryRunAnchor();
    const seed = { genes: { x: 1 } };
    const r1 = await a1.anchor({ seed, metadataUri: 'file:///tmp/a.json', owner: 'alice' });
    const r2 = await a2.anchor({ seed, metadataUri: 'file:///tmp/a.json', owner: 'alice' });
    expect(r1.tokenId).toBe(r2.tokenId);
    expect(r1.transactionHash).toBe(r2.transactionHash);
  });

  it('marks receipts as dryRun and chainId 0', async () => {
    const a = new LocalDryRunAnchor();
    const r = await a.anchor({ seed: { x: 1 }, metadataUri: 'file:///x', owner: 'o' });
    expect(r.dryRun).toBe(true);
    expect(r.chainId).toBe(0);
    expect(r.network).toBe('local');
  });

  it('different seeds produce different token ids', async () => {
    const a = new LocalDryRunAnchor();
    const r1 = await a.anchor({ seed: { x: 1 }, metadataUri: 'f', owner: 'o' });
    const r2 = await a.anchor({ seed: { x: 2 }, metadataUri: 'f', owner: 'o' });
    expect(r1.tokenId).not.toBe(r2.tokenId);
  });

  it('metadata URI changes the tx hash but not the token id', async () => {
    const a = new LocalDryRunAnchor();
    const seed = { x: 1 };
    const r1 = await a.anchor({ seed, metadataUri: 'file:///a', owner: 'o' });
    const r2 = await a.anchor({ seed, metadataUri: 'file:///b', owner: 'o' });
    expect(r1.tokenId).toBe(r2.tokenId);
    expect(r1.transactionHash).not.toBe(r2.transactionHash);
  });

  it('lookup() returns the last receipt for a digest', async () => {
    const a = new LocalDryRunAnchor();
    const seed = { x: 1 };
    const receipt = await a.anchor({ seed, metadataUri: 'file:///x', owner: 'alice' });
    const found = await a.lookup(receipt.seedDigest);
    expect(found).not.toBeNull();
    expect(found!.tokenId).toBe(receipt.tokenId);
  });

  it('lookup() returns null for an unknown digest', async () => {
    const a = new LocalDryRunAnchor();
    const missing = await a.lookup(('0x' + 'aa'.repeat(32)) as `0x${string}`);
    expect(missing).toBeNull();
  });

  it('token id format fits in a decimal string of reasonable length', async () => {
    const a = new LocalDryRunAnchor();
    const r = await a.anchor({ seed: { x: 1 }, metadataUri: 'f', owner: 'o' });
    // First 8 bytes = at most 20 decimal digits.
    expect(/^\d{1,20}$/.test(r.tokenId)).toBe(true);
  });
});

// ─── LocalFilePin ──────────────────────────────────────────────────────────

describe('LocalFilePin', () => {
  let scratch: string;
  beforeEach(() => {
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'paradigm-pin-'));
  });
  afterEach(() => {
    fs.rmSync(scratch, { recursive: true, force: true });
  });

  it('writes JSON and returns a file:// URI', async () => {
    const pin = new LocalFilePin({ dir: scratch });
    const r = await pin.pin({ hello: 'world' });
    expect(r.uri.startsWith('file://')).toBe(true);
    expect(r.sizeBytes).toBeGreaterThan(0);
    expect(r.backend).toBe('local-file');
    expect(r.contentDigest).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('round-trips content via fetch()', async () => {
    const pin = new LocalFilePin({ dir: scratch });
    const payload = { a: 1, b: 'two' };
    const r = await pin.pin(payload);
    const bytes = await pin.fetch(r.uri);
    expect(bytes).not.toBeNull();
    const parsed = JSON.parse(Buffer.from(bytes!).toString('utf8'));
    expect(parsed).toEqual(payload);
  });

  it('produces the same filename for identical content (content-addressed)', async () => {
    const pin = new LocalFilePin({ dir: scratch });
    const a = await pin.pin({ x: 1 });
    const b = await pin.pin({ x: 1 });
    expect(a.uri).toBe(b.uri);
    expect(a.contentDigest).toBe(b.contentDigest);
  });

  it('different content produces different URIs', async () => {
    const pin = new LocalFilePin({ dir: scratch });
    const a = await pin.pin({ x: 1 });
    const b = await pin.pin({ x: 2 });
    expect(a.uri).not.toBe(b.uri);
  });

  it('fetch() returns null for a non-file URI', async () => {
    const pin = new LocalFilePin({ dir: scratch });
    expect(await pin.fetch('ar://whatever')).toBeNull();
    expect(await pin.fetch('ipfs://Qm...')).toBeNull();
  });

  it('fetch() returns null for a missing file', async () => {
    const pin = new LocalFilePin({ dir: scratch });
    expect(await pin.fetch('file:///nonexistent/path/xyz.json')).toBeNull();
  });

  it('honors a custom filename', async () => {
    const pin = new LocalFilePin({ dir: scratch });
    const r = await pin.pin({ x: 1 }, { filename: 'my-seed.json' });
    expect(r.uri.endsWith('my-seed.json')).toBe(true);
  });
});

// ─── mintSeedSovereignty (end-to-end) ──────────────────────────────────────

describe('mintSeedSovereignty — end-to-end', () => {
  let scratch: string;
  beforeEach(() => {
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'paradigm-mint-'));
  });
  afterEach(() => {
    fs.rmSync(scratch, { recursive: true, force: true });
  });

  it('runs canonicalize → pin → sign → anchor and returns consistent digests', async () => {
    const signer = new LocalHmacSigner({ key: 'k' });
    const anchor = new LocalDryRunAnchor();
    const pin = new LocalFilePin({ dir: scratch });
    const seed = { genes: { x: 1 }, $domain: 'character' };
    const metadata = { name: 'test', properties: { seed_hash: 'ignored' } };
    const result = await mintSeedSovereignty({
      seed,
      metadata,
      owner: '0xabcd',
      signer,
      anchor,
      pin,
    });
    // The digest appears consistently in all three receipts.
    expect(result.signature.digest).toBe(result.digest);
    expect(result.anchor.seedDigest).toBe(result.digest);
    // Pin's contentDigest is over the metadata, not the seed — they differ.
    expect(result.pin.contentDigest).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.anchor.metadataUri).toBe(result.pin.uri);
    // Signature verifies.
    expect(await signer.verify(seed, result.signature)).toBe(true);
  });

  it('is idempotent at the digest level across repeated mints of the same seed', async () => {
    const signer = new LocalHmacSigner({ key: 'k' });
    const anchor = new LocalDryRunAnchor();
    const pin = new LocalFilePin({ dir: scratch });
    const seed = { genes: { x: 1 } };
    const metadata = { name: 't' };
    const r1 = await mintSeedSovereignty({ seed, metadata, owner: 'o', signer, anchor, pin });
    const r2 = await mintSeedSovereignty({ seed, metadata, owner: 'o', signer, anchor, pin });
    expect(r1.digest).toBe(r2.digest);
    expect(r1.anchor.tokenId).toBe(r2.anchor.tokenId);
    // Pin is content-addressed so identical metadata → same URI.
    expect(r1.pin.uri).toBe(r2.pin.uri);
  });

  it('ownership-only change does not alter the signed digest', async () => {
    const signer = new LocalHmacSigner({ key: 'k' });
    const anchor = new LocalDryRunAnchor();
    const pin = new LocalFilePin({ dir: scratch });
    const metadata = { name: 't' };
    const r1 = await mintSeedSovereignty({
      seed: { genes: { x: 1 }, $owner: 'alice' },
      metadata,
      owner: 'alice',
      signer,
      anchor,
      pin,
    });
    const r2 = await mintSeedSovereignty({
      seed: { genes: { x: 1 }, $owner: 'bob' },
      metadata,
      owner: 'bob',
      signer,
      anchor,
      pin,
    });
    expect(r1.digest).toBe(r2.digest);
    // Token id is derived from digest, so it also matches.
    expect(r1.anchor.tokenId).toBe(r2.anchor.tokenId);
    // But owner on the anchor is different.
    expect(r1.anchor.owner).toBe('alice');
    expect(r2.anchor.owner).toBe('bob');
  });
});
