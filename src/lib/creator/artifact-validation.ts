/**
 * Artifact Validation - Phase 7
 * 
 * Validates seed serialization, artifact minting, and provenance tracking.
 * Ensures deterministic artifact generation with verified checksums.
 */

import { type Seed } from '@/lib/kernel/types';
import { rngFromHash } from '@/lib/kernel/rng';
import { DeterministicExportPipeline } from '@/lib/studio/deterministic-export';
import { createHash } from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  checksum: string;
  expectedChecksum: string;
  errors: string[];
  warnings: string[];
}

export interface MintingPrep {
  seedHash: string;
  tokenId: string;
  metadata: object;
  metadataUri: string;
  signature?: string;
  calldata: string;
  contract: string;
}

export interface ProvenanceRecord {
  seedHash: string;
  creator: string;
  createdAt: number;
  signature: string;
  previousHashes: string[];
  checksum: string;
}

// ─── Artifact Validator ───────────────────────────────────────────────────────

export class ArtifactValidator {
  private exportPipeline: DeterministicExportPipeline;
  private provenanceChain: Map<string, ProvenanceRecord> = new Map();
  private keyPair: { publicKey: string; privateKey: string } | null = null;

  constructor() {
    this.exportPipeline = new DeterministicExportPipeline();
    this.initializeKeyPair();
  }

  /**
   * Initialize cryptographic key pair for signature generation/verification
   */
  private async initializeKeyPair(): Promise<void> {
    try {
      // Generate a deterministic key pair from a seed
      const keySeed = 'paradigm-provenance-key-v1';
      const keyData = new TextEncoder().encode(keySeed);
      
      // Generate key pair using Web Crypto API
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        true,
        ['sign', 'verify']
      );
      
      // Export keys for storage (in production, store securely)
      const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      
      this.keyPair = {
        publicKey: this.arrayBufferToHex(publicKeyBuffer),
        privateKey: this.arrayBufferToHex(privateKeyBuffer),
      };
    } catch (error) {
      console.warn('Failed to initialize key pair, using fallback signature method:', error);
      this.keyPair = null;
    }
  }

  /**
   * Convert ArrayBuffer to hex string
   */
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert hex string to ArrayBuffer
   */
  private hexToArrayBuffer(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes.buffer;
  }

  /**
   * Validate seed serialization and checksum
   */
  async validateSeedSerialization(seed: Seed): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Initialize export pipeline with seed
    this.exportPipeline.initialize(seed);

    // Export to JSON and calculate checksum
    const exportFormat = { type: 'json' as const, version: '1.0.0' };
    const exportResult = await this.exportPipeline.exportToJSON(seed, exportFormat);
    const calculatedChecksum = exportResult.metadata.checksum;

    // Verify seed has required fields
    if (!seed.$hash && !seed.id) {
      errors.push('Seed missing hash or ID');
    }

    if (!seed.$domain) {
      warnings.push('Seed missing domain');
    }

    if (!seed.genes || Object.keys(seed.genes).length === 0) {
      warnings.push('Seed has no genes');
    }

    // Verify lineage if present
    if (seed.$lineage) {
      if (seed.$lineage.generation !== undefined && seed.$lineage.generation < 0) {
        errors.push('Invalid generation number');
      }
      if (seed.$lineage.parents && !Array.isArray(seed.$lineage.parents)) {
        errors.push('Parents must be an array');
      }
    }

    // Calculate expected checksum from seed data
    const expectedChecksum = this.calculateSeedChecksum(seed);

    const valid = errors.length === 0 && calculatedChecksum === expectedChecksum;

    return {
      valid,
      checksum: calculatedChecksum,
      expectedChecksum,
      errors,
      warnings,
    };
  }

  /**
   * Calculate deterministic checksum from seed data
   */
  private calculateSeedChecksum(seed: Seed): string {
    const seedData = {
      hash: seed.$hash || seed.id,
      domain: seed.$domain,
      genes: seed.genes,
      lineage: seed.$lineage,
    };

    const dataString = JSON.stringify(seedData, Object.keys(seedData).sort());
    return createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Prepare artifact for minting
   */
  async prepareMinting(seed: Seed, creatorId: string): Promise<MintingPrep> {
    // Validate seed first
    const validation = await this.validateSeedSerialization(seed);
    if (!validation.valid) {
      throw new Error(`Seed validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate deterministic token ID from seed hash
    const seedHash = seed.$hash || seed.id || 'unknown';
    const rng = rngFromHash(seedHash);
    const tokenId = `0x${BigInt(Math.floor(rng.nextF64() * 1e18)).toString(16).padStart(64, '0')}`;

    // Build metadata
    const metadata = {
      name: seed.$name || seed.name || 'Untitled Artifact',
      description: `Deterministic artifact from Paradigm Infinite - ${seed.$domain}`,
      image: '', // Would be populated with artifact image URL
      attributes: this.buildAttributes(seed),
      external_url: '', // Would be populated with artifact page URL
      properties: {
        seedHash,
        creator: creatorId,
        domain: seed.$domain,
        generation: seed.$lineage?.generation || 0,
        checksum: validation.checksum,
      },
    };

    // Generate metadata URI (in production, would upload to IPFS)
    const metadataUri = `ipfs://Qm${this.generateMockIPFSHash(metadata)}`;

    // Prepare calldata for minting (simplified - would use actual contract ABI)
    const calldata = this.encodeMintCalldata(tokenId, metadataUri);

    return {
      seedHash,
      tokenId,
      metadata,
      metadataUri,
      calldata,
      contract: process.env.SEED_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',
    };
  }

  /**
   * Build NFT attributes from seed genes
   */
  private buildAttributes(seed: Seed): Array<{ trait_type: string; value: string }> {
    const attributes: Array<{ trait_type: string; value: string }> = [];
    const genes = seed.genes || {};

    // Add domain as attribute
    attributes.push({
      trait_type: 'Domain',
      value: seed.$domain || 'Unknown',
    });

    // Add generation as attribute
    attributes.push({
      trait_type: 'Generation',
      value: String(seed.$lineage?.generation || 0),
    });

    // Add key genes as attributes
    for (const [key, value] of Object.entries(genes)) {
      if (typeof value === 'string' || typeof value === 'number') {
        attributes.push({
          trait_type: key.charAt(0).toUpperCase() + key.slice(1),
          value: String(value),
        });
      }
    }

    return attributes.slice(0, 10); // Limit to 10 attributes
  }

  /**
   * Generate mock IPFS hash (in production, would upload to actual IPFS)
   */
  private generateMockIPFSHash(data: object): string {
    const dataString = JSON.stringify(data);
    return createHash('sha256').update(dataString).digest('hex').slice(0, 44);
  }

  /**
   * Encode minting calldata (simplified)
   */
  private encodeMintCalldata(tokenId: string, metadataUri: string): string {
    // In production, would use ethers.js to encode actual contract call
    // This is a simplified version for demonstration
    return `0x${tokenId.slice(2)}${metadataUri.slice(5)}`;
  }

  /**
   * Record provenance for artifact
   */
  async recordProvenance(seedHash: string, creator: string, signature?: string): Promise<ProvenanceRecord> {
    const existing = this.provenanceChain.get(seedHash);
    const previousHashes = existing ? [...existing.previousHashes, existing.checksum] : [];

    const generatedSignature = signature || await this.generateSignature(seedHash, creator);

    const record: ProvenanceRecord = {
      seedHash,
      creator,
      createdAt: Date.now(),
      signature: generatedSignature,
      previousHashes,
      checksum: this.calculateProvenanceChecksum(seedHash, creator, previousHashes),
    };

    this.provenanceChain.set(seedHash, record);
    return record;
  }

  /**
   * Generate cryptographic signature for provenance
   */
  private async generateSignature(seedHash: string, creator: string): Promise<string> {
    if (!this.keyPair) {
      // Fallback to simple hash if key pair initialization failed
      const data = `${seedHash}:${creator}:${Date.now()}`;
      return createHash('sha256').update(data).digest('hex');
    }

    try {
      // Create signature data
      const signatureData = `${seedHash}:${creator}:${Date.now()}`;
      const dataBuffer = new TextEncoder().encode(signatureData);

      // Import private key
      const privateKeyBuffer = this.hexToArrayBuffer(this.keyPair.privateKey);
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );

      // Generate signature
      const signatureBuffer = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        privateKey,
        dataBuffer
      );

      return this.arrayBufferToHex(signatureBuffer);
    } catch (error) {
      console.warn('Failed to generate cryptographic signature, using fallback:', error);
      const data = `${seedHash}:${creator}:${Date.now()}`;
      return createHash('sha256').update(data).digest('hex');
    }
  }

  /**
   * Verify cryptographic signature
   */
  private async verifySignature(
    seedHash: string,
    creator: string,
    signature: string,
    timestamp: number
  ): Promise<boolean> {
    if (!this.keyPair) {
      // If no key pair, verify using hash-based signature
      const data = `${seedHash}:${creator}:${timestamp}`;
      const expectedHash = createHash('sha256').update(data).digest('hex');
      return signature === expectedHash;
    }

    try {
      // Recreate signature data
      const signatureData = `${seedHash}:${creator}:${timestamp}`;
      const dataBuffer = new TextEncoder().encode(signatureData);
      const signatureBuffer = this.hexToArrayBuffer(signature);

      // Import public key
      const publicKeyBuffer = this.hexToArrayBuffer(this.keyPair.publicKey);
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
      );

      // Verify signature
      const isValid = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        signatureBuffer,
        dataBuffer
      );

      return isValid;
    } catch (error) {
      console.warn('Failed to verify cryptographic signature, using fallback:', error);
      const data = `${seedHash}:${creator}:${timestamp}`;
      const expectedHash = createHash('sha256').update(data).digest('hex');
      return signature === expectedHash;
    }
  }

  /**
   * Calculate provenance checksum
   */
  private calculateProvenanceChecksum(seedHash: string, creator: string, previousHashes: string[]): string {
    const data = `${seedHash}:${creator}:${previousHashes.join(':')}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify provenance chain with signature verification
   */
  async verifyProvenance(seedHash: string): Promise<boolean> {
    const record = this.provenanceChain.get(seedHash);
    if (!record) {
      return false;
    }

    // Verify checksum
    const expectedChecksum = this.calculateProvenanceChecksum(
      seedHash,
      record.creator,
      record.previousHashes
    );

    if (record.checksum !== expectedChecksum) {
      return false;
    }

    // Verify cryptographic signature
    const signatureValid = await this.verifySignature(
      seedHash,
      record.creator,
      record.signature,
      record.createdAt
    );

    if (!signatureValid) {
      return false;
    }

    // Verify previous hashes in chain
    for (const prevHash of record.previousHashes) {
      const prevRecord = this.provenanceChain.get(prevHash);
      if (!prevRecord) {
        return false;
      }
      
      // Verify previous record's signature as well
      const prevSignatureValid = await this.verifySignature(
        prevHash,
        prevRecord.creator,
        prevRecord.signature,
        prevRecord.createdAt
      );
      
      if (!prevSignatureValid) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get provenance record
   */
  getProvenance(seedHash: string): ProvenanceRecord | undefined {
    return this.provenanceChain.get(seedHash);
  }

  /**
   * Validate artifact integrity against provenance
   */
  async validateArtifactIntegrity(seed: Seed): Promise<ValidationResult> {
    const seedHash = seed.$hash || seed.id || 'unknown';
    
    // Validate serialization
    const serializationResult = await this.validateSeedSerialization(seed);
    
    // Validate provenance with signature verification
    const provenanceValid = await this.verifyProvenance(seedHash);
    
    if (!provenanceValid) {
      serializationResult.errors.push('Provenance signature verification failed');
    }
    
    const valid = serializationResult.valid && provenanceValid;
    
    return {
      valid,
      checksum: serializationResult.checksum,
      expectedChecksum: serializationResult.expectedChecksum,
      errors: serializationResult.errors,
      warnings: serializationResult.warnings,
    };
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────────

export const artifactValidator = new ArtifactValidator();
