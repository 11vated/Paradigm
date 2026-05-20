/**
 * Friend composition — register Friend×Domain functor bridges into the
 * Paradigm composition graph.
 *
 * Phase 3 deliverable. Every bridge here ships a custom `transform` function
 * that maps Friend genes into the target domain's gene namespace with
 * semantic fidelity (not just gene-name string matching).
 *
 * Bridges shipped:
 *   friend → music       (persona/voice  → tempo/key/scale)
 *   friend → narrative   (persona/body   → tone/structure/character)
 *   friend → visual2d    (face/body      → palette/style/complexity)
 *   friend → character   (1:1 gene map — friend IS a character++)
 *   friend → audio       (voice          → soundType/frequency/duration)
 *   friend → agent       (persona/memory → temperature/depth/exploration)
 */

import { FUNCTOR_REGISTRY, composeSeed, type FunctorBridge } from '../kernel/composition';
import type { FriendSeedData } from './types';

// ─── helpers ────────────────────────────────────────────────────────────────

const scalar = (value: number) => ({ type: 'scalar' as const, value });
const cat = (value: string) => ({ type: 'categorical' as const, value });
const vec = (value: number[]) => ({ type: 'vector' as const, value });

/** Big-Five → 0..1 single energy axis: mean of extraversion + openness − neuroticism. */
function personaEnergy(g: FriendSeedData['genes']): number {
  const p = g.persona.bigFive;
  return Math.max(0, Math.min(1, (p.extraversion + p.openness + (1 - p.neuroticism)) / 3));
}

function personaWarmth(g: FriendSeedData['genes']): number {
  const p = g.persona.bigFive;
  return Math.max(0, Math.min(1, (p.agreeableness + (1 - p.neuroticism) + g.persona.humor) / 3));
}

// ─── friend → music ─────────────────────────────────────────────────────────
// High-energy + warm → fast tempo, major key.
// Low-energy + cool  → slow tempo, minor key.

const friend_to_music: FunctorBridge = {
  name: 'friend_to_music',
  sourceDomain: 'friend',
  targetDomain: 'music',
  coherence: 0.78,
  transform: (sg: Record<string, any>) => {
    const g = sg as FriendSeedData['genes'];
    const energy = personaEnergy(g);
    const warmth = personaWarmth(g);
    const tempo = Math.round(60 + energy * 120); // 60..180 BPM
    const key = warmth > 0.5 ? 'C-major' : 'A-minor';
    const scale = g.persona.bigFive.openness > 0.6 ? 'modal' : 'diatonic';
    return {
      tempo: scalar(tempo),
      key: cat(key),
      scale: cat(scale),
      melody: scalar(g.voice.warmth),
      tuning: scalar(g.voice.pitch / 880), // pitch (Hz) → normalized 0..1
    };
  },
};

// ─── friend → narrative ─────────────────────────────────────────────────────

const friend_to_narrative: FunctorBridge = {
  name: 'friend_to_narrative',
  sourceDomain: 'friend',
  targetDomain: 'narrative',
  coherence: 0.74,
  transform: (sg: Record<string, any>, seed: any) => {
    const g = sg as FriendSeedData['genes'];
    const tone = personaWarmth(g) > 0.5
      ? (g.persona.bigFive.openness > 0.5 ? 'whimsical' : 'warm')
      : (g.persona.bigFive.openness > 0.5 ? 'somber' : 'austere');
    return {
      structure: cat(g.persona.bigFive.conscientiousness > 0.5 ? 'three-act' : 'episodic'),
      tone: cat(tone),
      characters: scalar(Math.round(1 + g.bond.initialTrust * 4)),
      plot: cat(seed?.name || 'origin'),
      acts: scalar(g.persona.bigFive.conscientiousness > 0.6 ? 5 : 3),
    };
  },
};

// ─── friend → visual2d ──────────────────────────────────────────────────────

const friend_to_visual2d: FunctorBridge = {
  name: 'friend_to_visual2d',
  sourceDomain: 'friend',
  targetDomain: 'visual2d',
  coherence: 0.72,
  transform: (sg: Record<string, any>) => {
    const g = sg as FriendSeedData['genes'];
    return {
      style: cat(g.persona.bigFive.openness > 0.5 ? 'organic' : 'architectural'),
      complexity: scalar(g.persona.bigFive.openness),
      palette: vec(g.body.skinTone),
      composition: cat(g.persona.bigFive.conscientiousness > 0.5 ? 'centered' : 'asymmetric'),
      layers: scalar(Math.round(3 + g.persona.bigFive.openness * 4)),
    };
  },
};

// ─── friend → character ─────────────────────────────────────────────────────
// Nearly 1:1 — Friend IS a character with richer gene categories.

const friend_to_character: FunctorBridge = {
  name: 'friend_to_character',
  sourceDomain: 'friend',
  targetDomain: 'character',
  coherence: 0.92,
  transform: (sg: Record<string, any>) => {
    const g = sg as FriendSeedData['genes'];
    return {
      size: scalar(g.body.heightScale),
      archetype: cat(g.body.archetype),
      strength: scalar(g.body.muscle),
      agility: scalar(1 - g.body.muscle), // inverse of muscle mass
      personality: cat(personaEnergy(g) > 0.5 ? 'extraverted' : 'introverted'),
      palette: vec(g.body.skinTone),
    };
  },
};

// ─── friend → audio ─────────────────────────────────────────────────────────

const friend_to_audio: FunctorBridge = {
  name: 'friend_to_audio',
  sourceDomain: 'friend',
  targetDomain: 'audio',
  coherence: 0.84,
  transform: (sg: Record<string, any>) => {
    const g = sg as FriendSeedData['genes'];
    return {
      soundType: cat(g.voice.warmth > 0.5 ? 'breathy' : 'clear'),
      frequency: scalar(g.voice.pitch),
      duration: scalar(0.4 + (g.voice.tempo / 150) * 0.6),
      attack: scalar(0.05 + (1 - (g.voice.tempo / 150)) * 0.2),
      decay: scalar(0.1 + (g.voice.tempo / 150) * 0.3),
    };
  },
};

// ─── friend → agent ─────────────────────────────────────────────────────────

const friend_to_agent: FunctorBridge = {
  name: 'friend_to_agent',
  sourceDomain: 'friend',
  targetDomain: 'agent',
  coherence: 0.80,
  transform: (sg: Record<string, any>) => {
    const g = sg as FriendSeedData['genes'];
    return {
      persona: cat(personaEnergy(g) > 0.5 ? 'extraverted' : 'introverted'),
      temperature: scalar(g.persona.bigFive.openness),
      reasoning_depth: scalar(g.persona.bigFive.conscientiousness),
      exploration_rate: scalar(g.persona.bigFive.openness),
      max_steps: scalar(Math.round(10 + g.persona.bigFive.conscientiousness * 90)),
    };
  },
};

const FRIEND_BRIDGES = [
  friend_to_music,
  friend_to_narrative,
  friend_to_visual2d,
  friend_to_character,
  friend_to_audio,
  friend_to_agent,
];

let _registered = false;

/**
 * Register all Friend bridges into the composition graph. Idempotent.
 * Called once at module load time (see side-effect below).
 */
export function registerFriendBridges(): void {
  if (_registered) return;
  for (const bridge of FRIEND_BRIDGES) {
    // Remove any existing bridge for the same source→target pair
    // (e.g. an auto-generated one without a custom transform). Replace by
    // domain pair, not by name — auto-functors use `${src}_${tgt}` naming
    // while ours use `${src}_to_${tgt}`.
    for (let i = FUNCTOR_REGISTRY.length - 1; i >= 0; i--) {
      const b = FUNCTOR_REGISTRY[i];
      if (b.sourceDomain === bridge.sourceDomain && b.targetDomain === bridge.targetDomain) {
        FUNCTOR_REGISTRY.splice(i, 1);
      }
    }
    FUNCTOR_REGISTRY.push(bridge);
  }
  _registered = true;
}

/**
 * Compose a Friend into another domain. Convenience wrapper around
 * the kernel's `composeSeed` that:
 *   - Stamps `$domain = 'friend'` on the input seed.
 *   - Stamps a stable `$hash` so lineage tracking works.
 *   - Routes through the registered functor.
 */
export function composeFriend(friend: FriendSeedData, targetDomain: string): any {
  registerFriendBridges();
  const seed = {
    $domain: 'friend',
    $hash: friend.id,
    name: friend.name,
    genes: friend.genes,
    $lineage: { operation: 'genesis', parents: [] },
  };
  return composeSeed(seed, targetDomain);
}

// Side-effect: register on module load so any subsequent composeSeed call
// using sourceDomain='friend' picks up our bridges.
registerFriendBridges();

export { FRIEND_BRIDGES };
