import { ParticleQualityContract } from '../src/lib/kernel/generators/particle-contract.js';
import * as fs from 'fs';
import * as path from 'path';

async function captureGoldenParticles() {
  console.log('=== PARTICLE GOLDEN HASH CAPTURE (Doctrine v2) ===');
  console.log('Targets from CURATED in particle-contract.ts\n');

  const targets = ParticleQualityContract.curated();

  const results: Record<string, string> = {};

  for (const t of targets) {
    try {
      const artifact = await ParticleQualityContract.synthesize(t.seed as any);
      const hash = ParticleQualityContract.hashArtifact(artifact);

      results[t.id] = hash;

      console.log(`${t.id.padEnd(22)} ${hash}`);
      console.log(`  name: ${t.name}`);
      console.log(`  intent: ${t.intent}`);
      console.log('');
    } catch (err: any) {
      console.error(`Failed for ${t.id}: ${err.message}`);
    }
  }

  const goldenFixture = {
    generatedAt: new Date().toISOString(),
    generator: 'particle (CANONICAL)',
    targets: results,
    note: 'Pin these hashes for regression in golden corpus. Run this script and commit the output when stable.'
  };

  const outDir = 'golden';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, 'particle-golden-hashes.json');
  fs.writeFileSync(outFile, JSON.stringify(goldenFixture, null, 2));

  console.log(`\nGolden fixture written to ${outFile}`);
  console.log('Next: commit the hashes when they are stable across runs.');
}

captureGoldenParticles().catch(console.error);
