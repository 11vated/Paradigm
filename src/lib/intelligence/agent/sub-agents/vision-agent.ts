/**
 * VisionAgent
 *
 * Source: PAradigm-reference/intelligence/8-sub-agents.md
 *
 * Translates the 12-D adjective vector into visual gene values:
 *   - hue (degrees on the color wheel)
 *   - saturation
 *   - value/lightness
 *   - palette (base, accent, complement)
 *   - contrast
 *   - composition.density
 *   - composition.symmetry
 *   - line.weight, line.curvature
 *
 * Reference implementation — uses pure 12-D → visual mapping. Future
 * versions may consult Reality Library 086B (Visual Phenomena Atlas)
 * for material/lighting specifics.
 */

import type { SubAgentInput, SubAgentOutput } from '../types';
import { BaseSubAgent, emit, intentVector, mapTo, projectAxis } from './base';

export class VisionAgent extends BaseSubAgent {
  readonly id = 'vision';
  readonly domain = 'visual';

  shouldRun(intent: { domains: string[] }): boolean {
    return ['visual', 'character', 'world', 'object', 'sprite', 'all'].some((d) =>
      intent.domains.includes(d),
    );
  }

  async run(input: SubAgentInput): Promise<SubAgentOutput> {
    const vec = intentVector(input.intent.adjectives);

    const valence = projectAxis(vec, 'valence');
    const arousal = projectAxis(vec, 'arousal');
    const warmth = projectAxis(vec, 'warmth');
    const brightness = projectAxis(vec, 'brightness');
    const hardness = projectAxis(vec, 'hardness');
    const density = projectAxis(vec, 'density');
    const smoothness = projectAxis(vec, 'smoothness');
    const novelty = projectAxis(vec, 'novelty');
    const organic = projectAxis(vec, 'organic');

    // ── Hue: warmth + valence drive position on the color wheel ──
    // warm + positive → orange/red (0–60°)
    // cold + positive → cyan/teal (180–210°)
    // warm + negative → muddy yellow-brown (40–80° darkened)
    // cold + negative → blue/violet (240–280°)
    let hueDeg: number;
    if (warmth > 0) {
      hueDeg = valence > 0 ? mapTo(arousal, 0, 60) : mapTo(arousal, 30, 75);
    } else {
      hueDeg = valence > 0 ? mapTo(arousal, 180, 210) : mapTo(arousal, 240, 290);
    }

    // Saturation: arousal + brightness drive vibrance
    const saturation = Math.max(0, Math.min(1, mapTo((arousal + brightness) / 2, 0.2, 0.95)));

    // Lightness: brightness directly
    const lightness = Math.max(0.05, Math.min(0.95, mapTo(brightness, 0.15, 0.85)));

    // Contrast: hardness + brightness amplitude
    const contrast = Math.max(0.1, Math.min(1, mapTo((hardness + Math.abs(brightness)) / 2, 0.2, 0.95)));

    // Composition density: density axis directly
    const compDensity = Math.max(0, Math.min(1, mapTo(density, 0, 1)));

    // Composition symmetry: smoothness + formality (clean → symmetric)
    const formality = projectAxis(vec, 'formality');
    const symmetry = Math.max(0, Math.min(1, mapTo((smoothness + formality) / 2, 0, 1)));

    // Line weight: hardness → thick, softness → thin
    const lineWeight = Math.max(0.2, Math.min(4, mapTo(hardness, 0.4, 3.5)));

    // Line curvature: organic + smoothness → flowing
    const curvature = Math.max(0, Math.min(1, mapTo((organic + smoothness) / 2, 0.1, 0.9)));

    // Stylization: novelty drives how far from photorealism we go
    const stylization = Math.max(0, Math.min(1, mapTo(novelty, 0.2, 0.95)));

    // Build palette (HSL → hex)
    const baseHex = hslToHex(hueDeg, saturation, lightness);
    const accentHex = hslToHex((hueDeg + 30) % 360, saturation, Math.min(0.95, lightness + 0.15));
    const complementHex = hslToHex((hueDeg + 180) % 360, saturation * 0.8, lightness);

    return {
      produced: [
        emit(this.id, 'visual.hueDeg', hueDeg, 0.85, 'valence×warmth × arousal'),
        emit(this.id, 'visual.saturation', saturation, 0.8, 'arousal+brightness'),
        emit(this.id, 'visual.lightness', lightness, 0.85, 'brightness'),
        emit(this.id, 'visual.contrast', contrast, 0.75, 'hardness+|brightness|'),
        emit(this.id, 'visual.palette.base', baseHex, 0.85),
        emit(this.id, 'visual.palette.accent', accentHex, 0.7),
        emit(this.id, 'visual.palette.complement', complementHex, 0.6),
        emit(this.id, 'visual.composition.density', compDensity, 0.7),
        emit(this.id, 'visual.composition.symmetry', symmetry, 0.7),
        emit(this.id, 'visual.line.weight', lineWeight, 0.75),
        emit(this.id, 'visual.line.curvature', curvature, 0.75),
        emit(this.id, 'visual.stylization', stylization, 0.7),
      ],
    };
  }
}

/** Pure HSL → #rrggbb conversion */
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)        { r = c; g = x; b = 0; }
  else if (h < 120)  { r = x; g = c; b = 0; }
  else if (h < 180)  { r = 0; g = c; b = x; }
  else if (h < 240)  { r = 0; g = x; b = c; }
  else if (h < 300)  { r = x; g = 0; b = c; }
  else               { r = c; g = 0; b = x; }
  const toHex = (n: number) => {
    const v = Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return v;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
