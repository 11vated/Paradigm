/**
 * C2PA + Royalty Pipeline Integration
 * Gap 8: Wires provenance and royalty into artifact generation
 */

import type { Seed, Artifact } from './types';
import { buildC2PAManifest, type C2PAClaim } from './c2pa-manifest';
import { createDefaultRoyaltyConfig, type RoyaltyConfig } from './royalty-system';

export interface ProvenanceConfig {
  includeManifest: boolean;
  includeLineage: boolean;
  includeSignature: boolean;
}

export interface RoyaltyWiringConfig {
  autoCalculate: boolean;
  platformBps: number;
  creatorBps: number;
  ancestorSplits: number;
}

const DEFAULT_PROVENANCE: ProvenanceConfig = {
  includeManifest: true,
  includeLineage: true,
  includeSignature: true,
};

const DEFAULT_ROYALTY: RoyaltyWiringConfig = {
  autoCalculate: true,
  platformBps: 1000,
  creatorBps: 7000,
  ancestorSplits: 2000,
};

export function attachProvenance(
  artifact: Artifact,
  seed: Seed,
  config: ProvenanceConfig = DEFAULT_PROVENANCE
): Artifact {
  const metadata: Record<string, any> = {
    ...artifact,
    provenance: {} as any
  };

  if (config.includeManifest) {
    const manifest = buildC2PAManifest(
      seed,
      artifact.domain || seed.$domain || 'unknown'
    );
    metadata.provenance.manifest = manifest;
    metadata.provenance.hasC2PA = true;
  }

  if (config.includeLineage && seed.$lineage) {
    metadata.provenance.lineage = {
      operation: seed.$lineage.operation,
      generation: seed.$lineage.generation,
      parents: seed.$lineage.parents || []
    };
  }

  if (config.includeSignature && seed.$signature) {
    metadata.provenance.signature = seed.$signature;
    metadata.provenance.signed = true;
  }

  metadata.provenance.seedHash = seed.$hash;
  metadata.provenance.timestamp = new Date().toISOString();

  return metadata as Artifact;
}

export function attachRoyalty(
  artifact: Artifact,
  seed: Seed,
  config: RoyaltyWiringConfig = DEFAULT_ROYALTY
): Artifact {
  const metadata: Record<string, any> = {
    ...artifact
  };

  if (config.autoCalculate) {
    const lineage = seed.$lineage?.parents || [];
    
    const royalty: RoyaltyConfig = {
      version: '1.0',
      seedHash: seed.$hash || '',
      platformBps: config.platformBps,
      primarySplits: [
        {
          address: 'CREATOR_WALLET',
          bps: config.creatorBps,
          label: 'Creator'
        }
      ],
      ancestorSplits: lineage.slice(0, 5).map((hash, idx) => ({
        address: `ANCESTOR_${idx}`,
        bps: Math.floor(config.ancestorSplits / Math.max(1, lineage.length)),
        label: `Ancestor ${idx + 1}`
      }))
    };

    metadata.royalty = royalty;
    metadata.royaltyEnabled = true;
  }

  return metadata as Artifact;
}

export function attachProvenanceAndRoyalty(
  artifact: Artifact,
  seed: Seed,
  provenanceConfig?: ProvenanceConfig,
  royaltyConfig?: RoyaltyWiringConfig
): Artifact {
  let result = attachProvenance(artifact, seed, provenanceConfig);
  result = attachRoyalty(result, seed, royaltyConfig);
  return result;
}

export interface GrowWithProvenanceOptions {
  includeC2PA?: boolean;
  includeLineage?: boolean;
  includeSignature?: boolean;
  calculateRoyalty?: boolean;
  platformBps?: number;
  creatorBps?: number;
}

export const DEFAULT_GROW_OPTIONS: GrowWithProvenanceOptions = {
  includeC2PA: true,
  includeLineage: true,
  includeSignature: false,
  calculateRoyalty: true,
  platformBps: 1000,
  creatorBps: 7000
};

export function growWithProvenance(
  artifact: Artifact,
  seed: Seed,
  options: GrowWithProvenanceOptions = DEFAULT_GROW_OPTIONS
): Artifact {
  const provenanceConfig: ProvenanceConfig = {
    includeManifest: options.includeC2PA ?? true,
    includeLineage: options.includeLineage ?? true,
    includeSignature: options.includeSignature ?? false,
  };

  const royaltyConfig: RoyaltyWiringConfig = {
    autoCalculate: options.calculateRoyalty ?? true,
    platformBps: options.platformBps ?? 1000,
    creatorBps: options.creatorBps ?? 7000,
    ancestorSplits: 2000
  };

  return attachProvenanceAndRoyalty(artifact, seed, provenanceConfig, royaltyConfig);
}