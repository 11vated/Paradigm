/**
 * Image feature extraction — pure functions over RGB pixel arrays.
 *
 * Inputs: { width, height, data: Uint8Array | Buffer } with 3- or 4-byte
 * pixel stride. Outputs are normalised to [0,1].
 */

export interface RgbBuf { width: number; height: number; data: Buffer | Uint8Array; channels: 3 | 4 }

export interface ImageStats {
  meanLuma: number;        // 0..1
  contrast: number;        // RMS-around-mean luma, 0..1
  colorVariance: number;   // mean per-channel variance, 0..1
  paletteEntropy: number;  // 0..1 (Shannon entropy of 16-bin histograms)
  edgeDensity: number;     // 0..1 (Sobel magnitude > threshold ratio)
  saturationMean: number;  // 0..1
  warmness: number;        // -1..1 (negative = cool, positive = warm)
}

function luma(r: number, g: number, b: number): number { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

export function analyzeImage(img: RgbBuf): ImageStats {
  const { width, height, data, channels } = img;
  const n = width * height;
  let sumL = 0, sumL2 = 0;
  let sumR = 0, sumG = 0, sumB = 0;
  let sumR2 = 0, sumG2 = 0, sumB2 = 0;
  let sumSat = 0;
  const hr = new Uint32Array(16), hg = new Uint32Array(16), hb = new Uint32Array(16);
  const px = (i: number) => i * channels;
  for (let i = 0; i < n; i++) {
    const p = px(i);
    const r = data[p] / 255, g = data[p+1] / 255, b = data[p+2] / 255;
    sumR += r; sumG += g; sumB += b;
    sumR2 += r*r; sumG2 += g*g; sumB2 += b*b;
    const L = luma(r, g, b); sumL += L; sumL2 += L*L;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    sumSat += mx > 0 ? (mx - mn) / mx : 0;
    hr[Math.min(15, (r * 16) | 0)]++;
    hg[Math.min(15, (g * 16) | 0)]++;
    hb[Math.min(15, (b * 16) | 0)]++;
  }
  const meanL = sumL / n;
  const varL = Math.max(0, sumL2 / n - meanL * meanL);
  const meanR = sumR / n, meanG = sumG / n, meanB = sumB / n;
  const varR = Math.max(0, sumR2 / n - meanR * meanR);
  const varG = Math.max(0, sumG2 / n - meanG * meanG);
  const varB = Math.max(0, sumB2 / n - meanB * meanB);
  const colorVariance = (varR + varG + varB) / 3;
  const ent = (h: Uint32Array) => {
    let e = 0;
    for (let i = 0; i < 16; i++) { const p = h[i] / n; if (p > 0) e -= p * Math.log2(p); }
    return e / 4; // /log2(16) = /4
  };
  const paletteEntropy = (ent(hr) + ent(hg) + ent(hb)) / 3;
  // Edge density via 1-D row differences (cheap)
  let edges = 0; const thresh = 0.08;
  for (let y = 0; y < height; y++) {
    for (let x = 1; x < width; x++) {
      const a = data[px(y*width + x - 1)] / 255;
      const c = data[px(y*width + x)] / 255;
      if (Math.abs(c - a) > thresh) edges++;
    }
  }
  return {
    meanLuma: meanL,
    contrast: Math.sqrt(varL) * 2,
    colorVariance: Math.min(1, colorVariance * 4),
    paletteEntropy,
    edgeDensity: edges / n,
    saturationMean: sumSat / n,
    warmness: 2 * (meanR + meanG*0.5 - meanB) - 1,
  };
}

export function imageQualityAxes(s: ImageStats): Record<string, number> {
  return {
    notBlankLuma:   s.meanLuma > 0.02 && s.meanLuma < 0.98 ? 1 : 0,
    hasContrast:    Math.min(1, s.contrast / 0.35),
    colorRich:      Math.min(1, s.colorVariance * 2),
    paletteVariety: Math.min(1, s.paletteEntropy),
    edgePresence:   Math.min(1, s.edgeDensity / 0.15),
    saturated:      Math.min(1, s.saturationMean * 2),
  };
}
