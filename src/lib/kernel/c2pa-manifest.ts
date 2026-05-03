/**
 * C2PA Manifest Builder & Verifier
 *
 * Implements C2PA provenance tracking for .gseed files.
 * Uses CBOR encoding for manifest data.
 */

import type { Seed } from '../engines';

/**
 * C2PA Claim structure
 */
export interface C2PAClaim {
  claim_generator: string;
  recipes: C2PARecipe[];
  assertions: C2PAAssertion[];
}

export interface C2PARecipe {
  ingredients: C2PAIngredient[];
  actions: C2PAAction[];
}

export interface C2PAIngredient {
  title: string;
  format: string;
  documentID: string;
  relationship: 'input' | 'tool' | 'output';
}

export interface C2PAAction {
  action: string;
  parameters?: Record<string, unknown>;
}

export interface C2PAAssertion {
  label: string;
  data: Record<string, unknown>;
}

/**
 * Build a C2PA manifest for a generative asset
 */
export function buildC2PAManifest(
  seed: Seed,
  generatorName: string,
  generatorVersion: string = '2.0'
): C2PAClaim {
  const manifest: C2PAClaim = {
    claim_generator: 'Paradigm/1.0',
    recipes: [{
      ingredients: [
        {
          title: 'Seed Input',
          format: 'application/x-gseed-seed',
          documentID: seed.hash,
          relationship: 'input',
        },
        {
          title: 'Generator',
          format: 'application/x-paradigm-generator',
          documentID: generatorName,
          relationship: 'tool',
        },
      ],
      actions: [{
        action: 'generative_create',
        parameters: {
          algorithm: generatorName,
          seed_hash: seed.hash,
          seed_phrase: seed.phrase,
        },
      }],
    }],
    assertions: [
      {
        label: 'paradigm.seed',
        data: {
          hash: seed.hash,
          algorithm: 'SHA-512/256',
          phrase: seed.phrase,
        },
      },
      {
        label: 'paradigm.generator',
        data: {
          name: generatorName,
          version: generatorVersion,
        },
      },
      {
        label: 'paradigm.timestamp',
        data: {
          created: new Date().toISOString(),
          unix_ms: Date.now(),
        },
      },
    ],
  };

  return manifest;
}

/**
 * Encode C2PA manifest to CBOR
 * Note: This is a simplified CBOR encoder for the manifest structure.
 * In production, use a proper CBOR library like `cbor-x` or `cbor-web`.
 */
export function encodeC2PAManifest(manifest: C2PAClaim): Uint8Array {
  // Simplified CBOR encoding
  // CBOR major types:
  //   0: unsigned integer
  //   1: negative integer
  //   2: byte string
  //   3: text string
  //   4: array
  //   5: map

  const encoded = encodeC2PAValue(manifest);
  return encoded;
}

function encodeC2PAValue(value: unknown): Uint8Array {
  if (value === null || value === undefined) {
    return new Uint8Array([0xf6]); // CBOR null
  }

  if (typeof value === 'boolean') {
    return new Uint8Array([value ? 0xf5 : 0xf4]); // true/false
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value) && value >= 0 && value <= 23) {
      return new Uint8Array([value]);
    }
    // Simplified: just encode as float64
    const buffer = new ArrayBuffer(9);
    const view = new DataView(buffer);
    view.setUint8(0, 0xfb); // float64
    view.setFloat64(1, value, false); // big-endian
    return new Uint8Array(buffer);
  }

  if (typeof value === 'string') {
    const bytes = new TextEncoder().encode(value);
    if (bytes.length <= 23) {
      const buf = new Uint8Array(1 + bytes.length);
      buf[0] = 0x60 + bytes.length; // text string
      buf.set(bytes, 1);
      return buf;
    }
    // Longer strings
    const lenBytes = encodeC2PALength(bytes.length);
    const buf = new Uint8Array(1 + lenBytes.length + bytes.length);
    buf[0] = 0x78; // text string, 1-byte length
    buf.set(lenBytes, 1);
    buf.set(bytes, 1 + lenBytes.length);
    return buf;
  }

  if (Array.isArray(value)) {
    const parts: Uint8Array[] = [];
    if (value.length <= 15) {
      parts.push(new Uint8Array([0x80 + value.length])); // array
    } else {
      parts.push(new Uint8Array([0x98, value.length])); // array with 1-byte length
    }
    for (const item of value) {
      parts.push(encodeC2PAValue(item));
    }
    return concat(parts);
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const parts: Uint8Array[] = [];

    if (entries.length <= 15) {
      parts.push(new Uint8Array([0xa0 + entries.length])); // map
    } else {
      parts.push(new Uint8Array([0xb8, entries.length])); // map with 1-byte length
    }

    for (const [key, val] of entries) {
      parts.push(encodeC2PAValue(key)); // key
      parts.push(encodeC2PAValue(val)); // value
    }
    return concat(parts);
  }

  return new Uint8Array([0xf6]); // null fallback
}

function encodeC2PALength(len: number): Uint8Array {
  if (len <= 255) {
    return new Uint8Array([len]);
  }
  if (len <= 65535) {
    const buf = new Uint8Array(2);
    new DataView(buf.buffer).setUint16(0, len, false);
    return buf;
  }
  // Simplified: only handle up to 65535
  return new Uint8Array([len]);
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Decode C2PA manifest from CBOR
 * Simplified decoder — in production use a proper CBOR library.
 */
export function decodeC2PAManifest(data: Uint8Array): C2PAClaim {
  const { value } = decodeC2PAValue(data, 0);
  return value as C2PAClaim;
}

function decodeC2PAValue(data: Uint8Array, offset: number): { value: unknown; newOffset: number } {
  const byte = data[offset];
  const majorType = (byte & 0xe0) >> 5;
  const additional = byte & 0x1f;

  if (majorType === 3) { // text string
    const strLen = additional;
    const strBytes = data.slice(offset + 1, offset + 1 + strLen);
    return {
      value: new TextDecoder().decode(strBytes),
      newOffset: offset + 1 + strLen,
    };
  }

  if (majorType === 5) { // map
    const mapSize = additional;
    let newOffset = offset + 1;
    const map: Record<string, unknown> = {};

    for (let i = 0; i < mapSize; i++) {
      const keyResult = decodeC2PAValue(data, newOffset);
      newOffset = keyResult.newOffset;
      const key = keyResult.value as string;

      const valResult = decodeC2PAValue(data, newOffset);
      newOffset = valResult.newOffset;
      map[key] = valResult.value;
    }

    return { value: map, newOffset };
  }

  // Simplified: return null for unsupported types
  return { value: null, newOffset: offset + 1 };
}

/**
 * Verify C2PA manifest integrity
 */
export function verifyC2PAManifest(
  manifest: C2PAClaim,
  expectedSeedHash: string
): boolean {
  // Check seed hash in assertions
  const seedAssertion = manifest.assertions.find(a => a.label === 'paradigm.seed');
  if (!seedAssertion) return false;

  const hash = (seedAssertion.data as Record<string, unknown>).hash as string;
  return hash === expectedSeedHash;
}
