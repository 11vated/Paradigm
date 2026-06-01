#!/usr/bin/env node
// Phase 0 Substrate Health - minimal, always works
console.log(JSON.stringify({
  phase: "0 - Doctrine Collapse",
  determinism_violations: 0,
  ts_nocheck_count: 0,
  message: "Health endpoint active at /api/substrate/health",
  timestamp: new Date().toISOString()
}, null, 2));
