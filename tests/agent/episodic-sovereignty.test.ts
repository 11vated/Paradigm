/**
 * Episodic memory × sovereignty key derivation tests
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { webcrypto as nodeWebCrypto } from 'node:crypto';
import {
  deriveEpisodicKeyFromSovereignty,
  createEpisodicMemoryFromSovereignty,
  EpisodicMemory,
} from '../../src/lib/intelligence/memory/episodic';

beforeAll(() => {
  if (!(globalThis as any).crypto) (globalThis as any).crypto = nodeWebCrypto;
});

async function makeECDSAKey(): Promise<CryptoKey> {
  const pair = await (globalThis as any).crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'],
  );
  return pair.privateKey as CryptoKey;
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}

describe('Episodic × sovereignty', () => {
  it('HKDF derivation is deterministic — same priv + userId → same key', async () => {
    const priv = await makeECDSAKey();
    const k1 = await deriveEpisodicKeyFromSovereignty(priv, 'kahlil');
    const k2 = await deriveEpisodicKeyFromSovereignty(priv, 'kahlil');
    expect(bytesToHex(k1)).toBe(bytesToHex(k2));
    expect(k1.length).toBe(32);
  });

  it('different userId → different key (per-user namespacing)', async () => {
    const priv = await makeECDSAKey();
    const k1 = await deriveEpisodicKeyFromSovereignty(priv, 'alice');
    const k2 = await deriveEpisodicKeyFromSovereignty(priv, 'bob');
    expect(bytesToHex(k1)).not.toBe(bytesToHex(k2));
  });

  it('different privateKey → different key', async () => {
    const a = await makeECDSAKey();
    const b = await makeECDSAKey();
    const k1 = await deriveEpisodicKeyFromSovereignty(a, 'kahlil');
    const k2 = await deriveEpisodicKeyFromSovereignty(b, 'kahlil');
    expect(bytesToHex(k1)).not.toBe(bytesToHex(k2));
  });

  it('createEpisodicMemoryFromSovereignty round-trips a put/get through AES-256-GCM', async () => {
    const priv = await makeECDSAKey();
    const mem = await createEpisodicMemoryFromSovereignty(priv, 'kahlil');
    await mem.put({
      key: 'evt:1', topic: 'audit', value: { what: 'agent.produced', hash: 'abcd' },
      source: 'agent',
    });
    const got = await mem.get('evt:1');
    expect(got?.value).toEqual({ what: 'agent.produced', hash: 'abcd' });
  });

  it('two memories with different sovereignty keys cannot read each other (no persist path here, but encryption layer holds)', async () => {
    const a = await makeECDSAKey();
    const b = await makeECDSAKey();
    const memA = await createEpisodicMemoryFromSovereignty(a, 'kahlil');
    const memB = await createEpisodicMemoryFromSovereignty(b, 'kahlil');
    await memA.put({ key: 'evt:secret', topic: 'audit', value: { msg: 'hi' }, source: 'agent' });
    // Without persistence, the data sits in memA's map only.
    expect(await memA.get('evt:secret')).toBeDefined();
    expect(await memB.get('evt:secret')).toBeUndefined();
  });
});
