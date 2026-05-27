/**
 * Stratum Contracts barrel.
 *
 * Per Doctrine v2 Part VI. Engine owners import the contracts they
 * satisfy; the Substrate Health Dashboard (Part XV.3) imports the
 * registry to compute the Stratum Contract Conformance Index
 * (Part VI.10).
 */
export * from './types';
export { formContract, type FormArtifact } from './form';
export { motionContract, type MotionArtifact } from './motion';
export { soundContract, type SoundArtifact } from './sound';
export { mindContract, type MindArtifact } from './mind';
export { storyContract, type StoryArtifact } from './story';
export { worldContract, type WorldArtifact } from './world';
export { fieldContract, type FieldArtifact } from './field';
export { cultureContract, type CultureArtifact } from './culture';
export { timeContract, type TimeArtifact } from './time';

import { formContract } from './form';
import { motionContract } from './motion';
import { soundContract } from './sound';
import { mindContract } from './mind';
import { storyContract } from './story';
import { worldContract } from './world';
import { fieldContract } from './field';
import { cultureContract } from './culture';
import { timeContract } from './time';
import type { StratumId, StratumContract } from './types';

/**
 * The canonical nine-stratum registry. Order is doctrinal
 * (Part II.2) and must not change.
 */
export const STRATUM_CONTRACTS: Readonly<Record<StratumId, StratumContract<unknown>>> = {
  form: formContract as unknown as StratumContract<unknown>,
  motion: motionContract as unknown as StratumContract<unknown>,
  sound: soundContract as unknown as StratumContract<unknown>,
  mind: mindContract as unknown as StratumContract<unknown>,
  story: storyContract as unknown as StratumContract<unknown>,
  world: worldContract as unknown as StratumContract<unknown>,
  field: fieldContract as unknown as StratumContract<unknown>,
  culture: cultureContract as unknown as StratumContract<unknown>,
  time: timeContract as unknown as StratumContract<unknown>,
};
