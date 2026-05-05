export { Kernel, Xoshiro256SS, FIM, TickSystem, Effects, GeneOperators, EffectType, GeneOperator, Genome, Gene, GeneValue, EffectConfig } from './kernel';
export { UniversalSeed, GeneType, GeneSchema, GeneMetadata, GENE_TYPE_DEFINITIONS, getGeneTypeDefinition, getAllGeneTypes, getGeneTypeNames, SeedMetadata, SeedExpression, SeedDerivation, SerializedSeed } from './seeds';
export { Lexer, Parser, Interpreter, GSPLRuntimeError, TypeChecker, GSPLType, TypeInfo, TypeError, ASTNode, Program, Token, TokenType } from './gspl';
export { GeneticAlgorithm, MAPElites, CMAES, FunctorRegistry, GameFunctor, MusicFunctor, ArtFunctor, StorytellingFunctor, GeneticConfig, MAPElitesConfig, CMAESConfig } from './evolution';
export { GSPLAgent, WorldModel, AgentConfig, AgentMessage, AgentContext, Concept, Relationship } from './intelligence';
export { Level4Intelligence, Level4Config, AgentThought, SelfModel, MultiAgentNetwork, AgentMessage } from './intelligence/level4';
export { BaseEngine, EngineConfig, EngineResult, ShaderEngine, ParticleEngine, VehicleEngine, FashionEngine, NarrativeEngine, UIEngine, PhysicsEngine, AccessibilityEngine, VoiceEngine, FontEngine, MotionEngine, EngineRegistry, createAllEngines, ShaderCode, ParticleSystem, VehicleConfig, FashionDesign, Narrative, UIComponent, PhysicsWorld, AccessibilityReport, VoiceConfig, FontDesign, AnimationGraph } from './engines';
export { ParadigmStudio } from './studio/App';

export class ParadigmPlatform {
  private kernel: import('./kernel').Kernel;
  private engines: import('./engines').EngineRegistry;
  private agent: import('./intelligence').GSPLAgent;
  private worldModel: import('./intelligence').WorldModel;

  constructor(config?: { seed?: number; tickRate?: number }) {
    this.kernel = new (require('./kernel').Kernel)(config);
    this.engines = new (require('./engines').EngineRegistry)();
    this.agent = new (require('./intelligence').GSPLAgent)();
    this.worldModel = new (require('./intelligence').WorldModel)();
  }

  async initialize(): Promise<void> {
    this.kernel.initialize();
    
    const engineFactories = require('./engines');
    const engines = engineFactories.createAllEngines();
    for (const engine of engines) {
      await engine.initialize();
      this.engines.register(engine.getName(), engine);
    }
  }

  getKernel() {
    return this.kernel;
  }

  getAgent() {
    return this.agent;
  }

  getWorldModel() {
    return this.worldModel;
  }

  getEngines() {
    return this.engines;
  }

  shutdown(): void {
    this.kernel.shutdown();
  }
}

export const VERSION = '1.0.0';
export const GENE_COUNT = 17;
export const ENGINE_COUNT = 26;