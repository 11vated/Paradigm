/**
 * Secure Friend Routes - Server-Side Key Management
 * 
 * SECURITY: Private keys NEVER transmitted in requests or responses.
 * All cryptographic operations happen server-side using KeyManager.
 */

import type { Express } from 'express';
import type { KeyManager } from '../key-manager';

export interface SecureFriendDeps {
  optionalAuth: (req: any, res: any, next: any) => void;
  requireAuth: (req: any, res: any, next: any) => void;
  friendStore: any;
  keyManager: KeyManager;
  signFriendSeed: (friend: any, privateKey: string, publicKey: string) => Promise<any>;
  anchorFriendOnChain: (opts: any) => Promise<any>;
  crypto: any;
  log: (level: string, message: string, meta?: any) => void;
}

export function registerSecureFriendRoutes(app: Express, deps: SecureFriendDeps): void {
  const { optionalAuth, requireAuth, friendStore, keyManager, signFriendSeed, anchorFriendOnChain, crypto, log } = deps;

  /**
   * Generate new keypair (server-side only)
   * Returns: { keyId, publicKey, algorithm }
   * Private key stored encrypted on server, never exposed
   */
  app.post('/api/v2/friend/keys/generate', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id; // From JWT auth
      const keyPair = await keyManager.generateKeyPair(userId);
      
      log('INFO', 'Keypair generated (server-side)', {
        keyId: keyPair.keyId,
        userId,
        publicKeyFingerprint: crypto.createHash('sha256')
          .update(keyPair.publicKey, 'utf8')
          .digest('hex')
          .slice(0, 12)
      });
      
      // SECURITY: Only return public key and keyId, never private key
      res.json({
        keyId: keyPair.keyId,
        publicKey: keyPair.publicKey,
        algorithm: keyPair.algorithm,
        createdAt: keyPair.createdAt,
      });
    } catch (e: any) {
      log('ERROR', 'Keypair generation failed', { error: e.message });
      res.status(500).json({ error: 'Keypair generation failed', detail: e.message });
    }
  });

  /**
   * List user's keys
   * Returns: Array of { keyId, publicKey, createdAt, algorithm }
   */
  app.get('/api/v2/friend/keys', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const keys = await keyManager.listUserKeys(userId);
      res.json({ keys });
    } catch (e: any) {
      log('ERROR', 'Failed to list keys', { error: e.message });
      res.status(500).json({ error: 'Failed to list keys' });
    }
  });

  /**
   * Get key metadata
   * Returns: { keyId, publicKey, createdAt, algorithm }
   */
  app.get('/api/v2/friend/keys/:keyId', requireAuth, async (req: any, res: any) => {
    try {
      const metadata = await keyManager.getKeyMetadata(req.params.keyId);
      if (!metadata) {
        return res.status(404).json({ error: 'Key not found' });
      }
      
      // Verify ownership
      const userId = req.user?.id;
      if (userId && metadata.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(metadata);
    } catch (e: any) {
      log('ERROR', 'Failed to get key metadata', { error: e.message });
      res.status(500).json({ error: 'Failed to get key metadata' });
    }
  });

  /**
   * Delete a key
   */
  app.delete('/api/v2/friend/keys/:keyId', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      const deleted = await keyManager.deleteKey(req.params.keyId, userId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Key not found or access denied' });
      }
      
      log('INFO', 'Key deleted', { keyId: req.params.keyId, userId });
      res.json({ deleted: true, keyId: req.params.keyId });
    } catch (e: any) {
      log('ERROR', 'Failed to delete key', { error: e.message });
      res.status(500).json({ error: 'Failed to delete key' });
    }
  });

  /**
   * Sign a Friend (server-side signing)
   * Request: { keyId }
   * SECURITY: Private key never leaves server
   */
  app.post('/api/v2/friend/:id/sign', requireAuth, async (req: any, res: any) => {
    try {
      const friend = await friendStore.get(req.params.id);
      if (!friend) {
        return res.status(404).json({ error: 'Friend not found' });
      }
      
      const { keyId } = req.body || {};
      if (!keyId) {
        return res.status(400).json({ error: 'keyId required' });
      }
      
      // Verify key ownership
      const userId = req.user?.id;
      const keyMetadata = await keyManager.getKeyMetadata(keyId);
      if (!keyMetadata) {
        return res.status(404).json({ error: 'Key not found' });
      }
      if (userId && keyMetadata.userId !== userId) {
        return res.status(403).json({ error: 'Key access denied' });
      }
      
      // Get private key (server-side only, never exposed)
      const privateKey = await keyManager.getPrivateKey(keyId, userId);
      const publicKey = keyMetadata.publicKey;
      
      // Sign the friend
      const signed = await signFriendSeed(friend, privateKey, publicKey);
      await friendStore.add(signed);
      
      log('INFO', 'Friend signed (server-side)', {
        id: signed.id,
        keyId,
        userId,
        publicKeyFingerprint: crypto.createHash('sha256')
          .update(publicKey, 'utf8')
          .digest('hex')
          .slice(0, 12)
      });
      
      res.json({
        friend: signed,
        sovereignty: signed.sovereignty,
      });
    } catch (e: any) {
      log('WARN', 'Friend signing failed', {
        id: req.params.id,
        error: e.message
      });
      res.status(400).json({ error: 'Signing failed', detail: e.message });
    }
  });

  /**
   * Anchor Friend on-chain (server-side key usage)
   * Request: { ownerAddress, keyId, contractAddress?, rpcUrl?, network?, ipfsCid? }
   * SECURITY: Ethereum private key never leaves server
   */
  app.post('/api/v2/friend/:id/anchor', requireAuth, async (req: any, res: any) => {
    try {
      const friend = friendStore.get(req.params.id);
      if (!friend) {
        return res.status(404).json({ error: 'Friend not found' });
      }
      
      if (!friend.sovereignty) {
        return res.status(400).json({
          error: 'Friend must be signed before anchoring on-chain'
        });
      }
      
      const { ownerAddress, keyId, contractAddress, rpcUrl, network, ipfsCid } = req.body;
      
      if (!ownerAddress) {
        return res.status(400).json({ error: 'ownerAddress required' });
      }
      if (!keyId) {
        return res.status(400).json({ error: 'keyId required (Ethereum wallet key)' });
      }
      
      // Verify key ownership
      const userId = req.user?.id;
      const keyMetadata = await keyManager.getKeyMetadata(keyId);
      if (!keyMetadata) {
        return res.status(404).json({ error: 'Key not found' });
      }
      if (userId && keyMetadata.userId !== userId) {
        return res.status(403).json({ error: 'Key access denied' });
      }
      
      // Get Ethereum private key (server-side only)
      const privateKey = await keyManager.getPrivateKey(keyId, userId);
      
      log('INFO', 'Friend anchor requested (server-side)', {
        friendId: friend.id,
        ownerAddress,
        keyId,
        userId,
        contractAddress: contractAddress ?? '(env default)',
        network: network ?? '(default)'
      });
      
      // Anchor on-chain
      const result = await anchorFriendOnChain({
        friend,
        ownerAddress,
        privateKey,
        contractAddress,
        rpcUrl,
        network,
        ipfsCid,
      });
      
      if (!result.success || !result.anchor) {
        log('WARN', 'Friend anchor failed', {
          friendId: friend.id,
          error: result.error
        });
        return res.status(400).json({ error: result.error ?? 'anchor failed' });
      }
      
      // Update friend with anchor info
      const updated: any = {
        ...friend,
        sovereignty: {
          ...friend.sovereignty!,
          anchor: result.anchor,
        },
      };
      await friendStore.add(updated);
      
      log('INFO', 'Friend anchored on-chain (server-side)', {
        friendId: friend.id,
        tokenId: result.anchor.tokenId,
        txHash: result.anchor.transactionHash,
        network: result.anchor.network,
        keyId,
        userId
      });
      
      res.json({
        friendSeed: updated,
        anchor: result.anchor,
      });
    } catch (e: any) {
      log('ERROR', 'Friend anchor error', {
        id: req.params.id,
        error: e.message
      });
      res.status(500).json({ error: 'Anchor failed', detail: e.message });
    }
  });
}

// Made with Bob
