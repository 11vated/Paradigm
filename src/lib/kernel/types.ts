// Local type definitions to avoid circular dependencies
export interface Seed {
  $name?: string;
  $domain?: string;
  $hash?: string;
  $lineage?: { generation?: number };
  genes?: Record<string, { type?: string; value?: any }>;
  [key: string]: any;
}

export interface Artifact {
  type: string;
  name: string;
  domain: string;
  seed_hash: string;
  generation: number;
  render_hints: Record<string, any>;
  [key: string]: any;
}

export type GeneratorOutput = any;

export interface SeedRouterConfig {
  domains?: string[];
  fallback?: string;
}

export interface SeedGraphNode {
  id: string;
  seed: Seed;
  source?: string;
  functor?: string;
}

export interface SeedGraphEdge {
  from: string;
  to: string;
  type: string;
}
