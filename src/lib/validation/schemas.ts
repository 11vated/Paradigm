/**
 * Zod validation schemas for all POST/PUT endpoints.
 * Enforces type safety, value bounds, and required fields at the API boundary.
 */
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

const seedIdParam = z.string().min(1, 'Invalid seed ID format');

const geneValue = z.union([
  z.number(),
  z.string(),
  z.array(z.number()),
  z.record(z.string(), z.any()),
  z.boolean(),
]);

const geneEntry = z.object({
  type: z.string().min(1, 'Gene type is required'),
  value: geneValue,
}).passthrough();

const genesMap = z.record(z.string(), geneEntry);

// Domain list — kept in sync with kernel's 27 domains
const VALID_DOMAINS = [
  // Core generative domains
  'character', 'sprite', 'music', 'visual2d', 'geometry3d', 'fullgame',
  'animation', 'narrative', 'ui', 'physics', 'audio', 'ecosystem',
  'game', 'alife', 'shader', 'particle', 'procedural',
  'typography', 'architecture', 'vehicle', 'furniture', 'fashion',
  'robotics', 'circuit', 'food', 'choreography', 'agent',
  // Phase 1+2 sovereign domains
  'website', 'field', 'quantum', 'molecule', 'cosmology', 'world', 'app',
  // Extended catalog domains
  'aerospace', 'agtech', 'blockchain', 'chemical', 'city', 'climate',
  'cloud', 'consciousness', 'cybersecurity', 'dance', 'devops',
  'drones', 'drug', 'edtech', 'education', 'electronics', 'energy',
  'finance', 'genomics', 'healthcare', 'logistics', 'manufacturing',
  'marketing', 'materials', 'mining', 'nanotechnology', 'quantum-computing',
  'real-estate', 'smart-city', 'social', 'synthetic-biology', 'water',
  'wearables', 'wine', 'beer', 'coffee', 'acoustics', 'advertising',
  'agriculture', 'ar', 'automotive', 'battery', 'biomedical', 'biotechnology',
  'built-environment', 'space', 'hospitality', 'sports', 'cosmetics',
  'textiles', 'art', 'photography', 'interior', 'landscape', 'military',
  'maritime', 'rail', 'urban', 'rural', 'fashion-3d', 'character-v3',
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
  parent_a_id: seedIdParam,
  parent_b_id: seedIdParam,
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

export const BodyGrowSeedSchema = z.object({
  seed: z.record(z.string(), z.any()).optional(),
  domain: domainEnum.optional(),
});

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
  tier: z.enum(['kernel', 'fast', 'standard', 'deep']).optional(),
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
  seed_id: seedIdParam,
  parameters: z.record(z.string(), z.any()).optional().default({}),
});

export const PipelineExecuteSchema = z.object({
  seed_id: seedIdParam,
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

// ═══════════════════════════════════════════════════════════════════════════
// GENE TYPE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

const geneTypeOperatorFn = z.string().min(1, 'Operator function body is required');

export const RegisterGeneTypeSchema = z.object({
  name: z.string()
    .min(2, 'Type name must be at least 2 characters')
    .max(64, 'Type name must be at most 64 characters')
    .regex(/^[a-z][a-zA-Z0-9_]*$/, 'Type name must start with lowercase, alphanumeric+underscore only'),
  base_type: z.string().min(1, 'Base type is required'),
  description: z.string().max(512).optional(),
  constraints: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    dimensions: z.number().int().positive().optional(),
    choices: z.array(z.string()).optional(),
  }).optional(),
  validate: geneTypeOperatorFn,
  mutate: geneTypeOperatorFn,
  crossover: geneTypeOperatorFn,
  distance: geneTypeOperatorFn,
});

// ═══════════════════════════════════════════════════════════════════════════
// FRIEND  (Phase 1)
// ═══════════════════════════════════════════════════════════════════════════

const FriendArchetypeSchema = z.enum([
  'slender', 'athletic', 'sturdy', 'soft', 'tall', 'petite',
]);

export const FriendGenerateSchema = z.object({
  /** Any string. SHA-256 of this becomes the Friend's seed hash. */
  seed: z.string().min(1, 'seed string is required').max(2048),
  /** Optional display name override. */
  name: z.string().min(1).max(64).optional(),
  /** Optional body archetype override. */
  archetypeBias: FriendArchetypeSchema.optional(),
});

export const FriendBreedSchema = z.object({
  parentA: z.string().min(1, 'parentA seed string is required').max(2048).optional(),
  parentB: z.string().min(1, 'parentB seed string is required').max(2048).optional(),
  parentAId: z.string().regex(/^[0-9a-f]{16}$/, 'parentAId must be 16-char lowercase hex').optional(),
  parentBId: z.string().regex(/^[0-9a-f]{16}$/, 'parentBId must be 16-char lowercase hex').optional(),
  /** Optional salt for the child. Same parents + same salt → same child. */
  salt: z.string().max(256).optional(),
}).refine(
  (v) => (v.parentA || v.parentAId) && (v.parentB || v.parentBId),
  { message: 'Each parent requires either a seed string or an Id (parentA/parentAId, parentB/parentBId)' },
);

export const FriendMutateSchema = z.object({
  parent: z.string().min(1, 'parent seed string is required').max(2048).optional(),
  parentId: z.string().regex(/^[0-9a-f]{16}$/, 'parentId must be 16-char lowercase hex').optional(),
  /** 0 = identity, 1 = full random replacement. Defaults to 0.15. */
  magnitude: z.number().min(0).max(1).optional(),
  /** Optional salt for the mutation. Same parent + same salt + same magnitude → same child. */
  salt: z.string().max(256).optional(),
}).refine(
  (v) => v.parent !== undefined || v.parentId !== undefined,
  { message: 'parent (seed string) or parentId required' },
);

export const FriendAnchorSchema = z.object({
  ownerAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address'),
  privateKey: z.string().min(64).max(128),
  contractAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  rpcUrl: z.string().url().optional(),
  network: z.string().min(1).max(64).optional(),
  ipfsCid: z.string().min(1).max(128).optional(),
});
