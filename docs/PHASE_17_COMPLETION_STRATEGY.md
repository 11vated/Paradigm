# Phase 17: Test Coverage to 90%+ - Completion Strategy

**Date:** 2026-06-18  
**Phase:** 17 of 20  
**Current Coverage:** 68%  
**Target Coverage:** 90%  
**Time Remaining:** 7 days (Week 2 Days 7-10 + Week 3)

---

## Executive Summary

This document outlines the precise execution strategy to complete Phase 17, increasing test coverage from 68% to 90%+ within 7 days. Based on comprehensive codebase analysis, we have identified specific gaps and created a day-by-day implementation plan.

**Key Insight:** We need +22% coverage across 7 days = ~3.1% per day average. With focused effort on high-impact areas, this is achievable.

---

## Current State Analysis

### Test Suite Status
```
Test Files:  128 passing / 131 total (97.7%)
Tests:       1,914 passing / 1,927 total (99.3%)
Duration:    54.57s
Coverage:    68%
```

### Week 1-2 Accomplishments
- ✅ 98 new tests created (1,840 LOC)
- ✅ Auth tests: 19 tests (92% coverage)
- ✅ Web3 contracts: 52 tests (75% coverage)
- ✅ Queue handlers: 17 tests (70% coverage)
- ✅ Coverage increase: 60% → 68% (+8%)

### Remaining Gaps
1. **Web3 Provider:** 11 tests failing (jsdom environment issue)
2. **Queue Integration:** 0% coverage (no tests yet)
3. **Generator Edge Cases:** Inconsistent coverage
4. **Composition Functors:** ~50% coverage
5. **Error Paths:** ~30% coverage across modules

---

## Day-by-Day Execution Plan

### Day 7: Fix Web3 Provider Tests + Queue Integration Start

**Morning (4 hours):**

**Task 1.1: Configure jsdom Environment**
- Update `vitest.config.ts`:
```typescript
test: {
  environment: 'jsdom', // Add this for React component tests
  setupFiles: ['tests/setup.ts'],
  // ... rest of config
}
```
- Or create separate config for web3 tests
- **Expected Result:** 11 web3 provider tests pass
- **Impact:** +2% coverage

**Task 1.2: Verify Web3 Tests**
```bash
npm test tests/web3/provider.test.ts
# Should show 10/10 passing
```

**Afternoon (4 hours):**

**Task 1.3: Create Queue Integration Tests**
- File: `tests/queue/integration.test.ts`
- Test scenarios:
  - Job creation via API → processing → completion
  - Priority ordering (critical > high > normal > low)
  - Retry logic on failure
  - Timeout handling
  - Progress tracking
  - Job cancellation
- **Target:** 15+ tests
- **Impact:** +3% coverage

**End of Day 7 Target:** 68% → 73% (+5%)

---

### Day 8: Generator Edge Cases

**Morning (4 hours):**

**Task 2.1: Create Generator Edge Case Tests**
- File: `tests/kernel/generator-edge-cases.test.ts`
- Test all 13 flagship generators with:
  - Empty/null inputs
  - Boundary values (min/max)
  - Invalid gene types
  - Malformed seeds
  - Resource limits
  - Concurrent generation
- **Target:** 40+ tests (3-4 per generator)
- **Impact:** +4% coverage

**Afternoon (4 hours):**

**Task 2.2: Expand Existing Generator Tests**
- Enhance `tests/generators/*.test.ts` with:
  - Error handling branches
  - Edge case scenarios
  - Performance limits
- Focus on: character, music, sprite, visual2d, game
- **Target:** 20+ additional tests
- **Impact:** +2% coverage

**End of Day 8 Target:** 73% → 79% (+6%)

---

### Day 9: Composition Tests

**Morning (4 hours):**

**Task 3.1: Create Composition Functor Tests**
- File: `tests/kernel/composition.test.ts`
- Test all 50+ functors:
  - Valid compositions (character→clothing, music→dance, etc.)
  - Invalid combinations
  - Type mismatches
  - Circular dependencies
  - Deep composition chains
- **Target:** 50+ tests (1 per functor minimum)
- **Impact:** +3% coverage

**Afternoon (4 hours):**

**Task 3.2: Create Composition Integration Tests**
- File: `tests/kernel/composition-integration.test.ts`
- Test multi-seed compositions:
  - Friend + World → Quest
  - Quest + Game mechanics
  - Cross-domain functors
  - BFS pathfinding
- **Target:** 15+ tests
- **Impact:** +2% coverage

**End of Day 9 Target:** 79% → 84% (+5%)

---

### Day 10: Error Path Coverage

**Morning (4 hours):**

**Task 4.1: Systematic Error Branch Testing**
- Identify uncovered error branches:
```bash
npm run test:coverage -- --reporter=json
# Analyze coverage/coverage-final.json for uncovered branches
```
- Create targeted tests for:
  - Network failures
  - Timeout errors
  - Validation errors
  - Resource exhaustion
  - Concurrent access conflicts
- **Target:** 30+ tests
- **Impact:** +3% coverage

**Afternoon (4 hours):**

**Task 4.2: Error Recovery Tests**
- Test error recovery mechanisms:
  - Retry logic
  - Fallback strategies
  - Graceful degradation
  - Error messages
- Focus on: queue, web3, auth, kernel
- **Target:** 20+ tests
- **Impact:** +2% coverage

**End of Day 10 Target:** 84% → 89% (+5%)

---

### Day 11-12: Integration Tests

**Day 11 Morning (4 hours):**

**Task 5.1: Seed Lifecycle Integration**
- File: `tests/integration/seed-lifecycle.test.ts`
- Test complete workflows:
  - Create seed → grow artifact
  - Mutate seed → verify determinism
  - Breed seeds → verify lineage
  - Evolve population → verify fitness
  - Compose seeds → verify functors
- **Target:** 10+ tests
- **Impact:** +2% coverage

**Day 11 Afternoon (4 hours):**

**Task 5.2: Friend-World-Game Integration**
- File: `tests/integration/friend-world-game.test.ts`
- Test multi-parent composition:
  - Friend + World → Quest
  - Quest → Game scene graph
  - Game → Playability report
  - Oracle evaluation
- **Target:** 8+ tests
- **Impact:** +1% coverage

**Day 12 Morning (4 hours):**

**Task 5.3: Auth-API Integration**
- File: `tests/integration/auth-api.test.ts`
- Test authenticated workflows:
  - Register → login → API call
  - Token refresh → API call
  - Token expiration → rejection
  - Role-based access
- **Target:** 10+ tests
- **Impact:** +1% coverage

**Day 12 Afternoon (4 hours):**

**Task 5.4: Queue Processing Integration**
- File: `tests/integration/queue-processing.test.ts`
- Test background job workflows:
  - Job creation → processing → completion
  - Batch generation
  - Evolution jobs
  - Rendering jobs
- **Target:** 8+ tests
- **Impact:** +1% coverage

**End of Day 12 Target:** 89% → 94% (+5%)

---

### Day 13-14: Gap Closure

**Day 13 (8 hours):**

**Task 6.1: Coverage Report Analysis**
```bash
npm run test:coverage
# Open coverage/index.html
# Identify all files <90% coverage
```

**Task 6.2: Targeted Test Writing**
- For each file <90%:
  - Identify uncovered lines
  - Write specific tests
  - Verify coverage increase
- Priority order:
  1. Kernel modules
  2. GSPL modules
  3. Evolution modules
  4. Supporting modules
- **Target:** Close 50% of remaining gaps
- **Impact:** +3% coverage

**Day 14 (8 hours):**

**Task 6.3: Final Gap Closure**
- Continue targeted testing
- Focus on high-value modules
- Ensure all critical paths covered
- **Target:** Close remaining gaps
- **Impact:** +3% coverage

**End of Day 14 Target:** 94% → 100% (overshoot to ensure 90%+)

---

### Day 15: Verification & Documentation

**Morning (4 hours):**

**Task 7.1: Full Verification**
```bash
# Run all verification commands
npm run typecheck
npm run determinism:check
npm run quality:contract
npm run golden:verify
npm test
npm run test:coverage

# Verify thresholds
# Lines: ≥90%
# Statements: ≥90%
# Functions: ≥90%
# Branches: ≥85%
```

**Task 7.2: CI Integration**
- Enable coverage gate in `.github/workflows/ci.yml`
- Verify CI passes with new thresholds
- Update badge in README

**Afternoon (4 hours):**

**Task 7.3: Documentation Update**
- Update `docs/PHASE_17_TEST_COVERAGE_PROGRESS.md`
- Create `docs/PHASE_17_COMPLETION_REPORT.md`
- Update `README.md` with new coverage metrics
- Update `CHANGELOG.md`

**Task 7.4: Phase 18 Handoff**
- Create `docs/PHASE_18_PRODUCTION_INFRASTRUCTURE_PLAN.md`
- Document remaining work
- Prepare for next phase

**End of Day 15:** Phase 17 COMPLETE ✅

---

## Test File Templates

### Template 1: Edge Case Tests

```typescript
/**
 * Generator Edge Case Tests
 * Tests boundary conditions, invalid inputs, and error handling
 */

import { describe, it, expect } from 'vitest';
import { generateCharacter } from '@/lib/kernel/generators/character';

describe('Character Generator - Edge Cases', () => {
  describe('Invalid Inputs', () => {
    it('should handle null seed', async () => {
      await expect(generateCharacter(null as any)).rejects.toThrow();
    });

    it('should handle undefined seed', async () => {
      await expect(generateCharacter(undefined as any)).rejects.toThrow();
    });

    it('should handle empty seed', async () => {
      await expect(generateCharacter({} as any)).rejects.toThrow();
    });
  });

  describe('Boundary Values', () => {
    it('should handle minimum size', async () => {
      const seed = { $domain: 'character', size: 0 };
      const result = await generateCharacter(seed);
      expect(result).toBeDefined();
    });

    it('should handle maximum size', async () => {
      const seed = { $domain: 'character', size: 1 };
      const result = await generateCharacter(seed);
      expect(result).toBeDefined();
    });
  });

  describe('Malformed Data', () => {
    it('should handle invalid gene types', async () => {
      const seed = { $domain: 'character', size: 'invalid' };
      await expect(generateCharacter(seed as any)).rejects.toThrow();
    });
  });
});
```

### Template 2: Integration Tests

```typescript
/**
 * Seed Lifecycle Integration Tests
 * Tests complete workflows from creation to composition
 */

import { describe, it, expect } from 'vitest';
import { createSeed, growSeed, mutateSeed, breedSeeds } from '@/lib/kernel';

describe('Seed Lifecycle Integration', () => {
  it('should complete full lifecycle: create → grow → mutate → breed', async () => {
    // Create
    const seed1 = createSeed('character', { archetype: 'warrior' });
    expect(seed1).toBeDefined();
    expect(seed1.$domain).toBe('character');

    // Grow
    const artifact1 = await growSeed(seed1);
    expect(artifact1).toBeDefined();
    expect(artifact1.files).toBeDefined();

    // Mutate
    const seed2 = mutateSeed(seed1, 0.1);
    expect(seed2).toBeDefined();
    expect(seed2.$hash).not.toBe(seed1.$hash);

    // Breed
    const seed3 = breedSeeds(seed1, seed2);
    expect(seed3).toBeDefined();
    expect(seed3.$parents).toHaveLength(2);
  });
});
```

### Template 3: Error Path Tests

```typescript
/**
 * Error Path Tests
 * Tests error handling, recovery, and edge cases
 */

import { describe, it, expect, vi } from 'vitest';
import { JobQueue } from '@/server/queue/job-queue';

describe('Job Queue - Error Paths', () => {
  it('should retry failed jobs up to maxRetries', async () => {
    const queue = new JobQueue({ redis, concurrency: 1 });
    
    let attempts = 0;
    queue.registerHandler('test', async () => {
      attempts++;
      if (attempts < 3) throw new Error('Simulated failure');
      return 'success';
    });

    const jobId = await queue.addJob('test', {}, { maxRetries: 3 });
    await queue.processJobs();

    const job = await queue.getJob(jobId);
    expect(job.status).toBe('completed');
    expect(job.attempts).toBe(3);
  });

  it('should timeout long-running jobs', async () => {
    const queue = new JobQueue({ redis, concurrency: 1 });
    
    queue.registerHandler('test', async () => {
      await new Promise(resolve => setTimeout(resolve, 10000));
    });

    const jobId = await queue.addJob('test', {}, { timeout: 100 });
    await queue.processJobs();

    const job = await queue.getJob(jobId);
    expect(job.status).toBe('failed');
    expect(job.error).toContain('timeout');
  });
});
```

---

## Success Metrics

### Coverage Targets
- [ ] Lines: ≥90% (current: 68%, need: +22%)
- [ ] Statements: ≥90% (current: 68%, need: +22%)
- [ ] Functions: ≥90% (current: 65%, need: +25%)
- [ ] Branches: ≥85% (current: 60%, need: +25%)

### Module Targets
- [x] Auth: ≥95% (current: 92%)
- [ ] Kernel: ≥90% (current: 70%)
- [ ] Web3: ≥90% (current: 60%)
- [ ] Queue: ≥90% (current: 70%)
- [ ] GSPL: ≥90% (current: 75%)

### Quality Targets
- [x] Test pass rate: ≥99% (current: 99.3%)
- [x] Execution time: <2 min (current: 54.57s)
- [x] Flaky tests: 0 (current: 0)
- [ ] CI coverage gate: Enabled

---

## Risk Mitigation

### Risk 1: Time Overrun
**Probability:** Medium  
**Impact:** High  
**Mitigation:**
- Daily progress tracking
- Prioritize high-impact areas first
- Accept 85% if 90% not achievable
- Parallelize where possible

### Risk 2: Flaky Tests
**Probability:** Low  
**Impact:** Medium  
**Mitigation:**
- Use deterministic test data
- Mock external dependencies
- Avoid time-dependent tests
- Implement retry logic for integration tests

### Risk 3: Coverage False Positives
**Probability:** Medium  
**Impact:** High  
**Mitigation:**
- Manual review of coverage reports
- Ensure assertions in all tests
- Test error paths explicitly
- Use mutation testing (future)

---

## Daily Checklist

**Every Day:**
- [ ] Run `npm test` - verify all tests pass
- [ ] Run `npm run test:coverage` - check coverage increase
- [ ] Run `npm run typecheck` - verify 0 errors
- [ ] Run `npm run determinism:check` - verify 0 violations
- [ ] Commit progress with clear messages
- [ ] Update progress tracking document
- [ ] Review coverage report for gaps

**End of Week:**
- [ ] Full verification suite
- [ ] CI integration check
- [ ] Documentation update
- [ ] Phase 18 handoff preparation

---

## Conclusion

Phase 17 completion is achievable within 7 days with focused, systematic execution. The strategy prioritizes high-impact areas (web3, queue, generators, composition) and uses proven patterns from Week 1-2 success.

**Key Success Factors:**
1. Clear daily targets (+3-5% per day)
2. Proven test patterns and templates
3. Systematic gap identification
4. Focus on high-value modules first
5. Daily progress tracking

**Confidence Level:** HIGH

With this strategy, Paradigm Absolute will achieve 90%+ test coverage, completing Phase 17 and enabling confident progression to Phase 18 (Production Infrastructure).

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-18  
**Next Review:** Daily during execution  
**Status:** Ready for execution