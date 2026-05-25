# `src/lib/engines/` — The Nine Substrate Engines

> Phase 0 scaffolding for the doctrinal substrate layer.
> See `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md` Part III.

## Why this directory exists

The live repo has 282 generators in `src/lib/kernel/generators/`. They cover 27 fully-wired domains and 100+ scaffolded domains. The flat generator tree is the right shape for the V1–V3 era; it is the wrong shape for the multi-trillion endgame.

The doctrine collapses the 282 generators into **9 substrate engines**:

| Engine | Owns | Composes with | Migrates from |
| ---- | ---- | ---- | ---- |
| `form` | Geometry, mesh, topology, surface, volume, sprite, typography | matter | `character.ts`, `vehicle.ts`, `building.ts`, `furniture.ts`, `architecture-3d.ts`, `sprite.ts`, `typography*.ts`, `procedural-3d.ts`, `mesh.ts`, `topology.ts` … |
| `motion` | Kinematics, dynamics, integrators, constraints, particles | form, field | `physics.ts`, `dynamics.ts`, `kinematics.ts`, `particle.ts`, `fluid.ts`, `cloth.ts`, `softbody.ts` … |
| `sound` | Synthesis, DSP, mixing, spatialization | motion | `acoustics.ts`, `music.ts`, `dsp.ts`, `synthesis.ts`, audio renderers |
| `world` | Terrain, atmosphere, weather, ecosystem, biome, time-of-day | form, motion, matter | `procedural.ts`, `ecosystem*.ts`, `biome.ts`, `weather.ts`, `terrain.ts`, `universe.ts`, `geology.ts`, `hydrology.ts` |
| `mind` | Agents, behavior trees, decision, dialogue, learning | story, play | `alife*.ts`, `behavior.ts`, `agent.ts`, dialogue/NPC generators |
| `play` | Game loops, mechanics, balance, progression, win-conditions | mind, story | `game*.ts`, `fullgame-electron.ts`, `quest.ts`, `mechanic.ts` |
| `story` | Narrative, scene, arc, dialogue structure | mind, play | `narrative.ts`, `story.ts`, `myth.ts`, `lore.ts`, `scene.ts` |
| `matter` | Chemistry, biology, materials, molecules, drugs, alloys | form, field | `chemistry.ts`, `molecule.ts`, `protein.ts`, `material.ts`, `biology.ts`, `genome.ts`, `pharma.ts` |
| `field` | EM / quantum / gauge / gravity, the **Unseen Renderer** | motion, matter | `electromagnetic.ts`, `quantum*.ts`, `gravity.ts`, `plasma.ts`, `cosmology.ts`, `qft.ts` |

## Phase 0 status

This directory is **scaffolding only**. The contracts (`Engine`, `EngineCapability`, `EngineContext`) are defined. The 9 engine module surfaces exist. **No production code path imports from here yet.**

Production paths continue to use `src/lib/kernel/generators/` and `src/lib/kernel/engine-dispatcher.ts`. Migration is staged per the doctrine.

## Phase 1+ migration rules

Per the always-on canonical-rename rule:

1. When migrating a generator into an engine, **delete the source file in the same PR** that lands the engine adapter. No `-v2`, `-engine`, `-new` siblings.
2. Engine modules **must** route all non-determinism through `kernel/clock.ts` + `Xoshiro256StarStar`. The determinism lint (`bun run scripts/lint-determinism.ts`) covers this directory under the same boundary as `src/lib/kernel/`.
3. Quality contracts (`src/lib/kernel/quality-contracts/*`) become engine-level invariants. Every engine MUST implement `validate(output)`.
4. The dispatcher in `src/lib/kernel/engine-dispatcher.ts` gains an `engine://` capability lookup before the legacy `generator://` lookup; engine wins.
5. The frontend Studio remains domain-oriented; domains become recipes that compose engines.

## Composition model

A domain is `(genome, recipe)` where `recipe` is an ordered DAG of engine calls.

Example — `world.character` domain:

```
form    (genome.body)        → BodyMesh
form    (genome.face)        → FaceMesh
form.skeleton(BodyMesh)      → Skeleton
form.skinning(BodyMesh, Skeleton) → SkinnedMesh
motion.animation(Skeleton, genome.gait) → AnimationClips
sound.voice(genome.voice)    → VoiceSet
mind.persona(genome.psyche)  → Persona
emit(SkinnedMesh + Animations + Voice + Persona) → CharacterArtifact
```

Same nine engines compose every domain in the substrate. That is the point.
