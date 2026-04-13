/**
 * GSPL Compiler — Maps seeds to engine-specific parameters.
 *
 * compileToQFT: Translates seed genes into QFT boundary conditions.
 * compileToEngine: Generic adapter for all 27 domain engines.
 */

import { getAllDomains } from '../kernel/engines.js';

interface Seed {
  $domain?: string;
  $name?: string;
  genes?: Record<string, { type?: string; value?: any }>;
  [key: string]: any;
}

function gv(seed: Seed, name: string, fallback: any): any {
  return seed.genes?.[name]?.value ?? fallback;
}

// ─── QFT Compiler ────────────────────────────────────────────────────────────

export class GSPLCompiler {
  static compileToQFT(seed: Seed): any {
    const genes = seed.genes || {};
    const domain = seed.$domain || "character";

    let fieldType = "EM";
    if (["character", "organic", "creature"].includes(domain)) fieldType = "DIRAC";
    if (["vfx", "energy", "magic"].includes(domain)) fieldType = "QED";
    if (["matter", "prop", "weapon"].includes(domain)) fieldType = "QCD";
    if (["cosmos", "environment", "world"].includes(domain)) fieldType = "GRAVITY";

    if (genes.field_type?.value) fieldType = String(genes.field_type.value).toUpperCase();

    const qftParams: any = {
      field_type: fieldType,
      grid_size: [32, 32, 32],
      num_steps: 100,
      initial_conditions: {}
    };

    const power = genes.core_power?.value ?? 50;
    const stability = genes.stability?.value ?? 50;
    const complexity = genes.complexity?.value ?? 50;

    switch (fieldType) {
      case "EM":
        qftParams.initial_conditions.source = {
          position: [16, 16, 16],
          moment: [power / 50, (complexity - 50) / 50, 0],
          width: Math.max(1, stability / 10),
          time_function: stability > 70 ? "sinusoidal" : "gaussian"
        };
        break;
      case "DIRAC":
        qftParams.initial_conditions.wavepacket = {
          position: [16, 16, 16],
          momentum: [power / 100, 0, (complexity - 50) / 100],
          width: Math.max(1, stability / 10)
        };
        qftParams.initial_conditions.potential = { type: "coulomb", charge: power / 25, position: [16, 16, 16] };
        break;
      case "QED":
        qftParams.initial_conditions.electron = {
          position: [16, 16, 16],
          momentum: [power / 100, (complexity - 50) / 100, 0],
          width: Math.max(1, stability / 10)
        };
        qftParams.initial_conditions.coupling_constant = power / 100;
        break;
      case "GRAVITY":
        qftParams.initial_conditions.source = {
          position: [16, 16, 16],
          mass: power / 10,
          radius: Math.max(1, stability / 10),
          frequency: complexity / 100
        };
        break;
      case "QCD":
        qftParams.grid_size = [8, 8, 8, 8];
        qftParams.initial_conditions.beta = 5.0 + (stability / 50);
        qftParams.num_steps = Math.floor(power * 2);
        break;
    }

    return qftParams;
  }

  // ─── Generic Engine Compiler ─────────────────────────────────────────

  /**
   * Compiles a seed's genes into the parameter format expected by a specific domain engine.
   * This acts as a "smart adapter" that reads gene values and maps them to engine inputs.
   */
  static compileToEngine(seed: Seed, targetEngine?: string): Record<string, any> {
    const domain = targetEngine || seed.$domain || 'character';
    const params: Record<string, any> = { domain, source_seed: seed.id || 'unknown' };

    // Extract all gene values into a flat parameter map
    for (const [name, gene] of Object.entries(seed.genes || {})) {
      params[name] = gene.value;
    }

    // Domain-specific parameter enrichment
    switch (domain) {
      case 'character':
        params.render_mode = '2d_character';
        params.stat_normalization = true;
        params.hp_formula = '100 + strength * 200';
        break;
      case 'music':
        if (typeof params.tempo === 'number' && params.tempo <= 1) params.tempo_bpm = 60 + params.tempo * 140;
        params.render_mode = 'audio_waveform';
        params.sample_rate = 44100;
        break;
      case 'fullgame':
        params.render_mode = 'game_preview';
        params.requires_runtime = true;
        params.target_fps = 60;
        break;
      case 'physics':
        params.render_mode = 'physics_sim';
        params.integrator = params.simulationType === 'fluid' ? 'sph' : 'verlet';
        params.dt = params.simulationType === 'fluid' ? 0.001 : 0.016;
        break;
      case 'geometry3d':
        params.render_mode = '3d_viewport';
        params.export_formats = ['glb', 'obj', 'usd'];
        break;
      case 'shader':
        params.render_mode = 'shader_preview';
        params.target_api = 'webgpu';
        params.compile_glsl = true;
        break;
      case 'animation':
        params.render_mode = 'animation_timeline';
        params.keyframe_interpolation = params.easing || 'ease_in_out';
        break;
      case 'narrative':
        params.render_mode = 'narrative_flow';
        params.output_format = 'markdown';
        break;
      case 'architecture':
        params.render_mode = '3d_building';
        params.structural_analysis = true;
        break;
      case 'ecosystem':
        params.render_mode = 'ecosystem_graph';
        params.simulation_ticks = 1000;
        break;
      case 'particle':
        params.render_mode = 'particle_sim';
        params.gpu_accelerated = true;
        break;
      case 'agent':
        params.render_mode = 'chat_interface';
        params.inference_tiers = [0, 1, 2, 3];
        break;
      default:
        params.render_mode = 'generic';
        break;
    }

    return params;
  }

  /**
   * Returns all valid target engines for compilation.
   */
  static getTargetEngines(): string[] {
    return getAllDomains();
  }
}
