/**
 * Generator Fidelity Audit
 * Tests every domain engine and reports output richness.
 * Higher score = richer artifact output.
 * 
 * Usage: npx tsx scripts/audit-generators.ts
 */

import { growSeed } from '../src/lib/kernel/engines.ts';
import { UniversalSeed } from '../src/seeds/universal-seed.ts';

const DOMAINS = [
  'character', 'sprite', 'music', 'visual2d', 'geometry3d', 'fullgame',
  'animation', 'narrative', 'ui', 'physics', 'audio', 'ecosystem',
  'game', 'alife', 'shader', 'particle', 'procedural',
  'typography', 'architecture', 'vehicle', 'furniture', 'fashion',
  'robotics', 'circuit', 'food', 'choreography', 'agent'
];

function rateOutput(artifact: any): { rating: number; reason: string } {
  if (!artifact) return { rating: 1, reason: 'No output' };

  // Check for actual file/content vs metadata-only
  const hints = artifact.render_hints ?? {};
  const hasContent = artifact.artifact || artifact.data || artifact.buffer || artifact.uri;
  const hasFormat = artifact.format || artifact.type;
  const hasMetadata = Object.keys(hints).length > 0 || artifact.metadata;

  if (hasContent && hasFormat) {
    // Check for rich interactive content
    if (artifact.format === 'glb' || artifact.format === 'gltf') return { rating: 5, reason: '3D model' };
    if (artifact.format === 'wav' || artifact.format === 'midi') return { rating: 5, reason: 'Audio file' };
    if (artifact.format === 'png' || artifact.format === 'svg') return { rating: 5, reason: 'Image file' };
    if (artifact.format === 'html' || artifact.format?.startsWith('game')) return { rating: 5, reason: 'Playable game' };
    return { rating: 4, reason: `Has content (${artifact.format})` };
  }

  if (hasMetadata) {
    if (hints.viewportMode === '3d' || hints.viewportMode === 'game') return { rating: 3, reason: 'Rich metadata' };
    return { rating: 2, reason: 'Basic metadata' };
  }

  return { rating: 1, reason: 'Empty result' };
}

async function audit() {
  console.log('\n=== GENERATOR FIDELITY AUDIT ===\n');
  const results: { domain: string; rating: number; reason: string }[] = [];

  for (const domain of DOMAINS) {
    try {
      const seed = new UniversalSeed({
        metadata: {
          id: `audit-${domain}`,
          name: `Audit ${domain}`,
          version: '1.0.0',
          created: 0, updated: 0,
          tags: [domain],
          lineage: []
        }
      });

      const start = Date.now();
      const artifact = await growSeed(seed as any);
      const duration = Date.now() - start;
      const { rating, reason } = rateOutput(artifact);
      results.push({ domain, rating, reason });
      console.log(`  ${rating}/5  ${domain.padEnd(15)} ${reason.padEnd(25)} ${duration}ms`);
    } catch (e: any) {
      results.push({ domain, rating: 1, reason: e.message?.slice(0, 50) ?? 'Error' });
      console.log(`  1/5  ${domain.padEnd(15)} ERROR: ${(e.message ?? 'Unknown').slice(0, 50)}`);
    }
  }

  console.log('\n--- SUMMARY ---');
  const avg = results.reduce((s, r) => s + r.rating, 0) / results.length;
  const byRating = results.reduce((acc: Record<number, number>, r) => {
    acc[r.rating] = (acc[r.rating] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Average rating: ${avg.toFixed(2)}/5`);
  console.log(`Distribution: ${Object.entries(byRating).sort(([a], [b]) => Number(a) - Number(b)).map(([k, v]) => `${k}: ${v} domains`).join(', ')}`);
  console.log('1 = placeholder, 2 = metadata, 3 = rich metadata, 4 = content, 5 = full artifact');
}

audit().catch(console.error);
