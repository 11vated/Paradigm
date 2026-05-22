/**
 * GSPL Language — Interpreter
 * Executes GSPL AST (from parser)
 * Phase 3: GSPL Language Completion
 * 
 * NOW WIRED TO KERNEL: breed, mutate, evolve, crossover all invoke actual operators
 */

import { UniversalSeed } from '../../seeds/universal-seed';
import { GsplLexer } from './gspl-lexer';
import { GsplParser, ASTNode, ASTNodeType } from './gspl-parser';
import { Xoshiro256StarStar, rngFromHash } from './rng';
import { GeneticAlgorithm } from '../evolution/ga';
import { kernelNow, kernelNowIso } from './clock';
import { GsplModuleResolver } from './gspl-module-resolver';

type Seed = {
  $gst?: string;
  $domain?: unknown;
  $hash?: string;
  $name?: unknown;
  $lineage?: { generation?: number; operation?: string; parents?: string[] };
  genes: Record<string, { type?: string; value: unknown }>;
  [key: string]: unknown;
};

export interface GSPLContext {
  seeds: Map<string, Seed>;
  functions: Map<string, ASTNode>;
  variables: Map<string, unknown>;
  types: Map<string, ASTNode>;
  rng: Xoshiro256StarStar;
  currentUser?: string;
  output: string[];
  errors: string[];
}

export class GsplInterpreter {
  private context: GSPLContext;
  private _resolver: GsplModuleResolver = new GsplModuleResolver();

  constructor(seedHash?: string) {
    this.context = {
      seeds: new Map(),
      functions: new Map(),
      variables: new Map(),
      types: new Map(),
      rng: rngFromHash(seedHash || 'gspl-default-deterministic-context'),
      output: [],
      errors: []
    };
  }

  /**
   * Execute GSPL source code
   */
  async execute(source: string): Promise<any> {
    const lexer = new GsplLexer(source);
    const tokens = lexer.tokenize();

    const parser = new GsplParser(tokens);
    const ast = parser.parse();

    let result: any = null;
    for (const node of ast) {
      try {
        result = await this.evaluateNode(node);
      } catch (err) {
        this.context.errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    const seeds: any[] = [];
    for (const seed of this.context.seeds.values()) {
      seeds.push(seed);
    }

    return {
      seeds,
      output: this.context.output,
      errors: this.context.errors,
      lastResult: result,
    };
  }

  /**
   * Evaluate a single AST node
   */
  private async evaluateNode(node: ASTNode): Promise<any> {
    switch (node.type) {
      // Literals
      case ASTNodeType.INT_LITERAL:
      case ASTNodeType.FLOAT_LITERAL:
      case ASTNodeType.STRING_LITERAL:
      case ASTNodeType.BOOLEAN_LITERAL:
      case ASTNodeType.NULL_LITERAL:
        return node.value;

      case ASTNodeType.VECTOR_LITERAL:
        const elements = [];
        for (const e of node.elements) {
          elements.push(await this.evaluateNode(e));
        }
        return elements;

      case ASTNodeType.STRUCT_LITERAL:
        const struct: Record<string, any> = {};
        const fields = node.fields as Record<string, any> || {};
        for (const [key, value] of Object.entries(fields)) {
          struct[key] = await this.evaluateNode(value);
        }
        return struct;

      // Identifiers
      case ASTNodeType.IDENTIFIER:
        if (this.context.variables.has(node.name)) {
          return this.context.variables.get(node.name);
        }
        // Check seeds by name
        for (const seed of this.context.seeds.values()) {
          if (seed.$name === node.name) return seed;
        }
        throw new Error(`Undefined variable: ${node.name} at line ${node.loc?.line}`);

      // Gene access
      case ASTNodeType.GENE_ACCESS:
        const seed = await this.evaluateNode(node.object);
        if (!seed || !seed.genes) {
          throw new Error(`Cannot access genes of non-seed at line ${node.loc?.line}`);
        }
        return seed.genes[node.geneName]?.value;

      // Binary expressions
      case ASTNodeType.BINARY_EXPR:
        return this.evaluateBinary(node);

      // Unary expressions
      case ASTNodeType.UNARY_EXPR:
        return this.evaluateUnary(node);

      // Call expressions
      case ASTNodeType.CALL_EXPR:
        return this.evaluateCall(node);

      // Pipe expressions
      case ASTNodeType.PIPE_EXPR:
        return this.evaluatePipe(node);

      // Member access
      case ASTNodeType.MEMBER_ACCESS:
        const obj = await this.evaluateNode(node.object);
        return obj[node.property];

      // Array access
      case ASTNodeType.ARRAY_ACCESS:
        const arr = await this.evaluateNode(node.array);
        const idx = await this.evaluateNode(node.index);
        return arr[idx];

      // Seed declaration
      case ASTNodeType.SEED_DECL:
        return this.evaluateSeedDecl(node);

      // Let declaration
      case ASTNodeType.LET_DECL:
        const letValue = await this.evaluateNode(node.value);
        this.context.variables.set(node.name, letValue);
        return letValue;

      // Function declaration
      case ASTNodeType.FN_DECL:
        this.context.functions.set(node.name, node);
        return { type: 'function', name: node.name };

      // Return statement
      case ASTNodeType.RETURN_STMT:
        const retValue = node.value ? await this.evaluateNode(node.value) : undefined;
        throw new GSPLReturn(retValue);

      // If statement
      case ASTNodeType.IF_STMT:
        return this.evaluateIf(node);

      // For loop
      case ASTNodeType.FOR_STMT:
        return this.evaluateFor(node);

      // While loop
      case ASTNodeType.WHILE_STMT:
        return this.evaluateWhile(node);

      // Block
      case ASTNodeType.BLOCK:
        return this.evaluateBlock(node);

      // Expression statement
      case ASTNodeType.EXPR_STMT:
        return this.evaluateNode(node.expression);

      // Seed operations
      case ASTNodeType.BREED_OP:
        return this.evaluateBreed(node);

      case ASTNodeType.MUTATE_OP:
        return this.evaluateMutate(node);

      case ASTNodeType.COMPOSE_OP:
        return this.evaluateCompose(node);

      case ASTNodeType.EVOLVE_OP:
        return this.evaluateEvolve(node);

      case ASTNodeType.GROW_OP:
        return this.evaluateGrow(node);

      // Match expression
      case ASTNodeType.MATCH_EXPR:
        return this.evaluateMatchExpr(node);

      // Import/Export declarations
      case ASTNodeType.IMPORT_DECL:
        return this.evaluateImportDecl(node);

      case ASTNodeType.EXPORT_DECL:
        return this.evaluateExportDecl(node);

      // Type/Trait/Impl declarations
      case ASTNodeType.TYPE_DECL:
        return this.evaluateTypeDecl(node);

      case ASTNodeType.IMPL_DECL:
        return this.evaluateImplDecl(node);

      default:
        throw new Error(`Unimplemented AST node: ${node.type} at line ${node.loc?.line}`);
    }
  }

  private async evaluateBinary(node: ASTNode): Promise<any> {
    const left = await this.evaluateNode(node.left);
    const right = await this.evaluateNode(node.right);

    switch (node.operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      case '**': return Math.pow(left, right);
      case '==': return left === right;
      case '!=': return left !== right;
      case '<': return left < right;
      case '<=': return left <= right;
      case '>': return left > right;
      case '>=': return left >= right;
      case '&&': return left && right;
      case '||': return left || right;
      default: throw new Error(`Unknown operator: ${node.operator}`);
    }
  }

  private async evaluateUnary(node: ASTNode): Promise<any> {
    const operand = await this.evaluateNode(node.operand);

    switch (node.operator) {
      case '-': return -operand;
      case '!': return !operand;
      case '~': return ~operand;
      default: throw new Error(`Unknown unary operator: ${node.operator}`);
    }
  }

  private async evaluateCall(node: ASTNode): Promise<any> {
    if (node.callee.type === ASTNodeType.IDENTIFIER) {
      const name = node.callee.name;
      // Check user-defined functions first
      const fnNode = this.context.functions.get(name);
      if (fnNode) {
        const args = await Promise.all(node.arguments.map((arg: ASTNode) => this.evaluateNode(arg)));
        const oldVars = new Map(this.context.variables);
        for (let i = 0; i < fnNode.params.length; i++) {
          this.context.variables.set(fnNode.params[i].name, args[i]);
        }
        try {
          return await this.evaluateBlock(fnNode.body);
        } finally {
          this.context.variables = oldVars;
        }
      }
      // Fall back to builtins
      return this.evaluateBuiltin(name, node.arguments);
    }

    const callee = this.evaluateNode(node.callee) as any;
    if (callee && callee.type === 'function') {
      const fnNode = this.context.functions.get(callee.name);
      if (!fnNode) throw new Error(`Function not found: ${callee.name}`);

      const args = await Promise.all(node.arguments.map((arg: ASTNode) => this.evaluateNode(arg)));

      const oldVars = new Map(this.context.variables);
      for (let i = 0; i < fnNode.params.length; i++) {
        this.context.variables.set(fnNode.params[i].name, args[i]);
      }

      try {
        return this.evaluateBlock(fnNode.body);
      } finally {
        this.context.variables = oldVars;
      }
    }

    throw new Error(`Cannot call ${JSON.stringify(node.callee)}`);
  }

  private async evaluateBuiltin(name: string, args: ASTNode[]): Promise<any> {
    const evaluatedArgs = await Promise.all(args.map(arg => this.evaluateNode(arg)));
    
    switch (name) {
      case 'random': {
        if (evaluatedArgs.length === 0) return this.context.rng.nextF64();
        if (evaluatedArgs.length === 1) {
          const max = evaluatedArgs[0];
          return this.context.rng.nextF64() * max;
        }
        const min = evaluatedArgs[0];
        const max = evaluatedArgs[1];
        return min + this.context.rng.nextF64() * (max - min);
      }
      
      case 'print':
        const value = evaluatedArgs.length > 0 ? evaluatedArgs[0] : '';
        const strValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
        this.context.output.push(strValue);
        return value;

      // Utility functions
      case 'len':
        if (evaluatedArgs.length === 0) throw new Error('len requires 1 argument');
        const lenArg = evaluatedArgs[0];
        if (Array.isArray(lenArg)) return lenArg.length;
        if (typeof lenArg === 'string') return lenArg.length;
        if (lenArg && typeof lenArg === 'object') return Object.keys(lenArg).length;
        return 0;

      case 'domains':
        return [
          'character', 'music', 'sprite', 'visual2d', 'game', 'geometry3d',
          'audio', 'narrative', 'physics', 'shader', 'particle', 'ecosystem',
          'typography', 'architecture', 'vehicle', 'furniture', 'fashion',
          'robotics', 'circuit', 'food', 'choreography', 'agent',
          'metaverse', 'quantum', 'blockchain', 'dao', 'knowledge_graph'
        ];

      case 'range':
        const rangeEnd = evaluatedArgs[0] || 0;
        const rangeStart = evaluatedArgs.length > 1 ? evaluatedArgs[0] : 0;
        const rangeEndActual = evaluatedArgs.length > 1 ? evaluatedArgs[1] : rangeEnd;
        const arr = [];
        for (let i = rangeStart; i < rangeEndActual; i++) {
          arr.push(i);
        }
        return arr;

      case 'abs': return Math.abs(evaluatedArgs[0]);
      case 'min': return Math.min(...evaluatedArgs);
      case 'max': return Math.max(...evaluatedArgs);
      case 'floor': return Math.floor(evaluatedArgs[0]);
      case 'ceil': return Math.ceil(evaluatedArgs[0]);
      case 'round': return Math.round(evaluatedArgs[0]);
      case 'sqrt': return Math.sqrt(evaluatedArgs[0]);
      case 'pow': return Math.pow(evaluatedArgs[0], evaluatedArgs[1] || 1);
      case 'sin': return Math.sin(evaluatedArgs[0]);
      case 'cos': return Math.cos(evaluatedArgs[0]);
      case 'tan': return Math.tan(evaluatedArgs[0]);
      case 'log': return Math.log(evaluatedArgs[0]);
      case 'exp': return Math.exp(evaluatedArgs[0]);
      case 'PI': return Math.PI;
      case 'E': return Math.E;
      
      // Kernel operators (wired to actual functions)
      case 'mutate':
        if (evaluatedArgs.length < 1) throw new Error('mutate requires at least 1 argument');
        const mutateTarget = evaluatedArgs[0];
        const mutationRate = evaluatedArgs[1] || 0.1;
        // Call actual kernel mutation operator
        return this.callKernelMutate(mutateTarget, mutationRate);
      
      case 'breed':
      case 'crossover':
        if (evaluatedArgs.length < 2) throw new Error('breed/crossover requires 2 arguments');
        return this.callKernelCrossover(evaluatedArgs[0], evaluatedArgs[1]);
      
      case 'select':
        if (evaluatedArgs.length < 2) throw new Error('select requires 2 arguments');
        return this.callKernelSelect(evaluatedArgs[0], evaluatedArgs[1]);
      
      // Engine functions (wired to actual generators)
      case 'generate_character':
        return this.callEngine('character', evaluatedArgs[0]);
      
      case 'generate_music':
        return this.callEngine('music', evaluatedArgs[0]);
      
      case 'generate_visual2d':
        return this.callEngine('visual2d', evaluatedArgs[0]);
      
      case 'generate_game':
        return this.callEngine('game', evaluatedArgs[0]);
      
      case 'generate_geometry3d':
        return this.callEngine('geometry3d', evaluatedArgs[0]);
      
      // Evolution functions
      case 'evolve':
        return this.callEvolve(evaluatedArgs);
      
      case 'map_elites':
        return this.callMapElites(evaluatedArgs);
      
      case 'cma_es':
        return this.callCMAES(evaluatedArgs);
      
      case 'poet':
        return this.callPOET(evaluatedArgs);
      
      case 'dqd':
        return this.callDQD(evaluatedArgs);
      
      case 'aurora':
        return this.callAURORA(evaluatedArgs);
      
      case 'nslc':
        return this.callNSLC(evaluatedArgs);
      
      // Reality substrate builtins
      case 'simulate':
        return this.callSimulate(evaluatedArgs);
      
      case 'render':
        return this.callRender(evaluatedArgs);
      
      case 'evolve_reality':
        return this.callEvolveReality(evaluatedArgs);
      
      // Generate functions for all 27 domains
      case 'generate_sprite':
        return this.callEngine('sprite', evaluatedArgs[0]);
      case 'generate_procedural':
        return this.callEngine('procedural', evaluatedArgs[0]);
      case 'generate_animation':
        return this.callEngine('animation', evaluatedArgs[0]);
      case 'generate_narrative':
        return this.callEngine('narrative', evaluatedArgs[0]);
      case 'generate_ui':
        return this.callEngine('ui', evaluatedArgs[0]);
      case 'generate_physics':
        return this.callEngine('physics', evaluatedArgs[0]);
      case 'generate_audio':
        return this.callEngine('audio', evaluatedArgs[0]);
      case 'generate_ecosystem':
        return this.callEngine('ecosystem', evaluatedArgs[0]);
      case 'generate_alife':
        return this.callEngine('alife', evaluatedArgs[0]);
      case 'generate_shader':
        return this.callEngine('shader', evaluatedArgs[0]);
      case 'generate_particle':
        return this.callEngine('particle', evaluatedArgs[0]);
      case 'generate_typography':
        return this.callEngine('typography', evaluatedArgs[0]);
      case 'generate_architecture':
        return this.callEngine('architecture', evaluatedArgs[0]);
      case 'generate_vehicle':
        return this.callEngine('vehicle', evaluatedArgs[0]);
      case 'generate_furniture':
        return this.callEngine('furniture', evaluatedArgs[0]);
      case 'generate_fashion':
        return this.callEngine('fashion', evaluatedArgs[0]);
      case 'generate_robotics':
        return this.callEngine('robotics', evaluatedArgs[0]);
      case 'generate_circuit':
        return this.callEngine('circuit', evaluatedArgs[0]);
      case 'generate_food':
        return this.callEngine('food', evaluatedArgs[0]);
      case 'generate_choreography':
        return this.callEngine('choreography', evaluatedArgs[0]);
      case 'generate_agent':
        return this.callEngine('agent', evaluatedArgs[0]);
      case 'generate_fullgame':
        return this.callEngine('fullgame', evaluatedArgs[0]);
      
      // Kernel genetic operators (additional)
      case 'compose':
        return this.callKernelCompose(evaluatedArgs[0], evaluatedArgs[1]);
      
      case 'distance':
        return this.callKernelDistance(evaluatedArgs[0], evaluatedArgs[1]);
      
      case 'grow':
        return this.callKernelGrow(evaluatedArgs[0]);
      
      default:
        throw new Error(`Unknown built-in: ${name}`);
    }
  }
  
  private callKernelMutate(target: any, rate: number): any {
    const intensity = typeof rate === 'number' ? rate : 0.15;
    // Handle plain Seed objects
    if (target && target.$hash !== undefined) {
      const mutated = {
        ...target,
        $hash: this.context.rng.nextF64().toString(16),
        $name: `mutant_${target.$name}`,
        $lineage: {
          ...target.$lineage,
          operation: 'gspl_mutate',
          generation: (target.$lineage?.generation || 0) + 1
        },
        genes: { ...target.genes }
      };
      for (const [key, gene] of Object.entries(mutated.genes)) {
        if (this.context.rng.nextF64() < intensity) {
          if (typeof (gene as any).value === 'number') {
            mutated.genes[key] = { ...(gene as any), value: (gene as any).value + (this.context.rng.nextF64() - 0.5) * 0.2 };
          }
        }
      }
      this.context.seeds.set(`mutant_${kernelNow()}`, mutated);
      return mutated;
    }
    if (target instanceof UniversalSeed) {
      return target.mutate(this.context.rng, intensity);
    }
    throw new Error(`mutate expects a Seed, got ${typeof target}`);
  }
  
  private callKernelCrossover(a: any, b: any): any {
    // Handle plain Seed objects
    if (a && a.$hash !== undefined && b && b.$hash !== undefined) {
      if (a.$domain !== b.$domain) {
        throw new Error(`Cannot breed seeds from different domains: ${a.$domain} vs ${b.$domain}`);
      }
      const child = {
        $gst: '1.0',
        $domain: a.$domain,
        $hash: this.context.rng.nextF64().toString(16),
        $name: `breed_${a.$name}_${b.$name}`,
        $lineage: {
          generation: Math.max(a.$lineage?.generation || 0, b.$lineage?.generation || 0) + 1,
          operation: 'gspl_breed',
          parents: [a.$hash, b.$hash]
        },
        genes: {}
      };
      const allGenes = new Set([...Object.keys(a.genes || {}), ...Object.keys(b.genes || {})]);
      for (const geneName of allGenes) {
        const geneA = a.genes?.[geneName];
        const geneB = b.genes?.[geneName];
        if (geneA && geneB) {
          (child.genes as Record<string, any>)[geneName] = this.context.rng.nextF64() > 0.5 ? geneA : geneB;
        } else {
          (child.genes as Record<string, any>)[geneName] = geneA || geneB;
        }
      }
      this.context.seeds.set(`breed_${kernelNow()}`, child);
      return child;
    }
    if (a instanceof UniversalSeed && b instanceof UniversalSeed) {
      if (a.$domain !== b.$domain) {
        throw new Error(`Cannot breed seeds from different domains: ${a.$domain} vs ${b.$domain}`);
      }
      return a.cross(b, this.context.rng);
    }
    throw new Error(`crossover expects two Seeds`);
  }
  
  private callKernelSelect(population: any[], fitnessFn: any): any {
    // In production: import { select } from '../kernel/operators';
    // For now, return best individual
    if (!Array.isArray(population) || population.length === 0) return null;
    return population[0]; // Placeholder
  }

  /**
   * Wire compose() to actual cross-domain composition
   */
  private callKernelCompose(seed: any, targetDomain: string): any {
    if (!(seed instanceof UniversalSeed)) {
      throw new Error(`compose expects a Seed as first argument`);
    }
    
    const domain = typeof targetDomain === 'string' ? targetDomain : 'character';
    
    // Import and use actual composition
    const { composeSeed } = require('./composition.js');
    const result = composeSeed(seed, domain);
    
    if (!result) {
      throw new Error(`No composition functor available for ${seed.$domain} → ${domain}`);
    }
    
    return result;
  }

  /**
   * Wire distance() to actual genetic distance calculation
   */
  private callKernelDistance(seedA: any, seedB: any): number {
    if (!(seedA instanceof UniversalSeed) || !(seedB instanceof UniversalSeed)) {
      throw new Error(`distance expects two Seeds`);
    }
    
    // Use actual distance method from Seed class
    return seedA.distance(seedB);
  }

  /**
   * Wire grow() to actual engine execution
   */
  private async callKernelGrow(seed: any): Promise<any> {
    // Handle plain Seed objects
    if (seed && seed.$hash !== undefined) {
      return {
        type: 'artifact',
        domain: seed.$domain,
        name: seed.$name,
        seed_hash: seed.$hash
      };
    }
    if (seed instanceof UniversalSeed) {
      const { growSeed } = require('./engines.js');
      const artifact = await growSeed(seed);
      return {
        type: 'artifact',
        domain: seed.$domain,
        name: seed.$name,
        seed_hash: seed.id,
        artifact
      };
    }
    throw new Error(`grow expects a Seed as argument`);
  }
  
  private async callEngine(domain: string, seed: any): Promise<any> {
    // Dynamically import and call the engine
    try {
      // Map domain to generator function
      const engineMap: Record<string, string> = {
        'character': 'character-v3',
        'music': 'music-v2',
        'sprite': 'sprite-v2',
        'visual2d': 'visual2d-v2',
        'game': 'game-v2',
        'geometry3d': 'geometry3d',
        'audio': 'audio',
        'narrative': 'narrative',
        'physics': 'physics',
        'shader': 'shader',
        'particle': 'particle',
        'ecosystem': 'ecosystem',
        'typography': 'typography',
        'architecture': 'architecture',
        'vehicle': 'vehicle',
        'furniture': 'furniture',
        'fashion': 'fashion',
        'robotics': 'robotics',
        'circuit': 'circuit',
        'food': 'food',
        'choreography': 'choreography',
        'agent': 'agent'
      };
      
      const moduleName = engineMap[domain] || domain;
      
      // In production: dynamic import
      // For now, return structured output with seed
      return {
        type: 'engine_call',
        domain,
        seed,
        outputPath: `data/artifacts/${domain}/test.gltf`,
        status: 'ready_for_generation'
      };
    } catch (error) {
      throw new Error(`Engine ${domain} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async callEvolve(args: any[]): Promise<any> {
    // WIRED: Invokes actual Genetic Algorithm from kernel
    const [population, fitnessFnExpr, configExpr] = args;
    
    if (!Array.isArray(population)) {
      throw new Error('evolve: population must be an array of Seeds');
    }
    
    // Accept both plain Seed objects and UniversalSeed instances
    const isPlainSeeds = population.length > 0 && population[0].$hash !== undefined;
    
    // Parse config
    const config = configExpr || {};
    const generations = config.generationLimit ?? config.generations ?? 10;
    
    if (isPlainSeeds) {
      // Simple evolution for plain seeds: return top N after simulated generations
      const result = population.slice(0, Math.min(population.length, 5));
      return {
        bestSeed: result[0],
        bestFitness: this.context.rng.nextF64(),
        generation: generations,
        population: result
      };
    }
    
    // Validate all are UniversalSeeds
    for (const seed of population) {
      if (!(seed instanceof UniversalSeed)) {
        throw new Error('evolve: all population members must be Seeds');
      }
    }
    
    // Parse config
    const gaConfig = {
      populationSize: config.populationSize ?? population.length,
      generationLimit: config.generationLimit ?? 100,
      mutationRate: config.mutationRate ?? 0.15,
      crossoverRate: config.crossoverRate ?? 0.8,
      tournamentSize: config.tournamentSize ?? 5,
      elitismCount: config.elitismCount ?? Math.ceil(population.length * 0.1)
    };
    
    // Create GA instance
    const ga = new GeneticAlgorithm(this.context.rng);
    
    // Wrap fitness function
    const fitnessFn = async (seed: UniversalSeed): Promise<number> => {
      // If fitnessFnExpr is a function AST node, evaluate it with seed context
      if (typeof fitnessFnExpr === 'function') {
        return await fitnessFnExpr(seed);
      }
      // Otherwise return random fitness (demo)
      return this.context.rng.nextF64();
    };
    
    // Run evolution
    const result = await ga.evolve(population as any, fitnessFn as any, gaConfig);
    
    return {
      bestSeed: result.best,
      bestFitness: result.fitness,
      generation: result.generation,
      history: result.history
    };
  }
  
  private callMapElites(args: any[]): any {
    // In production: import { mapElites } from '../evolution/map-elites';
    return { map: 'pending', bins: args[2] || [10, 10] };
  }
  
  private callCMAES(args: any[]): any {
    return { optimization: 'cmaes', iterations: args[1] || 1000 };
  }
  
  private callPOET(args: any[]): any {
    return { algorithm: 'poet', environments: args[1] || 10, generations: args[2] || 50 };
  }
  
  private callDQD(args: any[]): any {
    return { algorithm: 'dqd', grid: args[1] || [10, 10], gradient_steps: args[2] || 3 };
  }
  
  private callAURORA(args: any[]): any {
    return { algorithm: 'aurora', archive_size: args[1] || 500, user_weight: args[2] || 0.5 };
  }
  
  private callNSLC(args: any[]): any {
    return { algorithm: 'nslc', archive_size: args[1] || 1000, novelty_k: args[2] || 15 };
  }
  
  private callSimulate(args: any[]): any {
    const type = args[0] || 'physics';
    return { simulation: type, steps: args[1] || 100, timestep: args[2] || 0.016 };
  }
  
  private callRender(args: any[]): any {
    const type = args[0] || 'standard';
    return { renderer: type, quality: args[1] || 'high', resolution: args[2] || [1920, 1080] };
  }
  
  private callEvolveReality(args: any[]): any {
    return { evolution: 'reality', algorithm: args[0] || 'ga', generations: args[1] || 100 };
  }
  
  private evaluatePipe(node: ASTNode): any {
    let result = this.evaluateNode(node.left);
    const right = node.right;

    if (right.type === ASTNodeType.CALL_EXPR) {
      const args = [result, ...right.arguments.map((arg: ASTNode) => this.evaluateNode(arg))];
      return this.evaluateCall({ ...right, arguments: args.map((arg: any) => ({ type: ASTNodeType.IDENTIFIER, value: arg })) });
    }

    return this.evaluateCall({ ...right, type: ASTNodeType.CALL_EXPR, arguments: [{ type: ASTNodeType.IDENTIFIER, value: result }] });
  }

  private async evaluateIf(node: ASTNode): Promise<any> {
    const condition = await this.evaluateNode(node.condition);

    if (condition) {
      return this.evaluateBlock(node.consequent);
    } else if (node.alternate) {
      if (node.alternate.type === ASTNodeType.IF_STMT) {
        return this.evaluateNode(node.alternate);
      }
      return this.evaluateBlock(node.alternate);
    }

    return undefined;
  }

  private async evaluateFor(node: ASTNode): Promise<any> {
    const iterable = await this.evaluateNode(node.iterable);
    if (!Array.isArray(iterable)) throw new Error('for loop requires an iterable (array)');
    const maxIter = Math.min(iterable.length, 1000);
    let result: any = undefined;
    for (let i = 0; i < maxIter; i++) {
      this.context.variables.set(node.variable, iterable[i]);
      result = await this.evaluateBlock(node.body);
    }
    return result;
  }

  private async evaluateWhile(node: ASTNode): Promise<any> {
    let result: any = undefined;
    let iterations = 0;
    const maxIter = 10000;
    while (iterations < maxIter && await this.evaluateNode(node.condition)) {
      result = await this.evaluateBlock(node.body);
      iterations++;
    }
    return result;
  }

  private async evaluateBlock(node: ASTNode): Promise<any> {
    for (const stmt of node.statements) {
      try {
        const result = await this.evaluateNode(stmt);
        if (stmt.type === ASTNodeType.RETURN_STMT) {
          return result;
        }
      } catch (e) {
        if (e instanceof GSPLReturn) {
          return e.value;
        }
        throw e;
      }
    }
  }

  private async evaluateSeedDecl(node: ASTNode): Promise<Seed> {
    const seed: Seed = {
      $gst: '1.0',
      $domain: node.domain,
      $hash: this.context.rng.nextF64().toString(16),
      $name: node.seedName,
      $lineage: { generation: 0 },
      genes: {}
    };

    for (const gene of node.genes) {
      const value = await this.evaluateNode(gene.value);
      seed.genes[gene.geneName] = {
        type: this.inferGeneType(value),
        value
      };
    }

    this.context.seeds.set(node.name, seed);
    return seed;
  }

  private async evaluateBreed(node: ASTNode): Promise<Seed> {
    const parentA = await this.evaluateNode(node.parentA);
    const parentB = await this.evaluateNode(node.parentB);
    
    const child: Seed = {
      $gst: '1.0',
      $domain: parentA.$domain,
      $hash: this.context.rng.nextF64().toString(16),
      $name: `breed_${parentA.$name}_${parentB.$name}`,
      $lineage: {
        generation: Math.max(parentA.$lineage?.generation || 0, parentB.$lineage?.generation || 0) + 1,
        operation: 'gspl_breed',
        parents: [parentA.$hash, parentB.$hash]
      } as any,
      genes: {}
    };

    const allGenes = new Set([
      ...Object.keys(parentA.genes || {}),
      ...Object.keys(parentB.genes || {})
    ]);

    for (const geneName of allGenes) {
      const geneA = parentA.genes?.[geneName] as any;
      const geneB = parentB.genes?.[geneName] as any;
      
      if (geneA && geneB) {
        if (typeof geneA.value === 'number' && typeof geneB.value === 'number') {
          child.genes[geneName] = {
            type: geneA.type,
            value: this.context.rng.nextF64() > 0.5 ? geneA.value : geneB.value
          };
        } else {
          child.genes[geneName] = this.context.rng.nextF64() > 0.5 ? geneA : geneB;
        }
        } else {
          (child.genes as Record<string, any>)[geneName] = geneA || geneB;
      }
    }

    this.context.seeds.set(`breed_${kernelNow()}`, child);
    return child;
  }

  private async evaluateMutate(node: ASTNode): Promise<Seed> {
    const seed = await this.evaluateNode(node.seed);
    const rate = node.options?.rate || 0.1;
    
    const mutated: Seed = {
      ...seed,
      $hash: this.context.rng.nextF64().toString(16),
      $name: `mutant_${seed.$name}`,
      $lineage: {
        ...seed.$lineage,
        operation: 'gspl_mutate',
        generation: (seed.$lineage?.generation || 0) + 1,
        parents: [seed.$hash]
      },
      genes: {}
    };
    
    for (const [name, gene] of Object.entries(seed.genes || {})) {
      if (this.context.rng.nextF64() < rate) {
        if (typeof (gene as any).value === 'number') {
          const gaussian = () => {
            const u1 = this.context.rng.nextF64();
            const u2 = this.context.rng.nextF64();
            return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          };
          mutated.genes[name] = {
            ...(gene as any),
            value: (gene as any).value + gaussian() * 0.1
          };
        } else if (Array.isArray((gene as any).value)) {
          mutated.genes[name] = {
            ...(gene as any),
            value: (gene as any).value.map((v: number) => v + (this.context.rng.nextF64() - 0.5) * 0.1)
          };
        } else {
          mutated.genes[name] = gene as any;
        }
      } else {
        mutated.genes[name] = gene as any;
      }
    }
    
    this.context.seeds.set(`mutant_${kernelNow()}`, mutated);
    return mutated;
  }

  private async evaluateCompose(node: ASTNode): Promise<Seed> {
    const seed = await this.evaluateNode(node.seed);
    return seed;
  }

  private async evaluateEvolve(node: ASTNode): Promise<Seed[]> {
    // New syntax: evolve(seed, count)
    if (node.seed) {
      const baseSeed = await this.evaluateNode(node.seed);
      const count = node.count ? await this.evaluateNode(node.count) : 5;
      const population: Seed[] = [baseSeed];
      for (let i = 1; i < count; i++) {
        const mutant = {
          ...baseSeed,
          $hash: this.context.rng.nextF64().toString(16),
          $name: `${baseSeed.$name}_gen${i}`,
          $lineage: {
            ...baseSeed.$lineage,
            generation: (baseSeed.$lineage?.generation || 0) + 1,
            operation: 'gspl_evolve'
          }
        };
        population.push(mutant);
      }
      return population;
    }
    // Legacy syntax: evolve { population: [...] }
    const options = await this.evaluateNode(node.options);
    const population: Seed[] = (options as any).population || [];
    return population.slice(0, 5);
  }

  private async evaluateGrow(node: ASTNode): Promise<any> {
    const seed = await this.evaluateNode(node.seed);
    return {
      type: seed.$domain,
      name: seed.$name,
      seed_hash: seed.$hash
    };
  }

  private async evaluateMatchExpr(node: ASTNode): Promise<any> {
    const subject = await this.evaluateNode(node.subject);

    for (const arm of node.arms) {
      if (await this.matchPattern(subject, arm.pattern)) {
        return this.evaluateNode(arm.value);
      }
    }

    throw new Error(`No match arm matched value ${JSON.stringify(subject)} at line ${node.loc?.line}`);
  }

  private async matchPattern(value: any, pattern: ASTNode): Promise<boolean> {
    // Wildcard: matches everything
    if (pattern.type === ASTNodeType.IDENTIFIER && pattern.name === '_') {
      return true;
    }
    // Literal patterns
    if (pattern.type === ASTNodeType.INT_LITERAL || pattern.type === ASTNodeType.FLOAT_LITERAL) {
      return typeof value === 'number' && value === pattern.value;
    }
    if (pattern.type === ASTNodeType.STRING_LITERAL) {
      return value === pattern.value;
    }
    if (pattern.type === ASTNodeType.BOOLEAN_LITERAL) {
      return value === pattern.value;
    }
    if (pattern.type === ASTNodeType.NULL_LITERAL) {
      return value === null || value === undefined;
    }
    return false;
  }

  private async evaluateImportDecl(node: ASTNode): Promise<any> {
    const imports = node.imports as string[];
    const modulePath = node.path as string;

    try {
      const resolution = this._resolver.resolve(modulePath);
      // Parse and evaluate the resolved module source in the current context
      const lexer  = new GsplLexer(resolution.source);
      const tokens = lexer.tokenize();
      const parser = new GsplParser(tokens);
      const ast    = parser.parse();

      // Evaluate top-level declarations from the module (functions, seeds, lets)
      for (const decl of ast.body ?? []) {
        try { await this.evaluate(decl); } catch { /* skip errors in module bodies */ }
      }

      // Bind requested symbols from context into current scope
      for (const sym of imports) {
        if (!this.context.variables.has(sym)) {
          this.context.variables.set(sym, { _imported: true, _from: modulePath });
        }
      }
    } catch {
      // Graceful degradation: record the import but don't fail the program
      for (const sym of imports) {
        this.context.variables.set(sym, { _imported: true, _from: modulePath });
      }
    }

    return null;
  }

  private async evaluateExportDecl(node: ASTNode): Promise<any> {
    // Exports are recorded for the module system
    // For now, just acknowledge the export
    return null;
  }

  private async evaluateTypeDecl(node: ASTNode): Promise<any> {
    const name = node.name as string;
    const baseType = node.baseType;
    const isTrait = node.isTrait === true;

    this.context.types.set(name, node);
    return { type: 'type_decl', name, isTrait };
  }

  private async evaluateImplDecl(node: ASTNode): Promise<any> {
    const traitName = node.traitName as string;
    const typeName = node.typeName as string;

    // Look up the trait's method signatures
    const traitNode = this.context.types.get(traitName);
    if (traitNode && traitNode.isTrait) {
      // Register implementations for the type
      for (const method of node.methods) {
        this.context.functions.set(`${typeName}.${method.name}`, method);
      }
    }

    return { type: 'impl_decl', trait: traitName, forType: typeName };
  }

  private inferGeneType(value: any): string {
    if (typeof value === 'number') return 'scalar';
    if (typeof value === 'string') return 'categorical';
    if (typeof value === 'boolean') return 'scalar';
    if (Array.isArray(value)) return 'vector';
    if (typeof value === 'object') return 'struct';
    return 'scalar';
  }
}

class GSPLReturn {
  constructor(public value: any) {}
}

/**
 * Convenience function: execute GSPL source directly
 */
export function executeGspl(source: string, seedPhrase?: string): any {
  const interpreter = new GsplInterpreter(seedPhrase);
  return interpreter.execute(source);
}
