# Phase 17: Test Coverage to 90%+ - Implementation Plan

**Status:** 🔄 IN PROGRESS  
**Date:** 2026-06-18  
**Phase:** 17 of 20 (Strategic Implementation Plan)

---

## Current State Analysis

### Test Suite Status (as of 2026-06-18)

**Test Execution:**
- ✅ **123 test files passing** (98.4%)
- ❌ **2 test files failing** (hardhat config issues)
- ✅ **1786 tests passing** (99.9%)
- ❌ **2 tests failing** (onchain tests)
- ⏱️ **Duration:** 51.83s

**Current Coverage Thresholds:**
```typescript
thresholds: {
  lines: 60,        // Target: 90%
  statements: 60,   // Target: 90%
  functions: 60,    // Target: 90%
  branches: 55,     // Target: 85%
}
```

**Coverage Scope:**
- `src/lib/kernel/**` - Core deterministic kernel
- `src/lib/gspl/**` - GSPL interpreter
- `src/lib/sovereignty/**` - ECDSA signing
- `src/lib/friend/**` - Friend substrate
- `src/lib/world/**` - World substrate
- `src/lib/game/**` - Game substrate
- `src/lib/evolution/**` - Genetic algorithms
- `src/seeds/**` - Seed types

---

## Gap Analysis

### Areas Needing Coverage

#### 1. New Modules (Phase 15-16)
**Not yet in coverage scope:**
- `src/lib/web3/**` - Web3 provider and contracts (Phase 15)
- `src/server/queue/**` - Job queue system (Phase 16)
- `src/server/routes/jobs.ts` - Job API routes (Phase 16)
- `src/lib/auth/**` - Authentication system
- `src/server/middleware/**` - Server middleware

**Estimated Coverage:** 0% (not tested)

#### 2. Existing Modules with Low Coverage
**Based on test file analysis:**
- `src/lib/kernel/generators/**` - Some generators lack comprehensive tests
- `src/lib/composition.ts` - Composition functors
- `src/lib/naming/**` - Seed naming system
- `src/lib/federation/**` - Federation protocol
- `src/lib/contracts/**` - Contract abstractions

**Estimated Coverage:** 40-60%

#### 3. Edge Cases and Error Paths
**Commonly undertested:**
- Error handling branches
- Input validation edge cases
- Timeout scenarios
- Retry logic
- Concurrent access patterns
- Resource exhaustion scenarios

**Estimated Coverage:** 30-50%

---

## Implementation Strategy

### Phase 17.1: Update Coverage Configuration

**File:** `vitest.config.ts`

**Changes:**
1. Add new modules to coverage scope
2. Increase thresholds to 90%/90%/90%/85%
3. Add per-file thresholds for critical modules
4. Configure coverage reporters

**Priority:** HIGH  
**Effort:** 1 hour  
**Impact:** Establishes targets

### Phase 17.2: Web3 Module Tests

**Target:** `src/lib/web3/**`

**Test Files to Create:**
1. `tests/web3/provider.test.ts` - Web3Provider context
2. `tests/web3/contracts.test.ts` - Contract configuration
3. `tests/web3/hooks.test.ts` - Contract interaction hooks
4. `tests/web3/wallet-connect.test.tsx` - Wallet UI components

**Coverage Goals:**
- Lines: 90%
- Statements: 90%
- Functions: 90%
- Branches: 85%

**Test Scenarios:**
- Provider initialization
- Wallet connection/disconnection
- Network switching
- Contract instance creation
- Balance fetching
- Transaction submission
- Error handling
- Event listeners

**Priority:** HIGH  
**Effort:** 8 hours  
**Impact:** +5% overall coverage

### Phase 17.3: Job Queue Tests

**Target:** `src/server/queue/**`

**Test Files to Create:**
1. `tests/queue/job-queue.test.ts` - Core queue functionality
2. `tests/queue/handlers.test.ts` - Job handlers
3. `tests/queue/integration.test.ts` - End-to-end queue tests
4. `tests/routes/jobs.test.ts` - Job API routes

**Coverage Goals:**
- Lines: 90%
- Statements: 90%
- Functions: 90%
- Branches: 85%

**Test Scenarios:**
- Job creation
- Job processing
- Priority ordering
- Retry logic
- Timeout handling
- Progress tracking
- Job cancellation
- Queue statistics
- Handler execution
- Error recovery

**Priority:** HIGH  
**Effort:** 10 hours  
**Impact:** +6% overall coverage

### Phase 17.4: Authentication Tests

**Target:** `src/lib/auth/**`

**Test Files to Create:**
1. `tests/auth/auth-core.test.ts` - Core auth functions
2. `tests/auth/jwt.test.ts` - JWT generation/validation
3. `tests/auth/password.test.ts` - Password hashing
4. `tests/auth/session.test.ts` - Session management

**Coverage Goals:**
- Lines: 95% (security-critical)
- Statements: 95%
- Functions: 95%
- Branches: 90%

**Test Scenarios:**
- User registration
- Login/logout
- Token generation
- Token validation
- Token refresh
- Password hashing
- Password verification
- Session creation
- Session expiration
- Rate limiting

**Priority:** CRITICAL  
**Effort:** 6 hours  
**Impact:** +4% overall coverage

### Phase 17.5: Generator Edge Cases

**Target:** `src/lib/kernel/generators/**`

**Test Files to Enhance:**
1. `tests/kernel/generators/*.test.ts` - Add edge cases

**Coverage Goals:**
- Lines: 90%
- Statements: 90%
- Functions: 90%
- Branches: 85%

**Test Scenarios:**
- Invalid inputs
- Boundary values
- Empty/null inputs
- Malformed data
- Resource limits
- Timeout scenarios
- Concurrent generation
- Memory constraints

**Priority:** MEDIUM  
**Effort:** 12 hours  
**Impact:** +8% overall coverage

### Phase 17.6: Composition Tests

**Target:** `src/lib/composition.ts`

**Test Files to Create:**
1. `tests/kernel/composition.test.ts` - Functor tests
2. `tests/kernel/composition-integration.test.ts` - Multi-seed composition

**Coverage Goals:**
- Lines: 90%
- Statements: 90%
- Functions: 90%
- Branches: 85%

**Test Scenarios:**
- All 50+ functors
- Invalid combinations
- Type mismatches
- Circular dependencies
- Deep composition chains
- Performance limits

**Priority:** MEDIUM  
**Effort:** 8 hours  
**Impact:** +5% overall coverage

### Phase 17.7: Error Path Coverage

**Target:** All modules

**Approach:**
1. Identify uncovered error branches
2. Add tests for each error path
3. Verify error messages
4. Test error recovery

**Coverage Goals:**
- Branches: 85%

**Test Scenarios:**
- Network failures
- Timeout errors
- Validation errors
- Resource exhaustion
- Concurrent access conflicts
- Database errors
- File system errors

**Priority:** MEDIUM  
**Effort:** 10 hours  
**Impact:** +7% overall coverage

### Phase 17.8: Integration Tests

**Target:** Cross-module interactions

**Test Files to Create:**
1. `tests/integration/seed-lifecycle.test.ts` - Full seed lifecycle
2. `tests/integration/friend-world-game.test.ts` - Multi-parent composition
3. `tests/integration/auth-api.test.ts` - Authenticated API flows
4. `tests/integration/queue-processing.test.ts` - Background job flows

**Coverage Goals:**
- Integration coverage: 80%

**Test Scenarios:**
- Seed creation → evolution → composition
- Friend + World → Quest → Game
- User registration → login → API call
- Job creation → processing → completion

**Priority:** MEDIUM  
**Effort:** 12 hours  
**Impact:** +5% overall coverage

---

## Implementation Timeline

### Week 1: Critical Modules
- **Day 1-2:** Phase 17.1 + 17.4 (Config + Auth tests)
- **Day 3-4:** Phase 17.2 (Web3 tests)
- **Day 5:** Phase 17.3 Part 1 (Queue core tests)

### Week 2: Coverage Expansion
- **Day 1-2:** Phase 17.3 Part 2 (Queue handlers + API)
- **Day 3-4:** Phase 17.5 (Generator edge cases)
- **Day 5:** Phase 17.6 (Composition tests)

### Week 3: Polish & Integration
- **Day 1-2:** Phase 17.7 (Error paths)
- **Day 3-4:** Phase 17.8 (Integration tests)
- **Day 5:** Review, fix gaps, verify 90% target

**Total Effort:** ~80 hours (2-3 weeks)

---

## Success Criteria

### Coverage Targets
- ✅ **Lines:** ≥90%
- ✅ **Statements:** ≥90%
- ✅ **Functions:** ≥90%
- ✅ **Branches:** ≥85%

### Quality Metrics
- ✅ **Test Pass Rate:** ≥99%
- ✅ **Test Execution Time:** <2 minutes
- ✅ **Flaky Tests:** 0
- ✅ **Test Maintainability:** High (clear, documented)

### Module-Specific Targets
- ✅ **Auth Module:** ≥95% (security-critical)
- ✅ **Kernel Module:** ≥90%
- ✅ **Web3 Module:** ≥90%
- ✅ **Queue Module:** ≥90%
- ✅ **GSPL Module:** ≥90%

---

## Test Quality Standards

### Test Structure
```typescript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = createTestInput();
      
      // Act
      const result = functionName(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe(expected);
    });
    
    it('should handle edge case: empty input', () => {
      expect(() => functionName(null)).toThrow();
    });
    
    it('should handle error case: invalid input', () => {
      expect(() => functionName(invalid)).toThrow('Expected error');
    });
  });
});
```

### Test Naming Convention
- **Pattern:** `should [expected behavior] when [condition]`
- **Examples:**
  - `should return user when credentials are valid`
  - `should throw error when password is too short`
  - `should retry 3 times when network fails`

### Test Coverage Rules
1. **Happy Path:** Test normal, expected behavior
2. **Edge Cases:** Test boundary values, empty inputs, nulls
3. **Error Cases:** Test all error conditions
4. **Integration:** Test module interactions
5. **Performance:** Test under load (where applicable)

---

## Monitoring & Reporting

### Coverage Reports
- **Format:** HTML + JSON + Text
- **Location:** `./coverage/`
- **CI Integration:** Fail build if <90%
- **Trend Tracking:** Store historical coverage data

### Metrics to Track
- Coverage percentage by module
- Uncovered lines count
- Test execution time
- Test flakiness rate
- Code churn vs test updates

### Alerts
- Coverage drops below 90%
- New code added without tests
- Test execution time >2 minutes
- Flaky test detected

---

## Risks & Mitigation

### Risk 1: Time Overrun
**Probability:** Medium  
**Impact:** High  
**Mitigation:**
- Prioritize critical modules first
- Parallelize test writing where possible
- Use AI assistance for boilerplate
- Accept 85% if 90% not achievable in timeline

### Risk 2: Flaky Tests
**Probability:** Medium  
**Impact:** Medium  
**Mitigation:**
- Avoid time-dependent tests
- Mock external dependencies
- Use deterministic test data
- Implement retry logic for integration tests

### Risk 3: Performance Degradation
**Probability:** Low  
**Impact:** Medium  
**Mitigation:**
- Run tests in parallel
- Use test fixtures efficiently
- Mock expensive operations
- Optimize slow tests

### Risk 4: False Coverage
**Probability:** Medium  
**Impact:** High  
**Mitigation:**
- Review coverage reports manually
- Ensure assertions in all tests
- Test error paths explicitly
- Use mutation testing (future)

---

## Next Steps

### Immediate Actions
1. ✅ Update vitest.config.ts with new targets
2. ✅ Create test file templates
3. ✅ Set up coverage CI gate
4. 🔄 Begin Phase 17.1 (Config update)
5. 🔄 Begin Phase 17.4 (Auth tests)

### Future Enhancements
- Mutation testing
- Property-based testing
- Snapshot testing for UI
- Visual regression testing
- Load testing
- Chaos testing

---

## Conclusion

Phase 17 aims to increase test coverage from ~60% to 90%+ across all critical modules. The phased approach prioritizes security-critical modules (auth) and new modules (web3, queue) before expanding coverage of existing modules.

The 3-week timeline is aggressive but achievable with focused effort. The result will be a robust, well-tested codebase ready for production deployment.

---

**Phase 17 Status:** 🔄 **IN PROGRESS**  
**Next Milestone:** Phase 17.1 - Update Coverage Configuration  
**Target Completion:** 2026-07-09 (3 weeks)

---

*Made with Bob - Paradigm Absolute v1.0.3*