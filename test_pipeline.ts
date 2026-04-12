import { ParadigmPipeline } from './src/lib/pipeline/index.js';

async function test() {
  const seed = {
    id: "test-seed-1",
    $name: "Test Seed",
    $domain: "matter",
    genes: {
      core_power: { type: 'scalar', value: 80 },
      stability: { type: 'scalar', value: 80 },
      complexity: { type: 'scalar', value: 80 }
    }
  };
  
  const result = await ParadigmPipeline.runEndToEnd(seed);
  console.log("Assets:", Object.keys(result.emergent_assets));
  if (result.emergent_assets.mesh) {
    console.log("Vertices:", result.emergent_assets.mesh.vertices.length);
  }
}

test().catch(console.error);
