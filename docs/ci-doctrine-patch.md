# Doctrine v2 CI patch — apply manually (OAuth token in agent session lacks `workflow` scope).
#
# Inserts a new `doctrine-gates` job after `determinism:`. Runs the three
# Doctrine v2 lint scripts via Bun. Determinism is STRICT; the other two
# are continue-on-error until their phase exits (V.1 / V.3).
#
# Apply with: `git apply .github/workflows/ci.yml.doctrine-patch.diff`
# or copy the YAML block below into ci.yml after the determinism job.

  doctrine-gates:
    name: Doctrine v2 Pre-Flight Gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: Install dependencies
        run: npm ci
      - name: Determinism boundary lint (Doctrine V.5 / IX.4 — STRICT)
        run: bun run scripts/lint-determinism.ts
      - name: No-evasion lint (Doctrine V.3, warn-only until Phase 1 exit)
        continue-on-error: true
        run: bun run scripts/lint-no-evasion.ts
      - name: Canonical-rename lint (Doctrine V.1, warn-only until Phase 2 exit)
        continue-on-error: true
        run: bun run scripts/lint-canonical-rename.ts
