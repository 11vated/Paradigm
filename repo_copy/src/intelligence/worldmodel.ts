import { UniversalSeed, GeneType } from '../seeds';

export interface Concept {
  id: string;
  type: string;
  name: string;
  properties: Map<string, unknown>;
  relations: Map<string, string[]>;
}

export interface Relationship {
  from: string;
  to: string;
  type: string;
  strength: number;
}

export class WorldModel {
  private concepts: Map<string, Concept> = new Map();
  private relationships: Relationship[] = [];
  private episodicMemory: Map<number, { event: string; concepts: string[] }> = new Map();
  private seedIndex: Map<string, string[]> = new Map();

  constructor() {
    this.initializeBaseConcepts();
  }

  private initializeBaseConcepts(): void {
    const baseConcepts = [
      { id: 'seed', type: 'entity', name: 'Seed', properties: new Map([['arity', 'multi']]) },
      { id: 'gene', type: 'component', name: 'Gene', properties: new Map([['arity', 'multi']]) },
      { id: 'evolution', type: 'process', name: 'Evolution', properties: new Map([['arity', 'single']]) },
      { id: 'mutation', type: 'operator', name: 'Mutation', properties: new Map([['arity', 'unary']]) },
      { id: 'crossover', type: 'operator', name: 'Crossover', properties: new Map([['arity', 'binary']]) },
      { id: 'fitness', type: 'metric', name: 'Fitness', properties: new Map([['arity', 'single']]) },
      { id: 'genome', type: 'structure', name: 'Genome', properties: new Map([['arity', 'single']]) },
      { id: 'phenotype', type: 'expression', name: 'Phenotype', properties: new Map([['arity', 'single']]) },
      { id: 'breeding', type: 'process', name: 'Breeding', properties: new Map([['arity', 'binary']]) },
      { id: 'selection', type: 'operator', name: 'Selection', properties: new Map([['arity', 'unary']]) },
      { id: 'ga', type: 'algorithm', name: 'Genetic Algorithm', properties: new Map([['arity', 'population']]) },
      { id: 'mapelites', type: 'algorithm', name: 'MAP-Elites', properties: new Map([['arity', 'grid']]) },
      { id: 'cmaes', type: 'algorithm', name: 'CMA-ES', properties: new Map([['arity', 'continuous']]) }
    ];

    for (const concept of baseConcepts) {
      this.concepts.set(concept.id, concept);
    }

    const baseRelations: [string, string, string][] = [
      ['seed', 'has', 'gene'],
      ['gene', 'partof', 'genome'],
      ['genome', 'expresses', 'phenotype'],
      ['phenotype', 'has', 'fitness'],
      ['mutation', 'modifies', 'genome'],
      ['crossover', 'combines', 'genome'],
      ['breeding', 'produces', 'seed'],
      ['ga', 'uses', 'selection'],
      ['ga', 'uses', 'mutation'],
      ['ga', 'uses', 'crossover'],
      ['mapelites', 'uses', 'selection'],
      ['cmaes', 'uses', 'selection']
    ];

    for (const [from, type, to] of baseRelations) {
      this.addRelationship(from, to, type, 1.0);
    }
  }

  addConcept(concept: Omit<Concept, 'id' | 'relations'>): string {
    const id = concept.name.toLowerCase().replace(/\s+/g, '_');
    this.concepts.set(id, { ...concept, id, relations: new Map() });
    return id;
  }

  getConcept(id: string): Concept | undefined {
    return this.concepts.get(id);
  }

  addRelationship(from: string, to: string, type: string, strength: number = 1.0): void {
    this.relationships.push({ from, to, type, strength });
  }

  findPath(from: string, to: string): string[] | null {
    const visited = new Set<string>();
    const queue: { node: string; path: string[] }[] = [{ node: from, path: [] }];

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      if (node === to) return path;

      if (visited.has(node)) continue;
      visited.add(node);

      const neighbors = this.relationships
        .filter(r => r.from === node)
        .map(r => r.to);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return null;
  }

  getRelatedConcepts(conceptId: string): Concept[] {
    const related = new Set<string>();

    for (const rel of this.relationships) {
      if (rel.from === conceptId) related.add(rel.to);
      if (rel.to === conceptId) related.add(rel.from);
    }

    return Array.from(related).map(id => this.concepts.get(id)).filter(Boolean) as Concept[];
  }

  indexSeed(seed: UniversalSeed): void {
    const seedId = seed.id;
    const geneTypes = seed.getGeneTypes();

    this.seedIndex.set(seedId, geneTypes);

    for (const geneType of geneTypes) {
      this.addConcept({ type: 'gene', name: geneType, properties: new Map() });
    }

    const phenotype = seed.getMetadata().phenotype;
    if (phenotype) {
      this.addConcept({ type: 'expression', name: phenotype, properties: new Map() });
    }
  }

  querySeedsByGene(geneType: GeneType): UniversalSeed[] {
    return [];
  }

  learn(event: string, involvedConcepts: string[]): void {
    this.episodicMemory.set(Date.now(), { event, concepts: involvedConcepts });
  }

  getRecentEvents(count: number = 10): { event: string; concepts: string[]; timestamp: number }[] {
    return Array.from(this.episodicMemory.entries())
      .slice(-count)
      .map(([timestamp, data]) => ({ ...data, timestamp }));
  }

  infer(operation: string): string[] {
    const inference: string[] = [];

    for (const [from, type, to] of this.relationships) {
      if (type === operation) {
        inference.push(`${from} ${operation} ${to}`);
      }
    }

    return inference;
  }

  getAllConcepts(): Concept[] {
    return Array.from(this.concepts.values());
  }

  getConceptCount(): number {
    return this.concepts.size;
  }

  getRelationshipCount(): number {
    return this.relationships.length;
  }
}