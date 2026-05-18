import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  encodeGseed, decodeGseed, signGseed, verifyGseedSignature,
  writeGseedFile, readGseedFile, exportGseedToFile, createGseed, OutputType,
} from '../src/lib/kernel/binary-format';

const VALID_HASH = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

const MINIMAL_SEED = {
  id: 'test-seed-001',
  hash: VALID_HASH,
  $hash: VALID_HASH,
  $domain: 'test',
  $name: 'Test Seed',
};

const MINIMAL_OUTPUT = {
  format: 'obj' as const,
  mesh: 'v 0 0 0\nv 1 0 0\n',
  audio: undefined,
  sprite: undefined,
  parameters: { test: true },
};

function generateKeyPair() {
  return crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

const MAGIC = new TextEncoder().encode('GSEE');

describe('GSeed Binary Format — Structural Tests', () => {
  it('has correct magic bytes', () => {
    expect(new TextDecoder().decode(MAGIC)).toBe('GSEE');
    expect(MAGIC.length).toBe(4);
  });

  it('produces valid header layout', () => {
    const hash = 'a'.repeat(64);
    const pkg = {
      version: { major: 1, minor: 1 },
      timestamp: 1700000000000,
      flags: { hasC2PA: false, hasOutputs: false, encryptedSeed: false, royaltyEnabled: false, compressed: false },
      seedHash: hash,
      metadata: { author: 'Test', title: 'T', generator: 'g', created: '2025-01-01T00:00:00.000Z', license: 'CC0' },
    };
    const buf = encodeGseed(pkg);
    expect(buf[0]).toBe(0x47);
    expect(buf[1]).toBe(0x53);
    expect(buf[2]).toBe(0x45);
    expect(buf[3]).toBe(0x45);
    const v = new DataView(buf.buffer);
    expect(v.getUint16(4, true)).toBe(1);
    expect(v.getUint16(6, true)).toBe(1);
    expect(Number(v.getBigUint64(8, true))).toBe(1700000000000);
  });
});

describe('GSeed — Round Trip', () => {
  it('can be created, written, and read back', () => {
    const tmpDir = fs.mkdtempSync('gseed-rr-');
    try {
      const seedHash = 'b'.repeat(64);
      const pkg = {
        version: { major: 1, minor: 1 },
        timestamp: Date.now(),
        flags: { hasC2PA: false, hasOutputs: false, encryptedSeed: false, royaltyEnabled: false, compressed: false },
        seedHash,
        metadata: { author: 'RoundTrip', title: 'Round Trip Test', generator: 'test', created: new Date().toISOString(), license: 'CC0' },
      };
      const buf = encodeGseed(pkg);
      const dec = decodeGseed(buf);
      expect(dec.metadata?.author).toBe('RoundTrip');
      expect(dec.seedHash).toBe(seedHash);

      const fp = path.join(tmpDir, 'roundtrip.gseed');
      writeGseedFile(fp, pkg);
      expect(fs.existsSync(fp)).toBe(true);
      const read = readGseedFile(fp);
      expect(read.metadata?.title).toBe('Round Trip Test');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('signs and verifies with ECDSA P-256', () => {
    const { publicKey, privateKey } = generateKeyPair();
    const pkg = {
      version: { major: 1, minor: 1 },
      timestamp: Date.now(),
      flags: { hasC2PA: false, hasOutputs: false, encryptedSeed: false, royaltyEnabled: false, compressed: false },
      seedHash: VALID_HASH,
      metadata: { author: 'Signer', title: 'Signed', generator: 'test', created: new Date().toISOString(), license: 'CC0' },
    };
    const signed = signGseed(pkg, privateKey);
    expect(signed.signature).toBeDefined();
    expect(signed.signature!.length).toBeGreaterThan(0);
    expect(verifyGseedSignature(signed, publicKey)).toBe(true);
  });

  it('rejects tampered signature', () => {
    const { publicKey, privateKey } = generateKeyPair();
    const tamperHash = 'c0ffee0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    const pkg = {
      version: { major: 1, minor: 1 },
      timestamp: Date.now(),
      flags: { hasC2PA: false, hasOutputs: false, encryptedSeed: false, royaltyEnabled: false, compressed: false },
      seedHash: tamperHash,
      metadata: { author: 'Tamper', title: 'Original', generator: 'test', created: new Date().toISOString(), license: 'CC0' },
    };
    const signed = signGseed(pkg, privateKey);
    const tampered = { ...signed, metadata: { ...signed.metadata!, title: 'Tampered!' } };
    expect(verifyGseedSignature(tampered, publicKey)).toBe(false);
  });

  it('handles unsigned packages', () => {
    const { publicKey } = generateKeyPair();
    const pkg = {
      version: { major: 1, minor: 1 },
      timestamp: Date.now(),
      flags: { hasC2PA: false, hasOutputs: false, encryptedSeed: false, royaltyEnabled: false, compressed: false },
      seedHash: 'd'.repeat(64),
      metadata: { author: 'Nope', title: 'No Sig', generator: 'test', created: new Date().toISOString(), license: 'CC0' },
    };
    expect(verifyGseedSignature(pkg, publicKey)).toBe(false);
  });

  it('compresses large metadata', () => {
    const desc = 'X'.repeat(5000);
    const pkg = {
      version: { major: 1, minor: 1 },
      timestamp: Date.now(),
      flags: { hasC2PA: false, hasOutputs: false, encryptedSeed: false, royaltyEnabled: false, compressed: true },
      seedHash: 'e'.repeat(64),
      metadata: { author: 'Compress', title: 'Big Description', description: desc, generator: 'test', created: new Date().toISOString(), license: 'CC0' },
    };
    const uncompr = { ...pkg, flags: { ...pkg.flags, compressed: false } };
    const bufC = encodeGseed(pkg);
    const bufU = encodeGseed(uncompr);
    expect(bufC.length).toBeLessThan(bufU.length);
    const dec = decodeGseed(bufC);
    expect(dec.metadata?.description).toBe(desc);
  });

  it('handles outputs round-trip', () => {
    const pkg = {
      version: { major: 1, minor: 1 },
      timestamp: Date.now(),
      flags: { hasC2PA: false, hasOutputs: true, encryptedSeed: false, royaltyEnabled: false, compressed: false },
      seedHash: 'f'.repeat(64),
      metadata: { author: 'Out', title: 'Output Test', generator: 'mesh', created: new Date().toISOString(), license: 'CC0' },
      outputs: [
        { type: OutputType.OBJ, index: 0, data: new TextEncoder().encode('v 0 0 0') },
        { type: OutputType.PNG, index: 1, data: new Uint8Array([137, 80, 78, 71]) },
      ],
    };
    const buf = encodeGseed(pkg);
    const dec = decodeGseed(buf);
    expect(dec.outputs).toHaveLength(2);
    expect(dec.outputs![0].type).toBe(OutputType.OBJ);
    expect(new TextDecoder().decode(dec.outputs![0].data)).toBe('v 0 0 0');
  });

  it('rejects bad magic', () => {
    expect(() => decodeGseed(new Uint8Array([0, 0, 0, 0]))).toThrow('bad magic');
  });

  it('exports and imports via exportGseedToFile', () => {
    const tmpDir = fs.mkdtempSync('gseed-export-');
    try {
      const seed = {
        id: 'export-test',
        hash: 'a'.repeat(64),
      };
      const output = { format: 'obj', mesh: 'v 0 0 0\nv 1 0 0\n' };
      const fp = path.join(tmpDir, 'export-test.gseed');
      const pkg = exportGseedToFile(fp, seed as any, 'export-test', output as any);
      expect(fs.existsSync(fp)).toBe(true);
      const read = readGseedFile(fp);
      expect(read.metadata?.generator).toBe('export-test');
      expect(read.outputs).toHaveLength(1);
      expect(read.outputs![0].type).toBe(OutputType.OBJ);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('createGseed round-trips', () => {
    const pkg = createGseed(MINIMAL_SEED as any, 'create-test', MINIMAL_OUTPUT as any);
    const buf = encodeGseed(pkg);
    const dec = decodeGseed(buf);
    expect(dec.metadata?.generator).toBe('create-test');
    expect(dec.outputs).toHaveLength(1);
  });
});