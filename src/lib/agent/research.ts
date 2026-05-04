/**
 * Autonomous Research Loop
 * Enables Paradigm to continuously improve itself
 * through self-analysis and recursive enhancement.
 */

import { ParadigmAgent } from './agent';
import type { Seed } from '../../kernel/types';

export interface ResearchConfig {
  enabled: boolean;
  maxIterations: number;
  improvementThreshold: number;
}

export interface ResearchResult {
  iterations: number;
  improvements: string[];
  recommendations: string[];
  converged: boolean;
}

export class AutonomousResearchLoop {
  private agent: ParadigmAgent;
  private config: ResearchConfig;
  private history: ResearchResult[] = [];

  constructor(config: ResearchConfig = { enabled: true, maxIterations: 10, improvementThreshold: 0.05 }) {
    this.agent = new ParadigmAgent();
    this.config = config;
  }

  /**
   * Run autonomous research to improve Paradigm
   */
  async runResearch(query: string): Promise<ResearchResult> {
    if (!this.config.enabled) {
      return { iterations: 0, improvements: [], recommendations: [], converged: true };
    }

    const improvements: string[] = [];
    const recommendations: string[] = [];
    let lastFitness = 0.5;

    for (let i = 0; i < this.config.maxIterations; i++) {
      const response = await this.agent.process(query);

      if (response.success && response.data?.fitness) {
        const fitness = response.data.fitness;
        const delta = fitness - lastFitness;

        if (delta > this.config.improvementThreshold) {
          improvements.push(`Iteration ${i + 1}: +${delta.toFixed(4)}`);
          lastFitness = fitness;
        }

        const recs = await this.analyzeGaps();
        recommendations.push(...recs);
      }
    }

    this.history.push({
      iterations: this.config.maxIterations,
      improvements,
      recommendations,
      converged: improvements.length === 0,
    });

    return {
      iterations: this.config.maxIterations,
      improvements,
      recommendations: [...new Set(recommendations)],
      converged: improvements.length === 0,
    };
  }

  /**
   * Analyze current gaps and recommend improvements
   */
  private async analyzeGaps(): Promise<string[]> {
    const gaps: string[] = [];

    const domainResponse = await this.agent.process('list domains');
    if (domainResponse.success) {
      const count = domainResponse.data?.count || 0;
      if (count < 27) gaps.push(`Add missing domain engines (${27 - count} remaining)`);
    }

    return gaps;
  }

  /**
   * Get research history
   */
  getHistory(): ResearchResult[] {
    return this.history;
  }

  /**
   * Check if Paradigm is improving
   */
  isImproving(): boolean {
    const recent = this.history.slice(-3);
    if (recent.length < 2) return true;
    return recent[recent.length - 1].improvements.length > recent[0].improvements.length;
  }
}

export const researchLoop = new AutonomousResearchLoop();