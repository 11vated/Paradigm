/**
 * WorkingMemory — Current session context
 * Volatile in-memory store for the active session scope.
 */

export interface UserPreference {
  key: string;
  value: unknown;
  source: 'explicit' | 'inferred' | 'default';
}

export interface SessionContext {
  userId: string;
  activeDomain: string;
  recentSeedIds: string[];
  recentArtifactHashes: string[];
  preferences: Map<string, UserPreference>;
  currentIntent: string | null;
  styleHints: string[];
  startTime: number;
  turnCount: number;
}

export class WorkingMemory {
  private context: SessionContext;

  constructor(userId: string) {
    this.context = {
      userId,
      activeDomain: 'character',
      recentSeedIds: [],
      recentArtifactHashes: [],
      preferences: new Map(),
      currentIntent: null,
      styleHints: [],
      startTime: Date.now(),
      turnCount: 0,
    };
  }

  get userId(): string { return this.context.userId; }
  get activeDomain(): string { return this.context.activeDomain; }
  get recentSeedIds(): string[] { return [...this.context.recentSeedIds]; }
  get recentArtifactHashes(): string[] { return [...this.context.recentArtifactHashes]; }
  get turnCount(): number { return this.context.turnCount; }
  get sessionAge(): number { return Date.now() - this.context.startTime; }

  setActiveDomain(domain: string): void {
    this.context.activeDomain = domain;
  }

  setCurrentIntent(intent: string): void {
    this.context.currentIntent = intent;
  }

  addRecentSeed(id: string): void {
    this.context.recentSeedIds = [id, ...this.context.recentSeedIds.filter(s => s !== id)].slice(0, 20);
  }

  addRecentArtifact(hash: string): void {
    this.context.recentArtifactHashes = [hash, ...this.context.recentArtifactHashes.filter(h => h !== hash)].slice(0, 10);
  }

  addStyleHint(hint: string): void {
    if (!this.context.styleHints.includes(hint)) {
      this.context.styleHints.push(hint);
    }
  }

  setPreference(key: string, value: unknown, source: UserPreference['source'] = 'inferred'): void {
    this.context.preferences.set(key, { key, value, source });
  }

  getPreference(key: string): UserPreference | undefined {
    return this.context.preferences.get(key);
  }

  incrementTurn(): void {
    this.context.turnCount++;
  }

  snapshot(): SessionContext {
    return { ...this.context, preferences: new Map(this.context.preferences) };
  }

  reset(): void {
    this.context.recentSeedIds = [];
    this.context.recentArtifactHashes = [];
    this.context.currentIntent = null;
    this.context.turnCount = 0;
    this.context.startTime = Date.now();
  }
}