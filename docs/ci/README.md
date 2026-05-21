# CI Setup

Workflow YAML files staged here for installation through the GitHub web UI
because the agent's OAuth token does not carry the `workflow` scope.

To install:

1. Open `https://github.com/11vated/Paradigm/new/main?filename=.github/workflows/determinism.yml`
2. Paste the contents of `determinism.workflow.yml` into the editor.
3. Commit directly to `main` or open a PR.

## Workflows in this directory

* `determinism.workflow.yml` — runs `scripts/lint-determinism.ts` (entropy
  guard) and the `tests/determinism` + `tests/composition` vitest suites
  on every PR and push to `main`. Hard-fails if the substrate's
  byte-identical reproducibility is broken.
