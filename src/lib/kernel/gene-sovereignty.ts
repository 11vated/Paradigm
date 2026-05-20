import crypto from 'crypto';
import { Xoshiro256StarStar } from './rng';
import { kernelNow, kernelNowIso } from './clock';

// ─── SIGNATURE HISTORY ENTRY ───────────────────────────────────────────────

export interface GeneSignatureEntry {
  hash: string;
  operation: 'create' | 'mutate' | 'breed' | 'compose' | 'license';
  signer: string;
  signerPubkey?: string;
  signature?: string;
  timestamp: string;
  previousValue?: any;
}

// ─── SOVEREIGN GENE VALUE ─────────────────────────────────────────────────

export interface SovereignGeneValue {
  value: any;
  type: string;
  ownership: {
    creator: string;
    creatorPubkey?: string;
    lineage: GeneSignatureEntry[];
    license?: GeneLicense;
  };
}

// ─── GENE LICENSE ─────────────────────────────────────────────────────────

export interface GeneLicense {
  type: 'public' | 'cc-by' | 'cc-by-nc' | 'cc-by-sa' | 'cc-by-nc-sa' | 'restricted' | 'custom';
  commercial?: boolean;
  attribution?: boolean;
  shareAlike?: boolean;
  derivatives?: boolean;
  customTerms?: string;
  expirationGenerations?: number;
  royaltyBps?: number;
}

// ─── SOVEREIGNTY OPERATIONS ───────────────────────────────────────────────

const EMPTY_SIG: GeneSignatureEntry = {
  hash: '', operation: 'create', signer: 'anonymous',
  timestamp: kernelNowIso(),
};

/**
 * Wrap a raw gene value in a sovereign wrapper with creator attribution.
 */
export function createSovereignGene(
  value: any,
  type: string,
  creator?: string,
  pubkey?: string,
): SovereignGeneValue {
  const entry: GeneSignatureEntry = {
    hash: crypto.createHash('sha256').update(JSON.stringify({ value, type, ts: kernelNow() })).digest('hex'),
    operation: 'create',
    signer: creator || 'anonymous',
    signerPubkey: pubkey,
    timestamp: kernelNowIso(),
  };

  return {
    value,
    type,
    ownership: {
      creator: creator || 'anonymous',
      creatorPubkey: pubkey,
      lineage: [entry],
      license: undefined,
    },
  };
}

/**
 * Record a mutation on a sovereign gene. Creates a new gene with the mutated
 * value and adds a mutation entry to the ownership lineage.
 */
export function mutateSovereignGene(
  gene: SovereignGeneValue,
  newValue: any,
  mutator: string,
  rng?: Xoshiro256StarStar,
): SovereignGeneValue {
  if (!gene || !gene.ownership) {
    return createSovereignGene(newValue, gene?.type || 'scalar', mutator);
  }

  const previousHash = gene.ownership.lineage.length > 0
    ? gene.ownership.lineage[gene.ownership.lineage.length - 1].hash
    : '';

  const entry: GeneSignatureEntry = {
    hash: crypto.createHash('sha256').update(
      previousHash + JSON.stringify(newValue) + mutator + kernelNow(),
    ).digest('hex'),
    operation: 'mutate',
    signer: mutator,
    previousValue: gene.value,
    timestamp: kernelNowIso(),
  };

  return {
    value: newValue,
    type: gene.type,
    ownership: {
      creator: gene.ownership.creator,
      creatorPubkey: gene.ownership.creatorPubkey,
      lineage: [...gene.ownership.lineage, entry],
      license: gene.ownership.license,
    },
  };
}

/**
 * Record a breeding (crossover) operation on a sovereign gene.
 * Merges ownership from both parents and records the crossover event.
 */
export function breedSovereignGenes(
  geneA: SovereignGeneValue,
  geneB: SovereignGeneValue,
  childValue: any,
  breeder: string,
): SovereignGeneValue {
  const hashA = geneA.ownership.lineage.length > 0
    ? geneA.ownership.lineage[geneA.ownership.lineage.length - 1].hash
    : 'gene-a-empty';
  const hashB = geneB.ownership.lineage.length > 0
    ? geneB.ownership.lineage[geneB.ownership.lineage.length - 1].hash
    : 'gene-b-empty';

  const entry: GeneSignatureEntry = {
    hash: crypto.createHash('sha256').update(hashA + hashB + JSON.stringify(childValue) + breeder).digest('hex'),
    operation: 'breed',
    signer: breeder,
    previousValue: { parentA: geneA.value, parentB: geneB.value },
    timestamp: kernelNowIso(),
  };

  return {
    value: childValue,
    type: geneA.type,
    ownership: {
      creator: breeder,
      lineage: [
        // Inherit full lineage from both parents
        ...geneA.ownership.lineage,
        ...geneB.ownership.lineage,
        entry,
      ],
      license: mergeLicenses(geneA.ownership.license, geneB.ownership.license),
    },
  };
}

/**
 * Set a license on a sovereign gene.
 */
export function licenseSovereignGene(
  gene: SovereignGeneValue,
  license: GeneLicense,
  licensor: string,
): SovereignGeneValue {
  const entry: GeneSignatureEntry = {
    hash: crypto.createHash('sha256').update(
      JSON.stringify(license) + licensor + kernelNow(),
    ).digest('hex'),
    operation: 'license',
    signer: licensor,
    timestamp: kernelNowIso(),
  };

  return {
    ...gene,
    ownership: {
      ...gene.ownership,
      license: { ...license },
      lineage: [...gene.ownership.lineage, entry],
    },
  };
}

/**
 * Get the full provenance chain for a sovereign gene.
 */
export function getGeneProvenance(gene: SovereignGeneValue): {
  creator: string;
  creatorPubkey?: string;
  history: GeneSignatureEntry[];
  license?: GeneLicense;
  currentValue: any;
} {
  return {
    creator: gene.ownership.creator,
    creatorPubkey: gene.ownership.creatorPubkey,
    history: gene.ownership.lineage,
    license: gene.ownership.license,
    currentValue: gene.value,
  };
}

/**
 * Check if a gene permits a given operation based on its license.
 */
export function checkGenePermission(
  gene: SovereignGeneValue,
  operation: 'mutate' | 'breed' | 'compose' | 'commercial',
  userId: string,
): { allowed: boolean; reason?: string } {
  const license = gene.ownership.license;
  if (!license) return { allowed: true };

  if (gene.ownership.creator === userId) return { allowed: true };

  switch (operation) {
    case 'commercial':
      if (license.commercial === false)
        return { allowed: false, reason: 'License prohibits commercial use' };
      break;
    case 'mutate':
    case 'breed':
      if (license.derivatives === false)
        return { allowed: false, reason: 'License prohibits derivative works' };
      break;
  }

  // Check generation expiry
  if (license.expirationGenerations !== undefined) {
    const generationCount = gene.ownership.lineage.filter(e =>
      e.operation === 'mutate' || e.operation === 'breed'
    ).length;
    if (generationCount >= license.expirationGenerations) {
      return { allowed: false, reason: `License expired after ${license.expirationGenerations} generations` };
    }
  }

  return { allowed: true };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────

function mergeLicenses(
  a?: GeneLicense,
  b?: GeneLicense,
): GeneLicense | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  // Most restrictive license wins
  return {
    type: 'restricted',
    commercial: a.commercial !== false && b.commercial !== false,
    attribution: a.attribution !== false && b.attribution !== false,
    derivatives: a.derivatives !== false && b.derivatives !== false,
    shareAlike: a.shareAlike || b.shareAlike,
  };
}

// ─── BACKWARD COMPATIBILITY ──────────────────────────────────────────────

/**
 * Check if a value is already a sovereign gene wrapper.
 */
export function isSovereignGene(value: any): value is SovereignGeneValue {
  return value && typeof value === 'object' && 'ownership' in value && 'lineage' in (value.ownership || {});
}

/**
 * Extract raw value from possibly-sovereign wrapper.
 */
export function extractValue(value: any): any {
  return isSovereignGene(value) ? value.value : value;
}

/**
 * Extract type from possibly-sovereign wrapper.
 */
export function extractType(value: any): string | undefined {
  return isSovereignGene(value) ? value.type : undefined;
}
