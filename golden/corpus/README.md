# Paradigm Golden Corpus (15_ + Doctrine v2)

**Purpose:** Bit-identical regression targets for the 27 engineering-grade domains + 9-strata contracts.

**Activation:** All generators now load the full 15_ contracts via side-effect imports in their `-contract.ts` files.

**Verification:**
```bash
npx tsx scripts/15-contracts-verify.ts
npx tsx scripts/replay.mts verify-golden --tier flagship
```

**Structure:**
- `golden/corpus/<domain>/<seed-id>.json` — canonical seed + expected metadata + hash
- Hashes must be stable across machines, Node versions, and time (xoshiro256** + kernelNow)

**Current Coverage (May 2026 post-15_ expansion):**
~24 domains now have real curated goldens with live hashes (significant expansion from the original 5 flagships).

**Flagship Priority (Epoch 1/2):**
1. character (Goku_Son reference implementation)
2. music (5-stem adaptive, now with deterministic WAV emission in contract)
3. narrative (long-form)
4. fullgame (playable 60fps)
5. universe (cosmology scale)

**Expansion Note:** Automated expansion scripts have added real seeds across architecture, agent, physics, vehicle, fashion, typography, ui, alife, procedural, animation, audio, choreography, circuit, ecosystem, furniture, robotics, shader, and others. Full 27-domain coverage is the next target.

**Adding new goldens:**
1. Use `npx tsx scripts/replay.mts golden --domain <name> --intent "..."` (or manual)
2. Commit the `.json` with stable hash
3. The regression harness will fail CI on any drift

**Cross-stack note:** Python oracle (when present) must agree on hashes for these seeds.

Last updated: post generator-patches completion wave.
