/**
 * GSPL Module Resolver — Standard Library + Commons Import System
 *
 * Resolves `import` statements in GSPL programs to their source text.
 *
 * Resolution order:
 *   1. Built-in standard library (inline, no file I/O)
 *   2. data/commons/libraries/*.gspl  (domain science grounding)
 *   3. data/commons/seeds/*.gspl      (curated seed files)
 *   4. Absolute filesystem paths
 *   5. Relative paths (resolved from the importing file's directory)
 *
 * Import syntax (GSPL):
 *   import "std/geometry"
 *   import "std/music"
 *   import "biology"
 *   import "chemistry"
 *   import "./my-module"
 *   import "/absolute/path/to/module.gspl"
 */

import * as fs   from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-safe __dirname polyfill
const __dirname = (() => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    // CommonJS / Bun context where __dirname is already defined globally
    return typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  }
})();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModuleResolution {
  specifier: string;
  source: string;
  origin: 'stdlib' | 'commons' | 'filesystem';
  resolvedPath: string | null;
}

export interface ResolveOptions {
  /** Directory of the importing file (for relative imports) */
  fromDir?: string;
  /** Override for commons root (default: data/commons/libraries relative to repo root) */
  commonsRoot?: string;
}

// ─── Standard library (inline) ───────────────────────────────────────────────

const STDLIB: Record<string, string> = {
  'std/core': `
// Paradigm Standard Library — Core
// Fundamental types, combinators, and utilities available in all GSPL programs.

fn clamp(v: scalar, lo: scalar, hi: scalar) -> scalar {
  if v < lo { lo } else if v > hi { hi } else { v }
}

fn lerp(a: scalar, b: scalar, t: scalar) -> scalar {
  a + (b - a) * t
}

fn smoothstep(edge0: scalar, edge1: scalar, x: scalar) -> scalar {
  let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  t * t * (3.0 - 2.0 * t)
}

fn map(v: scalar, in_lo: scalar, in_hi: scalar, out_lo: scalar, out_hi: scalar) -> scalar {
  out_lo + (v - in_lo) * (out_hi - out_lo) / (in_hi - in_lo)
}

fn sign(v: scalar) -> scalar {
  if v > 0.0 { 1.0 } else if v < 0.0 { -1.0 } else { 0.0 }
}

fn fract(v: scalar) -> scalar {
  v - floor(v)
}

fn mix(a: scalar, b: scalar, t: scalar) -> scalar {
  lerp(a, b, t)
}
`,

  'std/geometry': `
// Paradigm Standard Library — Geometry
// 2D/3D vector math, SDF primitives, transforms.

seed Vec2 {
  gene x: scalar = 0.0
  gene y: scalar = 0.0
}

seed Vec3 {
  gene x: scalar = 0.0
  gene y: scalar = 0.0
  gene z: scalar = 0.0
}

fn vec2_length(v: Vec2) -> scalar {
  sqrt(v.x * v.x + v.y * v.y)
}

fn vec3_length(v: Vec3) -> scalar {
  sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

fn vec2_dot(a: Vec2, b: Vec2) -> scalar {
  a.x * b.x + a.y * b.y
}

fn vec3_dot(a: Vec3, b: Vec3) -> scalar {
  a.x * b.x + a.y * b.y + a.z * b.z
}

fn vec3_cross(a: Vec3, b: Vec3) -> Vec3 {
  Vec3 {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

// Signed distance function — sphere
fn sdf_sphere(p: Vec3, r: scalar) -> scalar {
  vec3_length(p) - r
}

// Signed distance function — box
fn sdf_box(p: Vec3, b: Vec3) -> scalar {
  let q_x = abs(p.x) - b.x
  let q_y = abs(p.y) - b.y
  let q_z = abs(p.z) - b.z
  let outer = vec3_length(Vec3 { x: max(q_x, 0.0), y: max(q_y, 0.0), z: max(q_z, 0.0) })
  outer + min(max(q_x, max(q_y, q_z)), 0.0)
}

// Smooth union of two SDFs
fn sdf_smooth_union(d1: scalar, d2: scalar, k: scalar) -> scalar {
  let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0)
  lerp(d2, d1, h) - k * h * (1.0 - h)
}
`,

  'std/noise': `
// Paradigm Standard Library — Noise
// Deterministic noise functions. All use the kernel RNG — no Math.random.

// 2D hash (deterministic, seed-stable)
fn hash2(p_x: scalar, p_y: scalar) -> scalar {
  let n = p_x * 127.1 + p_y * 311.7
  fract(sin(n) * 43758.5453123)
}

// Value noise 2D
fn vnoise2(p_x: scalar, p_y: scalar) -> scalar {
  let i_x = floor(p_x)
  let i_y = floor(p_y)
  let f_x = fract(p_x)
  let f_y = fract(p_y)
  let u_x = smoothstep(0.0, 1.0, f_x)
  let u_y = smoothstep(0.0, 1.0, f_y)
  let a = hash2(i_x,       i_y)
  let b = hash2(i_x + 1.0, i_y)
  let c = hash2(i_x,       i_y + 1.0)
  let d = hash2(i_x + 1.0, i_y + 1.0)
  lerp(lerp(a, b, u_x), lerp(c, d, u_x), u_y)
}

// Fractional Brownian Motion (fBm) — 4 octaves
fn fbm(p_x: scalar, p_y: scalar) -> scalar {
  let v  = 0.0
  let a  = 0.5
  let ox = p_x
  let oy = p_y
  let v0 = v  + a * vnoise2(ox,       oy)
  let v1 = v0 + a * 0.5 * vnoise2(ox * 2.0, oy * 2.0)
  let v2 = v1 + a * 0.25 * vnoise2(ox * 4.0, oy * 4.0)
  v2 + a * 0.125 * vnoise2(ox * 8.0, oy * 8.0)
}
`,

  'std/color': `
// Paradigm Standard Library — Color
// HSL/RGB/LAB conversions, palettes, harmony.

seed RGB {
  gene r: scalar = 0.0
  gene g: scalar = 0.0
  gene b: scalar = 0.0
}

seed HSL {
  gene h: scalar = 0.0
  gene s: scalar = 1.0
  gene l: scalar = 0.5
}

fn hsl_to_rgb(h: scalar, s: scalar, l: scalar) -> RGB {
  let c = (1.0 - abs(2.0 * l - 1.0)) * s
  let x = c * (1.0 - abs(fract(h / 60.0) * 2.0 - 1.0))
  let m = l - c / 2.0
  let r = if h < 60.0 { c } else if h < 120.0 { x } else if h < 180.0 { 0.0 } else if h < 240.0 { 0.0 } else if h < 300.0 { x } else { c }
  let g = if h < 60.0 { x } else if h < 120.0 { c } else if h < 180.0 { c } else if h < 240.0 { x } else if h < 300.0 { 0.0 } else { 0.0 }
  let b = if h < 60.0 { 0.0 } else if h < 120.0 { 0.0 } else if h < 180.0 { x } else if h < 240.0 { c } else if h < 300.0 { c } else { x }
  RGB { r: r + m, g: g + m, b: b + m }
}

fn complementary(h: scalar) -> scalar {
  fract((h + 180.0) / 360.0) * 360.0
}

fn triadic_a(h: scalar) -> scalar {
  fract((h + 120.0) / 360.0) * 360.0
}

fn triadic_b(h: scalar) -> scalar {
  fract((h + 240.0) / 360.0) * 360.0
}
`,

  'std/music': `
// Paradigm Standard Library — Music
// Intervals, scales, chord voicings, rhythm patterns.

// Equal temperament: MIDI note → frequency (Hz)
fn midi_to_hz(n: scalar) -> scalar {
  440.0 * pow(2.0, (n - 69.0) / 12.0)
}

// Scale degrees (semitones from root)
fn major_scale_semitones(degree: scalar) -> scalar {
  let d = degree % 7.0
  match d {
    0.0 => 0.0,  1.0 => 2.0,  2.0 => 4.0,  3.0 => 5.0,
    4.0 => 7.0,  5.0 => 9.0,  6.0 => 11.0, _ => 0.0,
  }
}

fn minor_scale_semitones(degree: scalar) -> scalar {
  let d = degree % 7.0
  match d {
    0.0 => 0.0,  1.0 => 2.0,  2.0 => 3.0,  3.0 => 5.0,
    4.0 => 7.0,  5.0 => 8.0,  6.0 => 10.0, _ => 0.0,
  }
}

// BPM to period (seconds)
fn bpm_to_period(bpm: scalar) -> scalar {
  60.0 / bpm
}

// Pentatonic major (5 notes)
fn pentatonic_semitones(degree: scalar) -> scalar {
  let d = degree % 5.0
  match d {
    0.0 => 0.0,  1.0 => 2.0,  2.0 => 4.0,
    3.0 => 7.0,  4.0 => 9.0,  _ => 0.0,
  }
}
`,

  'std/physics': `
// Paradigm Standard Library — Physics
// CODATA 2022 constants + kinematic helpers.

// Fundamental constants (CODATA 2022 exact values)
let C_LIGHT     = 299792458.0        // m/s  — speed of light in vacuum
let H_PLANCK    = 6.62607015e-34     // J·s  — Planck constant
let HBAR        = 1.054571817e-34    // J·s  — reduced Planck constant
let G_NEWTON    = 6.67430e-11        // N·m²/kg²
let K_BOLTZMANN = 1.380649e-23       // J/K
let E_CHARGE    = 1.602176634e-19    // C    — elementary charge
let M_ELECTRON  = 9.1093837015e-31   // kg
let M_PROTON    = 1.67262192369e-27  // kg
let N_AVOGADRO  = 6.02214076e23      // mol⁻¹
let EPSILON_0   = 8.8541878128e-12   // F/m  — vacuum permittivity
let MU_0        = 1.25663706212e-6   // H/m  — vacuum permeability
let ALPHA_FINE  = 7.2973525693e-3    // dimensionless — fine structure constant

// Kinematic helpers
fn kinetic_energy(m: scalar, v: scalar) -> scalar { 0.5 * m * v * v }
fn potential_energy(m: scalar, g: scalar, h: scalar) -> scalar { m * g * h }
fn momentum(m: scalar, v: scalar) -> scalar { m * v }
fn lorentz_factor(v: scalar) -> scalar { 1.0 / sqrt(1.0 - (v * v) / (C_LIGHT * C_LIGHT)) }
fn de_broglie(m: scalar, v: scalar) -> scalar { H_PLANCK / momentum(m, v) }
`,
};

// ─── Resolver ─────────────────────────────────────────────────────────────────

export class GsplModuleResolver {
  private readonly commonsRoot: string;

  constructor(opts: ResolveOptions = {}) {
    this.commonsRoot = opts.commonsRoot
      ?? path.resolve(__dirname, '../../../../data/commons/libraries');
  }

  resolve(specifier: string, fromDir?: string): ModuleResolution {
    // 1. Standard library
    const stdKey = specifier.startsWith('"') ? specifier.slice(1, -1) : specifier;
    if (stdKey in STDLIB) {
      return {
        specifier,
        source: STDLIB[stdKey],
        origin: 'stdlib',
        resolvedPath: null,
      };
    }

    // 2. Commons libraries (bare name like "biology", "chemistry")
    const commonsPath = path.join(this.commonsRoot, `${stdKey}.gspl`);
    if (fs.existsSync(commonsPath)) {
      return {
        specifier,
        source: fs.readFileSync(commonsPath, 'utf-8'),
        origin: 'commons',
        resolvedPath: commonsPath,
      };
    }

    // 3. Absolute path
    if (stdKey.startsWith('/')) {
      const abs = stdKey.endsWith('.gspl') ? stdKey : `${stdKey}.gspl`;
      if (fs.existsSync(abs)) {
        return {
          specifier,
          source: fs.readFileSync(abs, 'utf-8'),
          origin: 'filesystem',
          resolvedPath: abs,
        };
      }
    }

    // 4. Relative path
    if (fromDir && (stdKey.startsWith('./') || stdKey.startsWith('../'))) {
      const rel = path.resolve(fromDir, stdKey.endsWith('.gspl') ? stdKey : `${stdKey}.gspl`);
      if (fs.existsSync(rel)) {
        return {
          specifier,
          source: fs.readFileSync(rel, 'utf-8'),
          origin: 'filesystem',
          resolvedPath: rel,
        };
      }
    }

    throw new Error(`GSPL module not found: "${specifier}"\nSearched:\n  stdlib\n  ${commonsPath}\n  ${fromDir ? 'relative from ' + fromDir : '(no fromDir)'}`);
  }

  /** Resolve all imports in a GSPL source string, returning a resolved prelude + source. */
  resolveAll(source: string, fromDir?: string): string {
    const importRe = /^\s*import\s+"([^"]+)"\s*;?\s*$/gm;
    const resolved: string[] = [];
    const seen = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = importRe.exec(source)) !== null) {
      const spec = match[1];
      if (!seen.has(spec)) {
        seen.add(spec);
        const mod = this.resolve(spec, fromDir);
        // Recursively resolve transitive imports
        const inner = this.resolveAll(mod.source, mod.resolvedPath ? path.dirname(mod.resolvedPath) : fromDir);
        resolved.push(`// ── module: ${spec} ──\n${inner}`);
      }
    }

    const stripped = source.replace(/^\s*import\s+"[^"]+"\s*;?\s*$/gm, '');
    return [...resolved, stripped].join('\n\n');
  }

  /** List all available modules (stdlib + commons) */
  listAvailable(): Array<{ specifier: string; origin: 'stdlib' | 'commons' }> {
    const result: Array<{ specifier: string; origin: 'stdlib' | 'commons' }> = [];

    for (const key of Object.keys(STDLIB)) {
      result.push({ specifier: key, origin: 'stdlib' });
    }

    if (fs.existsSync(this.commonsRoot)) {
      for (const f of fs.readdirSync(this.commonsRoot)) {
        if (f.endsWith('.gspl')) {
          result.push({ specifier: f.replace(/\.gspl$/, ''), origin: 'commons' });
        }
      }
    }

    return result;
  }
}

export const defaultResolver = new GsplModuleResolver();
