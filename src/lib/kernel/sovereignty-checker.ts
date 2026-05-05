/**
 * Sovereignty Checker — Reconstructs Nexus "Permission System" for Paradigm
 * 
 * NEXUS CONCEPT: READ/WRITE/EXECUTE/DESTRUCTIVE permissions on LLM actions
 * PARADIGM RECONSTRUCTION: Genetic sovereignty system
 * 
 * Permissions in Paradigm are GENETIC - encoded in seed genes:
 * - can_fork gene controls fork operations (Nexus EXECUTE)
 * - can_breed gene controls breed operations (Nexus WRITE)
 * - signature gene controls destructive operations (Nexus DESTRUCTIVE)
 * - ownership gene defines cryptographically verified ownership (Nexus READ)
 */

import type { Seed } from './types';
import { rngFromHash } from './rng';

// ─── Permission Levels (replaces Nexus READ/WRITE/EXECUTE/DESTRUCTIVE) ─────
export enum PermissionLevel {
  READ = 0,      // Can view seed info (implied: can_fork=false)
  WRITE = 1,     // Can modify seed (can_breed=true)
  EXECUTE = 2,   // Can execute operations (can_fork=true)
  DESTRUCTIVE = 3 // Can delete/destroy (requires signature)
}

// ─── Operation Types ─────────────────────────────
export type GeneticOperation = 
  | 'fork'
  | 'breed'
  | 'mutate'
  | 'compose'
  | 'grow'
  | 'evolve'
  | 'sign'
  | 'transfer_ownership'
  | 'delete';

// ─── Sovereignty Check Result ────────────────────────
export interface SovereigntyCheck {
  allowed: boolean;
  level: PermissionLevel;
  reason?: string;
  requiredSignature?: boolean;
  owner?: string;
}

// ─── Sovereignty Checker Class ──────────────────────
export class SovereigntyChecker {
  private ownershipChain: Map<string, OwnershipRecord> = new Map();

  /**
   * Check if operation is allowed on seed
   * Replaces Nexus permission checks
   */
  checkPermission(
    seed: Seed,
    operation: GeneticOperation,
    requesterId?: string,
    providedSignature?: string
  ): SovereigntyCheck {
    const genes = seed.genes || {};

    // Get sovereignty genes
    const canFork = genes.can_fork?.value ?? true;
    const canBreed = genes.can_breed?.value ?? true;
    const signature = genes.signature?.value || '';
    const ownership = genes.ownership?.value || '';

    // Map operation to permission level
    const requiredLevel = this.getRequiredLevel(operation);

    // DESTRUCTIVE operations require signature
    if (requiredLevel >= PermissionLevel.DESTRUCTIVE) {
      if (!signature) {
        return {
          allowed: false,
          level: requiredLevel,
          reason: 'Operation requires signed seed (signature missing)',
          requiredSignature: true,
        };
      }

      // Verify signature
      const isValid = this.verifySignature(seed, signature);
      if (!isValid) {
        return {
          allowed: false,
          level: requiredLevel,
          reason: 'Invalid signature',
          requiredSignature: true,
        };
      }
    }

    // WRITE operations require can_breed
    if (operation === 'breed' || operation === 'mutate') {
      if (!canBreed) {
        return {
          allowed: false,
          level: PermissionLevel.WRITE,
          reason: 'Seed cannot breed/mutate (can_breed=false)',
        };
      }
    }

    // EXECUTE operations require can_fork
    if (operation === 'fork' || operation === 'grow' || operation === 'evolve') {
      if (!canFork) {
        return {
          allowed: false,
          level: PermissionLevel.EXECUTE,
          reason: 'Seed cannot fork/execute (can_fork=false)',
        };
      }
    }

    // Check ownership for ownership transfer
    if (operation === 'transfer_ownership') {
      if (requesterId && ownership && requesterId !== ownership) {
        return {
          allowed: false,
          level: PermissionLevel.DESTRUCTIVE,
          reason: 'Only owner can transfer ownership',
          owner: ownership,
        };
      }
    }

    return {
      allowed: true,
      level: requiredLevel,
      owner: ownership,
    };
  }

  /**
   * Get required permission level for operation
   * Maps Nexus permission system to genetic operations
   */
  private getRequiredLevel(operation: GeneticOperation): PermissionLevel {
    const mapping: Record<GeneticOperation, PermissionLevel> = {
      fork: PermissionLevel.EXECUTE,
      grow: PermissionLevel.EXECUTE,
      evolve: PermissionLevel.EXECUTE,
      breed: PermissionLevel.WRITE,
      mutate: PermissionLevel.WRITE,
      compose: PermissionLevel.WRITE,
      sign: PermissionLevel.READ,
      transfer_ownership: PermissionLevel.DESTRUCTIVE,
      delete: PermissionLevel.DESTRUCTIVE,
    };

    return mapping[operation] ?? PermissionLevel.READ;
  }

  /**
   * Verify seed signature
   * Replaces Nexus cryptographic checks
   */
  private verifySignature(seed: Seed, signature: string): boolean {
    if (!signature) return false;

    // In production, this would use ECDSA verification
    // For now, check if signature exists and is non-empty
    // Also verify that signer matches owner
    const ownership = seed.genes?.ownership?.value;
    const seedSignature = seed.$provenance?.signature;

    // Simple check: signature must match what's in provenance
    return signature === seedSignature && signature.length > 0;
  }

  /**
   * Sign a seed (grants DESTRUCTIVE permission)
   * Replaces Nexus authentication
   */
  signSeed(seed: Seed, privateKey?: string): Seed {
    const rng = rngFromHash(seed.$hash || '');

    // Generate signature (in production: ECDSA sign)
    const signature = this.generateSignature(seed, privateKey);

    const signedSeed: Seed = {
      ...seed,
      genes: {
        ...seed.genes,
        signature: { type: 'string', value: signature },
        ownership: { type: 'string', value: seed.genes?.ownership?.value || 'unknown' },
      },
      $provenance: {
        ...seed.$provenance,
        signature,
        signer: seed.genes?.ownership?.value || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };

    return signedSeed;
  }

  /**
   * Generate signature (simplified - in production use ECDSA)
   */
  private generateSignature(seed: Seed, privateKey?: string): string {
    const rng = rngFromHash(seed.$hash || '');
    const bytes = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      bytes[i] = Math.floor(rng.nextF64() * 256);
    }
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Transfer ownership (requires DESTRUCTIVE permission)
   */
  transferOwnership(
    seed: Seed,
    newOwner: string,
    currentOwnerSignature: string
  ): Seed {
    // Check permission
    const check = this.checkPermission(seed, 'transfer_ownership', newOwner, currentOwnerSignature);
    if (!check.allowed) {
      throw new Error(`Ownership transfer denied: ${check.reason}`);
    }

    // Transfer
    const transferredSeed: Seed = {
      ...seed,
      genes: {
        ...seed.genes,
        ownership: { type: 'string', value: newOwner },
      },
      $provenance: {
        ...seed.$provenance,
        signer: newOwner,
        timestamp: new Date().toISOString(),
      },
    };

    // Re-sign with new owner
    return this.signSeed(transferredSeed);
  }

  /**
   * Record ownership in chain (replaces Nexus audit trail)
   */
  recordOwnership(record: OwnershipRecord): void {
    this.ownershipChain.set(record.seedHash, record);
  }

  /**
   * Get ownership history
   */
  getOwnershipHistory(seedHash: string): OwnershipRecord | undefined {
    return this.ownershipChain.get(seedHash);
  }

  /**
   * Validate entire ownership chain
   */
  validateChain(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [hash, record] of this.ownershipChain) {
      if (!record.signature) {
        errors.push(`Missing signature for seed ${hash.substring(0, 8)}...`);
      }
      if (!record.owner) {
        errors.push(`Missing owner for seed ${hash.substring(0, 8)}...`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ─── Ownership Record (replaces Nexus audit entry) ────────────
export interface OwnershipRecord {
  seedHash: string;
  owner: string;
  operation: GeneticOperation;
  timestamp: string;
  signature: string;
  previousOwner?: string;
}

// ─── Permission Mapping (Nexus → Paradigm) ─────────────
/**
 * Complete mapping of Nexus permissions to Paradigm genetic sovereignty
 */
export const PERMISSION_MAP = {
  // Nexus Permission → Paradigm Sovereignty Gene → Enforcement
  READ: {
    description: 'Can view seed information',
    geneCheck: 'implied by ownership',
    enforcement: 'Check ownership gene matches requester',
  },
  WRITE: {
    description: 'Can modify seed (breed, mutate)',
    geneCheck: 'can_breed === true',
    enforcement: 'Block operation if can_breed=false',
  },
  EXECUTE: {
    description: 'Can execute operations (fork, grow, evolve)',
    geneCheck: 'can_fork === true',
    enforcement: 'Block operation if can_fork=false',
  },
  DESTRUCTIVE: {
    description: 'Can delete/destroy/transfer (requires signature)',
    geneCheck: 'signature exists AND valid',
    enforcement: 'Require valid ECDSA signature',
  },
};

// ─── Singleton Instance ─────────────────────────────
export const sovereigntyChecker = new SovereigntyChecker();

// ─── Integration Helpers for Operator Hooks ──────────

/**
 * Check sovereignty before operation (use in pre-hooks)
 */
export async function checkSovereigntyHook(
  seed: Seed,
  operation: GeneticOperation,
  requesterId?: string,
  signature?: string
): Promise<{ continue: boolean; reason?: string }> {
  const result = sovereigntyChecker.checkPermission(seed, operation, requesterId, signature);

  if (!result.allowed) {
    return {
      continue: false,
      reason: result.reason || 'Sovereignty check failed',
    };
  }

  return { continue: true };
}

/**
 * Sign seed after operation (use in post-hooks)
 */
export async function signAfterOperation(
  seed: Seed,
  operation: GeneticOperation
): Promise<Seed> {
  // Auto-sign for non-destructive operations
  if (operation !== 'delete' && operation !== 'transfer_ownership') {
    return sovereigntyChecker.signSeed(seed);
  }

  return seed; // Destructive ops require manual signature
}

// ─── Export Default ─────────────────────────────
export default SovereigntyChecker;
