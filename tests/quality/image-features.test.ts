/**
 * Image feature extraction tests — generates tiny synthetic RGB images.
 */
import { describe, it, expect } from 'vitest';
import { analyzeImage, imageQualityAxes } from '../../src/lib/kernel/quality/image-features';

function makeImage(w: number, h: number, fn: (x: number, y: number) => [number, number, number]): { width: number; height: number; data: Buffer; channels: 3 } {
  const data = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x, y);
      const p = (y * w + x) * 3;
      data[p] = r; data[p+1] = g; data[p+2] = b;
    }
  }
  return { width: w, height: h, data, channels: 3 };
}

describe('image-features', () => {
  it('reports near-zero contrast for a uniform grey image', () => {
    const img = makeImage(32, 32, () => [128, 128, 128]);
    const s = analyzeImage(img);
    expect(s.contrast).toBeLessThan(0.05);
    expect(s.colorVariance).toBeLessThan(0.05);
    expect(s.edgeDensity).toBeLessThan(0.05);
  });

  it('reports high contrast + edges for a black/white checkerboard', () => {
    const img = makeImage(32, 32, (x, y) => ((x + y) % 2 === 0 ? [255, 255, 255] : [0, 0, 0]));
    const s = analyzeImage(img);
    expect(s.contrast).toBeGreaterThan(0.4);
    expect(s.edgeDensity).toBeGreaterThan(0.3);
  });

  it('warmness positive for a red-dominant image, negative for blue', () => {
    const red = analyzeImage(makeImage(16, 16, () => [220, 80, 30]));
    const blue = analyzeImage(makeImage(16, 16, () => [30, 80, 220]));
    expect(red.warmness).toBeGreaterThan(0);
    expect(blue.warmness).toBeLessThan(0);
  });

  it('paletteEntropy higher for a colour gradient than for a flat fill', () => {
    const flat = analyzeImage(makeImage(32, 32, () => [120, 120, 120]));
    const grad = analyzeImage(makeImage(32, 32, (x) => [Math.floor((x / 32) * 255), 120, 255 - Math.floor((x / 32) * 255)]));
    expect(grad.paletteEntropy).toBeGreaterThan(flat.paletteEntropy);
  });

  it('imageQualityAxes scores a textured image higher than a blank one', () => {
    const blank = imageQualityAxes(analyzeImage(makeImage(32, 32, () => [255, 255, 255])));
    const textured = imageQualityAxes(analyzeImage(makeImage(32, 32, (x, y) => [(x*8)&255, (y*8)&255, ((x+y)*4)&255])));
    const blankSum = Object.values(blank).reduce((s, v) => s + v, 0);
    const texturedSum = Object.values(textured).reduce((s, v) => s + v, 0);
    expect(texturedSum).toBeGreaterThan(blankSum);
  });
});
