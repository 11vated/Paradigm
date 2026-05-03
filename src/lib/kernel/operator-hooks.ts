/**
 * Operator Hooks — Reconstructs Nexus "Hooks & Safety" for Paradigm
 * 
 * NEXUS CONCEPT: Pre/post execution hooks for safety checks, logging, pipeline processing
 * PARADIGM RECONSTRUCTION: Genetic operators as hook points
 * 
 * "Hooks" become genetic operator hooks:
 * - breed → preBreed, postBreed
 * - mutate → preMutate, postMutate  
 * - compose → preCompose, postCompose
 * - grow → preGrow, postGrow
 * - evolve → preEvolve, postEvolve
 */

import type { Seed, Artifact } from './types';

// ─── Hook Types (replace Nexus Hook system) ──────────
export type HookType = 
  | 'preBreed' | 'postBreed'
  | 'preMutate' | 'postMutate'
  | 'preCompose' | 'postCompose'
  | 'preGrow' | 'postGrow'
  | 'preEvolve' | 'postEvolve'
  | 'onFork' | 'onBreed' | 'onMutate' | 'onCompose' | 'onGrow';

export type HookHandler = (
  seed: Seed,
  context: HookContext
) => Promise<HookResult> | HookResult;

export interface HookContext {
  operation: string;
  timestamp: number;
  metadata?: Record<string, any>;
  // For operations with multiple seeds
  parentSeeds?: Seed[];
  childSeed?: Seed;
  // For grow operations
  artifact?: Artifact;
  // For evolve operations
  population?: Seed[];
  generation?: number;
}

export interface HookResult {
  continue: boolean; // false = block operation
  modifiedSeed?: Seed;
  metadata?: Record<string, any>;
  reason?: string; // Why blocked/modified
}

// ─── Hook Registry (replaces Nexus Hook registry) ──────
class OperatorHookSystem {
  private hooks: Map<HookType, HookHandler[]> = new Map();
  private auditLog: HookAuditEntry[] = [];

  /**
   * Register a hook (replaces Nexus hook registration)
   */
  registerHook(type: HookType, handler: HookHandler): void {
    if (!this.hooks.has(type)) {
      this.hooks.set(type, []);
    }
    this.hooks.get(type)!.push(handler);
  }

  /**
   * Unregister a hook
   */
  unregisterHook(type: HookType, handler: HookHandler): void {
    const handlers = this.hooks.get(type);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) {
        handlers.splice(idx, 1);
      }
    }
  }

  /**
   * Execute pre-operation hooks (replaces pre-execution hooks)
   */
  async executePreHooks(
    type: HookType,
    seed: Seed,
    context: HookContext
  ): Promise<HookResult> {
    const handlers = this.hooks.get(type) || [];
    
    for (const handler of handlers) {
      try {
        const result = await handler(seed, context);
        this.logAudit(type, seed, context, result);

        if (!result.continue) {
          return result; // Block operation
        }

        // Apply modification if provided
        if (result.modifiedSeed) {
          seed = result.modifiedSeed;
        }
      } catch (error) {
        console.error(`Hook error in ${type}:`, error);
      }
    }

    return { continue: true, modifiedSeed: seed };
  }

  /**
   * Execute post-operation hooks (replaces post-execution hooks)
   */
  async executePostHooks(
    type: HookType,
    seed: Seed,
    context: HookContext
  ): Promise<void> {
    const handlers = this.hooks.get(type) || [];
    
    for (const handler of handlers) {
      try {
        const result = await handler(seed, context);
        this.logAudit(type, seed, context, result);
      } catch (error) {
        console.error(`Post-hook error in ${type}:`, error);
      }
    }
  }

  /**
   * Log audit entry (replaces Nexus audit trail)
   */
  private logAudit(
    type: HookType,
    seed: Seed,
    context: HookContext,
    result: HookResult
  ): void {
    this.auditLog.push({
      hookType: type,
      seedHash: seed.$hash || '',
      operation: context.operation,
      timestamp: Date.now(),
      continued: result.continue,
      reason: result.reason,
    });

    // Trim log if too long
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  /**
   * Get audit log
   */
  getAuditLog(filter?: { hookType?: HookType; seedHash?: string }): HookAuditEntry[] {
    let entries = this.auditLog;

    if (filter?.hookType) {
      entries = entries.filter(e => e.hookType === filter.hookType);
    }

    if (filter?.seedHash) {
      entries = entries.filter(e => e.seedHash === filter.seedHash);
    }

    return entries;
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
    this.auditLog = [];
  }
}

// ─── Audit Entry ──────────────────────────────────────
interface HookAuditEntry {
  hookType: HookType;
  seedHash: string;
  operation: string;
  timestamp: number;
  continued: boolean;
  reason?: string;
}

// ─── Built-in Hooks (replace Nexus built-in hooks) ─────

/**
 * Safety Hook: Blocks dangerous operations
 * Replaces Nexus safety checks
 */
export const safetyHook: HookHandler = async (seed, context) => {
  // Check sovereignty genes
  if (context.operation === 'breed' && seed.genes?.can_breed?.value === false) {
    return {
      continue: false,
      reason: 'Seed cannot breed (can_breed=false)',
    };
  }

  if (context.operation === 'fork' && seed.genes?.can_fork?.value === false) {
    return {
      continue: false,
      reason: 'Seed cannot fork (can_fork=false)',
    };
  }

  // Check signature for destructive operations
  if (['evolve', 'breed', 'compose'].includes(context.operation)) {
    if (!seed.$provenance?.signature) {
      return {
        continue: false,
        reason: 'Operation requires signed seed',
      };
    }
  }

  return { continue: true };
};

/**
 * Logging Hook: Logs all operations
 * Replaces Nexus logging hooks
 */
export const loggingHook: HookHandler = async (seed, context) => {
  console.log(`[OperatorHook] ${context.operation} on seed ${seed.$hash?.substring(0, 8)}...`);
  return { continue: true };
};

/**
 * Validation Hook: Validates seed after mutation
 * Replaces Nexus validation hooks
 */
export const validationHook: HookHandler = async (seed, context) => {
  if (context.operation === 'mutate') {
    // Validate genes are within bounds
    const genes = seed.genes || {};
    
    for (const [key, gene] of Object.entries(genes)) {
      if (gene && typeof gene === 'object' && 'value' in gene) {
        const g = gene as any;
        if (typeof g.value === 'number') {
          if (g.value < 0 || g.value > 1) {
            return {
              continue: false,
              reason: `Gene ${key} out of bounds: ${g.value}`,
            };
          }
        }
      }
    }
  }

  return { continue: true };
};

/**
 * Lineage Hook: Updates lineage tracker automatically
 * Replaces Nexus state tracking
 */
export const lineageHook = (lineageTracker: any): HookHandler => {
  return async (seed, context) => {
    if (context.operation === 'fork' && context.childSeed) {
      // This would call lineageTracker.recordFork()
      console.log(`[Lineage] Recorded fork: ${seed.$hash} → ${context.childSeed.$hash}`);
    }
    return { continue: true };
  };
};

// ─── Export Singleton ─────────────────────────────────
export const operatorHooks = new OperatorHookSystem();

// Register built-in hooks
operatorHooks.registerHook('preBreed', safetyHook);
operatorHooks.registerHook('preMutate', safetyHook);
operatorHooks.registerHook('preGrow', safetyHook);
operatorHooks.registerHook('postMutate', validationHook);
operatorHooks.registerHook('postGrow', loggingHook);

// ─── Hook Integration Helpers ───────────────────────

/**
 * Wrap breed operation with hooks
 */
export async function breedWithHooks(
  parent1: Seed,
  parent2: Seed,
  child: Seed
): Promise<{ success: boolean; seed?: Seed; reason?: string }> {
  // Pre-breed hooks
  const preResult = await operatorHooks.executePreHooks('preBreed', parent1, {
    operation: 'breed',
    timestamp: Date.now(),
    parentSeeds: [parent1, parent2],
    childSeed: child,
  });

  if (!preResult.continue) {
    return { success: false, reason: preResult.reason };
  }

  // Operation would happen here...

  // Post-breed hooks
  await operatorHooks.executePostHooks('postBreed', child, {
    operation: 'breed',
    timestamp: Date.now(),
    parentSeeds: [parent1, parent2],
    childSeed: child,
  });

  return { success: true, seed: child };
}

/**
 * Wrap mutate operation with hooks
 */
export async function mutateWithHooks(
  seed: Seed,
  mutated: Seed
): Promise<{ success: boolean; seed?: Seed; reason?: string }> {
  // Pre-mutate hooks
  const preResult = await operatorHooks.executePreHooks('preMutate', seed, {
    operation: 'mutate',
    timestamp: Date.now(),
  });

  if (!preResult.continue) {
    return { success: false, reason: preResult.reason };
  }

  // Operation would happen here...

  // Post-mutate hooks
  await operatorHooks.executePostHooks('postMutate', mutated, {
    operation: 'mutate',
    timestamp: Date.now(),
  });

  return { success: true, seed: mutated };
}

/**
 * Wrap grow operation with hooks
 */
export async function growWithHooks(
  seed: Seed,
  artifact: Artifact
): Promise<{ success: boolean; artifact?: Artifact; reason?: string }> {
  // Pre-grow hooks
  const preResult = await operatorHooks.executePreHooks('preGrow', seed, {
    operation: 'grow',
    timestamp: Date.now(),
  });

  if (!preResult.continue) {
    return { success: false, reason: preResult.reason };
  }

  // Operation would happen here...

  // Post-grow hooks
  await operatorHooks.executePostHooks('postGrow', seed, {
    operation: 'grow',
    timestamp: Date.now(),
    artifact,
  });

  return { success: true, artifact };
}
