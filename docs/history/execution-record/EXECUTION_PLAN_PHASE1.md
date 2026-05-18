# PARADIGM ABSOLUTE: PHASE 1 EXECUTION PLAN
## Foundation Stabilization & Core Completion

**Status:** IN PROGRESS  
**Timeline:** Weeks 1-16 (parallel execution)  
**Target Completion:** All core systems wired and tested  

---

## TASK 1: GSPL Builtin Wiring to Kernel Operators

### Current State
- GSPL interpreter exists with placeholder kernel calls
- `callKernelMutate()`, `callKernelCrossover()`, `callKernelSelect()` are stubs
- Don't actually invoke the real Seed class methods

### Required Changes

**File:** `src/lib/kernel/gspl-interpreter.ts`

1. Import actual Seed class and operators:
```typescript
import { Seed } from './seed-class';  // Need to create this
import { GeneSystem } from './gene_system';
import { Xoshiro256StarStar } from './rng';
```

2. Wire mutate() to real operator:
```typescript
private callKernelMutate(seedObj: Seed, rate: number): Seed {
  const cloned = seedObj.clone();
  for (const [geneType, gene] of seedObj.genes.entries()) {
    const ops = GeneSystem.getOps(geneType);
    const mutated = ops.mutate(gene.value, rate, this.context.rng, gene.schema);
    cloned.setGene(geneType, mutated, gene.schema);
  }
  cloned.addDerivation('mutate', [seedObj.id], rate);
  return cloned;
}
```

3. Wire crossover() to real operator:
```typescript
private callKernelCrossover(parent1: Seed, parent2: Seed): Seed {
  if (parent1.$domain !== parent2.$domain) {
    throw new Error('Cannot breed seeds from different domains');
  }
  
  const child = new Seed(parent1.$domain);
  for (const [geneType, geneA] of parent1.genes.entries()) {
    const geneB = parent2.genes.get(geneType);
    if (!geneB) continue;
    
    const ops = GeneSystem.getOps(geneType);
    const childValue = ops.crossover(geneA.value, geneB.value, this.context.rng);
    child.setGene(geneType, childValue, geneA.schema);
  }
  child.addDerivation('breed', [parent1.id, parent2.id]);
  return child;
}
```

4. Wire evolve() to GA:
```typescript
private async callEvolve(args: any[]): Promise<any> {
  const [seeds, fitnessFn, config] = args;
  const ga = new GeneticAlgorithm(this.context.rng);
  return ga.evolve(seeds, fitnessFn, {
    populationSize: config?.populationSize ?? 50,
    generationLimit: config?.generationLimit ?? 100,
    mutationRate: config?.mutationRate ?? 0.15,
    tournamentSize: config?.tournamentSize ?? 5
  });
}
```

### Success Criteria
- [ ] GSPL breed/mutate/evolve work end-to-end
- [ ] Determinism verified (same seed → same output)
- [ ] Integration tests pass

---

## TASK 2: Create UniversalSeed Class

### Required File
**Create:** `src/lib/kernel/seed-class.ts`

### Core Interface
```typescript
export class Seed {
  id: string;  // UUID
  $name: string;
  $domain: string;
  $hash: string;  // SHA-256 of canonical form
  $lineage: {
    parents: string[];
    operators: string[];
    generation: number;
  };
  genes: Map<string, GeneValue>;  // GeneType → {value, schema}
  expression: SeedExpression;
  
  // Methods
  constructor(domain: string, name?: string);
  setGene(type: string, value: any, schema?: GeneSchema): void;
  getGene(type: string): GeneValue | undefined;
  mutate(rng: Xoshiro256StarStar, intensity: number): Seed;
  cross(other: Seed, rng: Xoshiro256StarStar): Seed;
  clone(): Seed;
  distance(other: Seed): number;
  computeHash(): string;  // Deterministic SHA-256
  toJSON(): SeedJSON;
  static fromJSON(data: SeedJSON): Seed;
}
```

### Implementation Strategy
- Store genes in Map<string, {value, schema, type}>
- Immutable operations (return new Seed)
- Lineage tracking (parent IDs + operator names)
- Content-addressed (hash = function of genes, not UUID)

### Success Criteria
- [ ] Seed class implements all methods
- [ ] Serialization/deserialization works
- [ ] Content hash is deterministic
- [ ] Lineage tracking is accurate

---

## TASK 3: Implement Quantum Gene Types

### QUANTUM Gene Type
```typescript
interface QuantumGene {
  states: Array<{value: any, amplitude: number}>;
  phase: number;
  entangled: string[];
}

// Operators
quantum_mutate(gene, rate, rng) {
  // Bloch sphere rotation
  const theta = rate * Math.PI;
  return rotateBloch(gene, theta);
}

quantum_crossover(a, b, rng) {
  // Superposition
  return {
    states: [...a.states, ...b.states],
    phase: (a.phase + b.phase) / 2,
    entangled: [...a.entangled, ...b.entangled]
  };
}

quantum_distance(a, b) {
  // Hilbert space distance
  const stateDistance = 1 - Math.abs(vectorDot(a.states, b.states));
  const phaseDistance = Math.abs(a.phase - b.phase) / (2 * Math.PI);
  return (stateDistance + phaseDistance) / 2;
}
```

### GEMATRIA Gene Type
```typescript
interface GematriaGene {
  text: string;  // Hebrew text
  value: number;  // Gematria value
  reduction: number;  // Digital root
}

// Operators
gematria_mutate(gene, rate, rng) {
  const newText = hebrewMutate(gene.text, rate, rng);
  return {
    text: newText,
    value: calculateGematria(newText),
    reduction: digitalRoot(calculateGematria(newText))
  };
}
```

### Success Criteria
- [ ] Both types implemented and validated
- [ ] Integrated into gene system
- [ ] Tests pass
- [ ] Operators are deterministic

---

## TASK 4: Complete Extended Domain Engines (28-103)

### Current Status
- 27 primary engines are scaffolded
- 166 generator files exist but may be stubs
- Need to audit and complete

### Implementation Process

1. **Audit Phase:**
   - Check each generator file in `src/lib/kernel/generators/`
   - Classify as: Complete, Partial, Stub
   - Create spreadsheet with status

2. **Implementation Tiers:**

   **Tier A (Critical):** 15 engines - must have MVP
   - Character, Sprite, Music, Visual2D, Game, Narrative
   - Shader, Particle, UI, Animation, Architecture, Vehicle
   - Fashion, Food, Choreography

   **Tier B (Extended):** 20 engines
   - Physics, Procedural, Fullgame, Robotics, Circuit
   - Alife, Furniture, Audio, Agent, Ecosystem
   - Composition (9 functors), Universe, Protein, Market, Consciousness

   **Tier C (Frontier):** 50+ engines
   - Quantum Circuit, Reactor, Nanobot, City, Climate
   - Material, Aerospace, Genome, Finance, Healthcare
   - Media (Film, Publishing, Advertising), Gastronomy, Fashion

3. **For Each Engine:**
   ```typescript
   // Template
   export async function generate${Domain}(
     seed: Seed,
     renderHints?: RenderHints
   ): Promise<${Domain}Artifact> {
     // 1. Extract genes
     const genes = extractGenesForDomain(seed);
     
     // 2. Procedurally generate
     const artifact = generateProcedurally(genes, seed.$hash);
     
     // 3. Export to standard format
     const exported = exportToFormat(artifact);
     
     // 4. Return with render hints
     return {
       type: seed.$domain,
       format: 'gltf' || 'png' || 'json',
       data: exported,
       renderHints: {
         scale: 1.0,
         position: [0, 0, 0],
         animation: { speed: 1.0, loop: true }
       }
     };
   }
   ```

### Success Criteria
- [ ] All 27 primary engines implemented
- [ ] 20 extended engines completed
- [ ] 50+ frontier engines scaffolded
- [ ] All output is deterministic
- [ ] All support content-addressed retrieval

---

## TASK 5: Cross-Domain Composition Functors

### Current State
- 9 functors exist
- Need to expand to 50+

### Functor Catalog

| Source | Target | Complexity | Status |
|--------|--------|-----------|--------|
| character | sprite | High | ✅ Done |
| character | music | High | ✅ Done |
| character | clothing | High | To Do |
| character | hairstyle | Medium | To Do |
| character | personality_profile | Low | To Do |
| music | animation | High | ✅ Done |
| music | visualization | High | To Do |
| music | game_level | Medium | To Do |
| game | movie | Very High | To Do |
| game | tutorial | Medium | To Do |
| narrative | game | High | ✅ Done |
| narrative | visual_novel | High | To Do |
| architecture | interior | High | To Do |
| architecture | city | Very High | To Do |
| vehicle | circuit | High | To Do |
| food | music | Medium | To Do |
| food | color_palette | Low | To Do |
| particle | shader | High | To Do |
| ecosystem | food_web | High | ✅ Done |
| alife | ecosystem | High | To Do |

### Functor Template
```typescript
export class ${Source}To${Target}Functor implements CompositionFunctor {
  name = '${source}_to_${target}';
  sourceType = '${source}';
  targetType = '${target}';
  
  extractFeatures(artifact: ${Source}Artifact): FeatureVector {
    // Domain-specific feature extraction
    return {
      // Key features that map to target domain
    };
  }
  
  synthesize(features: FeatureVector, rng: Xoshiro256StarStar): ${Target}Seed {
    // Generate target seed from features
    const seed = new Seed('${target}');
    seed.setGene('...', ...);
    return seed;
  }
  
  quality(source: ${Source}Artifact, target: ${Target}Artifact): number {
    // Score mapping quality 0-1
    return score;
  }
}
```

### Success Criteria
- [ ] 50+ functors implemented
- [ ] All preserve domain-specific semantics
- [ ] Quality metric is calibrated
- [ ] Bidirectional mappings tested

---

## TASK 6: Comprehensive Test Suite

### Test Structure (200+ tests)

**1. Unit Tests (kernel operations)**
```
src/lib/kernel/__tests__/
  ├── rng.test.ts (determinism, randomness)
  ├── gene-system.test.ts (all 17+ gene types)
  ├── seed-class.test.ts (creation, mutation, crossing)
  └── composition.test.ts (functor mapping)
```

**2. Integration Tests (end-to-end workflows)**
```
src/__tests__/
  ├── create-mutate-grow.test.ts
  ├── breed-evolve-select.test.ts
  ├── cross-domain-composition.test.ts
  └── gspl-end-to-end.test.ts
```

**3. Property-Based Tests (invariants)**
```
src/__tests__/properties/
  ├── determinism.property.ts
  ├── domain-preservation.property.ts
  ├── lineage-accuracy.property.ts
  └── genetic-validity.property.ts
```

**4. Performance Tests (benchmarks)**
```
src/__tests__/benchmarks/
  ├── seed-creation.bench.ts
  ├── ga-evolution.bench.ts
  └── composition.bench.ts
```

### Success Criteria
- [ ] 90%+ statement coverage
- [ ] All critical paths tested
- [ ] Determinism verified
- [ ] Performance budgets met

---

## EXECUTION ORDER

### Week 1-2: Core Wiring
- [ ] Create Seed class (20h)
- [ ] Wire GSPL builtins (15h)
- [ ] Basic unit tests (10h)

### Week 3-4: Gene System Enhancement
- [ ] Implement QUANTUM type (8h)
- [ ] Implement GEMATRIA type (8h)
- [ ] Add comprehensive tests (8h)

### Week 5-10: Domain Engines
- [ ] Audit all generators (10h)
- [ ] Complete Tier A (60h)
- [ ] Implement Tier B (40h)
- [ ] Scaffold Tier C (20h)

### Week 11-14: Composition Functors
- [ ] Implement 30 functors (80h)
- [ ] Implement 20 functors (40h)
- [ ] Quality calibration (16h)

### Week 15-16: Testing & Validation
- [ ] Write 200+ tests (60h)
- [ ] Integration testing (20h)
- [ ] Performance validation (10h)

---

## Success Criteria

### Kernel (Week 1-4)
- [ ] Seed class is complete and immutable
- [ ] GSPL builtins invoke kernel properly
- [ ] Determinism is verified
- [ ] Tests pass with 95%+ coverage

### Domain Engines (Week 5-10)
- [ ] All 27 primary engines working
- [ ] Generator output is deterministic
- [ ] All support standard formats
- [ ] Performance is acceptable

### Composition (Week 11-14)
- [ ] 50+ functors implemented
- [ ] Quality metrics calibrated
- [ ] Cross-domain mapping works
- [ ] Bidirectional mapping tested

### Testing (Week 15-16)
- [ ] 200+ tests written
- [ ] 90%+ coverage achieved
- [ ] All properties verified
- [ ] Performance benchmarks set

---

## Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Test Coverage | 90%+ | TBD |
| Determinism | 100% | TBD |
| Engine Count | 103+ | TBD |
| Functor Count | 50+ | TBD |
| Build Time | <60s | TBD |
| Mutation Speed | <10ms | TBD |
| Breed Speed | <10ms | TBD |
| GA 100gen | <30s | TBD |

