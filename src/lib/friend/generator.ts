/**
 * Friend generator — turns a FriendSeed into a FriendArtifact.
 *
 * For the Phase 1 MVP, the artifact contains:
 *   - A resolved phenotype (absolute body dimensions, rest pose, etc.)
 *   - A stylized 256×256 SVG portrait (deterministic from seed)
 *   - Voice rendering parameters (consumable by any TTS layer)
 *   - A persona vector (12-D unit-normed fingerprint)
 *
 * Future phases extend this to:
 *   - Full GLTF body via character-v3 composition
 *   - Real voice waveform via music-v2-style synthesis
 *   - Live cognition init state (memory + sub-agents)
 *
 * The generator is purely deterministic — no Date.now, no Math.random.
 * Same FriendSeed in → byte-identical FriendArtifact out.
 */

import { createHash } from 'crypto';
import {
  type FriendSeedData,
  type FriendArtifact,
  type FriendPhenotype,
  type VoiceRendering,
  type PersonaGene,
} from './types';

const GENERATOR_VERSION = '1.0.0';

// ─── Phenotype resolution ──────────────────────────────────────────────────

/**
 * Resolve gene-space body parameters into absolute physical units.
 * The base human is 1.75 m, scaled by `heightScale`.
 */
function resolveBody(seed: FriendSeedData): FriendPhenotype['body'] {
  const baseHeightM = 1.75;
  const heightM = baseHeightM * seed.genes.body.heightScale;
  return {
    archetype: seed.genes.body.archetype,
    heightM,
    shoulderWidthM: heightM * 0.23 * seed.genes.body.shoulderRatio,
    torsoLengthM: heightM * 0.30 * seed.genes.body.torsoRatio,
    limbLengthM: heightM * 0.43 * seed.genes.body.limbRatio,
    muscleMass: seed.genes.body.muscle,
    softness: seed.genes.body.softness,
    skinTone: seed.genes.body.skinTone,
  };
}

/**
 * Deterministic rest pose — a T-pose with seed-specific micro-variation.
 * Returns 23 joints × 3 axes = 69 floats. Stable across all friends so
 * the same seed always produces the same canonical pose.
 */
function resolveRestPose(seed: FriendSeedData): number[] {
  const out: number[] = [];
  // Tiny deterministic offsets derived from the seed hash bytes — gives
  // each friend a unique "stance" without invoking RNG state.
  const bytes = Buffer.from(seed.seedHash, 'hex');
  for (let j = 0; j < 23; j++) {
    for (let axis = 0; axis < 3; axis++) {
      const byteIdx = (j * 3 + axis) % bytes.length;
      const v = bytes[byteIdx] / 255 - 0.5;  // [-0.5, 0.5]
      out.push(v * 0.05);  // ±0.025 rad of variation
    }
  }
  return out;
}

// ─── Persona vector ────────────────────────────────────────────────────────

/**
 * Convert a PersonaGene into a 12-dimensional unit-normed embedding.
 * Layout:
 *   [0..4]   Big Five
 *   [5]      humor
 *   [6]      curiosity
 *   [7..11]  speech-style one-hot mapped onto 5 latent dims
 */
function personaToVector(persona: PersonaGene): number[] {
  const styleMap: Record<PersonaGene['speechStyle'], [number, number, number, number, number]> = {
    casual:      [1, 0, 0, 0, 0],
    formal:      [0, 1, 0, 0, 0],
    poetic:      [0.3, 0, 0.7, 0, 0],
    precise:     [0, 0.5, 0, 0.5, 0],
    playful:     [0.5, 0, 0.3, 0, 0.2],
    reserved:    [0, 0.7, 0, 0.3, 0],
    theatrical:  [0, 0, 0.5, 0, 0.5],
  };
  const style = styleMap[persona.speechStyle];

  const raw = [
    persona.bigFive.openness,
    persona.bigFive.conscientiousness,
    persona.bigFive.extraversion,
    persona.bigFive.agreeableness,
    persona.bigFive.neuroticism,
    persona.humor,
    persona.curiosity,
    ...style,
  ];
  const norm = Math.sqrt(raw.reduce((a, x) => a + x * x, 0)) || 1;
  return raw.map((x) => x / norm);
}

// ─── Voice rendering ───────────────────────────────────────────────────────

function resolveVoice(seed: FriendSeedData): VoiceRendering {
  return {
    pitchHz: seed.genes.voice.pitch,
    inflectionRange: seed.genes.voice.inflection,
    tempoWpm: seed.genes.voice.tempo,
    breathiness: seed.genes.voice.breathiness,
    warmth: seed.genes.voice.warmth,
    formants: seed.genes.voice.formants,
    accent: seed.genes.voice.accent,
  };
}

// ─── SVG portrait ──────────────────────────────────────────────────────────

/**
 * A stylized, deterministic 256×256 SVG portrait. Not a realistic render;
 * a recognizable identity-card glyph that is unique per seed and varies
 * smoothly with gene changes.
 */
function renderPortrait(seed: FriendSeedData): string {
  const f = seed.genes.face;
  const b = seed.genes.body;
  const v = seed.genes.voice;
  const p = seed.genes.persona;

  // Pre-compute style values
  const skinHex = rgbToHex(b.skinTone);
  const hairHex = rgbToHex(f.hairColor);
  const eyeHex = rgbToHex(f.eyeColor);

  // Face geometry — driven by the genes
  const cx = 128;
  const cy = 130;
  const headRy = 70 - f.cheekbones * 8;            // taller when cheekbones strong
  const headRx = 50 + f.roundness * 18;            // wider when rounder
  const eyeY = cy - 20 + (f.eyeHeight - 0.5) * 40;
  const eyeDx = 14 + f.eyeSpacing * 14;
  const eyeRx =
    f.eyeShape === 'narrow' || f.eyeShape === 'hooded' ? 6 :
    f.eyeShape === 'round' ? 7 :
    f.eyeShape === 'wide' ? 8 : 6;
  const eyeRy =
    f.eyeShape === 'round' ? 7 :
    f.eyeShape === 'narrow' || f.eyeShape === 'hooded' ? 3 :
    4;
  const noseY = cy + (f.noseHeight - 0.5) * 32;
  const mouthY = cy + 28;
  const mouthW = f.mouthShape === 'wide' ? 22 : f.mouthShape === 'small' ? 10 : 16;

  // Hair shape — a path that varies by hairStyle
  const hairPath = buildHairPath(f.hairStyle, cx, cy, headRx, headRy);

  // Background gradient — encodes personality color
  const bg1 = hsl(
    (p.bigFive.openness * 360) | 0,
    35 + p.bigFive.extraversion * 30,
    20 + p.bigFive.openness * 20,
  );
  const bg2 = hsl(
    ((p.bigFive.openness * 360 + 60) % 360) | 0,
    25 + p.humor * 30,
    8 + p.bigFive.conscientiousness * 14,
  );

  // Voice annotation — a small bar chart of formants
  const formantBars = v.formants
    .map((f, i) => {
      const h = Math.max(2, (f / 5000) * 20);
      const x = 16 + i * 6;
      return `<rect x="${x}" y="${244 - h}" width="4" height="${h}" fill="white" opacity="0.6"/>`;
    })
    .join('');

  // Bottom strip — name + seed id
  const name = escapeXml(seed.name);
  const id = seed.id;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bg1}"/>
      <stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#bg)"/>
  ${hairPath}
  <ellipse cx="${cx}" cy="${cy}" rx="${headRx.toFixed(2)}" ry="${headRy.toFixed(2)}" fill="${skinHex}"/>
  <!-- eyes -->
  <ellipse cx="${cx - eyeDx}" cy="${eyeY}" rx="${eyeRx}" ry="${eyeRy}" fill="white"/>
  <ellipse cx="${cx + eyeDx}" cy="${eyeY}" rx="${eyeRx}" ry="${eyeRy}" fill="white"/>
  <circle cx="${cx - eyeDx}" cy="${eyeY}" r="3" fill="${eyeHex}"/>
  <circle cx="${cx + eyeDx}" cy="${eyeY}" r="3" fill="${eyeHex}"/>
  <!-- brow -->
  <rect x="${cx - eyeDx - 8}" y="${eyeY - 10 - f.brow * 3}" width="16" height="2" fill="${hairHex}" opacity="${0.4 + f.brow * 0.6}"/>
  <rect x="${cx + eyeDx - 8}" y="${eyeY - 10 - f.brow * 3}" width="16" height="2" fill="${hairHex}" opacity="${0.4 + f.brow * 0.6}"/>
  <!-- nose -->
  <path d="M ${cx} ${noseY - 6} L ${cx - 4} ${noseY + 10} L ${cx + 4} ${noseY + 10} Z" fill="${darken(skinHex, 0.85)}" opacity="0.6"/>
  <!-- mouth -->
  <path d="M ${cx - mouthW / 2} ${mouthY} Q ${cx} ${mouthY + (p.humor * 6)} ${cx + mouthW / 2} ${mouthY}" stroke="${darken(skinHex, 0.55)}" stroke-width="2" fill="none"/>
  <!-- formant bars -->
  ${formantBars}
  <!-- name strip -->
  <rect x="0" y="226" width="256" height="30" fill="black" opacity="0.55"/>
  <text x="12" y="246" font-family="system-ui, sans-serif" font-size="14" fill="white" font-weight="600">${name}</text>
  <text x="244" y="246" font-family="ui-monospace, monospace" font-size="10" fill="white" opacity="0.75" text-anchor="end">${id}</text>
</svg>`;
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h | 0}, ${s | 0}%, ${l | 0}%)`;
}

function rgbToHex(rgb: [number, number, number]): string {
  const c = (x: number) => {
    const v = Math.max(0, Math.min(255, Math.round(x * 255)));
    return v.toString(16).padStart(2, '0');
  };
  return `#${c(rgb[0])}${c(rgb[1])}${c(rgb[2])}`;
}

function darken(hex: string, factor: number): string {
  // hex = "#rrggbb"
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const c = (x: number) =>
    Math.max(0, Math.min(255, Math.round(x * factor))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (ch) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[ch]!,
  );
}

function buildHairPath(style: string, cx: number, cy: number, headRx: number, headRy: number): string {
  const skin = '#000'; // not used — but each style varies
  // Each style returns one or more SVG path elements
  switch (style) {
    case 'buzz':
      return `<path d="M ${cx - headRx * 1.0} ${cy - headRy * 0.95} A ${headRx * 1.05} ${headRy * 0.7} 0 0 1 ${cx + headRx * 1.0} ${cy - headRy * 0.95} L ${cx + headRx * 0.9} ${cy - headRy * 0.7} L ${cx - headRx * 0.9} ${cy - headRy * 0.7} Z" fill="HAIR" opacity="0.85"/>`;
    case 'pixie':
    case 'short':
      return `<path d="M ${cx - headRx * 1.12} ${cy - headRy * 0.6} Q ${cx} ${cy - headRy * 1.35} ${cx + headRx * 1.12} ${cy - headRy * 0.6} L ${cx + headRx * 1.0} ${cy - headRy * 0.3} L ${cx - headRx * 1.0} ${cy - headRy * 0.3} Z" fill="HAIR"/>`;
    case 'long':
    case 'flowing':
      return `<path d="M ${cx - headRx * 1.25} ${cy - headRy * 0.8} Q ${cx} ${cy - headRy * 1.5} ${cx + headRx * 1.25} ${cy - headRy * 0.8} L ${cx + headRx * 1.4} ${cy + headRy * 0.6} Q ${cx} ${cy + headRy * 1.1} ${cx - headRx * 1.4} ${cy + headRy * 0.6} Z" fill="HAIR"/>`;
    case 'curly':
      return `<g fill="HAIR">
        <circle cx="${cx - headRx * 0.8}" cy="${cy - headRy * 0.9}" r="14"/>
        <circle cx="${cx}" cy="${cy - headRy * 1.05}" r="18"/>
        <circle cx="${cx + headRx * 0.8}" cy="${cy - headRy * 0.9}" r="14"/>
        <circle cx="${cx - headRx * 1.05}" cy="${cy - headRy * 0.4}" r="12"/>
        <circle cx="${cx + headRx * 1.05}" cy="${cy - headRy * 0.4}" r="12"/>
      </g>`;
    case 'bun':
    case 'pony':
      return `<g fill="HAIR">
        <path d="M ${cx - headRx * 1.08} ${cy - headRy * 0.6} Q ${cx} ${cy - headRy * 1.4} ${cx + headRx * 1.08} ${cy - headRy * 0.6} L ${cx + headRx * 0.95} ${cy - headRy * 0.3} L ${cx - headRx * 0.95} ${cy - headRy * 0.3} Z"/>
        <circle cx="${cx}" cy="${cy - headRy * 1.4}" r="18"/>
      </g>`;
    case 'wavy':
    case 'medium':
    case 'shoulder':
    default:
      return `<path d="M ${cx - headRx * 1.18} ${cy - headRy * 0.7} Q ${cx} ${cy - headRy * 1.4} ${cx + headRx * 1.18} ${cy - headRy * 0.7} L ${cx + headRx * 1.25} ${cy + headRy * 0.2} Q ${cx} ${cy + headRy * 0.5} ${cx - headRx * 1.25} ${cy + headRy * 0.2} Z" fill="HAIR"/>`;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Grow a FriendSeed into a FriendArtifact. Pure; deterministic;
 * no side effects.
 */
export function generateFriend(seed: FriendSeedData): FriendArtifact {
  const startNs = process.hrtime.bigint();
  const phenotype: FriendPhenotype = {
    body: resolveBody(seed),
    face: seed.genes.face,
    restPose: resolveRestPose(seed),
    portraitSvg: renderPortrait(seed).replace(/HAIR/g, rgbToHex(seed.genes.face.hairColor)),
  };
  const voice = resolveVoice(seed);
  const personaVector = personaToVector(seed.genes.persona);
  const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;

  return {
    seedId: seed.id,
    seedHash: seed.seedHash,
    phenotype,
    voice,
    personaVector,
    meta: {
      generator: 'friend',
      generatorVersion: GENERATOR_VERSION,
      elapsedMs,
    },
  };
}

/**
 * Compute the SHA-256 of the artifact's deterministic content
 * (everything except the observability `meta` block, which carries
 * non-deterministic wall-clock measurements). Used by tests and by the
 * marketplace to verify identical regeneration.
 */
export function hashArtifact(artifact: FriendArtifact): string {
  const { meta: _meta, ...deterministic } = artifact;
  return createHash('sha256')
    .update(canonicalJson(deterministic))
    .digest('hex');
}

/**
 * Deterministic JSON serialization — recursively sorts object keys so
 * two structurally-equal objects always produce the same byte sequence.
 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return '{' + keys.map((k) =>
    JSON.stringify(k) + ':' + canonicalJson((value as Record<string, unknown>)[k]),
  ).join(',') + '}';
}
