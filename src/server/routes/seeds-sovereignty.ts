/**
 * Seed sovereignty routes: sign, verify, mint, keys, sovereignty preview,
 * gene sovereignty, receipt, export.
 * Slice 17 of the modular router split.
 */
import type { Express } from 'express';

export interface SeedsSovereigntyDeps {
  seeds: any[];
  saveSeeds: () => void;
  optionalAuth: (req: any, res: any, next: any) => void;
  validateBody: (schema: any) => any;
  SignSeedSchema: any;
  VerifySeedSchema: any;
  MintSeedSchema: any;
  crypto: { randomUUID: () => string; createHash: (algo: string) => { update: (d: string, enc?: string) => any; digest: (enc: string) => string } };
  SovereigntyLayer: { generateKeys: () => any; signSeed: (seed: any, pk: string) => any; verifySeed: (seed: any, pub: string) => boolean };
  OnChainSovereignty: { prepareMint: (seed: any) => any; mintOnChain: (opts: any) => Promise<any>; generateGenePortrait: (seed: any) => string; SOLIDITY_SOURCE: string; CONTRACT_ABI: any };
  canonicalizeSeed: (seed: any) => { canonicalJson: string; digest: string; stripped: any };
  seedDigestBytes32: (seed: any) => string;
  createSovereignGene: (gene: any, creator: string, license?: string) => any;
  isSovereignGene: (gene: any) => boolean;
  getGeneProvenance: (gene: any) => any;
  licenseSovereignGene: (gene: any, license: any, userId: string) => any;
  checkGenePermission: (gene: any, operation: 'mutate' | 'breed' | 'compose' | 'commercial', userId: string) => any;
  authorizeSeedMutation: (seed: any, req: any, res: any, action: string, audit?: any) => any;
  LocalHmacSigner: new (opts: any) => any;
  LocalDryRunAnchor: new () => any;
  LocalFilePin: new () => any;
  mintSeedSovereignty: (opts: any) => Promise<any>;
  buildC2PAManifest: (seed: any, domain: string) => any;
  encodeGseed: (pkg: any) => Uint8Array;
  log: (level: string, msg: string, meta?: any) => void;
  audit: (action: string, resource: string, resourceId?: string, details?: any, req?: any) => void;
}

export function registerSeedsSovereigntyRoutes(app: Express, deps: SeedsSovereigntyDeps): void {
  const { seeds, saveSeeds, optionalAuth, validateBody, SignSeedSchema, VerifySeedSchema, MintSeedSchema, crypto, SovereigntyLayer, OnChainSovereignty, canonicalizeSeed, seedDigestBytes32, createSovereignGene, isSovereignGene, getGeneProvenance, licenseSovereignGene, checkGenePermission, LocalHmacSigner, LocalDryRunAnchor, LocalFilePin, mintSeedSovereignty, encodeGseed, log, audit } = deps;

  app.get('/api/sovereignty/receipt', optionalAuth, async (req: any, res: any) => {
    const hash = req.query.hash as string;
    if (!hash) return res.status(400).json({ error: 'hash required' });
    const seed = seeds.find((s: any) => s.$hash === hash || s.id === hash);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });
    res.json({ seedHash: hash, domain: seed.$domain ?? 'unknown', sovereignty: { signed: !!(seed.$sovereignty?.signature), valid: seed.$sovereignty?.signature ? true : null, publicKeyFingerprint: seed.$sovereignty?.author_pubkey ?? null, algorithm: 'ECDSA P-256', signedAt: seed.$sovereignty?.timestamp ?? null }, lineage: (seed.$lineage ?? []).slice(0, 8).map((h: string, i: number) => ({ hash: h, depth: i + 1, domain: seed.$domain ?? 'unknown', operation: 'mutate' })), commits: [], anchor: { minted: false } });
  });

  app.post('/api/sovereignty/export/gseed', optionalAuth, async (req: any, res: any) => {
    const { seed } = req.body;
    if (!seed) return res.status(400).json({ error: 'seed required' });
    try {
      const { encodeGseed, CURRENT_VERSION, canCompressSections } = await import('../../lib/kernel/binary-format.js');
      const pkg = { version: CURRENT_VERSION, timestamp: Date.now(), flags: { hasC2PA: false, hasOutputs: false, encryptedSeed: false, royaltyEnabled: false, compressed: canCompressSections() }, seedHash: seed.$hash ?? '000000000000000000000000000000000000000000000000000000000000000', metadata: { schema: 'https://paradigm.ai/schema/gseed-metadata/v1', author: 'Anonymous', title: `Exported ${seed.$domain ?? 'unknown'}`, generator: seed.$domain ?? 'unknown', license: 'CC0' }, params: seed, outputs: [] };
      const buf = encodeGseed(pkg);
      res.setHeader('Content-Disposition', `attachment; filename="seed-${(seed.$hash||'x').slice(0,8)}.gseed"`);
      res.type('application/octet-stream').send(Buffer.from(buf));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/keys/generate', (_req, res) => {
    try { const keys = SovereigntyLayer.generateKeys(); res.json(keys); }
    catch (e: any) { res.status(500).json({ detail: e.message || 'Key generation failed' }); }
  });

  app.post('/api/seeds/:id/sign', optionalAuth, validateBody(SignSeedSchema), (req: any, res: any) => {
    try {
      const seedIndex = seeds.findIndex((s: any) => s.id === req.params.id);
      if (seedIndex === -1) return res.status(404).json({ detail: 'Seed not found' });
      const seed = seeds[seedIndex];
      const sovereignty = SovereigntyLayer.signSeed(seed, req.body.private_key);
      seeds[seedIndex] = { ...seed, $sovereignty: sovereignty };
      saveSeeds();
      const verified = SovereigntyLayer.verifySeed(seeds[seedIndex], sovereignty.public_key);
      log('INFO', 'Seed signed', { id: seed.id });
      audit('seed.sign', 'seed', seed.id, {}, req);
      res.json({ sovereignty, verified });
    } catch (e: any) { log('ERROR', 'Signing error', { error: e.message }); res.status(500).json({ detail: e.message || 'Signing failed' }); }
  });

  app.post('/api/seeds/:id/verify', validateBody(VerifySeedSchema), (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      const verified = SovereigntyLayer.verifySeed(seed, req.body.public_key);
      res.json({ verified });
    } catch (e: any) { res.status(500).json({ detail: e.message || 'Verification failed' }); }
  });

  app.post('/api/seeds/:id/mint', optionalAuth, validateBody(MintSeedSchema), async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      const { owner_address, private_key, ipfs_gateway } = req.body;
      if (!owner_address) return res.status(400).json({ detail: 'owner_address required' });
      if (!private_key) {
        const prepared = OnChainSovereignty.prepareMint(seed);
        return res.json({ dry_run: true, tokenId: prepared.tokenId, metadataUri: prepared.metadataUri, metadata: prepared.metadata, seedHashBytes: prepared.seedHashBytes, message: 'Provide private_key to execute on-chain mint' });
      }
      const result = await OnChainSovereignty.mintOnChain({ seed, ownerAddress: owner_address, privateKey: private_key, ipfsGateway: ipfs_gateway });
      if (result.success) {
        const idx = seeds.findIndex((s: any) => s.id === seed.id);
        if (idx >= 0) { seeds[idx].$sovereignty = { ...(seeds[idx].$sovereignty || {}), onchain: { tokenId: result.tokenId, transactionHash: result.transactionHash, contractAddress: result.contractAddress, network: result.network, metadataUri: result.metadataUri, minted_at: new Date().toISOString() } }; saveSeeds(); }
        log('INFO', 'Seed minted on-chain', { id: seed.id, tokenId: result.tokenId, tx: result.transactionHash });
      }
      res.json(result);
    } catch (e: any) { log('ERROR', 'On-chain mint error', { error: e.message }); res.status(500).json({ detail: e.message || 'Minting failed' }); }
  });

  app.get('/api/seeds/:id/sovereignty/canonical', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });
    const { canonicalJson, digest, stripped } = canonicalizeSeed(seed);
    res.json({ seed_id: seed.id, canonical_json: canonicalJson, digest_hex: digest, digest_bytes32: `0x${digest}`, stripped });
  });

  app.post('/api/seeds/:id/sovereignty/preview', optionalAuth, async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      const ownerAddress = req.body?.owner_address ?? req.user?.address ?? '0x0000000000000000000000000000000000000000';
      const signer = new LocalHmacSigner({ id: req.body?.signer_id ?? 'paradigm-preview', key: req.body?.signer_key ?? 'paradigm-preview-key' });
      const anchor = new LocalDryRunAnchor();
      const pin = new LocalFilePin();
      const prepared = OnChainSovereignty.prepareMint(seed);
      const result = await mintSeedSovereignty({ seed, metadata: prepared.metadata, owner: ownerAddress, signer, anchor, pin });
      res.json({ dry_run: true, seed_id: seed.id, digest: result.digest, canonical_json_length: result.canonicalJson.length, signature: { signer: result.signature.signer, algorithm: result.signature.algorithm, signature: result.signature.signature, signed_at: result.signature.signedAt }, pin: { backend: result.pin.backend, uri: result.pin.uri, size_bytes: result.pin.sizeBytes, content_digest: result.pin.contentDigest }, anchor: { network: result.anchor.network, chain_id: result.anchor.chainId, token_id: result.anchor.tokenId, transaction_hash: result.anchor.transactionHash, metadata_uri: result.anchor.metadataUri, owner: result.anchor.owner, dry_run: result.anchor.dryRun }, metadata: prepared.metadata, warning: 'This is a dry-run. No transaction was broadcast and no real network was contacted. Use /mint with a private key to execute the real mint on Base L2.' });
    } catch (e: any) { log('ERROR', 'Sovereignty preview error', { error: e?.message }); res.status(500).json({ detail: e?.message ?? 'Preview failed' }); }
  });

  app.post('/api/seeds/:id/sovereignty/verify', async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      const sig = req.body?.signature;
      if (!sig) return res.status(400).json({ detail: 'signature required' });
      if (sig.algorithm !== 'local-hmac-sha256') { return res.status(400).json({ detail: `verify endpoint only supports local-hmac-sha256 signatures (got ${sig.algorithm}); use an on-chain explorer for EIP-712` }); }
      const signer = new LocalHmacSigner({ id: sig.signer, key: req.body?.signer_key ?? 'paradigm-preview-key' });
      const ok = await signer.verify(seed, sig);
      res.json({ valid: ok, current_digest: seedDigestBytes32(seed), signature_digest: sig.digest, digest_matches: sig.digest === seedDigestBytes32(seed) });
    } catch (e: any) { log('ERROR', 'Sovereignty verify error', { error: e?.message }); res.status(500).json({ detail: e?.message ?? 'Verify failed' }); }
  });

  app.get('/api/seeds/:id/sovereignty/onchain', async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });
    const { canonicalJson, digest } = canonicalizeSeed(seed);
    const onChainConfig = { sepolia: process.env.SEPOLIA_RPC_URL ? { contract: process.env.PARADIGM_NFT_CONTRACT || '0x0000000000000000000000000000000000000000', network: 'sepolia', chain_id: 11155111, explorer: 'https://sepolia.etherscan.io' } : null };
    res.json({ seed_id: seed.id, seed_name: seed.name, digest_hex: digest, canonical_json_length: canonicalJson.length, minted: !!seed.nft?.minted, token_id: seed.nft?.tokenId || null, contract_address: seed.nft?.contractAddress || null, transaction_hash: seed.nft?.transactionHash || null, configured_networks: Object.fromEntries(Object.entries(onChainConfig).filter(([_, v]) => v !== null)), links: { sovereignty_canonical: `/api/seeds/${seed.id}/sovereignty/canonical`, sovereignty_preview: `/api/seeds/${seed.id}/sovereignty/preview`, sovereignty_verify: `/api/seeds/${seed.id}/sovereignty/verify` } });
  });

  app.get('/api/seeds/:id/nft', async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });
    const prepared = OnChainSovereignty.prepareMint(seed);
    res.json({ tokenId: prepared.tokenId, metadata: prepared.metadata, metadataUri: prepared.metadataUri, seedHashBytes: prepared.seedHashBytes, onchain: seed.$sovereignty?.onchain || null });
  });

  app.get('/api/seeds/:id/portrait', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });
    const svg = OnChainSovereignty.generateGenePortrait(seed);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  });

  app.get('/api/contract/source', (_req, res) => {
    res.json({ source: OnChainSovereignty.SOLIDITY_SOURCE, abi: OnChainSovereignty.CONTRACT_ABI, network: 'sepolia', note: 'Deploy this contract to Sepolia, then set PARADIGM_NFT_CONTRACT in your .env' });
  });

  app.post('/api/seeds/:id/genes/:geneKey/sovereignty', optionalAuth, (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });
    const geneKey = req.params.geneKey;
    if (!seed.genes?.[geneKey]) return res.status(404).json({ detail: 'Gene not found' });
    const gene = seed.genes[geneKey];
    const sovereign = createSovereignGene(gene, req.body.creator || 'anonymous', req.body.license);
    seed.genes[geneKey] = sovereign;
    saveSeeds();
    res.json({ gene: sovereign });
  });

  app.get('/api/seeds/:id/genes/:geneKey/sovereignty', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });
    const geneKey = req.params.geneKey;
    if (!seed.genes?.[geneKey]) return res.status(404).json({ detail: 'Gene not found' });
    const gene = seed.genes[geneKey];
    const ownership = gene.ownership || { creator: 'unknown', lineage: [] };
    res.json({ geneKey, ownership, license: gene.ownership?.license || null });
  });

  app.get('/api/seeds/:id/gene/:name/provenance', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });
    const gene = seed.genes?.[req.params.name];
    if (!gene) return res.status(404).json({ error: 'Gene not found' });
    if (isSovereignGene(gene)) { return res.json(getGeneProvenance(gene)); }
    return res.json({ creator: 'legacy', history: [], currentValue: gene.value, legacy: true });
  });

  app.post('/api/seeds/:id/gene/:name/license', optionalAuth, (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });
    const geneName = req.params.name;
    const rawGene = seed.genes?.[geneName];
    if (!rawGene) return res.status(404).json({ error: 'Gene not found' });
    const userId = req.user?.sub || req.user?.username || 'anonymous';
    const { type, commercial, derivatives, attribution, shareAlike, royaltyBps } = req.body;
    let gene = isSovereignGene(rawGene) ? rawGene : createSovereignGene(rawGene.value, rawGene.type || 'scalar', userId);
    gene = licenseSovereignGene(gene, { type: type || 'custom', commercial: commercial !== false, derivatives: derivatives !== false, attribution, shareAlike, royaltyBps }, userId);
    seed.genes[geneName] = gene;
    saveSeeds();
    log('INFO', `Gene ${geneName} licensed`, { seed: seed.id, user: userId });
    audit('gene.license', 'gene', `${seed.id}:${geneName}`, { license: type }, req);
    res.json({ success: true, provenance: getGeneProvenance(gene) });
  });

  app.get('/api/seeds/:id/gene/:name/permission', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });
    const gene = seed.genes?.[req.params.name];
    if (!gene) return res.status(404).json({ error: 'Gene not found' });
    if (!isSovereignGene(gene)) { return res.json({ allowed: true, reason: 'Legacy gene — no restrictions' }); }
    const operation = (req.query.operation as string) || 'mutate';
    const userId = (req.query.user as string) || 'anonymous';
    const result = checkGenePermission(gene, operation as any, userId);
    res.json(result);
  });

  app.post('/api/seeds/:id/gene/:name/sovereignize', optionalAuth, (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });
    const geneName = req.params.name;
    const rawGene = seed.genes?.[geneName];
    if (!rawGene) return res.status(404).json({ error: 'Gene not found' });
    if (isSovereignGene(rawGene)) { return res.json({ success: true, message: 'Already sovereign', provenance: getGeneProvenance(rawGene) }); }
    const userId = req.user?.sub || req.user?.username || seed.$owner?.userId || 'anonymous';
    const sovereign = createSovereignGene(rawGene.value, rawGene.type || 'scalar', userId);
    seed.genes[geneName] = sovereign;
    saveSeeds();
    log('INFO', `Gene ${geneName} sovereignized`, { seed: seed.id, user: userId });
    res.json({ success: true, message: 'Gene is now sovereign', provenance: getGeneProvenance(sovereign) });
  });
}
