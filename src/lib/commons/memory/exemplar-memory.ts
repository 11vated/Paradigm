/**
 * ExemplarMemory — Past successful seed↔description pairs
 * Vector store using cosine similarity for retrieval.
 */

export interface ExemplarEntry {
  id: string;
  description: string;
  domain: string;
  seedId: string;
  seedHash: string;
  embedding: number[];
  fitness: number;
  createdAt: number;
  tags: string[];
}

export class ExemplarMemory {
  private exemplars: ExemplarEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  add(entry: ExemplarEntry): void {
    this.exemplars.unshift(entry);
    if (this.exemplars.length > this.maxEntries) {
      this.exemplars.pop();
    }
  }

  findSimilar(embedding: number[], topK = 5, domain?: string): ExemplarEntry[] {
    let candidates = this.exemplars;
    if (domain) candidates = candidates.filter(e => e.domain === domain);

    const scored = candidates.map(e => ({
      entry: e,
      score: this.cosineSimilarity(embedding, e.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(s => s.entry);
  }

  list(): ExemplarEntry[] {
    return [...this.exemplars];
  }

  findByDomain(domain: string): ExemplarEntry[] {
    return this.exemplars.filter(e => e.domain === domain);
  }

  findBySeedHash(hash: string): ExemplarEntry | undefined {
    return this.exemplars.find(e => e.seedHash === hash);
  }

  count(): number {
    return this.exemplars.length;
  }

  clear(): void {
    this.exemplars = [];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }
}