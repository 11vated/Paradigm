#!/usr/bin/env bun
/**
 * audit-generators.ts — v2 (post-discovery)
 *
 * KEY INSIGHT (v1 was wrong): `<family>-contract.ts` files are NOT stubs.
 * They are the quality-contract REGISTRATIONS for each generator. They
 * must be kept (and improved over time). The real cleanup surface is the
 * orphaned version siblings: `<family>.ts`, `<family>-v2.ts`, etc., where
 * a higher-version sibling is the one actively wired by
 * `engine-dispatcher.ts` and `pipeline/domain-config.ts`.
 *
 * This script:
 *   1) Parses the live dispatch tables to determine the wired version per family.
 *   2) Classifies every generator file as wired | contract | orphan | utility.
 *   3) For each orphan, greps the entire src/ for references to confirm it's truly dead.
 *   4) Emits a deletion plan (orphans with zero references) and a rename plan
 *      (wired → rename to `<family>.ts` to retire the version suffix).
 *
 * Outputs:
 *   - scripts/.audit-output/generators.v2.json
 *   - scripts/.audit-output/GENERATOR_AUDIT.v2.md
 *
 * Run:  bun run scripts/audit-generators.ts
 */

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";

const GEN_ROOT = "src/lib/kernel/generators";
const SRC_ROOT = "src";
const OUT_DIR = "scripts/.audit-output";

const DISPATCHERS = ["src/lib/kernel/engine-dispatcher.ts", "src/lib/kernel/pipeline/domain-config.ts"];

interface Audit {
  file: string;
  base: string;
  family: string;
  variant: string;
  loc: number;
  effectiveLoc: number;
  role: "wired" | "contract" | "orphan" | "utility";
  refsInSrc: number;            // distinct files outside generators/ referencing it
  refsInGenerators: number;
  importsRng: boolean;
  importsContract: boolean;
  hasInverseFn: boolean;
  entropyHits: number;
  jsonStringifyCount: number;
  recommendation: "keep" | "rename-to-canonical" | "delete-orphan" | "review";
  newName?: string;
  notes: string[];
}

const UTILITY_FAMILIES = new Set(["index", "_template", "canvas-utils", "data-science", "gltf-exporter", "obj-exporter", "obj-loader", "game-wasm", "webgpu-rng", "webgpu-system", "meta-domain", "fullgame-electron"]);

function classifyName(file: string): { base: string; family: string; variant: string } {
  const name = basename(file, ".ts");
  const m = name.match(/^([a-z0-9]+(?:[-_][a-z0-9]+)*?)(?:-(v\d+|gpu|enhanced|worker|animated|defense|3d|contract|template|svg))?$/);
  if (!m) return { base: name, family: name, variant: "" };
  return { base: name, family: m[1] ?? name, variant: m[2] ?? "" };
}

function effectiveLOC(src: string): number {
  let n = 0;
  let inBlock = false;
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (inBlock) { if (line.includes("*/")) inBlock = false; continue; }
    if (line.startsWith("/*")) { if (!line.includes("*/")) inBlock = true; continue; }
    if (line.startsWith("//") || line.startsWith("*")) continue;
    n++;
  }
  return n;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts") && !entry.endsWith(".d.ts")) acc.push(p);
  }
  return acc;
}

function parseWiredMap(): Map<string, string> {
  // family → wired base (e.g. "music" → "music-v3")
  const wired = new Map<string, string>();
  for (const d of DISPATCHERS) {
    const src = readFileSync(d, "utf8");
    const re = /from\s+['"]\.{1,2}\/generators\/([a-z0-9][a-z0-9-]*?)(?:\.js)?['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const base = m[1]!;
      const { family } = classifyName(base);
      if (!wired.has(family)) wired.set(family, base);
      // If multiple dispatchers wire different versions, prefer the higher v#
      const existing = wired.get(family)!;
      const num = (s: string) => { const x = s.match(/-v(\d+)$/); return x ? parseInt(x[1]!, 10) : 0; };
      if (num(base) > num(existing)) wired.set(family, base);
    }
  }
  return wired;
}

function countRefs(base: string): { inSrc: number; inGenerators: number } {
  try {
    // count files outside generators/ that import this base
    const cmd = `grep -rE "from ['\\"][^'\\"]*${base}['\\"]" src --include='*.ts' --include='*.tsx' -l 2>/dev/null || true`;
    const out = execSync(cmd, { encoding: "utf8" });
    const files = out.split("\n").filter(Boolean);
    const inGen = files.filter((f) => f.startsWith(GEN_ROOT)).length;
    const inSrc = files.filter((f) => !f.startsWith(GEN_ROOT)).length;
    return { inSrc, inGenerators: inGen };
  } catch {
    return { inSrc: 0, inGenerators: 0 };
  }
}

function main() {
  const files = walk(GEN_ROOT).filter((f) => !f.includes("__tests__"));
  const wiredMap = parseWiredMap();

  const audits: Audit[] = [];
  for (const path of files) {
    const src = readFileSync(path, "utf8");
    const { base, family, variant } = classifyName(path);
    const loc = src.split("\n").length;
    const eff = effectiveLOC(src);
    const refs = countRefs(base);

    let role: Audit["role"] = "orphan";
    if (UTILITY_FAMILIES.has(family)) role = "utility";
    else if (variant === "contract") role = "contract";
    else if (wiredMap.get(family) === base) role = "wired";
    else role = "orphan";

    const a: Audit = {
      file: path,
      base,
      family,
      variant,
      loc,
      effectiveLoc: eff,
      role,
      refsInSrc: refs.inSrc,
      refsInGenerators: refs.inGenerators,
      importsRng: /from\s+["']\.\.\/rng["']|from\s+["']@\/lib\/kernel\/rng["']/.test(src),
      importsContract: /quality-contract/.test(src),
      hasInverseFn: /export\s+(?:async\s+)?function\s+(?:invert|extractGenes|infer\w*Genes)\b/.test(src),
      entropyHits: (src.match(/Math\.random\(\)|crypto\.randomUUID|Date\.now\(\)|performance\.now\(\)/g) || []).length,
      jsonStringifyCount: (src.match(/JSON\.stringify/g) || []).length,
      recommendation: "review",
      notes: [],
    };

    // Recommendation
    if (a.role === "wired") {
      a.recommendation = a.variant ? "rename-to-canonical" : "keep";
      if (a.variant) a.newName = `${family}.ts`;
    } else if (a.role === "contract") {
      a.recommendation = "keep";
    } else if (a.role === "utility") {
      a.recommendation = "keep";
    } else if (a.role === "orphan") {
      if (a.refsInSrc === 0 && a.refsInGenerators <= 1) {
        // only ref might be self (file path includes own basename) — usually safe
        a.recommendation = "delete-orphan";
      } else {
        a.recommendation = "review";
        a.notes.push(`still referenced by ${a.refsInSrc} non-generator files, ${a.refsInGenerators} generators`);
      }
    }

    if (a.entropyHits > 0 && a.role !== "contract") a.notes.push(`entropy violations: ${a.entropyHits}`);
    if (a.role === "wired" && !a.importsContract) a.notes.push("wired but no quality-contract import");
    if (a.role === "wired" && !a.hasInverseFn) a.notes.push("wired but no inverse fn");

    audits.push(a);
  }

  const summary = {
    total: audits.length,
    wired: audits.filter((a) => a.role === "wired").length,
    contracts: audits.filter((a) => a.role === "contract").length,
    utilities: audits.filter((a) => a.role === "utility").length,
    orphans: audits.filter((a) => a.role === "orphan").length,
    rec_keep: audits.filter((a) => a.recommendation === "keep").length,
    rec_rename: audits.filter((a) => a.recommendation === "rename-to-canonical").length,
    rec_delete: audits.filter((a) => a.recommendation === "delete-orphan").length,
    rec_review: audits.filter((a) => a.recommendation === "review").length,
    entropyViolators: audits.filter((a) => a.entropyHits > 0 && a.role !== "contract").length,
    wiredMissingContract: audits.filter((a) => a.role === "wired" && !a.importsContract).length,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "generators.v2.json"), JSON.stringify({ summary, audits, wiredMap: Object.fromEntries(wiredMap) }, null, 2));

  // Markdown
  let md = `# Generator Audit v2 — ${new Date().toISOString().slice(0, 10)}\n\n`;
  md += `> **Correction from v1:** \`*-contract.ts\` files are quality-contract registrations, not stubs. Kept.\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|---|---:|\n`;
  md += `| Total generator files | ${summary.total} |\n`;
  md += `| Wired (actively used by dispatchers) | ${summary.wired} |\n`;
  md += `| Contract registrations | ${summary.contracts} |\n`;
  md += `| Utilities | ${summary.utilities} |\n`;
  md += `| Orphaned versions | ${summary.orphans} |\n`;
  md += `| → Keep as-is | ${summary.rec_keep} |\n`;
  md += `| → Rename canonical (\`-vN\` → \`<family>\`) | **${summary.rec_rename}** |\n`;
  md += `| → Delete orphan | **${summary.rec_delete}** |\n`;
  md += `| → Manual review | ${summary.rec_review} |\n`;
  md += `| Entropy violators (non-contract) | ${summary.entropyViolators} |\n`;
  md += `| Wired without quality-contract import | ${summary.wiredMissingContract} |\n\n`;

  md += `## Wired families\n\n`;
  md += `| Family | Wired version | Effective LOC | Has contract? | Has inverse? | Entropy | Notes |\n|---|---|---:|:--:|:--:|:--:|---|\n`;
  for (const [family, base] of [...wiredMap.entries()].sort()) {
    const a = audits.find((x) => x.base === base);
    if (!a) continue;
    md += `| \`${family}\` | \`${base}\` | ${a.effectiveLoc} | ${a.importsContract ? "✅" : "❌"} | ${a.hasInverseFn ? "✅" : "❌"} | ${a.entropyHits} | ${a.notes.join("; ")} |\n`;
  }
  md += `\n`;

  md += `## Deletion plan (orphans with zero src refs)\n\n`;
  const dels = audits.filter((a) => a.recommendation === "delete-orphan").sort((a, b) => a.file.localeCompare(b.file));
  md += `**Count:** ${dels.length}\n\n`;
  md += `\`\`\`\n`;
  for (const a of dels) md += `${a.file.replace(GEN_ROOT + "/", "")}\n`;
  md += `\`\`\`\n\n`;

  md += `## Rename plan (canonical promotion)\n\n`;
  const ren = audits.filter((a) => a.recommendation === "rename-to-canonical").sort((a, b) => a.file.localeCompare(b.file));
  md += `**Count:** ${ren.length}\n\n`;
  md += `| From | To |\n|---|---|\n`;
  for (const a of ren) md += `| \`${a.base}.ts\` | \`${a.newName}\` |\n`;
  md += `\n`;

  md += `## Review queue (orphans still referenced)\n\n`;
  const rev = audits.filter((a) => a.recommendation === "review").sort((a, b) => a.file.localeCompare(b.file));
  md += `**Count:** ${rev.length}\n\n`;
  md += `| File | refs in src | refs in generators | Notes |\n|---|---:|---:|---|\n`;
  for (const a of rev) md += `| \`${a.base}.ts\` | ${a.refsInSrc} | ${a.refsInGenerators} | ${a.notes.join("; ")} |\n`;
  md += `\n`;

  writeFileSync(join(OUT_DIR, "GENERATOR_AUDIT.v2.md"), md);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${OUT_DIR}/generators.v2.json and ${OUT_DIR}/GENERATOR_AUDIT.v2.md`);
}

main();
