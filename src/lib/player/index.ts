/**
 * Paradigm Player — Universal .gseed Runtime
 *
 * Loads a .gseed binary package, verifies the sovereignty signature,
 * re-grows the artifact deterministically, and returns a playable/renderable result.
 *
 * Can run in three contexts:
 *   1. Browser  — WebCrypto for sig verify, canvas/WebAudio for rendering
 *   2. Server   — Node crypto + fs for sig verify, disk output
 *   3. CLI      — same as server, human-readable stdout
 *
 * .gseed sections (from binary-format.ts):
 *   METADATA  → domain, hash, genes JSON
 *   PARAMS    → grow params JSON
 *   OUTPUTS   → output artifacts (PNG, WAV, OBJ, GLTF, MIDI bytes)
 *   C2PA_MANIFEST → provenance claim
 *   ROYALTY   → royalty config
 *   SIGNATURE → ECDSA P-256 over header+sections
 */

import crypto from 'crypto';
import { Xoshiro256StarStar, rngFromHash } from '../kernel/rng';
import { growSeed } from '../kernel/engines';
import type { SeedPackage } from '../kernel/binary-format';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PlayerResult {
  domain:    string;
  seedHash:  string;
  artifact:  PlayerArtifact;
  verified:  boolean;
  royalty:   RoyaltySplit | null;
  provenance: ProvenanceClaim | null;
}

export interface PlayerArtifact {
  /** MIME type of the primary output */
  mimeType: string;
  /** Primary output — base64 encoded */
  data:      string;
  /** Additional outputs keyed by output type */
  extras:    Record<string, string>;
  /** Domain-specific metadata */
  meta:      Record<string, unknown>;
}

export interface RoyaltySplit {
  creator:    string; // pubkey hex
  bps:        number; // basis points 0-10000
  recipients: Array<{ address: string; bps: number }>;
}

export interface ProvenanceClaim {
  author:    string;
  timestamp: string;
  tool:      string;
  parents:   string[];
}

// ─── Player ────────────────────────────────────────────────────────────────────

export class ParadigmPlayer {
  /**
   * Load and play a .gseed buffer.
   * Returns the re-grown artifact + sovereignty verification.
   */
  async play(gseedBuffer: Uint8Array | Buffer): Promise<PlayerResult> {
    const pkg = this.parseGseed(gseedBuffer);
    const verified = await this.verifySignature(pkg, gseedBuffer);
    const seed = this.reconstructSeed(pkg);
    const artifact = await this.render(seed, pkg);
    return {
      domain:    pkg.metadata.domain,
      seedHash:  pkg.metadata.hash,
      artifact,
      verified,
      royalty:   pkg.royalty    ? this.parseRoyalty(pkg.royalty)    : null,
      provenance: pkg.c2paManifest ? this.parseProv(pkg.c2paManifest) : null,
    };
  }

  /**
   * Play from a URL (browser or server with fetch).
   */
  async playFromUrl(url: string): Promise<PlayerResult> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch .gseed: ${resp.status} ${resp.statusText}`);
    const buf = await resp.arrayBuffer();
    return this.play(new Uint8Array(buf));
  }

  /**
   * Play from the seed's JSON representation (no binary required).
   * Used when the binary package is unavailable but the seed is known.
   */
  async playFromSeed(seed: Record<string, unknown>): Promise<PlayerArtifact> {
    return this.render(seed, null);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private parseGseed(buffer: Uint8Array | Buffer): SeedPackage {
    // Validate magic "GSEE"
    const magic = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
    if (magic !== 'GSEE') throw new Error(`Invalid .gseed magic: expected 'GSEE', got '${magic}'`);
    // Dynamic import to avoid circular on browser
    const { decodeSeedPackage } = require('../kernel/binary-format');
    return decodeSeedPackage(Buffer.from(buffer));
  }

  private async verifySignature(pkg: SeedPackage, raw: Uint8Array | Buffer): Promise<boolean> {
    if (!pkg.signature) return false;
    try {
      if (typeof window !== 'undefined' && window.crypto?.subtle) {
        return this.verifyBrowser(pkg, raw);
      }
      return this.verifyNode(pkg, raw);
    } catch { return false; }
  }

  private async verifyBrowser(pkg: SeedPackage, raw: Uint8Array | Buffer): Promise<boolean> {
    const { signature, publicKey } = pkg.signature!;
    if (!publicKey) return false;
    const keyBuffer = Buffer.from(publicKey, 'hex');
    const key = await crypto.subtle.importKey(
      'raw', keyBuffer, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
    );
    // Signed payload is everything before the SIGNATURE section
    const sigStart = raw.length - signature.length / 2 - 8; // approximate
    const payload = raw.slice(0, sigStart);
    const sigBytes = Buffer.from(signature, 'hex');
    return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sigBytes, payload);
  }

  private verifyNode(pkg: SeedPackage, raw: Uint8Array | Buffer): boolean {
    const { signature, publicKey } = pkg.signature!;
    if (!publicKey) return false;
    const verify = crypto.createVerify('SHA256');
    // Signed payload is the header + all sections except the last SIGNATURE section
    const sigLen = Buffer.from(signature, 'hex').length;
    const payload = Buffer.from(raw).slice(0, raw.length - sigLen - 8);
    verify.update(payload);
    const pubKey = crypto.createPublicKey({ key: Buffer.from(publicKey, 'hex'), format: 'der', type: 'spki' });
    return verify.verify(pubKey, Buffer.from(signature, 'hex'));
  }

  private reconstructSeed(pkg: SeedPackage): Record<string, unknown> {
    return {
      $domain: pkg.metadata.domain,
      $hash:   pkg.metadata.hash,
      genes:   pkg.metadata.genes ?? {},
      ...pkg.params ?? {},
    };
  }

  private async render(seed: Record<string, unknown>, pkg: SeedPackage | null): Promise<PlayerArtifact> {
    // If pkg has embedded outputs, use them (fastest — no re-grow)
    if (pkg?.outputs?.length) {
      const primary = pkg.outputs[0];
      const extras: Record<string, string> = {};
      for (const out of pkg.outputs.slice(1)) {
        extras[out.outputType] = out.data.toString('base64');
      }
      return {
        mimeType: this.outputTypeToMime(primary.outputType),
        data: primary.data.toString('base64'),
        extras,
        meta: { domain: pkg.metadata.domain, hash: pkg.metadata.hash, source: 'embedded' },
      };
    }
    // Otherwise re-grow deterministically
    const grown = await growSeed(seed as any);
    return {
      mimeType: this.domainToMime(seed.$domain as string),
      data:     Buffer.from(JSON.stringify(grown)).toString('base64'),
      extras:   {},
      meta:     { domain: seed.$domain, hash: seed.$hash, source: 'regrown' },
    };
  }

  private outputTypeToMime(type: string): string {
    const map: Record<string, string> = {
      PNG: 'image/png', WAV: 'audio/wav', OBJ: 'model/obj',
      GLTF: 'model/gltf+json', MIDI: 'audio/midi',
    };
    return map[type] ?? 'application/octet-stream';
  }

  private domainToMime(domain: string): string {
    const map: Record<string, string> = {
      visual2d: 'image/svg+xml', sprite: 'image/png', music: 'audio/wav',
      character: 'model/gltf+json', game: 'text/html', website: 'text/html',
      app: 'application/zip', molecule: 'chemical/x-pdb',
      field: 'image/svg+xml', quantum: 'image/svg+xml',
      cosmology: 'image/svg+xml', world: 'image/svg+xml',
      narrative: 'text/plain', shader: 'text/plain', default: 'application/json',
    };
    return map[domain] ?? map.default;
  }

  private parseRoyalty(raw: any): RoyaltySplit {
    return { creator: raw.creator ?? '', bps: raw.bps ?? 0, recipients: raw.recipients ?? [] };
  }

  private parseProv(raw: any): ProvenanceClaim {
    return { author: raw.author ?? '', timestamp: raw.timestamp ?? '', tool: raw.tool ?? 'Paradigm', parents: raw.parents ?? [] };
  }
}

export const defaultPlayer = new ParadigmPlayer();
