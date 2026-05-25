/**
 * The Nine Engines — barrel + registry.
 *
 * Phase 1 close: every engine adapter from PRs #56, #58, #60, #61, #62,
 * #63, #64, #65, #66 is wired here. This file is the doctrinal substrate
 * surface — the single import the rest of the system uses to access any
 * engine.
 *
 * Doctrine: `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`
 * Part III. Composition stack (Multiverse Director) lands in Phase 2.
 */
export type {
  Engine,
  EngineCapability,
  EngineContext,
  EngineContract,
} from './types';

// ─── Form ──────────────────────────────────────────────────────────────────
export {
  capability as formCapability,
  engine as formEngine,
  generateForm,
} from './form';
export type { FormKind, FormRequest, FormArtifact } from './form';

// ─── Motion ────────────────────────────────────────────────────────────────
export {
  capability as motionCapability,
  engine as motionEngine,
  generateMotion,
} from './motion';
export type { MotionKind, MotionRequest, MotionArtifact } from './motion';

// ─── Sound ─────────────────────────────────────────────────────────────────
export {
  capability as soundCapability,
  engine as soundEngine,
  generateSound,
} from './sound';
export type { SoundKind, SoundRequest, SoundArtifact } from './sound';

// ─── World ─────────────────────────────────────────────────────────────────
export {
  capability as worldCapability,
  engine as worldEngine,
  generateWorld,
} from './world';
export type { WorldKind, WorldRequest, WorldEngineArtifact } from './world';

// ─── Mind ──────────────────────────────────────────────────────────────────
export {
  capability as mindCapability,
  engine as mindEngine,
  generateMind,
} from './mind';
export type { MindKind, MindRequest, MindArtifact } from './mind';

// ─── Play (crown) ──────────────────────────────────────────────────────────
export {
  capability as playCapability,
  engine as playEngine,
  generatePlay,
} from './play';
export type { PlayKind, PlayRequest, PlayArtifact } from './play';

// ─── Story ─────────────────────────────────────────────────────────────────
export {
  capability as storyCapability,
  engine as storyEngine,
  generateStory,
} from './story';
export type { StoryKind, StoryRequest, StoryArtifact } from './story';

// ─── Matter ────────────────────────────────────────────────────────────────
export {
  capability as matterCapability,
  engine as matterEngine,
  generateMatter,
} from './matter';
export type { MatterKind, MatterRequest, MatterArtifact } from './matter';

// ─── Field (Unseen Renderer) ───────────────────────────────────────────────
// field.ts is contract-surface only on origin/main; the working adapter lives
// on the paradigm-infinite/ws-6-unseen-renderer branch (PR #58). When that
// merges this re-export becomes the active surface.
export {
  capability as fieldCapability,
} from './field';

// ─── Registry ──────────────────────────────────────────────────────────────
import type { Engine, EngineCapability } from './types';
import { engine as _form } from './form';
import { engine as _motion } from './motion';
import { engine as _sound } from './sound';
import { engine as _world } from './world';
import { engine as _mind } from './mind';
import { engine as _play } from './play';
import { engine as _story } from './story';
import { engine as _matter } from './matter';
import { engine as _field } from './field';

export const ENGINES: Readonly<Record<string, Engine>> = Object.freeze({
  form: _form,
  motion: _motion,
  sound: _sound,
  world: _world,
  mind: _mind,
  play: _play,
  story: _story,
  matter: _matter,
  field: _field,
});

export const ENGINE_IDS = Object.freeze([
  'form',
  'motion',
  'sound',
  'world',
  'mind',
  'play',
  'story',
  'matter',
  'field',
] as const);

export type EngineId = (typeof ENGINE_IDS)[number];

export function getEngine(id: EngineId): Engine | undefined {
  return ENGINES[id];
}

export function listEngineCapabilities(): readonly EngineCapability[] {
  return Object.values(ENGINES).map((e) => e.capability);
}
