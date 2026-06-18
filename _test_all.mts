import { initServerPolyfills } from './src/lib/kernel/server-polyfills';
initServerPolyfills();

const contracts = {
  character: () => import('./src/lib/kernel/generators/character-contract'),
  animation: () => import('./src/lib/kernel/generators/animation-contract'),
  geometry3d: () => import('./src/lib/kernel/generators/geometry3d-contract'),
  cosmology: () => import('./src/lib/kernel/generators/cosmology-contract'),
  field: () => import('./src/lib/kernel/generators/field-contract'),
  fullgame: () => import('./src/lib/kernel/generators/fullgame-contract'),
  molecule: () => import('./src/lib/kernel/generators/molecule-contract'),
  music: () => import('./src/lib/kernel/generators/music-contract'),
  quantum: () => import('./src/lib/kernel/generators/quantum-contract'),
  sprite: () => import('./src/lib/kernel/generators/sprite-contract'),
  visual2d: () => import('./src/lib/kernel/generators/visual2d-contract'),
  website: () => import('./src/lib/kernel/generators/website-contract'),
  world: () => import('./src/lib/kernel/generators/world-contract'),
};

type HashEntry = { contract: string; domain: string; version: string; seedName: string; hash: string };

async function main() {
  const entries: HashEntry[] = [];
  for (const [name, loader] of Object.entries(contracts)) {
    const mod = await loader();
    const c = mod[Object.keys(mod).find(k => k.endsWith('QualityContract')) as string] ?? Object.values(mod).find(v => v?.domain);
    if (!c || !c.curated || !c.hashArtifact) { console.log('SKIP', name); continue; }
    const seeds = c.curated();
    for (const s of seeds) {
      try {
        const art = await c.synthesize(s.seed);
        const hash = c.hashArtifact(art);
        entries.push({
          contract: name,
          domain: c.domain ?? name,
          version: c.version ?? '1.0.0',
          seedName: s.id ?? s.name ?? 'default',
          hash,
        });
        console.log('OK', name, s.id, hash.slice(0,16));
      } catch (e) {
        console.log('ERR', name, s.id, (e as Error).message.slice(0,80));
      }
    }
  }
  console.log('\n--- GOLDEN HASHES ---');
  for (const e of entries) {
    console.log(`${e.domain}@${e.version}/${e.seedName} ${e.hash}`);
  }
}

main();
