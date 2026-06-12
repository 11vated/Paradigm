/**
 * paradigm grow — Direct artifact generation from seed (bit-identical)
 * 
 * Thin wrapper over kernel + make for the common case.
 * Same seed + same code = identical bytes forever.
 */

import { paradigmMake, type MakeOptions, type MakeResult } from './make.ts';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface GrowOptions extends MakeOptions {
  format?: 'gltf' | 'json';
  pureGltf?: boolean;
}

export async function paradigmGrow(seed: string, opts: GrowOptions = {}): Promise<MakeResult> {
  return paradigmMake(seed, { ...opts, seed });
}

export default paradigmGrow;

// === CLI entrypoint support (for pnpm paradigm:grow) ===
if (process.argv[1] && (process.argv[1].endsWith('grow.ts') || process.argv[1].includes('grow'))) {
  (async () => {
    try {
      const rawArgs = process.argv.slice(2);
      let seed = 'testseed123';
      const opts: any = { domain: 'tree', format: 'gltf' as const };

      for (const a of rawArgs) {
        if (a.startsWith('--seed=')) seed = a.split('=')[1];
        if (a.startsWith('--domain=')) opts.domain = a.split('=')[1];
        if (a.startsWith('--format=')) opts.format = a.split('=')[1];
        if (a === '--pure-gltf' || a === '--pureGltf') opts.pureGltf = true;
      }

      const res = await paradigmGrow(seed, opts);

      const outDir = path.join(process.cwd(), 'artifacts');
      await fs.mkdir(outDir, { recursive: true });
      const safeSeed = seed.replace(/[^a-zA-Z0-9_-]/g, '_');
      const wrapperPath = path.join(outDir, `tree_${safeSeed}.gltf.json`);
      const pureGltfPath = path.join(outDir, `tree_${safeSeed}.gltf`);

      await fs.writeFile(wrapperPath, JSON.stringify(res, null, 2), 'utf8');

      const shouldPure = opts.pureGltf !== false; // default true for grow
      if (shouldPure && res.artifact && (res.artifact.asset || res.artifact.scenes || res.artifact.nodes)) {
        await fs.writeFile(pureGltfPath, JSON.stringify(res.artifact, null, 2), 'utf8');
        console.log('PURE_GLTF:' + pureGltfPath);
      }

      console.log('=== PARADIGM GROW RESULT ===');
      console.log('SEED:' + seed);
      console.log('HASH:' + res.hash);
      console.log('CONFORMANCE:' + res.conformance.toFixed(4));
      console.log('GLTF_PATH:' + wrapperPath);
      if (shouldPure) console.log('NOTE: pure GLTF emitted by default (use --no-pure or wrapper for full result)');
      console.log('=== END GROW ===');
    } catch (err: any) {
      console.error('GROW_FAILED:' + (err?.message || err));
      process.exit(1);
    }
  })();
}
