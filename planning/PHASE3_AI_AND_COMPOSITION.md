# PHASE 3: AI & COMPOSITION
## Weeks 10-12 — Full-Capacity Agent, 1,000 Seeds, Inverse Pipeline

**Objective:** Full-capacity TypeScript agent (description → seed). 1,000 canonical seeds in Commons. Inverse pipeline (artifact → seed).

---

## DAY 37-44: Agent Pipeline (P3.1)

### Directory Structure

```
src/intelligence/
├── agent.ts                    # Main GSPLAgent class
├── types.ts                    # All interfaces
├── stages/
│   ├── stage-0-live-context.ts
│   ├── stage-1-intent-resolution.ts
│   ├── stage-2-code-generation.ts
│   ├── stage-3-deterministic-growth.ts
│   ├── stage-4-validation.ts
│   ├── stage-5-evolution-composition.ts
│   └── stage-6-archive-sign.ts
├── sub-agents/
│   ├── IntentOracle.ts
│   ├── Researcher.ts
│   ├── CodeSmith.ts
│   ├── Validator.ts
│   ├── Evolver.ts
│   ├── Composer.ts
│   ├── MemoryArchivist.ts
│   └── SovereignSigner.ts
├── memory/
│   ├── MemorySystem.ts
│   ├── WorkingMemory.ts
│   ├── ExemplarMemory.ts
│   ├── EpisodicMemory.ts
│   └── SubstrateMemory.ts
├── tools/
│   ├── WebSearchTool.ts
│   ├── BrowsePageTool.ts
│   ├── CodeExecutionTool.ts
│   ├── SeedInventoryQuery.ts
│   ├── EvolutionRunTool.ts
│   ├── FetchDataTool.ts
│   ├── MultimodalAnalyze.ts
│   └── SelfFineTuneTrigger.ts
└── llm/
    ├── LLMClient.ts
    ├── GeminiProvider.ts
    ├── ClaudeProvider.ts
    └── LocalProvider.ts
```

### Stage Flow

```
User prompt
  → Stage 0: LiveContext → gather session context
  → Stage 1: IntentOracle → parse description to IntentEnvelope
  → Stage 2: CodeSmith → generate GSPL code
  → Stage 3: DeterministicGrowth → run GSPL → artifact
  → Stage 4: Validator → verify artifact matches description
    → If fail: refine (iterate stages 2-4, max 3 attempts)
  → Stage 5: Evolver/Composer → optional refinement
  → Stage 6: ArchiveSign → sign + store
  → Return: UniversalSeed + artifact
```

### API Endpoints

```
POST /api/agents/generate-seed  { description, domain?, constraints? }
  → { seed, artifact, confidence, alternatives }

POST /api/agents/refine  { seedHash, feedback }
  → { refinedSeed, confidence }

GET /api/agents/memory/exemplars
  → { exemplars: SeedRef[] }

POST /api/agents/memory/record  { seed, description, rating }
  → { stored: true }
```

---

## DAY 41-44: 4-Layer Memory (P3.2)

### Memory Architecture

```typescript
class MemorySystem {
  working: WorkingMemory      // Current session, Map<string, any>
  exemplar: ExemplarMemory    // Past successes, vector similarity
  episodic: EpisodicMemory    // Session history, circular buffer
  substrate: SubstrateMemory  // Commons seeds (read-only)
  
  async recall(query: string, limit: number): Promise<MemoryResult[]>
  async store(item: MemoryItem): Promise<void>
}
```

---

## DAY 40-42: Verification Gate (P3.3)

### Verification Logic

```typescript
async function verifySeedMatch(
  seed: UniversalSeed,
  description: string,
  llm: LLMClient
): Promise<{ valid: boolean; confidence: number; issues: string[] }> {
  // 1. Grow artifact deterministically
  const artifact = await growSeed(seed)
  
  // 2. Extract metadata from artifact
  const metadata = extractArtifactMetadata(artifact)
  
  // 3. Compare with original description via LLM
  const prompt = `Original description: "${description}"
  Generated artifact metadata: ${JSON.stringify(metadata)}
  Does this match? Respond JSON: { confidence: 0-1, issues: [] }`
  
  const response = await llm.generate(prompt)
  const result = JSON.parse(response)
  
  // Threshold: 0.7 minimum confidence
  return {
    valid: result.confidence >= 0.7,
    confidence: result.confidence,
    issues: result.issues || []
  }
}
```

---

## DAY 43-45: Inverse Pipeline (P3.4)

```typescript
async function invertArtifact(
  artifact: Artifact,
  domain: string,
  rng: RNG,
  iterations: number = 100
): Promise<{ seed: UniversalSeed; fidelity: number }> {
  // Gradient descent through seed space
  let bestSeed = UniversalSeed.random(domain, rng)
  let bestFidelity = 0
  
  for (let i = 0; i < iterations; i++) {
    const candidate = mutate(bestSeed, 0.2 * (1 - i/iterations), rng)
    const candidateArtifact = await growSeed(candidate)
    const fidelity = computeFidelity(candidateArtifact, artifact)
    
    if (fidelity > bestFidelity) {
      bestFidelity = fidelity
      bestSeed = candidate
    }
  }
  
  return { seed: bestSeed, fidelity: bestFidelity }
}

function computeFidelity(a: Artifact, b: Artifact): number {
  // Domain-specific comparison
  // Images: SSIM or pixel comparison
  // Audio: spectral similarity
  // 3D: mesh topology similarity
  // Games: mechanic set overlap
  // Fallback: metadata cosine similarity
}
```

---

## DAY 40-50: Seed Commons (P3.5)

### 1,000 Seed Creation Strategy

| Phase | Seeds | Method | Time |
|-------|-------|--------|------|
| 1 | 50 | Hand-curated canonical seeds | 5 days |
| 2 | 500 | Agent batch generation (using 50 as exemplars) | 3 days CI |
| 3 | 450 | Agent generation from diverse descriptions | 2 days CI |
| 4 | Full verification | Determism + grow + signature checks | 2 days automated |
| 5 | Human review | 10% sample review (100 seeds) | 2 days |

### Storage Structure

```
data/commons/
├── index.json              # Master index (1,000 entries)
├── libraries/              # GSPL substrate libraries (17 files)
├── inventories/            # Seed inventory definitions (20 files)
├── seeds/
│   ├── character/          # 100 seeds
│   ├── music/              # 80 seeds
│   ├── sprite/             # 80 seeds
│   ├── visual2d/           # 60 seeds
│   ├── geometry3d/         # 60 seeds
│   ├── fullgame/           # 60 seeds
│   └── ...                 # Remaining domains
└── metadata/
    └── tags.json           # Tags, descriptions, author info
```

### Commons CI

```yaml
# .github/workflows/commons-ci.yml
name: Commons Validation
on: [push, schedule: '0 6 * * *']
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - run: node tests/commons/validation/grow.ts --all
      - run: node tests/commons/validation/determinism.ts --all
      - run: node tests/commons/validation/signature.ts --all
      - run: node tests/commons/validation/commons-lint.ts --all
```

---

## PHASE 3 COMPLETION CRITERIA

- [ ] 6-stage agent pipeline functional end-to-end
- [ ] 8 sub-agents implemented with correct trust boundaries
- [ ] 4-layer memory system working
- [ ] 8 tools available to Researcher sub-agent
- [ ] Verification gate: LLM confidence ≥0.7 threshold
- [ ] Inverse pipeline: artifact → seed with fidelity ≥0.8 (for simple domains)
- [ ] 1,000 canonical seeds in Commons
- [ ] Commons CI: all seeds pass determinism + grow + signature
- [ ] Agent API endpoints functional
- [ ] `npm run test` → 100% pass
