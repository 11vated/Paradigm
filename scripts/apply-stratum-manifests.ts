#!/usr/bin/env bun
/**
 * apply-stratum-manifests.ts
 *
 * Doctrine v2 Part VI.10 + Phase 1.
 *
 * Mass-applies the manifest pattern to every `*-contract.ts` file under
 * `src/lib/kernel/generators/`:
 *   1. Inserts `strata` + `engineOwner` fields into the
 *      `export const XQualityContract: QualityContract<...> = { ... }`
 *      object literal, before its closing brace.
 *   2. Strips the outermost `as any` from
 *      `registerContract(XQualityContract as any);`.
 *
 * It does NOT touch internal `any`s, generator-call casts, or any
 * other typing inside synthesize/invert/rate. Those require honest
 * generic threading per contract (separate Phase 1 slices).
 *
 * Idempotent. Skips files where the insertion point is ambiguous.
 *
 * Run:  bun run scripts/apply-stratum-manifests.ts          # dry-run
 *       bun run scripts/apply-stratum-manifests.ts --write  # apply
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const WRITE = process.argv.includes('--write');
const ROOT = 'src/lib/kernel/generators';

type Stratum = 'form' | 'motion' | 'sound' | 'mind' | 'story' | 'world' | 'field' | 'culture' | 'time';

const DOMAIN_STRATA: Record<string, Stratum[]> = {
  '3d-printing': ['form'],
  '5g': ['field'],
  '6g': ['field'],
  'acoustics': ['sound', 'field'],
  'advertising': ['culture'],
  'aerospace': ['form', 'motion'],
  'agent': ['mind'],
  'agriculture': ['world'],
  'agtech': ['world'],
  'alife': ['form', 'motion', 'mind'],
  'animation': ['form', 'motion', 'time'],
  'animation-enhanced': ['form', 'motion', 'time'],
  'app': ['form'],
  'ar': ['form', 'world'],
  'architecture': ['form', 'world'],
  'art': ['form', 'culture'],
  'audio': ['sound'],
  'automotive': ['form', 'motion'],
  'av': ['form', 'motion', 'mind'],
  'battery': ['field'],
  'beer': ['culture'],
  'biomedical': ['form'],
  'biotechnology': ['form'],
  'blockchain': ['mind', 'culture'],
  'character': ['form', 'motion', 'mind', 'sound'],
  'chemical': ['field'],
  'choreography': ['motion', 'time'],
  'circuit': ['form', 'field'],
  'city': ['world', 'form', 'culture'],
  'climate': ['world', 'field', 'time'],
  'cloud': ['field'],
  'coffee': ['culture'],
  'consciousness': ['mind'],
  'cosmetics': ['form', 'culture'],
  'cosmology': ['world', 'field'],
  'cybersecurity': ['mind'],
  'dance': ['motion', 'culture'],
  'devops': ['mind'],
  'drone-delivery': ['motion', 'mind'],
  'drones': ['form', 'motion'],
  'drug': ['form'],
  'ecosystem': ['world', 'form'],
  'edtech': ['mind', 'culture'],
  'education': ['mind', 'culture'],
  'electronics': ['form', 'field'],
  'energy': ['field'],
  'event-planning': ['time', 'culture'],
  'fashion': ['form', 'culture'],
  'field': ['field'],
  'film': ['story', 'motion', 'sound'],
  'finance': ['culture', 'mind'],
  'fitness': ['motion', 'culture'],
  'food': ['form', 'culture'],
  'food-delivery': ['motion', 'culture'],
  'fullgame': ['form', 'motion', 'sound', 'mind', 'story', 'world', 'culture', 'time'],
  'furniture': ['form'],
  'game': ['form', 'motion', 'sound', 'mind', 'story', 'world'],
  'gaming': ['form', 'motion', 'sound', 'mind', 'story', 'world'],
  'gardening': ['form', 'world'],
  'genome': ['form'],
  'genomics': ['form'],
  'geometry3d': ['form'],
  'healthcare': ['mind', 'culture'],
  'hospitality': ['culture'],
  'insurance': ['culture'],
  'interior-design': ['form', 'world'],
  'jewelry': ['form'],
  'journalism': ['story', 'culture'],
  'landscaping': ['form', 'world'],
  'legal': ['culture'],
  'lighting': ['field', 'form'],
  'literature': ['story', 'culture'],
  'logistics': ['motion', 'mind'],
  'marine': ['world', 'motion'],
  'market': ['culture'],
  'marketing': ['culture'],
  'material': ['form', 'field'],
  'media': ['story', 'culture'],
  'metaverse': ['world', 'form'],
  'ml': ['mind'],
  'molecule': ['form', 'field'],
  'music': ['sound', 'time'],
  'nanobot': ['form', 'motion'],
  'nanotechnology': ['form'],
  'narrative': ['story'],
  'neuroscience': ['mind'],
  'optics': ['field', 'form'],
  'particle': ['form', 'motion', 'field'],
  'particle-gpu': ['form', 'motion', 'field'],
  'personalized-medicine': ['mind'],
  'pet-care': ['culture'],
  'photography': ['form', 'culture'],
  'physics': ['field', 'motion'],
  'physics-enhanced': ['field', 'motion'],
  'procedural': ['form'],
  'protein': ['form'],
  'publishing': ['story', 'culture'],
  'quantum': ['field'],
  'quantum-circuit': ['field'],
  'quantum-computing': ['field', 'mind'],
  'reactor': ['field'],
  'real-estate': ['world', 'culture'],
  'renewable-energy': ['field'],
  'robotics': ['form', 'motion', 'mind'],
  'robotics-industrial': ['form', 'motion', 'mind'],
  'security': ['mind'],
  'semiconductors': ['form', 'field'],
  'sensors': ['field'],
  'shader': ['field', 'form'],
  'smart-grid': ['field', 'mind'],
  'smart-home': ['form', 'mind'],
  'space': ['world', 'form'],
  'space-tourism': ['world', 'motion'],
  'spirits': ['culture'],
  'sports': ['motion', 'culture'],
  'sprite': ['form'],
  'sprite-animated': ['form', 'motion', 'time'],
  'synthetic-biology': ['form'],
  'tea': ['culture'],
  'textiles': ['form'],
  'theater': ['story', 'motion', 'sound'],
  'tourism': ['world', 'culture'],
  'transportation': ['motion', 'world'],
  'typography': ['form', 'culture'],
  'ui': ['form'],
  'universe': ['world', 'form'],
  'vehicle': ['form', 'motion'],
  'visual2d': ['form'],
  'vr': ['form', 'world'],
  'wearables': ['form'],
  'website': ['form'],
  'wine': ['culture'],
  'world': ['world'],
};

interface MigrationResult {
  file: string;
  manifestAdded: boolean;
  castStripped: boolean;
  skippedReason?: string;
}

function domainFromFilename(filename: string): string {
  return filename.replace(/-contract\.ts$/, '');
}

function migrate(filePath: string, src: string): { src: string; result: MigrationResult } {
  const filename = filePath.split('/').pop()!;
  const domain = domainFromFilename(filename);
  const result: MigrationResult = { file: filePath, manifestAdded: false, castStripped: false };

  const strata = DOMAIN_STRATA[domain];
  if (!strata) {
    result.skippedReason = `no stratum classification for domain "${domain}"`;
    return { src, result };
  }

  let out = src;

  // 1. Insert strata + engineOwner via brace-depth scan.
  if (!out.includes('strata:')) {
    const exportIdx = out.search(/export const \w+QualityContract\b/);
    if (exportIdx === -1) {
      result.skippedReason = 'could not find `export const ...QualityContract` declaration';
      return { src, result };
    }
    // Find ` = {` after the export keyword.
    const eqBrace = out.indexOf('= {', exportIdx);
    if (eqBrace === -1) {
      result.skippedReason = 'could not find `= {` after export declaration';
      return { src, result };
    }
    // Scan forward, tracking string literals and template literals so braces inside them don't confuse the depth counter.
    let depth = 0;
    let i = eqBrace + 2; // start at the `{`
    let closeIdx = -1;
    let inStr: '"' | "'" | '`' | null = null;
    let inLineComment = false;
    let inBlockComment = false;
    while (i < out.length) {
      const c = out[i];
      const prev = out[i - 1];
      if (inLineComment) {
        if (c === '\n') inLineComment = false;
        i++;
        continue;
      }
      if (inBlockComment) {
        if (c === '/' && prev === '*') inBlockComment = false;
        i++;
        continue;
      }
      if (inStr) {
        if (c === '\\') { i += 2; continue; }
        if (c === inStr) inStr = null;
        i++;
        continue;
      }
      if (c === '/' && out[i + 1] === '/') { inLineComment = true; i += 2; continue; }
      if (c === '/' && out[i + 1] === '*') { inBlockComment = true; i += 2; continue; }
      if (c === '"' || c === "'" || c === '`') { inStr = c; i++; continue; }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) { closeIdx = i; break; }
      }
      i++;
    }
    if (closeIdx === -1) {
      result.skippedReason = 'unbalanced braces in export object literal';
      return { src, result };
    }
    // Insert manifest fields just before the closing brace. Make sure
    // the line above ends with a comma; if not, prepend one.
    const before = out.slice(0, closeIdx);
    const after = out.slice(closeIdx);
    const lastNonWS = before.replace(/[\s\n]+$/, '');
    const needsComma = !lastNonWS.endsWith(',');
    const stratList = strata.map((s) => `'${s}'`).join(', ');
    const prefix = needsComma ? ',\n' : '\n';
    const insertion = `${prefix}  // Doctrine v2 Part VI.10 — declared strata for the Substrate Conformance Index.\n  strata: [${stratList}] as const,\n  engineOwner: '${domain} engine custodian',\n`;
    out = before + insertion + after;
    result.manifestAdded = true;
  }

  // 2. Strip the outermost `as any` OR `as never` from `registerContract(...)`.
  const castPattern = /registerContract\((\w+)\s+as\s+(?:any|never)\)\s*;/g;
  if (castPattern.test(out)) {
    out = out.replace(/registerContract\((\w+)\s+as\s+(?:any|never)\)\s*;/g, 'registerContract($1);');
    result.castStripped = true;
  }

  return { src: out, result };
}

function listContractFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('-contract.ts'))
    .map((f) => join(dir, f))
    .sort();
}

function main(): void {
  const files = listContractFiles(ROOT);
  console.log(`Scanning ${files.length} contract files in ${ROOT}/`);
  console.log(`Mode: ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  let manifestAdded = 0;
  let castStripped = 0;
  const skipped: MigrationResult[] = [];

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const { src: outSrc, result } = migrate(file, src);

    if (result.skippedReason) {
      skipped.push(result);
      continue;
    }

    if (result.manifestAdded) manifestAdded++;
    if (result.castStripped) castStripped++;

    if (WRITE && (result.manifestAdded || result.castStripped) && outSrc !== src) {
      writeFileSync(file, outSrc);
    }
  }

  console.log(`Manifests added:   ${manifestAdded}/${files.length}`);
  console.log(`Casts stripped:    ${castStripped}/${files.length}`);
  console.log(`Skipped:           ${skipped.length}`);

  if (skipped.length > 0) {
    console.log('\nSkipped details:');
    for (const s of skipped.slice(0, 20)) {
      console.log(`  ${s.file}\n    reason: ${s.skippedReason}`);
    }
    if (skipped.length > 20) console.log(`  ... and ${skipped.length - 20} more`);
  }

  if (!WRITE) {
    console.log('\nDry-run complete. Pass --write to apply.');
  }
}

main();
