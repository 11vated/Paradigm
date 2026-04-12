/**
 * Zod validation schemas for all POST/PUT endpoints.
 * Enforces type safety, value bounds, and required fields at the API boundary.
 */
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

const seedIdParam = z.string().uuid('Invalid seed ID format');

const geneValue = z.union([
  z.number(),
  z.string(),
  z.array(z.number()),
  z.record(z.any()),
  z.boolean(),
]);

const geneEntry = z.object({
  type: z.string().min(1, 'Gene type is required'),
  value: geneValue,
}).passthrough();

const genesMap = z.record(z.string(), geneEntry);

// Domain list — kept in sync with kernel's 27 domains
const VALID_DOMAINS = [
  'character', 'sprite', 'music', 'narrative', 'level', 'item', 'spell',
  'quest', 'dialogue', 'animation', 'vfx', 'ui', 'terrain', 'biome',
  'faction', 'economy', 'lore', 'cutscene', 'shader', 'physics',
  'ai_behavior', 'sound_design', 'architecture', 'vehicle', 'fullgame',
  'cinematic', 'agent',
] as const;

const domainEnum = z.enum(VALID_DOMAINS);

// ═══════════════════════════════════════════════════════════════════════════
// AUTH SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

export const RegisterSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(64, 'Username must be at most 64 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(256, 'Password must be at most 256 characters'),
});

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// ═══════════════════════════════════════════════════════════════════════════
// SEED CRUD SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

export const CreateSeedSchema = z.object({
  domain: domainEnum,
  name: z.string()
    .min(1, 'Seed name is required')
    .max(128, 'Seed name must be at most 128 characters'),
  genes: genesMap.optional().default({}),
}).passthrough();

export const GenerateSeedSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(2048, 'Prompt must be at most 2048 characters'),
  domain: domainEnum,
}).passthrough();

// ═══════════════════════════════════════════════════════════════════════════
// MUTATION / EVOLUTION / BREEDING
// ═══════════════════════════════════════════════════════════════════════════

export const MutateSeedSchema = z.object({
  rate: z.number()
    .min(0, 'Mutation rate must be >= 0')
    .max(1, 'Mutation rate must be <= 1')
    .optional()
    .default(0.1),
}).passthrough();

export const EvolveSeedSchema = z.object({
  population_size: z.number()
    .int('Population size must be an integer')
    .min(2, 'Population size must be at least 2')
    .max(100, 'Population size must be at most 100')
    .optional()
    .default(8),
  generations: z.number()
    .int('Generations must be an integer')
    .min(1, 'Must have at least 1 generation')
    .max(50, 'Maximum 50 generations')
    .optional()
    .default(3),
}).passthrough();

export const BreedSeedsSchema = z.object({
  parent_a_id: z.string().uuid('Invalid parent_a_id format'),
  parent_b_id: z.string().uuid('Invalid parent_b_id format'),
}).refine(data => data.parent_a_id !== data.parent_b_id, {
  message: 'Parents must be different seeds',
});

// ═══════════════════════════════════════════════════════════════════════════
// GENE EDITING
// ═══════════════════════════════════════════════════════════════════════════

export const EditGeneSchema = z.object({
  gene_name: z.string()
    .min(1, 'Gene name is required')
    .max(64, 'Gene name must be at most 64 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Gene name may only contain letters, numbers, and underscores'),
  gene_type: z.string().min(1, 'Gene type is required'),
  value: geneValue,
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════

export const ComposeSeedSchema = z.object({
  target_domain: domainEnum,
}).passthrough();

// ═══════════════════════════════════════════════════════════════════════════
// GROW (body is optional / empty is valid)
// ═══════════════════════════════════════════════════════════════════════════

export const GrowSeedSchema = z.object({}).passthrough();

// ═══════════════════════════════════════════════════════════════════════════
// GSPL LANGUAGE
// ═══════════════════════════════════════════════════════════════════════════

export const GsplParseSchema = z.object({
  source: z.string()
    .min(1, 'GSPL source code is required')
    .max(65536, 'GSPL source must be at most 64KB'),
});

export const GsplExecuteSchema = z.object({
  source: z.string()
    .min(1, 'GSPL source code is required')
    .max(65536, 'GSPL source must be at most 64KB'),
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT
// ═══════════════════════════════════════════════════════════════════════════

export const AgentQuerySchema = z.object({
  query: z.string().min(1, 'Query is required').max(4096, 'Query must be at most 4096 characters').optional(),
  message: z.string().min(1).max(4096).optional(),
}).refine(data => data.query || data.message, {
  message: 'Either query or message is required',
});

// ═══════════════════════════════════════════════════════════════════════════
// SOVEREIGNTY
// ═══════════════════════════════════════════════════════════════════════════

export const SignSeedSchema = z.object({
  private_key: z.string().min(1, 'Private key is required'),
});

export const VerifySeedSchema = z.object({
  public_key: z.string().min(1, 'Public key is required'),
});

export const KeysGenerateSchema = z.object({}).passthrough();

// ═══════════════════════════════════════════════════════════════════════════
// NFT MINTING
// ═══════════════════════════════════════════════════════════════════════════

export const MintSeedSchema = z.object({
  owner_address: z.string()
    .min(1, 'Owner address is required')
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  private_key: z.string().optional(),
  ipfs_gateway: z.string().url('Invalid IPFS gateway URL').optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// QFT / PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

export const QftSimulateSchema = z.object({
  seed_id: z.string().uuid('Invalid seed_id format'),
  parameters: z.record(z.any()).optional().default({}),
});

export const PipelineExecuteSchema = z.object({
  seed_id: z.string().uuid('Invalid seed_id format'),
});

// ═══════════════════════════════════════════════════════════════════════════
// INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════

export const EmbedSeedSchema = z.object({}).passthrough();

// ═══════════════════════════════════════════════════════════════════════════
// LIBRARY
// ═══════════════════════════════════════════════════════════════════════════

export const LibraryImportSchema = z.object({
  seed_hash: z.string().min(1, 'Seed hash is required'),
});

// ═══════════════════════════════════════════════════════════════════════════
// SEED DISTANCE
// ═══════════════════════════════════════════════════════════════════════════

export const SeedDistanceSchema = z.object({
  seed_a_id: z.string().uuid('Invalid seed_a_id format'),
  seed_b_id: z.string().uuid('Invalid seed_b_id format'),
}).refine(data => data.seed_a_id !== data.seed_b_id, {
  message: 'Must compare different seeds',
});
