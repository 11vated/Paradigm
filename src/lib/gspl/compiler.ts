export class GSPLCompiler {
  /**
   * Translates a GSPL Seed (with genes and domain) into physical QFT boundary conditions.
   * This is the mathematical bridge between Semantic Intent and Physical Simulation.
   */
  static compileToQFT(seed: any): any {
    const genes = seed.genes || {};
    const domain = seed.$domain || "character";
    
    // 1. Determine Fundamental Field Type based on Domain Ontology
    let fieldType = "EM";
    if (["character", "organic", "creature"].includes(domain)) fieldType = "DIRAC";
    if (["vfx", "energy", "magic"].includes(domain)) fieldType = "QED";
    if (["matter", "prop", "weapon"].includes(domain)) fieldType = "QCD";
    if (["cosmos", "environment", "world"].includes(domain)) fieldType = "GRAVITY";
    
    // Explicit override via GSPL gene
    if (genes.field_type?.value) {
      fieldType = String(genes.field_type.value).toUpperCase();
    }
    
    // 2. Base Quantum Parameters
    const qftParams: any = {
      field_type: fieldType,
      grid_size: [32, 32, 32], // Standard resolution for real-time emergence
      num_steps: 100,
      initial_conditions: {}
    };
    
    // 3. Map Semantic Genes to Physical Constants
    // Default values if genes are missing
    const power = genes.core_power?.value ?? 50;       // 0-100 scale
    const stability = genes.stability?.value ?? 50;    // 0-100 scale
    const complexity = genes.complexity?.value ?? 50;  // 0-100 scale
    
    // 4. Field-Specific Boundary Condition Generation
    switch (fieldType) {
      case "EM":
        qftParams.initial_conditions.source = {
          position: [16, 16, 16],
          moment: [power / 50, (complexity - 50) / 50, 0], // Polarization based on complexity
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
        qftParams.initial_conditions.potential = {
          type: "coulomb",
          charge: power / 25, // Higher power = deeper potential well
          position: [16, 16, 16]
        };
        break;
        
      case "QED":
        qftParams.initial_conditions.electron = {
          position: [16, 16, 16],
          momentum: [power / 100, (complexity - 50) / 100, 0],
          width: Math.max(1, stability / 10)
        };
        qftParams.initial_conditions.coupling_constant = power / 100; // Stronger power = stronger light-matter interaction
        break;
        
      case "GRAVITY":
        qftParams.initial_conditions.source = {
          position: [16, 16, 16],
          mass: power / 10, // Mass warps spacetime
          radius: Math.max(1, stability / 10),
          frequency: complexity / 100
        };
        break;
        
      case "QCD":
        qftParams.grid_size = [8, 8, 8, 8]; // 4D Lattice
        // Beta = 6/g^2. Higher stability = weaker coupling = higher beta (closer to continuum)
        qftParams.initial_conditions.beta = 5.0 + (stability / 50); 
        qftParams.num_steps = Math.floor(power * 2); // More power = more thermalization sweeps
        break;
    }
    
    return qftParams;
  }

  /**
   * Compiles a seed's genes into the parameter format expected by a specific domain engine.
   * Acts as a "smart adapter" mapping genes to engine-specific inputs.
   */
  static compileToEngine(seed: any, targetEngine?: string): Record<string, any> {
    const domain = targetEngine || seed.$domain || 'character';
    const genes = seed.genes || {};
    const params: Record<string, any> = { domain, source_seed: seed.id || 'unknown' };

    // Flatten all gene values
    for (const [name, gene] of Object.entries(genes)) {
      params[name] = (gene as any).value;
    }

    // Domain-specific enrichment
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

  /** Returns all valid target engines. */
  static getTargetEngines(): string[] {
    return ['character', 'sprite', 'music', 'visual2d', 'procedural', 'fullgame', 'animation',
            'geometry3d', 'narrative', 'ui', 'physics', 'audio', 'ecosystem', 'game', 'alife',
            'shader', 'particle', 'typography', 'architecture', 'vehicle', 'furniture', 'fashion',
            'robotics', 'circuit', 'food', 'choreography', 'agent'];
  }
}
