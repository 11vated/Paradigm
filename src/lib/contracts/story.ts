/**
 * Story stratum contract — Doctrine v2 Part VI.5.
 *
 * - Beat structure declared.
 * - Causality graph acyclic.
 * - Character voice consistency vs MindSeed fingerprints.
 */
import { defineStratum, todoPredicate, type StratumContract } from './types';

export interface StoryArtifact {
  /** Declared beat structure id ('save-the-cat' | 'heros-journey' | string). */
  readonly beatStructure?: string;
  /** Beat count. */
  readonly beatCount?: number;
  /** Whether the causality graph is acyclic (engine self-report). */
  readonly causalityAcyclic?: boolean;
  /** Linked MindSeed hashes per character. */
  readonly characterMindHashes?: Readonly<Record<string, string>>;
}

export const storyContract: StratumContract<StoryArtifact> = defineStratum<StoryArtifact>(
  'story',
  '0.1.0',
  [
    todoPredicate('story.beatStructureDeclared', 'A canonical beat structure is declared and matches the beat count.'),
    todoPredicate('story.causalityAcyclic', 'Event causality graph is acyclic.'),
    todoPredicate('story.voiceConsistency', 'Dialogue per character matches the voice fingerprint of its MindSeed.'),
  ],
);
