/**
 * Contract loading policy for proof-layer commands.
 *
 * "flagship" is the product-quality proof set used by default in CI.
 * "extended" is the broad industry-domain registry; it is useful for audits
 * and scheduled sweeps, but too heavy for the normal golden gate.
 */
export const FLAGSHIP_CONTRACTS = [
  'animation',
  'character',
  'cosmology',
  'field',
  'fullgame',
  'geometry3d',
  'molecule',
  'music',
  'quantum',
  'sprite',
  'visual2d',
  'website',
  'world',
] as const;

export type ContractTier = 'flagship' | 'extended' | 'all';

const CONTRACT_IMPORTS: Record<string, () => Promise<unknown>> = {
  animation: () => import('../src/lib/kernel/generators/animation-contract'),
  character: () => import('../src/lib/kernel/generators/character-contract'),
  cosmology: () => import('../src/lib/kernel/generators/cosmology-contract'),
  field: () => import('../src/lib/kernel/generators/field-contract'),
  fullgame: () => import('../src/lib/kernel/generators/fullgame-contract'),
  geometry3d: () => import('../src/lib/kernel/generators/geometry3d-contract'),
  molecule: () => import('../src/lib/kernel/generators/molecule-contract'),
  music: () => import('../src/lib/kernel/generators/music-contract'),
  quantum: () => import('../src/lib/kernel/generators/quantum-contract'),
  sprite: () => import('../src/lib/kernel/generators/sprite-contract'),
  visual2d: () => import('../src/lib/kernel/generators/visual2d-contract'),
  website: () => import('../src/lib/kernel/generators/website-contract'),
  world: () => import('../src/lib/kernel/generators/world-contract'),
};

const CORE_IMPORTS: Record<string, () => Promise<unknown>> = {
  friend: () => import('../src/lib/friend/contract'),
  game: () => import('../src/lib/game/contract'),
  substrateWorld: () => import('../src/lib/world/contract'),
};

export interface LoadContractsOptions {
  tier?: ContractTier;
  contracts?: readonly string[];
  includeCore?: boolean;
}

export async function loadContracts(options: LoadContractsOptions = {}): Promise<string[]> {
  const tier = options.tier ?? 'flagship';
  const explicit = options.contracts?.map((d) => d.trim()).filter(Boolean) ?? [];
  const loaded: string[] = [];

  if (options.includeCore) {
    for (const [name, loader] of Object.entries(CORE_IMPORTS)) {
      await loader();
      loaded.push(name);
    }
  }

  const domains = explicit.length > 0
    ? explicit
    : tier === 'flagship'
      ? [...FLAGSHIP_CONTRACTS]
      : [];

  for (const domain of domains) {
    const loader = CONTRACT_IMPORTS[domain];
    if (!loader) {
      throw new Error(`Unknown proof contract '${domain}'. Available flagship contracts: ${FLAGSHIP_CONTRACTS.join(', ')}`);
    }
    await loader();
    loaded.push(domain);
  }

  if ((tier === 'extended' || tier === 'all') && explicit.length === 0) {
    await import('../src/lib/kernel/generators/contracts');
    loaded.push('extended-barrel');
  }

  return loaded;
}

export function isFlagshipContract(domain: string): boolean {
  return (FLAGSHIP_CONTRACTS as readonly string[]).includes(domain);
}
