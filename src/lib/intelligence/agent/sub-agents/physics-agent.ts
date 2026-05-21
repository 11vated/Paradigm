/**
 * PhysicsAgent — gravity, friction, mass, light, sound propagation.
 *
 * Maps the 12-D vector to gene values controlling how a world / object
 * physically behaves:
 *   physics.gravity      (m/s²)
 *   physics.friction     (0–1)
 *   physics.bounciness   (0–1)
 *   physics.viscosity    (0–1, density of the medium)
 *   physics.lightDecay   (0–1, how quickly light falls off)
 *   physics.soundDecay   (0–1)
 *   physics.atmosphere   ('thin', 'normal', 'thick', 'vacuum')
 *   physics.tickRate     (Hz, sim resolution)
 */

import type { SubAgentInput, SubAgentOutput } from '../types';
import { BaseSubAgent, emit, intentVector, mapTo, projectAxis } from './base';

export class PhysicsAgent extends BaseSubAgent {
  readonly id = 'physics';
  readonly domain = 'physics';

  shouldRun(intent: { domains: string[] }): boolean {
    return ['physics', 'world', 'game', 'sim', 'object', 'vehicle', 'all'].some((d) =>
      intent.domains.includes(d),
    );
  }

  async run(input: SubAgentInput): Promise<SubAgentOutput> {
    const vec = intentVector(input.intent.adjectives);
    const arousal = projectAxis(vec, 'arousal');
    const hardness = projectAxis(vec, 'hardness');
    const density = projectAxis(vec, 'density');
    const smoothness = projectAxis(vec, 'smoothness');
    const speed = projectAxis(vec, 'speed');
    const organic = projectAxis(vec, 'organic');
    const brightness = projectAxis(vec, 'brightness');

    const gravity = Math.max(0, mapTo((hardness + density) / 2, 1.5, 24)); // m/s²
    const friction = Math.max(0, Math.min(1, mapTo(-smoothness, 0.1, 0.95)));
    const bounciness = Math.max(0, Math.min(1, mapTo((smoothness + arousal) / 2, 0.05, 0.9)));
    const viscosity = Math.max(0, Math.min(1, mapTo(density, 0.05, 0.9)));
    const lightDecay = Math.max(0.05, Math.min(0.95, mapTo(-brightness, 0.1, 0.9)));
    const soundDecay = Math.max(0.05, Math.min(0.95, mapTo(-density, 0.15, 0.85)));

    const atmosphere: 'thin' | 'normal' | 'thick' | 'vacuum' =
      density < -0.6 ? 'vacuum' :
      density < -0.2 ? 'thin' :
      density > 0.5 ? 'thick' :
      'normal';

    const tickRate = Math.round(mapTo((speed + arousal) / 2, 30, 120));

    // Material descriptor: organic vs synthetic, hard vs soft
    const materialClass =
      organic > 0.3 && hardness < 0 ? 'flesh' :
      organic > 0.3 ? 'wood' :
      hardness > 0.5 && organic < 0 ? 'metal' :
      hardness > 0.3 ? 'stone' :
      smoothness > 0.5 ? 'glass' :
      'composite';

    return {
      produced: [
        emit(this.id, 'physics.gravity', gravity, 0.85, 'm/s²'),
        emit(this.id, 'physics.friction', friction, 0.8),
        emit(this.id, 'physics.bounciness', bounciness, 0.7),
        emit(this.id, 'physics.viscosity', viscosity, 0.75),
        emit(this.id, 'physics.lightDecay', lightDecay, 0.75),
        emit(this.id, 'physics.soundDecay', soundDecay, 0.75),
        emit(this.id, 'physics.atmosphere', atmosphere, 0.85),
        emit(this.id, 'physics.tickRate', tickRate, 0.7, 'Hz'),
        emit(this.id, 'physics.materialClass', materialClass, 0.75),
      ],
    };
  }
}
