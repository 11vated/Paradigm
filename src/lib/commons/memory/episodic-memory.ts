/**
 * EpisodicMemory — Session history
 * Circular buffer with JSON file persistence.
 */

import fs from 'fs';
import path from 'path';

export interface Episode {
  id: string;
  userId: string;
  timestamp: number;
  intent: string;
  domain: string;
  description: string;
  seedId: string;
  seedHash: string;
  success: boolean;
  duration: number;
  tags: string[];
}

export interface EpisodeSession {
  sessionId: string;
  userId: string;
  startTime: number;
  endTime: number;
  episodes: Episode[];
}

export class EpisodicMemory {
  private sessions: Map<string, EpisodeSession> = new Map();
  private maxEpisodesPerSession: number;
  private storagePath: string;

  constructor(storagePath?: string, maxEpisodesPerSession = 100) {
    this.maxEpisodesPerSession = maxEpisodesPerSession;
    this.storagePath = storagePath || path.resolve('data/commons/memory/episodes.json');
    this.load();
  }

  record(episode: Episode): void {
    const sessionId = `${episode.userId}_${new Date().toISOString().slice(0, 10)}`;
    let session = this.sessions.get(sessionId);

    if (!session) {
      session = {
        sessionId,
        userId: episode.userId,
        startTime: episode.timestamp,
        endTime: episode.timestamp,
        episodes: [],
      };
      this.sessions.set(sessionId, session);
    }

    session.episodes.unshift(episode);
    session.endTime = episode.timestamp;

    if (session.episodes.length > this.maxEpisodesPerSession) {
      session.episodes.pop();
    }

    this.prune();
    this.save();
  }

  getSession(sessionId: string): EpisodeSession | undefined {
    return this.sessions.get(sessionId);
  }

  getRecentEpisodes(userId: string, count = 20): Episode[] {
    const episodes: Episode[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        episodes.push(...session.episodes);
      }
    }
    episodes.sort((a, b) => b.timestamp - a.timestamp);
    return episodes.slice(0, count);
  }

  findByIntent(intent: string, count = 10): Episode[] {
    const episodes: Episode[] = [];
    for (const session of this.sessions.values()) {
      for (const ep of session.episodes) {
        if (ep.intent === intent) episodes.push(ep);
      }
    }
    episodes.sort((a, b) => b.timestamp - a.timestamp);
    return episodes.slice(0, count);
  }

  findByDomain(domain: string, count = 10): Episode[] {
    const episodes: Episode[] = [];
    for (const session of this.sessions.values()) {
      for (const ep of session.episodes) {
        if (ep.domain === domain) episodes.push(ep);
      }
    }
    episodes.sort((a, b) => b.timestamp - a.timestamp);
    return episodes.slice(0, count);
  }

  count(): number {
    let total = 0;
    for (const session of this.sessions.values()) {
      total += session.episodes.length;
    }
    return total;
  }

  private prune(): void {
    const maxSessions = 100;
    const sorted = [...this.sessions.entries()].sort((a, b) => b[1].endTime - a[1].endTime);
    while (sorted.length > maxSessions) {
      const [id] = sorted.pop()!;
      this.sessions.delete(id);
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const data = [...this.sessions.values()];
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch { /* silently fail on persist errors */ }
  }

  private load(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data: EpisodeSession[] = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
        for (const session of data) {
          this.sessions.set(session.sessionId, session);
        }
      }
    } catch { /* silently fail on load errors */ }
  }
}