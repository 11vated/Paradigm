/**
 * Paradigm Absolute — 27 Domain Engines
 * Each engine grows a seed into an artifact descriptor.
 * Ported from Python engines.py — every grow() has real logic, no stubs.
 * 27th domain "agent" grows seeds into runnable agent configurations.
 */

interface Seed {
  $name?: string;
  $domain?: string;
  $hash?: string;
  $lineage?: { generation?: number };
  genes?: Record<string, { type?: string; value?: any }>;
  [key: string]: any;
}

interface Artifact {
  type: string;
  name: string;
  domain: string;
  seed_hash: string;
  generation: number;
  render_hints: Record<string, any>;
  [key: string]: any;
}

function geneVal(seed: Seed, name: string, fallback: any = null): any {
  return seed.genes?.[name]?.value ?? fallback;
}

// ─── PRIMARY ENGINES ──────────────────────────────────────────────────────────

function growCharacter(seed: Seed): Artifact {
  const size = geneVal(seed, 'size', 1.0);
  const archetype = geneVal(seed, 'archetype', 'warrior');
  const strength = geneVal(seed, 'strength', 0.5);
  const agility = geneVal(seed, 'agility', 0.5);
  const palette = geneVal(seed, 'palette', [0.5, 0.5, 0.5]);
  let personality = geneVal(seed, 'personality', 'neutral');
  if (typeof personality === 'object' && personality !== null) personality = personality.trait ?? 'neutral';
  const bodyWidth = 0.3 + strength * 0.4;
  const bodyHeight = size * 0.8;
  const speed = agility * 10;
  const r = Math.floor(Math.min(palette[0] ?? 0.5, 1) * 255);
  const g = Math.floor(Math.min(palette[1] ?? 0.5, 1) * 255);
  const b = Math.floor(Math.min(palette[2] ?? 0.5, 1) * 255);
  return {
    type: 'character', name: seed.$name ?? 'Unknown', domain: 'character',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    archetype,
    visual: { body_width: +bodyWidth.toFixed(2), body_height: +bodyHeight.toFixed(2), color: `rgb(${r},${g},${b})`, size_factor: +size.toFixed(2) },
    stats: { strength: Math.round(strength * 100), agility: Math.round(agility * 100), speed: +speed.toFixed(1), hp: Math.round(100 + strength * 200) },
    personality,
    render_hints: { mode: '2d_character', animated: true },
  };
}

function growSprite(seed: Seed): Artifact {
  let resolution = geneVal(seed, 'resolution', 32);
  if (typeof resolution === 'number' && resolution <= 1) resolution = Math.floor(resolution * 64);
  let paletteSize = geneVal(seed, 'paletteSize', 8);
  if (typeof paletteSize === 'number' && paletteSize <= 1) paletteSize = Math.floor(paletteSize * 16);
  const colors = geneVal(seed, 'colors', [0.8, 0.2, 0.3]);
  const symmetry = geneVal(seed, 'symmetry', 'bilateral');
  return {
    type: 'sprite', name: seed.$name ?? 'Sprite', domain: 'sprite',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    visual: {
      resolution: Math.max(8, Math.min(resolution, 128)),
      palette_size: Math.max(2, Math.min(paletteSize, 32)),
      primary_color: `hsl(${Math.floor((colors[0] ?? 0.5) * 360)}, 70%, 50%)`,
      secondary_color: `hsl(${Math.floor((colors[1] ?? 0.25) * 360)}, 60%, 40%)`,
      symmetry,
    },
    render_hints: { mode: '2d_sprite', pixel_art: true },
  };
}

function growMusic(seed: Seed): Artifact {
  let tempo = geneVal(seed, 'tempo', 0.5);
  if (typeof tempo === 'number' && tempo <= 1) tempo = 60 + tempo * 140;
  return {
    type: 'music', name: seed.$name ?? 'Composition', domain: 'music',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    musical: {
      tempo: Math.round(tempo),
      key: geneVal(seed, 'key', 'C'),
      scale: geneVal(seed, 'scale', 'major'),
      time_signature: '4/4', measures: 8,
    },
    timbre: (() => { const t = geneVal(seed, 'timbre', {}); return typeof t === 'object' ? t : { warmth: 0.5 }; })(),
    melody_preview: (() => { const m = geneVal(seed, 'melody', []); return Array.isArray(m) ? m.slice(0, 16) : []; })(),
    render_hints: { mode: 'audio_waveform', playable: true },
  };
}

function growVisual2d(seed: Seed): Artifact {
  const style = geneVal(seed, 'style', 'abstract');
  const complexity = geneVal(seed, 'complexity', 0.5);
  return {
    type: 'visual2d', name: seed.$name ?? 'Visual', domain: 'visual2d',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    visual: {
      style, complexity: typeof complexity === 'number' ? +complexity.toFixed(2) : complexity,
      palette: geneVal(seed, 'palette', [0.5, 0.3, 0.8]),
      composition: geneVal(seed, 'composition', 'centered'),
      layers: typeof complexity === 'number' ? Math.max(3, Math.floor(complexity * 10)) : 5,
    },
    render_hints: { mode: '2d_canvas', generative: true },
  };
}

function growProcedural(seed: Seed): Artifact {
  let octaves = geneVal(seed, 'octaves', 4);
  if (typeof octaves === 'number' && octaves <= 1) octaves = Math.max(1, Math.floor(octaves * 8));
  return {
    type: 'procedural', name: seed.$name ?? 'Terrain', domain: 'procedural',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    terrain: {
      octaves,
      persistence: +(geneVal(seed, 'persistence', 0.5)).toFixed(3),
      scale: +(geneVal(seed, 'scale', 1.0)).toFixed(2),
      biome: geneVal(seed, 'biome', 'temperate'),
      heightmap_size: 256,
    },
    render_hints: { mode: '2d_heightmap', interactive: true },
  };
}

// ─── EXTENDED ENGINES ─────────────────────────────────────────────────────────

function growFullgame(seed: Seed): Artifact {
  const genre = geneVal(seed, 'genre', 'action');
  const diff = typeof geneVal(seed, 'difficulty', 0.5) === 'number' ? geneVal(seed, 'difficulty', 0.5) : 0.5;
  const levelCount = typeof geneVal(seed, 'levelCount', 0.5) === 'number' ? geneVal(seed, 'levelCount', 0.5) : 0.5;
  const complexity = typeof geneVal(seed, 'complexity', 0.5) === 'number' ? geneVal(seed, 'complexity', 0.5) : 0.5;
  const mechanics = geneVal(seed, 'mechanics', ['action']);
  const levels = Math.max(3, Math.floor(levelCount * 20));
  const enemyTypes = Math.max(2, Math.floor(diff * 8 + complexity * 4));
  const bossCount = Math.max(1, Math.floor(levels / 4));
  const difficultyCurve: number[] = [];
  for (let i = 0; i < levels; i++) {
    difficultyCurve.push(+(diff * 0.3 + (diff * 0.7) * (i / Math.max(1, levels - 1))).toFixed(3));
  }
  const biomeCount = Math.max(2, Math.floor(complexity * 6 + levelCount * 3));
  const hasHub = complexity > 0.4;
  const explorationFactor = +(complexity * 0.6 + (1 - diff) * 0.4).toFixed(3);
  return {
    type: 'fullgame', name: seed.$name ?? 'Game', domain: 'fullgame',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    game: { genre, difficulty: +diff.toFixed(2), levels, mechanics },
    progression: { enemy_types: enemyTypes, boss_count: bossCount, difficulty_curve: difficultyCurve },
    world: { biome_count: biomeCount, has_hub: hasHub, exploration_factor: explorationFactor },
    render_hints: { mode: 'game_preview', interactive: true },
  };
}

function growAnimation(seed: Seed): Artifact {
  const frameCountRaw = typeof geneVal(seed, 'frameCount', 0.5) === 'number' ? geneVal(seed, 'frameCount', 0.5) : 0.5;
  const fpsRaw = typeof geneVal(seed, 'fps', 0.5) === 'number' ? geneVal(seed, 'fps', 0.5) : 0.5;
  const amplitude = typeof geneVal(seed, 'amplitude', 0.5) === 'number' ? geneVal(seed, 'amplitude', 0.5) : 0.5;
  const frequency = typeof geneVal(seed, 'frequency', 0.3) === 'number' ? geneVal(seed, 'frequency', 0.3) : 0.3;
  const motionType = geneVal(seed, 'motionType', 'skeletal');
  const loop = geneVal(seed, 'loop', 'loop');
  const frameCount = Math.max(4, Math.floor(frameCountRaw * 60));
  const fps = Math.max(8, Math.floor(fpsRaw * 60));
  const durationSec = +(frameCount / fps).toFixed(3);
  const blendMode = amplitude > 0.7 ? 'additive' : amplitude > 0.4 ? 'override' : 'blend';
  const keyframes: { frame: number; value: number }[] = [];
  const keyframeStep = Math.max(1, Math.floor(frameCount / 8));
  for (let f = 0; f < frameCount; f += keyframeStep) {
    keyframes.push({ frame: f, value: +(amplitude * Math.sin(2 * Math.PI * frequency * (f / Math.max(1, frameCount - 1)))).toFixed(4) });
  }
  return {
    type: 'animation', name: seed.$name ?? 'Animation', domain: 'animation',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    animation: { frame_count: frameCount, fps, motion_type: motionType, loop },
    keyframes,
    motion: { amplitude: +amplitude.toFixed(3), frequency: +frequency.toFixed(3), blend_mode: blendMode },
    duration_sec: durationSec,
    render_hints: { mode: 'animation_timeline', animated: true },
  };
}

function growGeometry3d(seed: Seed): Artifact {
  const primitive = geneVal(seed, 'primitive', 'sphere');
  const detail = typeof geneVal(seed, 'detail', 0.5) === 'number' ? geneVal(seed, 'detail', 0.5) : 0.5;
  const materialPreset = geneVal(seed, 'material', 'metal');
  const scaleVal = typeof geneVal(seed, 'scale', 1.0) === 'number' ? geneVal(seed, 'scale', 1.0) : 1.0;
  const subdivisions = Math.max(1, Math.floor(detail * 8));
  const roughnessMap: Record<string, number> = { metal: 0.15, wood: 0.6, stone: 0.75, glass: 0.05, plastic: 0.4, ceramic: 0.3 };
  const metalnessMap: Record<string, number> = { metal: 0.9, wood: 0.0, stone: 0.0, glass: 0.1, plastic: 0.0, ceramic: 0.05 };
  const roughness = roughnessMap[materialPreset] ?? 0.5;
  const metalness = metalnessMap[materialPreset] ?? 0.2;
  const baseFaces: Record<string, number> = { sphere: 20, cube: 6, cylinder: 32, torus: 48, cone: 16, plane: 1 };
  const faces = baseFaces[primitive] ?? 20;
  const vertexEstimate = Math.floor(faces * Math.pow(4, subdivisions) * 0.5 + 2);
  const halfExtent = scaleVal * 0.5;
  return {
    type: 'geometry3d', name: seed.$name ?? '3D Object', domain: 'geometry3d',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    mesh: { primitive, subdivisions, scale: [scaleVal, scaleVal, scaleVal] },
    material: { preset: materialPreset, roughness: +roughness.toFixed(3), metalness: +metalness.toFixed(3) },
    vertex_estimate: vertexEstimate,
    bounds: { min: [-halfExtent, -halfExtent, -halfExtent], max: [halfExtent, halfExtent, halfExtent] },
    render_hints: { mode: '3d_viewport', rotatable: true },
  };
}

function growNarrative(seed: Seed): Artifact {
  const structure = geneVal(seed, 'structure', 'heros_journey');
  const tone = geneVal(seed, 'tone', 'epic');
  const cast = geneVal(seed, 'characters', ['hero', 'villain']);
  const plot = geneVal(seed, 'plot', 'quest');
  const complexity = typeof geneVal(seed, 'complexity', 0.5) === 'number' ? geneVal(seed, 'complexity', 0.5) : 0.5;
  const castSize = Array.isArray(cast) ? cast.length : 2;
  const acts = complexity > 0.7 ? 5 : complexity > 0.4 ? 3 : 2;
  const subplots = Math.max(1, Math.floor(complexity * castSize));
  const wordEstimate = Math.floor(2000 + complexity * 18000 + castSize * 1500);
  const toneThemes: Record<string, string[]> = {
    epic: ['heroism', 'sacrifice', 'destiny'], dark: ['betrayal', 'survival', 'corruption'],
    comic: ['absurdity', 'friendship', 'mishap'], tragic: ['loss', 'hubris', 'fate'],
    romantic: ['devotion', 'longing', 'reunion'], mysterious: ['secrets', 'identity', 'discovery'],
  };
  const themes = toneThemes[tone] ?? ['conflict', 'growth', 'resolution'];
  const pacingMap: Record<string, string> = { epic: 'building', dark: 'slow_burn', comic: 'snappy', tragic: 'measured', romantic: 'flowing', mysterious: 'deliberate' };
  const pacing = pacingMap[tone] ?? 'moderate';
  const povOptions = ['first', 'third_limited', 'third_omniscient'];
  const povIndex = Math.floor(complexity * (povOptions.length - 0.01));
  return {
    type: 'narrative', name: seed.$name ?? 'Story', domain: 'narrative',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    story: { structure, tone, characters: cast, plot, acts },
    narrative: { subplots, word_estimate: wordEstimate, themes, pacing, pov: povOptions[povIndex] },
    render_hints: { mode: 'narrative_flow', readable: true },
  };
}

function growUi(seed: Seed): Artifact {
  const layout = geneVal(seed, 'layout', 'dashboard');
  const theme = geneVal(seed, 'theme', 'dark');
  const components = geneVal(seed, 'components', ['header', 'sidebar', 'main']);
  const density = typeof geneVal(seed, 'density', 0.5) === 'number' ? geneVal(seed, 'density', 0.5) : 0.5;
  const paletteMap: Record<string, { bg: string; fg: string; accent: string }> = {
    dark: { bg: '#1a1a2e', fg: '#e0e0e0', accent: '#0f3460' },
    light: { bg: '#fafafa', fg: '#212121', accent: '#1976d2' },
    solarized: { bg: '#002b36', fg: '#839496', accent: '#b58900' },
    nord: { bg: '#2e3440', fg: '#eceff4', accent: '#88c0d0' },
  };
  const palette = paletteMap[theme] ?? paletteMap.dark;
  const borderRadius = Math.floor(2 + (1 - density) * 14);
  const fontScale = +(0.75 + (1 - density) * 0.5).toFixed(2);
  const componentCount = Array.isArray(components) ? components.length : 3;
  const gridColumns = density > 0.7 ? 4 : density > 0.4 ? 3 : 2;
  const spacingPx = Math.floor(4 + (1 - density) * 20);
  return {
    type: 'ui', name: seed.$name ?? 'Interface', domain: 'ui',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    interface: { layout, theme, components },
    design: { palette, border_radius: borderRadius, font_scale: fontScale, component_count: componentCount },
    grid_columns: gridColumns,
    spacing_px: spacingPx,
    render_hints: { mode: 'ui_preview', interactive: true },
  };
}

function growPhysics(seed: Seed): Artifact {
  const grav = typeof geneVal(seed, 'gravity', 0.5) === 'number' ? geneVal(seed, 'gravity', 0.5) : 0.5;
  const friction = typeof geneVal(seed, 'friction', 0.3) === 'number' ? geneVal(seed, 'friction', 0.3) : 0.3;
  const elasticity = typeof geneVal(seed, 'elasticity', 0.8) === 'number' ? geneVal(seed, 'elasticity', 0.8) : 0.8;
  const simType = geneVal(seed, 'simulationType', 'rigid_body');
  const bodyCount = Math.max(2, Math.floor(grav * 20 + friction * 10));
  const gravity = +(grav * 20).toFixed(2);
  const energyDissipation = +(friction * (1 - elasticity) * 0.5).toFixed(4);
  const collisionDetection = bodyCount > 15 ? 'broad_phase_sap' : bodyCount > 6 ? 'broad_phase_aabb' : 'naive';
  const integratorMap: Record<string, string> = { rigid_body: 'verlet', soft_body: 'rk4', fluid: 'sph', cloth: 'pbd' };
  const integrator = integratorMap[simType] ?? 'euler';
  const boundsExtent = +(10 + grav * 40).toFixed(1);
  const dt = +(1 / (60 + bodyCount * 2)).toFixed(6);
  return {
    type: 'physics', name: seed.$name ?? 'Simulation', domain: 'physics',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    simulation: { gravity, friction: +friction.toFixed(3), elasticity: +elasticity.toFixed(3), type: simType, steps: 1000 },
    config: { body_count: bodyCount, energy_dissipation: energyDissipation, collision_detection: collisionDetection, integrator },
    bounds: { min: [-boundsExtent, -boundsExtent, -boundsExtent], max: [boundsExtent, boundsExtent, boundsExtent] },
    dt,
    render_hints: { mode: 'physics_sim', animated: true },
  };
}

function growAudio(seed: Seed): Artifact {
  const soundType = geneVal(seed, 'soundType', 'sfx');
  const durationRaw = typeof geneVal(seed, 'duration', 0.5) === 'number' ? geneVal(seed, 'duration', 0.5) : 0.5;
  const freq = typeof geneVal(seed, 'frequency', 440) === 'number' ? geneVal(seed, 'frequency', 440) : 440;
  const brightness = typeof geneVal(seed, 'brightness', 0.5) === 'number' ? geneVal(seed, 'brightness', 0.5) : 0.5;
  const durationMs = Math.max(100, Math.floor(durationRaw * 5000));
  const sampleRate = 44100;
  const sampleCount = Math.floor(sampleRate * durationMs / 1000);
  const harmonics = Math.max(1, Math.floor(brightness * 12 + 1));
  const attack = +(0.005 + (1 - brightness) * 0.1).toFixed(4);
  const decay = +(0.05 + durationRaw * 0.3).toFixed(4);
  const sustain = +(0.3 + (1 - brightness) * 0.5).toFixed(3);
  const release = +(0.05 + durationRaw * 0.4).toFixed(4);
  const filterFreq = Math.floor(200 + brightness * 18000);
  const filterType = brightness > 0.6 ? 'highpass' : brightness < 0.3 ? 'lowpass' : 'bandpass';
  return {
    type: 'audio', name: seed.$name ?? 'Sound', domain: 'audio',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    audio: { type: soundType, duration_ms: durationMs, frequency: freq },
    synthesis: { harmonics, envelope: { attack, decay, sustain, release }, filter: filterType, filter_freq: filterFreq },
    sample_rate: sampleRate,
    sample_count: sampleCount,
    render_hints: { mode: 'audio_waveform', playable: true },
  };
}

function growEcosystem(seed: Seed): Artifact {
  const speciesRaw = typeof geneVal(seed, 'speciesCount', 0.5) === 'number' ? geneVal(seed, 'speciesCount', 0.5) : 0.5;
  const environment = geneVal(seed, 'environment', 'forest');
  const stability = typeof geneVal(seed, 'stability', 0.6) === 'number' ? geneVal(seed, 'stability', 0.6) : 0.6;
  const rainfall = typeof geneVal(seed, 'rainfall', 0.5) === 'number' ? geneVal(seed, 'rainfall', 0.5) : 0.5;
  const speciesCount = Math.max(2, Math.floor(speciesRaw * 20));
  const carryingCapacity = Math.floor(speciesCount * (100 + rainfall * 400));
  const trophicLevels = Math.min(5, Math.max(2, Math.floor(speciesCount / 3)));
  const extinctionRisk = +((1 - stability) * (1 - rainfall * 0.3)).toFixed(3);
  const energyFlow = +(rainfall * 0.4 + stability * 0.6).toFixed(3);
  const cycleLength = Math.floor(12 + (1 - stability) * 36);
  const cycles = Math.max(1, Math.floor(48 / cycleLength));
  return {
    type: 'ecosystem', name: seed.$name ?? 'Ecosystem', domain: 'ecosystem',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    ecosystem: { species_count: speciesCount, environment, stability: +stability.toFixed(3), interactions: ['predation', 'symbiosis', 'competition'] },
    dynamics: { carrying_capacity: carryingCapacity, trophic_levels: trophicLevels, extinction_risk: extinctionRisk, energy_flow: energyFlow, cycles },
    render_hints: { mode: 'ecosystem_graph', animated: true },
  };
}

function growGame(seed: Seed): Artifact {
  const mechanicType = geneVal(seed, 'mechanicType', 'turn_based');
  const complexity = typeof geneVal(seed, 'complexity', 0.5) === 'number' ? geneVal(seed, 'complexity', 0.5) : 0.5;
  const players = typeof geneVal(seed, 'players', 2) === 'number' ? geneVal(seed, 'players', 2) : 2;
  const balance = typeof geneVal(seed, 'balance', 0.5) === 'number' ? geneVal(seed, 'balance', 0.5) : 0.5;
  const decisionPoints = Math.max(3, Math.floor(complexity * 12 + players * 2));
  const avgTurnSeconds = Math.floor(5 + complexity * 55 + (players > 4 ? 15 : 0));
  const balanceFactor = +(balance * 0.8 + (1 - complexity) * 0.2).toFixed(3);
  const winConditions = Math.max(1, Math.floor(complexity * 3 + 1));
  return {
    type: 'game', name: seed.$name ?? 'Game Mechanic', domain: 'game',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    mechanic: { type: mechanicType, complexity: +complexity.toFixed(2), players },
    design: { decision_points: decisionPoints, avg_turn_seconds: avgTurnSeconds, balance_factor: balanceFactor, win_conditions: winConditions },
    render_hints: { mode: 'mechanic_diagram' },
  };
}

function growAlife(seed: Seed): Artifact {
  const rules = geneVal(seed, 'rules', 'conway');
  const gridSizeRaw = typeof geneVal(seed, 'gridSize', 0.5) === 'number' ? geneVal(seed, 'gridSize', 0.5) : 0.5;
  const density = typeof geneVal(seed, 'density', 0.3) === 'number' ? geneVal(seed, 'density', 0.3) : 0.3;
  const wrapping = geneVal(seed, 'wrapping', true);
  const gridSize = Math.max(16, Math.floor(gridSizeRaw * 128));
  const cellCount = gridSize * gridSize;
  const initialAlive = Math.floor(cellCount * density);
  const rulesets: Record<string, { birth: number[]; survive: number[] }> = {
    conway: { birth: [3], survive: [2, 3] },
    highlife: { birth: [3, 6], survive: [2, 3] },
    daynight: { birth: [3, 6, 7, 8], survive: [3, 4, 6, 7, 8] },
    seeds: { birth: [2], survive: [] },
  };
  const ruleset = rulesets[rules] ?? rulesets.conway;
  return {
    type: 'alife', name: seed.$name ?? 'Artificial Life', domain: 'alife',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    alife: { rules, grid_size: gridSize, initial_density: +density.toFixed(3) },
    simulation: { cell_count: cellCount, initial_alive: initialAlive, birth_rule: ruleset.birth, survive_rule: ruleset.survive, wrapping: !!wrapping },
    render_hints: { mode: 'cellular_automata', animated: true },
  };
}

function growShader(seed: Seed): Artifact {
  const shaderType = geneVal(seed, 'shaderType', 'fragment');
  const technique = geneVal(seed, 'technique', 'raymarching');
  const complexity = typeof geneVal(seed, 'complexity', 0.5) === 'number' ? geneVal(seed, 'complexity', 0.5) : 0.5;
  const palette = geneVal(seed, 'palette', [0.5, 0.3, 0.8]);
  const iterations = Math.max(8, Math.floor(complexity * 128));
  const epsilon = +(0.0001 + (1 - complexity) * 0.009).toFixed(6);
  const uniforms = ['u_time', 'u_resolution'];
  if (technique === 'raymarching' || technique === 'volumetric') uniforms.push('u_camera_pos', 'u_camera_dir');
  if (complexity > 0.5) uniforms.push('u_mouse');
  if (complexity > 0.7) uniforms.push('u_frame_count');
  const varyingCount = shaderType === 'vertex' ? Math.max(2, Math.floor(complexity * 6)) : Math.max(1, Math.floor(complexity * 4));
  const textureSlots = Math.max(0, Math.floor(complexity * 4));
  const colorPalette = Array.isArray(palette)
    ? palette.slice(0, 3).map((v: number) => Math.floor(Math.min(typeof v === 'number' ? v : 0.5, 1) * 255))
    : [128, 76, 204];
  return {
    type: 'shader', name: seed.$name ?? 'Shader', domain: 'shader',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    shader: { type: shaderType, technique, parameters: { iterations, epsilon } },
    glsl: { uniforms, varying_count: varyingCount, texture_slots: textureSlots, color_palette: colorPalette },
    render_hints: { mode: 'shader_preview', realtime: true },
  };
}

function growParticle(seed: Seed): Artifact {
  const emitter = geneVal(seed, 'emitter', 'point');
  const countRaw = typeof geneVal(seed, 'count', 0.5) === 'number' ? geneVal(seed, 'count', 0.5) : 0.5;
  const lifetime = typeof geneVal(seed, 'lifetime', 2.0) === 'number' ? geneVal(seed, 'lifetime', 2.0) : 2.0;
  const velocity = geneVal(seed, 'velocity', [0, 1, 0]);
  const mass = typeof geneVal(seed, 'mass', 0.3) === 'number' ? geneVal(seed, 'mass', 0.3) : 0.3;
  const count = Math.max(10, Math.floor(countRaw * 1000));
  const gravity = +(mass * 9.81).toFixed(3);
  const speed = Array.isArray(velocity) ? Math.sqrt(velocity.reduce((s: number, v: number) => s + v * v, 0)) : 1;
  const spread = +(speed * 0.3 + (1 - mass) * 0.5).toFixed(3);
  const emitterRadiusMap: Record<string, number> = { point: 0, sphere: 1.5, cone: 0.8, ring: 2.0, box: 1.0 };
  const emitterRadius = emitterRadiusMap[emitter] ?? 0;
  const drag = +(0.01 + mass * 0.15).toFixed(4);
  const sizeStart = +(0.1 + (1 - mass) * 0.4).toFixed(3);
  const sizeEnd = +(sizeStart * 0.2).toFixed(3);
  const hue = Math.floor(countRaw * 360);
  const blendMode = lifetime > 3 ? 'soft_additive' : 'additive';
  return {
    type: 'particle', name: seed.$name ?? 'Particle System', domain: 'particle',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    particles: { emitter, count, lifetime: +lifetime.toFixed(2), velocity },
    physics: { gravity, spread, emitter_radius: emitterRadius, drag },
    visual: { color: `hsl(${hue}, 80%, 60%)`, size_start: sizeStart, size_end: sizeEnd, blend_mode: blendMode },
    render_hints: { mode: 'particle_sim', animated: true },
  };
}

function growTypography(seed: Seed): Artifact {
  const style = geneVal(seed, 'style', 'sans_serif');
  const xHeight = typeof geneVal(seed, 'xHeight', 0.5) === 'number' ? geneVal(seed, 'xHeight', 0.5) : 0.5;
  const contrast = typeof geneVal(seed, 'contrast', 0.3) === 'number' ? geneVal(seed, 'contrast', 0.3) : 0.3;
  const width = typeof geneVal(seed, 'width', 0.5) === 'number' ? geneVal(seed, 'width', 0.5) : 0.5;
  const capHeight = +(0.65 + xHeight * 0.15).toFixed(3);
  const descender = +(0.15 + contrast * 0.1).toFixed(3);
  const widthFactor = +(0.7 + width * 0.6).toFixed(3);
  const serifMap: Record<string, string> = { sans_serif: 'none', serif: 'bracketed', slab_serif: 'slab', display: 'hairline', mono: 'none' };
  const serifStyle = serifMap[style] ?? 'none';
  const baseGlyphs = 220;
  const glyphCount = Math.floor(baseGlyphs + contrast * 80 + width * 40);
  const features: string[] = ['liga'];
  if (contrast > 0.4) features.push('kern');
  if (contrast > 0.6) features.push('calt', 'ss01');
  if (width > 0.5) features.push('tnum');
  return {
    type: 'typography', name: seed.$name ?? 'Typeface', domain: 'typography',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    typography: { style, weight_range: [100, 900], x_height: +xHeight.toFixed(3), contrast: +contrast.toFixed(3) },
    metrics: { cap_height: capHeight, descender, width_factor: widthFactor, serif_style: serifStyle, glyph_count: glyphCount, opentype_features: features },
    render_hints: { mode: 'type_specimen' },
  };
}

function growArchitecture(seed: Seed): Artifact {
  const style = geneVal(seed, 'style', 'modern');
  const scale = typeof geneVal(seed, 'scale', 0.5) === 'number' ? geneVal(seed, 'scale', 0.5) : 0.5;
  const symmetry = geneVal(seed, 'symmetry', 'bilateral');
  const materials = geneVal(seed, 'materials', ['concrete', 'glass']);
  const density = typeof geneVal(seed, 'density', 0.5) === 'number' ? geneVal(seed, 'density', 0.5) : 0.5;
  const floors = Math.max(1, Math.floor(scale * 10));
  const floorHeight = +(2.8 + (1 - density) * 1.2).toFixed(2);
  const totalHeight = +(floors * floorHeight).toFixed(2);
  const footprint = +(200 + scale * 800 + density * 400).toFixed(1);
  const windowRatio = +(0.15 + (1 - density) * 0.45).toFixed(3);
  const loadBearing = scale > 0.7 ? 'steel_frame' : scale > 0.4 ? 'reinforced_concrete' : 'masonry';
  const foundation = floors > 6 ? 'deep_pile' : floors > 3 ? 'raft' : 'strip';
  const seismicRating = scale > 0.7 ? 'zone_4' : scale > 0.4 ? 'zone_3' : 'zone_2';
  return {
    type: 'architecture', name: seed.$name ?? 'Building', domain: 'architecture',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    building: { style, floors, symmetry, materials },
    dimensions: { total_height_m: totalHeight, footprint_m2: footprint, floor_height_m: floorHeight, window_ratio: windowRatio },
    structural: { load_bearing: loadBearing, foundation, seismic_rating: seismicRating },
    render_hints: { mode: '3d_building', rotatable: true },
  };
}

function growVehicle(seed: Seed): Artifact {
  const propulsion = geneVal(seed, 'propulsion', 'combustion');
  const speedRaw = typeof geneVal(seed, 'speed', 0.5) === 'number' ? geneVal(seed, 'speed', 0.5) : 0.5;
  const massRaw = typeof geneVal(seed, 'mass', 0.5) === 'number' ? geneVal(seed, 'mass', 0.5) : 0.5;
  const aero = typeof geneVal(seed, 'aerodynamics', 0.5) === 'number' ? geneVal(seed, 'aerodynamics', 0.5) : 0.5;
  const topSpeed = Math.max(10, Math.floor(speedRaw * 300));
  const massKg = Math.max(100, Math.floor(massRaw * 5000));
  const dragCoefficient = +(0.45 - aero * 0.2).toFixed(3);
  const powerKw = Math.floor(massKg * topSpeed / 800);
  const acceleration0100 = +(2 + (1 - speedRaw) * 10 + massRaw * 4).toFixed(2);
  const rangeMap: Record<string, number> = { electric: 150 + aero * 500, combustion: 300 + aero * 600, hybrid: 400 + aero * 700, hydrogen: 200 + aero * 400 };
  const rangeKm = Math.floor(rangeMap[propulsion] ?? 300 + aero * 500);
  return {
    type: 'vehicle', name: seed.$name ?? 'Vehicle', domain: 'vehicle',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    vehicle: { propulsion, top_speed: topSpeed, mass_kg: massKg },
    performance: { acceleration_0_100: acceleration0100, drag_coefficient: dragCoefficient, range_km: rangeKm, power_kw: powerKw },
    render_hints: { mode: '3d_vehicle', rotatable: true },
  };
}

function growFurniture(seed: Seed): Artifact {
  const furnitureType = geneVal(seed, 'furnitureType', 'chair');
  const style = geneVal(seed, 'style', 'modern');
  const material = geneVal(seed, 'material', 'wood');
  const quality = typeof geneVal(seed, 'quality', 0.5) === 'number' ? geneVal(seed, 'quality', 0.5) : 0.5;
  const dimMap: Record<string, { w: number; d: number; h: number; wt: number }> = {
    chair: { w: 0.5, d: 0.5, h: 0.85, wt: 6 }, table: { w: 1.2, d: 0.8, h: 0.75, wt: 25 },
    sofa: { w: 2.0, d: 0.9, h: 0.85, wt: 45 }, shelf: { w: 0.8, d: 0.35, h: 1.8, wt: 20 },
    bed: { w: 1.6, d: 2.0, h: 0.5, wt: 40 }, desk: { w: 1.4, d: 0.7, h: 0.75, wt: 30 },
  };
  const dims = dimMap[furnitureType] ?? dimMap.chair;
  const scaleFactor = 0.8 + quality * 0.4;
  const width = +(dims.w * scaleFactor).toFixed(2);
  const depth = +(dims.d * scaleFactor).toFixed(2);
  const height = +(dims.h * scaleFactor).toFixed(2);
  const weight = +(dims.wt * scaleFactor).toFixed(1);
  const comfort = +((furnitureType === 'sofa' || furnitureType === 'bed' ? 0.7 : 0.3) + quality * 0.3).toFixed(3);
  const durabilityMap: Record<string, number> = { wood: 0.7, metal: 0.9, plastic: 0.4, fabric: 0.3, leather: 0.6, bamboo: 0.5 };
  const durability = +((durabilityMap[material] ?? 0.5) + quality * 0.2).toFixed(3);
  const sustainability = +(material === 'bamboo' ? 0.9 : material === 'wood' ? 0.6 : material === 'metal' ? 0.4 : 0.3).toFixed(2);
  return {
    type: 'furniture', name: seed.$name ?? 'Furniture', domain: 'furniture',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    furniture: { type: furnitureType, style, material },
    dimensions: { width_m: width, depth_m: depth, height_m: height, weight_kg: weight },
    properties: { comfort, durability, sustainability },
    render_hints: { mode: '3d_furniture' },
  };
}

function growFashion(seed: Seed): Artifact {
  const garmentType = geneVal(seed, 'garmentType', 'dress');
  const fabric = geneVal(seed, 'fabric', 'silk');
  const palette = geneVal(seed, 'palette', [0.8, 0.1, 0.3]);
  const complexity = typeof geneVal(seed, 'complexity', 0.5) === 'number' ? geneVal(seed, 'complexity', 0.5) : 0.5;
  const warmthMap: Record<string, number> = { silk: 0.2, cotton: 0.4, wool: 0.8, linen: 0.3, denim: 0.5, leather: 0.7, polyester: 0.35 };
  const drapeMap: Record<string, number> = { silk: 0.9, cotton: 0.5, wool: 0.3, linen: 0.6, denim: 0.2, leather: 0.1, polyester: 0.4 };
  const warmth = +(warmthMap[fabric] ?? 0.4).toFixed(2);
  const drape = +(drapeMap[fabric] ?? 0.5).toFixed(2);
  const layers = Math.max(1, Math.floor(complexity * 4 + 1));
  const breathability = +(1 - warmth * 0.6).toFixed(3);
  const seamType = complexity > 0.6 ? 'french' : complexity > 0.3 ? 'flat_fell' : 'plain';
  const closureMap: Record<string, string> = { dress: 'zipper', jacket: 'buttons', pants: 'zipper', skirt: 'waistband', coat: 'buttons', shirt: 'buttons' };
  const closure = closureMap[garmentType] ?? 'none';
  const patternPieces = Math.max(2, Math.floor(4 + complexity * 12));
  return {
    type: 'fashion', name: seed.$name ?? 'Garment', domain: 'fashion',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    garment: { type: garmentType, fabric, palette },
    textile: { warmth, drape, layers, breathability },
    construction: { seam_type: seamType, closure, pattern_pieces: patternPieces },
    render_hints: { mode: '3d_garment' },
  };
}

function growRobotics(seed: Seed): Artifact {
  const robotType = geneVal(seed, 'robotType', 'humanoid');
  const dofRaw = typeof geneVal(seed, 'dof', 0.5) === 'number' ? geneVal(seed, 'dof', 0.5) : 0.5;
  const actuators = geneVal(seed, 'actuators', ['servo', 'linear']);
  const autonomy = typeof geneVal(seed, 'autonomy', 0.5) === 'number' ? geneVal(seed, 'autonomy', 0.5) : 0.5;
  const dof = Math.max(3, Math.floor(dofRaw * 12));
  const sensorMap: Record<string, string[]> = {
    humanoid: ['lidar', 'camera', 'imu', 'force_torque'], wheeled: ['lidar', 'ultrasonic', 'encoder'],
    drone: ['camera', 'imu', 'barometer', 'gps'], arm: ['force_torque', 'encoder', 'camera'],
    legged: ['imu', 'lidar', 'force_torque', 'camera'],
  };
  const sensors = sensorMap[robotType] ?? ['camera', 'imu'];
  const payloadKg = +(robotType === 'arm' ? 5 + dofRaw * 20 : robotType === 'drone' ? 0.5 + dofRaw * 2 : 2 + dofRaw * 15).toFixed(2);
  const batteryHours = +(1 + (1 - dofRaw) * 8 + (1 - autonomy) * 2).toFixed(2);
  const autonomyLevel = autonomy > 0.8 ? 5 : autonomy > 0.6 ? 4 : autonomy > 0.4 ? 3 : autonomy > 0.2 ? 2 : 1;
  const navType = autonomy > 0.6 ? 'slam' : autonomy > 0.3 ? 'waypoint' : 'teleoperated';
  return {
    type: 'robotics', name: seed.$name ?? 'Robot', domain: 'robotics',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    robot: { type: robotType, dof, actuators },
    capabilities: { sensors, payload_kg: payloadKg, battery_hours: batteryHours, autonomy_level: autonomyLevel, nav_type: navType },
    render_hints: { mode: '3d_robot', animated: true },
  };
}

function growCircuit(seed: Seed): Artifact {
  const circuitType = geneVal(seed, 'circuitType', 'digital');
  const components = geneVal(seed, 'components', ['resistor', 'capacitor', 'IC']);
  const layersRaw = typeof geneVal(seed, 'layers', 0.5) === 'number' ? geneVal(seed, 'layers', 0.5) : 0.5;
  const complexity = typeof geneVal(seed, 'complexity', 0.5) === 'number' ? geneVal(seed, 'complexity', 0.5) : 0.5;
  const layers = Math.max(1, Math.floor(layersRaw * 6));
  const componentCount = Array.isArray(components) ? components.length : 3;
  const nodeCount = Math.floor(componentCount * 2 + complexity * 20);
  const connections = Math.floor(nodeCount * 1.5 + complexity * 10);
  const powerMw = +(5 + complexity * 500 + nodeCount * 2).toFixed(2);
  const freqMap: Record<string, number> = { digital: 100e6, analog: 1e6, mixed: 50e6, rf: 2.4e9, power: 60 };
  const frequency = freqMap[circuitType] ?? 1e6;
  const voltage = circuitType === 'power' ? 240 : circuitType === 'rf' ? 1.8 : 3.3;
  const boardSide = Math.floor(20 + complexity * 80 + layers * 10);
  const traceWidth = +(0.1 + (1 - complexity) * 0.3).toFixed(3);
  const viaCount = Math.floor(connections * 0.4 * layers);
  return {
    type: 'circuit', name: seed.$name ?? 'Circuit', domain: 'circuit',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    circuit: { type: circuitType, components, layers },
    electrical: { node_count: nodeCount, connections, power_mw: powerMw, frequency, voltage },
    layout: { board_mm: [boardSide, boardSide], trace_width_mm: traceWidth, via_count: viaCount },
    render_hints: { mode: 'schematic' },
  };
}

function growFood(seed: Seed): Artifact {
  const cuisine = geneVal(seed, 'cuisine', 'italian');
  const complexity = typeof geneVal(seed, 'complexity', 0.5) === 'number' ? geneVal(seed, 'complexity', 0.5) : 0.5;
  const flavorProfile = geneVal(seed, 'flavor_profile', [0.5, 0.3, 0.7, 0.2, 0.1]);
  const richness = typeof geneVal(seed, 'richness', 0.5) === 'number' ? geneVal(seed, 'richness', 0.5) : 0.5;
  const fp = Array.isArray(flavorProfile) ? flavorProfile : [0.5, 0.3, 0.7, 0.2, 0.1];
  const flavorNames = ['sweet', 'sour', 'savory', 'bitter', 'spicy'];
  const profile: Record<string, number> = {};
  for (let i = 0; i < flavorNames.length; i++) {
    profile[flavorNames[i]] = +(typeof fp[i] === 'number' ? fp[i] : 0.3).toFixed(2);
  }
  let maxVal = 0; let dominant = 'savory';
  for (const [k, v] of Object.entries(profile)) { if (v > maxVal) { maxVal = v; dominant = k; } }
  const prepMinutes = Math.floor(10 + complexity * 50);
  const cookMinutes = Math.floor(15 + complexity * 60 + richness * 30);
  const totalMinutes = prepMinutes + cookMinutes;
  const techniqueMap: Record<string, string> = { italian: 'saute', japanese: 'steam', french: 'braise', indian: 'simmer', mexican: 'grill', thai: 'stir_fry' };
  const technique = techniqueMap[cuisine] ?? 'roast';
  const caloriesPerServing = Math.floor(200 + richness * 500 + complexity * 100);
  return {
    type: 'food', name: seed.$name ?? 'Recipe', domain: 'food',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    recipe: { cuisine, complexity: +complexity.toFixed(2), servings: 4, flavor_profile: fp },
    flavor: { profile, dominant },
    preparation: { prep_minutes: prepMinutes, cook_minutes: cookMinutes, total_minutes: totalMinutes, technique, calories_per_serving: caloriesPerServing },
    render_hints: { mode: 'recipe_card' },
  };
}

function growChoreography(seed: Seed): Artifact {
  const style = geneVal(seed, 'style', 'contemporary');
  const tempo = typeof geneVal(seed, 'tempo', 0.5) === 'number' ? geneVal(seed, 'tempo', 0.5) : 0.5;
  const dancersRaw = typeof geneVal(seed, 'dancers', 0.5) === 'number' ? geneVal(seed, 'dancers', 0.5) : 0.5;
  const energy = typeof geneVal(seed, 'energy', 0.5) === 'number' ? geneVal(seed, 'energy', 0.5) : 0.5;
  const dancers = Math.max(1, Math.floor(dancersRaw * 8));
  const durationBeats = Math.max(16, Math.floor(32 + tempo * 64));
  const formations = Math.max(2, Math.floor(dancers * 1.5 + energy * 3));
  const movements = Math.max(4, Math.floor(durationBeats / 4));
  const phraseCount = Math.max(2, Math.floor(durationBeats / 8));
  const energyCurve: number[] = [];
  for (let i = 0; i < phraseCount; i++) {
    const t = i / Math.max(1, phraseCount - 1);
    energyCurve.push(+(energy * (0.5 + 0.5 * Math.sin(Math.PI * t))).toFixed(3));
  }
  const stageWidth = +(8 + dancers * 1.5).toFixed(1);
  const stageDepth = +(6 + dancers * 1.0).toFixed(1);
  const patternMap: Record<string, string> = { contemporary: 'marley', ballet: 'sprung', hip_hop: 'vinyl', ballroom: 'hardwood', folk: 'open_ground' };
  const floorPattern = patternMap[style] ?? 'marley';
  return {
    type: 'choreography', name: seed.$name ?? 'Dance', domain: 'choreography',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    choreography: { style, tempo: +tempo.toFixed(3), dancers, duration_beats: durationBeats },
    structure: { formations, movements, phrase_count: phraseCount, energy_curve: energyCurve },
    spatial: { stage_width_m: stageWidth, stage_depth_m: stageDepth, floor_pattern: floorPattern },
    render_hints: { mode: 'motion_timeline', animated: true },
  };
}

// ─── 27th DOMAIN: AGENT ─────────────────────────────────────────────────────

/**
 * Grows an agent seed into a runnable agent configuration.
 * The agent domain is unique: its artifact is not a visual/audio output
 * but a fully instantiated reasoning system configuration that can process
 * natural language queries and execute kernel operations.
 *
 * Agent seeds are breedable, evolvable, composable, and sovereign —
 * the full kernel operates on them like any other seed.
 */
function growAgent(seed: Seed): Artifact {
  const persona = geneVal(seed, 'persona', 'architect');
  const name = geneVal(seed, 'name', seed.$name ?? 'Unnamed Agent');
  const temperature = Math.max(0, Math.min(1, geneVal(seed, 'temperature', 0.3)));
  const reasoningDepth = Math.max(0, Math.min(1, geneVal(seed, 'reasoning_depth', 0.5)));
  const explorationRate = Math.max(0, Math.min(1, geneVal(seed, 'exploration_rate', 0.2)));
  const confidenceThreshold = Math.max(0, Math.min(1, geneVal(seed, 'confidence_threshold', 0.7)));
  const verbosity = Math.max(0, Math.min(1, geneVal(seed, 'verbosity', 0.5)));
  const autonomy = Math.max(0, Math.min(1, geneVal(seed, 'autonomy', 0.3)));
  const creativityBias = Math.max(0, Math.min(1, geneVal(seed, 'creativity_bias', 0.4)));
  const maxSteps = Math.floor(Math.max(0, Math.min(1, geneVal(seed, 'max_reasoning_steps', 0.5))) * 20);
  const memoryWindow = Math.floor(Math.max(0, Math.min(1, geneVal(seed, 'context_window', 0.5))) * 50);

  // Domain focus — attention weights over all domains (default: uniform)
  let domainFocus = geneVal(seed, 'domain_focus', null);
  if (!Array.isArray(domainFocus) || domainFocus.length < 26) {
    domainFocus = new Array(27).fill(1 / 27);
  }
  // Normalize to sum to 1
  const focusSum = domainFocus.reduce((a: number, b: number) => a + Math.abs(b), 0) || 1;
  domainFocus = domainFocus.map((v: number) => Math.abs(v) / focusSum);

  // Gene expertise — proficiency with each gene type (default: uniform)
  let geneExpertise = geneVal(seed, 'gene_expertise', null);
  if (!Array.isArray(geneExpertise) || geneExpertise.length < 17) {
    geneExpertise = new Array(17).fill(1 / 17);
  }
  const expertiseSum = geneExpertise.reduce((a: number, b: number) => a + Math.abs(b), 0) || 1;
  geneExpertise = geneExpertise.map((v: number) => Math.abs(v) / expertiseSum);

  // Tool permissions
  const toolPerms = geneVal(seed, 'tool_permissions', {});
  const tools = {
    web_browse: !!toolPerms?.web_browse,
    file_write: !!toolPerms?.file_write,
    fork_agent: !!toolPerms?.fork_agent,
    delegate: !!toolPerms?.delegate,
  };

  // Build the system prompt from the agent's genes
  const personaTraits: Record<string, string> = {
    architect: 'You approach problems systematically, designing structured solutions. You favor composition and multi-step plans.',
    artist: 'You embrace creativity and expressiveness. You generate diverse, unexpected gene combinations and favor aesthetic quality.',
    critic: 'You evaluate rigorously, comparing seeds by distance metrics and fitness. You suggest improvements and point out weaknesses.',
    explorer: 'You prioritize novelty and exploration. You try unusual domain compositions and push genes toward unexplored regions.',
    composer: 'You excel at cross-domain composition. You think in functor bridges and multi-seed synthesis.',
    analyst: 'You are precise and data-driven. You compute distances, compare populations, and optimize fitness systematically.',
  };

  const systemPrompt = [
    `You are ${name}, a Paradigm GSPL agent with persona "${persona}".`,
    personaTraits[persona] || personaTraits.architect,
    `Temperature: ${temperature.toFixed(2)} | Reasoning depth: ${reasoningDepth.toFixed(2)} | Creativity: ${creativityBias.toFixed(2)}`,
    `You have access to 27 creative domains, 17 gene types, and 12 functor bridges.`,
    `Maximum reasoning steps: ${maxSteps}. Memory window: ${memoryWindow} turns.`,
    tools.web_browse ? 'Web browsing is enabled.' : '',
    `Respond ${verbosity < 0.3 ? 'tersely' : verbosity > 0.7 ? 'in detail with explanations' : 'with moderate detail'}.`,
    autonomy > 0.7 ? 'Act independently — execute plans without asking for confirmation.' :
    autonomy < 0.3 ? 'Always confirm plans with the user before executing.' :
    'Confirm complex multi-step plans, but execute simple operations directly.',
  ].filter(Boolean).join(' ');

  return {
    type: 'agent', name, domain: 'agent',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    config: {
      persona, name, temperature, reasoningDepth, explorationRate,
      confidenceThreshold, verbosity, autonomy, creativityBias,
      maxSteps, memoryWindow,
      domainWeights: domainFocus,
      geneWeights: geneExpertise,
      tools,
      systemPrompt,
    },
    render_hints: { mode: 'chat_interface', color_scheme: 'dark', animated: false },
  };
}

// ─── ENGINE REGISTRY ──────────────────────────────────────────────────────────
export const ENGINES: Record<string, (seed: Seed) => Artifact> = {
  character: growCharacter, sprite: growSprite, music: growMusic,
  visual2d: growVisual2d, procedural: growProcedural,
  fullgame: growFullgame, animation: growAnimation, geometry3d: growGeometry3d,
  narrative: growNarrative, ui: growUi, physics: growPhysics,
  audio: growAudio, ecosystem: growEcosystem, game: growGame,
  alife: growAlife, shader: growShader, particle: growParticle,
  typography: growTypography, architecture: growArchitecture,
  vehicle: growVehicle, furniture: growFurniture, fashion: growFashion,
  robotics: growRobotics, circuit: growCircuit, food: growFood,
  choreography: growChoreography,
  agent: growAgent,
};

function growGeneric(seed: Seed): Artifact {
  const geneSummary: Record<string, any> = {};
  for (const [name, gene] of Object.entries(seed.genes ?? {})) {
    geneSummary[name] = { type: gene.type, value_preview: String(gene.value ?? '').slice(0, 50) };
  }
  return {
    type: seed.$domain ?? 'unknown', name: seed.$name ?? 'Artifact', domain: seed.$domain ?? 'unknown',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    gene_summary: geneSummary,
    render_hints: { mode: 'generic', description_only: true },
  };
}

export function growSeed(seed: Seed): Artifact {
  const domain = seed.$domain ?? 'character';
  const engine = ENGINES[domain] ?? growGeneric;
  return engine(seed);
}

export function getAllDomains(): string[] {
  return Object.keys(ENGINES);
}
