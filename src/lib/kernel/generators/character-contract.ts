/**
 * Character Quality Contract — wraps generateCharacterV3.
 * The character generator produces GLTF; artifact = GLTF text.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateCharacterV3 } from './character';
import { registerContract } from '../quality-contract';
import type { QualityContract, QualityReport } from '../quality-contract';

// Minimal FileReader polyfill for Node.js (Three.js GLTFExporter requires it).
// Uses Blob.arrayBuffer() which is available in Node.js 18+.
if (typeof globalThis.FileReader === 'undefined') {
  (globalThis as any).FileReader = class FileReaderNode {
    result: any = null;
    onloadend: ((ev: any) => void) | null = null;
    readAsArrayBuffer(blob: Blob): void {
      blob.arrayBuffer().then(buf => {
        this.result = buf;
        this.onloadend?.({ target: this } as any);
      });
    }
    readAsDataURL(blob: Blob): void {
      blob.arrayBuffer().then(buf => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        this.result = `data:application/octet-stream;base64,${btoa(binary)}`;
        this.onloadend?.({ target: this } as any);
      });
    }
    addEventListener(event: string, handler: (...args: any[]) => void): void {
      if (event === 'loadend') this.onloadend = handler as any;
    }
  };
}

interface ChSeed { $hash: string; genes?: Record<string, any>; }
interface ChInverted { vertices: number; faces: number; animations: number; textures: number; gltfChars: number; }
interface ChArtifact { gltf: string; meta: { filePath: string; vertices: number; faces: number; animations: number; textures: string[] } }

async function withGltfExporterNoiseSuppressed<T>(fn: () => Promise<T>): Promise<T> {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const first = String(args[0] ?? '');
    if (first.startsWith('THREE.GLTFExporter:')) return;
    originalWarn(...args);
  };
  try {
    return await fn();
  } finally {
    console.warn = originalWarn;
  }
}

async function synthesize(seed: ChSeed): Promise<ChArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdgm-ch-'));
  try {
    const out = path.join(dir, 'character.gltf');
    const r = await withGltfExporterNoiseSuppressed(() => generateCharacterV3(seed as any, out));
    const gltf = await fs.readFile(r.filePath, 'utf8');
    return {
      gltf,
      meta: { filePath: r.filePath, vertices: r.vertices, faces: r.faces, animations: r.animations ?? 0, textures: r.textures ?? [] },
    };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function invert(artifact: ChArtifact): ChInverted {
  return {
    vertices: artifact.meta.vertices,
    faces: artifact.meta.faces,
    animations: artifact.meta.animations,
    textures: artifact.meta.textures.length,
    gltfChars: artifact.gltf.length,
  };
}

function rate(artifact: ChArtifact): QualityReport {
  const axes: Record<string, number> = {};
  axes.parsesAsJson = (() => { try { JSON.parse(artifact.gltf); return 1; } catch { return 0; } })();
  axes.hasGeometry = artifact.meta.vertices > 100 ? 1 : artifact.meta.vertices / 100;
  axes.densityOk = artifact.meta.faces >= 200 ? 1 : artifact.meta.faces / 200;
  axes.hasAnimation = artifact.meta.animations > 0 ? 1 : 0;
  axes.hasTextures = artifact.meta.textures.length > 0 ? 1 : 0;
  const v = Object.values(axes);
  const score = v.reduce((a, b) => a + b, 0) / v.length;
  return { score, axes, notes: [`verts=${artifact.meta.vertices} faces=${artifact.meta.faces} anims=${artifact.meta.animations} tex=${artifact.meta.textures.length}`] };
}

const CURATED = [
  { id: 'ch-warrior', name: 'Warrior', intent: 'Heavy warrior', tags: ['humanoid', 'strong'],
    seed: { $hash: 'ch-war', genes: { archetype: { value: 'warrior' }, build: { value: 'heavy' } } } as ChSeed },
  { id: 'ch-mage',    name: 'Mage',    intent: 'Robed mage', tags: ['humanoid', 'slim'],
    seed: { $hash: 'ch-mage', genes: { archetype: { value: 'mage' }, build: { value: 'slim' } } } as ChSeed },
  { id: 'ch-rogue',   name: 'Rogue',   intent: 'Lean rogue',  tags: ['humanoid', 'agile'],
    seed: { $hash: 'ch-rog', genes: { archetype: { value: 'rogue' }, build: { value: 'lean' } } } as ChSeed },
];

function hashArtifact(a: ChArtifact): string {
  return crypto.createHash('sha256').update(a.gltf).digest('hex');
}

export const CharacterQualityContract: QualityContract<ChSeed, ChArtifact, ChInverted> = {
  domain: 'character',
  version: '3.0.0',
  synthesize,
  invert,
  rate,
  curated: () => CURATED,
  hashArtifact,
};

registerContract(CharacterQualityContract as any);

