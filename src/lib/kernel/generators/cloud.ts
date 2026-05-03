/**
 * Cloud Generator — produces cloud infrastructure
 * AWS/Azure/GCP, kubernetes, serverless
 * $0.5T market: Cloud Computing
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface CloudParams {
  provider: 'aws' | 'azure' | 'gcp' | 'multi_cloud';
  services: string[];
  region: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateCloud(seed: Seed, outputPath: string): Promise<{ filePath: string; diagramPath: string; provider: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    cloud: { provider: params.provider, services: params.services, region: params.region, quality: params.quality },
    infrastructure: { vms: Math.floor(rng.nextF64() * 100) + 10, storage: rng.nextF64() * 1000 + 100, bandwidth: rng.nextF64() * 10 + 1 },
    kubernetes: { clusters: Math.floor(rng.nextF64() * 10) + 1, nodes: Math.floor(rng.nextF64() * 100) + 10, pods: Math.floor(rng.nextF64() * 1000) + 100 },
    economics: { monthlyCost: rng.nextF64() * 100000 + 10000, reserved: rng.nextF64() > 0.5, spot: rng.nextF64() > 0.3 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_cloud.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const diagramPath = outputPath.replace(/\.json$/, '_diagram.svg');
  fs.writeFileSync(diagramPath, generateSVG(params, rng));

  return { filePath: jsonPath, diagramPath, provider: params.provider };
}

function generateSVG(params: CloudParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a1a2a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">Cloud: ${params.provider.toUpperCase()}</text>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${i%4*170+80}" y="${Math.floor(i/4)*220+80}" width="150" height="150" fill="#1a2a3a" stroke="#4a4" stroke-width="1"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Cloud</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): CloudParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const allServices = ['EC2', 'S3', 'Lambda', 'RDS', 'DynamoDB', 'Kubernetes', 'Container Registry'];
  return {
    provider: seed.genes?.provider?.value || ['aws', 'azure', 'gcp', 'multi_cloud'][rng.nextInt(0, 3)],
    services: (seed.genes?.services as string[]) || allServices.slice(0, Math.floor(rng.nextF64() * 5) + 2),
    region: seed.genes?.region?.value || ['us-east-1', 'eu-west-1', 'ap-southeast-1'][rng.nextInt(0, 2)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
