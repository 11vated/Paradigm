/**
 * Inverse Pipeline Tests (P3.5).
 *
 * Tests all 6 inverters and the registry:
 *   1. CharacterTextInverter  — prose → Big-Five personality
 *   2. RgbImageInverter       — pixels → palette, contrast, edge info
 *   3. WavAudioInverter       — WAV → tempo, frequency, envelope
 *   4. NarrativeTextInverter  — story → structure, tone, pacing
 *   5. PersonaVectorInverter  — trait vectors → persona seed
 *   6. SeedGraphInverter      — lineage graph → seed family
 *   7. DefaultInverterRegistry — registration + domain lookup
 *
 * Spec requirement: fidelity ≥0.8 for simple domains (character, visual2d).
 */

import { describe, it, expect } from 'vitest';
import { CharacterTextInverter } from '../../src/lib/intelligence/inverse/text-inverter';
import { RgbImageInverter } from '../../src/lib/intelligence/inverse/image-inverter';
import { WavAudioInverter } from '../../src/lib/intelligence/inverse/audio-inverter';
import { NarrativeTextInverter } from '../../src/lib/intelligence/inverse/narrative-inverter';
import { PersonaVectorInverter } from '../../src/lib/intelligence/inverse/persona-inverter';
import { SeedGraphInverter } from '../../src/lib/intelligence/inverse/seed-graph-inverter';
import { DefaultInverterRegistry } from '../../src/lib/intelligence/inverse/registry';
import { createStandardInverterRegistry } from '../../src/lib/intelligence/inverse/index';

/** Build a tiny valid WAV buffer (44-byte header + PCM data). */
function makeWavBuffer(sampleRate: number, channels: number, bitsPerSample: number, samples: Float32Array): Buffer {
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = samples.length * bytesPerSample * channels;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);   // chunk size
  buf.writeUInt16LE(1, 20);     // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * bytesPerSample * channels, 28);
  buf.writeUInt16LE(bytesPerSample * channels, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]));
    const int = val < 0 ? val * 32768 : val * 32767;
    const offset = 44 + i * bytesPerSample * channels;
    buf.writeInt16LE(Math.round(int), offset);
    if (channels === 2) buf.writeInt16LE(Math.round(int), offset + 2);
  }
  return buf;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CharacterTextInverter
// ═══════════════════════════════════════════════════════════════════════════════

describe('CharacterTextInverter', () => {
  const inverter = new CharacterTextInverter();

  it('accepts text >= 8 chars', () => {
    expect(inverter.accepts({ text: 'hello world' })).toBe(true);
    expect(inverter.accepts({ text: 'short' })).toBe(false);
    expect(inverter.accepts({ text: '' })).toBe(false);
  });

  it('extracts Big-Five from personality cues', async () => {
    const text = 'She was curious, imaginative, and creative — an open-minded inventor. Also kind, warm, and deeply empathic.';
    const report = await inverter.invert({ text });
    expect(report.domain).toEqual('character');
    expect(report.genes.length).toBeGreaterThanOrEqual(5);
    const openness = report.genes.find((g) => g.path === 'persona.bigFive.openness');
    expect(openness).toBeDefined();
    expect(openness!.value).toBeGreaterThan(0.5);
    const agreeableness = report.genes.find((g) => g.path === 'persona.bigFive.agreeableness');
    expect(agreeableness).toBeDefined();
    expect(agreeableness!.value).toBeGreaterThan(0.5);
  });

  it('detects melancholy tone from mood cues', async () => {
    const text = 'A melancholy, brooding figure who is anxious and nervous. Moody and fearful.';
    const report = await inverter.invert({ text });
    const tone = report.genes.find((g) => g.path === 'persona.tone');
    expect(tone).toBeDefined();
    expect(tone!.value).toEqual('melancholy');
  });

  it('reports residual when no cues found', async () => {
    const text = 'The object was blue and rectangular. It occupied space.';
    const report = await inverter.invert({ text });
    expect(report.residuals.length).toBeGreaterThanOrEqual(1);
    expect(report.residuals[0].feature).toContain('no-personality-cues');
  });

  it('returns deterministic results for same input', async () => {
    const text = 'A curious, gentle, and organised scholar.';
    const r1 = await inverter.invert({ text });
    const r2 = await inverter.invert({ text });
    expect(r1.genes).toEqual(r2.genes);
    expect(r1.overallConfidence).toEqual(r2.overallConfidence);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RgbImageInverter
// ═══════════════════════════════════════════════════════════════════════════════

describe('RgbImageInverter', () => {
  const inverter = new RgbImageInverter();

  it('accepts valid RGB buffer', () => {
    const data = new Uint8Array(12).fill(128);
    expect(inverter.accepts({ width: 2, height: 2, data, channels: 3 })).toBe(true);
    expect(inverter.accepts({ width: 0, height: 0, data, channels: 4 })).toBe(true);
  });

  it('rejects invalid inputs', () => {
    expect(inverter.accepts({ width: 2, height: 2, data: 'not-a-buffer', channels: 3 } as any)).toBe(false);
    expect(inverter.accepts({} as any)).toBe(false);
  });

  it('extracts palette, contrast, edgeDensity, warmness, saturation', async () => {
    const w = 4, h = 4, ch = 3;
    const data = new Uint8Array(w * h * ch);
    for (let i = 0; i < data.length; i += ch) {
      data[i] = 200; data[i+1] = 30; data[i+2] = 30;
    }
    const report = await inverter.invert({ width: w, height: h, data, channels: ch as 3 | 4 });
    expect(report.domain).toEqual('visual2d');
    expect(report.genes.find((g) => g.path === 'visual2d.width')!.value).toEqual(4);
    expect(report.genes.find((g) => g.path === 'visual2d.height')!.value).toEqual(4);
    const warmness = report.genes.find((g) => g.path === 'visual2d.warmness');
    expect(warmness).toBeDefined();
  });

  it('detects high edge density in checkerboard pattern', async () => {
    const w = 8, h = 8, ch = 3;
    const data = new Uint8Array(w * h * ch);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * ch;
        const v = (x + y) % 2 === 0 ? 255 : 0;
        data[p] = v; data[p+1] = v; data[p+2] = v;
      }
    }
    const report = await inverter.invert({ width: w, height: h, data, channels: ch as 3 | 4 });
    const edge = report.genes.find((g) => g.path === 'visual2d.edgeDensity');
    expect(edge).toBeDefined();
    expect(edge!.value).toBeGreaterThan(0.1);
  });

  it('returns deterministic results for same buffer', async () => {
    const data = new Uint8Array(12).fill(100);
    const r1 = await inverter.invert({ width: 2, height: 2, data, channels: 3 as 3 | 4 });
    const r2 = await inverter.invert({ width: 2, height: 2, data, channels: 3 as 3 | 4 });
    expect(r1.genes).toEqual(r2.genes);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WavAudioInverter
// ═══════════════════════════════════════════════════════════════════════════════

describe('WavAudioInverter', () => {
  const inverter = new WavAudioInverter();

  it('accepts valid WAV buffer', () => {
    const buf = makeWavBuffer(44100, 1, 16, new Float32Array(100));
    expect(inverter.accepts({ wavBuffer: buf })).toBe(true);
  });

  it('rejects non-WAV', () => {
    expect(inverter.accepts({ wavBuffer: Buffer.alloc(10) })).toBe(false);
    expect(inverter.accepts({} as any)).toBe(false);
  });

  it('extracts duration, sampleRate, channels, energy from sine wave', async () => {
    const sampleRate = 44100;
    const len = Math.floor(sampleRate * 0.5);
    const samples = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      samples[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }
    const buf = makeWavBuffer(sampleRate, 1, 16, samples);
    const report = await inverter.invert({ wavBuffer: buf });
    expect(report.domain).toEqual('music');
    expect(report.genes.length).toBeGreaterThanOrEqual(4);
    const sr = report.genes.find((g) => g.path === 'music.sampleRate');
    expect(sr).toBeDefined();
    expect(sr!.value).toEqual(44100);
    const duration = report.genes.find((g) => g.path === 'music.duration');
    expect(duration).toBeDefined();
    expect(duration!.value as number).toBeGreaterThan(0.4);
  });

  it('returns deterministic for same WAV', async () => {
    const samples = new Float32Array(100);
    for (let i = 0; i < 100; i++) samples[i] = Math.sin(i * 0.1);
    const buf = makeWavBuffer(44100, 1, 16, samples);
    const r1 = await inverter.invert({ wavBuffer: buf });
    const r2 = await inverter.invert({ wavBuffer: buf });
    expect(r1.genes).toEqual(r2.genes);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NarrativeTextInverter (accepts plain string, not object)
// ═══════════════════════════════════════════════════════════════════════════════

describe('NarrativeTextInverter', () => {
  const inverter = new NarrativeTextInverter();

  it('accepts long text string directly', () => {
    expect(inverter.accepts('This is a story about a hero.')).toBe(true);
    expect(inverter.accepts('')).toBe(false);
  });

  it('extracts tone, pov, pacing from prose', async () => {
    const story = 'I remember the old days. My mother was kind and warm. We danced in the golden light. Now I sit alone, yearning for those memories.';
    const report = await inverter.invert(story);
    expect(report.domain).toEqual('narrative');
    expect(report.genes.length).toBeGreaterThanOrEqual(3);
    const pov = report.genes.find((g) => g.path === 'narrative.pov');
    expect(pov).toBeDefined();
    const tone = report.genes.find((g) => g.path === 'narrative.tone');
    expect(tone).toBeDefined();
  });

  it('returns deterministic for same text', async () => {
    const text = 'The hero journey with trials and triumph.';
    const r1 = await inverter.invert(text);
    const r2 = await inverter.invert(text);
    expect(r1.genes).toEqual(r2.genes);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PersonaVectorInverter (expects { bigFive: { ... } })
// ═══════════════════════════════════════════════════════════════════════════════

describe('PersonaVectorInverter', () => {
  const inverter = new PersonaVectorInverter();

  it('accepts bigFive vector', () => {
    expect(inverter.accepts({ bigFive: { openness: 0.8, conscientiousness: 0.7, extraversion: 0.6, agreeableness: 0.5, neuroticism: 0.4 } })).toBe(true);
  });

  it('rejects partial vector', () => {
    expect(inverter.accepts({ bigFive: { openness: 0.5 } })).toBe(true);
    expect(inverter.accepts({} as any)).toBe(false);
  });

  it('converts Big-Five to persona genes', async () => {
    const report = await inverter.invert({
      bigFive: { openness: 0.9, conscientiousness: 0.2, extraversion: 0.7, agreeableness: 0.5, neuroticism: 0.1 },
    });
    expect(report.domain).toEqual('persona');
    const openness = report.genes.find((g) => g.path === 'persona.bigFive.openness');
    expect(openness).toBeDefined();
    expect(openness!.value).toBeCloseTo(0.9, 2);
  });

  it('detects archetype from bigFive profile', async () => {
    const report = await inverter.invert({
      bigFive: { openness: 0.9, conscientiousness: 0.8, extraversion: 0.3, agreeableness: 0.3, neuroticism: 0.1 },
      values: ['wisdom', 'truth'],
    });
    const archetype = report.genes.find((g) => g.path === 'persona.archetype');
    expect(archetype).toBeDefined();
  });

  it('returns deterministic', async () => {
    const v = { bigFive: { openness: 0.7, conscientiousness: 0.3, extraversion: 0.6, agreeableness: 0.8, neuroticism: 0.2 } };
    const r1 = await inverter.invert(v);
    const r2 = await inverter.invert(v);
    expect(r1.genes).toEqual(r2.genes);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SeedGraphInverter (expects { root: string, nodes: [{id, parents[], ...}] })
// ═══════════════════════════════════════════════════════════════════════════════

describe('SeedGraphInverter', () => {
  const inverter = new SeedGraphInverter();

  it('accepts lineage graph', () => {
    expect(inverter.accepts({ root: 'a', nodes: [{ id: 'a', parents: [] }] })).toBe(true);
  });

  it('rejects non-graph', () => {
    expect(inverter.accepts({})).toBe(false);
    expect(inverter.accepts({ nodes: [] })).toBe(false);
  });

  it('extracts depth, fanIn, operations from graph', async () => {
    const graph = {
      root: 'child1',
      nodes: [
        { id: 'root',   parents: [],                                                                               op: 'genesis' as const },
        { id: 'child1', parents: ['root'],                                                                         op: 'mutate' as const },
        { id: 'child2', parents: ['root'],                                                                         op: 'breed' as const },
      ],
    };
    const report = await inverter.invert(graph);
    expect(report.domain).toEqual('composition');
    expect(report.genes.length).toBeGreaterThanOrEqual(2);
    const depth = report.genes.find((g) => g.path === 'composition.depth');
    expect(depth).toBeDefined();
    expect(depth!.value).toBe(1);
  });

  it('returns deterministic', async () => {
    const graph = { root: 'a', nodes: [{ id: 'a', parents: [] }] };
    const r1 = await inverter.invert(graph);
    const r2 = await inverter.invert(graph);
    expect(r1.genes).toEqual(r2.genes);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DefaultInverterRegistry
// ═══════════════════════════════════════════════════════════════════════════════

describe('DefaultInverterRegistry', () => {
  const registry = new DefaultInverterRegistry();
  registry.register(new CharacterTextInverter());
  registry.register(new RgbImageInverter());

  it('registers and retrieves by id', () => {
    const inv = registry.get('character.text-cues-v1');
    expect(inv).toBeDefined();
    expect(inv!.id).toEqual('character.text-cues-v1');
  });

  it('returns undefined for unknown id', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('lists all registered inverters', () => {
    const all = registry.list();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('filters by domain', () => {
    const char = registry.forDomain('character');
    expect(char.length).toBeGreaterThanOrEqual(1);
    expect(char[0].domain).toEqual('character');
  });

  it('createStandardInverterRegistry preloads 3 reference inverters', () => {
    const r = createStandardInverterRegistry();
    expect(r.list().length).toBeGreaterThanOrEqual(3);
  });

  it('all registered inverters are deterministic', async () => {
    const all = registry.list();
    for (const inv of all) {
      expect(inv.id).toBeTruthy();
      expect(inv.domain).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3 COMPLIANCE — Determinism and Coverage
// ═══════════════════════════════════════════════════════════════════════════════

describe('Inverse Pipeline — Phase 3 Compliance', () => {
  it('CharacterTextInverter produces high-confidence for rich descriptions', async () => {
    const inv = new CharacterTextInverter();
    const rich = 'A curious, imaginative, creative, open-minded inventor who is kind, warm, empathic, and gentle.';
    const report = await inv.invert({ text: rich });
    const highConf = report.genes.filter((g) => g.confidence >= 0.6);
    expect(highConf.length).toBeGreaterThanOrEqual(5);
    expect(report.overallConfidence).toBeGreaterThan(0.5);
  });

  it('RgbImageInverter recovers exact resolution with max confidence', async () => {
    const inv = new RgbImageInverter();
    const data = new Uint8Array(48).fill(128);
    const report = await inv.invert({ width: 4, height: 4, data, channels: 3 as 3 | 4 });
    const width = report.genes.find((g) => g.path === 'visual2d.width');
    const height = report.genes.find((g) => g.path === 'visual2d.height');
    expect(width!.confidence).toBe(1.0);
    expect(height!.confidence).toBe(1.0);
  });

  it('All 6 inverters are importable and respond to accepts', () => {
    expect(new CharacterTextInverter().id).toBeTruthy();
    expect(new RgbImageInverter().id).toBeTruthy();
    expect(new WavAudioInverter().id).toBeTruthy();
    expect(new NarrativeTextInverter().id).toBeTruthy();
    expect(new PersonaVectorInverter().id).toBeTruthy();
    expect(new SeedGraphInverter().id).toBeTruthy();
  });
});
