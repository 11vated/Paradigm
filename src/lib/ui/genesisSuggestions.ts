/**
 * Deterministic empty-state suggestions from install genesis hash.
 */
import { rngFromHash } from '@/lib/kernel/rng';

const POOL = [
  'A fierce desert warrior with constellation shield',
  'A neon samurai cat with electric stripes',
  'A melancholy ocean world at twilight',
  'A cyberpunk city skyline in rain',
  'A cozy forest village with lantern lights',
  'Surprise me — something unforgettable',
];

const INSTALL_KEY = 'paradigm.install.genesis.v1';

export function getInstallGenesisHash(): string {
  if (typeof window === 'undefined') {
    return '0000000000000000000000000000000000000000000000000000000000000001';
  }
  try {
    let h = window.localStorage.getItem(INSTALL_KEY);
    if (!h) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      window.localStorage.setItem(INSTALL_KEY, h);
    }
    return h;
  } catch {
    return '0000000000000000000000000000000000000000000000000000000000000001';
  }
}

export function getGenesisSuggestions(count = 4): string[] {
  const rng = rngFromHash(getInstallGenesisHash()).fork('ui-genesis-suggestions');
  const picks: string[] = [];
  const used = new Set<number>();
  while (picks.length < Math.min(count, POOL.length)) {
    const i = rng.nextInt(0, POOL.length - 1);
    if (used.has(i)) continue;
    used.add(i);
    picks.push(POOL[i]);
  }
  return picks;
}
