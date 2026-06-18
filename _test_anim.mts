import { initServerPolyfills } from './src/lib/kernel/server-polyfills';
initServerPolyfills();
import('./src/lib/kernel/generators/animation-contract').then(async (m) => {
  const c = m.AnimationQualityContract;
  for (const cur of c.curated()) {
    console.log('seed:', cur.id);
    try {
      const art = await c.synthesize(cur.seed);
      console.log('  hash:', c.hashArtifact(art).slice(0,16));
      console.log('  filePath length:', art.filePath?.length ?? 0);
      console.log('  visual type:', art.visual?.type);
      console.log('  has previewData:', !!art.previewData);
      const keys = Object.keys(art.meta ?? {});
      console.log('  meta keys:', keys.slice(0,10));
    } catch (e) {
      console.log('  ERROR:', (e as Error).message);
    }
  }
});
