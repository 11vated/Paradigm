# Paradigm GSPL Platform

**Version**: 1.0.0  
**Vision**: A Genetic Operating System where every digital artifact is a "seed" that can be bred, mutated, evolved, and composed.

## Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Architecture

The Platform consists of 7 layers:

```
┌─────────────────────────────────────────────────────┐
│ Layer 7: Studio (React + WebGL + WebRTC)            │
├─────────────────────────────────────────────────────┤
│ Layer 6: Intelligence (GSPL Agent + World Model)    │
├─────────────────────────────────────────────────────┤
│ Layer 5: Evolution (GA + MAP-Elites + CMA-ES)       │
├─────────────────────────────────────────────────────┤
│ Layer 4: Engines (26 Domain Pipelines)             │
├─────────────────────────────────────────────────────┤
│ Layer 3: GSPL (Lexer → Parser → Typing → VM)        │
├─────────────────────────────────────────────────────┤
│ Layer 2: Seeds (UniversalSeed + 17 Gene Types)    │
├─────────────────────────────────────────────────────┤
│ Layer 1: Kernel (xoshiro256** + FIM + Tick)       │
└─────────────────────────────────────────────────────┘
```

---

## Quick Start

```typescript
import { ParadigmPlatform, UniversalSeed, GeneType } from '@paradigm/gspl-platform';

const platform = new ParadigmPlatform({ seed: Date.now() });
await platform.initialize();

const seed = new UniversalSeed();
seed.setGene(GeneType.COLOR, [1, 0, 0]);
seed.setGene(GeneType.SHAPE, 'circle');

const agent = platform.getAgent();
const response = await agent.process('breed this seed with something similar');

console.log(response);
```

---

## Layer Details

### Layer 1: Kernel

- **xoshiro256**: Fast deterministic RNG with 256-bit state
- **FIM**: Fold-Invariant Model for state consistency
- **Tick System**: Game loop with metrics
- **Effects**: 8 genetic operators (mutation, crossover, selection, etc.)
- **Gene Operators**: 4 operators (blend, interpolate, compose, transform)

### Layer 2: Seeds

17 gene types:
- structure, color, shape, motion, audio, texture, pattern, behavior, interaction, physics, material, lighting, environment, animation, logic, data, meta

### Layer 3: GSPL

- **Lexer**: Full tokenizer with 50+ token types
- **Parser**: Recursive descent AST parser
- **Type Checker**: Static type analysis
- **Interpreter**: Runtime with 30+ built-in functions

### Layer 4: Engines

11 implemented domain engines:
- shader, particle, vehicle, fashion, narrative, ui, physics, accessibility, voice, fonts, motion

### Layer 5: Evolution

- **Genetic Algorithm**: Classic GA with tournament selection
- **MAP-Elites**: Quality diversity algorithm
- **CMA-ES**: Covariance Matrix Adaptation
- **Functors**: Domain-specific encoders/decoders

### Layer 6: Intelligence

- **GSPL Agent**: Conversational agent with tool use
- **World Model**: Semantic graph of concepts

### Layer 7: Studio

- **React Frontend**: Full UI with gene editor, breeding, agent chat, canvas
- **Gene Editor**: Visual editor for all 17 gene types
- **Breeding Station**: Visual breeding and evolution controls
- **GSPL Agent Chat**: Natural language interface

---

## API Reference

### Seeds

```typescript
import { UniversalSeed, GeneType, GeneTypeDefinitions } from '../seeds';

const seed = new UniversalSeed({
  metadata: {
    id: 'seed-001',
    name: 'My Seed',
    created: Date.now()
  }
});

// Access gene types
seed.setGene(GeneType.COLOR, [1, 0, 0]);
seed.setGene(GeneType.SHAPE, 'circle');
seed.setGene(GeneType.MOTION, { velocity: 1 });

// Mutate and breed
const mutated = seed.mutate(Math.random, 0.1);
const child = seed.cross(otherSeed, Math.random);
```

### GSPL

```typescript
import { Lexer, Parser, Interpreter } from '../gspl';

const code = `
  let mySeed = seed("demo", { color: "#ff0000" });
  let mutated = mutate(mySeed, 0.1);
  print(mutated);
`;

const lexer = new Lexer(code);
const parser = new Parser(lexer);
const program = parser.parse();

const interpreter = new Interpreter();
const result = interpreter.execute(program);
```

### Evolution

```typescript
import { GeneticAlgorithm, MAPElites, CMAES } from '../evolution';

const ga = new GeneticAlgorithm({
  populationSize: 100,
  generationLimit: 100,
  mutationRate: 0.1,
  crossoverRate: 0.7
});

const result = await ga.evolve(population, fitnessFn);
```

### Engines

```typescript
import { createAllEngines } from '../engines';

const engines = createAllEngines();
for (const engine of engines) {
  await engine.initialize();
  const result = await engine.process(seed);
}
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests and code
4. Submit a PR

---

## License

MIT