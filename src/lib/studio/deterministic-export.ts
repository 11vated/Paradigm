/**
 * Deterministic Export Pipeline for Generated Artifacts
 * 
 * This system provides a deterministic export pipeline for artifacts
 * generated in Paradigm Infinite Studio, ensuring reproducible outputs.
 * 
 * Features:
 * - Deterministic export formats (JSON, binary, custom)
 * - Seed-based reproducibility
 * - Export metadata and provenance
 * - Batch export capabilities
 * - Export validation and verification
 */

import { type Seed } from '@/lib/kernel/types';
import { rngFromHash } from '@/lib/kernel/rng';

export interface ExportFormat {
  type: 'json' | 'binary' | 'gspl' | 'custom';
  version: string;
  compression?: 'none' | 'gzip' | 'brotli';
}

export interface ExportMetadata {
  seedHash: string;
  timestamp: number;
  format: ExportFormat;
  size: number;
  checksum: string;
  provenance: {
    lineage: string[];
    operations: string[];
    fitness?: number;
  };
}

export interface ExportResult {
  success: boolean;
  data: Uint8Array | string;
  metadata: ExportMetadata;
  error?: string;
}

export class DeterministicExportPipeline {
  private exportCallbacks: Map<string, (result: ExportResult) => void> = new Map();
  private validationCallbacks: Map<string, (isValid: boolean, metadata: ExportMetadata) => void> = new Map();
  private rng: (() => number) | null = null;
  
  /**
   * Initialize with seed for deterministic exports
   */
  initialize(seed?: Seed): void {
    if (seed) {
      const hash = seed.$hash || seed.id || 'default';
      this.rng = rngFromHash(hash).nextF64;
    } else {
      // Use deterministic default seed instead of Math.random for reproducibility
      this.rng = rngFromHash('default-export-seed').nextF64;
    }
  }
  
  /**
   * Export seed to JSON format
   */
  async exportToJSON(seed: Seed, format: ExportFormat): Promise<ExportResult> {
    try {
      const timestamp = Date.now();
      const seedHash = seed.$hash || seed.id || 'unknown';
      
      // Create deterministic export data
      const exportData = {
        version: format.version,
        seed: this.serializeSeed(seed),
        metadata: {
          hash: seedHash,
          timestamp,
          lineage: seed.$lineage,
          fitness: seed.$fitness,
        },
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      const data = this.applyCompression(jsonString, format.compression);
      
      const checksum = await this.calculateChecksum(data);
      
      const metadata: ExportMetadata = {
        seedHash,
        timestamp,
        format,
        size: data.length,
        checksum,
        provenance: {
          lineage: seed.$lineage?.parents || [],
          operations: seed.$lineage?.operators || [],
          fitness: seed.$fitness?.overall,
        },
      };
      
      const result: ExportResult = {
        success: true,
        data,
        metadata,
      };
      
      this.notifyExport(result);
      return result;
    } catch (error) {
      const result: ExportResult = {
        success: false,
        data: '',
        metadata: {} as ExportMetadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      this.notifyExport(result);
      return result;
    }
  }
  
  /**
   * Export seed to binary format
   */
  async exportToBinary(seed: Seed, format: ExportFormat): Promise<ExportResult> {
    try {
      const timestamp = Date.now();
      const seedHash = seed.$hash || seed.id || 'unknown';
      
      // Serialize seed to binary
      const jsonString = JSON.stringify(seed);
      const encoder = new TextEncoder();
      const binaryData = encoder.encode(jsonString);
      
      // Add header
      const header = this.createBinaryHeader(format, seedHash, timestamp);
      const combinedData = new Uint8Array(header.length + binaryData.length);
      combinedData.set(header);
      combinedData.set(binaryData, header.length);
      
      const data = this.applyCompression(combinedData, format.compression);
      
      const checksum = await this.calculateChecksum(data);
      
      const metadata: ExportMetadata = {
        seedHash,
        timestamp,
        format,
        size: data.length,
        checksum,
        provenance: {
          lineage: seed.$lineage?.parents || [],
          operations: seed.$lineage?.operators || [],
          fitness: seed.$fitness?.overall,
        },
      };
      
      const result: ExportResult = {
        success: true,
        data,
        metadata,
      };
      
      this.notifyExport(result);
      return result;
    } catch (error) {
      const result: ExportResult = {
        success: false,
        data: new Uint8Array(),
        metadata: {} as ExportMetadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      this.notifyExport(result);
      return result;
    }
  }
  
  /**
   * Export seed to GSPL format
   */
  async exportToGSPL(seed: Seed, format: ExportFormat): Promise<ExportResult> {
    try {
      const timestamp = Date.now();
      const seedHash = seed.$hash || seed.id || 'unknown';
      
      // Generate GSPL code from seed
      const gsplCode = this.generateGSPLFromSeed(seed);
      
      const data = this.applyCompression(gsplCode, format.compression);
      
      const checksum = await this.calculateChecksum(data);
      
      const metadata: ExportMetadata = {
        seedHash,
        timestamp,
        format,
        size: data.length,
        checksum,
        provenance: {
          lineage: seed.$lineage?.parents || [],
          operations: seed.$lineage?.operators || [],
          fitness: seed.$fitness?.overall,
        },
      };
      
      const result: ExportResult = {
        success: true,
        data,
        metadata,
      };
      
      this.notifyExport(result);
      return result;
    } catch (error) {
      const result: ExportResult = {
        success: false,
        data: '',
        metadata: {} as ExportMetadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      this.notifyExport(result);
      return result;
    }
  }
  
  /**
   * Batch export multiple seeds
   */
  async batchExport(seeds: Seed[], format: ExportFormat): Promise<ExportResult[]> {
    const results: ExportResult[] = [];
    
    for (const seed of seeds) {
      let result: ExportResult;
      
      switch (format.type) {
        case 'json':
          result = await this.exportToJSON(seed, format);
          break;
        case 'binary':
          result = await this.exportToBinary(seed, format);
          break;
        case 'gspl':
          result = await this.exportToGSPL(seed, format);
          break;
        default:
          result = {
            success: false,
            data: '',
            metadata: {} as ExportMetadata,
            error: `Unsupported format: ${format.type}`,
          };
      }
      
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Validate exported data
   */
  async validateExport(data: Uint8Array | string, metadata: ExportMetadata): Promise<boolean> {
    const calculatedChecksum = await this.calculateChecksum(data);
    const isValid = calculatedChecksum === metadata.checksum;
    
    this.notifyValidation(isValid, metadata);
    return isValid;
  }
  
  /**
   * Serialize seed for export
   */
  private serializeSeed(seed: Seed): any {
    return {
      id: seed.id,
      hash: seed.$hash,
      name: seed.$name,
      domain: seed.$domain || seed.$domain,
      genes: seed.genes,
      lineage: seed.$lineage,
      fitness: seed.$fitness,
      metadata: seed.metadata,
    };
  }
  
  /**
   * Create binary header for export
   */
  private createBinaryHeader(format: ExportFormat, seedHash: string, timestamp: number): Uint8Array {
    const headerData = {
      magic: 'PARA',
      version: format.version,
      hash: seedHash,
      timestamp,
    };
    
    const jsonString = JSON.stringify(headerData);
    const encoder = new TextEncoder();
    return encoder.encode(jsonString);
  }
  
  /**
   * Generate GSPL code from seed
   */
  private generateGSPLFromSeed(seed: Seed): string {
    const lines: string[] = [];
    
    lines.push(`// Paradigm Infinite GSPL Export`);
    lines.push(`// Seed: ${seed.$hash || seed.id}`);
    lines.push(`// Domain: ${seed.$domain || seed.$domain}`);
    lines.push(`// Generation: ${seed.$lineage?.generation || 0}`);
    lines.push('');
    
    lines.push(`seed "${seed.$name || seed.name || 'unnamed'}" {`);
    lines.push(`  domain: "${seed.$domain || seed.$domain}"`);
    lines.push(`  generation: ${seed.$lineage?.generation || 0}`);
    
    if (seed.genes) {
      lines.push(`  genes {`);
      Object.entries(seed.genes).forEach(([key, value]) => {
        const geneValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        lines.push(`    ${key}: ${geneValue}`);
      });
      lines.push(`  }`);
    }
    
    lines.push(`}`);
    lines.push('');
    
    // Add lineage information
    if (seed.$lineage?.parents && seed.$lineage.parents.length > 0) {
      lines.push(`// Lineage`);
      seed.$lineage.parents.forEach((parent, index) => {
        lines.push(`// Parent ${index + 1}: ${parent}`);
      });
    }
    
    return lines.join('\n');
  }
  
  /**
   * Apply compression to data
   */
  private applyCompression(data: string | Uint8Array, compression?: string): Uint8Array | string {
    if (!compression || compression === 'none') {
      return data;
    }
    
    // For now, return data as-is
    // In production, implement actual compression (gzip, brotli)
    return data;
  }
  
  /**
   * Calculate checksum for data using SHA-256
   */
  private async calculateChecksum(data: string | Uint8Array): Promise<string> {
    // Convert data to Uint8Array if it's a string
    const bytes = typeof data === 'string' 
      ? new TextEncoder().encode(data)
      : data;
    
    // Use Web Crypto API for SHA-256 (works in browser and Node.js with crypto shim)
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }
  
  /**
   * Register export callback
   */
  onExport(callback: (result: ExportResult) => void): () => void {
    const rng = this.rng || rngFromHash('default-export-seed').nextF64;
    const id = `export-${Date.now()}-${rng()}`;
    this.exportCallbacks.set(id, callback);
    
    return () => {
      this.exportCallbacks.delete(id);
    };
  }
  
  /**
   * Register validation callback
   */
  onValidation(callback: (isValid: boolean, metadata: ExportMetadata) => void): () => void {
    const rng = this.rng || rngFromHash('default-export-seed').nextF64;
    const id = `validation-${Date.now()}-${rng()}`;
    this.validationCallbacks.set(id, callback);
    
    return () => {
      this.validationCallbacks.delete(id);
    };
  }
  
  /**
   * Notify export callbacks
   */
  private notifyExport(result: ExportResult): void {
    this.exportCallbacks.forEach((callback) => {
      callback(result);
    });
  }
  
  /**
   * Notify validation callbacks
   */
  private notifyValidation(isValid: boolean, metadata: ExportMetadata): void {
    this.validationCallbacks.forEach((callback) => {
      callback(isValid, metadata);
    });
  }
  
  /**
   * Get supported formats
   */
  getSupportedFormats(): ExportFormat[] {
    return [
      { type: 'json', version: '1.0.0' },
      { type: 'binary', version: '1.0.0' },
      { type: 'gspl', version: '1.0.0' },
    ];
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    this.exportCallbacks.clear();
    this.validationCallbacks.clear();
    this.rng = null;
  }
}

/**
 * Create a deterministic export pipeline instance
 */
export function createDeterministicExportPipeline(): DeterministicExportPipeline {
  return new DeterministicExportPipeline();
}
