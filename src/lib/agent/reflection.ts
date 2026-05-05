/**
 * Reflexion Memory - Self-Reflection System
 * Based on Reflexion (Shinn et al., NeurIPS 2023)
 * 
 * Enables agents to learn from trial-and-error through verbal
 * self-reflection instead of weight updates.
 */

import type { Seed } from '../../kernel/types';

export interface ReflectionEntry {
  id: string;
  trial: number;
  task: string;
  outcome: string;
  feedback: string;
  reflection: string;
  success: boolean;
  timestamp: number;
}

export interface TrialResult {
  trial: number;
  result: unknown;
  success: boolean;
  reflection?: string;
}

export class ReflexionMemory {
  private reflections: ReflectionEntry[] = [];
  private maxReflections: number;
  private trialCount: number = 0;

  constructor(maxReflections: number = 5) {
    this.maxReflections = Math.max(1, Math.min(10, maxReflections));
  }

  /** Add a reflection from a trial */
  addReflection(
    task: string,
    outcome: string,
    feedback: string,
    success: boolean
  ): void {
    this.trialCount++;
    this.reflections.push({
      id: `ref_${this.trialCount}_${Date.now()}`,
      trial: this.trialCount,
      task,
      outcome,
      feedback,
      reflection: feedback,
      success,
      timestamp: Date.now(),
    });
    this.trim();
  }

  /** Get reflection context for next trial */
  getReflectionContext(): string {
    if (this.reflections.length === 0) {
      return '';
    }
    const recent = this.reflections.slice(-this.maxReflections);
    return recent
      .map((r) => `Trial ${r.trial}: ${r.success ? 'SUCCESS' : 'FAILED'} - ${r.reflection}`)
      .join('\n');
  }

  /** Check if we have successful reflections */
  hasSuccess(): boolean {
    return this.reflections.some((r) => r.success);
  }

  /** Get most recent successful reflection */
  getLastSuccess(): ReflectionEntry | undefined {
    for (let i = this.reflections.length - 1; i >= 0; i--) {
      if (this.reflections[i].success) {
        return this.reflections[i];
      }
    }
    return undefined;
  }

  /** Clear all reflections */
  clear(): void {
    this.reflections = [];
    this.trialCount = 0;
  }

  private trim(): void {
    if (this.reflections.length > this.maxReflections * 2) {
      const successful = this.reflections.filter((r) => r.success);
      const failed = this.reflections
        .filter((r) => !r.success)
        .slice(-this.maxReflections);
      this.reflections = [...successful.slice(-this.maxReflections), ...failed];
    }
  }

  get reflectionCount(): number {
    return this.reflections.length;
  }
}

/**
 * Trial Executor with Reflexion
 * Implements trial-with-retries architecture
 */
export class ReflexionExecutor {
  private memory: ReflexionMemory;
  private maxTrials: number;

  constructor(maxTrials: number = 3, maxReflections: number = 5) {
    this.maxTrials = maxTrials;
    this.memory = new ReflexionMemory(maxReflections);
  }

  /**
   * Execute a task with trials and self-reflection
   * @param task Description of the task
   * @param executor Function to execute the task
   * @param evaluator Function to evaluate success
   * @param reflector Function to generate reflection on failure
   */
  async executeWithReflexion<T>(
    task: string,
    executor: () => Promise<T>,
    evaluator: (result: T) => boolean,
    reflector: (task: string, result: T, success: boolean) => Promise<string>
  ): Promise<T> {
    let lastResult: T | undefined;
    let lastReflection = '';

    for (let trial = 1; trial <= this.maxTrials; trial++) {
      try {
        // Build context from previous reflections
        const reflectionContext = this.memory.getReflectionContext();
        const prompt = reflectionContext
          ? `${task}\n\nPrevious reflections:\n${reflectionContext}`
          : task;

        // Execute (we wrap to add context - actual implementation depends on agent)
        lastResult = await executor();

        // Evaluate success
        const success = evaluator(lastResult);

        if (success) {
          // Success! Add positive reflection
          this.memory.addReflection(
            task,
            JSON.stringify(lastResult),
            'Task completed successfully',
            true
          );
          return lastResult;
        }

        // Failure - generate reflection
        lastReflection = await reflector(task, lastResult, false);
        this.memory.addReflection(
          task,
          JSON.stringify(lastResult),
          lastReflection,
          false
        );
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const reflection = await reflector(task, lastResult as T, false);
        this.memory.addReflection(task, `Error: ${errorMsg}`, reflection, false);
      }
    }

    // Return last result even if failed
    if (lastResult === undefined) {
      throw new Error(`Reflexion: All ${this.maxTrials} trials failed`);
    }
    return lastResult;
  }

  get reflectionMemory(): ReflexionMemory {
    return this.memory;
  }
}