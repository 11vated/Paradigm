/**
 * WebAuthn Tests
 * 
 * Tests for WebAuthn (passwordless authentication) registration and authentication
 * Covers challenge generation, credential verification, and signature validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '../../src/lib/auth/webauthn.js';
import crypto from 'crypto';

describe('WebAuthn', () => {
  describe('Registration', () => {
    it('generates valid registration options', () => {
      const options = generateRegistrationOptions('user-123', 'testuser');
      
      expect(options).toBeTruthy();
      expect(options.challenge).toBeTruthy();
      expect(typeof options.challenge).toBe('string');
      expect(options.rp).toBeTruthy();
      expect(options.rp.name).toBe('Paradigm Absolute');
      expect(options.user).toBeTruthy();
      expect(options.user.name).toBe('testuser');
      expect(options.user.displayName).toBe('testuser');
      expect(options.pubKeyCredParams).toHaveLength(2);
      expect(options.timeout).toBe(60000);
    });

    it('generates unique challenges for each registration', () => {
      const options1 = generateRegistrationOptions('user-1', 'user1');
      const options2 = generateRegistrationOptions('user-2', 'user2');
      
      expect(options1.challenge).not.toBe(options2.challenge);
    });

    it('includes ES256 and RS256 algorithms', () => {
      const options = generateRegistrationOptions('user-123', 'testuser');
      
      const algTypes = options.pubKeyCredParams.map((p: any) => p.alg);
      expect(algTypes).toContain(-7);  // ES256
      expect(algTypes).toContain(-257); // RS256
    });

    it('sets authenticator selection preferences', () => {
      const options = generateRegistrationOptions('user-123', 'testuser');
      
      expect(options.authenticatorSelection).toBeTruthy();
      expect(options.authenticatorSelection.authenticatorAttachment).toBe('platform');
      expect(options.authenticatorSelection.residentKey).toBe('preferred');
      expect(options.authenticatorSelection.userVerification).toBe('preferred');
    });

    it('uses none attestation', () => {
      const options = generateRegistrationOptions('user-123', 'testuser');
      
      expect(options.attestation).toBe('none');
    });

    it('includes internal challenge buffer', () => {
      const options = generateRegistrationOptions('user-123', 'testuser');
      
      expect(options._challenge).toBeTruthy();
      expect(Buffer.isBuffer(options._challenge)).toBe(true);
      expect(options._challenge.length).toBe(32);
    });
  });

  describe('Registration Verification', () => {
    it('rejects credential with mismatched challenge', async () => {
      const options = generateRegistrationOptions('user-123', 'testuser');
      const wrongChallenge = crypto.randomBytes(32);
      
      // Create mock credential with wrong challenge
      const clientData = {
        type: 'webauthn.create',
        challenge: Buffer.from(wrongChallenge).toString('base64url'),
        origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
      };
      
      const credential = {
        id: 'test-cred-id',
        rawId: 'test-raw-id',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify(clientData)).toString('base64url'),
          attestationObject: createMockAttestationObject(),
        },
      };
      
      await expect(
        verifyRegistrationResponse(credential, options._challenge)
      ).rejects.toThrow('Challenge mismatch');
    });

    it('rejects credential with wrong origin', async () => {
      const options = generateRegistrationOptions('user-123', 'testuser');
      
      const clientData = {
        type: 'webauthn.create',
        challenge: Buffer.from(options._challenge).toString('base64url'),
        origin: 'https://evil.com',
      };
      
      const credential = {
        id: 'test-cred-id',
        rawId: 'test-raw-id',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify(clientData)).toString('base64url'),
          attestationObject: createMockAttestationObject(),
        },
      };
      
      await expect(
        verifyRegistrationResponse(credential, options._challenge)
      ).rejects.toThrow(/Origin mismatch/);
    });

    it('rejects credential with wrong type', async () => {
      const options = generateRegistrationOptions('user-123', 'testuser');
      
      const clientData = {
        type: 'webauthn.get', // Wrong type (should be 'webauthn.create')
        challenge: Buffer.from(options._challenge).toString('base64url'),
        origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
      };
      
      const credential = {
        id: 'test-cred-id',
        rawId: 'test-raw-id',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify(clientData)).toString('base64url'),
          attestationObject: createMockAttestationObject(),
        },
      };
      
      await expect(
        verifyRegistrationResponse(credential, options._challenge)
      ).rejects.toThrow('Invalid type');
    });
  });

  describe('Authentication', () => {
    it('generates valid authentication options', () => {
      const options = generateAuthenticationOptions();
      
      expect(options).toBeTruthy();
      expect(options.challenge).toBeTruthy();
      expect(typeof options.challenge).toBe('string');
      expect(options.timeout).toBe(60000);
      expect(options.rpId).toBeTruthy();
      expect(options.userVerification).toBe('preferred');
      expect(Array.isArray(options.allowCredentials)).toBe(true);
    });

    it('generates unique challenges for each authentication', () => {
      const options1 = generateAuthenticationOptions();
      const options2 = generateAuthenticationOptions();
      
      expect(options1.challenge).not.toBe(options2.challenge);
    });

    it('includes internal challenge buffer', () => {
      const options = generateAuthenticationOptions();
      
      expect(options._challenge).toBeTruthy();
      expect(Buffer.isBuffer(options._challenge)).toBe(true);
      expect(options._challenge.length).toBe(32);
    });
  });

  describe('Authentication Verification', () => {
    it('rejects authentication with mismatched challenge', async () => {
      const options = generateAuthenticationOptions();
      const wrongChallenge = crypto.randomBytes(32);
      
      const clientData = {
        type: 'webauthn.get',
        challenge: Buffer.from(wrongChallenge).toString('base64url'),
        origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
      };
      
      const credential = {
        id: 'test-cred-id',
        rawId: 'test-raw-id',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify(clientData)).toString('base64url'),
          authenticatorData: createMockAuthenticatorData(),
          signature: Buffer.from('mock-signature').toString('base64url'),
        },
      };
      
      await expect(
        verifyAuthenticationResponse(credential, options._challenge)
      ).rejects.toThrow('Challenge mismatch');
    });

    it('rejects authentication with wrong origin', async () => {
      const options = generateAuthenticationOptions();
      
      const clientData = {
        type: 'webauthn.get',
        challenge: Buffer.from(options._challenge).toString('base64url'),
        origin: 'https://evil.com',
      };
      
      const credential = {
        id: 'test-cred-id',
        rawId: 'test-raw-id',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify(clientData)).toString('base64url'),
          authenticatorData: createMockAuthenticatorData(),
          signature: Buffer.from('mock-signature').toString('base64url'),
        },
      };
      
      await expect(
        verifyAuthenticationResponse(credential, options._challenge)
      ).rejects.toThrow(/Origin mismatch/);
    });

    it('rejects authentication with wrong type', async () => {
      const options = generateAuthenticationOptions();
      
      const clientData = {
        type: 'webauthn.create', // Wrong type (should be 'webauthn.get')
        challenge: Buffer.from(options._challenge).toString('base64url'),
        origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
      };
      
      const credential = {
        id: 'test-cred-id',
        rawId: 'test-raw-id',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify(clientData)).toString('base64url'),
          authenticatorData: createMockAuthenticatorData(),
          signature: Buffer.from('mock-signature').toString('base64url'),
        },
      };
      
      await expect(
        verifyAuthenticationResponse(credential, options._challenge)
      ).rejects.toThrow('Invalid type');
    });

    it('rejects authentication with unknown credential', async () => {
      const options = generateAuthenticationOptions();
      
      const clientData = {
        type: 'webauthn.get',
        challenge: Buffer.from(options._challenge).toString('base64url'),
        origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
      };
      
      const credential = {
        id: 'unknown-cred-id',
        rawId: 'unknown-raw-id',
        response: {
          clientDataJSON: Buffer.from(JSON.stringify(clientData)).toString('base64url'),
          authenticatorData: createMockAuthenticatorData(),
          signature: Buffer.from('mock-signature').toString('base64url'),
        },
      };
      
      await expect(
        verifyAuthenticationResponse(credential, options._challenge)
      ).rejects.toThrow('Unknown credential');
    });
  });

  describe('Security Properties', () => {
    it('uses cryptographically secure random challenges', () => {
      const options1 = generateRegistrationOptions('user-1', 'user1');
      const options2 = generateRegistrationOptions('user-2', 'user2');
      
      // Challenges should be different (extremely unlikely to collide)
      expect(options1._challenge.equals(options2._challenge)).toBe(false);
      
      // Challenges should be 32 bytes (256 bits)
      expect(options1._challenge.length).toBe(32);
      expect(options2._challenge.length).toBe(32);
    });

    it('uses base64url encoding for challenges', () => {
      const options = generateRegistrationOptions('user-123', 'testuser');
      
      // base64url should not contain +, /, or = characters
      expect(options.challenge).not.toMatch(/[+/=]/);
    });

    it('enforces origin validation', async () => {
      const options = generateRegistrationOptions('user-123', 'testuser');
      
      // Try multiple invalid origins
      const invalidOrigins = [
        'https://evil.com',
        'http://phishing.com',
        'https://localhost:3000', // Wrong protocol
        'http://localhost:3001',  // Wrong port
      ];
      
      for (const origin of invalidOrigins) {
        const clientData = {
          type: 'webauthn.create',
          challenge: Buffer.from(options._challenge).toString('base64url'),
          origin,
        };
        
        const credential = {
          id: 'test-cred-id',
          rawId: 'test-raw-id',
          response: {
            clientDataJSON: Buffer.from(JSON.stringify(clientData)).toString('base64url'),
            attestationObject: createMockAttestationObject(),
          },
        };
        
        await expect(
          verifyRegistrationResponse(credential, options._challenge)
        ).rejects.toThrow(/Origin mismatch/);
      }
    });
  });
});

// Helper functions to create mock WebAuthn data structures
function createMockAttestationObject(): string {
  // Create a minimal valid attestation object structure
  // In real WebAuthn, this would be CBOR-encoded
  const authData = Buffer.alloc(100);
  authData.writeUInt16BE(32, 53); // credIdLen at offset 53
  return authData.toString('base64url');
}

function createMockAuthenticatorData(): string {
  // Create a minimal valid authenticator data structure
  const authData = Buffer.alloc(37);
  return authData.toString('base64url');
}

// Made with Bob
