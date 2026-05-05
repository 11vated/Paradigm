/**
 * Paradigm Minimal Server
 * Simplified backend that actually works
 * Supports: seeds CRUD, generate, grow, evolve APIs
 */

import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// In-memory seed store
const seeds = new Map<string, any>();

// Helper: Generate a simple seed
function createSeed(phrase: string, domain: string = 'character') {
  const hash = Buffer.from(phrase).toString('hex').padEnd(64, '0').substring(0, 64);
  return {
    phrase,
    hash,
    $domain: domain,
    $name: phrase.substring(0, 50),
    genes: {},
    createdAt: Date.now(),
  };
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Get all seeds
app.get('/api/seeds', (_req, res) => {
  const allSeeds = Array.from(seeds.values());
  res.json({ seeds: allSeeds, count: allSeeds.length });
});

// Get seed by ID
app.get('/api/seeds/:id', (req, res) => {
  const seed = seeds.get(req.params.id);
  if (!seed) {
    return res.status(404).json({ error: 'Seed not found' });
  }
  res.json(seed);
});

// Create seed
app.post('/api/seeds', (req, res) => {
  const { phrase, domain } = req.body;
  if (!phrase) {
    return res.status(400).json({ error: 'phrase required' });
  }
  const seed = createSeed(phrase, domain || 'character');
  seeds.set(seed.hash, seed);
  res.json({ success: true, seed });
});

// Generate seed (simplified)
app.post('/api/seeds/generate', (req, res) => {
  const { prompt, domain } = req.body;
  const phrase = `seed:${domain || 'character'}_${Date.now()}_${prompt?.substring(0, 20) || 'generated'}`;
  const seed = createSeed(phrase, domain || 'character');
  seeds.set(seed.hash, seed);
  res.json({ success: true, seed, message: 'Seed generated (minimal server)' });
});

// Grow seed (returns mock artifact)
app.post('/api/seeds/:id/grow', (req, res) => {
  const seed = seeds.get(req.params.id);
  if (!seed) {
    return res.status(404).json({ error: 'Seed not found' });
  }

  const artifact = {
    type: 'gltf',
    name: seed.$name || 'Generated Artifact',
    domain: seed.$domain || 'character',
    seed_hash: seed.hash,
    generation: 1,
    render_hints: { format: 'GLTF' },
    mock: true,
  };

  res.json({ success: true, artifact, message: 'Artifact grown (minimal server)' });
});

// Evolve seed (mock)
app.post('/api/seeds/:id/evolve', (req, res) => {
  const seed = seeds.get(req.params.id);
  if (!seed) {
    return res.status(404).json({ error: 'Seed not found' });
  }

  const { populationSize = 10, generations = 5 } = req.body;

  res.json({
    success: true,
    message: `Evolution complete (minimal server)`,
    config: { populationSize, generations },
    best: seed,
    generations: Array.from({ length: generations }, (_, i) => ({
      generation: i + 1,
      bestFitness: 0.5 + Math.random() * 0.5,
      avgFitness: 0.3 + Math.random() * 0.4,
    })),
  });
});

// Agent query (mock)
app.post('/api/agent/query', (req, res) => {
  const { query } = req.body;
  res.json({
    success: true,
    response: `Agent response to: ${query} (minimal server)`,
    artifacts: [],
  });
});

// Execute GSPL (mock)
app.post('/api/gspl/execute', (req, res) => {
  const { program } = req.body;
  res.json({
    success: true,
    result: `GSPL program executed (minimal server)`,
    output: program ? program.substring(0, 100) : 'empty',
  });
});

// Parse GSPL (mock)
app.post('/api/gspl/parse', (req, res) => {
  const { code } = req.body;
  res.json({
    success: true,
    ast: { type: 'program', body: [] },
    message: 'GSPL parsed (minimal server)',
  });
});

// Mutate seed
app.post('/api/seeds/:id/mutate', (req, res) => {
  const seed = seeds.get(req.params.id);
  if (!seed) {
    return res.status(404).json({ error: 'Seed not found' });
  }
  const { genes } = req.body;
  if (genes) {
    seed.genes = { ...seed.genes, ...genes };
  }
  seeds.set(seed.hash, seed);
  res.json({ success: true, seed, message: 'Seed mutated (minimal server)' });
});

// Breed seeds (mock)
app.post('/api/seeds/breed', (req, res) => {
  const { seed1, seed2 } = req.body;
  const parent1 = seeds.get(seed1);
  const parent2 = seeds.get(seed2);
  if (!parent1 || !parent2) {
    return res.status(404).json({ error: 'One or both seeds not found' });
  }

  const childPhrase = `child_${Date.now()}`;
  const child = createSeed(childPhrase, parent1.$domain);
  child.genes = { ...parent1.genes, ...parent2.genes, _lineage: { parents: [seed1, seed2] } };
  seeds.set(child.hash, child);

  res.json({ success: true, child, message: 'Seeds bred (minimal server)' });
});

// Update gene
app.put('/api/seeds/:id/genes/:geneName', (req, res) => {
  const seed = seeds.get(req.params.id);
  if (!seed) {
    return res.status(404).json({ error: 'Seed not found' });
  }
  const { value } = req.body;
  if (!seed.genes) seed.genes = {};
  seed.genes[req.params.geneName] = { type: 'string', value };
  seeds.set(seed.hash, seed);
  res.json({ success: true, seed, message: 'Gene updated (minimal server)' });
});

// Delete seed
app.delete('/api/seeds/:id', (req, res) => {
  const deleted = seeds.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Seed not found' });
  }
  res.json({ success: true, message: 'Seed deleted' });
});

// Keys generation (mock)
app.post('/api/keys/generate', (_req, res) => {
  res.json({
    success: true,
    publicKey: 'mock_public_key',
    privateKey: 'mock_private_key',
    message: 'Keys generated (minimal server)',
  });
});

// Sign seed (mock)
app.post('/api/seeds/:id/sign', (req, res) => {
  const seed = seeds.get(req.params.id);
  if (!seed) {
    return res.status(404).json({ error: 'Seed not found' });
  }
  seed.$provenance = {
    signer: 'mock_signer',
    signature: 'mock_signature',
    timestamp: Date.now(),
  };
  seeds.set(seed.hash, seed);
  res.json({ success: true, seed, message: 'Seed signed (minimal server)' });
});

// Verify seed (mock)
app.get('/api/seeds/:id/verify', (req, res) => {
  const seed = seeds.get(req.params.id);
  if (!seed) {
    return res.status(404).json({ error: 'Seed not found' });
  }
  res.json({
    success: true,
    valid: true,
    message: 'Seed verified (minimal server)',
  });
});

// Mint seed as NFT (mock)
app.post('/api/seeds/:id/mint', (req, res) => {
  const seed = seeds.get(req.params.id);
  if (!seed) {
    return res.status(404).json({ error: 'Seed not found' });
  }
  res.json({
    success: true,
    transactionId: `mock_tx_${Date.now()}`,
    nftAddress: 'mock_nft_address',
    message: 'Seed minted as NFT (minimal server)',
  });
});

// Get NFT info (mock)
app.get('/api/seeds/:id/nft', (req, res) => {
  const seed = seeds.get(req.params.id);
  if (!seed) {
    return res.status(404).json({ error: 'Seed not found' });
  }
  res.json({
    success: true,
    minted: false,
    nftAddress: null,
    message: 'NFT info (minimal server)',
  });
});

// Get seed portrait (mock)
app.get('/api/seeds/:id/portrait', (req, res) => {
  res.redirect('https://via.placeholder.com/256x256.png?text=Seed+' + req.params.id.substring(0, 8));
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Paradigm Minimal Server running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
