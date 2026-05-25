export { UniversalSeed } from './universal-seed';
export { GeneType, GENE_TYPE_DEFINITIONS, getGeneTypeDefinition, getAllGeneTypes, getGeneTypeNames } from './types';
import { GeneType } from './types';
export type { GeneSchema, GeneMetadata, GeneValue } from './types';
export type { SeedMetadata, SeedExpression, SeedDerivation, SerializedSeed } from './universal-seed';

(globalThis as any).geneTypes = Object.values(GeneType);

export interface Seed {
  $name?: string;
  $domain?: string;
  $hash?: string;
  $lineage?: { generation?: number; operation?: string; parents?: string[] };
  genes?: Record<string, { type?: string; value?: unknown }>;
  [key: string]: unknown;
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
export {
  UNSEEN_CHANNELS,
  DIMENSIONS,
  STANDARD_CONSTANTS,
  createRealitySeed,
  deriveRealitySeedHash,
  realityToFieldKind,
} from './reality-seed';
export type {
  RealitySeed,
  UnseenChannel,
  Dimension,
  FundamentalConstants,
  CreateRealitySeedOptions,
} from './reality-seed';
