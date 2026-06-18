import { initServerPolyfills } from './src/lib/kernel/server-polyfills';
initServerPolyfills();
import('./src/lib/kernel/generators/geometry3d-contract').then(async (m) => {
  const c = m.Geometry3DQualityContract;
  const seeds = c.curated().map(s => s.seed);
  console.log('seeds:', seeds.length);
  for (const s of seeds) {
    console.log('synthesizing:', s);
    try {
      const art = await c.synthesize(s);
      console.log('✓', c.hashArtifact(art).slice(0,16));
    } catch (e) {
      console.log('✗', s, (e as Error).message);
    }
  }
});
