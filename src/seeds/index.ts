export { UniversalSeed } from './universal-seed';
export { GeneType, GeneSchema, GeneMetadata, GeneValue, GENE_TYPE_DEFINITIONS, getGeneTypeDefinition, getAllGeneTypes, getGeneTypeNames } from './types';
export { SeedMetadata, SeedExpression, SeedDerivation, SerializedSeed } from './universal-seed';

export interface Seed {
  $name?: string;
  $domain?: string;
  $hash?: string;
  $lineage?: { generation?: number; operation?: string; parents?: string[] };
  genes?: Record<string, { type?: string; value?: any }>;
  [key: string]: any;
}

export function createSeed(partial: Partial<Seed>): Seed {
  return {
    $name: partial.$name,
    $domain: partial.$domain,
    $hash: partial.$hash,
    $lineage: partial.$lineage,
    genes: partial.genes,
    ...partial,
  };
}