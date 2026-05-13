import { describe, it, expect } from 'vitest';
import {
  createSovereignGene, mutateSovereignGene, breedSovereignGenes,
  licenseSovereignGene, getGeneProvenance, checkGenePermission,
  extractValue, isSovereignGene,
} from '../../src/lib/kernel/gene-sovereignty';

describe('Gene Sovereignty', () => {
  it('creates a sovereign gene with creator attribution', () => {
    const gene = createSovereignGene(42, 'scalar', 'alice', 'pubkey-alice');
    expect(isSovereignGene(gene)).toBe(true);
    expect(gene.value).toBe(42);
    expect(gene.ownership.creator).toBe('alice');
    expect(gene.ownership.creatorPubkey).toBe('pubkey-alice');
    expect(gene.ownership.lineage).toHaveLength(1);
    expect(gene.ownership.lineage[0].operation).toBe('create');
  });

  it('records mutation in lineage', () => {
    const gene = createSovereignGene(0.5, 'scalar', 'alice');
    const mutated = mutateSovereignGene(gene, 0.8, 'bob');

    expect(mutated.value).toBe(0.8);
    expect(mutated.ownership.lineage).toHaveLength(2);
    expect(mutated.ownership.lineage[1].operation).toBe('mutate');
    expect(mutated.ownership.lineage[1].signer).toBe('bob');
    expect(mutated.ownership.lineage[1].previousValue).toBe(0.5);
    expect(mutated.ownership.creator).toBe('alice');
  });

  it('records breeding in lineage', () => {
    const geneA = createSovereignGene(0.5, 'scalar', 'alice');
    const geneB = createSovereignGene(0.9, 'scalar', 'bob');

    const child = breedSovereignGenes(geneA, geneB, 0.7, 'carol');

    expect(child.value).toBe(0.7);
    expect(child.ownership.lineage.length).toBeGreaterThan(2);
    const lastEntry = child.ownership.lineage[child.ownership.lineage.length - 1];
    expect(lastEntry.operation).toBe('breed');
    expect(lastEntry.signer).toBe('carol');
  });

  it('sets and checks licenses', () => {
    const gene = createSovereignGene(42, 'scalar', 'alice');

    expect(gene.ownership.license).toBeUndefined();
    expect(checkGenePermission(gene, 'commercial', 'bob').allowed).toBe(true);

    const licensed = licenseSovereignGene(gene, {
      type: 'cc-by-nc',
      commercial: false,
      derivatives: true,
    }, 'alice');

    expect(licensed.ownership.license).toBeDefined();
    expect(licensed.ownership.license!.commercial).toBe(false);

    // Alice (creator) can do anything
    expect(checkGenePermission(licensed, 'commercial', 'alice').allowed).toBe(true);
    // Bob cannot use commercially
    expect(checkGenePermission(licensed, 'commercial', 'bob').allowed).toBe(false);
    expect(checkGenePermission(licensed, 'mutate', 'bob').allowed).toBe(true);

    const noDeriv = licenseSovereignGene(gene, { type: 'restricted', derivatives: false }, 'alice');
    expect(checkGenePermission(noDeriv, 'breed', 'bob').allowed).toBe(false);
  });

  it('extracts raw value from sovereign wrapper', () => {
    expect(extractValue(42)).toBe(42);
    expect(extractValue('hello')).toBe('hello');
    expect(extractValue({ value: 42, ownership: { creator: 'x', lineage: [] } })).toBe(42);
  });

  it('returns full provenance', () => {
    const gene = createSovereignGene('initial', 'categorical', 'alice');
    const mutated = mutateSovereignGene(gene, 'modified', 'bob');

    const provenance = getGeneProvenance(mutated);
    expect(provenance.creator).toBe('alice');
    expect(provenance.currentValue).toBe('modified');
    expect(provenance.history).toHaveLength(2);
    expect(provenance.history[1].previousValue).toBe('initial');
  });

  it('applies license to sovereign gene', () => {
    const gene = licenseSovereignGene(
      createSovereignGene(1, 'scalar', 'alice'),
      { type: 'cc-by-nc', commercial: false },
      'alice',
    );
    expect(gene.ownership.license?.type).toBe('cc-by-nc');
    expect(gene.ownership.lineage).toHaveLength(2);
    expect(gene.ownership.lineage[1].operation).toBe('license');
  });
});
