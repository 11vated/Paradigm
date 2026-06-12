# Paradigm Truthful Infinite Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize and polish the current Paradigm Studio creation loop so seed creation produces named, visible, deterministic artifacts with GSPL/provenance context and passing focused verification.

**Architecture:** Keep deterministic source-of-truth logic in seed, friend, agent, and kernel paths. Let the Studio render real generated state and honest verification status rather than ornamental placeholders. Fix tests to match intentional current capability only where the code has genuinely evolved beyond stale expectations.

**Tech Stack:** TypeScript, React 19, Express, Vitest, Vite, Playwright/Browser QA, GSPL kernel, deterministic xoshiro256** RNG.

---

### Task 1: Preserve Human Names In Creation Paths

**Files:**
- Modify: `src/lib/friend/genesis.ts`
- Modify: `src/lib/agent/index.ts`
- Test: `tests/friend/from-agent.test.ts`
- Test: `tests/agent/agent-v2.test.ts`

- [ ] Inspect failing tests for exact expected naming behavior.
- [ ] Preserve explicit `options.name` values exactly in Friend seed creation.
- [ ] Ensure agent create-seed tool uses the requested display name when one is supplied.
- [ ] Run `npm test -- tests/friend/from-agent.test.ts tests/agent/agent-v2.test.ts --run`.

### Task 2: Repair Agent Visible Responses

**Files:**
- Modify: `src/lib/agent/index.ts`
- Inspect: `src/components/studio/*`
- Test: `tests/agent/agent-v2.test.ts`

- [ ] Trace why agent turns render blank responses after simple prompts.
- [ ] Return a concise response for create/grow requests containing name, domain, seed/hash, and next deterministic actions.
- [ ] Keep deterministic behavior intact.
- [ ] Run focused agent tests.

### Task 3: Reconcile Inverse Pipeline Tests With Current Capability

**Files:**
- Inspect: `src/lib/kernel/inverse-pipeline.ts`
- Modify: `tests/inverse-pipeline.test.ts` or compatibility metadata in the source

- [ ] Confirm whether 27 modalities/outputs are the intended current capability.
- [ ] If intended, update stale tests to assert 27 and verify legacy minimums remain supported.
- [ ] Run `npm test -- tests/inverse-pipeline.test.ts --run`.

### Task 4: Fix Preflight Failure Without Hiding It

**Files:**
- Inspect: `scripts/preflight-report.ts`
- Inspect: relevant perf budget scripts/modules

- [ ] Run `npx tsx scripts/preflight-report.ts` and capture the exact failing budget.
- [ ] Fix the underlying budget calculation or stale expectation.
- [ ] Do not turn failing gates green by suppressing failures.
- [ ] Rerun preflight.

### Task 5: Polish Studio First Creation Flow

**Files:**
- Modify: `src/pages/StudioPage.tsx`
- Modify: nearby `src/components/studio/*` only as needed
- Inspect: `src/styles` and `src/App.css`

- [ ] Make selected prompt or typed intent produce visible named seed state.
- [ ] Show current artifact name instead of raw ID-only state.
- [ ] Add GSPL/source/provenance/quality panels or visibly activate existing ones.
- [ ] Fix layout polish issues visible in the screenshots: blank agent response, weak seed status, and untrustworthy contract count display.
- [ ] Preserve responsive constraints.

### Task 6: Verify End To End

**Commands:**
- `npm run typecheck`
- `npm run determinism:check`
- `npm test -- tests/friend/from-agent.test.ts tests/agent/agent-v2.test.ts tests/inverse-pipeline.test.ts --run`
- `npx tsx scripts/preflight-report.ts`
- `npm run build`

- [ ] Start the dev server.
- [ ] Run browser/user-level smoke testing on `http://localhost:3000`.
- [ ] Capture desktop and mobile screenshots.
- [ ] Confirm no relevant console errors, no blank app shell, and interaction state changes after creating a seed.
