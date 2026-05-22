/**
 * Map kernel/API seed objects → ActiveSeed for the Reality OS shell.
 */
import type { ActiveSeed } from '@/stores/activeSeed';

export function kernelSeedToActive(seed: Record<string, unknown> | null | undefined): ActiveSeed | null {
  if (!seed || typeof seed !== 'object') return null;
  const hash =
    (seed.hash as string) ??
    (seed.$hash as string) ??
    (seed.content_hash as string) ??
    '';
  const id = (seed.id as string) ?? (seed.$id as string) ?? `seed:${hash.slice(0, 12) || 'unknown'}`;
  const domain = (seed.domain as string) ?? (seed.$domain as string) ?? 'character';
  const name =
    (seed.name as string) ??
    (seed.$name as string) ??
    `${domain} · ${hash.slice(0, 8) || 'new'}`;
  return {
    id,
    name,
    domain,
    hash: hash || '0'.repeat(64),
    generation: typeof seed.generation === 'number' ? seed.generation : 0,
    contractScore: typeof seed.contractScore === 'number' ? seed.contractScore : undefined,
    signature: (seed.signature as ActiveSeed['signature']) ?? 'unsigned',
    anchor: (seed.anchor as ActiveSeed['anchor']) ?? 'none',
    raw: seed,
  };
}
