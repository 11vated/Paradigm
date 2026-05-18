import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  inversePipeline, formatInverseResult, detectDomain,
} from '../src/lib/kernel/inverse-pipeline';

describe('detectDomain', () => {
  it('returns explicit domain when provided', () => {
    expect(detectDomain({ domain: 'character' })).toBe('character');
    expect(detectDomain({ domain: 'music' })).toBe('music');
  });

  it('resolves domain aliases', () => {
    expect(detectDomain({ domain: 'char' })).toBe('character');
    expect(detectDomain({ domain: 'sound' })).toBe('audio');
    expect(detectDomain({ domain: 'story' })).toBe('narrative');
    expect(detectDomain({ domain: 'dance' })).toBe('choreography');
  });

  it('detects domain from MIME type', () => {
    expect(detectDomain({ mimeType: 'image/png' })).toBe('visual2d');
    expect(detectDomain({ mimeType: 'audio/wav' })).toBe('music');
    expect(detectDomain({ mimeType: 'model/gltf+json' })).toBe('geometry3d');
    expect(detectDomain({ mimeType: 'text/plain' })).toBe('narrative');
  });

  it('detects domain from description keywords', () => {
    expect(detectDomain({ description: 'A warrior character' })).toBe('character');
    expect(detectDomain({ description: 'A piano melody song' })).toBe('music');
    expect(detectDomain({ description: 'A 3d mesh model' })).toBe('geometry3d');
    expect(detectDomain({ description: 'A UI dashboard layout' })).toBe('ui');
    expect(detectDomain({ description: 'A gothic building tower' })).toBe('architecture');
    expect(detectDomain({ description: 'A fashion dress garment' })).toBe('fashion');
  });

  it('falls back to visual2d when nothing matches', () => {
    expect(detectDomain({ description: 'zzzzyxwvut' })).toBe('visual2d');
    expect(detectDomain({})).toBe('visual2d');
  });

  it('prefers explicit domain over MIME and description', () => {
    const input = { domain: 'music', mimeType: 'image/png', description: 'A warrior' };
    expect(detectDomain(input)).toBe('music');
  });

  it('prefers MIME type over description', () => {
    const input = { mimeType: 'audio/wav', description: 'A warrior character' };
    expect(detectDomain(input)).toBe('music');
  });
});

describe('inversePipeline', () => {
  it('returns a result with all expected fields', async () => {
    const result = await inversePipeline({ description: 'A fantasy warrior character' });
    expect(result).toBeDefined();
    expect(result.domain).toBe('character');
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(typeof result.iterations).toBe('number');
    expect(result.iterations).toBeGreaterThanOrEqual(0);
    expect(result.seed).toBeDefined();
    expect(result.seed.$domain).toBe('character');
    expect(result.seed.genes).toBeDefined();
    expect(Object.keys(result.seed.genes).length).toBeGreaterThan(0);
  });

  it('produces deterministic output for same input', async () => {
    const r1 = await inversePipeline({ description: 'A dragon in the mountains', domain: 'procedural' });
    const r2 = await inversePipeline({ description: 'A dragon in the mountains', domain: 'procedural' });
    expect(r1.seed.$hash).toBe(r2.seed.$hash);
    expect(r1.seed.id).toBe(r2.seed.id);
    expect(r1.domain).toBe(r2.domain);

    const g1 = JSON.stringify(r1.seed.genes);
    const g2 = JSON.stringify(r2.seed.genes);
    expect(g1).toBe(g2);
  });

  it('detects music domain from description', async () => {
    const result = await inversePipeline({ description: 'A fast jazz piano melody' });
    expect(result.domain).toBe('music');
  });

  it('detects visual2d domain from image MIME', async () => {
    const result = await inversePipeline({ mimeType: 'image/png', description: 'Some artwork' });
    expect(result.domain).toBe('visual2d');
  });

  it('handles empty description gracefully', async () => {
    const result = await inversePipeline({});
    expect(result).toBeDefined();
    expect(result.domain).toBe('visual2d');
    expect(result.seed).toBeDefined();
  });

  it('produces genes with type and value for each entry', async () => {
    const result = await inversePipeline({ description: 'A wizard casting spells', domain: 'character' });
    const genes = result.seed.genes;
    for (const [name, gene] of Object.entries(genes)) {
      expect(gene).toHaveProperty('type');
      expect(gene).toHaveProperty('value');
      expect(typeof gene.type).toBe('string');
      expect(gene.value).not.toBeUndefined();
    }
  });

  it('detects multiple domains correctly', async () => {
    const tests = [
      { desc: 'A spaceship vehicle', expected: 'vehicle' },
      { desc: 'A robot drone mech', expected: 'agent' },
      { desc: 'A food recipe dish', expected: 'food' },
      { desc: 'A dance performance ballet', expected: 'choreography' },
    ];
    for (const { desc, expected } of tests) {
      const result = await inversePipeline({ description: desc });
      expect(result.domain).toBe(expected);
    }
  });

  it('produces seed with $lineage marking inverse_pipeline', async () => {
    const result = await inversePipeline({ description: 'Test' });
    expect(result.seed.$lineage).toBeDefined();
    expect(result.seed.$lineage.operation).toBe('inverse_pipeline');
  });

  it('seed ID starts with inverse- prefix', async () => {
    const result = await inversePipeline({ description: 'Test character', domain: 'character' });
    expect(result.seed.id).toMatch(/^inverse-/);
  });
});

describe('formatInverseResult', () => {
  it('formats a valid result correctly', async () => {
    const result = await inversePipeline({ description: 'A friendly tree creature' });
    const formatted = formatInverseResult(result);
    expect(formatted).toHaveProperty('seed');
    expect(formatted.seed).toHaveProperty('id');
    expect(formatted.seed).toHaveProperty('domain');
    expect(formatted.seed).toHaveProperty('name');
    expect(formatted.seed).toHaveProperty('hash');
    expect(formatted.seed).toHaveProperty('geneCount');
    expect(typeof formatted.confidence).toBe('number');
    expect(typeof formatted.iterations).toBe('number');
    expect(formatted.domain).toBe(result.domain);
  });
});
