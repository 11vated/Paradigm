#!/usr/bin/env bun
/**
 * fixup-generator-renames.ts
 *
 * After consolidate-generators.ts, three classes of breakage remain:
 *   (1) Renamed files still export `generateFooV3`, etc. — engine-dispatcher
 *       imports `generateFoo`. Fix: append `export { generateFooV3 as generateFoo }`
 *       aliases to each renamed file (idempotent).
 *   (2) Same-directory imports like `./music-v3.js` inside contract files
 *       were missed (consolidate only matched `generators/foo-vN`).
 *   (3) Orphan contracts for deleted generators (manufacturing-contract.ts
 *       imports deleted manufacturing.ts). Delete these contracts.
 *
 * Run:
 *   bun run scripts/fixup-generator-renames.ts           # dry run
 *   bun run scripts/fixup-generator-renames.ts --apply
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const APPLY = process.argv.includes("--apply");
const GEN = "src/lib/kernel/generators";

// From the consolidation rename table — derive these by reading what's now on disk
const RENAME_MAP: Array<[string, string]> = [
  ["agent", "Agent"], ["alife", "ALife"], ["animation", "Animation"], ["architecture", "Architecture"],
  ["audio", "Audio"], ["character", "Character"], ["choreography", "Choreography"], ["circuit", "Circuit"],
  ["ecosystem", "Ecosystem"], ["fashion", "Fashion"], ["food", "Food"], ["fullgame", "FullGame"],
  ["furniture", "Furniture"], ["game", "Game"], ["geometry3d", "Geometry3D"], ["music", "Music"],
  ["narrative", "Narrative"], ["particle", "Particle"], ["physics", "Physics"], ["procedural", "Procedural"],
  ["robotics", "Robotics"], ["shader", "Shader"], ["sprite", "Sprite"], ["typography", "Typography"],
  ["ui", "UI"], ["vehicle", "Vehicle"], ["visual2d", "Visual2D"],
];

// Version suffixes that may appear on the exported function name
const VERSION_SUFFIXES = ["V4", "V3", "V2"];

function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);
  let aliasAdded = 0;
  let sameDirFixed = 0;
  let contractsDeleted = 0;

  // (1) Add export aliases at end of renamed files
  for (const [family, cls] of RENAME_MAP) {
    const path = join(GEN, `${family}.ts`);
    if (!existsSync(path)) {
      console.log(`  skip (missing) ${path}`);
      continue;
    }
    const src = readFileSync(path, "utf8");
    const aliases: string[] = [];
    for (const suffix of VERSION_SUFFIXES) {
      const symbol = `generate${cls}${suffix}`;
      const aliasTarget = `generate${cls}`;
      // Only add alias if symbol exists in source AND alias target doesn't already
      const symbolRe = new RegExp(`(?:export\\s+(?:async\\s+)?function\\s+${symbol}\\b|export\\s+const\\s+${symbol}\\s*=|export\\s*\\{[^}]*\\b${symbol}\\b)`);
      const aliasRe = new RegExp(`(?:export\\s+(?:async\\s+)?function\\s+${aliasTarget}\\b|export\\s+const\\s+${aliasTarget}\\s*=|export\\s*\\{[^}]*\\b${aliasTarget}\\b)`);
      if (symbolRe.test(src) && !aliasRe.test(src)) {
        aliases.push(`export { ${symbol} as ${aliasTarget} };`);
      }
    }
    if (aliases.length > 0) {
      const banner = "\n// ── Canonical aliases (added by phase-0.5 consolidation) ──\n";
      console.log(`  alias  ${path}  +${aliases.length}`);
      if (APPLY) writeFileSync(path, src + banner + aliases.join("\n") + "\n");
      aliasAdded += aliases.length;
    }
  }

  // (2) Fix same-directory imports `./foo-v3` or `./foo-v4` etc inside any file under GEN
  const files = readdirSync(GEN).filter((f) => f.endsWith(".ts")).map((f) => join(GEN, f));
  for (const f of files) {
    let src = readFileSync(f, "utf8");
    let edits = 0;
    for (const [family] of RENAME_MAP) {
      const re = new RegExp(`(['"]\\./)${family}-(?:v\\d+|enhanced|gpu|3d|animated)(\\.js)?(['"])`, "g");
      const after = src.replace(re, (_m, p1, _p2, p3) => {
        edits++;
        return `${p1}${family}${p3}`;
      });
      if (after !== src) src = after;
    }
    if (edits > 0) {
      console.log(`  same-dir ${f}  (${edits} edit${edits === 1 ? "" : "s"})`);
      if (APPLY) writeFileSync(f, src);
      sameDirFixed += edits;
    }
  }

  // (3) Delete contracts for deleted generators
  const deletedFamilies = ["aerospace-defense", "construction", "entertainment", "food-service", "manufacturing", "retail", "telecommunications"];
  for (const family of deletedFamilies) {
    const c = join(GEN, `${family}-contract.ts`);
    if (existsSync(c)) {
      console.log(`  delete-contract ${c}`);
      if (APPLY) unlinkSync(c);
      contractsDeleted++;
    }
  }

  console.log(`\nAliases added: ${aliasAdded}`);
  console.log(`Same-dir imports fixed: ${sameDirFixed}`);
  console.log(`Orphan contracts deleted: ${contractsDeleted}`);
  if (!APPLY) console.log(`\nDRY RUN — re-run with --apply.`);
}

main();
