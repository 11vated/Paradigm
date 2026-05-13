// Local type definitions to avoid circular dependencies
// Mirrors the Seed class shape in seed-class.ts without importing it
export interface Seed {
  id?: string;
  hash?: string;
  $name?: string;
  $domain?: string;
  $hash?: string;
  $lineage?: { generation?: number; parents?: string[]; operators?: string[]; timestamp?: number };
  $fitness?: { overall?: number };
  metadata?: { name?: string; domain?: string; owner?: string; tags?: string[] };
  genes?: Record<string, { type?: string; value?: any; schema?: any }>;
  lineage?: { generation?: number; parents?: string[]; operators?: string[]; timestamp?: number };
  signature?: string;
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
