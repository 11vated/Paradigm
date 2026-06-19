import crypto from 'crypto';
import { Xoshiro256StarStar, rngFromHash } from '../kernel/rng.js';
import type { AgentIntent } from './types.js';

export interface WorkingEntry {
  key: string;
  value: unknown;
  timestamp: number;
}

export interface EpisodicEntry {
  decisionHash: string;
  intent: string;
  domain: string;
  planHash: string;
  outcome: string;
  seedIds: string[];
  timestamp: number;
}

export interface SemanticEntry {
  concept: string;
  content: string;
  source: string;
  confidence: number;
}

export interface SeedCorpusEntry {
  seedId: string;
  seedHash: string;
  domain: string;
  name: string;
  quality: number;
}

export interface MemoryDigest {
  workingHash: string;
  episodicHash: string;
  semanticHash: string;
  corpusHash: string;
  compositeHash: string;
  entryCount: number;
}

const HASH_ALG = 'sha256';
const HASH_LEN = 32;

function layerHash(label: string, data: string): string {
  return crypto.createHash(HASH_ALG).update(`${label}::${data}`).digest('hex').slice(0, HASH_LEN);
}

function digestWorking(entries: WorkingEntry[]): string {
  const canonical = entries
    .map(e => `${String(e.key)}:${JSON.stringify(e.value)}`)
    .sort()
    .join('|');
  return layerHash('working', canonical || 'empty');
}

function digestEpisodic(entries: EpisodicEntry[]): string {
  const canonical = entries
    .map(e => `${e.decisionHash}:${e.intent}:${e.domain}:${e.outcome}`)
    .join('|');
  return layerHash('episodic', canonical || 'empty');
}

function digestSemantic(entries: SemanticEntry[]): string {
  const canonical = entries
    .map(e => `${e.concept}:${e.content}`)
    .sort()
    .join('|');
  return layerHash('semantic', canonical || 'empty');
}

function digestCorpus(entries: SeedCorpusEntry[]): string {
  const canonical = entries
    .map(e => `${e.seedHash}:${e.domain}`)
    .sort()
    .join('|');
  return layerHash('corpus', canonical || 'empty');
}

function compositeDigest(parts: string[]): string {
  return crypto.createHash(HASH_ALG).update(parts.join('::')).digest('hex').slice(0, HASH_LEN);
}

export class MultiLayerMemory {
  private working: WorkingEntry[] = [];
  private episodic: EpisodicEntry[] = [];
  private semantic: SemanticEntry[] = [];
  private corpus: Map<string, SeedCorpusEntry> = new Map();

  private episodicCapacity: number;
  private semanticCapacity: number;

  constructor(episodicCapacity = 100, semanticCapacity = 50) {
    this.episodicCapacity = episodicCapacity;
    this.semanticCapacity = semanticCapacity;
  }

  // ─── Layer 1: Working Memory ───────────────────────────────────────────

  setWorking(key: string, value: unknown): void {
    const existing = this.working.findIndex(e => e.key === key);
    const entry: WorkingEntry = { key, value, timestamp: Date.now() };
    if (existing >= 0) {
      this.working[existing] = entry;
    } else {
      this.working.push(entry);
    }
  }

  getWorking(key: string): unknown | undefined {
    return this.working.find(e => e.key === key)?.value;
  }

  getWorkingEntries(): WorkingEntry[] {
    return [...this.working];
  }

  clearWorking(): void {
    this.working = [];
  }

  // ─── Layer 2: Episodic Memory ──────────────────────────────────────────

  recordEpisode(
    decisionHash: string,
    intent: string,
    domain: string,
    planHash: string,
    outcome: string,
    seedIds: string[] = [],
  ): void {
    this.episodic.push({ decisionHash, intent, domain, planHash, outcome, seedIds, timestamp: Date.now() });
    if (this.episodic.length > this.episodicCapacity) {
      this.episodic = this.episodic.slice(-this.episodicCapacity);
    }
  }

  getRecentEpisodes(n: number = 10): EpisodicEntry[] {
    return this.episodic.slice(-n);
  }

  getAllEpisodes(): EpisodicEntry[] {
    return [...this.episodic];
  }

  clearEpisodes(): void {
    this.episodic = [];
  }

  // ─── Layer 3: Semantic Memory ──────────────────────────────────────────

  learn(concept: string, content: string, source: string, confidence: number = 1.0): void {
    const existing = this.semantic.findIndex(e => e.concept === concept);
    const entry: SemanticEntry = { concept, content, source, confidence };
    if (existing >= 0) {
      if (confidence >= this.semantic[existing].confidence) {
        this.semantic[existing] = entry;
      }
    } else {
      this.semantic.push(entry);
      if (this.semantic.length > this.semanticCapacity) {
        this.semantic.sort((a, b) => b.confidence - a.confidence);
        this.semantic = this.semantic.slice(0, this.semanticCapacity);
      }
    }
  }

  recall(concept: string): SemanticEntry | undefined {
    return this.semantic.find(e => e.concept === concept);
  }

  searchSemantic(query: string): SemanticEntry[] {
    const lower = query.toLowerCase();
    return this.semantic
      .filter(e => e.concept.toLowerCase().includes(lower) || e.content.toLowerCase().includes(lower))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  getAllSemantic(): SemanticEntry[] {
    return [...this.semantic];
  }

  clearSemantic(): void {
    this.semantic = [];
  }

  // ─── Layer 4: Seed Corpus Memory ───────────────────────────────────────

  recordSeed(seedId: string, seedHash: string, domain: string, name: string, quality: number = 0): void {
    this.corpus.set(seedHash, { seedId, seedHash, domain, name, quality });
  }

  getSeed(hash: string): SeedCorpusEntry | undefined {
    return this.corpus.get(hash);
  }

  getAllSeeds(): SeedCorpusEntry[] {
    return Array.from(this.corpus.values());
  }

  getSeedsByDomain(domain: string): SeedCorpusEntry[] {
    return Array.from(this.corpus.values()).filter(s => s.domain === domain);
  }

  clearCorpus(): void {
    this.corpus.clear();
  }

  // ─── Deterministic Hashing ─────────────────────────────────────────────

  digest(): MemoryDigest {
    const workingHash = digestWorking(this.working);
    const episodicHash = digestEpisodic(this.episodic);
    const semanticHash = digestSemantic(this.semantic);
    const corpusHash = digestCorpus(Array.from(this.corpus.values()));

    return {
      workingHash,
      episodicHash,
      semanticHash,
      corpusHash,
      compositeHash: compositeDigest([workingHash, episodicHash, semanticHash, corpusHash]),
      entryCount: this.working.length + this.episodic.length + this.semantic.length + this.corpus.size,
    };
  }

  compositeHash(): string {
    return this.digest().compositeHash;
  }

  compare(other: MultiLayerMemory): boolean {
    return this.compositeHash() === other.compositeHash();
  }

  snapshot(): MultiLayerMemory {
    const copy = new MultiLayerMemory(this.episodicCapacity, this.semanticCapacity);
    copy.working = this.working.map(e => ({ ...e }));
    copy.episodic = this.episodic.map(e => ({ ...e }));
    copy.semantic = this.semantic.map(e => ({ ...e }));
    copy.corpus = new Map(this.corpus);
    return copy;
  }

  clear(): void {
    this.clearWorking();
    this.clearEpisodes();
    this.clearSemantic();
    this.clearCorpus();
  }

  get stats() {
    return {
      workingCount: this.working.length,
      episodicCount: this.episodic.length,
      semanticCount: this.semantic.length,
      corpusCount: this.corpus.size,
      total: this.working.length + this.episodic.length + this.semantic.length + this.corpus.size,
    };
  }
}
