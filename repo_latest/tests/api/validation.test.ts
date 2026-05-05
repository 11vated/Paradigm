/**
 * Integration tests for Zod v4 validation schemas
 * Verifies all 20+ endpoint schemas accept valid input and reject invalid input.
 */
import { describe, it, expect } from 'vitest';
import {
  RegisterSchema, LoginSchema,
  CreateSeedSchema, GenerateSeedSchema,
  MutateSeedSchema, EvolveSeedSchema, BreedSeedsSchema,
  EditGeneSchema, ComposeSeedSchema,
  GsplParseSchema, GsplExecuteSchema,
  AgentQuerySchema,
  SignSeedSchema, VerifySeedSchema,
  MintSeedSchema,
  EmbedSeedSchema, LibraryImportSchema, SeedDistanceSchema,
} from '../../src/lib/validation/schemas.js';

// ─── Helper ──────────────────────────────────────────────────────────────────

function valid(schema: any, data: any) {
  const result = schema.safeParse(data);
  return result.success;
}

function invalid(schema: any, data: any) {
  return !valid(schema, data);
}

// ─── Auth Schemas ────────────────────────────────────────────────────────────

describe('Validation Schemas', () => {
  describe('RegisterSchema', () => {
    it('accepts valid registration', () => {
      expect(valid(RegisterSchema, { username: 'testuser', password: 'securepassword123' })).toBe(true);
    });

    it('rejects short username', () => {
      expect(invalid(RegisterSchema, { username: 'ab', password: 'securepassword123' })).toBe(true);
    });

    it('rejects short password', () => {
      expect(invalid(RegisterSchema, { username: 'testuser', password: 'short' })).toBe(true);
    });

    it('rejects missing fields', () => {
      expect(invalid(RegisterSchema, {})).toBe(true);
      expect(invalid(RegisterSchema, { username: 'test' })).toBe(true);
      expect(invalid(RegisterSchema, { password: 'longpassword' })).toBe(true);
    });

    it('rejects username with invalid characters', () => {
      expect(invalid(RegisterSchema, { username: 'user name!', password: 'securepassword123' })).toBe(true);
    });
  });

  describe('LoginSchema', () => {
    it('accepts valid login', () => {
      expect(valid(LoginSchema, { username: 'testuser', password: 'password123' })).toBe(true);
    });

    it('rejects empty strings', () => {
      expect(invalid(LoginSchema, { username: '', password: '' })).toBe(true);
    });
  });

  // ─── Seed Schemas ──────────────────────────────────────────────────────────

  describe('CreateSeedSchema', () => {
    it('accepts valid seed with domain and name', () => {
      expect(valid(CreateSeedSchema, { domain: 'character', name: 'Test Hero' })).toBe(true);
    });

    it('accepts seed with optional genes', () => {
      expect(valid(CreateSeedSchema, {
        domain: 'music',
        name: 'Test Track',
        genes: { tempo: { type: 'scalar', value: 0.8 } },
      })).toBe(true);
    });

    it('rejects invalid domain', () => {
      expect(invalid(CreateSeedSchema, { domain: 'invalid_domain_xyz', name: 'Bad' })).toBe(true);
    });

    it('rejects missing name', () => {
      expect(invalid(CreateSeedSchema, { domain: 'character' })).toBe(true);
    });

    it('accepts all 27 domains', () => {
      const domains = [
        'character','sprite','music','narrative','level','item','spell','quest',
        'dialogue','animation','vfx','ui','terrain','biome','faction','economy',
        'lore','cutscene','shader','physics','ai_behavior','sound_design',
        'architecture','vehicle','fullgame','cinematic','agent',
      ];
      for (const domain of domains) {
        expect(valid(CreateSeedSchema, { domain, name: `Test ${domain}` })).toBe(true);
      }
    });
  });

  describe('GenerateSeedSchema', () => {
    it('accepts valid prompt and domain', () => {
      expect(valid(GenerateSeedSchema, { prompt: 'a brave warrior', domain: 'character' })).toBe(true);
    });

    it('rejects empty prompt', () => {
      expect(invalid(GenerateSeedSchema, { prompt: '', domain: 'character' })).toBe(true);
    });
  });

  // ─── Operation Schemas ─────────────────────────────────────────────────────

  describe('MutateSeedSchema', () => {
    it('accepts valid mutation rate', () => {
      expect(valid(MutateSeedSchema, { rate: 0.3 })).toBe(true);
    });

    it('applies default rate', () => {
      const result = MutateSeedSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rate).toBe(0.1);
      }
    });

    it('rejects rate > 1', () => {
      expect(invalid(MutateSeedSchema, { rate: 1.5 })).toBe(true);
    });

    it('rejects negative rate', () => {
      expect(invalid(MutateSeedSchema, { rate: -0.1 })).toBe(true);
    });
  });

  describe('EvolveSeedSchema', () => {
    it('accepts valid evolution config', () => {
      expect(valid(EvolveSeedSchema, { population_size: 10, generations: 5 })).toBe(true);
    });

    it('applies defaults', () => {
      const result = EvolveSeedSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.population_size).toBe(8);
        expect(result.data.generations).toBe(3);
      }
    });

    it('rejects population_size > 100', () => {
      expect(invalid(EvolveSeedSchema, { population_size: 200 })).toBe(true);
    });

    it('rejects generations > 50', () => {
      expect(invalid(EvolveSeedSchema, { generations: 100 })).toBe(true);
    });

    it('rejects population_size < 2', () => {
      expect(invalid(EvolveSeedSchema, { population_size: 1 })).toBe(true);
    });
  });

  describe('BreedSeedsSchema', () => {
    it('accepts valid UUIDs', () => {
      expect(valid(BreedSeedsSchema, {
        parent_a_id: '550e8400-e29b-41d4-a716-446655440000',
        parent_b_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      })).toBe(true);
    });

    it('rejects missing parent IDs', () => {
      expect(invalid(BreedSeedsSchema, { parent_a_id: '550e8400-e29b-41d4-a716-446655440000' })).toBe(true);
    });
  });

  describe('EditGeneSchema', () => {
    it('accepts valid gene edit', () => {
      expect(valid(EditGeneSchema, { gene_name: 'strength', gene_type: 'scalar', value: 0.8 })).toBe(true);
    });

    it('rejects missing gene_name', () => {
      expect(invalid(EditGeneSchema, { gene_type: 'scalar', value: 0.5 })).toBe(true);
    });
  });

  describe('ComposeSeedSchema', () => {
    it('accepts valid target domain', () => {
      expect(valid(ComposeSeedSchema, { target_domain: 'sprite' })).toBe(true);
    });

    it('rejects invalid domain', () => {
      expect(invalid(ComposeSeedSchema, { target_domain: 'not_a_domain' })).toBe(true);
    });
  });

  // ─── GSPL Schemas ──────────────────────────────────────────────────────────

  describe('GsplParseSchema', () => {
    it('accepts valid GSPL source', () => {
      expect(valid(GsplParseSchema, { source: 'seed Test { domain: character; }' })).toBe(true);
    });

    it('rejects empty source', () => {
      expect(invalid(GsplParseSchema, { source: '' })).toBe(true);
    });
  });

  describe('GsplExecuteSchema', () => {
    it('accepts valid GSPL source', () => {
      expect(valid(GsplExecuteSchema, { source: 'seed Test { domain: music; gene tempo: scalar = 0.5; }' })).toBe(true);
    });
  });

  // ─── Agent Schema ──────────────────────────────────────────────────────────

  describe('AgentQuerySchema', () => {
    it('accepts query field', () => {
      expect(valid(AgentQuerySchema, { query: 'list all domains' })).toBe(true);
    });

    it('accepts message field', () => {
      expect(valid(AgentQuerySchema, { message: 'what engines are available' })).toBe(true);
    });
  });

  // ─── Sovereignty Schemas ───────────────────────────────────────────────────

  describe('SignSeedSchema', () => {
    it('accepts valid private key', () => {
      expect(valid(SignSeedSchema, { private_key: 'abcdef1234567890' })).toBe(true);
    });

    it('rejects missing private key', () => {
      expect(invalid(SignSeedSchema, {})).toBe(true);
    });
  });

  describe('VerifySeedSchema', () => {
    it('accepts valid public key', () => {
      expect(valid(VerifySeedSchema, { public_key: '04abcdef1234567890' })).toBe(true);
    });
  });

  describe('MintSeedSchema', () => {
    it('accepts valid Ethereum address', () => {
      expect(valid(MintSeedSchema, {
        owner_address: '0x0000000000000000000000000000000000000001',
      })).toBe(true);
    });

    it('rejects invalid Ethereum address', () => {
      expect(invalid(MintSeedSchema, { owner_address: 'not-an-address' })).toBe(true);
    });

    it('rejects address without 0x prefix', () => {
      expect(invalid(MintSeedSchema, { owner_address: '0000000000000000000000000000000000000001' })).toBe(true);
    });
  });

  // ─── Intelligence & Library ────────────────────────────────────────────────

  describe('SeedDistanceSchema', () => {
    it('accepts two seed IDs', () => {
      expect(valid(SeedDistanceSchema, {
        seed_a_id: '550e8400-e29b-41d4-a716-446655440000',
        seed_b_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      })).toBe(true);
    });
  });

  describe('LibraryImportSchema', () => {
    it('accepts valid seed hash', () => {
      expect(valid(LibraryImportSchema, { seed_hash: 'abc123def456' })).toBe(true);
    });

    it('rejects missing hash', () => {
      expect(invalid(LibraryImportSchema, {})).toBe(true);
    });
  });
});
