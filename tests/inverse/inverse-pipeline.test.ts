/**
 * Inverse Pipeline tests — pin the 3 reference inverters.
 */
import { describe, it, expect } from 'vitest';
import {
  createStandardInverterRegistry,
  selectInverter,
  WavAudioInverter,
  RgbImageInverter,
  CharacterTextInverter,
} from '../../src/lib/intelligence/inverse';

function makeWav(durationSec: number, sampleRate: number, channels: number, gen: (t: number) => number): Buffer {
  const samples = Math.floor(durationSec * sampleRate);
  const dataSize = samples * channels * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataSize, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * channels * 2, 28);
  buf.writeUInt16LE(channels * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples; i++) {
    const v = Math.max(-1, Math.min(1, gen(i / sampleRate)));
    const s16 = Math.round(v * 32767);
    for (let c = 0; c < channels; c++) buf.writeInt16LE(s16, 44 + (i * channels + c) * 2);
  }
  return buf;
}

function makeImg(w: number, h: number, fn: (x: number, y: number) => [number, number, number]): { width: number; height: number; data: Buffer; channels: 3 } {
  const data = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r,g,b] = fn(x,y); const p = (y*w+x)*3;
    data[p]=r; data[p+1]=g; data[p+2]=b;
  }
  return { width: w, height: h, data, channels: 3 };
}

describe('Inverse Pipeline', () => {
  describe('registry', () => {
    it('createStandardInverterRegistry registers all 3 reference inverters', () => {
      const r = createStandardInverterRegistry();
      expect(r.list().map((i) => i.id).sort()).toEqual([
        'audio.wav-features-v1',
        'character.text-cues-v1',
        'visual2d.rgb-features-v1',
      ]);
    });

    it('selectInverter routes by domain + accepts()', () => {
      const r = createStandardInverterRegistry();
      const wav = makeWav(0.1, 22050, 1, () => 0);
      const audio = selectInverter(r, 'music', { wavBuffer: wav });
      expect(audio?.id).toBe('audio.wav-features-v1');
      const txt = selectInverter(r, 'character', { text: 'A curious and kind soul' });
      expect(txt?.id).toBe('character.text-cues-v1');
    });
  });

  describe('WavAudioInverter', () => {
    it('extracts duration + sampleRate + channels exactly', async () => {
      const inv = new WavAudioInverter();
      const wav = makeWav(2.0, 22050, 2, (t) => Math.sin(2*Math.PI*440*t)*0.4);
      const r = await inv.invert({ wavBuffer: wav });
      const byPath = Object.fromEntries(r.genes.map((g) => [g.path, g.value]));
      expect(byPath['music.sampleRate']).toBe(22050);
      expect(byPath['music.channels']).toBe(2);
      expect(byPath['music.duration']).toBeGreaterThan(1.99);
      expect(byPath['music.duration']).toBeLessThan(2.01);
    });

    it('is deterministic — same wav twice → identical report', async () => {
      const inv = new WavAudioInverter();
      const wav = makeWav(1.0, 22050, 1, (t) => Math.sin(2*Math.PI*440*t)*0.3);
      const a = await inv.invert({ wavBuffer: wav });
      const b = await inv.invert({ wavBuffer: wav });
      const stripT = (r: any) => ({ ...r, elapsedMs: 0 });
      expect(stripT(a)).toEqual(stripT(b));
    });

    it('residual emitted for high silence ratio', async () => {
      const inv = new WavAudioInverter();
      const wav = makeWav(1.0, 22050, 1, () => 0);
      const r = await inv.invert({ wavBuffer: wav });
      expect(r.residuals.find((x) => x.feature === 'silence')).toBeDefined();
    });

    it('rejects non-WAV buffers via accepts()', () => {
      const inv = new WavAudioInverter();
      expect(inv.accepts({ wavBuffer: Buffer.from('not a wav') })).toBe(false);
    });
  });

  describe('RgbImageInverter', () => {
    it('extracts width / height exactly + sensible palette', async () => {
      const inv = new RgbImageInverter();
      const img = makeImg(32, 32, () => [200, 100, 50]);
      const r = await inv.invert(img);
      const byPath = Object.fromEntries(r.genes.map((g) => [g.path, g.value]));
      expect(byPath['visual2d.width']).toBe(32);
      expect(byPath['visual2d.height']).toBe(32);
      const palette = byPath['visual2d.palette'] as string[];
      expect(palette.length).toBeGreaterThan(0);
      expect(palette[0]).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('warmness positive for warm image, negative for cool', async () => {
      const inv = new RgbImageInverter();
      const warm = await inv.invert(makeImg(16, 16, () => [220, 80, 30]));
      const cool = await inv.invert(makeImg(16, 16, () => [30, 80, 220]));
      const w = warm.genes.find((g) => g.path === 'visual2d.warmness')!.value as number;
      const c = cool.genes.find((g) => g.path === 'visual2d.warmness')!.value as number;
      expect(w).toBeGreaterThan(0);
      expect(c).toBeLessThan(0);
    });
  });

  describe('CharacterTextInverter', () => {
    it('high agreeableness for kind/warm cues', async () => {
      const inv = new CharacterTextInverter();
      const r = await inv.invert({ text: 'She was kind, warm, and gentle, with a compassionate smile.' });
      const A = r.genes.find((g) => g.path === 'persona.bigFive.agreeableness')!.value as number;
      expect(A).toBeGreaterThan(0.7);
    });

    it('low agreeableness for cruel/harsh cues', async () => {
      const inv = new CharacterTextInverter();
      const r = await inv.invert({ text: 'A cruel, cold, ruthless man with a callous heart.' });
      const A = r.genes.find((g) => g.path === 'persona.bigFive.agreeableness')!.value as number;
      expect(A).toBeLessThan(0.3);
    });

    it('emits melancholy tone gene when matching cues are present', async () => {
      const inv = new CharacterTextInverter();
      const r = await inv.invert({ text: 'An anxious, brooding, melancholy poet.' });
      expect(r.genes.find((g) => g.path === 'persona.tone' && g.value === 'melancholy')).toBeDefined();
    });

    it('residual + no-personality-cues for neutral prose', async () => {
      const inv = new CharacterTextInverter();
      const r = await inv.invert({ text: 'The clerk filed paperwork in alphabetical order.' });
      expect(r.residuals.find((x) => x.feature === 'no-personality-cues')).toBeDefined();
    });
  });
});
