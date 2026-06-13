# GSPL v2 Specification (Paradigm Infinite v1.1.0)

**Status**: Draft for v1.1.0. Supersedes GSPL v1 in `docs/GSPL_LANGUAGE_REFERENCE.md`.

## Core Changes from v1
- New advanced generative operators: `reflect`, `narrate`, `evolve` (enhanced).
- Domain-specific schemas via `domain` declarations and `$schema` in artifacts.
- Formal mutation grammar and seed syntax.
- Runtime support for self-reflection and narrative generation (deterministic via seeded RNG).

## Syntax
```
seed <Name> {
  gene <name>: <type> [in <constraints>]
  ...
}

grow <seed-expr> [with <seed>]
breed <seedA>, <seedB>
mutate <seed> [, rate]
compose <seed> , "<targetDomain>"
evolve <seed> [using <algo>] [for <gens>]
reflect <seed-expr>
narrate <seed-expr> [, "<style>"]
```

## New Operators (v2)
- **reflect <target>**: Returns a reflection object with strata, genes, hash, timestamp. Used for self-inspection and meta-evolution.
- **narrate <target> [, "<style>"]**: Generates a deterministic natural-language description in the given style (descriptive, poetic, technical, etc.). Output is reproducible for the same seed + style.
- **evolve** (enhanced): Supports `using map-elites | cma-es | poet`, full fitness from QualityContract.

## Domain Schemas (v1.1 extension)
Seeds/artifacts declare `$schema: "<domain>/v1.1"`.
- ui: { html, css, js, components, theme }
- game: { dimensions, level, enemies, strata }
- audio: { bpm, notes, duration, wav }
- simulation: { particles, steps, rules, initialState }

The seed compiler (extended in interpreter + make/grow) validates against schema for the domain.

## Runtime Behavior
- All operators are pure w.r.t. the seeded RNG in context.
- Reflection and narration feed back into seeds for recursive composition (e.g., narrate a seed then use the text as gene in another domain).
- Federation: GSPL sources and reflections can be offered as seeds; signatures cover the canonical form.

## Mutation Grammar
Mutations are controlled by rate (0-1) and only affect genes within declared constraints. Evolve uses the QualityContract RATE for fitness.

See interpreter for evaluateReflect / evaluateNarrate implementations (deterministic).

## Example (v2)
```
seed MyUI {
  gene hue: scalar in [0, 360]
}

let ui = grow MyUI with { hue: 210 }
let desc = narrate ui, "poetic"
let reflected = reflect ui
evolve ui using map-elites for 20
```

GSPL v2 enables richer agent-orchestrated creation while preserving absolute determinism and sovereignty.
