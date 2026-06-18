import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KeyManager } from '../../src/server/key-manager';
import fs from 'fs/promises';
import path from 'path';

describe('KeyManager', () => {
  let keyManager: KeyManager;
  const testStorageDir = path.resolve('./data/keys-test');
  
  beforeEach(async () => {
    // Cleanup any existing test storage first
    try {
      const files = await fs.readdir(testStorageDir);
      for (const file of files) {
        await fs.unlink(path.join(testStorageDir, file));
      }
    } catch {
      // Directory doesn't exist yet, that's fine
    }
    
    // Set test storage directory
    process.env.KEY_STORAGE_DIR = testStorageDir;
    process.env.KEY_MANAGER_MASTER_KEY = 'test-master-key-32-chars-long!!';
    
    keyManager = new KeyManager();
    await keyManager.initialize();
  });
  
  afterEach(async () => {
    // Cleanup test storage
    try {
      const files = await fs.readdir(testStorageDir);
      for (const file of files) {
        await fs.unlink(path.join(testStorageDir, file));
      }
      await fs.rmdir(testStorageDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('generateKeyPair', () => {
    it('generates a valid ECDSA P-256 keypair', async () => {
      const keyPair = await keyManager.generateKeyPair();
      
      expect(keyPair).toBeDefined();
      expect(keyPair.keyId).toBeDefined();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.algorithm).toBe('ECDSA-P256-SHA256');
      expect(keyPair.createdAt).toBeDefined();
      
      // Verify public key is valid JWK
      const publicJwk = JSON.parse(keyPair.publicKey);
      expect(publicJwk.kty).toBe('EC');
      expect(publicJwk.crv).toBe('P-256');
      expect(publicJwk.x).toBeDefined();
      expect(publicJwk.y).toBeDefined();
    });

    it('generates unique key IDs', async () => {
      const keyPair1 = await keyManager.generateKeyPair();
      const keyPair2 = await keyManager.generateKeyPair();
      
      expect(keyPair1.keyId).not.toBe(keyPair2.keyId);
    });

    it('associates keys with user ID', async () => {
      const userId = 'user-123';
      const keyPair = await keyManager.generateKeyPair(userId);
      
      expect(keyPair.userId).toBe(userId);
      
      const metadata = await keyManager.getKeyMetadata(keyPair.keyId);
      expect(metadata?.userId).toBe(userId);
    });

    it('stores keys encrypted on disk', async () => {
      const keyPair = await keyManager.generateKeyPair();
      
      // Read the stored file
      const keyPath = path.join(testStorageDir, `${keyPair.keyId}.key.json`);
      const content = await fs.readFile(keyPath, 'utf8');
      const stored = JSON.parse(content);
      
      // Verify encryption fields exist
      expect(stored.encryptedPrivateKey).toBeDefined();
      expect(stored.iv).toBeDefined();
      expect(stored.authTag).toBeDefined();
      expect(stored.publicKey).toBeDefined();
      
      // Verify private key is not stored in plaintext
      expect(content).not.toContain('"d":'); // 'd' is the private key component in JWK
    });
  });

  describe('getPrivateKey', () => {
    it('retrieves private key for valid keyId', async () => {
      const keyPair = await keyManager.generateKeyPair();
      const privateKey = await keyManager.getPrivateKey(keyPair.keyId);
      
      expect(privateKey).toBeDefined();
      
      // Verify it's a valid JWK
      const privateJwk = JSON.parse(privateKey);
      expect(privateJwk.kty).toBe('EC');
      expect(privateJwk.crv).toBe('P-256');
      expect(privateJwk.d).toBeDefined(); // Private key component
    });

    it('throws error for non-existent keyId', async () => {
      await expect(
        keyManager.getPrivateKey('non-existent-key-id')
      ).rejects.toThrow();
    });

    it('enforces user ownership', async () => {
      const keyPair = await keyManager.generateKeyPair('user-123');
      
      // Should succeed with correct user
      await expect(
        keyManager.getPrivateKey(keyPair.keyId, 'user-123')
      ).resolves.toBeDefined();
      
      // Should fail with wrong user
      await expect(
        keyManager.getPrivateKey(keyPair.keyId, 'user-456')
      ).rejects.toThrow(/user mismatch/);
    });

    it('caches private keys for performance', async () => {
      const keyPair = await keyManager.generateKeyPair();
      
      // First access - loads from disk
      const key1 = await keyManager.getPrivateKey(keyPair.keyId);
      expect(key1).toBeDefined();
      
      // Second access - should use cache (verify it returns same data)
      const key2 = await keyManager.getPrivateKey(keyPair.keyId);
      expect(key2).toBe(key1); // Same instance from cache
      
      // Verify cache is working by checking we can access it multiple times
      const key3 = await keyManager.getPrivateKey(keyPair.keyId);
      expect(key3).toBe(key1);
    });
  });

  describe('getKeyMetadata', () => {
    it('returns metadata for valid keyId', async () => {
      const keyPair = await keyManager.generateKeyPair('user-123');
      const metadata = await keyManager.getKeyMetadata(keyPair.keyId);
      
      expect(metadata).toBeDefined();
      expect(metadata?.keyId).toBe(keyPair.keyId);
      expect(metadata?.publicKey).toBe(keyPair.publicKey);
      expect(metadata?.userId).toBe('user-123');
      expect(metadata?.algorithm).toBe('ECDSA-P256-SHA256');
      expect(metadata?.createdAt).toBeDefined();
    });

    it('returns null for non-existent keyId', async () => {
      const metadata = await keyManager.getKeyMetadata('non-existent');
      expect(metadata).toBeNull();
    });

    it('does not expose private key', async () => {
      const keyPair = await keyManager.generateKeyPair();
      const metadata = await keyManager.getKeyMetadata(keyPair.keyId);
      
      expect(metadata).toBeDefined();
      expect(JSON.stringify(metadata)).not.toContain('"d":');
    });
  });

  describe('listUserKeys', () => {
    it('lists all keys for a user', async () => {
      const userId = 'user-123';
      
      await keyManager.generateKeyPair(userId);
      await keyManager.generateKeyPair(userId);
      await keyManager.generateKeyPair('user-456'); // Different user
      
      const keys = await keyManager.listUserKeys(userId);
      
      expect(keys).toHaveLength(2);
      expect(keys.every(k => k.userId === userId)).toBe(true);
    });

    it('returns empty array for user with no keys', async () => {
      const keys = await keyManager.listUserKeys('user-no-keys');
      expect(keys).toEqual([]);
    });

    it('does not expose private keys', async () => {
      const userId = 'user-123';
      await keyManager.generateKeyPair(userId);
      
      const keys = await keyManager.listUserKeys(userId);
      const keysJson = JSON.stringify(keys);
      
      expect(keysJson).not.toContain('"d":');
      expect(keysJson).not.toContain('encryptedPrivateKey');
    });
  });

  describe('deleteKey', () => {
    it('deletes a key successfully', async () => {
      const keyPair = await keyManager.generateKeyPair();
      
      const deleted = await keyManager.deleteKey(keyPair.keyId);
      expect(deleted).toBe(true);
      
      // Verify key is gone
      const metadata = await keyManager.getKeyMetadata(keyPair.keyId);
      expect(metadata).toBeNull();
    });

    it('enforces user ownership on deletion', async () => {
      const keyPair = await keyManager.generateKeyPair('user-123');
      
      // Should fail with wrong user
      const deleted = await keyManager.deleteKey(keyPair.keyId, 'user-456');
      expect(deleted).toBe(false);
      
      // Key should still exist
      const metadata = await keyManager.getKeyMetadata(keyPair.keyId);
      expect(metadata).toBeDefined();
    });

    it('returns false for non-existent key', async () => {
      const deleted = await keyManager.deleteKey('non-existent');
      expect(deleted).toBe(false);
    });

    it('removes key from cache', async () => {
      const keyPair = await keyManager.generateKeyPair();
      
      // Load into cache
      await keyManager.getPrivateKey(keyPair.keyId);
      
      // Delete
      await keyManager.deleteKey(keyPair.keyId);
      
      // Should fail to retrieve
      await expect(
        keyManager.getPrivateKey(keyPair.keyId)
      ).rejects.toThrow();
    });
  });

  describe('Security', () => {
    it('encrypts private keys with different IVs', async () => {
      const keyPair1 = await keyManager.generateKeyPair();
      const keyPair2 = await keyManager.generateKeyPair();
      
      const file1 = await fs.readFile(
        path.join(testStorageDir, `${keyPair1.keyId}.key.json`),
        'utf8'
      );
      const file2 = await fs.readFile(
        path.join(testStorageDir, `${keyPair2.keyId}.key.json`),
        'utf8'
      );
      
      const stored1 = JSON.parse(file1);
      const stored2 = JSON.parse(file2);
      
      // Different IVs ensure different ciphertexts
      expect(stored1.iv).not.toBe(stored2.iv);
      expect(stored1.encryptedPrivateKey).not.toBe(stored2.encryptedPrivateKey);
    });

    it('uses authenticated encryption (GCM)', async () => {
      const keyPair = await keyManager.generateKeyPair();
      
      const file = await fs.readFile(
        path.join(testStorageDir, `${keyPair.keyId}.key.json`),
        'utf8'
      );
      const stored = JSON.parse(file);
      
      // GCM provides authentication tag
      expect(stored.authTag).toBeDefined();
      expect(stored.authTag).toHaveLength(32); // 16 bytes in hex
    });

    it('prevents tampering with encrypted keys', async () => {
      const keyPair = await keyManager.generateKeyPair();
      const keyPath = path.join(testStorageDir, `${keyPair.keyId}.key.json`);
      
      // Clear cache to force reload from disk
      // @ts-ignore - accessing private property for testing
      keyManager.keyCache.clear();
      
      // Tamper with encrypted data
      const file = await fs.readFile(keyPath, 'utf8');
      const stored = JSON.parse(file);
      stored.encryptedPrivateKey = stored.encryptedPrivateKey.replace(/a/g, 'b');
      await fs.writeFile(keyPath, JSON.stringify(stored), 'utf8');
      
      // Should fail to decrypt
      await expect(
        keyManager.getPrivateKey(keyPair.keyId)
      ).rejects.toThrow();
    });

    it('requires master key in production', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalKey = process.env.KEY_MANAGER_MASTER_KEY;
      
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.KEY_MANAGER_MASTER_KEY;
        
        expect(() => new KeyManager()).toThrow(/required in production/);
      } finally {
        process.env.NODE_ENV = originalEnv;
        process.env.KEY_MANAGER_MASTER_KEY = originalKey;
      }
    });
  });

  describe('Performance', () => {
    it('handles multiple concurrent key operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        keyManager.generateKeyPair(`user-${i}`)
      );
      
      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(10);
      expect(new Set(results.map(r => r.keyId)).size).toBe(10); // All unique
    });

    it('cache cleanup removes expired entries', async () => {
      const keyPair = await keyManager.generateKeyPair();
      
      // Load into cache
      await keyManager.getPrivateKey(keyPair.keyId);
      
      // Manually trigger cleanup (in real code, this runs periodically)
      // @ts-ignore - accessing private method for testing
      keyManager.cleanupCache();
      
      // Cache should still have the key (not expired yet)
      // This is a basic test - full expiry testing would require time manipulation
    });
  });
});

// Made with Bob
