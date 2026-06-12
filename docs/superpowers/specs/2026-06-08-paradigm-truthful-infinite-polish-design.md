# Paradigm Truthful Infinite Polish Design

## Goal

Make the current Paradigm Studio feel like a real deterministic creation substrate by fixing broken user-visible flows, restoring trustworthy verification gates, and surfacing GSPL, names, provenance, and quality results as first-class product UI.

## Scope

This pass is intentionally focused on the highest-leverage broken surfaces:

- Seed names must be human-readable artifact names, not raw IDs.
- Explicit user-provided names must be preserved exactly where tests and user intent require it.
- The agent must return useful visible responses for seed creation instead of blank turns.
- Studio must expose generated seed state, GSPL/source, contract/strata status, and deterministic next actions.
- Verification must use live code truth: typecheck, deterministic boundary, focused tests, build, and browser-level smoke testing.

## Architecture

The pass keeps Paradigm kernel-first. Naming belongs in seed/friend/agent creation paths; Studio consumes generated artifact state instead of inventing display labels. GSPL is surfaced as the source representation of the current seed operation, while contract and provenance status remain truth-bound to existing health and quality systems.

## User Experience Target

The first screen should no longer feel idle after a user speaks a seed. The visible flow is:

1. User enters or selects an intent.
2. Paradigm creates a named deterministic seed.
3. The UI shows the artifact name, domain, seed hash, GSPL/source, quality/strata state, and next operations.
4. The agent explains what happened in human-readable terms.

## Non-Goals

This pass does not claim every domain generator is final-production quality. It does not fake all contracts green. It does not rewrite the entire kernel or replace the doctrine. It stabilizes the current product-critical loop honestly.

## Validation

The pass is complete only if the focused failing tests are fixed, the core gates pass, and a browser/user-level smoke run proves the Studio loads, accepts an intent, produces named visible state, and has no relevant console/runtime errors.
