/**
 * Intent Taxonomy
 *
 * The 10 top-level intents and their canonical sub-intents.
 * Source: PAradigm-reference/intelligence/intent-taxonomy.md
 *
 * Used by Stage 1 (Parse) to classify natural-language utterances.
 * Used by Stage 2 (Resolve) to pick the right Template Bridge entry.
 */

import type { TopLevelIntent } from './types';

export interface IntentSpec {
  top: TopLevelIntent;
  description: string;
  subIntents: SubIntentSpec[];
  /** Triggers — verbs / phrases that strongly suggest this intent */
  triggers: string[];
}

export interface SubIntentSpec {
  id: string;
  description: string;
  /** Example utterances for few-shot prompting */
  examples: string[];
}

export const INTENT_TAXONOMY: IntentSpec[] = [
  {
    top: 'CREATE',
    description: 'Make something new from a description',
    triggers: ['make', 'create', 'generate', 'design', 'build', 'invent', 'compose a new', 'give me a'],
    subIntents: [
      {
        id: 'CREATE.character',
        description: 'A new sentient agent (friend, NPC, hero, villain)',
        examples: [
          'create a melancholy bard with a kind heart',
          'design a stoic warrior who lost her brother',
          'make a chaotic-good rogue with an addiction to spicy food',
        ],
      },
      {
        id: 'CREATE.world',
        description: 'A new setting, place, or universe',
        examples: [
          'a sun-scorched desert world ruled by glass merchants',
          'a low-gravity ocean planet covered in floating cities',
        ],
      },
      {
        id: 'CREATE.music',
        description: 'A composition, song, motif, or soundscape',
        examples: [
          'compose a melancholic violin piece in D minor',
          'a hip-hop beat at 90 bpm with a vinyl crackle',
        ],
      },
      {
        id: 'CREATE.game',
        description: 'A playable artifact (level, mechanic, full game)',
        examples: [
          'a tactical roguelike with permadeath and floor 1 = corn maze',
          'a 2-player co-op puzzle with shared cooldown',
        ],
      },
      {
        id: 'CREATE.visual',
        description: 'A static visual (sprite, illustration, poster)',
        examples: [
          'pixel art of a phoenix mid-rebirth',
          'art deco poster for a 1920s Mars colony',
        ],
      },
      {
        id: 'CREATE.narrative',
        description: 'A story, scene, dialogue, or quest',
        examples: [
          'a quest where the friend has to choose between revenge and reconciliation',
          'opening chapter of a noir mystery on a generation ship',
        ],
      },
      {
        id: 'CREATE.object',
        description: 'A physical/virtual artifact (weapon, vehicle, structure, costume)',
        examples: [
          'a katana forged from a fallen star',
          'a gothic cathedral converted into a hacker collective',
        ],
      },
    ],
  },
  {
    top: 'EVOLVE',
    description: 'Mutate, iterate, or refine an existing seed',
    triggers: ['mutate', 'evolve', 'iterate', 'refine', 'make it more', 'less', 'darker', 'lighter'],
    subIntents: [
      {
        id: 'EVOLVE.mutate',
        description: 'Apply small random mutations within a budget',
        examples: ['mutate slightly', 'give me 5 variations'],
      },
      {
        id: 'EVOLVE.refine',
        description: 'Targeted adjustment along a dimension',
        examples: ['make her more melancholy', 'less aggressive', 'warmer voice'],
      },
      {
        id: 'EVOLVE.optimize',
        description: 'Run evolution to maximize oracle score',
        examples: ['optimize for coherence', 'maximize playability'],
      },
    ],
  },
  {
    top: 'COMPOSE',
    description: 'Blend across domains (character → music, world → game)',
    triggers: ['compose', 'translate to', 'project into', 'as a', 'in the style of'],
    subIntents: [
      {
        id: 'COMPOSE.cross',
        description: 'Cross-domain projection',
        examples: ['turn this character into a music theme', 'this world as a board game'],
      },
      {
        id: 'COMPOSE.multi',
        description: 'Multi-input weighted blend',
        examples: ['blend Aria and Kael 60/40', 'overlay this world on that world'],
      },
    ],
  },
  {
    top: 'BREED',
    description: 'Genetic crossover producing offspring',
    triggers: ['breed', 'child of', 'cross', 'offspring', 'descendant'],
    subIntents: [
      {
        id: 'BREED.crossover',
        description: 'Two-parent seed crossover',
        examples: ['breed Aria + Kael', 'give me their child'],
      },
    ],
  },
  {
    top: 'EXPLAIN',
    description: 'Describe an existing seed in natural language',
    triggers: ['describe', 'who is', 'what is', 'tell me about', 'explain'],
    subIntents: [
      {
        id: 'EXPLAIN.profile',
        description: 'Full profile dump',
        examples: ['describe Aria', 'who is Kael'],
      },
      {
        id: 'EXPLAIN.lineage',
        description: 'Trace ancestry / provenance',
        examples: ['how was this made', 'show lineage'],
      },
    ],
  },
  {
    top: 'CRITIQUE',
    description: 'Quality assessment against the oracle',
    triggers: ['critique', 'review', 'rate', 'is this good', 'what is wrong with'],
    subIntents: [
      {
        id: 'CRITIQUE.full',
        description: 'Full oracle report with axes',
        examples: ['critique this', 'rate Aria'],
      },
    ],
  },
  {
    top: 'TRANSPOSE',
    description: 'Cross-dimensional projection (e.g. melody → palette)',
    triggers: ['transpose', 'as colors', 'as a melody', 'sonify', 'visualize'],
    subIntents: [
      {
        id: 'TRANSPOSE.dimension',
        description: 'Project a seed from one dimension to another',
        examples: ['sonify this character', 'visualize this melody as a palette'],
      },
    ],
  },
  {
    top: 'EMBODY',
    description: 'Materialize a seed into a playable / renderable artifact',
    triggers: ['render', 'export', 'build', 'compile', 'make playable', 'as a 3D model'],
    subIntents: [
      {
        id: 'EMBODY.audio',
        description: 'WAV / MIDI / Stems',
        examples: ['render to wav', 'export stems'],
      },
      {
        id: 'EMBODY.mesh3d',
        description: 'GLB / OBJ / STL',
        examples: ['as a 3D model', 'export glb'],
      },
      {
        id: 'EMBODY.game',
        description: 'Playable build (HTML / Godot / Unity)',
        examples: ['build me the game', 'export as html5'],
      },
      {
        id: 'EMBODY.visual',
        description: 'PNG / SVG / Sprite atlas',
        examples: ['render at 1024x1024', 'export the sprite sheet'],
      },
    ],
  },
  {
    top: 'NAVIGATE',
    description: 'Explore lineage / canon / memory',
    triggers: ['show', 'list', 'find', 'search', 'who else', 'what worlds'],
    subIntents: [
      {
        id: 'NAVIGATE.canon',
        description: 'Browse the user\'s canon',
        examples: ['list my characters', 'show me my worlds'],
      },
      {
        id: 'NAVIGATE.lineage',
        description: 'Walk a lineage tree',
        examples: ['ancestors of Aria', 'descendants of this world'],
      },
    ],
  },
  {
    top: 'GOVERN',
    description: 'Sign, publish, vote, transfer, license',
    triggers: ['sign', 'publish', 'mint', 'transfer', 'license', 'vote'],
    subIntents: [
      {
        id: 'GOVERN.sign',
        description: 'Sign with sovereignty key',
        examples: ['sign this', 'attest authorship'],
      },
      {
        id: 'GOVERN.publish',
        description: 'Publish to marketplace',
        examples: ['publish Aria', 'list this for sale'],
      },
    ],
  },
];

/** Build a flat lookup map */
export const INTENT_MAP: Map<string, SubIntentSpec & { top: TopLevelIntent }> = new Map(
  INTENT_TAXONOMY.flatMap((spec) =>
    spec.subIntents.map((sub) => [sub.id, { ...sub, top: spec.top }] as const),
  ),
);

/** Few-shot example block, for prompting Stage 1 */
export function buildIntentTaxonomyPrompt(): string {
  return INTENT_TAXONOMY.map((spec) => {
    const subs = spec.subIntents
      .map((s) => `    • ${s.id}: ${s.description}\n      e.g. "${s.examples[0]}"`)
      .join('\n');
    return `${spec.top} — ${spec.description}\n${subs}`;
  }).join('\n\n');
}
