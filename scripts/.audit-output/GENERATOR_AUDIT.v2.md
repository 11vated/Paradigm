# Generator Audit v2 — 2026-05-21

> **Correction from v1:** `*-contract.ts` files are quality-contract registrations, not stubs. Kept.

## Summary

| Metric | Value |
|---|---:|
| Total generator files | 319 |
| Wired (actively used by dispatchers) | 122 |
| Contract registrations | 123 |
| Utilities | 12 |
| Orphaned versions | 62 |
| → Keep as-is | 230 |
| → Rename canonical (`-vN` → `<family>`) | **27** |
| → Delete orphan | **19** |
| → Manual review | 43 |
| Entropy violators (non-contract) | 1 |
| Wired without quality-contract import | 122 |

## Wired families

| Family | Wired version | Effective LOC | Has contract? | Has inverse? | Entropy | Notes |
|---|---|---:|:--:|:--:|:--:|---|
| `3d-printing` | `3d-printing` | 115 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `5g` | `5g` | 71 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `6g` | `6g` | 45 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `acoustics` | `acoustics` | 54 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `advertising` | `advertising` | 46 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `aerospace` | `aerospace` | 98 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `agent` | `agent-v3` | 165 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `agriculture` | `agriculture` | 118 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `agtech` | `agtech` | 45 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `alife` | `alife-v3` | 142 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `animation` | `animation-v3` | 165 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `ar` | `ar` | 46 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `architecture` | `architecture-v3` | 155 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `art` | `art` | 61 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `audio` | `audio-v3` | 137 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `automotive` | `automotive` | 84 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `av` | `av` | 37 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `battery` | `battery` | 36 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `beer` | `beer` | 46 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `biomedical` | `biomedical` | 45 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `biotechnology` | `biotechnology` | 37 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `blockchain` | `blockchain` | 108 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `character` | `character-v3` | 389 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `chemical` | `chemical` | 76 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `choreography` | `choreography-v3` | 192 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `circuit` | `circuit-v3` | 163 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `city` | `city` | 131 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `climate` | `climate` | 105 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `cloud` | `cloud` | 46 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `coffee` | `coffee` | 47 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `consciousness` | `consciousness` | 114 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `cosmetics` | `cosmetics` | 52 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `cybersecurity` | `cybersecurity` | 36 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `dance` | `dance` | 36 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `data-science` | `data-science` | 37 | ❌ | ❌ | 0 |  |
| `devops` | `devops` | 48 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `drone-delivery` | `drone-delivery` | 45 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `drones` | `drones` | 46 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `drug` | `drug` | 117 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `ecosystem` | `ecosystem-v3` | 145 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `edtech` | `edtech` | 53 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `education` | `education` | 92 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `electronics` | `electronics` | 47 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `energy` | `energy` | 79 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `event-planning` | `event-planning` | 39 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `fashion` | `fashion-v3` | 156 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `film` | `film` | 39 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `finance` | `finance` | 104 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `fitness` | `fitness` | 39 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `food` | `food-v3` | 152 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `food-delivery` | `food-delivery` | 45 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `fullgame` | `fullgame-v3` | 108 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `furniture` | `furniture-v3` | 120 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `game` | `game-v3` | 126 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `gaming` | `gaming` | 57 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `gardening` | `gardening` | 45 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `genome` | `genome` | 86 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `genomics` | `genomics` | 36 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `geometry3d` | `geometry3d-v4` | 663 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `healthcare` | `healthcare` | 97 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `hospitality` | `hospitality` | 45 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `insurance` | `insurance` | 68 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `interior-design` | `interior-design` | 62 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `jewelry` | `jewelry` | 48 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `journalism` | `journalism` | 36 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `landscaping` | `landscaping` | 61 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `legal` | `legal` | 77 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `lighting` | `lighting` | 53 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `literature` | `literature` | 36 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `logistics` | `logistics` | 100 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `marine` | `marine` | 80 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `market` | `market` | 216 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `marketing` | `marketing` | 37 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `material` | `material` | 116 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `media` | `media` | 106 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `meta-domain` | `meta-domain` | 161 | ❌ | ❌ | 0 |  |
| `metaverse` | `metaverse` | 45 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `ml` | `ml` | 37 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `music` | `music-v3` | 379 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `nanobot` | `nanobot` | 110 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `nanotechnology` | `nanotechnology` | 45 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `narrative` | `narrative-v3` | 208 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `neuroscience` | `neuroscience` | 50 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `optics` | `optics` | 45 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `particle` | `particle-v3` | 162 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `personalized-medicine` | `personalized-medicine` | 36 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `pet-care` | `pet-care` | 39 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `photography` | `photography` | 62 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `physics` | `physics-v3` | 122 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `procedural` | `procedural-v3` | 179 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `protein` | `protein` | 99 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `publishing` | `publishing` | 46 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `quantum-circuit` | `quantum-circuit` | 108 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `quantum-computing` | `quantum-computing` | 36 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `reactor` | `reactor` | 128 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `real-estate` | `real-estate` | 99 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `renewable-energy` | `renewable-energy` | 45 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `robotics` | `robotics-v3` | 154 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `robotics-industrial` | `robotics-industrial` | 47 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `security` | `security` | 90 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `semiconductors` | `semiconductors` | 46 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `sensors` | `sensors` | 46 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `shader` | `shader-v3` | 179 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `smart-grid` | `smart-grid` | 45 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `smart-home` | `smart-home` | 45 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `space` | `space` | 105 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `space-tourism` | `space-tourism` | 36 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `spirits` | `spirits` | 46 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `sports` | `sports` | 64 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `sprite` | `sprite-v3` | 426 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `synthetic-biology` | `synthetic-biology` | 37 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `tea` | `tea` | 47 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `textiles` | `textiles` | 47 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `theater` | `theater` | 36 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `tourism` | `tourism` | 71 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `transportation` | `transportation` | 101 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `typography` | `typography-v3` | 137 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `ui` | `ui-v3` | 121 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `universe` | `universe` | 95 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `vehicle` | `vehicle-v3` | 108 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `visual2d` | `visual2d-v3` | 335 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `vr` | `vr` | 46 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `wearables` | `wearables` | 47 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |
| `wine` | `wine` | 47 | ❌ | ❌ | 0 | wired but no quality-contract import; wired but no inverse fn |

## Deletion plan (orphans with zero src refs)

**Count:** 19

```
aerospace-defense.ts
character-gpu.ts
character-v4.ts
character.ts
construction.ts
entertainment.ts
food-service.ts
geometry3d-v3.ts
manufacturing.ts
music-enhanced.ts
music-gpu.ts
music-v4.ts
music.ts
narrative-enhanced.ts
retail.ts
sprite-gpu.ts
sprite.ts
telecommunications.ts
visual2d-svg.ts
```

## Rename plan (canonical promotion)

**Count:** 27

| From | To |
|---|---|
| `agent-v3.ts` | `agent.ts` |
| `alife-v3.ts` | `alife.ts` |
| `animation-v3.ts` | `animation.ts` |
| `architecture-v3.ts` | `architecture.ts` |
| `audio-v3.ts` | `audio.ts` |
| `character-v3.ts` | `character.ts` |
| `choreography-v3.ts` | `choreography.ts` |
| `circuit-v3.ts` | `circuit.ts` |
| `ecosystem-v3.ts` | `ecosystem.ts` |
| `fashion-v3.ts` | `fashion.ts` |
| `food-v3.ts` | `food.ts` |
| `fullgame-v3.ts` | `fullgame.ts` |
| `furniture-v3.ts` | `furniture.ts` |
| `game-v3.ts` | `game.ts` |
| `geometry3d-v4.ts` | `geometry3d.ts` |
| `music-v3.ts` | `music.ts` |
| `narrative-v3.ts` | `narrative.ts` |
| `particle-v3.ts` | `particle.ts` |
| `physics-v3.ts` | `physics.ts` |
| `procedural-v3.ts` | `procedural.ts` |
| `robotics-v3.ts` | `robotics.ts` |
| `shader-v3.ts` | `shader.ts` |
| `sprite-v3.ts` | `sprite.ts` |
| `typography-v3.ts` | `typography.ts` |
| `ui-v3.ts` | `ui.ts` |
| `vehicle-v3.ts` | `vehicle.ts` |
| `visual2d-v3.ts` | `visual2d.ts` |

## Review queue (orphans still referenced)

**Count:** 43

| File | refs in src | refs in generators | Notes |
|---|---:|---:|---|
| `agent.ts` | 5 | 0 | still referenced by 5 non-generator files, 0 generators |
| `alife-worker.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `alife.ts` | 1 | 2 | still referenced by 1 non-generator files, 2 generators |
| `animation-enhanced.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `animation.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |
| `architecture-3d.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `architecture.ts` | 1 | 2 | still referenced by 1 non-generator files, 2 generators |
| `audio.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |
| `character-v2.ts` | 0 | 4 | still referenced by 0 non-generator files, 4 generators |
| `choreography.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |
| `circuit.ts` | 1 | 3 | still referenced by 1 non-generator files, 3 generators |
| `ecosystem-worker.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `ecosystem.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |
| `fashion-3d.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `fashion.ts` | 1 | 2 | still referenced by 1 non-generator files, 2 generators |
| `food-3d.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `food.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |
| `fullgame.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `furniture-3d.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `furniture.ts` | 1 | 2 | still referenced by 1 non-generator files, 2 generators |
| `game-v2.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |
| `game.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators; entropy violations: 1 |
| `geometry3d.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `music-v2.ts` | 1 | 4 | still referenced by 1 non-generator files, 4 generators |
| `narrative.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `particle-gpu.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `particle.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |
| `physics-enhanced.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `physics.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |
| `procedural-3d.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `procedural.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |
| `robotics-3d.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `robotics.ts` | 1 | 2 | still referenced by 1 non-generator files, 2 generators |
| `shader-enhanced.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `shader.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |
| `sprite-animated.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `sprite-v2.ts` | 0 | 4 | still referenced by 0 non-generator files, 4 generators |
| `typography-enhanced.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `typography.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |
| `ui.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |
| `vehicle-3d.ts` | 1 | 0 | still referenced by 1 non-generator files, 0 generators |
| `vehicle.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |
| `visual2d-v2.ts` | 1 | 1 | still referenced by 1 non-generator files, 1 generators |

