/**
 * Paradigm Absolute — Agent Session Memory
 *
 * Sliding-window memory for multi-turn conversations.
 * Window size controlled by the agent seed's context_window gene.
 * Non-persistent (session-scoped). For persistent knowledge,
 * use the agent seed's knowledge_base gene.
 */

import type { MemoryEntry, AgentIntent } from './types.js';

export class AgentMemory {
  private entries: MemoryEntry[] = [];
  private maxEntries: number;
  private turnCounter: number = 0;

  constructor(maxEntries: number = 25) {
    this.maxEntries = Math.max(1, Math.min(50, maxEntries));
  }

  /** Record a user message */
  addUserMessage(content: string, seedsReferenced: string[] = []): void {
    this.turnCounter++;
    this.entries.push({
      turn: this.turnCounter,
      role: 'user',
      content,
      seedsReferenced,
      seedsCreated: [],
      intent: 'unknown',
      timestamp: Date.now(),
    });
    this.trim();
  }

  /** Record an agent response */
  addAgentResponse(
    content: string,
    intent: AgentIntent,
    seedsCreated: string[] = [],
    seedsReferenced: string[] = [],
  ): void {
    this.entries.push({
      turn: this.turnCounter,
      role: 'agent',
      content,
      seedsReferenced,
      seedsCreated,
      intent,
      timestamp: Date.now(),
    });
    this.trim();
  }

  /** Get recent conversation context for prompt building */
  getContext(maxTurns?: number): MemoryEntry[] {
    const limit = maxTurns ?? this.maxEntries;
    return this.entries.slice(-limit * 2); // *2 because each turn has user + agent
  }

  /** Format memory as prompt context string */
  formatForPrompt(maxTokensEstimate: number = 1000): string {
    const entries = this.getContext();
    if (entries.length === 0) return '';

    const lines: string[] = [];
    let charCount = 0;
    const charLimit = maxTokensEstimate * 4; // rough token-to-char ratio

    // Walk backwards to prioritize recent context
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      const line = `[${e.role}] ${e.content}`;
      if (charCount + line.length > charLimit) break;
      lines.unshift(line);
      charCount += line.length;
    }

    return lines.join('\n');
  }

  /** Get all seed hashes mentioned or created in recent history */
  getRecentSeedHashes(maxTurns: number = 5): { referenced: Set<string>; created: Set<string> } {
    const recent = this.entries.slice(-maxTurns * 2);
    const referenced = new Set<string>();
    const created = new Set<string>();

    for (const e of recent) {
      for (const h of e.seedsReferenced) referenced.add(h);
      for (const h of e.seedsCreated) created.add(h);
    }

    return { referenced, created };
  }

  /** Get the last N intents (for pattern detection) */
  getRecentIntents(n: number = 5): AgentIntent[] {
    return this.entries
      .filter(e => e.role === 'agent')
      .slice(-n)
      .map(e => e.intent);
  }

  /** How many turns have occurred */
  get turnCount(): number {
    return this.turnCounter;
  }

  /** Total entries in memory */
  get size(): number {
    return this.entries.length;
  }

  /** Clear all memory */
  clear(): void {
    this.entries = [];
    this.turnCounter = 0;
  }

  /** Update max entries (e.g., when agent seed changes) */
  setMaxEntries(max: number): void {
    this.maxEntries = Math.max(1, Math.min(50, max));
    this.trim();
  }

  private trim(): void {
    while (this.entries.length > this.maxEntries * 2) {
      this.entries.shift();
    }
  }
}
