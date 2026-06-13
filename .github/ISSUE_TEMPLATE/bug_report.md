---
name: Bug report
about: Report a bug in Paradigm Infinite (determinism, federation, CLI, GSPL, etc.)
title: ''
labels: bug
assignees: ''
---

**Describe the bug**
A clear and concise description of what the bug is. Include whether it violates determinism, sovereignty, or quality contracts.

**To Reproduce**
Steps to reproduce the behavior:
1. Command or intent used: `paradigm grow --seed="..." --domain=...`
2. Exact seed material (if safe to share)
3. Expected behavior (e.g., "identical hash and artifact to previous run")
4. Actual behavior (e.g., "different hash" or "server crash")

**Expected behavior**
What you expected to happen, especially regarding bit-identical output or signature verification.

**Screenshots or artifacts**
If applicable, attach the produced artifact (GLTF/JSON/WAV), hashes, or error logs. Redact any sensitive lineage data.

**Environment (please complete the following information):**
- OS: [e.g. Windows 11, Ubuntu 22.04]
- Node version: [e.g. 24.14.0]
- pnpm/npm version:
- Docker version (if using):
- Paradigm version: (from `package.json` or `git tag`)
- Branch: (v1.0.1 or main)

**Additional context**
Add any other context about the problem here, including links to related issues or reproducibility logs.

**Reproducibility proof**
Please attach or paste:
- Before/after artifact hashes
- Output of `node test-paradigm.mjs` (relevant section)
- Federation logs if related to signed payloads

By submitting this issue, you agree that the report helps maintain the kernel's truthfulness.
