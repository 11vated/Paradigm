import { ParadigmPipeline } from './src/lib/pipeline/index.js';

const seed = {
  id: "test",
  $domain: "character",
  $name: "Test Seed",
  genes: {
    core_power: { value: 80 },
    complexity: { value: 80 },
    stability: { value: 80 }
  }
};

async function run() {
  const result = await ParadigmPipeline.runEndToEnd(seed);
  console.log("has emergent mesh:", result.emergent_assets?.mesh?.vertices?.length > 0);
}
run();
