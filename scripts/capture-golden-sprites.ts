import { SpriteQualityContract } from '../src/lib/kernel/generators/sprite-contract.js';
import * as fs from 'fs';
import * as path from 'path';

async function captureGoldenSprites() {
  console.log('=== SPRITE GOLDEN HASH CAPTURE (Doctrine v2) ===');
  console.log('Targets from CURATED in sprite-contract.ts\n');

  const targets = SpriteQualityContract.curated();

  const results: Record<string, string> = {};

  for (const t of targets) {
    try {
      const artifact = await SpriteQualityContract.synthesize(t.seed as any);
      const hash = SpriteQualityContract.hashArtifact(artifact);

      results[t.id] = hash;

      console.log(`${t.id.padEnd(20)} ${hash}`);
      console.log(`  name: ${t.name}`);
      console.log(`  intent: ${t.intent}`);
      console.log(`  pngBytes: ${artifact.pngBuffer.length}, frames: ${artifact.meta.frames}`);
      console.log('');
    } catch (err: any) {
      console.error(`Failed for ${t.id}: ${err.message}`);
    }
  }

  // Output ready-to-paste golden fixture
  const goldenFixture = {
    generatedAt: new Date().toISOString(),
    generator: 'sprite (CANONICAL)',
    targets: results,
    note: 'Pin these hashes for regression in golden corpus. Run this script and commit the output when stable.'
  };

  const outDir = 'golden';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, 'sprite-golden-hashes.json');
  fs.writeFileSync(outFile, JSON.stringify(goldenFixture, null, 2));

  console.log(`\nGolden fixture written to ${outFile}`);
  console.log('Next: commit the hashes when they are stable across runs.');
}

captureGoldenSprites().catch(console.error);
