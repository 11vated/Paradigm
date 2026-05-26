# Paradigm Dual Agent Architecture

## Overview

Paradigm implements **two complementary agent systems** for full-spectrum seed generation:

1. **GSPL Agent** (`src/lib/agent/`) — Kernel-first, deterministic, Tier-based inference
2. **Sovereign Agent** (`src/lib/intelligence/agent/`) — LLM-enhanced, semantic reasoning, advanced composition

## GSPL Agent (`src/lib/agent/`)

**Purpose:** Deterministic, reproducible seed generation with optional model enhancement.

**Architecture:**
- Tier 0: Pure kernel (GSPL operations, no models required)
- Tier 1: Fast local inference (llama.cpp via `LLAMA_SERVER_URL`)
- Tier 2: Mid-tier local inference (optional optimized model)
- Tier 3: Gemini (optional cloud enhancement, graceful fallback)

**Components:**
- `index.ts` — Main agent class with query parsing, planning, execution
- `reasoning.ts` — Query decomposition into atomic kernel operations
- `tools.ts` — 9 kernel tools (seed manipulation, composition, evolution)
- `memory.ts` — Sliding-window conversation context
- `inference.js` — Multi-tier model routing
- `sub-agents/Orchestrator.ts` — Pipeline orchestration (6 stages: intent → code → growth → validation → evolution → signing)
- `sub-agents/{Vision,Style,Researcher,...}` — 9 domain specialists for artifact analysis

**Server Integration:**
- Wired via `POST /api/agents/generate-seed` (line 2961 in server.ts)
- Integrated with `pipelineOrchestrator` instance (line 105)
- Supports refinement via `POST /api/agents/refine`

**Strengths:**
- Zero external AI dependency (Tier 0 works standalone)
- Deterministic by default
- Compositional (cross-domain seed breeding)
- Sovereignty-aware (signs outputs with key material)

---

## Sovereign Agent (`src/lib/intelligence/agent/`)

**Purpose:** Advanced LLM-driven reasoning with live context, memory, and multi-agent collaboration.

**Architecture (6-Stage Pipeline):**

```
User Prompt
  → Stage 0: Live Context (session state, exemplars, world state)
  → Stage 1: Intent Resolution (LLM parsing → IntentEnvelope)
  → Stage 2: Resolve (Sub-agents: Vision, Style, Researcher, Physics, Personality, Narrative, MusicTheory, Mechanics, Critique)
  → Stage 3: Plan (LLM-optional construction planning)
  → Stage 4: Assemble (PURE kernel, no models)
  → Stage 5: Validate (Critic verification, confidence threshold 0.7+)
  → Stage 6: Archive (Memory + Signature)
  ↓
Validated Seed + Artifact
```

**Components:**
- `orchestrator.ts` — SovereignAgent class with full pipeline
- `stages/{stage-0 through stage-6}` — Modular pipeline stages
- `sub-agents/{base, critique, mechanics, music-theory, narrative, personality, physics, researcher, style, vision}` — Domain-specific reasoning
- `types.ts` — Intent, Resolved, Plan, Validated types
- `memory/` — 4-layer working/episodic/semantic/canon memory system

**Memory System (4-Layer):**
1. **Working Memory** — Current session state, immediate context
2. **Episodic Memory** — Recent seed generation history, RAG corpus
3. **Semantic Memory** — Concepts, relationships, embeddings
4. **Canon Memory** — Read-only 1,000 canonical seeds (ground truth)

**Server Integration:**
- Currently NOT wired to `/api/agents/*` routes
- Available via public API: `SovereignAgent.run(utterance, opts)`
- Ready for `/api/agents/advanced-generate` endpoint (P3.2b)

**Strengths:**
- Rich semantic understanding via LLM
- Multi-agent collaboration (9 sub-agents with specialized reasoning)
- Memory-integrated (exemplar-driven generation)
- Feedback loop (self-critique, iterative refinement up to 3 attempts)
- Reality-OS aware (dimensional signatures for 7D substrate)

---

## Integration Strategy

### Current State (Post-P3.1 Audit)
- ✅ GSPL Agent is live and serving `/api/agents/generate-seed`
- ✅ Sovereign Agent is complete but not wired to API
- ✅ Both use shared kernel (same grow, compose, validate)
- ✅ Memory system is shared infrastructure

### P3.2b: Wire Sovereign Agent (Next Step)
Add new endpoint:
```typescript
POST /api/agents/advanced-generate
{
  description: string,
  domain?: string,
  memory?: MemoryOrchestrator,
  feedbackLoop?: { enabled: boolean; maxIterations?: 3 }
}
→ { seed, artifact, validated, reality, timings }
```

This allows users to choose:
- **Fast path:** GSPL Agent (deterministic, instant, no models)
- **Premium path:** Sovereign Agent (rich reasoning, exemplar-driven, iterative refinement)

### Inverse Pipeline
Both agents share the inverse pipeline (`src/lib/intelligence/inverse/`):
- 6 inverters (text, image, audio, narrative, persona, seed-graph)
- Fidelity computation per domain
- Gradient descent through seed space

---

## Trust Boundaries & Determinism

| Component | Deterministic | Notes |
|-----------|---|---|
| Tier 0 (kernel) | ✅ Yes | No models, pure functional |
| Tier 1-3 (models) | ❌ No | Models are stochastic, but reproducible within seed hash |
| Memory reads | ✅ Yes | Exemplar lookup is deterministic |
| LLM calls | ❌ No | Temperature/sampling varies; use seed-keyed RNG for reproducible variety |
| Growth phase | ✅ Yes | `growSeed` is pure; output deterministic given seed |
| Validation | ✅ Yes | Oracle scoring is deterministic per artifact structure |

---

## Testing Strategy (P3.3-3.5)

### Memory Integration (P3.3)
- [ ] Verify memory ops in live pipeline
- [ ] Test exemplar recall + ranking
- [ ] Verify episodic storage works across requests
- [ ] Canonical memory read-only constraint

### Validation Gate (P3.4)
- [ ] Test Validator sub-agent confidence scoring
- [ ] Verify 0.7+ threshold enforcement
- [ ] Test feedback loop (up to 3 refine iterations)
- [ ] Ensure refinement improves score

### Inverse Pipeline (P3.5)
- [ ] Test each of 6 inverters independently
- [ ] Measure fidelity (target ≥0.8 for simple domains)
- [ ] Verify determinism (same artifact → same seed hash)

---

## File Locations (Quick Reference)

```
GSPL Agent
├─ src/lib/agent/index.ts                    Main class
├─ src/lib/agent/sub-agents/Orchestrator.ts  Pipeline
├─ src/lib/agent/sub-agents/{Vision,...}     Domain specialists
└─ server.ts:2961                            API wiring

Sovereign Agent
├─ src/lib/intelligence/agent/orchestrator.ts Main class
├─ src/lib/intelligence/agent/stages/        6-stage pipeline
├─ src/lib/intelligence/agent/sub-agents/    9 domain specialists
└─ src/lib/intelligence/memory/              4-layer memory
  
Shared
├─ src/lib/kernel/engines.ts                 27 generators
├─ src/lib/intelligence/inverse/             6 inverters
└─ src/lib/intelligence/memory/              Memory system
```

---

## Decision: Keep Both

**Rationale:** 
- GSPL Agent satisfies "deterministic, no model dependency"
- Sovereign Agent satisfies "advanced LLM reasoning, exemplar-driven"
- Both route through same kernel → consistent artifacts
- Users benefit from choice (determinism vs. richness)
- Aligns with 5T vision: "full true GSPL vision 100% all across the board"

---

*Architecture documented: 2026-05-26 · Phase 3.2a complete*
