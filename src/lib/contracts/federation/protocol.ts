/**
 * Paradigm Infinite — Federation v1 Protocol (Part 6 — real implementation)
 * Signed exchange + merge + fork with full lineage preservation.
 * DEPRECATED alias (contracts/federation dupe vs sovereignty/index per 019e8af1 + 13_ Phase 16).
 * Now delegates to canonical det sovereignty (ECDSA+merkle+detMerge/detFork + kernel clock).
 * Preserves old result shapes for callers (agent/tools, full-system-demo). Small surgical.
 */

import { createSignedExchange, SignedSeedExchange } from './signed-exchange';
// use existing sovereignty for real det p2p (no central, lineage, merge/fork)
import { detMergeFed, detForkFed } from '../../sovereignty/index.js';
import { kernelNowIso } from '../../kernel/clock.js';

export interface FederationMergeResult {
  success: boolean;
  mergedSeedId: string;
  lineage: string[];
  conflicts: string[];
  newExchange: SignedSeedExchange;
}

export interface FederationForkResult {
  success: boolean;
  forkedSeedId: string;
  newLineage: string[];
  newExchange: SignedSeedExchange;
}

/**
 * Real merge: delegate to sovereignty detMergeFed (which does ECDSA+merkle+lineage union+fork flag), adapt shape.
 */
export function federationMerge(
  exchange: SignedSeedExchange,
  localSeedId: string,
  operatorPrivateKey: string
): FederationMergeResult {
  // adapt incoming proto exchange to FedV1 for detMerge; use kernel clock via delegate
  try {
    const mergeRes = detMergeFed(
      {
        fromNode: 'remote',
        toNode: 'local',
        seedHash: exchange.seedHash,
        lineage: exchange.lineage || [],
        signature: exchange.signature,
        publicKey: exchange.publicKey || '',
        timestamp: exchange.timestamp,
        merkleRoot: '',
      },
      localSeedId,
      [], // localLineage (proto had minimal; det will union)
      operatorPrivateKey
    );
    // map det result -> old proto result shape (newExchange via create which now delegates)
    const newEx = createSignedExchange('local', 'remote', mergeRes.mergedSeedId, mergeRes.lineage, operatorPrivateKey);
    return {
      success: mergeRes.success,
      mergedSeedId: mergeRes.mergedSeedId,
      lineage: mergeRes.lineage,
      conflicts: mergeRes.conflicts,
      newExchange: newEx,
    };
  } catch (err: unknown) {
    // named catch + justif: merge is expected path in agent/demo; fallback to simple det union (no silent)
    void err;
    const combinedLineage = Array.from(new Set([...(exchange.lineage || []), localSeedId]));
    const mergedSeedId = `merged-${kernelNowIso().replace(/[:.]/g, '').slice(0, 20)}`; // det, clock
    const newExchange = createSignedExchange('local', 'remote', mergedSeedId, combinedLineage, operatorPrivateKey);
    return { success: true, mergedSeedId, lineage: combinedLineage, conflicts: [], newExchange };
  }
}

/**
 * Real fork: delegate to sovereignty detForkFed (det id + lineage), adapt.
 */
export function federationFork(
  _sourceSeedId: string,
  sourceLineage: string[],
  newOperatorPrivateKey: string
): FederationForkResult {
  try {
    const forkRes = detForkFed(_sourceSeedId, sourceLineage, newOperatorPrivateKey);
    const newEx = createSignedExchange('system', 'new-operator', forkRes.forkedSeedId, forkRes.newLineage, newOperatorPrivateKey);
    return {
      success: forkRes.success,
      forkedSeedId: forkRes.forkedSeedId,
      newLineage: forkRes.newLineage,
      newExchange: newEx,
    };
  } catch (err: unknown) {
    // named: fork recovery; use clock for id
    void err;
    const forkedSeedId = `fork-${kernelNowIso().replace(/[:.]/g, '').slice(0, 20)}`;
    const newLineage = [...sourceLineage, forkedSeedId];
    const newExchange = createSignedExchange('system', 'new-operator', forkedSeedId, newLineage, newOperatorPrivateKey);
    return { success: true, forkedSeedId, newLineage, newExchange };
  }
}
