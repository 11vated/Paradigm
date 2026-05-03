/**
 * DevOps Generator — produces DevOps pipelines
 * CI/CD, infrastructure as code, monitoring
 * $0.3T market: DevOps
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface DevOpsParams {
  pipelineType: 'ci_cd' | 'iac' | 'monitoring' | 'full_stack';
  tools: string[];
  environments: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateDevOps(seed: Seed, outputPath: string): Promise<{ filePath: string; pipelinePath: string; pipelineType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    devops: { pipelineType: params.pipelineType, tools: params.tools, environments: params.environments, quality: params.quality },
    stages: ['build', 'test', 'deploy', 'monitor'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    automation: { coverage: rng.nextF64() * 0.5 + 0.5, scripts: Math.floor(rng.nextF64() * 50) + 10, containers: rng.nextF64() > 0.5 },
    metrics: { deploymentFreq: rng.nextF64() * 50 + 1, leadTime: rng.nextF64() * 24 + 1, mttr: rng.nextF64() * 4 + 0.5 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_devops.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const pipelinePath = outputPath.replace(/\.json$/, '_pipeline.yaml');
  fs.writeFileSync(pipelinePath, generateYAML(params, rng));

  return { filePath: jsonPath, pipelinePath, pipelineType: params.pipelineType };
}

function generateYAML(params: DevOpsParams, rng: Xoshiro256StarStar): string {
  return `pipeline:
  type: ${params.pipelineType}
  tools: ${params.tools.join(', ')}
  environments: ${params.environments}
  stages:
    - build
    - test
    - deploy
  # Paradigm GSPL — DevOps`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): DevOpsParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const allTools = ['Jenkins', 'GitHub Actions', 'GitLab CI', 'Terraform', 'Ansible', 'Kubernetes', 'Docker'];
  return {
    pipelineType: seed.genes?.pipelineType?.value || ['ci_cd', 'iac', 'monitoring', 'full_stack'][rng.nextInt(0, 3)],
    tools: (seed.genes?.tools as string[]) || allTools.slice(0, Math.floor(rng.nextF64() * 5) + 2),
    environments: Math.floor(((seed.genes?.environments?.value as number || rng.nextF64()) * 9) + 1),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
