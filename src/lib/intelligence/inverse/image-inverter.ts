/**
 * Image inverter — recover (palette, warmness, contrast, density,
 * edgeStyle) from an RGB pixel buffer.
 */
import { kernelNow } from '../../kernel/clock';
import { analyzeImage } from '../../kernel/quality/image-features';
import { confidenceLevel } from './types';
import type { Inverter, InversionReport, InvertedGene, InversionResidual } from './types';

function topColors(data: Buffer | Uint8Array, channels: 3 | 4, count: number): string[] {
  const bin = (v: number) => Math.min(15, (v / 16) | 0);
  const counts = new Map<number, number>();
  const px = data.length / channels;
  for (let i = 0; i < px; i++) {
    const p = i * channels;
    const k = (bin(data[p]) << 8) | (bin(data[p+1]) << 4) | bin(data[p+2]);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, count);
  return ranked.map(([k]) => {
    const r = ((k >> 8) & 15) * 16, g = ((k >> 4) & 15) * 16, b = (k & 15) * 16;
    return '#' + [r,g,b].map((v) => v.toString(16).padStart(2, '0')).join('');
  });
}

export class RgbImageInverter implements Inverter<{ width: number; height: number; data: Buffer | Uint8Array; channels: 3 | 4 }> {
  readonly id = 'visual2d.rgb-features-v1';
  readonly domain = 'visual2d';
  accepts(a: { width: number; height: number; data: unknown; channels: number }): boolean {
    return typeof a?.width === 'number' && typeof a?.height === 'number' && (a?.channels === 3 || a?.channels === 4) && (Buffer.isBuffer(a?.data as any) || a?.data instanceof Uint8Array);
  }
  async invert(a: { width: number; height: number; data: Buffer | Uint8Array; channels: 3 | 4 }): Promise<InversionReport> {
    const start = kernelNow();
    const stats = analyzeImage(a as any);
    const palette = topColors(a.data, a.channels, 5);
    const genes: InvertedGene[] = [
      { path: 'visual2d.width',          value: a.width,                 confidence: 1.0,  level: confidenceLevel(1.0),  note: 'measured' },
      { path: 'visual2d.height',         value: a.height,                confidence: 1.0,  level: confidenceLevel(1.0),  note: 'measured' },
      { path: 'visual2d.palette',        value: palette,                 confidence: 0.85, level: confidenceLevel(0.85), note: 'top-5 16-bin RGB histogram' },
      { path: 'visual2d.contrast',       value: stats.contrast,          confidence: 0.85, level: confidenceLevel(0.85), note: 'RMS-luma' },
      { path: 'visual2d.warmness',       value: stats.warmness,          confidence: 0.85, level: confidenceLevel(0.85), note: 'R+G/2 - B' },
      { path: 'visual2d.edgeDensity',    value: stats.edgeDensity,       confidence: 0.7,  level: confidenceLevel(0.7),  note: 'row-delta threshold 0.08' },
      { path: 'visual2d.paletteEntropy', value: stats.paletteEntropy,    confidence: 0.85, level: confidenceLevel(0.85), note: 'Shannon over 16-bin RGB' },
      { path: 'visual2d.saturation',     value: stats.saturationMean,    confidence: 0.85, level: confidenceLevel(0.85), note: 'HSV-style' },
    ];
    const residuals: InversionResidual[] = [];
    if (stats.edgeDensity > 0.2) residuals.push({ feature: 'high-edge-density', reason: 'no-gene', raw: { density: stats.edgeDensity, note: 'maybe vector or pixel-art — style gene not modelled' } });
    const overall = genes.filter((g) => g.confidence >= 0.6).reduce((s, g) => s + g.confidence, 0) / Math.max(1, genes.filter((g) => g.confidence >= 0.6).length);
    return { domain: this.domain, inverterId: this.id, artifactBytes: a.data.byteLength, genes, residuals, overallConfidence: overall, elapsedMs: kernelNow() - start };
  }
}
