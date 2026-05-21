/**
 * SeedGraphInverter — lineage graph -> composition genes.
 * Takes a small graph of (id, parents, operation, weight) and recovers:
 *   composition.depth, composition.fanIn, composition.operations[],
 *   composition.weightDistribution, composition.lineageBreadth.
 */
import { confidenceLevel } from './types';
import type { Inverter, InversionReport, InvertedGene, InversionResidual } from './types';

export interface LineageNode {
  id: string;
  parents: string[];
  op?: 'compose' | 'breed' | 'mutate' | 'evolve' | 'genesis';
  weights?: number[];
}

export interface LineageGraph {
  root: string;
  nodes: LineageNode[];
}

export class SeedGraphInverter implements Inverter<LineageGraph> {
  readonly id = 'composition.lineage-graph-v1';
  readonly domain = 'composition';
  accepts(x: unknown): x is LineageGraph {
    return !!x && typeof (x as any).root === 'string' && Array.isArray((x as any).nodes);
  }
  async invert(g: LineageGraph): Promise<InversionReport> {
    const nodes = g.nodes;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const genes: InvertedGene[] = [];
    const residuals: InversionResidual[] = [];

    // depth from root
    const depth = (() => {
      const seen = new Map<string, number>();
      function dfs(id: string): number {
        if (seen.has(id)) return seen.get(id)!;
        const n = byId.get(id);
        if (!n || n.parents.length === 0) { seen.set(id, 0); return 0; }
        const d = 1 + Math.max(...n.parents.map(dfs));
        seen.set(id, d); return d;
      }
      return dfs(g.root);
    })();
    genes.push({ path: 'composition.depth', value: depth, confidence: 1.0, level: confidenceLevel(1.0) });

    // fan-in (max parents at root)
    const rootNode = byId.get(g.root);
    const fanIn = rootNode ? rootNode.parents.length : 0;
    genes.push({ path: 'composition.fanIn', value: fanIn, confidence: 1.0, level: confidenceLevel(1.0) });

    // operations distribution
    const opCounts: Record<string, number> = {};
    for (const n of nodes) {
      const op = n.op ?? (n.parents.length === 0 ? 'genesis' : 'compose');
      opCounts[op] = (opCounts[op] ?? 0) + 1;
    }
    const ops = Object.entries(opCounts).map(([k, v]) => `${k}:${v}`);
    genes.push({ path: 'composition.operations', value: ops, confidence: 0.95, level: confidenceLevel(0.95) });

    // weight distribution mean/variance for nodes that have weights
    const weighted = nodes.filter((n) => Array.isArray(n.weights) && n.weights.length > 0);
    if (weighted.length > 0) {
      const all = weighted.flatMap((n) => n.weights!);
      const mean = all.reduce((a, b) => a + b, 0) / all.length;
      const variance = all.reduce((s, x) => s + (x - mean) * (x - mean), 0) / all.length;
      genes.push({ path: 'composition.weightMean', value: Math.round(mean * 1000) / 1000, confidence: 0.9, level: confidenceLevel(0.9) });
      genes.push({ path: 'composition.weightVariance', value: Math.round(variance * 1000) / 1000, confidence: 0.85, level: confidenceLevel(0.85) });
    } else {
      residuals.push({ feature: 'composition.weights', reason: 'no-gene' });
    }

    // breadth: number of unique ancestors
    const ancestors = new Set<string>();
    (function walk(id: string) {
      const n = byId.get(id); if (!n) return;
      for (const p of n.parents) { ancestors.add(p); walk(p); }
    })(g.root);
    genes.push({ path: 'composition.lineageBreadth', value: ancestors.size, confidence: 1.0, level: confidenceLevel(1.0) });

    const artifactBytes = Buffer.byteLength(JSON.stringify(g), 'utf8');
    const overall = genes.reduce((s, x) => s + x.confidence, 0) / Math.max(1, genes.length);
    return { domain: 'composition', inverterId: this.id, artifactBytes, genes, residuals, overallConfidence: Math.round(overall * 100) / 100, elapsedMs: 0 };
  }
}
