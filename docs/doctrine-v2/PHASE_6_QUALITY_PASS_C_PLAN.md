# Doctrine v2 Phase 6: Quality Pass C (≥0.999)

**Status:** IN PROGRESS  
**Started:** 2026-06-18  
**Goal:** Raise quality threshold from 0.995 to 0.999 for all 13 flagship contracts

## Overview

Phase 6 builds on Phase 5 (Quality Pass B ≥0.995) by raising the quality bar to ≥0.999. This 0.4% improvement requires enhancing the quality metrics in the `rate()` function of each contract to more accurately assess artifact quality.

## Current State (Phase 5 Complete)

- **Threshold:** 0.995 (with 0.11 curation bonus)
- **Contracts Passing:** 13/13 flagship contracts
- **Raw Score Required:** ≥0.885 (0.995 - 0.11)

### 13 Flagship Contracts
1. animation@1.0.0
2. character@3.0.0
3. cosmology@1.0.0
4. field@1.0.0
5. fullgame@1.0.0
6. geometry3d@4.0.0
7. molecule@1.0.0
8. music@2.0.0
9. quantum@1.0.0
10. sprite@3.0.0
11. visual2d@3.0.0
12. website@1.0.0
13. world@1.0.0

## Phase 6 Target

- **New Threshold:** 0.999 (with 0.11 curation bonus)
- **Raw Score Required:** ≥0.889 (0.999 - 0.11)
- **Improvement Needed:** +0.004 raw score (+0.4%)

## Strategy

### 1. Raise the Threshold
Update `src/lib/kernel/quality-contract.ts`:
```typescript
const DEFAULT_OPTS: Required<ConformanceOptions> = {
  minCurated: 3,
  minCuratedScore: 0.999,  // Was: 0.995
  determinismTrials: 2,
};
```

### 2. Enhance Quality Metrics

For each contract's `rate()` function, improve quality assessment by:

#### A. Add More Granular Axes
- Break down coarse axes into finer-grained metrics
- Example: "completeness" → "structuralCompleteness", "dataCompleteness", "metadataCompleteness"

#### B. Improve Scoring Precision
- Use more sophisticated scoring algorithms
- Weight axes by importance
- Add bonus points for exceptional quality

#### C. Add Domain-Specific Quality Checks
- Validate domain-specific invariants
- Check for common quality issues
- Reward best practices

### 3. Verification Strategy

For each contract:
1. Run current quality check to get baseline scores
2. Enhance the `rate()` function
3. Verify scores improve to ≥0.889 raw (≥0.999 adjusted)
4. Ensure determinism is maintained
5. Update tests if needed

## Implementation Plan

### Phase 6.1: Threshold Update & Baseline
- [ ] Update `minCuratedScore` to 0.999
- [ ] Run quality check to identify which contracts fail
- [ ] Document baseline scores for all 13 contracts

### Phase 6.2: Enhance Quality Metrics (Per Contract)
For each failing contract:
- [ ] Analyze current `rate()` implementation
- [ ] Identify improvement opportunities
- [ ] Enhance quality metrics
- [ ] Verify ≥0.999 threshold met
- [ ] Update tests

### Phase 6.3: Verification & Documentation
- [ ] All 13 contracts pass at ≥0.999
- [ ] Golden hashes still match (determinism preserved)
- [ ] Full test suite passes
- [ ] Document quality improvements

## Quality Metric Enhancement Patterns

### Pattern 1: Weighted Axis Scoring
```typescript
function computeWeightedScore(axes: Record<string, number>, weights: Record<string, number>): number {
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [axis, score] of Object.entries(axes)) {
    const weight = weights[axis] ?? 1.0;
    weightedSum += score * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
```

### Pattern 2: Bonus for Excellence
```typescript
function applyExcellenceBonus(baseScore: number, axes: Record<string, number>): number {
  // Bonus if all axes are above threshold
  const allExcellent = Object.values(axes).every(score => score >= 0.95);
  const bonus = allExcellent ? 0.02 : 0;
  
  return Math.min(1.0, baseScore + bonus);
}
```

### Pattern 3: Penalty for Critical Issues
```typescript
function applyCriticalPenalty(baseScore: number, issues: string[]): number {
  const criticalIssues = issues.filter(i => i.startsWith('CRITICAL:'));
  const penalty = criticalIssues.length * 0.05;
  
  return Math.max(0, baseScore - penalty);
}
```

## Exit Criteria

Phase 6 is complete when:
1. ✅ `minCuratedScore` raised to 0.999
2. ✅ All 13 flagship contracts pass quality check
3. ✅ `npm run quality:contract` shows 13/13 passing
4. ✅ `npm run golden:verify` shows all hashes match
5. ✅ `npm run test` shows all tests passing
6. ✅ Documentation updated

## Risk Mitigation

### Risk 1: Contracts Fail at Higher Threshold
**Mitigation:** Enhance quality metrics incrementally, testing after each change

### Risk 2: Quality Improvements Break Determinism
**Mitigation:** Run `golden:verify` after each change to ensure hashes match

### Risk 3: Over-Engineering Quality Metrics
**Mitigation:** Keep enhancements simple and domain-appropriate

## Timeline

- **Phase 6.1:** 1-2 hours (threshold update + baseline)
- **Phase 6.2:** 4-6 hours (enhance 13 contracts)
- **Phase 6.3:** 1 hour (verification + docs)
- **Total:** 6-9 hours

## Next Phase

After Phase 6 completion, proceed to:
- **Phase 7:** Golden Matrix (Cross-Runtime) - Verify determinism across Node, Bun, Browser-Wasm, Sandbox-Wasm

---

**Status:** Ready to begin Phase 6.1 (Threshold Update & Baseline)