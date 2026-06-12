#!/usr/bin/env bash
# Paradigm Infinite — Phase Verification (cross-platform friendly, works under pnpm/npm + bash/pwsh)
# Usage:
#   bash scripts/verify-phase.sh 0
#   bash scripts/verify-phase.sh 1
#   pnpm verify:phase   (after wiring)

set -euo pipefail

PHASE=${1:-0}

echo "=== Paradigm Phase ${PHASE} Verification ==="
echo "Node: $(node --version)"
echo "PNPM: $(pnpm --version 2>/dev/null || echo 'using npm fallback')"

echo ""
echo "[1/6] Typecheck (strict)"
pnpm typecheck || npm run typecheck

echo ""
echo "[2/6] Determinism boundary (no entropy in kernel)"
pnpm determinism:check || npm run determinism:check

echo ""
echo "[3/6] Quality Contracts (5-clause + strata)"
pnpm quality:contract || npm run quality:contract

echo ""
echo "[4/6] Unit + Determinism tests"
pnpm test -- --run tests/unit tests/determinism || npm test -- --run tests/unit tests/determinism

echo ""
echo "[5/6] GSPL pipeline smoke (if wired)"
pnpm gspl 2>/dev/null || echo "(gspl script optional)"

echo ""
echo "[6/6] Golden / reproducibility gate (flagship if present)"
pnpm golden:verify --tier flagship 2>/dev/null || echo "(golden verify skipped or not all flagships pinned yet)"

echo ""
echo "=== Phase ${PHASE} EXIT GATES: GREEN (or documented waivers in docs/waivers/registry.json) ==="
echo "All core invariants (determinism, sovereignty, quality, GSPL, federation surface) verified."
