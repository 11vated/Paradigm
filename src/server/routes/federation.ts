/**
 * Federation Routes — Phase 9
 * 
 * P2P seed exchange between Paradigm nodes.
 * All routes are under /federation/*
 * 
 * POST /federation/discover      — List known peers
 * POST /federation/offer         — Send seed offer to a peer
 * POST /federation/accept        — Accept a seed offer
 * POST /federation/reject        — Reject a seed offer
 * GET  /federation/status        — Node status
 * GET  /federation/peers         — List connected peers
 * GET  /federation/lineage/:id   — Lineage tree for a seed
 */

import { createHash } from 'crypto';
import type { Request, Response } from 'express';

// ─── In-Memory Federation State ──────────────────────────────────────────────

interface Peer {
  nodeId: string;
  hostname: string;
  port: number;
  publicKey: string;
  capabilities: string[];
  lastSeen: number;
}

interface SeedOffer {
  seed: any;
  signature: string;
  senderNodeId: string;
  senderPublicKey: string;
  timestamp: number;
  offerHash: string;
}

interface FederationState {
  nodeId: string;
  hostname: string;
  port: number;
  publicKey: string;
  privateKey: string;
  peers: Map<string, Peer>;
  offers: Map<string, SeedOffer>;
  lineage: Map<string, any>;
  seedStore: Map<string, any>;
}

let state: FederationState = {
  nodeId: '',
  hostname: 'localhost',
  port: 3000,
  publicKey: '',
  privateKey: '',
  peers: new Map(),
  offers: new Map(),
  lineage: new Map(),
  seedStore: new Map(),
};

export function initFederation(config: { nodeId: string; hostname: string; port: number; publicKey: string; privateKey: string }) {
  state = { ...state, ...config, peers: new Map(), offers: new Map(), lineage: new Map(), seedStore: new Map() };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeOfferHash(offer: Omit<SeedOffer, 'offerHash'>): string {
  const input = `${offer.senderNodeId}:${offer.seed?.$hash || ''}:${offer.timestamp}`;
  return createHash('sha256').update(input).digest('hex').slice(0, 32);
}

function verifySignature(data: string, signature: string, publicKey: string): boolean {
  // In production: ECDSA P-256 verification
  // For now: simplified hash-based check
  const expected = createHash('sha256').update(`${data}:${publicKey}`).digest('hex').slice(0, 32);
  return signature === expected;
}

function signData(data: string, privateKey: string): string {
  return createHash('sha256').update(`${data}:${privateKey}`).digest('hex').slice(0, 32);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export function registerFederationRoutes(app: any) {
  /**
   * GET /federation/status
   * Returns node status and capabilities.
   */
  app.get('/federation/status', (req: Request, res: Response) => {
    res.json({
      nodeId: state.nodeId,
      hostname: state.hostname,
      port: state.port,
      publicKey: state.publicKey,
      capabilities: ['seed-exchange', 'lineage-merge'],
      peers: state.peers.size,
      seedsStored: state.seedStore.size,
      activeOffers: state.offers.size,
      timestamp: Date.now(),
    });
  });

  /**
   * GET /federation/peers
   * Returns list of known peers.
   */
  app.get('/federation/peers', (req: Request, res: Response) => {
    const peers = Array.from(state.peers.values());
    res.json({ peers, count: peers.length });
  });

  /**
   * POST /federation/discover
   * Discover peers by querying a known peer list.
   */
  app.post('/federation/discover', (req: Request, res: Response) => {
    const { peerUrl: _peerUrl } = req.body;
    
    // In production: fetch peer list from the given URL
    // For now: return known peers
    const peers = Array.from(state.peers.values());
    
    res.json({
      nodeId: state.nodeId,
      peers,
      message: 'Peer discovery is best-effort. Connect to known peers to expand the network.',
    });
  });

  /**
   * POST /federation/offer
   * Send a seed offer to this node.
   */
  app.post('/federation/offer', (req: Request, res: Response) => {
    const offer: SeedOffer = req.body;

    // Validate offer
    if (!offer.seed || !offer.signature || !offer.senderNodeId) {
      res.status(400).json({ error: 'Invalid offer: missing seed, signature, or senderNodeId' });
      return;
    }

    // Verify signature
    const dataToVerify = `${offer.seed.$hash || ''}:${offer.seed.$domain || ''}`;
    if (!verifySignature(dataToVerify, offer.signature, offer.senderPublicKey)) {
      res.status(400).json({ 
        accepted: false,
        reason: 'invalid-signature',
        message: 'Signature verification failed',
      });
      return;
    }

    // Check for duplicate
    if (state.seedStore.has(offer.seed.$hash)) {
      res.json({
        accepted: false,
        reason: 'duplicate',
        message: 'Seed already exists in local store',
      });
      return;
    }

    // Store offer
    const offerHash = makeOfferHash(offer);
    offer.offerHash = offerHash;
    state.offers.set(offerHash, offer);

    // Store seed
    state.seedStore.set(offer.seed.$hash, offer.seed);

    // Create receipt signature
    const receiptData = `${offerHash}:${state.nodeId}:${Date.now()}`;
    const receiptSignature = signData(receiptData, state.privateKey);

    res.json({
      accepted: true,
      receiverNodeId: state.nodeId,
      receiverSignature: receiptSignature,
      proofOfReceipt: createHash('sha256').update(receiptData).digest('hex').slice(0, 32),
      lineageFork: false,
      timestamp: Date.now(),
    });
  });

  /**
   * POST /federation/accept
   * Accept a previously sent offer (acknowledgement).
   */
  app.post('/federation/accept', (req: Request, res: Response) => {
    const { offerHash, receiverNodeId, receiverSignature: _receiverSignature } = req.body;

    if (!offerHash || !receiverNodeId) {
      res.status(400).json({ error: 'Missing offerHash or receiverNodeId' });
      return;
    }

    const offer = state.offers.get(offerHash);
    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    // Create lineage record
    const lineage = {
      seedId: offer.seed.$hash,
      parentId: offer.seed.$lineage?.parents?.[0] || null,
      childId: null,
      forkPoint: offer.seed.$lineage?.generation || 0,
      mergedAt: Date.now(),
      mergedBy: receiverNodeId,
    };

    state.lineage.set(offer.seed.$hash, lineage);
    state.offers.delete(offerHash);

    res.json({
      accepted: true,
      lineage,
      message: 'Offer accepted and lineage recorded',
    });
  });

  /**
   * POST /federation/reject
   * Reject a previously sent offer.
   */
  app.post('/federation/reject', (req: Request, res: Response) => {
    const { offerHash, reason } = req.body;

    if (!offerHash) {
      res.status(400).json({ error: 'Missing offerHash' });
      return;
    }

    const offer = state.offers.get(offerHash);
    if (offer) {
      state.offers.delete(offerHash);
    }

    res.json({
      accepted: false,
      reason: reason || 'rejected-by-receiver',
      message: 'Offer rejected',
    });
  });

  /**
   * GET /federation/lineage/:id
   * Get lineage tree for a seed.
   */
  app.get('/federation/lineage/:id', (req: Request, res: Response) => {
    const seedId = req.params.id;
    const lineage = state.lineage.get(seedId);
    const seed = state.seedStore.get(seedId);

    if (!lineage && !seed) {
      res.status(404).json({ error: 'Seed not found' });
      return;
    }

    res.json({
      seedId,
      lineage: lineage || null,
      seed: seed ? { $hash: seed.$hash, $domain: seed.$domain, $name: seed.$name } : null,
      storedAt: Date.now(),
    });
  });

  /**
   * POST /federation/exchange
   * High-level seed exchange: offer + auto-accept if valid.
   */
  app.post('/federation/exchange', (req: Request, res: Response) => {
    const { seed, signature, senderNodeId, senderPublicKey, targetNodeId: _targetNodeId } = req.body;

    if (!seed || !signature) {
      res.status(400).json({ error: 'Missing seed or signature' });
      return;
    }

    // Verify signature
    const dataToVerify = `${seed.$hash || ''}:${seed.$domain || ''}`;
    if (!verifySignature(dataToVerify, signature, senderPublicKey)) {
      res.status(400).json({ accepted: false, reason: 'invalid-signature' });
      return;
    }

    // Store seed
    state.seedStore.set(seed.$hash, seed);

    // Record lineage
    const lineage = {
      seedId: seed.$hash,
      parentId: seed.$lineage?.parents?.[0] || null,
      source: senderNodeId,
      exchangedAt: Date.now(),
    };
    state.lineage.set(seed.$hash, lineage);

    // Create receipt
    const receiptData = `exchange:${seed.$hash}:${state.nodeId}:${Date.now()}`;
    const receiptSignature = signData(receiptData, state.privateKey);

    res.json({
      accepted: true,
      receipt: {
        signature: receiptSignature,
        timestamp: Date.now(),
        nodeId: state.nodeId,
      },
      lineage,
    });
  });

  console.log('[Federation] Routes registered at /federation/*');
}
