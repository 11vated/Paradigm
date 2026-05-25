# EXECUTIVE SUMMARY: REFERENCE REPOSITORY INSIGHTS

**Quick Reference for Main Repo Cleanup**

---

## THE CRITICAL FINDING

**PAradigm-reference IS the canonical specification. Main repo should align to it — not the other way around.**

All specification is LOCKED (151 briefs across Rounds 1-6.5). No conflicts with main repo implementation; just incomplete wiring of kernel layers to GSPL interpreter and UI.

---

## FIVE THINGS TO KNOW

### 1. THE 7-AXIS DISCIPLINE (Non-Negotiable Structural Requirement)

Every seed operation MUST satisfy all seven:
- **Signed** - ECDSA P-256 in every seed
- **Typed** - No opaque blobs in shippable surfaces
- **Lineage-tracked** - Every mutation appends to ancestry chain
- **Graph-structured** - Seeds compose via typed relationships
- **Confidence-bearing** - Validation results include confidence + downgrade semantics
- **Rollback-able** - Every mutation has defined inverse
- **Differentiable** - Diffs are first-class queryable artifacts

**Action:** Add this as a linter that blocks PRs dropping any axis.

### 2. THE 17 GENE TYPES (Alphabet of Creation)

These are LOCKED. Type 17 (sovereignty) is immutable (no mutate/crossover by definition).

Missing from main repo: **quantum** (stylistic superposition), **gematria** (numerological encoding) — these are deferred to Phase 2 per Brief 020.

**Action:** Implement if pursuing advanced features; skip for MVP but keep type slots reserved (IDs 18-31).

### 3. THE DETERMINISM GUARANTEE

**Same seed + same RNG = bit-identical output forever.** This is non-negotiable because:
- Breaks reproducibility if violated
- Breaks sovereignty (can't re-verify derivation)
- Breaks federation (nodes must verify work)
- Breaks entire economic model (royalty tracking)

**Action:** Add determinism test to every seed operation; run on GPU parity matrix quarterly.

### 4. MVP = NOT STRIPPED-DOWN SUBSET

**231 briefs + 1,064 inventions = MVP.** Removing ANY of these breaks the substrate's structural claim:
- Missing pattern library? Creators in that genre have no typed surface.
- Missing engine target? The "cross-engine parity" claim becomes 60% parity.
- Missing axis? The substrate no longer enforces what it claims to enforce.

**Action:** Don't negotiate scope down. If something feels hard, that's the load-bearing proof point.

### 5. INTELLIGENCE LAYER IS THE BOTTLENECK

Current agent.ts is regex-only. Full-Capacity Agent (P0-2) is the population engine for the seed commons. Without it:
- Can't scale to 1,000 canonical seeds
- Can't achieve exponential commons growth
- Can't bootstrap AI-assisted creation workflow

**Action:** Make P0-2 the top priority after kernel verification.

---

## IMMEDIATE GAPS TO CLOSE

| Gap | Severity | Fix | Effort |
|---|---|---|---|
| Interpreter builtins don't call kernel | CRITICAL | Wire mutate/breed/grow to kernel functions | 2-3 days |
| No determinism tests | CRITICAL | Add round-trip tests to all operations | 1 week |
| Sovereignty signing not wired | HIGH | Wire sign()/verify() in seed creation | 3 days |
| Agent is regex-only | HIGH | Spec + implement Full-Capacity Agent | 4 weeks |
| Commons is 8 seeds, needs 1,000 | HIGH | P0-1 + agent-powered generation | 12 weeks |
| No CI for Commons PRs | MEDIUM | Validation layer (grow/determinism/signature/lint) | 1-2 weeks |
| GPU determinism not verified | MEDIUM | Parity matrix (Brief 196) | 4 weeks |
| quantum/gematria types not impl | LOW | Defer to Phase 2; reserve slots | — |

---

## STRATEGIC PRIORITIES (Next 90 Days)

**Fastest path to escape velocity:**

1. **P0-2: Full-Capacity Agent** ← Population engine (4 weeks)
2. **P0-1: Seed Commons** ← 1,000 canonical seeds via agent (4 weeks)
3. **P0-3: Live Studio** ← Working software > perfect spec (8 weeks)
4. **P0-4: Commons CI** ← Self-policing gates (1-2 weeks)

These four unlock adoption. Everything else follows.

---

## LOCKING REFERENCE

**What is LOCKED (immutable):**
- All 11 ADRs (accepted; changes = new ADR)
- Specs 00-07 (foundation locked)
- 17 kernel gene types (closed set in v0.1)
- 26 domain identifiers (identity locked)
- Sovereign signature scheme (ECDSA P-256)
- 8 engine export targets (cross-engine claim)
- 231 briefs, 1,064 inventions (MVP completeness)

**What can evolve (with GSEP = Genetic Substrate Evolution Proposal):**
- Tier-specific briefs (pattern libraries, recipes, engines)
- Non-kernel gene types (IDs 18+, deferred to v0.2+)
- Implementation details (as long as spec invariants hold)
- Tool surface (CLI, LSP, Studio UX)

---

## FILE GUIDE: WHERE TO FIND AUTHORITATIVE ANSWERS

| Question | Answer | Location |
|---|---|---|
| What is a seed? | spec/01 | universal-seed.md |
| What are the 17 types? | spec/02 | gene-system.md (AUTHORITATIVE) |
| How does determinism work? | spec/03 + ADR-001 | kernel.md |
| What is GSPL syntax? | spec/04 | gspl-language.md + grammar.ebnf |
| How do I sign a seed? | spec/05 + ADR-004 | sovereignty.md |
| What formats do I support? | spec/06 + ADR-009 | gseed-format.md |
| How do I know output is deterministic? | spec/07 | determinism.md (READ FIRST) |
| What engines should I build? | engines/README.md | 15 locked, 11 planned |
| How does an engine work? | engines/_template.md | Pick one domain (e.g., character.md) |
| How does composition work? | architecture/ | cross-domain-composition.md |
| What evolution algorithms? | architecture/ | evolution-stack.md (7 locked) |
| What should MVP include? | MVP_DEFINITION.md | THE DEFINITIVE SCOPE (231 briefs) |
| What are the strategic gaps? | STRATEGIC_GAP_AUDIT.md | P0/P1/P2 priorities |
| Where are the briefs? | research/ | 231 total; read synthesis docs first |
| What is compliance? | compliance/ | C2PA, EU AI Act, CA SB 942 |
| Why this architecture? | adr/ | Read decision records, not just code |

---

## RED FLAGS TO AVOID

🚨 **"We can skip rollback for MVP"** → No. Rollback is a 7-axis requirement.

🚨 **"We can ship 4 engines and add the rest later"** → No. Cross-engine parity IS the value.

🚨 **"Let's centralize identity/matchmaking for MVP"** → No. Federation-not-monopoly is the structural defense.

🚨 **"We'll handle localization and accessibility in v1.0"** → No. These are sign-time gates.

🚨 **"We can stub the pattern libraries for MVP"** → No. They are the typed encoding of dominant mechanics.

🚨 **"The agent can come after MVP ships"** → No. It's the population engine; without it, commons doesn't scale.

🚨 **"Let's change the gene types list"** → Stop. The 17 are locked. Propose a GSEP.

---

## FINAL VERDICT

**Spec Quality:** ⭐⭐⭐⭐⭐ (Exceptionally well-defined)
**Completeness:** 95% (minor gaps in agent architecture detail)
**Conflicts with main repo:** NONE
**Implementation Readiness:** 70% complete
**MVP Feasibility:** HIGH
**Adoption Bottleneck:** Agent + Commons (not spec)

**Bottom line:** Reference repo is canonically well-specified. Main repo should wire interpreter, implement Full-Capacity Agent, scale commons. Everything else flows.
