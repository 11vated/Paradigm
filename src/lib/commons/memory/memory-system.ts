/**
 * MemorySystem — 4-layer memory orchestrator
 * Coordinates Working, Exemplar, Episodic, and Substrate memory layers.
 */

import { WorkingMemory } from './working-memory';
import { ExemplarMemory, type ExemplarEntry } from './exemplar-memory';
import { EpisodicMemory, type Episode } from './episodic-memory';
import { SubstrateMemory, type SubstrateQuery, type SubstrateResult } from './substrate-memory';

export class MemorySystem {
  working: WorkingMemory;
  exemplar: ExemplarMemory;
  episodic: EpisodicMemory;
  substrate: SubstrateMemory;

  constructor(userId = 'anonymous') {
    this.working = new WorkingMemory(userId);
    this.exemplar = new ExemplarMemory();
    this.episodic = new EpisodicMemory();
    this.substrate = new SubstrateMemory();
  }

  recordEpisode(
    intent: string,
    domain: string,
    description: string,
    seedId: string,
    seedHash: string,
    success: boolean,
    tags: string[] = [],
  ): void {
    const episode: Episode = {
      id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: this.working.userId,
      timestamp: Date.now(),
      intent,
      domain,
      description,
      seedId,
      seedHash,
      success,
      duration: this.working.sessionAge,
      tags,
    };
    this.episodic.record(episode);
    this.working.addRecentSeed(seedId);
    this.working.incrementTurn();
  }

  recordExemplar(
    description: string,
    domain: string,
    seedId: string,
    seedHash: string,
    embedding: number[],
    fitness: number,
    tags: string[] = [],
  ): void {
    const entry: ExemplarEntry = {
      id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description,
      domain,
      seedId,
      seedHash,
      embedding,
      fitness,
      createdAt: Date.now(),
      tags,
    };
    this.exemplar.add(entry);
  }

  querySubstrate(opts: SubstrateQuery): SubstrateResult {
    return this.substrate.querySeeds(opts);
  }

  getStats(): {
    exemplarCount: number;
    episodeCount: number;
    substrateSeeds: number;
    libraries: number;
    turnCount: number;
    sessionAge: number;
  } {
    return {
      exemplarCount: this.exemplar.count(),
      episodeCount: this.episodic.count(),
      substrateSeeds: this.substrate.querySeeds({}).total,
      libraries: this.substrate.getLibraries().length,
      turnCount: this.working.turnCount,
      sessionAge: this.working.sessionAge,
    };
  }
}