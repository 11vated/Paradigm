/**
 * Game Replay Inverter — game session log → game seed
 */
import type { Inverter, InversionReport, InvertedGene, InversionResidual } from './types';

interface GameReplayArtifact {
  events: Array<{ type: string; time: number; data: unknown }>;
  duration: number;
  finalScore: number;
  levelsCompleted: number;
  deaths: number;
}

export const gameReplayInverter: Inverter<GameReplayArtifact> = {
  id: 'game.replay-v1',
  domain: 'game',
  accepts(a: GameReplayArtifact): boolean { return a && Array.isArray(a.events) && typeof a.duration === 'number'; },
  async invert(artifact: GameReplayArtifact): Promise<InversionReport> {
    const start = Date.now();
    const genes: InvertedGene[] = [];
    const residuals: InversionResidual[] = [];

    genes.push({ path: 'game.duration', value: artifact.duration, confidence: 0.95, level: 'high' });
    genes.push({ path: 'game.finalScore', value: artifact.finalScore, confidence: 0.95, level: 'high' });
    genes.push({ path: 'game.levelsCompleted', value: artifact.levelsCompleted, confidence: 0.9, level: 'high' });
    genes.push({ path: 'game.deaths', value: artifact.deaths, confidence: 0.9, level: 'high' });

    // Difficulty estimation
    const deathRate = artifact.deaths / Math.max(1, artifact.levelsCompleted);
    const difficulty = Math.min(1, deathRate / 5);
    genes.push({ path: 'game.difficulty', value: difficulty, confidence: 0.6, level: 'medium', note: 'Estimated from death rate' });

    // Event type analysis
    const eventTypes = new Set(artifact.events.map(e => e.type));
    genes.push({ path: 'game.eventTypes', value: Array.from(eventTypes), confidence: 0.8, level: 'high' });

    residuals.push({ feature: 'player strategy', reason: 'no-gene', raw: 'Strategy analysis requires LLM' });

    return {
      domain: 'game', inverterId: this.id,
      artifactBytes: JSON.stringify(artifact).length,
      genes, residuals,
      overallConfidence: genes.reduce((s, g) => s + g.confidence, 0) / genes.length,
      elapsedMs: Date.now() - start,
    };
  },
};
