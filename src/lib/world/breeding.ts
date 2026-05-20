/**
 * World breeding — deterministic recombination of two parent worlds.
 * Mirrors src/lib/friend/breeding.ts for symmetric semantics.
 */
import { createHash } from 'crypto';
import { createWorldSeed } from './genesis';
import type { WorldSeedData } from './types';

export function breedWorlds(
  parentA: WorldSeedData,
  parentB: WorldSeedData,
  options?: { salt?: string },
): WorldSeedData {
  const salt = options?.salt ?? 'breed';
  const combinedHash = createHash('sha256')
    .update(parentA.id).update('|').update(parentB.id).update('|').update(salt)
    .digest('hex');
  const child = createWorldSeed(combinedHash);
  // Recombine genes: take alternate fields from each parent.
  child.genes.setting.era = parentA.genes.setting.era;
  child.genes.setting.biome = parentB.genes.setting.biome;
  child.genes.conflict.kind = combinedHash.charCodeAt(0) % 2 === 0
    ? parentA.genes.conflict.kind : parentB.genes.conflict.kind;
  child.genes.setting.magic = (parentA.genes.setting.magic + parentB.genes.setting.magic) / 2;
  child.genes.setting.tech = (parentA.genes.setting.tech + parentB.genes.setting.tech) / 2;
  child.genes.mood.brightness = (parentA.genes.mood.brightness + parentB.genes.mood.brightness) / 2;
  child.derivation = {
    operator: 'breed',
    parents: [parentA.id, parentB.id],
    generation: Math.max(
      parentA.derivation?.generation ?? 0,
      parentB.derivation?.generation ?? 0,
    ) + 1,
    salt,
  };
  return child;
}

export function mutateWorld(
  parent: WorldSeedData,
  options?: { salt?: string; magnitude?: number },
): WorldSeedData {
  const salt = options?.salt ?? 'mutate';
  const mag = options?.magnitude ?? 0.2;
  const h = createHash('sha256').update(parent.id).update('|').update(salt).digest('hex');
  const child = createWorldSeed(h);
  // Inherit then nudge real-valued genes.
  child.genes = { ...parent.genes };
  const bump = (v: number) => Math.max(0, Math.min(1, v + (parseInt(h.slice(0, 4), 16) / 65536 - 0.5) * mag));
  child.genes.setting.magic = bump(parent.genes.setting.magic);
  child.genes.setting.tech = bump(parent.genes.setting.tech);
  child.genes.mood.brightness = bump(parent.genes.mood.brightness);
  child.derivation = {
    operator: 'mutate',
    parents: [parent.id],
    generation: (parent.derivation?.generation ?? 0) + 1,
    salt,
  };
  return child;
}
