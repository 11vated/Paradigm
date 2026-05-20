#!/usr/bin/env -S npx tsx
import { evolveGames } from '../src/lib/game/evolution';

const r = evolveGames({ pop: 12, generations: 4, initialSeed: 'paradigm-evolve-demo' });

console.log('\\n=== Evolution history ===');
for (const h of r.history) {
  console.log(`  gen ${h.gen}: best=${h.bestScore.toFixed(3)}  mean=${h.meanScore.toFixed(3)}`);
}
console.log('\\n=== Best candidate ===');
console.log(`  friendSeed: ${r.best.friendSeed}`);
console.log(`  worldSeed:  ${r.best.worldSeed}`);
console.log(`  score:      ${r.best.fitness.score.toFixed(3)}`);
console.log(`  axes:       ${JSON.stringify(r.best.fitness.axes, null, 2)}`);

console.log('\\n=== Top 5 ===');
for (const c of r.topK.slice(0, 5)) {
  console.log(`  ${c.fitness.score.toFixed(3)}  ${c.friendSeed.slice(0, 24)} × ${c.worldSeed.slice(0, 24)}`);
}
