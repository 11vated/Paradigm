import { runConformance } from './src/lib/kernel/quality-contract';
import { SpriteQualityContract } from './src/lib/kernel/generators/sprite-contract';
import { Visual2DQualityContract } from './src/lib/kernel/generators/visual2d-contract';

async function main() {
  const r1 = await runConformance(SpriteQualityContract);
  console.log('Sprite:', JSON.stringify(r1, null, 2));

  const r2 = await runConformance(Visual2DQualityContract);
  console.log('Visual2D:', JSON.stringify(r2, null, 2));
}

main().catch(console.error);
