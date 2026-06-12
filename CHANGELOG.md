# Paradigm Infinite v1.0.0 Release Notes

## Highlights
- Full deterministic seed-to-artifact pipeline with pure .gltf primary output for grow/make.
- Real ed25519/ECDSA in sovereignty layer (replaced hash-chain demo).
- Validated CI/CD with Linux/Windows matrix + Docker parity.
- E2E harness (test-paradigm.mjs) confirms reproducibility across runs.
- Federation stable with live signed payloads.
- Performance: ~5+ artifacts/sec local, 10/10 load offers.

## Breaking / Important
- grow now defaults to clean .gltf (add --no-pure or use wrapper for full result if needed).
- Crypto now uses real sign/verify; update any custom sig handling.

## Installation
- CLI: npm install -g paradigm-infinite or npx paradigm-infinite make "..."
- Docker: docker pull paradigm-infinite:latest (or build from Dockerfile)
- Source: git clone, pnpm install, pnpm paradigm:grow --seed=...

## Known
- Harness has minor Windows spawn note (non-blocking).
- Some generator stubs remain for browser.

See FINAL_BUILD_REPORT.md and docs/PARADIGM_INFINITE_GUIDE.md for full details.
