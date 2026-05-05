export interface FIMConfig {
  foldProbability: number;
  invariantRules: InvariantRule[];
  maxIterations: number;
}

export interface InvariantRule {
  name: string;
  validate: (state: FoldState) => boolean;
  repair: (state: FoldState) => FoldState;
}

export interface FoldState {
  id: string;
  timestamp: number;
  generation: number;
  parentIds: string[];
  data: Record<string, unknown>;
  invariants: Map<string, boolean>;
}

export class FIM {
  private config: FIMConfig;
  private stateHistory: FoldState[] = [];
  private generation: number = 0;

  constructor(config: Partial<FIMConfig> = {}) {
    this.config = {
      foldProbability: config.foldProbability ?? 0.1,
      invariantRules: config.invariantRules ?? this.getDefaultRules(),
      maxIterations: config.maxIterations ?? 100
    };
  }

  private getDefaultRules(): InvariantRule[] {
    return [
      {
        name: 'unique_id',
        validate: (state) => state.id.length > 0,
        repair: (state) => ({ ...state, id: crypto.randomUUID() })
      },
      {
        name: 'valid_timestamp',
        validate: (state) => state.timestamp > 0,
        repair: (state) => ({ ...state, timestamp: Date.now() })
      },
      {
        name: 'valid_generation',
        validate: (state) => state.generation >= 0,
        repair: (state) => ({ ...state, generation: this.generation })
      }
    ];
  }

  shouldFold(rng: { nextFloat: () => number }): boolean {
    return rng.nextFloat() < this.config.foldProbability;
  }

  createInitialState(data: Record<string, unknown> = {}): FoldState {
    const state: FoldState = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      generation: 0,
      parentIds: [],
      data: { ...data },
      invariants: new Map()
    };
    this.stateHistory.push(state);
    return state;
  }

  fold(parentState: FoldState, childData: Record<string, unknown>, rng: { nextFloat: () => number }): FoldState | null {
    if (!this.shouldFold(rng)) {
      return null;
    }

    let foldedState: FoldState = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      generation: parentState.generation + 1,
      parentIds: [parentState.id],
      data: { ...parentState.data, ...childData },
      invariants: new Map()
    };

    foldedState = this.enforceInvariants(foldedState);
    this.generation = foldedState.generation;
    this.stateHistory.push(foldedState);

    return foldedState;
  }

  merge(parentStates: FoldState[], rng: { nextFloat: () => number }): FoldState | null {
    if (parentStates.length < 2 || !this.shouldFold(rng)) {
      return null;
    }

    const mergedData: Record<string, unknown> = {};
    for (const parent of parentStates) {
      Object.assign(mergedData, parent.data);
    }

    const mergedState: FoldState = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      generation: Math.max(...parentStates.map(p => p.generation)) + 1,
      parentIds: parentStates.map(p => p.id),
      data: mergedData,
      invariants: new Map()
    };

    const result = this.enforceInvariants(mergedState);
    this.generation = result.generation;
    this.stateHistory.push(result);

    return result;
  }

  private enforceInvariants(state: FoldState): FoldState {
    let currentState = state;
    let iterations = 0;

    while (iterations < this.config.maxIterations) {
      let modified = false;
      const invariantResults = new Map<string, boolean>();

      for (const rule of this.config.invariantRules) {
        const isValid = rule.validate(currentState);
        invariantResults.set(rule.name, isValid);

        if (!isValid) {
          currentState = rule.repair(currentState);
          modified = true;
        }
      }

      currentState.invariants = invariantResults;

      if (!modified) break;
      iterations++;
    }

    return currentState;
  }

  validateState(state: FoldState): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    for (const rule of this.config.invariantRules) {
      if (!rule.validate(state)) {
        violations.push(rule.name);
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  getStateHistory(): FoldState[] {
    return [...this.stateHistory];
  }

  getGeneration(): number {
    return this.generation;
  }

  pruneHistory(maxStates: number = 1000): void {
    if (this.stateHistory.length > maxStates) {
      this.stateHistory = this.stateHistory.slice(-maxStates);
    }
  }
}
