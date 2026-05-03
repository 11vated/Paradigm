/**
 * Seed Dependency Graph — Reconstructs Nexus "Project Intelligence" for Paradigm
 * 
 * NEXUS CONCEPT: Analyzes code structure, builds AST, creates dependency graphs
 * PARADIGM RECONSTRUCTION: Tracks seed relationships across 27 domains
 * 
 * "Project Intelligence" in Paradigm = Complete generative graph
 * - Nodes = Seeds (hash, domain, generation)
 * - Edges = Genetic operations (breed, mutate, compose, grow)
 * - Graph/Regulatory gene types encode relationships
 */

import type { Seed } from './types';
import { findCompositionPath } from './composition';

// ─── Graph Node (replaces AST Node) ─────────────────────
export interface SeedGraphNode {
  hash: string;
  phrase: string;
  domain: string;
  generation: number;
  timestamp: number;
  
  // Genetic profile
  genes: Record<string, any>;
  
  // Metadata
  artifactHash?: string;
  fitness?: number;
  isRoot: boolean;
  depth: number; // Distance from primordial
}

// ─── Graph Edge (replaces Code Dependency) ────────────────
export interface SeedGraphEdge {
  fromHash: string;
  toHash: string;
  operation: 'primordial' | 'fork' | 'breed' | 'mutate' | 'compose' | 'grow';
  weight: number; // Genetic similarity (0-1)
  timestamp: number;
  
  // Operation-specific metadata
  metadata?: {
    functor?: string; // For compose operations
    parents?: string[]; // For breed operations
    mutationRate?: number; // For mutate operations
  };
}

// ─── Generative Dependency Graph ────────────────────────────
export interface GenerativeGraph {
  nodes: Map<string, SeedGraphNode>;
  edges: SeedGraphEdge[];
  rootHashes: string[]; // Primordial seeds
  metadata: {
    totalSeeds: number;
    maxGeneration: number;
    domains: Record<string, number>; // Domain → count
    operations: Record<string, number>; // Operation → count
  };
}

// ─── Graph Builder Class ───────────────────────────────────
export class SeedDependencyGraph {
  private graph: GenerativeGraph;

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: [],
      rootHashes: [],
      metadata: {
        totalSeeds: 0,
        maxGeneration: 0,
        domains: {},
        operations: {},
      },
    };
  }

  /**
   * Add primordial seed (replaces root conversation node)
   */
  addPrimordial(seed: Seed): SeedGraphNode {
    const hash = seed.$hash || this.generateHash(seed);
    const node: SeedGraphNode = {
      hash,
      phrase: seed.$phrase || '',
      domain: seed.$domain || 'unknown',
      generation: seed.$lineage?.generation || 0,
      timestamp: Date.now(),
      genes: { ...seed.genes },
      isRoot: true,
      depth: 0,
    };

    this.graph.nodes.set(hash, node);
    this.graph.rootHashes.push(hash);
    this.updateMetadata();

    return node;
  }

  /**
   * Add fork operation (replaces conversation fork)
   */
  addFork(parentSeed: Seed, childSeed: Seed): void {
    const parentHash = parentSeed.$hash || '';
    const childHash = childSeed.$hash || this.generateHash(childSeed);

    // Ensure parent exists
    if (!this.graph.nodes.has(parentHash)) {
      this.addPrimordial(parentSeed);
    }

    const parentNode = this.graph.nodes.get(parentHash)!;

    // Create child node
    const childNode: SeedGraphNode = {
      hash: childHash,
      phrase: childSeed.$phrase || '',
      domain: childSeed.$domain || 'unknown',
      generation: (childSeed.$lineage?.generation || parentNode.generation) + 1,
      timestamp: Date.now(),
      genes: { ...childSeed.genes },
      isRoot: false,
      depth: parentNode.depth + 1,
    };

    this.graph.nodes.set(childHash, childNode);

    // Add edge
    this.graph.edges.push({
      fromHash: parentHash,
      toHash: childHash,
      operation: 'fork',
      weight: this.calculateGeneticSimilarity(parentNode.genes, childNode.genes),
      timestamp: Date.now(),
      metadata: { mutationRate: 0.1 }, // Default
    });

    this.updateMetadata();
  }

  /**
   * Add breed operation (replaces conversation merge)
   */
  addBreed(parent1: Seed, parent2: Seed, child: Seed): void {
    const hash1 = parent1.$hash || '';
    const hash2 = parent2.$hash || '';
    const childHash = child.$hash || this.generateHash(child);

    // Ensure parents exist
    if (!this.graph.nodes.has(hash1)) this.addPrimordial(parent1);
    if (!this.graph.nodes.has(hash2)) this.addPrimordial(parent2);

    const parent1Node = this.graph.nodes.get(hash1)!;
    const parent2Node = this.graph.nodes.get(hash2)!;

    // Create child node
    const childNode: SeedGraphNode = {
      hash: childHash,
      phrase: child.$phrase || '',
      domain: child.$domain || 'unknown',
      generation: (child.$lineage?.generation || 
        Math.max(parent1Node.generation, parent2Node.generation)) + 1,
      timestamp: Date.now(),
      genes: { ...child.genes },
      isRoot: false,
      depth: Math.max(parent1Node.depth, parent2Node.depth) + 1,
    };

    this.graph.nodes.set(childHash, childNode);

    // Add edges from both parents
    this.graph.edges.push({
      fromHash: hash1,
      toHash: childHash,
      operation: 'breed',
      weight: this.calculateGeneticSimilarity(parent1Node.genes, childNode.genes),
      timestamp: Date.now(),
      metadata: { parents: [hash1, hash2] },
    });

    this.graph.edges.push({
      fromHash: hash2,
      toHash: childHash,
      operation: 'breed',
      weight: this.calculateGeneticSimilarity(parent2Node.genes, childNode.genes),
      timestamp: Date.now(),
      metadata: { parents: [hash1, hash2] },
    });

    this.updateMetadata();
  }

  /**
   * Add compose operation (replaces cross-domain branch)
   */
  addCompose(source: Seed, target: Seed, functor: string): void {
    const sourceHash = source.$hash || '';
    const targetHash = target.$hash || this.generateHash(target);

    // Ensure source exists
    if (!this.graph.nodes.has(sourceHash)) {
      this.addPrimordial(source);
    }

    const sourceNode = this.graph.nodes.get(sourceHash)!;

    // Create target node
    const targetNode: SeedGraphNode = {
      hash: targetHash,
      phrase: target.$phrase || '',
      domain: target.$domain || 'unknown',
      generation: (target.$lineage?.generation || sourceNode.generation) + 1,
      timestamp: Date.now(),
      genes: { ...target.genes },
      isRoot: false,
      depth: sourceNode.depth + 1,
    };

    this.graph.nodes.set(targetHash, targetNode);

    // Add edge
    this.graph.edges.push({
      fromHash: sourceHash,
      toHash: targetHash,
      operation: 'compose',
      weight: this.calculateGeneticSimilarity(sourceNode.genes, targetNode.genes),
      timestamp: Date.now(),
      metadata: { functor },
    });

    this.updateMetadata();
  }

  /**
   * Add grow operation (replaces checkpoint)
   */
  addGrow(seed: Seed, artifactHash: string): void {
    const hash = seed.$hash || '';
    
    if (!this.graph.nodes.has(hash)) {
      this.addPrimordial(seed);
    }

    const node = this.graph.nodes.get(hash)!;
    node.artifactHash = artifactHash;

    // Add self-edge for grow
    this.graph.edges.push({
      fromHash: hash,
      toHash: hash,
      operation: 'grow',
      weight: 1.0,
      timestamp: Date.now(),
    });
  }

  // ─── Query Methods ──────────────────────────────────────

  /**
   * Find composition path between domains (replaces dependency analysis)
   */
  findDomainPath(fromDomain: string, toDomain: string): {
    path: string[];
    functors: string[];
    totalWeight: number;
  } | null {
    const compositionPath = findCompositionPath(fromDomain, toDomain);
    
    if (!compositionPath) return null;

    return {
      path: compositionPath.path,
      functors: [compositionPath.functor],
      totalWeight: 1.0, // Simplified
    };
  }

  /**
   * Get seeds by domain (replaces file search)
   */
  getSeedsByDomain(domain: string): SeedGraphNode[] {
    return Array.from(this.graph.nodes.values())
      .filter(n => n.domain === domain);
  }

  /**
   * Get seeds by generation (replaces time-based filtering)
   */
  getSeedsByGeneration(gen: number): SeedGraphNode[] {
    return Array.from(this.graph.nodes.values())
      .filter(n => n.generation === gen);
  }

  /**
   * Get ancestors of a seed (replaces call stack)
   */
  getAncestors(hash: string): SeedGraphNode[] {
    const ancestors: SeedGraphNode[] = [];
    let currentHash = hash;

    while (currentHash) {
      const node = this.graph.nodes.get(currentHash);
      if (!node) break;

      ancestors.push(node);
      const edge = this.graph.edges.find(e => e.toHash === currentHash);
      currentHash = edge?.fromHash || '';
    }

    return ancestors;
  }

  /**
   * Get descendants of a seed (replaces dependency tree)
   */
  getDescendants(hash: string): SeedGraphNode[] {
    const descendants: SeedGraphNode[] = [];
    const queue: string[] = [hash];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = this.graph.edges
        .filter(e => e.fromHash === current)
        .map(e => this.graph.nodes.get(e.toHash))
        .filter((n): n is SeedGraphNode => n !== undefined);

      descendants.push(...children);
      queue.push(...children.map(c => c.hash));
    }

    return descendants;
  }

  /**
   * Find hot seeds (replaces hot files)
   * Based on number of descendants and fitness
   */
  getHotSeeds(limit: number = 10): Array<{ seed: SeedGraphNode; score: number }> {
    const scores = Array.from(this.graph.nodes.values()).map(node => {
      const descendants = this.getDescendants(node.hash).length;
      const fitness = node.fitness || 0;
      const score = descendants * 0.5 + fitness * 0.5;

      return { seed: node, score };
    });

    return scores.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Detect cycles (replaces circular dependencies)
   */
  hasCycles(): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    for (const node of this.graph.nodes.values()) {
      if (this.detectCycleDFS(node.hash, visited, recStack)) {
        return true;
      }
    }

    return false;
  }

  private detectCycleDFS(
    hash: string,
    visited: Set<string>,
    recStack: Set<string>
  ): boolean {
    if (recStack.has(hash)) return true;
    if (visited.has(hash)) return false;

    visited.add(hash);
    recStack.add(hash);

    const children = this.graph.edges
      .filter(e => e.fromHash === hash)
      .map(e => e.toHash);

    for (const child of children) {
      if (this.detectCycleDFS(child, visited, recStack)) {
        return true;
      }
    }

    recStack.delete(hash);
    return false;
  }

  // ─── Visualization Data ─────────────────────────────────
  
  /**
   * Export for graph visualization (replaces code structure view)
   */
  exportForVisualization() {
    return {
      nodes: Array.from(this.graph.nodes.values()).map(n => ({
        id: n.hash.substring(0, 8),
        label: `${n.domain}:${n.phrase.substring(0, 10)}`,
        group: n.domain,
        generation: n.generation,
        depth: n.depth,
        isRoot: n.isRoot,
      })),
      edges: this.graph.edges.map(e => ({
        from: e.fromHash.substring(0, 8),
        to: e.toHash.substring(0, 8),
        operation: e.operation,
        weight: e.weight,
      })),
      metadata: this.graph.metadata,
    };
  }

  // ─── Utility Methods ────────────────────────────────────

  private calculateGeneticSimilarity(
    genes1: Record<string, any>,
    genes2: Record<string, any>
  ): number {
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
    const phrase = seed.$phrase || seed.$hash || Date.now().toString();
    const bytes = new TextEncoder().encode(phrase);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 64)
      .padEnd(64, '0');
  }

  private updateMetadata(): void {
    const nodes = Array.from(this.graph.nodes.values());
    
    this.graph.metadata.totalSeeds = nodes.length;
    this.graph.metadata.maxGeneration = Math.max(...nodes.map(n => n.generation), 0);

    // Count by domain
    this.graph.metadata.domains = {};
    for (const node of nodes) {
      this.graph.metadata.domains[node.domain] = 
        (this.graph.metadata.domains[node.domain] || 0) + 1;
    }

    // Count by operation
    this.graph.metadata.operations = {};
    for (const edge of this.graph.edges) {
      this.graph.metadata.operations[edge.operation] = 
        (this.graph.metadata.operations[edge.operation] || 0) + 1;
    }
  }

  /**
   * Get full graph
   */
  getGraph(): GenerativeGraph {
    return this.graph;
  }

  /**
   * Clear graph
   */
  clear(): void {
    this.graph = {
      nodes: new Map(),
      edges: [],
      rootHashes: [],
      metadata: {
        totalSeeds: 0,
        maxGeneration: 0,
        domains: {},
        operations: {},
      },
    };
  }
}
