# Build Baseline — Paradigm Absolute v1.0
**Last Updated:** May 16, 2026  
**Commit:** a48599e

## Build Metrics
| Metric | Value |
|--------|-------|
| Build duration | 8.67s |
| Production bundle | ~1.8MB |
| Module count | 2,353 transformed |
| TypeScript errors | 696 (pre-existing, all from FunctorBridge/generator types) |
| Test files | 59 |
| Tests passing | 995/995 (100%) |
| Unhandled errors | 7 (ENOENT .wav file artifacts — non-blocking) |

## Bundle Composition
| Chunk | Size | Gzipped |
|-------|------|---------|
| `three-misc` (Three.js) | 724 KB | 187 KB |
| `index` (main app) | 463 KB | 139 KB |
| `kernel` (RNG, gene system, engines) | 447 KB | 120 KB |
| `react` (React 19 + deps) | 194 KB | 60 KB |

## Key Commands
- `npm run build` — 8.67s ✅
- `npm run test` — 995/995 pass ✅
- `npm run typecheck` — 696 pre-existing errors ⚠️

## Known Issues
1. 7 unhandled ENOENT errors for .wav files in engine tests — need data/artifacts/music/ directory
2. 696 TypeScript type errors (pre-existing, mostly generator type narrows and FunctorBridge interfaces)
3. Some generator type casts (e.g., 'metal' | 'fdm' casts from unknown)