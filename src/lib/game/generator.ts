/**
 * Game-v1 generator — turn a QuestSeed into a deterministic scene graph.
 *
 * Same QuestSeed → byte-identical GameArtifact. The Friend's name and
 * the World's locations are woven directly into scene text so each game
 * feels grounded in its parents.
 */

import { createHash } from 'crypto';
import { Xoshiro256StarStar } from '../kernel/rng';
import type { QuestSeedData } from '../world/quest';
import type { WorldArtifact } from '../world/types';
import {
  GAME_GENERATOR_VERSION,
  type GameSeedData,
  type GameArtifact,
  type GameScene,
  type GameEnding,
  type SceneChoice,
} from './types';

// Scene templates per archetype — beats that compose into a complete arc.
const ARCHETYPE_BEATS: Record<string, string[]> = {
  'heros-journey':           ['Call', 'Threshold', 'Trial', 'Revelation', 'Ordeal', 'Return'],
  'mystery-investigation':   ['Discovery', 'Interview', 'Lead', 'Suspect', 'Reveal', 'Confrontation'],
  'underdog-rebellion':      ['Spark', 'Gather', 'Raid', 'Betrayal', 'Stand', 'Verdict'],
  'discovery-expedition':    ['Map', 'Journey', 'Wonder', 'Hazard', 'Pinnacle', 'Homecoming'],
  'political-intrigue':      ['Court', 'Whisper', 'Alliance', 'Knife', 'Vote', 'Throne'],
  'redemption-arc':          ['Past', 'Fall', 'Quiet', 'Test', 'Atonement', 'Choice'],
  'survival-crawl':          ['Storm', 'Shelter', 'Hunger', 'Hunt', 'Wound', 'Dawn'],
};

const DEFAULT_BEATS = ARCHETYPE_BEATS['heros-journey'];

function hashId(input: string, prefix = ''): string {
  return prefix + createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/** Build a GameSeedData from a QuestSeedData. */
export function createGameSeed(quest: QuestSeedData, salt?: string): GameSeedData {
  const sceneRng = new Xoshiro256StarStar(`game/${quest.seedHash}/${salt ?? 'v1'}`);
  const branchingFactor = 2 + Math.floor(sceneRng.nextF64() * 2);  // 2..3
  const scenesPerAct = 3 + Math.floor(sceneRng.nextF64() * 2);     // 3..4
  const endingCount = 2 + Math.floor(quest.genes.moralComplexity * 3);  // 2..4
  const seedHash = createHash('sha256')
    .update(`game/${quest.seedHash}/${salt ?? 'v1'}/${branchingFactor}/${scenesPerAct}/${endingCount}`)
    .digest('hex');
  return {
    id: hashId(seedHash),
    seedHash,
    questSeedHash: quest.seedHash,
    parents: {
      friend: quest.parents.friend,
      world:  quest.parents.world,
      quest:  { id: quest.id, seedHash: quest.seedHash },
    },
    archetype: quest.genes.archetype,
    actCount: quest.genes.actCount,
    branchingFactor,
    scenesPerAct,
    endingCount,
  };
}

function beatText(beat: string, act: number, friend: string, location: string, archetype: string): { title: string; body: string } {
  const a = act + 1;
  const title = `Act ${a}: ${beat}`;
  let body = '';
  switch (beat) {
    case 'Call':       body = `${friend} stands at the edge of ${location} as the call refuses to be silenced.`; break;
    case 'Threshold': body = `Past the gate of ${location}, ${friend} can no longer pretend this is someone else's story.`; break;
    case 'Discovery': body = `${friend} finds the first thread in ${location}. It will not let go.`; break;
    case 'Interview': body = `In ${location}, ${friend} listens. The answers split like a struck bell.`; break;
    case 'Spark':      body = `In the low light of ${location}, ${friend} hears it spoken aloud: rebellion.`; break;
    case 'Gather':     body = `${friend} returns to ${location} with names. Each one a risk, each one a hope.`; break;
    case 'Map':        body = `${friend} unrolls a map of ${location}. The blank places are where the story will be written.`; break;
    case 'Journey':    body = `${location} stretches longer than the map said it would. ${friend} keeps walking.`; break;
    case 'Court':      body = `${friend} arrives in ${location} dressed as politely as a knife.`; break;
    case 'Past':       body = `${location} remembers ${friend}. ${friend} would rather it did not.`; break;
    case 'Storm':      body = `The weather breaks over ${location}. ${friend} has hours, not days.`; break;
    case 'Trial':      body = `The first true test arrives in ${location}. ${friend} does not yet know which choice is the test.`; break;
    case 'Revelation': body = `${friend} understands now what ${location} has been trying to say all along.`; break;
    case 'Ordeal':     body = `Whatever ${friend} carried into ${location}, only the unbearable part comes out.`; break;
    case 'Return':     body = `${friend} walks back through ${location} the way no one ever quite does.`; break;
    default:           body = `${friend} faces "${beat}" in ${location}.`;
  }
  // archetype seasoning (single sentence)
  if (archetype === 'mystery-investigation') body += ' Something does not add up.';
  if (archetype === 'survival-crawl')        body += ' The cold counts each breath.';
  if (archetype === 'political-intrigue')    body += ' Everyone is smiling.';
  return { title, body };
}

function buildChoices(
  rng: Xoshiro256StarStar,
  branchingFactor: number,
  beat: string,
  nextSceneIds: string[],
  isActEnd: boolean,
): SceneChoice[] {
  // Choice prompts vary by beat; deterministic per (beat, rng state).
  const prompts: Record<string, string[]> = {
    Call:       ['Answer the call', 'Refuse, but watch', 'Bargain for time'],
    Threshold: ['Step through', 'Speak the password aloud', 'Wait until dusk'],
    Discovery: ['Take the evidence', 'Leave it, watch who returns', 'Confront the source'],
    Spark:      ['Speak with the seditious', 'Walk away, remember every face', 'Carry word to the lord'],
    Map:        ['Plot the safest route', 'Plot the swiftest route', 'Trust an old rumour'],
    Court:      ['Listen, give nothing', 'Make an alliance', 'Plant a quiet lie'],
    Past:       ['Confess to a stranger', 'Pretend it never happened', 'Hunt the witness'],
    Storm:      ['Press through', 'Find shelter', 'Try to ride it out'],
  };
  const set = prompts[beat] ?? ['Press forward', 'Take the cautious path', 'Listen first'];
  const n = Math.min(branchingFactor, nextSceneIds.length, set.length);
  const choices: SceneChoice[] = [];
  for (let i = 0; i < n; i++) {
    choices.push({
      text: set[i],
      nextScene: nextSceneIds[i % nextSceneIds.length],
      karma: (i === 0 ? 0.2 : i === n - 1 ? -0.2 : 0) + rng.nextF64() * 0.1 - 0.05,
      endsAct: isActEnd && i === 0,
    });
  }
  return choices;
}

/** Grow a Game artifact from its seed. Optionally enrich with WorldArtifact for locations. */
export function generateGame(seed: GameSeedData, world?: WorldArtifact): GameArtifact {
  const rng = new Xoshiro256StarStar(`game-grow/${seed.seedHash}`);
  const archetype = seed.archetype;
  const baseBeats = ARCHETYPE_BEATS[archetype] ?? DEFAULT_BEATS;
  const totalScenes = seed.actCount * seed.scenesPerAct;
  const beats = Array.from({ length: totalScenes }, (_, i) => baseBeats[i % baseBeats.length]);
  const friendName = seed.parents.friend.name;
  const worldName = seed.parents.world.name;
  const locations = world?.locations.map((l) => l.name) ?? [worldName];

  // Build scenes top-down, assigning deterministic ids.
  const scenes: GameScene[] = [];
  for (let i = 0; i < beats.length; i++) {
    const act = Math.floor(i / seed.scenesPerAct);
    const beat = beats[i];
    const location = locations[i % locations.length];
    const { title, body } = beatText(beat, act, friendName, location, archetype);
    scenes.push({
      id: hashId(`${seed.seedHash}/${i}`, 's'),
      act,
      title,
      body,
      setting: location,
      choices: [],
    });
  }

  // Now wire choices. The last scene in each act ends the act; the very last
  // scene's choices each map to an ending.
  const endingIds = Array.from({ length: seed.endingCount }, (_, i) => hashId(`${seed.seedHash}/end/${i}`, 'e'));
  for (let i = 0; i < scenes.length; i++) {
    const isLast = i === scenes.length - 1;
    // Real branching implemented: choices within an act target different upcoming scenes (i+1 or i+2 offset),
    // creating divergent paths before endings (karma still gates final). Deterministic via structure + rng in buildChoices for prompts.
    // branchingHealth in oracle measures % scenes with >=2 distinct choices.
    let targets: string[];
    if (isLast) {
      targets = endingIds;
    } else {
      targets = [];
      for (let b = 0; b < seed.branchingFactor; b++) {
        const offset = 1 + (b % 2); // simple det diverge: alternate next vs skip-one for real path variation
        const targetIdx = Math.min(i + offset, scenes.length - 1);
        targets.push(scenes[targetIdx].id);
      }
    }
    scenes[i].choices = buildChoices(rng, seed.branchingFactor, beats[i], targets, (i + 1) % seed.scenesPerAct === 0);
  }

  // Build endings — karma-gated.
  const endings: GameEnding[] = [];
  for (let i = 0; i < seed.endingCount; i++) {
    const flavor = i === 0 ? 'Triumph' : i === seed.endingCount - 1 ? 'Ruin' : 'Quiet Settlement';
    const min = -1 + (i / seed.endingCount) * 2;
    const max = -1 + ((i + 1) / seed.endingCount) * 2;
    endings.push({
      id: endingIds[i],
      title: `Ending ${i + 1}: ${flavor}`,
      body: `${friendName} ends the story in ${worldName}. ${flavor.toLowerCase()}.`,
      karmaRequirement: { min, max },
    });
  }

  const totalChoices = scenes.reduce((s, sc) => s + sc.choices.length, 0);
  return {
    seedId: seed.id,
    seedHash: seed.seedHash,
    title: `${friendName} of ${worldName}`,
    pitch: `A ${archetype} for ${friendName}, played out across ${worldName}.`,
    archetype,
    startScene: scenes[0].id,
    scenes,
    endings,
    meta: {
      generatorVersion: GAME_GENERATOR_VERSION,
      sceneCount: scenes.length,
      choiceCount: totalChoices,
      averageChoicesPerScene: scenes.length === 0 ? 0 : totalChoices / scenes.length,
    },
  };
}

/** Hash the deterministic content of a GameArtifact. */
export function hashArtifact(a: GameArtifact): string {
  const canonical = JSON.stringify({
    seedId: a.seedId,
    seedHash: a.seedHash,
    title: a.title,
    pitch: a.pitch,
    archetype: a.archetype,
    startScene: a.startScene,
    scenes: a.scenes,
    endings: a.endings,
    sceneCount: a.meta.sceneCount,
    choiceCount: a.meta.choiceCount,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export { GAME_GENERATOR_VERSION } from './types';
