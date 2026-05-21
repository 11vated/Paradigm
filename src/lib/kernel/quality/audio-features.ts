/**
 * Audio feature extraction — pure functions over PCM samples.
 */

export interface PcmStats {
  rms: number;
  zeroCrossRate: number;
  silenceRatio: number;
  peakAmp: number;
  crestFactor: number;
  spectralCentroidHz: number;
  stereoBalance: number;
  samples: number;
  channels: number;
  sampleRate: number;
}

export function parseWavHeader(buf: Buffer) {
  if (buf.length < 44) return null;
  if (buf.slice(0, 4).toString('ascii') !== 'RIFF') return null;
  if (buf.slice(8, 12).toString('ascii') !== 'WAVE') return null;
  let p = 12;
  let fmt: { sampleRate: number; channels: number; bitsPerSample: number } | null = null;
  let dataOffset = -1;
  let dataLength = -1;
  while (p + 8 <= buf.length) {
    const id = buf.slice(p, p + 4).toString('ascii');
    const size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { channels: buf.readUInt16LE(p + 10), sampleRate: buf.readUInt32LE(p + 12), bitsPerSample: buf.readUInt16LE(p + 22) };
    else if (id === 'data') { dataOffset = p + 8; dataLength = size; break; }
    p += 8 + size;
  }
  if (!fmt || dataOffset < 0) return null;
  return { ...fmt, dataOffset, dataLength };
}

export function analyzePcm(buf: Buffer): PcmStats | null {
  const h = parseWavHeader(buf);
  if (!h || h.bitsPerSample !== 16) return null;
  const { sampleRate, channels, dataOffset, dataLength } = h;
  const sampleCount = Math.floor(dataLength / 2 / channels);
  if (sampleCount === 0) return null;
  const stride = sampleCount > 200_000 ? Math.ceil(sampleCount / 200_000) : 1;
  let sumSq = 0, peakRaw = 0, silent = 0, crosses = 0, sumL = 0, sumR = 0, lastSign = 0, n = 0;
  for (let i = 0; i < sampleCount; i += stride) {
    const off = dataOffset + i * 2 * channels;
    const l = buf.readInt16LE(off) / 32768;
    const r = channels === 2 ? buf.readInt16LE(off + 2) / 32768 : l;
    const mid = (l + r) * 0.5;
    sumSq += mid * mid;
    const abs = Math.abs(mid);
    if (abs > peakRaw) peakRaw = abs;
    if (abs < 0.01) silent += 1;
    const sign = mid > 0 ? 1 : mid < 0 ? -1 : 0;
    if (sign !== 0 && lastSign !== 0 && sign !== lastSign) crosses += 1;
    if (sign !== 0) lastSign = sign;
    sumL += Math.abs(l); sumR += Math.abs(r);
    n += 1;
  }
  const rms = Math.sqrt(sumSq / Math.max(n, 1));
  const zeroCrossRate = crosses / Math.max(n - 1, 1);
  return {
    rms, zeroCrossRate,
    silenceRatio: silent / Math.max(n, 1),
    peakAmp: peakRaw,
    crestFactor: rms > 1e-6 ? peakRaw / rms : 0,
    spectralCentroidHz: (zeroCrossRate * sampleRate) / 2,
    stereoBalance: channels === 2 && (sumL + sumR) > 1e-6 ? (sumR - sumL) / (sumL + sumR) : 0,
    samples: n, channels, sampleRate,
  };
}

export function audioQualityAxes(stats: PcmStats): Record<string, number> {
  return {
    audible:         stats.rms > 0.005 ? 1 : Math.max(0, stats.rms / 0.005),
    dynamicRange:    Math.min(1, stats.crestFactor / 6),
    notSilent:       Math.max(0, 1 - stats.silenceRatio),
    notClipped:      stats.peakAmp < 0.99 ? 1 : 0.5,
    spectralLife:    Math.min(1, stats.spectralCentroidHz / 8000),
    stereoOrMono:    Math.abs(stats.stereoBalance) < 0.7 ? 1 : 0.5,
    minimumDuration: stats.samples / stats.sampleRate >= 1 ? 1 : (stats.samples / stats.sampleRate),
  };
}
