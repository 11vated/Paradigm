#!/usr/bin/env node
/**
 * Paradigm Training Data Preparation
 *
 * Generates conversation pairs from:
 *  - Kernel metadata (domains, gene types, functors)
 *  - Seed creation patterns for all 26 domains
 *  - GSPL syntax examples
 *  - Composition pathfinding
 *  - Evolution and mutation commands
 *
 * Output: data/training/gspl_conversations.jsonl (ShareGPT format)
 *
 * Usage: node scripts/prepare-training-data.mjs
 */
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'data', 'training');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'gspl_conversations.jsonl');

const DOMAINS = [
  'character', 'sprite', 'animation', 'music', 'ecosystem', 'fullgame',
  'architecture', 'fashion', 'cuisine', 'language', 'ritual', 'narrative',
  'vehicle', 'weapon', 'terrain', 'weather', 'economy', 'politics',
  'philosophy', 'mathematics', 'chemistry', 'biology', 'astronomy',
  'technology', 'art', 'poetry',
];

const GENE_TYPES = [
  'scalar', 'categorical', 'vector', 'expression', 'struct', 'array',
  'graph', 'topology', 'temporal', 'regulatory', 'field', 'symbolic',
  'quantum', 'gematria', 'resonance', 'dimensional', 'sovereignty',
];

const FUNCTORS = [
  ['character', 'sprite'], ['character', 'music'], ['character', 'narrative'],
  ['sprite', 'animation'], ['music', 'ritual'], ['narrative', 'fullgame'],
  ['ecosystem', 'terrain'], ['architecture', 'fullgame'], ['fashion', 'character'],
];

function conv(human, gpt) {
  return JSON.stringify({
    conversations: [
      { from: 'human', value: human },
      { from: 'gpt', value: gpt },
    ]
  });
}

const lines = [];

// ── Domain knowledge conversations ───────────────────────────────────────────
for (const domain of DOMAINS) {
  lines.push(conv(
    `What is the ${domain} domain?`,
    `The ${domain} domain is one of 26 creative domains in Paradigm. Seeds in the ${domain} domain are grown by the ${domain} engine, which produces domain-specific artifacts. You can create a ${domain} seed using GSPL:\n\nseed My${domain.charAt(0).toUpperCase() + domain.slice(1)} {\n  domain: ${domain};\n  gene core_power: scalar = 0.7;\n  gene complexity: scalar = 0.5;\n}`
  ));

  lines.push(conv(
    `Create a ${domain} seed`,
    `Here's a ${domain} seed:\n\nseed New${domain.charAt(0).toUpperCase() + domain.slice(1)} {\n  domain: ${domain};\n  gene core_power: scalar = ${(0.5 + Math.random() * 0.4).toFixed(2)};\n  gene stability: scalar = ${(0.4 + Math.random() * 0.5).toFixed(2)};\n  gene complexity: scalar = ${(0.3 + Math.random() * 0.6).toFixed(2)};\n  gene theme_color: vector = [${Math.random().toFixed(2)}, ${Math.random().toFixed(2)}, ${Math.random().toFixed(2)}];\n}\n\nThis creates a seed in the ${domain} domain with baseline genes. The ${domain} engine will grow it into a domain-specific artifact.`
  ));
}

// ── Gene type conversations ──────────────────────────────────────────────────
const geneExamples = {
  scalar: '0.75',
  categorical: '"warrior"',
  vector: '[0.8, 0.3, 0.1]',
  expression: '"sin(x) + cos(y)"',
  struct: '{ key: "value", nested: { a: 1 } }',
  array: '[1, 2, 3, 4, 5]',
  graph: '{ nodes: ["a", "b"], edges: [["a", "b"]] }',
  topology: '{ genus: 2, boundary: "closed" }',
  temporal: '{ keyframes: [{ t: 0, v: 0 }, { t: 1, v: 1 }] }',
  regulatory: '{ rules: [{ if: "power > 0.5", then: "boost" }] }',
  field: '{ type: "scalar_field", resolution: 32 }',
  symbolic: '{ symbol: "alpha", meaning: "beginning" }',
  quantum: '{ amplitudes: [0.707, 0.707], basis: ["|0>", "|1>"] }',
  gematria: '{ sequence: "paradigm", system: "hebrew", computed_value: 272 }',
  resonance: '{ fundamentals: [440, 880], partials: [{ freq: 440, amplitude: 1.0 }] }',
  dimensional: '{ dimensions: 4, embedding: [0.1, 0.2, 0.3, 0.4] }',
  sovereignty: '{ author_pubkey: "0x...", lineage: ["root"] }',
};

for (const type of GENE_TYPES) {
  lines.push(conv(
    `How does the ${type} gene type work?`,
    `The ${type} gene type is one of 17 gene types in Paradigm's kernel. Each gene type implements four operators:\n\n1. **validate** — checks if a value conforms to the type\n2. **mutate** — deterministically perturbs the value using RNG\n3. **crossover** — blends two parent values during breeding\n4. **distance** — measures similarity between two values (0.0 = identical, 1.0 = maximally different)\n\nExample value: ${geneExamples[type] || '...'}\n\nIn GSPL: \`gene my_gene: ${type} = ${geneExamples[type] || '0.5'};\``
  ));
}

// ── Composition conversations ────────────────────────────────────────────────
for (const [src, tgt] of FUNCTORS) {
  lines.push(conv(
    `How do I compose a ${src} into a ${tgt}?`,
    `Use cross-domain composition via the ${src}_to_${tgt} functor bridge:\n\n\`POST /api/seeds/{id}/compose { "target_domain": "${tgt}" }\`\n\nOr in GSPL:\n\`compose my_seed -> ${tgt};\`\n\nThe functor transforms gene structures from the ${src} domain into the ${tgt} domain. Genes that don't have a direct mapping are interpolated or projected. The composed seed inherits the lineage of its source.`
  ));
}

// ── Operations conversations ─────────────────────────────────────────────────
lines.push(conv(
  'How do I mutate a seed?',
  'Mutate a seed by calling:\n\n`POST /api/seeds/{id}/mutate { "rate": 0.1 }`\n\nThe rate controls how much each gene is perturbed (0.0 = no change, 1.0 = maximum change). Mutation uses the kernel\'s xoshiro256** RNG seeded from the seed\'s hash, so the same seed+rate always produces the same result.'
));

lines.push(conv(
  'How do I breed two seeds?',
  'Breed two seeds with:\n\n`POST /api/seeds/breed { "parent_a_id": "...", "parent_b_id": "..." }`\n\nBreeding performs gene-level crossover: for each gene present in both parents, the kernel\'s crossover operator blends the values. The offspring inherits the domain of parent A and tracks both parents in its lineage.'
));

lines.push(conv(
  'How does evolution work?',
  'Evolution runs a genetic algorithm:\n\n`POST /api/seeds/{id}/evolve { "population_size": 10, "generations": 5 }`\n\nThis creates a population of mutated variants, evaluates their fitness, and returns them sorted best-first. Each generation applies mutation with decreasing rate. The population is deterministic given the parent seed hash.'
));

lines.push(conv(
  'What is GSPL?',
  'GSPL (Genetically Structured Programming Language) is Paradigm\'s domain-specific language for defining seeds, genes, and operations. Example:\n\n```gspl\nseed MyCharacter {\n  domain: character;\n  gene strength: scalar = 0.8;\n  gene archetype: categorical = "warrior";\n  gene palette: vector = [0.9, 0.2, 0.1];\n}\n\nmutate MyCharacter rate: 0.2;\ncompose MyCharacter -> sprite;\n```\n\nGSPL is parsed by a recursive-descent parser with lexer, AST, and type checker. All operations are deterministic.'
));

lines.push(conv(
  'How does sovereignty work?',
  'Sovereignty provides cryptographic proof of authorship:\n\n1. **Generate keypair**: `POST /api/keys/generate` → ECDSA P-256 public/private keys\n2. **Sign seed**: `POST /api/seeds/{id}/sign { "private_key": "..." }` → Embeds signature in seed\n3. **Verify**: `POST /api/seeds/{id}/verify { "public_key": "..." }` → Confirms authenticity\n4. **Mint NFT**: `POST /api/seeds/{id}/mint { "owner_address": "0x..." }` → ERC-721 on Sepolia\n\nThe sovereignty gene type is immutable — mutation and crossover return the original value, preserving provenance.'
));

lines.push(conv(
  'List all domains',
  `Paradigm has 26 creative domains:\n\n${DOMAINS.join(', ')}\n\nEach domain has a dedicated engine that transforms seeds into domain-specific artifacts. Seeds can be composed across domains via 9 functor bridges.`
));

lines.push(conv(
  'List all gene types',
  `Paradigm has 17 gene types:\n\n${GENE_TYPES.join(', ')}\n\nEach type implements validate, mutate, crossover, and distance operators. The quantum type uses Born rule normalization, and the sovereignty type is immutable.`
));

// ── Write output ─────────────────────────────────────────────────────────────
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_FILE, lines.join('\n') + '\n');

console.log(`Generated ${lines.length} training conversations`);
console.log(`Output: ${OUTPUT_FILE}`);
console.log(`Format: ShareGPT JSONL (compatible with Axolotl)`);
