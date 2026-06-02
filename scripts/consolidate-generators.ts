#!/usr/bin/env bun
/**
 * consolidate-generators.ts
 *
 * Reads scripts/.audit-output/generators.v2.json and executes:
 *   1) Delete orphans (recommendation === "delete-orphan")
 *   2) Rename wired -vN files to <family>.ts (recommendation === "rename-to-canonical")
 *   3) Update imports across the entire src/ tree
 *   4) Print a summary
 *
 * Safety:
 *   - Dry-run by default. Pass --apply to actually mutate the filesystem.
 *   - Rewrites only generator imports (`generators/<family>-vN`) — never touches
 *     non-generator imports.
 *
 * Run:
 *   bun run scripts/consolidate-generators.ts           # dry run
 *   bun run scripts/consolidate-generators.ts --apply   # execute
 */

import { readFileSync, writeFileSync, unlinkSync, renameSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

const APPLY = process.argv.includes("--apply");
const AUDIT = "scripts/.audit-output/generators.v2.json";

interface AuditEntry {
  file: string;
  base: string;
  family: string;
  recommendation: string;
  newName?: string;
}

function walk(dir: string, exts: string[], acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, exts, acc);
    else if (exts.some((e) => entry.endsWith(e))) acc.push(p);
  }
  return acc;
}

function main() {
  const data = JSON.parse(readFileSync(AUDIT, "utf8")) as { audits: AuditEntry[] };
  const deletions = data.audits.filter((a) => a.recommendation === "delete-orphan");
  const renames = data.audits.filter((a) => a.recommendation === "rename-to-canonical");

  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`Deletions: ${deletions.length}`);
  console.log(`Renames: ${renames.length}\n`);

  // Build base → newBase map for import rewriting
  const baseMap = new Map<string, string>();
  for (const r of renames) {
    if (!r.newName) continue;
    const newBase = r.newName.replace(/\.ts$/, "");
    baseMap.set(r.base, newBase);
  }

  // Step 1: Delete orphans
  for (const d of deletions) {
    console.log(`  delete  ${d.file}`);
    if (APPLY) unlinkSync(d.file);
  }

  // Step 2: Rename wired -vN to <family>.ts
  for (const r of renames) {
    if (!r.newName) continue;
    const dir = dirname(r.file);
    const target = join(dir, r.newName);
    console.log(`  rename  ${r.file}  →  ${target}`);
    if (APPLY) renameSync(r.file, target);
  }

  // Step 3: Rewrite imports across src/
  const srcFiles = walk("src", [".ts", ".tsx"]);
  let updatedFiles = 0;
  let totalEdits = 0;
  for (const f of srcFiles) {
    let src = readFileSync(f, "utf8");
    let edits = 0;
    for (const [oldBase, newBase] of baseMap) {
      // Match: from "<...>generators/<oldBase>" or "<...>generators/<oldBase>.js"
      const re = new RegExp(`(generators\\/)${escapeRe(oldBase)}(\\.js)?(['"])`, "g");
      const after = src.replace(re, (_m, p1, _p2, p3) => {
        edits++;
        return `${p1}${newBase}${p3}`;
      });
      if (after !== src) src = after;
    }
    if (edits > 0) {
      updatedFiles++;
      totalEdits += edits;
      console.log(`  imports ${f}  (${edits} edit${edits === 1 ? "" : "s"})`);
      if (APPLY) writeFileSync(f, src);
    }
  }

  console.log(`\nFiles updated: ${updatedFiles}, total import rewrites: ${totalEdits}`);
  if (!APPLY) console.log(`\nDRY RUN — re-run with --apply to execute.`);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main();
