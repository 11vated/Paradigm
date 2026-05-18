/**
 * Generate 950 agent-authored seeds for the Seed Commons.
 *
 * Deterministic: same input → same seeds.
 * Run: npx tsx scripts/generate-commons-seeds.ts
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { rngFromHash, Xoshiro256StarStar } from '../src/lib/kernel/rng';

const COMMONS_ROOT = path.resolve('data/commons');
const SEEDS_DIR = path.join(COMMONS_ROOT, 'seeds');
const INDEX_PATH = path.join(COMMONS_ROOT, 'index.json');
const SEEDS_PER_DOMAIN = 35;
const TOTAL_TARGET = 950;

interface GeneDef {
  name: string;
  type: string;
  gen: (rng: Xoshiro256StarStar, idx: number) => unknown;
}

interface DomainTemplate {
  genes: GeneDef[];
  namePrefixes: string[];
  descPatterns: string[];
  tags: string[];
}

const DOMAIN_TEMPLATES: Record<string, DomainTemplate> = {
  character: {
    genes: [
      { name: 'archetype', type: 'categorical', gen: (r) => r.nextChoice(['warrior', 'mage', 'rogue', 'paladin', 'ranger', 'bard', 'druid', 'monk', 'necromancer', 'berzerker']) },
      { name: 'strength', type: 'scalar', gen: (r) => +(0.2 + r.nextF64() * 0.8).toFixed(2) },
      { name: 'agility', type: 'scalar', gen: (r) => +(0.2 + r.nextF64() * 0.8).toFixed(2) },
      { name: 'intelligence', type: 'scalar', gen: (r) => +(0.2 + r.nextF64() * 0.8).toFixed(2) },
      { name: 'size', type: 'scalar', gen: (r) => +(0.3 + r.nextF64() * 1.2).toFixed(2) },
      { name: 'palette', type: 'vector', gen: (r) => [+(r.nextF64()).toFixed(2), +(r.nextF64()).toFixed(2), +(r.nextF64()).toFixed(2)] },
      { name: 'personality', type: 'categorical', gen: (r) => r.nextChoice(['brave', 'cunning', 'wise', 'reckless', 'calm', 'fierce', 'stoic']) },
    ],
    namePrefixes: ['Shadow', 'Crimson', 'Iron', 'Storm', 'Frost', 'Ash', 'Ember', 'Void', 'Thunder', 'Sage', 'Blade', 'Dusk', 'Rune', 'Star', 'Wild'],
    descPatterns: ['A {adj} {archetype} of the {realm} realm', 'A {adj} warrior known for {trait}', 'A mysterious {archetype} from distant lands'],
    tags: ['character', 'agent-generated'],
  },
  music: {
    genes: [
      { name: 'key', type: 'categorical', gen: (r) => r.nextChoice(['C', 'D', 'E', 'F', 'G', 'A', 'B']) },
      { name: 'scale', type: 'categorical', gen: (r) => r.nextChoice(['major', 'minor', 'pentatonic', 'blues', 'dorian', 'mixolydian']) },
      { name: 'tempo', type: 'scalar', gen: (r) => +(0.2 + r.nextF64() * 0.8).toFixed(2) },
      { name: 'melody', type: 'array', gen: (r) => Array.from({ length: 8 }, () => 48 + r.nextInt(0, 36)) },
      { name: 'timbre', type: 'struct', gen: (r) => ({ warmth: +(r.nextF64()).toFixed(2), brightness: +(r.nextF64()).toFixed(2), attack: +(r.nextF64()).toFixed(2) }) },
    ],
    namePrefixes: ['Echo', 'Cascade', 'Whisper', 'Thunder', 'Silk', 'Crystal', 'Drift', 'Pulse', 'Hollow', 'Glow'],
    descPatterns: ['A {genre} piece in {key} {scale}', 'An atmospheric {scale} composition', 'A rhythmic {genre} melody with {tempo} tempo'],
    tags: ['music', 'agent-generated'],
  },
  sprite: {
    genes: [
      { name: 'resolution', type: 'scalar', gen: (r) => +(0.1 + r.nextF64() * 0.9).toFixed(2) },
      { name: 'paletteSize', type: 'scalar', gen: (r) => +(0.2 + r.nextF64() * 0.8).toFixed(2) },
      { name: 'symmetry', type: 'categorical', gen: (r) => r.nextChoice(['bilateral', 'radial', 'asymmetric']) },
      { name: 'colors', type: 'vector', gen: (r) => [+(r.nextF64()).toFixed(2), +(r.nextF64()).toFixed(2), +(r.nextF64()).toFixed(2)] },
    ],
    namePrefixes: ['Pixel', 'Block', 'Bit', 'Dot', 'Grid', 'Tile', 'Chip', 'Mosaic', 'Voxel', 'Glitch'],
    descPatterns: ['A {style} {size}px sprite', 'A pixel art {subject} with {paletteSize} colors', 'A {symmetry} symmetrical {style} character'],
    tags: ['sprite', 'agent-generated'],
  },
  visual2d: {
    genes: [
      { name: 'style', type: 'categorical', gen: (r) => r.nextChoice(['abstract', 'landscape', 'portrait', 'geometric', 'surreal', 'impressionist', 'minimal']) },
      { name: 'complexity', type: 'scalar', gen: (r) => +(0.1 + r.nextF64() * 0.9).toFixed(2) },
      { name: 'palette', type: 'vector', gen: (r) => [+(r.nextF64()).toFixed(2), +(r.nextF64()).toFixed(2), +(r.nextF64()).toFixed(2)] },
      { name: 'composition', type: 'categorical', gen: (r) => r.nextChoice(['centered', 'rule_of_thirds', 'golden_ratio', 'symmetrical', 'asymmetrical']) },
    ],
    namePrefixes: ['Chromatic', 'Aether', 'Prism', 'Spectrum', 'Canvas', 'Hue', 'Shade', 'Bloom', 'Lens', 'Brush'],
    descPatterns: ['A {style} composition with {complexity} complexity', 'A vibrant {palette} themed {style} artwork', 'A {composition} arrangement in {style} style'],
    tags: ['visual2d', 'agent-generated'],
  },
  procedural: {
    genes: [
      { name: 'biome', type: 'categorical', gen: (r) => r.nextChoice(['temperate', 'desert', 'tundra', 'jungle', 'oceanic', 'volcanic', 'alpine', 'savanna']) },
      { name: 'density', type: 'scalar', gen: (r) => +(0.1 + r.nextF64() * 0.9).toFixed(2) },
      { name: 'scale', type: 'scalar', gen: (r) => +(0.5 + r.nextF64() * 2.0).toFixed(2) },
      { name: 'octaves', type: 'scalar', gen: (r) => r.nextInt(2, 8) },
      { name: 'persistence', type: 'scalar', gen: (r) => +(0.2 + r.nextF64() * 0.7).toFixed(2) },
    ],
    namePrefixes: ['Terrain', 'Noise', 'Fractal', 'Zone', 'Biome', 'Expanse', 'Realm', 'Domain', 'Reach', 'Range'],
    descPatterns: ['A {biome} terrain with {density} density', 'A procedurally generated {biome} landscape', 'A {octaves}-octave {biome} heightmap'],
    tags: ['procedural', 'agent-generated'],
  },
  fullgame: {
    genes: [
      { name: 'genre', type: 'categorical', gen: (r) => r.nextChoice(['action', 'adventure', 'rpg', 'platformer', 'puzzle', 'shooter', 'strategy']) },
      { name: 'difficulty', type: 'scalar', gen: (r) => +(0.1 + r.nextF64() * 0.9).toFixed(2) },
      { name: 'levelCount', type: 'scalar', gen: (r) => r.nextInt(3, 20) },
      { name: 'mechanic', type: 'categorical', gen: (r) => r.nextChoice(['combat', 'stealth', 'puzzle', 'exploration', 'crafting', 'dialogue']) },
      { name: 'theme', type: 'categorical', gen: (r) => r.nextChoice(['fantasy', 'scifi', 'horror', 'western', 'cyberpunk', 'medieval']) },
    ],
    namePrefixes: ['Quest', 'Realm', 'Dungeon', 'Chronicle', 'Saga', 'Odyssey', 'Venture', 'Expedition', 'Crusade', 'Pilgrim'],
    descPatterns: ['A {genre} game with {levelCount} levels', 'A {theme} {genre} featuring {mechanic} mechanics', 'An action-packed {genre} set in {theme} world'],
    tags: ['fullgame', 'agent-generated'],
  },
  animation: {
    genes: [
      { name: 'frames', type: 'scalar', gen: (r) => r.nextInt(8, 60) },
      { name: 'fps', type: 'scalar', gen: (r) => r.nextInt(12, 60) },
      { name: 'easing', type: 'categorical', gen: (r) => r.nextChoice(['linear', 'ease_in', 'ease_out', 'ease_in_out', 'bounce', 'elastic']) },
      { name: 'amplitude', type: 'scalar', gen: (r) => +(0.1 + r.nextF64() * 0.9).toFixed(2) },
      { name: 'loop', type: 'categorical', gen: (r) => r.nextChoice(['none', 'loop', 'ping_pong']) },
    ],
    namePrefixes: ['Motion', 'Flow', 'Wave', 'Ripple', 'Pulse', 'Sway', 'Glide', 'Sweep', 'Spin', 'Dance'],
    descPatterns: ['A {frames}-frame animation at {fps}fps', 'A {easing} animated {amplitude} motion sequence', 'A looping {loop} animation with {frames} keyframes'],
    tags: ['animation', 'agent-generated'],
  },
  geometry3d: {
    genes: [
      { name: 'primitive', type: 'categorical', gen: (r) => r.nextChoice(['cube', 'sphere', 'torus', 'icosahedron', 'octahedron', 'trefoil', 'helix']) },
      { name: 'subdivision', type: 'scalar', gen: (r) => r.nextInt(0, 4) },
      { name: 'symmetry', type: 'categorical', gen: (r) => r.nextChoice(['radial_6', 'radial_8', 'mirror', 'tetrahedral', 'icosahedral']) },
      { name: 'scale', type: 'vector', gen: (r) => [+(0.5 + r.nextF64()).toFixed(2), +(0.5 + r.nextF64()).toFixed(2), +(0.5 + r.nextF64()).toFixed(2)] },
      { name: 'detail', type: 'scalar', gen: (r) => +(0.1 + r.nextF64() * 0.9).toFixed(2) },
    ],
    namePrefixes: ['Poly', 'Mesh', 'Vertex', 'Facet', 'Lattice', 'Knot', 'Orb', 'Crystal', 'Geo', 'Form'],
    descPatterns: ['A {primitive} with {subdivision} subdivisions', 'A {symmetry} polyhedron with {detail} detail', 'A {scale} scaled {primitive} mesh model'],
    tags: ['geometry3d', 'agent-generated'],
  },
  narrative: {
    genes: [
      { name: 'genre', type: 'categorical', gen: (r) => r.nextChoice(['fantasy', 'scifi', 'mystery', 'romance', 'horror', 'comedy', 'drama', 'thriller']) },
      { name: 'tone', type: 'categorical', gen: (r) => r.nextChoice(['epic', 'somber', 'whimsical', 'dark', 'hopeful', 'satirical', 'suspenseful']) },
      { name: 'length', type: 'scalar', gen: (r) => r.nextChoice([1, 3, 5, 7, 10]) },
      { name: 'characterCount', type: 'scalar', gen: (r) => r.nextInt(2, 12) },
      { name: 'structure', type: 'categorical', gen: (r) => r.nextChoice(['linear', 'non_linear', 'epistolary', 'frame_story', 'circular']) },
    ],
    namePrefixes: ['Tale', 'Saga', 'Fable', 'Legend', 'Myth', 'Chronicle', 'Parable', 'Epic', 'Folklore', 'Allegory'],
    descPatterns: ['A {tone} {genre} story with {characterCount} characters', 'A {structure} narrative in the {genre} genre', 'A {length}-act {genre} tale'],
    tags: ['narrative', 'agent-generated'],
  },
  ui: {
    genes: [
      { name: 'theme', type: 'categorical', gen: (r) => r.nextChoice(['dark', 'light', 'neon', 'pastel', 'monochrome', 'nature']) },
      { name: 'layout', type: 'categorical', gen: (r) => r.nextChoice(['dashboard', 'single_column', 'sidebar', 'grid', 'cards', 'tabs']) },
      { name: 'spacing', type: 'categorical', gen: (r) => r.nextChoice(['compact', 'comfortable', 'spacious', 'cozy']) },
      { name: 'radius', type: 'scalar', gen: (r) => +(0.0 + r.nextF64() * 1.0).toFixed(2) },
    ],
    namePrefixes: ['Panel', 'Dash', 'Console', 'HUD', 'Terminal', 'Monitor', 'View', 'Screen', 'Portal', 'Lens'],
    descPatterns: ['A {theme} {layout} interface', 'A {spacing} UI panel with {radius} border radius', 'A {theme} themed dashboard layout'],
    tags: ['ui', 'agent-generated'],
  },
  physics: {
    genes: [
      { name: 'gravity', type: 'scalar', gen: (r) => +(0.1 + r.nextF64() * 1.0).toFixed(2) },
      { name: 'friction', type: 'scalar', gen: (r) => +(0.0 + r.nextF64() * 0.5).toFixed(2) },
      { name: 'elasticity', type: 'scalar', gen: (r) => +(0.0 + r.nextF64() * 1.0).toFixed(2) },
      { name: 'bodyCount', type: 'scalar', gen: (r) => r.nextInt(5, 200) },
      { name: 'integrator', type: 'categorical', gen: (r) => r.nextChoice(['euler', 'verlet', 'rk4', 'symplectic']) },
    ],
    namePrefixes: ['Force', 'Mass', 'Vector', 'Momentum', 'Inertia', 'Kinetic', 'Dynamics', 'Flux', 'Tensor', 'Gravity'],
    descPatterns: ['A physics system with {gravity} gravity', 'A {bodyCount}-body {integrator} simulation', 'A physics engine with {friction} friction and {elasticity} elasticity'],
    tags: ['physics', 'agent-generated'],
  },
  audio: {
    genes: [
      { name: 'soundType', type: 'categorical', gen: (r) => r.nextChoice(['sfx', 'ambient', 'musical', 'noise', 'synth']) },
      { name: 'frequency', type: 'scalar', gen: (r) => r.nextChoice([55, 110, 220, 440, 880, 1760]) },
      { name: 'attack', type: 'scalar', gen: (r) => +(0.01 + r.nextF64() * 0.5).toFixed(3) },
      { name: 'decay', type: 'scalar', gen: (r) => +(0.01 + r.nextF64() * 0.5).toFixed(3) },
      { name: 'waveform', type: 'categorical', gen: (r) => r.nextChoice(['sine', 'square', 'sawtooth', 'triangle', 'noise']) },
    ],
    namePrefixes: ['Echo', 'Resonance', 'Tone', 'Signal', 'Harmonic', 'Pulse', 'Reverb', 'Chime', 'Bass', 'Treble'],
    descPatterns: ['A {frequency}Hz {waveform} sound', 'A {soundType} audio with {attack} attack', 'A {waveform} tone at {frequency} Hz'],
    tags: ['audio', 'agent-generated'],
  },
  ecosystem: {
    genes: [
      { name: 'species', type: 'scalar', gen: (r) => r.nextInt(5, 50) },
      { name: 'trophic', type: 'scalar', gen: (r) => r.nextInt(2, 6) },
      { name: 'size', type: 'scalar', gen: (r) => r.nextChoice([64, 128, 256, 512]) },
      { name: 'climate', type: 'categorical', gen: (r) => r.nextChoice(['tropical', 'temperate', 'arctic', 'arid', 'continental']) },
      { name: 'interaction', type: 'categorical', gen: (r) => r.nextChoice(['predator_prey', 'symbiotic', 'competitive', 'mutualistic']) },
    ],
    namePrefixes: ['Biosphere', 'Habitat', 'Sanctuary', 'Wilds', 'Eco', 'Nature', 'Grove', 'Realm', 'Domain', 'Cycle'],
    descPatterns: ['A {climate} ecosystem with {species} species', 'A {size}x{size} {interaction} simulation', 'A {trophic}-trophic level {climate} biome'],
    tags: ['ecosystem', 'agent-generated'],
  },
  game: {
    genes: [
      { name: 'genre', type: 'categorical', gen: (r) => r.nextChoice(['platformer', 'puzzle', 'shooter', 'rpg', 'adventure', 'strategy', 'racing', 'simulation']) },
      { name: 'difficulty', type: 'scalar', gen: (r) => +(0.1 + r.nextF64() * 0.9).toFixed(2) },
      { name: 'levelCount', type: 'scalar', gen: (r) => r.nextInt(1, 15) },
      { name: 'hasPowerups', type: 'categorical', gen: (r) => r.nextChoice([true, false]) },
    ],
    namePrefixes: ['Arcade', 'Quest', 'Rush', 'Clash', 'Dash', 'Puzzle', 'Battle', 'Speed', 'Blast', 'Fury'],
    descPatterns: ['A {genre} game with {levelCount} levels', 'A {difficulty} difficulty {genre} experience', 'A {genre} with {hasPowerups} powerups'],
    tags: ['game', 'agent-generated'],
  },
  alife: {
    genes: [
      { name: 'species', type: 'scalar', gen: (r) => r.nextInt(1, 8) },
      { name: 'rules', type: 'categorical', gen: (r) => r.nextChoice(['conway', 'highlife', 'day_night', 'seeds', 'wireworld']) },
      { name: 'gridSize', type: 'scalar', gen: (r) => r.nextChoice([32, 64, 128, 256]) },
      { name: 'generations', type: 'scalar', gen: (r) => r.nextInt(50, 1000) },
      { name: 'interaction', type: 'categorical', gen: (r) => r.nextChoice(['competitive', 'cooperative', 'parasitic', 'neutral']) },
    ],
    namePrefixes: ['Life', 'Primordial', 'Organic', 'Cellular', 'Swarm', 'Colony', 'Organism', 'Genesis', 'Evolve', 'Breed'],
    descPatterns: ['A {rules} alife simulation with {species} species', 'A {generations} generation {gridSize} grid ecosystem', 'A {interaction} artificial life environment'],
    tags: ['alife', 'agent-generated'],
  },
  shader: {
    genes: [
      { name: 'technique', type: 'categorical', gen: (r) => r.nextChoice(['raymarching', 'sdf', 'fbm_noise', 'voronoi', 'conformal', 'domain_warping', 'fractal']) },
      { name: 'iterations', type: 'scalar', gen: (r) => r.nextInt(8, 128) },
      { name: 'epsilon', type: 'scalar', gen: (r) => +(0.0001 + r.nextF64() * 0.01).toFixed(4) },
      { name: 'noise', type: 'categorical', gen: (r) => r.nextChoice(['simplex', 'value', 'cellular', 'perlin']) },
    ],
    namePrefixes: ['Fractal', 'SDF', 'Glow', 'Prism', 'Kaleido', 'Refract', 'Warp', 'Mandel', 'Plasma', 'Nova'],
    descPatterns: ['A {technique} shader with {iterations} iterations', 'A {noise}-based {technique} fragment shader', 'A {iterations}-step {noise} shader effect'],
    tags: ['shader', 'agent-generated'],
  },
  particle: {
    genes: [
      { name: 'emitter', type: 'categorical', gen: (r) => r.nextChoice(['point', 'cone', 'sphere', 'plane', 'ring', 'cylinder']) },
      { name: 'rate', type: 'scalar', gen: (r) => r.nextInt(10, 500) },
      { name: 'lifetime', type: 'scalar', gen: (r) => +(0.5 + r.nextF64() * 4.0).toFixed(1) },
      { name: 'velocity', type: 'scalar', gen: (r) => +(0.5 + r.nextF64() * 5.0).toFixed(1) },
      { name: 'particleType', type: 'categorical', gen: (r) => r.nextChoice(['spark', 'smoke', 'glow', 'debris', 'bubble', 'star']) },
    ],
    namePrefixes: ['Emitter', 'Spark', 'Burst', 'Trail', 'Cloud', 'Nebula', 'Storm', 'Shower', 'Drift', 'Plume'],
    descPatterns: ['A {particleType} {emitter} particle system', 'A {rate} particles/sec {emitter} with {lifetime}s lifetime', 'A {velocity} velocity {particleType} burst'],
    tags: ['particle', 'agent-generated'],
  },
  typography: {
    genes: [
      { name: 'weight', type: 'scalar', gen: (r) => r.nextChoice([100, 200, 300, 400, 500, 600, 700, 800, 900]) },
      { name: 'width', type: 'categorical', gen: (r) => r.nextChoice(['ultra_condensed', 'condensed', 'normal', 'expanded', 'ultra_expanded']) },
      { name: 'xheight', type: 'scalar', gen: (r) => +(0.3 + r.nextF64() * 0.5).toFixed(2) },
      { name: 'contrast', type: 'scalar', gen: (r) => +(0.1 + r.nextF64() * 0.9).toFixed(2) },
      { name: 'serif', type: 'categorical', gen: (r) => r.nextChoice(['none', 'bracketed', 'slab', 'hairline', 'wedge']) },
    ],
    namePrefixes: ['Type', 'Glyph', 'Letter', 'Font', 'Serif', 'Sans', 'Script', 'Display', 'Monaco', 'Text'],
    descPatterns: ['A {weight} weight {serif} serif typeface', 'A {width} {contrast} contrast font', 'A {xheight} x-height display typeface'],
    tags: ['typography', 'agent-generated'],
  },
  architecture: {
    genes: [
      { name: 'style', type: 'categorical', gen: (r) => r.nextChoice(['modern', 'gothic', 'classical', 'brutalist', 'victorian', 'futuristic', 'neoclassical', 'deconstructivist']) },
      { name: 'floors', type: 'scalar', gen: (r) => r.nextInt(1, 100) },
      { name: 'height', type: 'scalar', gen: (r) => +(5 + r.nextF64() * 300).toFixed(1) },
      { name: 'windows', type: 'categorical', gen: (r) => r.nextChoice(['arched', 'rectangular', 'circular', 'bay', 'stained_glass', 'ribbon']) },
      { name: 'roof', type: 'categorical', gen: (r) => r.nextChoice(['flat', 'gabled', 'hipped', 'mansard', 'shed', 'green']) },
    ],
    namePrefixes: ['Tower', 'Hall', 'Spire', 'Keep', 'House', 'Villa', 'Palace', 'Temple', 'Pavilion', 'Atrium'],
    descPatterns: ['A {style} {floors}-floor building', 'A {height}m {style} {roof} roof structure', 'A {style} building with {windows} windows'],
    tags: ['architecture', 'agent-generated'],
  },
  vehicle: {
    genes: [
      { name: 'vehicleType', type: 'categorical', gen: (r) => r.nextChoice(['car', 'ship', 'plane', 'spaceship', 'boat', 'train', 'bike', 'drone']) },
      { name: 'speed', type: 'scalar', gen: (r) => +(10 + r.nextF64() * 990).toFixed(1) },
      { name: 'mass', type: 'scalar', gen: (r) => +(100 + r.nextF64() * 9000).toFixed(1) },
      { name: 'range', type: 'scalar', gen: (r) => +(50 + r.nextF64() * 950).toFixed(1) },
      { name: 'propulsion', type: 'categorical', gen: (r) => r.nextChoice(['electric', 'combustion', 'hybrid', 'solar', 'nuclear', 'maglev', 'sail']) },
    ],
    namePrefixes: ['Cruiser', 'Racer', 'Hauler', 'Glider', 'Voyager', 'Rover', 'Sprinter', 'Barge', 'Jet', 'Ferry'],
    descPatterns: ['A {propulsion} {vehicleType} with {speed} top speed', 'A {mass}kg {vehicleType} with {range}km range', 'A {vehicleType} using {propulsion} propulsion'],
    tags: ['vehicle', 'agent-generated'],
  },
  furniture: {
    genes: [
      { name: 'furnitureType', type: 'categorical', gen: (r) => r.nextChoice(['chair', 'table', 'bed', 'shelf', 'cabinet', 'desk', 'sofa', 'stool', 'bench', 'lamp']) },
      { name: 'style', type: 'categorical', gen: (r) => r.nextChoice(['modern', 'mid_century', 'scandinavian', 'industrial', 'victorian', 'minimal', 'bohemian', 'rustic']) },
      { name: 'material', type: 'categorical', gen: (r) => r.nextChoice(['oak', 'walnut', 'steel', 'glass', 'marble', 'bamboo', 'concrete', 'leather']) },
      { name: 'dimensions', type: 'vector', gen: (r) => [+(0.3 + r.nextF64() * 2.0).toFixed(2), +(0.3 + r.nextF64() * 1.5).toFixed(2), +(0.3 + r.nextF64() * 1.0).toFixed(2)] },
      { name: 'ergonomics', type: 'scalar', gen: (r) => +(0.3 + r.nextF64() * 0.7).toFixed(2) },
    ],
    namePrefixes: ['Comfort', 'Form', 'Studio', 'Nest', 'Perch', 'Base', 'Lounge', 'Craft', 'Modular', 'Timber'],
    descPatterns: ['A {style} {material} {furnitureType}', 'A {dimensions} {furnitureType} with {ergonomics} ergonomic score', 'A {style} {furnitureType} in {material}'],
    tags: ['furniture', 'agent-generated'],
  },
  fashion: {
    genes: [
      { name: 'clothingType', type: 'categorical', gen: (r) => r.nextChoice(['shirt', 'pants', 'dress', 'jacket', 'coat', 'skirt', 'shoes', 'hat', 'scarf', 'gloves']) },
      { name: 'style', type: 'categorical', gen: (r) => r.nextChoice(['casual', 'formal', 'streetwear', 'avant_garde', 'vintage', 'sportswear', 'bohemian', 'minimal']) },
      { name: 'fabric', type: 'categorical', gen: (r) => r.nextChoice(['cotton', 'silk', 'wool', 'linen', 'denim', 'leather', 'polyester', 'hemp']) },
      { name: 'season', type: 'categorical', gen: (r) => r.nextChoice(['spring', 'summer', 'autumn', 'winter', 'all_season']) },
      { name: 'silhouette', type: 'categorical', gen: (r) => r.nextChoice(['fitted', 'loose', 'oversized', 'tailored', 'flowing', 'structured']) },
    ],
    namePrefixes: ['Silk', 'Velvet', 'Linen', 'Denim', 'Satin', 'Cotton', 'Wool', 'Mesh', 'Knit', 'Patch'],
    descPatterns: ['A {style} {fabric} {clothingType}', 'A {silhouette} {season} {clothingType}', 'A {fabric} {style} garment for {season}'],
    tags: ['fashion', 'agent-generated'],
  },
  robotics: {
    genes: [
      { name: 'robotType', type: 'categorical', gen: (r) => r.nextChoice(['humanoid', 'quadruped', 'hexapod', 'snake', 'arm', 'drone', 'wheeled', 'submersible']) },
      { name: 'dof', type: 'scalar', gen: (r) => r.nextInt(2, 32) },
      { name: 'payload', type: 'scalar', gen: (r) => +(0.5 + r.nextF64() * 500).toFixed(1) },
      { name: 'battery', type: 'scalar', gen: (r) => +(30 + r.nextF64() * 270).toFixed(1) },
      { name: 'sensors', type: 'categorical', gen: (r) => r.nextChoice(['lidar', 'camera', 'ultrasonic', 'infrared', 'imu', 'radar', 'gps']) },
    ],
    namePrefixes: ['Mech', 'Droid', 'Bot', 'Walker', 'Servo', 'Gear', 'Pneumo', 'Cyber', 'Auto', 'Mechatron'],
    descPatterns: ['A {robotType} with {dof} DOF', 'A {sensors} equipped {robotType} with {payload}kg payload', 'A {battery}min battery {robotType} robot'],
    tags: ['robotics', 'agent-generated'],
  },
  circuit: {
    genes: [
      { name: 'circuitType', type: 'categorical', gen: (r) => r.nextChoice(['amplifier', 'oscillator', 'filter', 'rectifier', 'modulator', 'timer', 'amplifier', 'converter', 'sensor']) },
      { name: 'componentCount', type: 'scalar', gen: (r) => r.nextInt(5, 100) },
      { name: 'power', type: 'scalar', gen: (r) => +(0.01 + r.nextF64() * 100).toFixed(2) },
      { name: 'frequency', type: 'scalar', gen: (r) => +(1 + r.nextF64() * 1000000).toFixed(1) },
      { name: 'isDigital', type: 'categorical', gen: (r) => r.nextChoice([true, false]) },
    ],
    namePrefixes: ['Board', 'Chip', 'Module', 'Core', 'Logic', 'Gate', 'Circuit', 'Node', 'Array', 'Matrix'],
    descPatterns: ['A {componentCount}-component {circuitType} circuit', 'A {frequency}Hz {circuitType} with {power}W power', 'A {isDigital} {circuitType} PCB design'],
    tags: ['circuit', 'agent-generated'],
  },
  food: {
    genes: [
      { name: 'foodType', type: 'categorical', gen: (r) => r.nextChoice(['apple', 'ramen', 'pizza', 'cake', 'bread', 'steak', 'salad', 'soup', 'chocolate', 'sushi', 'taco', 'pasta', 'curry', 'ice_cream', 'pie']) },
      { name: 'cuisine', type: 'categorical', gen: (r) => r.nextChoice(['italian', 'japanese', 'mexican', 'indian', 'french', 'thai', 'american', 'chinese', 'mediterranean', 'korean']) },
      { name: 'spice', type: 'scalar', gen: (r) => +(0.0 + r.nextF64() * 1.0).toFixed(2) },
      { name: 'prepTime', type: 'scalar', gen: (r) => r.nextInt(5, 120) },
      { name: 'cookTime', type: 'scalar', gen: (r) => r.nextInt(5, 180) },
    ],
    namePrefixes: ['Spice', 'Harvest', 'Flavor', 'Aroma', 'Savory', 'Zest', 'Bake', 'Roast', 'Blend', 'Taste'],
    descPatterns: ['A {cuisine} {foodType} with {spice} spice level', 'A {prepTime}min prep {foodType} dish', 'A {cuisine}-style {foodType} with {cookTime}min cook time'],
    tags: ['food', 'agent-generated'],
  },
  choreography: {
    genes: [
      { name: 'style', type: 'categorical', gen: (r) => r.nextChoice(['ballet', 'contemporary', 'hiphop', 'salsa', 'tango', 'jazz', 'tap', 'folk', 'ballroom', 'breakdance']) },
      { name: 'tempo', type: 'scalar', gen: (r) => +(0.2 + r.nextF64() * 0.8).toFixed(2) },
      { name: 'complexity', type: 'scalar', gen: (r) => +(0.1 + r.nextF64() * 0.9).toFixed(2) },
      { name: 'duration', type: 'scalar', gen: (r) => r.nextInt(30, 300) },
      { name: 'formation', type: 'categorical', gen: (r) => r.nextChoice(['solo', 'duet', 'trio', 'quartet', 'ensemble', 'corps']) },
    ],
    namePrefixes: ['Rhythm', 'Grace', 'Motion', 'Flow', 'Step', 'Swing', 'Twirl', 'Glide', 'Leap', 'Spin'],
    descPatterns: ['A {style} piece with {tempo} tempo', 'A {formation} {style} at {complexity} complexity', 'A {duration}sec {style} choreography'],
    tags: ['choreography', 'agent-generated'],
  },
  agent: {
    genes: [
      { name: 'persona', type: 'categorical', gen: (r) => r.nextChoice(['architect', 'artist', 'critic', 'explorer', 'composer', 'analyst', 'mentor', 'inventor', 'diplomat', 'sage']) },
      { name: 'temperature', type: 'scalar', gen: (r) => +(0.1 + r.nextF64() * 0.9).toFixed(2) },
      { name: 'reasoning', type: 'scalar', gen: (r) => +(0.2 + r.nextF64() * 0.8).toFixed(2) },
      { name: 'memory', type: 'scalar', gen: (r) => r.nextInt(1, 10) },
      { name: 'tools', type: 'array', gen: (r) => {
        const allTools = ['code', 'search', 'compose', 'analyze', 'design', 'translate', 'optimize', 'debug'];
        const count = r.nextInt(1, 4);
        return allTools.sort(() => r.nextF64() - 0.5).slice(0, count);
      }},
    ],
    namePrefixes: ['Sage', 'Oracle', 'Muse', 'Guide', 'Aide', 'Agent', 'Mind', 'Core', 'Spark', 'Nexus'],
    descPatterns: ['A {persona} agent with {temperature} temperature', 'A {reasoning} reasoning agent using {tools} tools', 'A {memory}-slot memory {persona} assistant'],
    tags: ['agent', 'agent-generated'],
  },
};

const ADJS = ['ancient', 'crimson', 'shadowy', 'radiant', 'silent', 'fierce', 'gentle', 'swift', 'wise', 'wild', 'dark', 'luminous', 'sacred', 'hollow', 'arcane'];
const REALMS = ['shadow', 'storm', 'crystal', 'ember', 'frost', 'verdant', 'abyssal', 'celestial', 'obsidian', 'golden'];

function interpolate(pattern: string, rng: Xoshiro256StarStar, archetype?: string): string {
  return pattern
    .replace('{adj}', rng.nextChoice(ADJS))
    .replace('{archetype}', archetype || rng.nextChoice(ADJS))
    .replace('{realm}', rng.nextChoice(REALMS))
    .replace('{trait}', rng.nextChoice(['valor', 'wisdom', 'stealth', 'power', 'grace', 'cunning']))
    .replace('{genre}', rng.nextChoice(['ambient', 'epic', 'dark', 'light', 'folk', 'cinematic', 'experimental']))
    .replace('{key}', rng.nextChoice(['C', 'D', 'E', 'F', 'G', 'A', 'B']))
    .replace('{scale}', rng.nextChoice(['major', 'minor', 'pentatonic', 'blues']))
    .replace('{tempo}', String(+(0.3 + rng.nextF64() * 0.5).toFixed(2)))
    .replace('{style}', rng.nextChoice(['pixel', 'retro', 'modern', 'flat', 'isometric', 'watercolor', 'sketch']))
    .replace('{size}', String(rng.nextInt(16, 128)))
    .replace('{subject}', rng.nextChoice(['knight', 'wizard', 'dragon', 'robot', 'tree', 'star', 'heart', 'sword']))
    .replace('{paletteSize}', String(rng.nextInt(4, 32)))
    .replace('{symmetry}', rng.nextChoice(['bilateral', 'radial', 'asymmetric']))
    .replace('{complexity}', String(+(0.1 + rng.nextF64() * 0.9).toFixed(2)))
    .replace('{palette}', String(rng.nextInt(1, 6)));
}

function buildSeedJson(
  domain: string,
  index: number,
  rng: Xoshiro256StarStar,
  template: DomainTemplate,
): object {
  const genes: Record<string, { value: unknown; type: string }> = {};
  for (const gd of template.genes) {
    genes[gd.name] = { value: gd.gen(rng, index), type: gd.type };
  }

  const prefix = rng.nextChoice(template.namePrefixes);
  const archetypeVal = genes.archetype?.value as string | undefined;
  const desc = rng.nextChoice(template.descPatterns);
  const description = interpolate(desc, rng, archetypeVal).replace(/\s+/g, ' ').trim();

  const name = `${prefix} ${archetypeVal || 'Seed'} #${String(index + 1).padStart(3, '0')}`;
  const sorted = JSON.stringify({ domain, genes }, Object.keys({ domain: '', genes: {} as Record<string, unknown> }).sort());
  const hash = crypto.createHash('sha256').update(sorted).digest('hex');

  const id = `agent-${domain}-${String(index + 1).padStart(3, '0')}`;
  const createdAt = new Date('2026-05-16T00:00:00.000Z');
  createdAt.setSeconds(createdAt.getSeconds() + index);

  return {
    version: '1.0.0',
    domain,
    lineage: { operation: 'agent_generated', generation: 1 },
    schema: 'https://paradigm.ai/schema/canonical-seed/v1',
    hash,
    provenance: 'generated',
    id,
    description,
    genes,
    fitness: { overall: +(0.7 + rng.nextF64() * 0.25).toFixed(2) },
    name,
    tags: [...template.tags, `batch-${Math.ceil((index + 1) / 10)}`],
    created: createdAt.toISOString(),
    author: 'agent',
  };
}

async function main() {
  console.log(`Generating ${TOTAL_TARGET} seeds for Seed Commons...`);
  console.log(`Target: ${SEEDS_PER_DOMAIN} seeds × 27 domains = ${27 * SEEDS_PER_DOMAIN} + 5 extra = ${TOTAL_TARGET}`);

  const masterRng = rngFromHash('paradigm-absolute-commons-950-v1');
  const domains = Object.keys(DOMAIN_TEMPLATES).sort();
  let total = 0;
  const entries: Array<{ id: string; name: string; domain: string; hash: string; tags: string[]; description: string; author: string; provenance: string; fitness: { overall: number }; file: string; created: string }> = [];

  for (const domain of domains) {
    const domainDir = path.join(SEEDS_DIR, domain);
    if (!fs.existsSync(domainDir)) {
      fs.mkdirSync(domainDir, { recursive: true });
    }

    const template = DOMAIN_TEMPLATES[domain];
    const domainRng = masterRng.fork(`domain:${domain}`);
    const count = domain === 'character' || domain === 'music' || domain === 'narrative'
      ? SEEDS_PER_DOMAIN + 1 : SEEDS_PER_DOMAIN;

    for (let i = 0; i < count; i++) {
      const seedRng = domainRng.fork(`seed:${i}`);
      const seedJson = buildSeedJson(domain, i, seedRng, template);

      const filename = `agent-${domain}-${String(i + 1).padStart(3, '0')}.json`;
      const filePath = path.join(domainDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(seedJson, null, 2) + '\n');

      const entryId = (seedJson as any).id;
      entries.push({
        id: entryId,
        name: (seedJson as any).name,
        domain,
        hash: (seedJson as any).hash,
        tags: (seedJson as any).tags,
        description: (seedJson as any).description,
        author: 'agent',
        provenance: 'generated',
        fitness: (seedJson as any).fitness,
        file: `${domain}/${filename}`,
        created: (seedJson as any).created,
      });

      total++;
    }
    console.log(`  ${domain}: ${count} seeds generated`);
  }

  // Add 5 extra seeds to top domains for exactly 950
  const extraTargets = ['character', 'music', 'narrative', 'sprite', 'visual2d'];
  for (const domain of extraTargets) {
    if (total >= TOTAL_TARGET) break;
    const template = DOMAIN_TEMPLATES[domain];
    const domainDir = path.join(SEEDS_DIR, domain);
    const domainRng = masterRng.fork(`domain:${domain}:extra`);
    const extraIdx = SEEDS_PER_DOMAIN + (domain === 'character' || domain === 'music' || domain === 'narrative' ? 1 : 0);

    for (let i = extraIdx; i < extraIdx + 1 && total < TOTAL_TARGET; i++) {
      const seedRng = domainRng.fork(`seed:${i}`);
      const seedJson = buildSeedJson(domain, i, seedRng, template);

      const filename = `agent-${domain}-${String(i + 1).padStart(3, '0')}.json`;
      const filePath = path.join(domainDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(seedJson, null, 2) + '\n');

      const entryId = (seedJson as any).id;
      entries.push({
        id: entryId,
        name: (seedJson as any).name,
        domain,
        hash: (seedJson as any).hash,
        tags: (seedJson as any).tags,
        description: (seedJson as any).description,
        author: 'agent',
        provenance: 'generated',
        fitness: (seedJson as any).fitness,
        file: `${domain}/${filename}`,
        created: (seedJson as any).created,
      });
      total++;
    }
  }

  // Load existing index and merge
  let existingEntries: any[] = [];
  if (fs.existsSync(INDEX_PATH)) {
    const existing = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
    existingEntries = existing.seeds || [];
    console.log(`Loaded existing index with ${existingEntries.length} existing entries`);
  }

  // Filter out any existing agent-generated seeds for these domains (to avoid duplicates)
  const existingHuman = existingEntries.filter((e: any) => e.author !== 'agent');
  const allSeeds = [...existingHuman, ...entries];

  // Build new index
  const newIndex = {
    version: '1.0.0',
    total: allSeeds.length,
    curated: allSeeds.filter((e: any) => e.provenance === 'curated' || e.provenance === 'genesis').length,
    generated: allSeeds.filter((e: any) => e.provenance === 'generated').length,
    seeds: allSeeds,
    updated: new Date().toISOString(),
  };

  fs.writeFileSync(INDEX_PATH, JSON.stringify(newIndex, null, 2) + '\n');
  console.log(`\nDone! Total seeds: ${total}`);
  console.log(`Index: ${allSeeds.length} entries (${newIndex.curated} curated + ${newIndex.generated} agent-generated)`);
  console.log(`Index saved to ${INDEX_PATH}`);
}

main().catch(console.error);
