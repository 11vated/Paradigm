/**
 * Lineage Tracker — Reconstructs Nexus "Conversation Branching" for Paradigm
 * 
 * NEXUS CONCEPT: Fork conversations to explore different paths
 * PARADIGM RECONSTRUCTION: Seed lineages via genetic operations
 * 
 * "Branching" in Paradigm = Fork/Mutate/Breed/Compose operations
 * Lineage graph tracks all genetic operations on seeds
 */

import type { Seed } from './types';
import { rngFromHash } from './rng';

// ─── Lineage Node (replaces Conversation Node) ─────────────
export interface LineageNode {
  hash: string;
  phrase: string;
  domain: string;
  generation: number;
  timestamp: number;
  operation: 'primordial' | 'fork' | 'breed' | 'mutate' | 'compose' | 'grow';
  parentHashes: string[]; // Empty for primordial
  childrenHashes: string[]; // Populated when branched from this node
  
  // Genetic profile (snapshot at time of operation)
  genes: Record<string, any>;
  
  // Metadata
  agentName?: string;
  artifactHash?: string; // If grown
  fitness?: number;
}

// ─── Lineage Edge (replaces Conversation Branch) ────────────
export interface LineageEdge {
  fromHash: string;
  toHash: string;
  operation: 'fork' | 'breed' | 'mutate' | 'compose' | 'grow';
  weight: number; // Genetic similarity (0-1)
  timestamp: number;
}

// ─── Lineage Graph (replaces Conversation Tree) ───────────
export interface LineageGraph {
  nodes: Map<string, LineageNode>;
  edges: LineageEdge[];
  rootHash: string | null;
  currentHash: string | null;
}

// ─── Lineage Tracker Class ────────────────────────────
export class LineageTracker {
  private graph: LineageGraph;
  
  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: [],
      rootHash: null,
      currentHash: null,
    };
  }

  /**
   * Record primordial seed (replaces root conversation)
   */
  recordPrimordial(seed: Seed): LineageNode {
    const node: LineageNode = {
      hash: seed.$hash || this.generateHash(seed),
      phrase: seed.$phrase || '',
      domain: seed.$domain || 'unknown',
      generation: seed.$lineage?.generation || 0,
      timestamp: Date.now(),
      operation: 'primordial',
      parentHashes: [],
      childrenHashes: [],
      genes: { ...seed.genes },
      agentName: (seed as any).agentName,
    };

    this.graph.nodes.set(node.hash, node);
    this.graph.rootHash = node.hash;
    this.graph.currentHash = node.hash;

    return node;
  }

  /**
   * Record fork operation (replaces conversation fork)
   * Creates a new branch with mutated genes
   */
  recordFork(parentSeed: Seed, childSeed: Seed): { parentNode: LineageNode; childNode: LineageNode } {
    const parentHash = parentSeed.$hash || '';
    const childHash = childSeed.$hash || this.generateHash(childSeed);

    // Get or create parent node
    let parentNode = this.graph.nodes.get(parentHash);
    if (!parentNode) {
      parentNode = this.recordPrimordial(parentSeed);
    }

    // Create child node
    const childNode: LineageNode = {
      hash: childHash,
      phrase: childSeed.$phrase || '',
      domain: childSeed.$domain || 'unknown',
      generation: (childSeed.$lineage?.generation || parentNode.generation) + 1,
      timestamp: Date.now(),
      operation: 'fork',
      parentHashes: [parentHash],
      childrenHashes: [],
      genes: { ...childSeed.genes },
      agentName: (childSeed as any).agentName,
    };

    // Update graph
    this.graph.nodes.set(childHash, childNode);
    parentNode.childrenHashes.push(childHash);
    
    // Add edge
    this.graph.edges.push({
      fromHash: parentHash,
      toHash: childHash,
      operation: 'fork',
      weight: this.calculateGeneticSimilarity(parentNode.genes, childNode.genes),
      timestamp: Date.now(),
    });

    this.graph.currentHash = childHash;

    return { parentNode, childNode };
  }

  /**
   * Record breed operation (replaces conversation merge)
   * Creates child from two parents
   */
  recordBreed(parent1Seed: Seed, parent2Seed: Seed, childSeed: Seed): LineageNode {
    const childHash = childSeed.$hash || this.generateHash(childSeed);
    const parent1Hash = parent1Seed.$hash || '';
    const parent2Hash = parent2Seed.$hash || '';

    // Ensure parent nodes exist
    if (!this.graph.nodes.has(parent1Hash)) {
      this.recordPrimordial(parent1Seed);
    }
    if (!this.graph.nodes.has(parent2Hash)) {
      this.recordPrimordial(parent2Seed);
    }

    const parent1Node = this.graph.nodes.get(parent1Hash)!;
    const parent2Node = this.graph.nodes.get(parent2Hash)!;

    // Create child node
    const childNode: LineageNode = {
      hash: childHash,
      phrase: childSeed.$phrase || '',
      domain: childSeed.$domain || 'unknown',
      generation: (childSeed.$lineage?.generation || Math.max(parent1Node.generation, parent2Node.generation)) + 1,
      timestamp: Date.now(),
      operation: 'breed',
      parentHashes: [parent1Hash, parent2Hash],
      childrenHashes: [],
      genes: { ...childSeed.genes },
      agentName: (childSeed as any).agentName,
    };

    // Update graph
    this.graph.nodes.set(childHash, childNode);
    parent1Node.childrenHashes.push(childHash);
    parent2Node.childrenHashes.push(childHash);
    
    // Add edges
    this.graph.edges.push({
      fromHash: parent1Hash,
      toHash: childHash,
      operation: 'breed',
      weight: this.calculateGeneticSimilarity(parent1Node.genes, childNode.genes),
      timestamp: Date.now(),
    });
    this.graph.edges.push({
      fromHash: parent2Hash,
      toHash: childHash,
      operation: 'breed',
      weight: this.calculateGeneticSimilarity(parent2Node.genes, childNode.genes),
      timestamp: Date.now(),
    });

    this.graph.currentHash = childHash;

    return childNode;
  }

  /**
   * Record compose operation (replaces cross-domain branch)
   * Transforms seed from one domain to another
   */
  recordCompose(sourceSeed: Seed, targetSeed: Seed, functor: string): LineageNode {
    const sourceHash = sourceSeed.$hash || '';
    const targetHash = targetSeed.$hash || this.generateHash(targetSeed);

    // Ensure source node exists
    if (!this.graph.nodes.has(sourceHash)) {
      this.recordPrimordial(sourceSeed);
    }

    const sourceNode = this.graph.nodes.get(sourceHash)!;

    // Create target node
    const targetNode: LineageNode = {
      hash: targetHash,
      phrase: targetSeed.$phrase || '',
      domain: targetSeed.$domain || 'unknown',
      generation: (targetSeed.$lineage?.generation || sourceNode.generation) + 1,
      timestamp: Date.now(),
      operation: 'compose',
      parentHashes: [sourceHash],
      childrenHashes: [],
      genes: { ...targetSeed.genes },
      agentName: (targetSeed as any).agentName,
    };

    // Update graph
    this.graph.nodes.set(targetHash, targetNode);
    sourceNode.childrenHashes.push(targetHash);
    
    // Add edge with functor metadata
    this.graph.edges.push({
      fromHash: sourceHash,
      toHash: targetHash,
      operation: 'compose',
      weight: this.calculateGeneticSimilarity(sourceNode.genes, targetNode.genes),
      timestamp: Date.now(),
    });

    this.graph.currentHash = targetHash;

    return targetNode;
  }

  /**
   * Record grow operation (replaces conversation checkpoint)
   */
  recordGrow(seed: Seed, artifactHash: string): LineageNode | undefined {
    const seedHash = seed.$hash || '';
    const node = this.graph.nodes.get(seedHash);
    
    if (!node) return undefined;

    node.artifactHash = artifactHash;
    node.timestamp = Date.now();

    // Add self-edge for grow
    this.graph.edges.push({
      fromHash: seedHash,
      toHash: seedHash,
      operation: 'grow',
      weight: 1.0,
      timestamp: Date.now(),
    });

    return node;
  }

  // ─── Query Methods ─────────────────────────────────

  /**
   * Get all branches from a node (replaces conversation branches)
   */
  getBranches(fromHash: string): LineageNode[] {
    const node = this.graph.nodes.get(fromHash);
    if (!node) return [];

    return node.childrenHashes
      .map(h => this.graph.nodes.get(h))
      .filter((n): n is LineageNode => n !== undefined);
  }

  /**
   * Get lineage path from root to node (replaces conversation history)
   */
  getLineagePath(toHash: string): LineageNode[] {
    const path: LineageNode[] = [];
    let currentHash = toHash;
    
    while (currentHash) {
      const node = this.graph.nodes.get(currentHash);
      if (!node) break;
      
      path.unshift(node);
      currentHash = node.parentHashes[0]; // Follow first parent
    }

    return path;
  }

  /**
   * Get all nodes in a generation (replaces conversation epoch)
   */
  getGeneration(gen: number): LineageNode[] {
    return Array.from(this.graph.nodes.values())
      .filter(n => n.generation === gen);
  }

  /**
   * Find common ancestor (replaces conversation merge point)
   */
  findCommonAncestor(hash1: string, hash2: string): LineageNode | undefined {
    const path1 = new Set(this.getLineagePath(hash1).map(n => n.hash));
    const path2 = this.getLineagePath(hash2);
    
    for (const node of path2) {
      if (path1.has(node.hash)) {
        return node;
      }
    }

    return undefined;
  }

  /**
   * Compare two branches (replaces conversation diff)
   */
  compareBranches(hash1: string, hash2: string): {
    node1: LineageNode;
    node2: LineageNode;
    geneticDistance: number;
    operationDiff: string[];
  } | undefined {
    const node1 = this.graph.nodes.get(hash1);
    const node2 = this.graph.nodes.get(hash2);
    
    if (!node1 || !node2) return undefined;

    const geneticDistance = this.calculateGeneticSimilarity(node1.genes, node2.genes);
    
    const operationDiff = [node1.operation, node2.operation].filter((v, i, a) => a.indexOf(v) === i);

    return { node1, node2, geneticDistance, operationDiff };
  }

  // ─── Visualization Data ──────────────────────────────

  /**
   * Export graph for visualization (replaces conversation tree view)
   */
  exportForVisualization() {
    return {
      nodes: Array.from(this.graph.nodes.values()).map(n => ({
        id: n.hash.substring(0, 8),
        label: n.domain,
        generation: n.generation,
        operation: n.operation,
        group: n.domain,
      })),
      edges: this.graph.edges.map(e => ({
        from: e.fromHash.substring(0, 8),
        to: e.toHash.substring(0, 8),
        operation: e.operation,
        weight: e.weight,
      })),
    };
  }

  // ─── Utility Methods ─────────────────────────────────

  private calculateGeneticSimilarity(genes1: Record<string, any>, genes2: Record<string, any>): number {
    const keys = new Set([...Object.keys(genes1), ...Object.keys(genes2)]);
    let totalDistance = 0;
    let count = 0;

    for (const key of keys) {
      const g1 = genes1[key];
      const g2 = genes2[key];
      
      if (g1?.value !== undefined && g2?.value !== undefined) {
        if (typeof g1.value === 'number' && typeof g2.value === 'number') {
          totalDistance += Math.abs(g1.value - g2.value);
          count++;
        } else if (g1.value === g2.value) {
          totalDistance += 0;
          count++;
        } else {
          totalDistance += 1;
          count++;
        }
      }
    }

    return count > 0 ? 1 - (totalDistance / count) : 0;
  }

  private generateHash(seed: Seed): string {
    const rng = rngFromHash(seed.$hash || seed.$phrase || Date.now().toString());
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = Math.floor(rng.nextF64() * 256);
    }
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get full graph
   */
  getGraph(): LineageGraph {
    return this.graph;
  }

  /**
   * Clear graph
   */
  clear(): void {
    this.graph = {
      nodes: new Map(),
      edges: [],
      rootHash: null,
      currentHash: null,
    };
  }
}
