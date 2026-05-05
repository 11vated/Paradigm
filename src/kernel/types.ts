export interface Seed {
  id: string;
  $domain: string;
  $name: string;
  $lineage: { generation: number; operation: string; parents?: string[] };
  $hash: string;
  $fitness: { overall: number };
  $sovereignty?: Record<string, unknown>;
  $embedding?: number[];
  genes: Record<string, { type: string; value: unknown }>;
  [key: string]: unknown;
}

export interface Gene {
  type: string;
  value: unknown;
  metadata?: {
    mutable?: boolean;
    dominant?: boolean;
    expressionRange?: [number, number];
    mutationRate?: number;
  };
}

export type GeneValue = string | number | boolean | object | null | undefined;

export interface GeneMetadata {
  name: string;
  description?: string;
  category?: string;
  mutable: boolean;
  dominant: boolean;
  hidden: boolean;
  locked: boolean;
  expressionRange?: [number, number];
  mutationRate?: number;
}

export type GeneType = 
  | 'STRUCTURE' 
  | 'COLOR' 
  | 'SHAPE' 
  | 'MOTION' 
  | 'AUDIO' 
  | 'TEXTURE' 
  | 'PATTERN' 
  | 'BEHAVIOR' 
  | 'INTERACTION' 
  | 'PHYSICS' 
  | 'MATERIAL' 
  | 'LIGHTING' 
  | 'ENVIRONMENT' 
  | 'ANIMATION' 
  | 'QUANTUM' 
  | 'GEMATRIA' 
  | 'LOGIC' 
  | 'DATA' 
  | 'META';