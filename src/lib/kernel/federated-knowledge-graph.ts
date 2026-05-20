/**
 * FEDERATED KNOWLEDGE GRAPH
 * 
 * Distributed semantic network for Paradigm entities:
 * - Cross-seed relationships
 * - Semantic similarity clustering
 * - Evolutionary lineage tracking
 * - Creator reputation graphs
 * - Federated sync across nodes
 */

import { ethers } from 'ethers';
import { kernelNow, kernelNowIso } from './clock';

export interface KnowledgeNode {
  id: string;                    // Unique identifier (seed hash)
  type: 'seed' | 'creator' | 'collection' | 'domain' | 'concept';
  payload: Record<string, any>;  // Domain-specific data
  embeddings: number[];         // Vector embedding for similarity
  metadata: {
    createdAt: number;
    updatedAt: number;
    creator: string;
    chainId: number;
  };
  edges: KnowledgeEdge[];
}

export interface KnowledgeEdge {
  targetId: string;
  relationship: 
    | 'derived_from'    // Evolutionary parent
    | 'similar_to'     // Semantic similarity
    | 'created_by'     // Creator relationship
    | 'part_of'        // Collection membership
    | 'influenced_by'  // Style influence
    | 'licensed_under' // IP relationship
    | 'collaborated_with';
  weight: number;               // 0-1 confidence
  transactionHash?: string;    // On-chain verification
}

export interface KnowledgeQuery {
  type: 'semantic' | 'graph' | 'temporal' | 'creator';
  filters: {
    minSimilarity?: number;
    maxDepth?: number;
    edgeTypes?: string[];
    creator?: string;
    domain?: string;
    timeRange?: { start: number; end: number };
  };
  limit: number;
}

export class FederatedKnowledgeGraph {
  private localNodes: Map<string, KnowledgeNode> = new Map();
  private pendingSync: Map<string, KnowledgeNode> = new Map();
  private peerConnections: Map<string, string> = new Map(); // peerId -> endpoint
  
  constructor(private nodeId: string, private chainId: number = 1) {}
  
  /**
   * Add node to local knowledge graph
   */
  async addNode(node: KnowledgeNode): Promise<void> {
    // Validate node
    if (!node.id || !node.type || !node.embeddings) {
      throw new Error('Invalid node: missing required fields');
    }
    
    // Check for existing node (version conflict)
    const existing = this.localNodes.get(node.id);
    if (existing && existing.metadata.updatedAt >= node.metadata.updatedAt) {
      throw new Error('Node version conflict: newer version exists');
    }
    
    // Store locally
    this.localNodes.set(node.id, {
      ...node,
      metadata: {
        ...node.metadata,
        updatedAt: kernelNow(),
      },
    });
    
    // Queue for federated sync
    this.pendingSync.set(node.id, node);
    
    console.log(`📍 Added node ${node.id} to knowledge graph`);
  }
  
  /**
   * Add edge between nodes
   */
  async addEdge(sourceId: string, edge: KnowledgeEdge): Promise<void> {
    const source = this.localNodes.get(sourceId);
    if (!source) {
      throw new Error(`Source node ${sourceId} not found`);
    }
    
    const target = this.localNodes.get(edge.targetId);
    if (!target) {
      throw new Error(`Target node ${edge.targetId} not found`);
    }
    
    // Check for duplicate edge
    const existingEdge = source.edges.find(
      e => e.targetId === edge.targetId && e.relationship === edge.relationship
    );
    
    if (existingEdge) {
      // Update weight if higher
      if (edge.weight > existingEdge.weight) {
        existingEdge.weight = edge.weight;
        if (edge.transactionHash) {
          existingEdge.transactionHash = edge.transactionHash;
        }
      }
    } else {
      source.edges.push(edge);
    }
    
    this.pendingSync.set(sourceId, source);
  }
  
  /**
   * Semantic search - find similar seeds
   */
  async semanticSearch(
    queryEmbedding: number[],
    options: {
      minSimilarity?: number;
      limit?: number;
      type?: string;
    } = {}
  ): Promise<KnowledgeNode[]> {
    const { minSimilarity = 0.7, limit = 10, type } = options;
    
    // Calculate cosine similarity
    const results = Array.from(this.localNodes.values())
      .filter(node => !type || node.type === type)
      .map(node => ({
        node,
        similarity: this.cosineSimilarity(queryEmbedding, node.embeddings),
      }))
      .filter(r => r.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    return results.map(r => ({
      ...r.node,
      metadata: {
        ...r.node.metadata,
        similarityScore: r.similarity, // Attach similarity for reference
      },
    }));
  }
  
  /**
   * Graph traversal - find related entities
   */
  async graphTraverse(
    startId: string,
    options: {
      maxDepth?: number;
      edgeTypes?: string[];
      direction?: 'outbound' | 'inbound' | 'both';
    } = {}
  ): Promise<Map<string, { node: KnowledgeNode; depth: number; edge: KnowledgeEdge }>> {
    const { maxDepth = 3, edgeTypes, direction = 'outbound' } = options;
    
    const visited = new Map<string, { node: KnowledgeNode; depth: number; edge: KnowledgeEdge }>();
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
    
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      
      if (depth > maxDepth || visited.has(id)) continue;
      
      const node = this.localNodes.get(id);
      if (!node) continue;
      
      // Add to visited
      visited.set(id, { node, depth, edge: null as any });
      
      // Traverse edges
      if (direction === 'outbound' || direction === 'both') {
        for (const edge of node.edges) {
          if (!edgeTypes || edgeTypes.includes(edge.relationship)) {
            if (!visited.has(edge.targetId)) {
              queue.push({ id: edge.targetId, depth: depth + 1 });
            }
          }
        }
      }
      
      // Reverse edges (inbound)
      if (direction === 'inbound' || direction === 'both') {
        for (const [, otherNode] of this.localNodes) {
          for (const edge of otherNode.edges) {
            if (edge.targetId === id && (!edgeTypes || edgeTypes.includes(edge.relationship))) {
              if (!visited.has(otherNode.id)) {
                queue.push({ id: otherNode.id, depth: depth + 1 });
              }
            }
          }
        }
      }
    }
    
    return visited;
  }
  
  /**
   * Get evolutionary lineage of a seed
   */
  async getLineage(seedId: string): Promise<{
    ancestors: KnowledgeNode[];
    descendants: KnowledgeNode[];
  }> {
    const ancestors: KnowledgeNode[] = [];
    const descendants: KnowledgeNode[] = [];
    
    // Traverse backwards for ancestors
    const ancestorMap = await this.graphTraverse(seedId, {
      maxDepth: 10,
      edgeTypes: ['derived_from'],
      direction: 'inbound',
    });
    
    ancestorMap.forEach(({ node }, id) => {
      if (id !== seedId) ancestors.push(node);
    });
    
    // Traverse forwards for descendants
    const descendantMap = await this.graphTraverse(seedId, {
      maxDepth: 10,
      edgeTypes: ['derived_from'],
      direction: 'outbound',
    });
    
    descendantMap.forEach(({ node }, id) => {
      if (id !== seedId) descendants.push(node);
    });
    
    return { ancestors, descendants };
  }
  
  /**
   * Creator reputation scoring
   */
  async getCreatorReputation(creatorAddress: string): Promise<{
    score: number;
    totalCreations: number;
    totalSales: number;
    avgQuality: number;
    influence: number;
  }> {
    const creatorNodes = Array.from(this.localNodes.values())
      .filter(n => n.metadata.creator.toLowerCase() === creatorAddress.toLowerCase());
    
    if (creatorNodes.length === 0) {
      return { score: 0, totalCreations: 0, totalSales: 0, avgQuality: 0, influence: 0 };
    }
    
    // Calculate influence from graph centrality
    let influence = 0;
    for (const node of creatorNodes) {
      const related = await this.graphTraverse(node.id, {
        maxDepth: 2,
        edgeTypes: ['influenced_by', 'derived_from'],
      });
      influence += related.size;
    }
    
    // Aggregate metrics
    const totalCreations = creatorNodes.length;
    const totalSales = creatorNodes.reduce((sum, n) => sum + (n.payload.sales || 0), 0);
    const avgQuality = creatorNodes.reduce((sum, n) => sum + (n.payload.quality || 0.5), 0) / totalCreations;
    
    // Composite score
    const score = (
      avgQuality * 0.3 +
      Math.log10(totalSales + 1) * 0.3 +
      Math.log10(influence + 1) * 0.2 +
      Math.min(totalCreations / 100, 1) * 0.2
    ) * 100;
    
    return { score, totalCreations, totalSales, avgQuality, influence };
  }
  
  /**
   * Federated sync - connect to peer nodes
   */
  async addPeer(peerId: string, endpoint: string): Promise<void> {
    this.peerConnections.set(peerId, endpoint);
    console.log(`🔗 Connected to peer: ${peerId} at ${endpoint}`);
  }
  
  /**
   * Sync pending changes to peers
   */
  async sync(): Promise<{ synced: number; conflicts: number }> {
    let synced = 0;
    let conflicts = 0;
    
    for (const [peerId, endpoint] of this.peerConnections) {
      try {
        // In production, this would be actual HTTP/WebSocket
        // For now, simulate sync
        console.log(`📤 Syncing to peer: ${peerId}`);
        
        for (const [nodeId, node] of this.pendingSync) {
          // Check for conflicts
          const existing = this.localNodes.get(nodeId);
          if (existing && existing.metadata.updatedAt > node.metadata.updatedAt) {
            conflicts++;
            continue;
          }
          
          synced++;
        }
      } catch (error) {
        console.error(`❌ Sync failed to ${peerId}:`, error);
      }
    }
    
    // Clear synced
    this.pendingSync.clear();
    
    return { synced, conflicts };
  }
  
  /**
   * Export graph for IPFS/publishing
   */
  async exportGraph(): Promise<{
    nodes: KnowledgeNode[];
    metadata: {
      nodeId: string;
      chainId: number;
      exportedAt: number;
      nodeCount: number;
    };
  }> {
    return {
      nodes: Array.from(this.localNodes.values()),
      metadata: {
        nodeId: this.nodeId,
        chainId: this.chainId,
        exportedAt: kernelNow(),
        nodeCount: this.localNodes.size,
      },
    };
  }
  
  /**
   * Import graph from IPFS/peer
   */
  async importGraph(data: {
    nodes: KnowledgeNode[];
    metadata: { nodeId: string; chainId: number };
  }): Promise<{ imported: number; conflicts: number }> {
    let imported = 0;
    let conflicts = 0;
    
    for (const node of data.nodes) {
      const existing = this.localNodes.get(node.id);
      
      if (existing) {
        if (existing.metadata.updatedAt >= node.metadata.updatedAt) {
          conflicts++;
          continue;
        }
      }
      
      this.localNodes.set(node.id, node);
      imported++;
    }
    
    return { imported, conflicts };
  }
  
  /**
   * Cosine similarity helper
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }
  
  /**
   * Get graph statistics
   */
  getStats(): {
    totalNodes: number;
    byType: Record<string, number>;
    totalEdges: number;
    pendingSync: number;
    connectedPeers: number;
  } {
    const byType: Record<string, number> = {};
    let totalEdges = 0;
    
    for (const node of this.localNodes.values()) {
      byType[node.type] = (byType[node.type] || 0) + 1;
      totalEdges += node.edges.length;
    }
    
    return {
      totalNodes: this.localNodes.size,
      byType,
      totalEdges,
      pendingSync: this.pendingSync.size,
      connectedPeers: this.peerConnections.size,
    };
  }
}

export default FederatedKnowledgeGraph;