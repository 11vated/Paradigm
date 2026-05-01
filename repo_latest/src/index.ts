export { Kernel, Xoshiro256SS, FIM, TickSystem, Effects, GeneOperators } from './kernel';
export { UniversalSeed, GeneType } from './seeds';
export { Lexer, Parser, Interpreter, GSPLRuntimeError, TypeChecker, ASTNode, Program, Token, TokenType } from './gspl';
export { GeneticAlgorithm, MAPElites, CMAES, FunctorRegistry, GameFunctor, MusicFunctor, ArtFunctor, StorytellingFunctor } from './evolution';
export { GSPLAgent, WorldModel } from './intelligence';
export { Level4Intelligence } from './intelligence/level4';
export { BaseEngine, EngineRegistry, createAllEngines } from './engines';
// removed some extra types since they are not explicitly exported by the folder index
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