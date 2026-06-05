/**
 * Sovereignty: local-first SovereigntyLayer signing path.
 *
 * Locks the behavior the `/api/seeds/:id/sign` and `/verify` routes rely on:
 * a seed can be signed with a freshly minted keypair (no caller-supplied key)
 * and then verified using only the public key embedded in its receipt.
 */
import { describe, it, expect } from 'vitest';
import { SovereigntyLayer } from '../../src/lib/sovereignty/index';

const makeSeed = () => ({
  id: 'sov-local-1',
  $domain: 'visual2d',
  $hash: 'deadbeef'.repeat(8),
  $lineage: { generation: 0, operation: 'primordial' },
  genes: { core_power: { type: 'scalar', value: 0.42 } },
});

describe('SovereigntyLayer local-first signing', () => {
  it('mints a keypair and produces a verifiable signature', () => {
    const seed = makeSeed();
    const { private_key } = SovereigntyLayer.generateKeys();
    const sovereignty = SovereigntyLayer.signSeed(seed, private_key);

    expect(sovereignty.signature).toBeTruthy();
    expect(sovereignty.public_key).toContain('BEGIN PUBLIC KEY');

    const signed = { ...seed, $sovereignty: sovereignty };
    expect(SovereigntyLayer.verifySeed(signed, sovereignty.public_key)).toBe(true);
  });

  it('verifies using the public key stored on the seed (one-click verify)', () => {
    const seed = makeSeed();
    const { private_key } = SovereigntyLayer.generateKeys();
    const sovereignty = SovereigntyLayer.signSeed(seed, private_key);
    const signed = { ...seed, $sovereignty: sovereignty };

    // Empty key arg → layer falls back to the embedded public key.
    expect(SovereigntyLayer.verifySeed(signed, '')).toBe(true);
  });

  it('fails verification when the seed is tampered after signing', () => {
    const seed = makeSeed();
    const { private_key } = SovereigntyLayer.generateKeys();
    const sovereignty = SovereigntyLayer.signSeed(seed, private_key);

    const tampered = {
      ...seed,
      genes: { core_power: { type: 'scalar', value: 0.99 } },
      $sovereignty: sovereignty,
    };
    expect(SovereigntyLayer.verifySeed(tampered, sovereignty.public_key)).toBe(false);
  });

  it('returns false for an unsigned seed', () => {
    expect(SovereigntyLayer.verifySeed(makeSeed(), '')).toBe(false);
  });
});
