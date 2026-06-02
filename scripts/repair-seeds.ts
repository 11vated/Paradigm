import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { resolveDomain } from '../src/lib/kernel/domain-constants';

interface Seed {
  id: string;
  $domain?: string;
  $name?: string;
  genes?: Record<string, any>;
  [key: string]: any;
}

interface RepairResult {
  seedId: string;
  originalDomain: string | undefined;
  newDomain: string | null;
  action: 'kept' | 'remapped' | 'removed' | 'unknown';
  warnings: string[];
}

function findClosestDomain(input: string): string | null {
  return resolveDomain(input);
}

function validateAndRepairSeed(seed: Seed): RepairResult {
  const originalDomain = seed.$domain;
  const warnings: string[] = [];

  if (!originalDomain) {
    return { seedId: seed.id, originalDomain, newDomain: null, action: 'removed', warnings: ['No domain field'] };
  }

  const canonical = findClosestDomain(originalDomain);
  if (!canonical) {
    return { seedId: seed.id, originalDomain, newDomain: null, action: 'removed', warnings: [`Unknown domain: "${originalDomain}"`] };
  }

  if (canonical !== originalDomain) {
    seed.$domain = canonical;
    // Recompute hash
    seed.$hash = crypto.createHash('sha256').update(JSON.stringify(seed.genes ?? {}) + canonical).digest('hex');
    return { seedId: seed.id, originalDomain, newDomain: canonical, action: 'remapped', warnings: [`${originalDomain} → ${canonical}`] };
  }

  // Check genes for invalid types
  if (seed.genes) {
    const GENE_TYPES = new Set([
      'scalar', 'categorical', 'vector', 'expression', 'struct', 'array',
      'graph', 'topology', 'temporal', 'regulatory', 'field', 'symbolic',
      'quantum', 'gematria', 'resonance', 'dimensional', 'sovereignty',
    ]);
    for (const [name, gene] of Object.entries(seed.genes)) {
      if (typeof gene === 'object' && gene && 'type' in gene) {
        const gt = (gene as any).type;
        if (typeof gt === 'string' && !GENE_TYPES.has(gt)) {
          warnings.push(`Gene "${name}" has unknown type "${gt}"`);
        }
      }
    }
  }

  return { seedId: seed.id, originalDomain, newDomain: originalDomain, action: 'kept', warnings };
}

async function main() {
  const dataDir = path.join(process.cwd(), 'data');
  const seedFile = path.join(dataDir, 'user-seeds.json');
  const backupFile = path.join(dataDir, `user-seeds.json.backup.${Date.now()}.json`);

  if (!fs.existsSync(seedFile)) {
    console.log('No seed data file found at', seedFile);
    return;
  }

  // Backup
  fs.copyFileSync(seedFile, backupFile);
  console.log(`Backed up to ${backupFile}`);

  const raw = fs.readFileSync(seedFile, 'utf-8');
  const seeds: Seed[] = JSON.parse(raw);
  console.log(`Found ${seeds.length} seeds to validate\n`);

  const results: RepairResult[] = seeds.map(validateAndRepairSeed);

  const kept = results.filter(r => r.action === 'kept');
  const remapped = results.filter(r => r.action === 'remapped');
  const removed = results.filter(r => r.action === 'removed');
  const withWarnings = results.filter(r => r.warnings.length > 0);

  if (removed.length > 0) {
    console.log(`\n❌ ${removed.length} seeds could not be repaired — removing from store:`);
    for (const r of removed) {
      console.log(`   ${r.seedId}: ${r.originalDomain} — ${r.warnings.join('; ')}`);
    }
  }

  if (remapped.length > 0) {
    console.log(`\n🔄 ${remapped.length} seeds had domains remapped:`);
    for (const r of remapped) {
      console.log(`   ${r.seedId}: ${r.originalDomain} → ${r.newDomain}`);
    }
  }

  if (withWarnings.length > 0) {
    console.log(`\n⚠️  ${withWarnings.length} seeds have issues:`);
    for (const r of withWarnings) {
      if (r.warnings.length > 0 && r.action === 'kept') {
        console.log(`   ${r.seedId} (${r.newDomain}): ${r.warnings.join('; ')}`);
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total seeds:   ${seeds.length}`);
  console.log(`   Healthy:       ${kept.length}`);
  console.log(`   Remapped:      ${remapped.length}`);
  console.log(`   Removed:       ${removed.length}`);

  // Write repaired seeds (filter out unrecoverable)
  const repairedSeeds = seeds.filter((_, i) => results[i].action !== 'removed');
  fs.writeFileSync(seedFile, JSON.stringify(repairedSeeds, null, 2));
  console.log(`\n✅ Wrote ${repairedSeeds.length} repaired seeds to ${seedFile}`);
}

main().catch(console.error);
