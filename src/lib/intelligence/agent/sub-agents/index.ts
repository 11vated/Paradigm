/**
 * Sub-agents barrel — canonical 7 specialists + 1 critic.
 *
 * Source: PAradigm-reference/intelligence/8-sub-agents.md
 */

export { BaseSubAgent, scopedMemoryView, intentVector, projectAxis, mapTo, emit, axisAffinity } from './base';
export { VisionAgent } from './vision-agent';
export { PersonalityAgent } from './personality-agent';
export { MusicTheoryAgent } from './music-theory-agent';
export { NarrativeAgent } from './narrative-agent';
export { MechanicsAgent } from './mechanics-agent';
export { PhysicsAgent } from './physics-agent';
export { StyleAgent } from './style-agent';
export { CritiqueAgent } from './critique-agent';

import { VisionAgent } from './vision-agent';
import { PersonalityAgent } from './personality-agent';
import { MusicTheoryAgent } from './music-theory-agent';
import { NarrativeAgent } from './narrative-agent';
import { MechanicsAgent } from './mechanics-agent';
import { PhysicsAgent } from './physics-agent';
import { StyleAgent } from './style-agent';
import { CritiqueAgent } from './critique-agent';
import type { SubAgent } from '../types';

/** The canonical 8-sub-agent roster (7 specialists + 1 critic). */
export function defaultSubAgents(): SubAgent[] {
  return [
    new VisionAgent(),
    new PersonalityAgent(),
    new MusicTheoryAgent(),
    new NarrativeAgent(),
    new MechanicsAgent(),
    new PhysicsAgent(),
    new StyleAgent(),
    new CritiqueAgent(),
  ];
}
