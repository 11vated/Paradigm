# Paradigm Absolute — Flagship Reference

This is the user-facing and integration-facing reference for the polish-to-flagship
sweep completed in June 2026. It documents what the studio *feels* like to use and
what the agent *does* — not the kernel mechanics (see `Documents/Paradigm-Analysis/13_*`
and `STATUS_MASTER.md` for the latter).

> **Doctrine governance:** all decisions subordinated to `13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md` + `13b_Phase_Gates.md`. This document is execution context.

---

## The Eight Center Modes

Every mode is collapsible, has a `ModePurposeHeader`, and surfaces the dominant
strata of the active seed in the radar.

| # | Mode | Purpose | Dominant Strata |
|---|------|---------|-----------------|
| 1 | **Crucible** | Compose a new seed from a prompt; the canonical "grow" surface. Shows etymology of the name it generated. | All 9 |
| 2 | Atelier | (in Crucible by default) | visual2d + music |
| 3 | Anatomy | Inspect the 17 genes of the active seed; mutate surgically. | character + narrative |
| 4 | Resonance | Compare 2–4 seeds on the 9-strata radar; pick breeding parents. | relational + aesthetic |
| 5 | Lineage | Tree of mutations, crossovers, gifts. | genealogical |
| 6 | Codex | Live GSPL editor: parse, execute, AST, mutation history. | meta — the substrate *speaks* |
| 7 | Topology | Topology viewer for the seed graph. | structural |
| 8 | Evolution | MAP-Elites 16×16 grid; watch the substrate explore. | emergence |

Two additional modes (`Substrate`, `Sovereignty`) sit outside the 8-compass dial
and are still in the mode switcher.

---

## The Agent

The agent is not a chatbot wrapper. It is the **Sovereign Agent** running a 7-stage
pipeline (canonical "6-stage" with stage 0 = live context priming and stage 6 =
archive):

```
Stage 0  prime memory with live context (optional)
Stage 1  parse(raw) → ParsedIntent        (LLM-light)
Stage 2  resolve(intent) → ResolvedIntent (sub-agents)
Stage 3  plan(resolved) → ConstructionPlan (LLM-optional)
Stage 4  assemble(plan) → AssembledOutput (PURE)
Stage 5  validate(assembled) → ValidatedSeed (PURE)
Stage 6  archive(validated)               (memory write)
```

Every agent turn in the conversation surfaces a `pipeline 0·1·2·3·4·5·6` chip
plus the inference tier (`fast` / `standard` / `deep`) and latency.

### 3-Tier Selector
- **fast** — quick replies, no model change (default for routine prompts)
- **standard** — balanced
- **deep** — full reasoning, slower (used for nuclear-grade plans)

Selection persists per thread via `agentThreads.selectedTier` and is passed to
`/api/agent/stream` and `/api/agent/query`.

### Agent Lenses (in the AgentPanel)
The 4 lenses let you focus the conversation:
- **Conversation** — natural text
- **Plan** — the construction plan card
- **Source** — the GSPL block the agent emitted (the kernel's own language)
- **Tools** — recent ops log
- **Memory** — semantic/working/episodic/world memory snapshot

---

## SeedNamer

`src/lib/naming/seed-namer.ts` is the single source of truth for seed names.

| Tier | Source | Determinism | Latency |
|------|--------|-------------|---------|
| 0 | Hash-style fallback for empty intent | ✅ bit-stable | 0 |
| 1 | Deterministic PoS-pairing via mulberry32( domain::intent ) | ✅ bit-stable | <1ms |
| 2 | LLM via `/api/agent/name` | best-effort, falls through to Tier 1 on fail | ~1.5s |

The 11 domain vocabularies (character, world, music, visual2d, molecule,
cosmology, website, fullgame, narrative, quantum, default) live in
`src/lib/naming/vocab/*.json`.

`deriveCleanTitle` (in `src/lib/kernel/types.ts`) now delegates to `nameSeedSync()`,
so every existing call site — TopBar, LeftRail, CollapsedLeftRail, TopBar handle,
etymology tooltip, library cards, etc. — instantly inherits Tier-1 naming.

`activeSeed` carries `etymology`, `slug`, and `nameTier` per seed.

---

## StrataRadar

`src/components/studio/StrataRadar.tsx`. 9-axis SVG radar over a 3×3 grid
background. Visualises the 9 Paradigm stratums:

1. visual2d
2. character
3. narrative
4. music
5. mechanics
6. agentic
7. relational
8. aesthetic
9. meta

Hover a vertex to see the score; click to see the underlying strata.

Mounted in:
- `LeftRail.tsx` (active seed pin)
- `ModePurposeHeader.tsx` (every center mode)

---

## StatusBar

`src/ui/chrome/StatusBar.tsx` replaces the cryptic `AmbientStrip` (which used
`w 0 · e 0 · s 95 · W 0` single letters).

Surfaces (with full-word labels):
- **kernel** — tick · last op · determinism
- **agent** — tier · inference · latency
- **memory** — working · episodic · semantic · world
- **substrate** — live · contracts green · seeds
- **sovereignty** — link out to `/sovereignty`

Polling cadences:
- memory counts: 8s
- substrate health: 12s
- last op: 6s
- heartbeat: 2s

All cancellable on unmount. Uses `kernelNowIso` for time math (no wall-clock
leaks across the determinism boundary).

---

## Determinism Contract (still in force)

1. Inside `src/lib/{kernel,evolution,seeds,friend,world,game}` — never call `Math.random`, `crypto.random*`, `performance.now`, or read wall-clock directly. ESLint enforces this.
2. Need a timestamp? Use `kernelNow()` / `kernelNowIso()` from `src/lib/kernel/clock`.
3. Need entropy? Derive a stable hash from inputs and feed it to `Xoshiro256StarStar`.
4. New generator? Write a Quality Contract.

---

## Verification (always run before commit)

```bash
npx tsc --noEmit                  # 0 errors
npm run determinism:check         # 0 hard violations
npm run quality:contract          # 13/13 contracts green
npm run golden:verify             # flagship tier hashes match
npm run build                     # vite build (clean)
npx playwright test tests/e2e/flagship.spec.ts   # 9 E2E tests
```

---

## Web Routes

`/studio` · `/friend` · `/world` · `/quest` · `/play` · `/play/:friend/:world` · `/lineage/:id` · `/photorealistic-renderer` · `/sovereignty`

---

*Last updated: June 2026. The flagship polish wave is complete; the agent speaks GSPL, seeds are named, the radar is live, and the status bar is readable.*
