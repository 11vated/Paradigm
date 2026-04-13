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
  const mechanics = geneVal(seed, 'mechanics', ['action']);
  const pacing = geneVal(seed, 'pacing', 0.5);
  const replayability = geneVal(seed, 'replayability', 0.5);
  const levels = Math.max(3, Math.floor(levelCount * 20));
  const enemyTypes = Math.max(2, Math.floor(diff * 12));
  const bossCount = Math.max(1, Math.floor(levels / 5));
  const diffCurve = Array.from({ length: levels }, (_, i) => +((diff * 0.3 + (i / levels) * 0.7) * 100).toFixed(1));
  return {
    type: 'fullgame', name: seed.$name ?? 'Game', domain: 'fullgame',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    game: {
      genre, difficulty: +diff.toFixed(2), levels,
      mechanics: Array.isArray(mechanics) ? mechanics : [mechanics],
      pacing: typeof pacing === 'number' ? +pacing.toFixed(2) : 0.5,
      replayability: typeof replayability === 'number' ? +replayability.toFixed(2) : 0.5,
    },
    progression: { enemy_types: enemyTypes, boss_count: bossCount, difficulty_curve: diffCurve },
    world: { biome_count: Math.max(2, Math.floor(levelCount * 6)), has_hub: levels > 8, exploration_factor: +(1 - diff * 0.5).toFixed(2) },
    render_hints: { mode: 'game_preview', interactive: true },
  };
}

function growAnimation(seed: Seed): Artifact {
  const frameCount = Math.max(4, Math.floor(geneVal(seed, 'frameCount', 0.5) * 60));
  const fps = Math.max(8, Math.floor(geneVal(seed, 'fps', 0.5) * 60));
  const motionType = geneVal(seed, 'motionType', 'skeletal');
  const easing = geneVal(seed, 'easing', 'ease_in_out');
  const amplitude = geneVal(seed, 'amplitude', 0.5);
  const duration = +(frameCount / fps).toFixed(2);
  const keyframes = Array.from({ length: Math.min(frameCount, 12) }, (_, i) => {
    const t = i / (Math.min(frameCount, 12) - 1 || 1);
    return { frame: Math.floor(t * frameCount), value: +(Math.sin(t * Math.PI * 2) * (typeof amplitude === 'number' ? amplitude : 0.5)).toFixed(3) };
  });
  return {
    type: 'animation', name: seed.$name ?? 'Animation', domain: 'animation',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    animation: { frame_count: frameCount, fps, motion_type: motionType, loop: geneVal(seed, 'loop', 'loop'), easing, duration_sec: duration },
    keyframes,
    motion: { amplitude: typeof amplitude === 'number' ? +amplitude.toFixed(2) : 0.5, frequency: +(fps / frameCount).toFixed(2), blend_mode: motionType === 'skeletal' ? 'additive' : 'override' },
    render_hints: { mode: 'animation_timeline', animated: true },
  };
}

function growGeometry3d(seed: Seed): Artifact {
  const primitive = geneVal(seed, 'primitive', 'sphere');
  const detail = typeof geneVal(seed, 'detail', 0.5) === 'number' ? geneVal(seed, 'detail', 0.5) : 0.5;
  const material = geneVal(seed, 'material', 'metal');
  const scaleVal = geneVal(seed, 'scale', [1, 1, 1]);
  const scale = Array.isArray(scaleVal) ? scaleVal.slice(0, 3) : [scaleVal, scaleVal, scaleVal];
  const subdivisions = Math.max(1, Math.floor(detail * 8));
  const vertexEstimate = primitive === 'cube' ? 8 * Math.pow(4, subdivisions - 1) :
    primitive === 'sphere' ? Math.pow(subdivisions + 1, 2) * 2 :
    primitive === 'torus' ? subdivisions * subdivisions * 4 : subdivisions * 12;
  const roughness = geneVal(seed, 'roughness', 0.4);
  const metalness = material === 'metal' ? 0.9 : material === 'wood' ? 0.1 : 0.5;
  return {
    type: 'geometry3d', name: seed.$name ?? '3D Object', domain: 'geometry3d',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    mesh: { primitive, subdivisions, vertex_estimate: vertexEstimate, scale: scale.map((s: number) => +(s || 1).toFixed(2)) },
    material: { type: material, roughness: typeof roughness === 'number' ? +roughness.toFixed(2) : 0.4, metalness: +metalness.toFixed(2), color: geneVal(seed, 'color', [0.7, 0.7, 0.7]) },
    bounds: { min: scale.map((s: number) => -(s || 1) / 2), max: scale.map((s: number) => (s || 1) / 2) },
    render_hints: { mode: '3d_viewport', rotatable: true, wireframe: detail < 0.3 },
  };
}

function growNarrative(seed: Seed): Artifact {
  const structure = geneVal(seed, 'structure', 'heros_journey');
  const tone = geneVal(seed, 'tone', 'epic');
  const characters = geneVal(seed, 'characters', ['hero', 'villain']);
  const plot = geneVal(seed, 'plot', 'quest');
  const complexity = geneVal(seed, 'complexity', 0.5);
  const castSize = Array.isArray(characters) ? characters.length : 2;
  const actCount = structure === 'heros_journey' ? 3 : structure === 'five_act' ? 5 : structure === 'nonlinear' ? 4 : 3;
  const subplots = Math.max(0, Math.floor((typeof complexity === 'number' ? complexity : 0.5) * castSize));
  const wordEstimate = Math.floor(actCount * 2500 * (1 + (typeof complexity === 'number' ? complexity : 0.5)));
  const themes = tone === 'epic' ? ['sacrifice', 'destiny'] : tone === 'dark' ? ['betrayal', 'survival'] : tone === 'comic' ? ['irony', 'absurdity'] : ['growth', 'discovery'];
  return {
    type: 'narrative', name: seed.$name ?? 'Story', domain: 'narrative',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    story: { structure, tone, plot, acts: actCount, cast_size: castSize, characters: Array.isArray(characters) ? characters : [characters] },
    narrative: { subplots, word_estimate: wordEstimate, themes, pov: castSize > 3 ? 'multi' : 'single', pacing: typeof complexity === 'number' ? (complexity > 0.6 ? 'slow_burn' : 'fast') : 'medium' },
    render_hints: { mode: 'narrative_flow', readable: true },
  };
}

function growUi(seed: Seed): Artifact {
  const layout = geneVal(seed, 'layout', 'dashboard');
  const theme = geneVal(seed, 'theme', 'dark');
  const components = geneVal(seed, 'components', ['header', 'sidebar', 'main']);
  const density = geneVal(seed, 'density', 0.5);
  const responsive = geneVal(seed, 'responsive', true);
  const compList = Array.isArray(components) ? components : [components];
  const gridCols = layout === 'dashboard' ? 12 : layout === 'split' ? 2 : layout === 'single' ? 1 : 4;
  const spacing = typeof density === 'number' ? Math.floor((1 - density) * 24 + 4) : 12;
  const palette = theme === 'dark'
    ? { bg: '#0a0a0a', surface: '#1a1a1a', text: '#e5e5e5', accent: '#F97316' }
    : { bg: '#ffffff', surface: '#f5f5f5', text: '#171717', accent: '#2563EB' };
  return {
    type: 'ui', name: seed.$name ?? 'Interface', domain: 'ui',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    interface: { layout, theme, components: compList, grid_columns: gridCols, spacing_px: spacing, responsive: !!responsive },
    design: { palette, border_radius: typeof density === 'number' ? Math.floor(density * 16) : 8, font_scale: 1.0, component_count: compList.length },
    render_hints: { mode: 'ui_preview', interactive: true },
  };
}

function growPhysics(seed: Seed): Artifact {
  const grav = typeof geneVal(seed, 'gravity', 0.5) === 'number' ? geneVal(seed, 'gravity', 0.5) : 0.5;
  const friction = typeof geneVal(seed, 'friction', 0.3) === 'number' ? geneVal(seed, 'friction', 0.3) : 0.3;
  const elasticity = typeof geneVal(seed, 'elasticity', 0.8) === 'number' ? geneVal(seed, 'elasticity', 0.8) : 0.8;
  const simType = geneVal(seed, 'simulationType', 'rigid_body');
  const bodyCount = typeof geneVal(seed, 'bodyCount', 0.3) === 'number' ? Math.max(1, Math.floor(geneVal(seed, 'bodyCount', 0.3) * 50)) : 10;
  const gravityMs2 = +(grav * 20).toFixed(2);
  const dt = simType === 'fluid' ? 0.001 : 0.016;
  const steps = Math.floor(simType === 'fluid' ? 5000 : 1000);
  const energyDissipation = +(friction * (1 - elasticity)).toFixed(3);
  return {
    type: 'physics', name: seed.$name ?? 'Simulation', domain: 'physics',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    simulation: { gravity_ms2: gravityMs2, friction: +friction.toFixed(2), elasticity: +elasticity.toFixed(2), type: simType, steps, dt },
    config: { body_count: bodyCount, energy_dissipation: energyDissipation, collision_detection: bodyCount > 20 ? 'broadphase_sap' : 'naive', integrator: simType === 'fluid' ? 'sph' : 'verlet' },
    bounds: { min: [-10, 0, -10], max: [10, 20, 10] },
    render_hints: { mode: 'physics_sim', animated: true },
  };
}

function growAudio(seed: Seed): Artifact {
  const soundType = geneVal(seed, 'soundType', 'sfx');
  const duration = typeof geneVal(seed, 'duration', 0.5) === 'number' ? geneVal(seed, 'duration', 0.5) : 0.5;
  const freq = typeof geneVal(seed, 'frequency', 440) === 'number' ? geneVal(seed, 'frequency', 440) : 440;
  const waveform = geneVal(seed, 'waveform', 'sine');
  const envelope = geneVal(seed, 'envelope', { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 });
  const durationMs = Math.max(100, Math.floor(duration * 5000));
  const sampleRate = 44100;
  const sampleCount = Math.floor(sampleRate * durationMs / 1000);
  const harmonics = soundType === 'sfx' ? 1 : soundType === 'ambient' ? 6 : 3;
  const adsr = typeof envelope === 'object' && envelope !== null ? envelope : { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 };
  return {
    type: 'audio', name: seed.$name ?? 'Sound', domain: 'audio',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    audio: { type: soundType, duration_ms: durationMs, frequency: freq, waveform, sample_rate: sampleRate, sample_count: sampleCount },
    synthesis: { harmonics, envelope: adsr, filter: soundType === 'ambient' ? 'lowpass' : 'none', filter_freq: Math.floor(freq * 3) },
    render_hints: { mode: 'audio_waveform', playable: true },
  };
}

function growEcosystem(seed: Seed): Artifact {
  const speciesRaw = geneVal(seed, 'speciesCount', 0.5);
  const speciesCount = Math.max(2, Math.floor((typeof speciesRaw === 'number' ? speciesRaw : 0.5) * 20));
  const environment = geneVal(seed, 'environment', 'forest');
  const stability = typeof geneVal(seed, 'stability', 0.6) === 'number' ? geneVal(seed, 'stability', 0.6) : 0.6;
  const biodiversity = geneVal(seed, 'biodiversity', 0.5);
  const interactionTypes = ['predation', 'symbiosis', 'competition', 'parasitism', 'commensalism'];
  const activeInteractions = interactionTypes.slice(0, Math.max(2, Math.floor((typeof biodiversity === 'number' ? biodiversity : 0.5) * interactionTypes.length)));
  const carryingCapacity = Math.floor(speciesCount * 50 * stability);
  const trophicLevels = Math.max(2, Math.min(5, Math.ceil(speciesCount / 4)));
  const extinctionRisk = +(1 - stability).toFixed(2);
  return {
    type: 'ecosystem', name: seed.$name ?? 'Ecosystem', domain: 'ecosystem',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    ecosystem: { species_count: speciesCount, environment, stability: +stability.toFixed(2), interactions: activeInteractions },
    dynamics: { carrying_capacity: carryingCapacity, trophic_levels: trophicLevels, extinction_risk: extinctionRisk, energy_flow: +(stability * 0.8).toFixed(2), cycles: environment === 'ocean' ? ['tidal', 'seasonal'] : ['seasonal', 'diurnal'] },
    render_hints: { mode: 'ecosystem_graph', animated: true },
  };
}

function growGame(seed: Seed): Artifact {
  const mechType = geneVal(seed, 'mechanicType', 'turn_based');
  const complexity = typeof geneVal(seed, 'complexity', 0.5) === 'number' ? geneVal(seed, 'complexity', 0.5) : 0.5;
  const players = typeof geneVal(seed, 'players', 2) === 'number' ? geneVal(seed, 'players', 2) : 2;
  const balance = geneVal(seed, 'balance', 0.5);
  const ruleCount = Math.max(3, Math.floor(complexity * 15));
  const decisionPoints = Math.floor(ruleCount * 1.5);
  const avgTurnTime = mechType === 'turn_based' ? Math.floor(10 + complexity * 50) : mechType === 'realtime' ? 0 : 5;
  const playerCount = typeof players === 'number' && players <= 1 ? Math.max(1, Math.floor(players * 8)) : Math.max(1, Math.floor(players));
  return {
    type: 'game', name: seed.$name ?? 'Game Mechanic', domain: 'game',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    mechanic: { type: mechType, complexity: +complexity.toFixed(2), players: playerCount, rule_count: ruleCount },
    design: { decision_points_per_turn: decisionPoints, avg_turn_seconds: avgTurnTime, balance_factor: typeof balance === 'number' ? +balance.toFixed(2) : 0.5, win_conditions: ruleCount > 8 ? ['score', 'elimination', 'objective'] : ['score', 'elimination'] },
    render_hints: { mode: 'mechanic_diagram' },
  };
}

function growAlife(seed: Seed): Artifact {
  const rules = geneVal(seed, 'rules', 'conway');
  const gridSize = Math.max(16, Math.floor((typeof geneVal(seed, 'gridSize', 0.5) === 'number' ? geneVal(seed, 'gridSize', 0.5) : 0.5) * 128));
  const density = typeof geneVal(seed, 'density', 0.3) === 'number' ? geneVal(seed, 'density', 0.3) : 0.3;
  const neighborhoodType = geneVal(seed, 'neighborhood', 'moore');
  const stateCount = rules === 'conway' ? 2 : rules === 'wireworld' ? 4 : rules === 'brians_brain' ? 3 : 2;
  const cellCount = gridSize * gridSize;
  const aliveCells = Math.floor(cellCount * density);
  const birthRule = rules === 'conway' ? [3] : rules === 'highlife' ? [3, 6] : [3];
  const surviveRule = rules === 'conway' ? [2, 3] : rules === 'highlife' ? [2, 3] : [2, 3];
  return {
    type: 'alife', name: seed.$name ?? 'Artificial Life', domain: 'alife',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    alife: { rules, grid_size: gridSize, initial_density: +density.toFixed(2), states: stateCount, neighborhood: neighborhoodType },
    simulation: { cell_count: cellCount, initial_alive: aliveCells, birth_rule: birthRule, survive_rule: surviveRule, wrapping: true },
    render_hints: { mode: 'cellular_automata', animated: true },
  };
}

function growShader(seed: Seed): Artifact {
  const shaderType = geneVal(seed, 'shaderType', 'fragment');
  const technique = geneVal(seed, 'technique', 'raymarching');
  const complexity = typeof geneVal(seed, 'complexity', 0.5) === 'number' ? geneVal(seed, 'complexity', 0.5) : 0.5;
  const palette = geneVal(seed, 'palette', [0.5, 0.3, 0.8]);
  const iterations = Math.max(16, Math.floor(complexity * 256));
  const epsilon = +(0.01 * (1 - complexity * 0.9)).toFixed(5);
  const uniforms = { u_time: 'float', u_resolution: 'vec2', u_mouse: 'vec2' };
  if (technique === 'raymarching') Object.assign(uniforms, { u_max_steps: `int(${iterations})`, u_epsilon: `float(${epsilon})` });
  return {
    type: 'shader', name: seed.$name ?? 'Shader', domain: 'shader',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    shader: { type: shaderType, technique, iterations, epsilon, complexity: +complexity.toFixed(2) },
    glsl: { uniforms, varying_count: shaderType === 'vertex' ? 3 : 0, texture_slots: Math.floor(complexity * 4), color_palette: Array.isArray(palette) ? palette : [0.5, 0.3, 0.8] },
    render_hints: { mode: 'shader_preview', realtime: true },
  };
}

function growParticle(seed: Seed): Artifact {
  const emitter = geneVal(seed, 'emitter', 'point');
  const count = Math.max(10, Math.floor((typeof geneVal(seed, 'count', 0.5) === 'number' ? geneVal(seed, 'count', 0.5) : 0.5) * 1000));
  const lifetime = typeof geneVal(seed, 'lifetime', 2.0) === 'number' ? geneVal(seed, 'lifetime', 2.0) : 2.0;
  const velocity = geneVal(seed, 'velocity', [0, 1, 0]);
  const gravity = geneVal(seed, 'gravity', [0, -0.5, 0]);
  const color = geneVal(seed, 'color', [1, 0.5, 0]);
  const spread = geneVal(seed, 'spread', 0.3);
  const emitterRadius = emitter === 'sphere' ? 1.0 : emitter === 'ring' ? 0.5 : 0;
  const spawnRate = Math.floor(count / Math.max(0.1, lifetime));
  return {
    type: 'particle', name: seed.$name ?? 'Particle System', domain: 'particle',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    particles: { emitter, count, lifetime: +lifetime.toFixed(2), velocity: Array.isArray(velocity) ? velocity : [0, velocity, 0], spawn_rate: spawnRate },
    physics: { gravity: Array.isArray(gravity) ? gravity : [0, -gravity, 0], spread: typeof spread === 'number' ? +spread.toFixed(2) : 0.3, emitter_radius: emitterRadius, drag: 0.02 },
    visual: { color: Array.isArray(color) ? color : [1, 0.5, 0], size_start: 0.1, size_end: 0.01, blend_mode: 'additive' },
    render_hints: { mode: 'particle_sim', animated: true },
  };
}

function growTypography(seed: Seed): Artifact {
  const style = geneVal(seed, 'style', 'sans_serif');
  const xHeight = typeof geneVal(seed, 'xHeight', 0.5) === 'number' ? geneVal(seed, 'xHeight', 0.5) : 0.5;
  const contrast = typeof geneVal(seed, 'contrast', 0.3) === 'number' ? geneVal(seed, 'contrast', 0.3) : 0.3;
  const width = geneVal(seed, 'width', 0.5);
  const serif = style === 'serif' || style === 'slab_serif';
  const minWeight = 100 + Math.floor((1 - contrast) * 200);
  const maxWeight = 900 - Math.floor((1 - contrast) * 200);
  const capHeight = +(xHeight * 1.4).toFixed(2);
  const descenderDepth = +(xHeight * 0.3).toFixed(2);
  const glyphCount = style === 'display' ? 62 : style === 'mono' ? 95 : 220;
  return {
    type: 'typography', name: seed.$name ?? 'Typeface', domain: 'typography',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    typography: { style, weight_range: [minWeight, maxWeight], x_height: +xHeight.toFixed(2), contrast: +contrast.toFixed(2) },
    metrics: { cap_height: capHeight, descender: descenderDepth, width_factor: typeof width === 'number' ? +width.toFixed(2) : 0.5, serif_style: serif ? (style === 'slab_serif' ? 'slab' : 'bracketed') : 'none', glyph_count: glyphCount, opentype_features: ['liga', 'kern', 'calt'] },
    render_hints: { mode: 'type_specimen' },
  };
}

function growArchitecture(seed: Seed): Artifact {
  const style = geneVal(seed, 'style', 'modern');
  const scale = typeof geneVal(seed, 'scale', 0.5) === 'number' ? geneVal(seed, 'scale', 0.5) : 0.5;
  const symmetry = geneVal(seed, 'symmetry', 'bilateral');
  const materials = geneVal(seed, 'materials', ['concrete', 'glass']);
  const floors = Math.max(1, Math.floor(scale * 10));
  const floorHeight = style === 'gothic' ? 4.5 : style === 'modern' ? 3.0 : 3.5;
  const totalHeight = +(floors * floorHeight).toFixed(1);
  const footprint = +(10 + scale * 40).toFixed(1);
  const windowRatio = style === 'modern' ? 0.7 : style === 'gothic' ? 0.3 : 0.5;
  const roofType = style === 'gothic' ? 'vaulted' : style === 'modern' ? 'flat' : 'pitched';
  const matList = Array.isArray(materials) ? materials : [materials];
  return {
    type: 'architecture', name: seed.$name ?? 'Building', domain: 'architecture',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    building: { style, floors, symmetry, materials: matList, roof: roofType },
    dimensions: { total_height_m: totalHeight, footprint_m2: footprint, floor_height_m: floorHeight, window_ratio: +windowRatio.toFixed(2) },
    structural: { load_bearing: matList.includes('steel') ? 'steel_frame' : 'masonry', foundation: floors > 5 ? 'deep_pile' : 'strip', seismic_rating: floors > 3 ? 'zone_3' : 'zone_1' },
    render_hints: { mode: '3d_building', rotatable: true },
  };
}

function growVehicle(seed: Seed): Artifact {
  const propulsion = geneVal(seed, 'propulsion', 'combustion');
  const speed = typeof geneVal(seed, 'speed', 0.5) === 'number' ? geneVal(seed, 'speed', 0.5) : 0.5;
  const mass = typeof geneVal(seed, 'mass', 0.5) === 'number' ? geneVal(seed, 'mass', 0.5) : 0.5;
  const aero = geneVal(seed, 'aerodynamics', 0.5);
  const topSpeed = Math.max(10, Math.floor(speed * 300));
  const massKg = Math.max(100, Math.floor(mass * 5000));
  const accel = +(topSpeed / (massKg / 500)).toFixed(1);
  const dragCoeff = typeof aero === 'number' ? +(0.5 - aero * 0.3).toFixed(2) : 0.35;
  const range = propulsion === 'electric' ? Math.floor(200 + speed * 400) : propulsion === 'hydrogen' ? Math.floor(300 + speed * 300) : Math.floor(400 + speed * 600);
  const wheels = massKg > 3000 ? 6 : massKg > 1500 ? 4 : 2;
  return {
    type: 'vehicle', name: seed.$name ?? 'Vehicle', domain: 'vehicle',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    vehicle: { propulsion, top_speed_kmh: topSpeed, mass_kg: massKg, wheels },
    performance: { acceleration_0_100: accel, drag_coefficient: dragCoeff, range_km: range, power_kw: Math.floor(massKg * accel / 10) },
    render_hints: { mode: '3d_vehicle', rotatable: true },
  };
}

function growFurniture(seed: Seed): Artifact {
  const fType = geneVal(seed, 'furnitureType', 'chair');
  const style = geneVal(seed, 'style', 'modern');
  const material = geneVal(seed, 'material', 'wood');
  const ergonomics = typeof geneVal(seed, 'ergonomics', 0.5) === 'number' ? geneVal(seed, 'ergonomics', 0.5) : 0.5;
  const dims = fType === 'chair' ? { w: 0.5, d: 0.5, h: 0.9 } : fType === 'table' ? { w: 1.2, d: 0.8, h: 0.75 } : fType === 'sofa' ? { w: 2.0, d: 0.9, h: 0.85 } : fType === 'shelf' ? { w: 0.8, d: 0.3, h: 1.8 } : { w: 0.6, d: 0.6, h: 0.8 };
  const weightKg = +(dims.w * dims.d * dims.h * (material === 'metal' ? 80 : material === 'wood' ? 40 : 20)).toFixed(1);
  const comfortScore = fType === 'chair' || fType === 'sofa' ? +ergonomics.toFixed(2) : 0;
  return {
    type: 'furniture', name: seed.$name ?? 'Furniture', domain: 'furniture',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    furniture: { type: fType, style, material },
    dimensions: { width_m: dims.w, depth_m: dims.d, height_m: dims.h, weight_kg: weightKg },
    properties: { comfort: comfortScore, durability: material === 'metal' ? 0.9 : material === 'wood' ? 0.7 : 0.5, sustainability: material === 'bamboo' ? 0.95 : material === 'wood' ? 0.6 : 0.3 },
    render_hints: { mode: '3d_furniture' },
  };
}

function growFashion(seed: Seed): Artifact {
  const garmentType = geneVal(seed, 'garmentType', 'dress');
  const fabric = geneVal(seed, 'fabric', 'silk');
  const palette = geneVal(seed, 'palette', [0.8, 0.1, 0.3]);
  const silhouette = geneVal(seed, 'silhouette', 'fitted');
  const season = geneVal(seed, 'season', 'spring');
  const col = Array.isArray(palette) ? palette : [0.8, 0.1, 0.3];
  const warmth = fabric === 'wool' ? 0.9 : fabric === 'cotton' ? 0.5 : fabric === 'silk' ? 0.3 : 0.4;
  const drape = fabric === 'silk' ? 0.95 : fabric === 'denim' ? 0.2 : fabric === 'cotton' ? 0.6 : 0.5;
  const layers = season === 'winter' ? 3 : season === 'fall' ? 2 : 1;
  return {
    type: 'fashion', name: seed.$name ?? 'Garment', domain: 'fashion',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    garment: { type: garmentType, fabric, palette: col, silhouette, season },
    textile: { warmth: +warmth.toFixed(2), drape: +drape.toFixed(2), layers, breathability: +(1 - warmth * 0.5).toFixed(2) },
    construction: { seam_type: fabric === 'silk' ? 'french' : 'flat_felled', closure: garmentType === 'dress' ? 'zipper' : garmentType === 'jacket' ? 'buttons' : 'none', pattern_pieces: garmentType === 'dress' ? 8 : garmentType === 'jacket' ? 12 : 4 },
    render_hints: { mode: '3d_garment' },
  };
}

function growRobotics(seed: Seed): Artifact {
  const robotType = geneVal(seed, 'robotType', 'humanoid');
  const dofRaw = typeof geneVal(seed, 'dof', 0.5) === 'number' ? geneVal(seed, 'dof', 0.5) : 0.5;
  const actuators = geneVal(seed, 'actuators', ['servo', 'linear']);
  const autonomy = typeof geneVal(seed, 'autonomy', 0.5) === 'number' ? geneVal(seed, 'autonomy', 0.5) : 0.5;
  const dof = Math.max(3, Math.floor(dofRaw * 12));
  const actList = Array.isArray(actuators) ? actuators : [actuators];
  const sensors = robotType === 'humanoid' ? ['camera', 'imu', 'force', 'proximity'] :
    robotType === 'wheeled' ? ['lidar', 'camera', 'encoder'] :
    robotType === 'aerial' ? ['gps', 'imu', 'camera', 'barometer'] : ['camera', 'imu'];
  const payloadKg = robotType === 'industrial' ? +(dof * 5).toFixed(1) : +(dof * 0.5).toFixed(1);
  const batteryHours = +(4 + (1 - autonomy) * 8).toFixed(1);
  return {
    type: 'robotics', name: seed.$name ?? 'Robot', domain: 'robotics',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    robot: { type: robotType, dof, actuators: actList },
    capabilities: { sensors, payload_kg: payloadKg, battery_hours: batteryHours, autonomy_level: +autonomy.toFixed(2), nav_type: autonomy > 0.7 ? 'slam' : autonomy > 0.4 ? 'waypoint' : 'teleoperated' },
    render_hints: { mode: '3d_robot', animated: true },
  };
}

function growCircuit(seed: Seed): Artifact {
  const circuitType = geneVal(seed, 'circuitType', 'digital');
  const components = geneVal(seed, 'components', ['resistor', 'capacitor', 'IC']);
  const layersRaw = typeof geneVal(seed, 'layers', 0.5) === 'number' ? geneVal(seed, 'layers', 0.5) : 0.5;
  const complexity = typeof geneVal(seed, 'complexity', 0.5) === 'number' ? geneVal(seed, 'complexity', 0.5) : 0.5;
  const layers = Math.max(1, Math.floor(layersRaw * 6));
  const compList = Array.isArray(components) ? components : [components];
  const nodeCount = Math.floor(compList.length * (1 + complexity * 3));
  const connectionCount = Math.floor(nodeCount * 1.5);
  const powerMw = circuitType === 'digital' ? Math.floor(10 + complexity * 500) : Math.floor(50 + complexity * 2000);
  const frequency = circuitType === 'digital' ? `${Math.floor(1 + complexity * 3000)} MHz` : circuitType === 'rf' ? `${+(0.1 + complexity * 5.9).toFixed(1)} GHz` : 'DC';
  return {
    type: 'circuit', name: seed.$name ?? 'Circuit', domain: 'circuit',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    circuit: { type: circuitType, components: compList, layers },
    electrical: { node_count: nodeCount, connections: connectionCount, power_mw: powerMw, frequency, voltage: circuitType === 'digital' ? '3.3V' : '12V' },
    layout: { board_mm: [Math.floor(20 + complexity * 80), Math.floor(15 + complexity * 60)], trace_width_mm: layers > 3 ? 0.15 : 0.25, via_count: Math.floor(nodeCount * 0.3) },
    render_hints: { mode: 'schematic' },
  };
}

function growFood(seed: Seed): Artifact {
  const cuisine = geneVal(seed, 'cuisine', 'italian');
  const complexity = typeof geneVal(seed, 'complexity', 0.5) === 'number' ? geneVal(seed, 'complexity', 0.5) : 0.5;
  const flavorProfile = geneVal(seed, 'flavor_profile', [0.5, 0.3, 0.7, 0.2, 0.1]);
  const flavors = Array.isArray(flavorProfile) ? flavorProfile : [0.5, 0.3, 0.7, 0.2, 0.1];
  const flavorLabels = ['sweet', 'salty', 'umami', 'sour', 'bitter'];
  const dominantFlavor = flavorLabels[flavors.indexOf(Math.max(...flavors.map(Number)))] || 'umami';
  const ingredientCount = Math.max(3, Math.floor(complexity * 15));
  const prepMinutes = Math.floor(15 + complexity * 90);
  const cookMinutes = Math.floor(10 + complexity * 120);
  const servings = typeof geneVal(seed, 'servings', 4) === 'number' ? Math.max(1, Math.floor(geneVal(seed, 'servings', 4))) : 4;
  const calories = Math.floor(200 + flavors[0] * 300 + flavors[2] * 200);
  return {
    type: 'food', name: seed.$name ?? 'Recipe', domain: 'food',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    recipe: { cuisine, complexity: +complexity.toFixed(2), servings, ingredient_count: ingredientCount },
    flavor: { profile: Object.fromEntries(flavorLabels.map((l, i) => [l, +(flavors[i] ?? 0).toFixed(2)])), dominant: dominantFlavor },
    preparation: { prep_minutes: prepMinutes, cook_minutes: cookMinutes, total_minutes: prepMinutes + cookMinutes, technique: complexity > 0.7 ? 'advanced' : complexity > 0.4 ? 'intermediate' : 'beginner', calories_per_serving: calories },
    render_hints: { mode: 'recipe_card' },
  };
}

function growChoreography(seed: Seed): Artifact {
  const style = geneVal(seed, 'style', 'contemporary');
  const tempo = typeof geneVal(seed, 'tempo', 0.5) === 'number' ? geneVal(seed, 'tempo', 0.5) : 0.5;
  const dancerCount = Math.max(1, Math.floor((typeof geneVal(seed, 'dancers', 0.5) === 'number' ? geneVal(seed, 'dancers', 0.5) : 0.5) * 8));
  const energy = typeof geneVal(seed, 'energy', 0.5) === 'number' ? geneVal(seed, 'energy', 0.5) : 0.5;
  const bpm = Math.floor(60 + tempo * 120);
  const durationBeats = Math.max(16, Math.floor(32 + energy * 64));
  const durationSec = +(durationBeats / (bpm / 60)).toFixed(1);
  const formations = dancerCount > 4 ? ['circle', 'line', 'scatter', 'pairs'] : dancerCount > 1 ? ['line', 'pairs'] : ['solo'];
  const movements = style === 'ballet' ? ['plie', 'arabesque', 'pirouette', 'jete'] :
    style === 'hiphop' ? ['pop', 'lock', 'wave', 'freeze'] :
    style === 'contemporary' ? ['release', 'contraction', 'spiral', 'fall'] :
    ['step', 'turn', 'gesture', 'jump'];
  return {
    type: 'choreography', name: seed.$name ?? 'Dance', domain: 'choreography',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    choreography: { style, tempo_bpm: bpm, dancers: dancerCount, duration_beats: durationBeats, duration_sec: durationSec },
    structure: { formations, movements, phrase_count: Math.ceil(durationBeats / 8), energy_curve: energy > 0.6 ? 'build_drop' : 'steady' },
    spatial: { stage_width_m: Math.max(4, dancerCount * 2), stage_depth_m: Math.max(3, dancerCount * 1.5), floor_pattern: dancerCount > 2 ? 'mapped' : 'free' },
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
