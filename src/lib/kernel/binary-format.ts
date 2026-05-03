/**
 * .gseed Binary Format — Encoder/Decoder
 *
 * Format specification:
 * - Magic: "GSEE" (4 bytes)
 * - Version: major.minor (4 bytes total)
 * - Header: timestamp, flags, seed hash
 * - Sections: TLV (Type-Length-Value) encoded
 */

import type { Seed, GeneratorOutput } from '../engines';
import { rngFromHash } from './rng';

// Section types
export enum SectionType {
  METADATA = 1,
  PARAMS = 2,
  OUTPUTS = 3,
  C2PA_MANIFEST = 4,
  ROYALTY = 5,
  SIGNATURE = 6,
}

// Output types
export enum OutputType {
  OBJ = 1,
  WAV = 2,
  PNG = 3,
  GLTF = 4,
  MIDI = 5,
}

// Flags
export interface GseedFlags {
  hasC2PA: boolean;
  hasOutputs: boolean;
  encryptedSeed: boolean;
  royaltyEnabled: boolean;
}

// Metadata
export interface GseedMetadata {
  schema?: string;
  author: string;
  title: string;
  description?: string;
  generator: string;
  tags?: string[];
  created?: string;
  license?: string;
  parent?: string;
}

// Royalty config
export interface RoyaltySplit {
  address: string;
  percentage: number;
  role: 'author' | 'platform' | 'contributor';
}

export interface RoyaltyConfig {
  schema?: string;
  enabled: boolean;
  primarySplits: RoyaltySplit[];
  resaleSplits?: RoyaltySplit[];
  minimumPrice?: number;
  currency?: string;
  chain?: string;
}

// Main .gseed structure
export interface GseedPackage {
  version: { major: number; minor: number };
  timestamp: number;
  flags: GseedFlags;
  seedHash: string;
  metadata?: GseedMetadata;
  params?: unknown; // GSPL AST or params object
  outputs?: Array<{ type: OutputType; index: number; data: Uint8Array }>;
  c2paManifest?: Uint8Array;
  royalty?: RoyaltyConfig;
  signature?: Uint8Array;
}

const MAGIC = new TextEncoder().encode('GSEE');
const CURRENT_VERSION = { major: 1, minor: 0 };

/**
 * Encode a GseedPackage to binary format
 */
export function encodeGseed(pkg: GseedPackage): Uint8Array {
  const sections: Uint8Array[] = [];

  // Encode metadata section
  if (pkg.metadata) {
    const json = JSON.stringify(pkg.metadata);
    sections.push(encodeSection(SectionType.METADATA, new TextEncoder().encode(json)));
  }

  // Encode params section
  if (pkg.params) {
    const json = JSON.stringify(pkg.params);
    sections.push(encodeSection(SectionType.PARAMS, new TextEncoder().encode(json)));
  }

  // Encode outputs section
  if (pkg.outputs && pkg.outputs.length > 0) {
    const outputsData = encodeOutputs(pkg.outputs);
    sections.push(encodeSection(SectionType.OUTPUTS, outputsData));
  }

  // Encode C2PA manifest section
  if (pkg.c2paManifest) {
    sections.push(encodeSection(SectionType.C2PA_MANIFEST, pkg.c2paManifest));
  }

  // Encode royalty section
  if (pkg.royalty) {
    const json = JSON.stringify(pkg.royalty);
    sections.push(encodeSection(SectionType.ROYALTY, new TextEncoder().encode(json)));
  }

  // Calculate header size and total size
  const headerSize = 24 + 64; // fixed header + seed hash
  let totalSize = headerSize + 4; // header + section count placeholder

  // Add signature section size if present
  if (pkg.signature) {
    sections.push(encodeSection(SectionType.SIGNATURE, pkg.signature));
  }

  // Calculate total size
  for (const section of sections) {
    totalSize += section.length;
  }

  // Build final buffer
  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);
  let offset = 0;

  // Magic
  buffer.set(MAGIC, offset);
  offset += 4;

  // Version
  view.setUint16(offset, pkg.version.major, true);
  offset += 2;
  view.setUint16(offset, pkg.version.minor, true);
  offset += 2;

  // Timestamp
  view.setBigUint64(offset, BigInt(pkg.timestamp), true);
  offset += 8;

  // Flags
  let flags = 0;
  if (pkg.flags.hasC2PA) flags |= 0x01;
  if (pkg.flags.hasOutputs) flags |= 0x02;
  if (pkg.flags.encryptedSeed) flags |= 0x04;
  if (pkg.flags.royaltyEnabled) flags |= 0x08;
  view.setUint32(offset, flags, true);
  offset += 4;

  // Seed hash length (always 64 hex chars = 32 bytes)
  view.setUint32(offset, 64, true); // 64 hex characters
  offset += 4;

  // Seed hash (64 hex chars = 32 bytes)
  const hashBytes = hexToBytes(pkg.seedHash);
  if (hashBytes.length !== 32) {
    throw new Error('Seed hash must be 64 hex chars / 32 bytes (SHA-512/256)');
  }
  buffer.set(hashBytes, offset);
  offset += 64;

  // Section count
  view.setUint32(offset, sections.length, true);
  offset += 4;

  // Sections
  for (const section of sections) {
    buffer.set(section, offset);
    offset += section.length;
  }

  return buffer;
}

/**
 * Decode a .gseed binary buffer to GseedPackage
 */
export function decodeGseed(buffer: Uint8Array): GseedPackage {
  const view = new DataView(buffer.buffer);
  let offset = 0;

  // Magic
  const magic = buffer.slice(offset, offset + 4);
  if (!bytesEqual(magic, MAGIC)) {
    throw new Error('Invalid .gseed file: bad magic');
  }
  offset += 4;

  // Version
  const major = view.getUint16(offset, true);
  const minor = view.getUint16(offset + 2, true);
  offset += 4;

  // Timestamp
  const timestamp = Number(view.getBigUint64(offset, true));
  offset += 8;

  // Flags
  const flagsBits = view.getUint32(offset, true);
  offset += 4;
  const flags: GseedFlags = {
    hasC2PA: (flagsBits & 0x01) !== 0,
    hasOutputs: (flagsBits & 0x02) !== 0,
    encryptedSeed: (flagsBits & 0x04) !== 0,
    royaltyEnabled: (flagsBits & 0x08) !== 0,
  };

  // Seed hash length
  const hashLen = view.getUint32(offset, true);
  offset += 4;

  // Seed hash
  const seedHashBytes = buffer.slice(offset, offset + hashLen);
  const seedHash = bytesToHex(seedHashBytes);
  offset += hashLen;

  // Section count
  const sectionCount = view.getUint32(offset, true);
  offset += 4;

  // Parse sections
  const pkg: GseedPackage = {
    version: { major, minor },
    timestamp,
    flags,
    seedHash,
  };

  for (let i = 0; i < sectionCount; i++) {
    const { type, data, newOffset } = decodeSection(buffer, offset);
    offset = newOffset;

    switch (type) {
      case SectionType.METADATA:
        pkg.metadata = JSON.parse(new TextDecoder().decode(data));
        break;
      case SectionType.PARAMS:
        pkg.params = JSON.parse(new TextDecoder().decode(data));
        break;
      case SectionType.OUTPUTS:
        pkg.outputs = decodeOutputs(data);
        break;
      case SectionType.C2PA_MANIFEST:
        pkg.c2paManifest = data;
        break;
      case SectionType.ROYALTY:
        pkg.royalty = JSON.parse(new TextDecoder().decode(data));
        break;
      case SectionType.SIGNATURE:
        pkg.signature = data;
        break;
    }
  }

  return pkg;
}

// --- Helpers ---

function encodeSection(type: SectionType, data: Uint8Array): Uint8Array {
  const buffer = new Uint8Array(2 + 4 + data.length);
  const view = new DataView(buffer.buffer);
  view.setUint16(0, type, true);
  view.setUint32(2, data.length, true);
  buffer.set(data, 6);
  return buffer;
}

function decodeSection(buffer: Uint8Array, offset: number): {
  type: SectionType;
  data: Uint8Array;
  newOffset: number;
} {
  const view = new DataView(buffer.buffer);
  const type = view.getUint16(offset, true) as SectionType;
  const length = view.getUint32(offset + 2, true);
  const data = buffer.slice(offset + 6, offset + 6 + length);
  return { type, data, newOffset: offset + 6 + length };
}

function encodeOutputs(
  outputs: Array<{ type: OutputType; index: number; data: Uint8Array }>
): Uint8Array {
  const parts: Uint8Array[] = [];
  for (const out of outputs) {
    const part = new Uint8Array(2 + 2 + 4 + out.data.length);
    const view = new DataView(part.buffer);
    view.setUint16(0, out.type, true);
    view.setUint16(2, out.index, true);
    view.setUint32(4, out.data.length, true);
    part.set(out.data, 8);
    parts.push(part);
  }
  return concatBytes(...parts);
}

function decodeOutputs(data: Uint8Array): Array<{ type: OutputType; index: number; data: Uint8Array }> {
  const outputs: Array<{ type: OutputType; index: number; data: Uint8Array }> = [];
  let offset = 0;
  while (offset < data.length) {
    const view = new DataView(data.buffer, data.byteOffset + offset);
    const type = view.getUint16(0, true) as OutputType;
    const index = view.getUint16(2, true);
    const length = view.getUint32(4, true);
    const outputData = data.slice(offset + 8, offset + 8 + length);
    outputs.push({ type, index, data: outputData });
    offset += 8 + length;
  }
  return outputs;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.startsWith('0x')) hex = hex.slice(2);
  if (hex.length % 2 !== 0) hex = '0' + hex;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Create a GseedPackage from generator output
 */
export function createGseed(
  seed: Seed,
  generatorName: string,
  output: GeneratorOutput,
  metadata: Partial<GseedMetadata> = {}
): GseedPackage {
  const pkg: GseedPackage = {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    flags: {
      hasC2PA: false,
      hasOutputs: true,
      encryptedSeed: false,
      royaltyEnabled: false,
    },
    seedHash: seed.hash,
    metadata: {
      schema: 'https://paradigm.ai/schema/gseed-metadata/v1',
      author: metadata.author || 'Anonymous',
      title: metadata.title || `Generated ${generatorName}`,
      generator: generatorName,
      created: new Date().toISOString(),
      license: metadata.license || 'CC0',
      ...metadata,
    },
    outputs: [],
  };

  // Add outputs based on generator type
  if (output.mesh && output.format === 'obj') {
    pkg.outputs!.push({
      type: OutputType.OBJ,
      index: 0,
      data: new TextEncoder().encode(output.mesh),
    });
  }

  if (output.audio && output.format === 'wav') {
    pkg.outputs!.push({
      type: OutputType.WAV,
      index: 0,
      data: output.audio,
    });
  }

  if (output.sprite && output.format === 'png') {
    pkg.outputs!.push({
      type: OutputType.PNG,
      index: 0,
      data: output.sprite,
    });
  }

  return pkg;
}
