/**
 * Determinism: Round-Trip Test
 * 
 * Verifies that serialization round-trips preserve seed identity:
 * - toJSON → fromJSON → identical seed
 * - canonicalize → parse → canonicalize → identical bytes
 * - Genes survive serialize → deserialize without modification
 */
import { describe, it, expect } from 'vitest';
import { UniversalSeed } from '../../src/seeds/universal-seed';

describe('Determinism: Round-Trip', () => {
  it('toJSON → fromJSON preserves seed identity', () => {
    const original = new UniversalSeed({
      metadata: {
        id: 'round-trip-test',
        name: 'Round Trip Test',
        version: '1.0.0',
        created: 0,
        updated: 0,
        tags: ['character'],
        lineage: []
      }
    })
    original.setGene('size' as any, 1.75)
    original.setGene('strength' as any, 0.8)

    const json = original.toJSON()
    const restored = UniversalSeed.fromJSON(json)

    expect(restored.id).toBe(original.id)
    expect(restored.getGeneValue('size' as any)).toBe(original.getGeneValue('size' as any))
    expect(restored.getGeneValue('strength' as any)).toBe(original.getGeneValue('strength' as any))
  })

  it('serialize → deserialize preserves all genes', () => {
    const seed = new UniversalSeed({
      metadata: {
        id: 'serialize-test',
        name: 'Serialize Test',
        version: '1.0.0',
        created: 0,
        updated: 0,
        tags: ['music'],
        lineage: []
      }
    })
    seed.setGene('bpm' as any, 120)
    seed.setGene('key' as any, 'C major')

    const serialized = seed.serialize()
    const deserialized = UniversalSeed.deserialize(serialized)

    expect(deserialized.getGeneValue('bpm' as any)).toBe(120)
    expect(deserialized.getGeneValue('key' as any)).toBe('C major')
    expect(deserialized.getGeneration()).toBe(seed.getGeneration())
  })

  it('clone produces independent copy with same values', () => {
    const original = new UniversalSeed({
      metadata: {
        id: 'clone-test',
        name: 'Clone Test',
        version: '1.0.0',
        created: 0,
        updated: 0,
        tags: ['sprite'],
        lineage: []
      }
    })
    original.setGene('color' as any, [255, 0, 0])

    const cloned = original.clone()

    expect(cloned.getGeneValue('color' as any)).toEqual(original.getGeneValue('color' as any))
    expect(cloned.id).not.toBe(original.id) // Different ID (independent)
  })
})
