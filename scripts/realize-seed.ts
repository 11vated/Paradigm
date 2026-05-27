#!/usr/bin/env bun
/**
 * realize-seed.ts — turn a Paradigm seed into REAL binary artifacts.
 * 100% local. Zero third-party services. Deterministic.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { musicToWavBuffer } from '../src/lib/asset_pipeline/synth/wav-writer';
import { generatePreviewMesh } from '../src/lib/asset_pipeline/preview_generator';
import { exportToGLB } from '../src/lib/asset_pipeline/gltf_exporter';

const ROOT = '/home/workspace/Projects/Paradigm';
const COMMONS = `${ROOT}/data/commons`;
const ARTIFACT_DIR = `${ROOT}/data/artifacts`;
type IndexEntry = { id: string; name: string; domain: string; file: string; fitness?: number };

function loadIndex(): IndexEntry[] {
  const idx = JSON.parse(readFileSync(`${COMMONS}/index.json`, 'utf8'));
  return idx.seeds as IndexEntry[];
}
function loadSeed(entry: IndexEntry): any {
  return JSON.parse(readFileSync(`${COMMONS}/seeds/${entry.file}`, 'utf8'));
}
function ensure(dir: string) { mkdirSync(dir, { recursive: true }); }

// Genes are stored as { name: { value, type } }; helper:
function geneValue(seed: any, name: string, fallback: any): any {
  const g = seed.genes?.[name];
  if (g && typeof g === 'object' && 'value' in g) return g.value;
  return seed.genes?.[name] ?? fallback;
}

// ── Music: WAV synthesis ──────────────────────────────────────────────────
function realizeMusic(entry: IndexEntry, seed: any) {
  const tempo = Number(geneValue(seed, 'tempo', 0.5));
  const key = String(geneValue(seed, 'key', 'C'));
  const scale = String(geneValue(seed, 'scale', 'major'));
  const instrument = String(geneValue(seed, 'instrument', 'sine'));
  // map normalized tempo (0..1) to a meaningful BPM range
  const bpm = Math.round(60 + tempo * 120);

  const buf = musicToWavBuffer({ tempo: bpm, key, scale, instrument }, { duration: 12, sampleRate: 44100 });
  const out = `${ARTIFACT_DIR}/music/${entry.id}.wav`;
  ensure(dirname(out));
  writeFileSync(out, buf);
  return { path: out, bytes: buf.byteLength, kind: 'audio/wav' };
}

// ── 3D: GLB via preview-mesh + GLTF exporter ──────────────────────────────
function realize3D(entry: IndexEntry, seed: any) {
  // preview_generator dispatches on artifact.type and reads gene values
  // off the artifact root, so we flatten + project.
  const flatGenes: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(seed.genes ?? {})) {
    flatGenes[k] = (v as any)?.value ?? v;
  }
  const artifact = { type: entry.domain, ...flatGenes, ...seed };
  const mesh = generatePreviewMesh(artifact);
  if (!mesh || !mesh.vertices?.length) return null;
  const meshData = {
    vertices: new Float32Array(mesh.vertices),
    indices: new Uint32Array(mesh.indices),
    normals: new Float32Array(mesh.normals),
    colors: mesh.colors ? new Float32Array(mesh.colors) : undefined,
  };
  const glb = exportToGLB(meshData, entry.name);
  const out = `${ARTIFACT_DIR}/${entry.domain}/${entry.id}.glb`;
  ensure(dirname(out));
  writeFileSync(out, glb);
  return { path: out, bytes: glb.byteLength, kind: 'model/gltf-binary', verts: meshData.vertices.length / 3, tris: meshData.indices.length / 3 };
}

function realize(entry: IndexEntry) {
  const seed = loadSeed(entry);
  if (entry.domain === 'music') return realizeMusic(entry, seed);
  return realize3D(entry, seed);
}

function main() {
  const args = process.argv.slice(2);
  const filter = args[0]; // optional domain or seed-id filter
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 8);

  const idx = loadIndex();
  const targets = filter
    ? idx.filter((e) => e.id === filter || e.domain === filter).slice(0, limit)
    : idx.slice(0, limit);

  let bytes = 0, written = 0, skipped = 0;
  for (const e of targets) {
    try {
      const r = realize(e);
      if (r) {
        bytes += r.bytes;
        written++;
        console.log(`✓ ${e.domain.padEnd(14)} ${e.id.padEnd(28)} → ${r.bytes.toLocaleString()} bytes  (${r.kind})`);
      } else {
        skipped++;
        console.log(`⊘ ${e.domain.padEnd(14)} ${e.id.padEnd(28)} — no preview-mesh generator`);
      }
    } catch (err) {
      skipped++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${e.domain.padEnd(14)} ${e.id.padEnd(28)} — ${msg}`);
    }
  }
  console.log(`\n${written} written, ${skipped} skipped — ${bytes.toLocaleString()} bytes total`);
}

main();
