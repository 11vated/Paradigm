import { runConformance } from './src/lib/kernel/quality-contract';
import { VehicleQualityContract } from './src/lib/kernel/generators/vehicle-contract';

async function main() {
  const result = await runConformance(VehicleQualityContract);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
