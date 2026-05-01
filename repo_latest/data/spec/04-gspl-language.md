# 04 — The GSPL Language

GSPL (Genetic Seed Programming Language) is the domain-specific language used to declare, breed, mutate, compose, and evolve seeds. This spec defines the language at a level sufficient for an implementer to build a complete front-end (lexer, parser, type checker, optimizer, interpreter, and WGSL code generator).

## Design Goals

1. **Seeds are first-class.** `seed`, `breed`, `mutate`, `compose`, `evolve` are keywords, not functions.
2. **Deterministic by construction.** No operator in the language can introduce non-determinism. `random` is always explicitly seeded.
3. **Type-safe genes.** The type checker refuses to compile a program that reads a gene at the wrong type.
4. **Composition is as easy as piping.** `seedA |> compose |> character_to_sprite |> evolve(50)`.
5. **GPU escape hatch.** Any pure function over numeric genes can be annotated `@gpu` and compiled to WGSL.

## Lexical Structure

### File

A GSPL source file has extension `.gspl`, is encoded in UTF-8, and consists of a sequence of top-level declarations.

### Comments

```gspl
// line comment to end of line
/* block comment, nestable */
```

### Identifiers

```
identifier  = [a-zA-Z_][a-zA-Z0-9_]*
gene_name   = [a-z][a-zA-Z0-9_]*        // stricter than identifiers; genes may not start with $ or _
type_name   = [A-Z][a-zA-Z0-9_]*
```

### Keywords (26 reserved words)

```
seed       breed      mutate     compose    evolve
grow       export     import     let        fn
if         else       match      for        while
return     true       false      null       type
trait      impl       where      gene       domain
signed
```

Keywords may not be used as identifiers.

### Literals

```
int       = [0-9]+                          (internally i64)
float     = [0-9]+\.[0-9]+([eE][+-]?[0-9]+)?   (internally f64)
string    = "..." with \" \\ \n \t \uXXXX escapes
boolean   = true | false
null      = null
vector    = [ e1, e2, ..., eN ]
struct    = { field1: e1, field2: e2, ... }
```

### Operators

```
arithmetic : + - * / % **
comparison : == != < <= > >=
logical    : && || !
bitwise    : & | ^ ~ << >>
assignment : =
pipe       : |>
range      : .. ..=
access     : . [] ?.
arrow      : ->
```

### Tokens to count

| Category | Count |
|---|---|
| Keywords | 26 |
| Operators | ~30 |
| Literal types | 6 |
| AST node types | 25+ |

## Top-Level Declarations

### `seed` — declare a primordial seed

```gspl
seed "Iron Warrior" in character {
  size:      1.75
  archetype: "warrior"
  strength:  0.82
  agility:   0.54
  palette:   [0.2, 0.15, 0.1]
  silhouette: topology.from_primitives([
    capsule(radius: 0.3, height: 1.6),
    sphere(radius: 0.22, at: [0, 1.7, 0])
  ])
}
```

Compiles to a `UniversalSeed` value with `$domain = "character"`, `$lineage.operation = "primordial"`. The compiler inserts type annotations on each gene based on the inferred value type (1.75 → `scalar`, `"warrior"` → `categorical`, etc.) and validates against the domain's declared gene schema.

### `fn` — declare a function

```gspl
fn perturb_palette(s: Seed<character>, amount: f64) -> Seed<character> {
  let new_palette = s.genes.palette + random.vector(3) * amount
  return s with { palette: new_palette }
}
```

Functions are pure by default. Any function that performs an effect must declare it:

```gspl
fn log_and_return(s: Seed) -> Seed effects Log {
  log("returning seed {}", s.$hash)
  return s
}
```

### `type` — declare a custom type

```gspl
type Warrior = Seed<character> where {
  archetype == "warrior",
  strength >= 0.5
}
```

Types can carry *refinement predicates* (Hindley–Milner base, liquid-types refinements). The type checker discharges simple predicates via symbolic evaluation and the rest at runtime.

### `trait` / `impl` — interfaces

```gspl
trait Fightable {
  fn attack_power(self) -> f64
}

impl Fightable for Seed<character> {
  fn attack_power(self) -> f64 {
    return self.genes.strength * 2.0 + self.genes.agility * 0.5
  }
}
```

### `domain` — register a custom domain

```gspl
domain fashion {
  genes {
    silhouette: topology
    palette:    vector<3>
    fabric:     categorical<"silk" | "cotton" | "leather" | "metal">
    drape:      field
  }
  stages = [measure, pattern, simulate, render, export]
}
```

### `import` / `export`

```gspl
import { warrior_archetype } from "./archetypes.gspl"
export { perturb_palette, Warrior }
```

## Seed Operations

### `breed`

```gspl
let child = breed(parent_a, parent_b)
```

Requires both parents to be in the same domain or connected by a functor bridge. The returned seed has `$lineage.operation = "breed"`, `parents = [a.$hash, b.$hash]`.

### `mutate`

```gspl
let variant = mutate(original, rate: 0.1)
let targeted = mutate(original, rate: 0.3, genes: ["color", "size"])
```

The second form targets a specific subset of genes.

### `compose`

```gspl
let sprite_of_character = compose(my_character, to: "sprite")
let game_from_trio      = compose([music_seed, char_seed, world_seed], into: "fullgame")
```

The first form auto-selects a registered functor bridge from source to target. The second form performs multi-seed composition into a target domain.

### `evolve`

```gspl
let best = evolve {
  population: seeds,
  algorithm:  MAP_ELITES,
  generations: 200,
  fitness:    refine,
  axes: ["novelty", "coherence"]
}
```

Returns the elite set from the evolution run. `algorithm` may be one of `GA | MAP_ELITES | CMA_ES | NOVELTY | AURORA | DQD | POET`.

### `grow`

```gspl
let artifact = grow(my_seed, engine: sprite)
```

Runs the seed through the named engine's developmental pipeline and returns the resulting artifact.

### `signed` — require a sovereignty signature

```gspl
signed let my_warrior = seed "Iron Warrior" in character { ... }
```

The compiler emits a signing call using the current user's key (supplied via the `SIGN` effect handler) and refuses to export unsigned seeds when a `signed` qualifier is in scope.

## Pipe Operator

```gspl
let result = raw_seed
  |> mutate(rate: 0.1)
  |> compose(to: "sprite")
  |> grow(engine: sprite)
  |> export(format: "png")
```

`a |> f` is sugar for `f(a)`. `a |> f(b, c)` is sugar for `f(a, b, c)`. It is left-associative.

## Type System

GSPL uses **Hindley–Milner type inference** with three extensions:

1. **Dependent types over seeds.** `Seed<character>`, `Seed<music>`, `Seed<fullgame>` are distinct types. The domain parameter is dependent on the seed value.
2. **Refinement predicates.** `where { strength >= 0.5 }` attaches a predicate the checker tries to discharge statically.
3. **Effect polymorphism.** Functions annotate the effects they perform; effect variables propagate through generics.

### Gene-access type checking

Reading a gene returns a value of its declared type. The type checker knows the gene schema of every registered domain and refuses to compile a mismatch:

```gspl
let s: Seed<character> = ...
let size: f64 = s.genes.size          // ok, size is declared scalar
let size: vec3 = s.genes.size         // TYPE ERROR: scalar is not vec3
let legs: i32 = s.genes.legs          // TYPE ERROR: character has no gene 'legs'
```

This catches ~80% of gene-handling bugs at compile time and is one of the language's biggest wins over calling the seed library from plain TypeScript.

## The `@gpu` Annotation

```gspl
@gpu
fn fitness_geometric(s: Seed<character>) -> f64 {
  let field = s.genes.silhouette.to_sdf()
  let samples = field.sample_grid(32, 32, 32)
  return 1.0 - samples.variance()
}
```

Functions marked `@gpu` are compiled to WGSL compute shaders by the kernel's code generator. They must:

- Be pure (no effects).
- Use only numeric genes or types reducible to numeric genes.
- Have bounded loops (no unbounded recursion).
- Avoid dynamic dispatch.

The compiler emits a WGSL kernel and a host-side binding layout; the runtime chooses CPU or GPU execution based on population size.

## Example Program

```gspl
import { refine } from "std/quality"

// Declare a primordial character seed
signed let hero = seed "Iron Warrior" in character {
  size:      1.75
  archetype: "warrior"
  strength:  0.82
  agility:   0.54
  palette:   [0.2, 0.15, 0.1]
}

// Evolve 200 variants toward higher quality + diversity
let elite = evolve {
  population:  [hero] * 50 |> map(s => mutate(s, rate: 0.15)),
  algorithm:   MAP_ELITES,
  generations: 200,
  fitness:     refine,
  axes:        ["novelty", "coherence"]
}

// Compose the best into a sprite and a game
let sprite_form = compose(elite.best, to: "sprite")
let playable    = compose([elite.best, elite.second], into: "fullgame")

// Export
sprite_form |> grow(engine: sprite)   |> export(format: "png")
playable    |> grow(engine: fullgame) |> export(format: "html5")
```

## Grammar

The full EBNF grammar is in [`../language/grammar.ebnf`](../language/grammar.ebnf). The keyword list is in [`../language/keywords.md`](../language/keywords.md). The standard library is in [`../language/stdlib.md`](../language/stdlib.md).

## Compiler Pipeline

```
source text
  ↓  Lexer         (40+ token kinds)
tokens
  ↓  Parser        (recursive descent, 25+ AST node types)
AST
  ↓  Name resolution
AST + symbol tables
  ↓  Type checker  (HM + dependent + refinement + effects)
typed AST
  ↓  Optimizer     (constant folding, dead code, inlining)
optimized AST
  ├─ Interpreter   → runtime seed operations
  └─ WGSL codegen  → GPU compute kernels for @gpu functions
```

Every stage must be incremental (the LSP needs fast re-type-checking) and produces structured diagnostics with source spans.
