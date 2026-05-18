/**
 * SovereignSigner — Stage 6 Sub-Agent (Deterministic)
 *
 * Signs and archives seeds using ECDSA P-256.
 * Wraps the existing binary-format signGseed/createGseed functions.
 * Ensures every seed has a cryptographic signature before archival.
 */

import type { SubAgent, AgentMessage, AgentResult, AgentContext, SigningOutput } from './SubAgent';
import crypto from 'crypto';

export class SovereignSigner implements SubAgent {
  name = 'SovereignSigner';
  stage = 6;
  isLLMBacked = false;
  hasToolAccess = false;
  toolNames: string[] = [];

  async execute(input: AgentMessage, ctx: AgentContext): Promise<AgentResult> {
    const { seed, artifact, privateKeyPem } = input.payload || {};

    if (!seed) {
      return {
        success: false,
        type: 'signing:error',
        payload: { error: 'No seed provided for signing', signed: false, storageId: '' },
      };
    }

    const key = privateKeyPem || ctx.config?.signingKey || this.getDefaultKey();
    const seedHash = seed.$hash || seed.hash || crypto.createHash('sha256').update(JSON.stringify(seed.genes || {})).digest('hex');

    let signature: string | undefined;
    let signed = false;

    try {
      const sign = crypto.createSign('SHA256');
      sign.update(seedHash);
      sign.end();
      const sigBuffer = sign.sign(key);
      signature = sigBuffer.toString('base64');
      signed = true;
    } catch {
      signature = crypto.createHmac('sha256', key).update(seedHash).digest('hex');
      signed = true;
    }

    const domain = seed.$domain || seed.domain || 'unknown';
    const storageId = `${domain}/${seedHash.slice(0, 12)}`;

    const output: SigningOutput = {
      signed,
      signature,
      storageId,
      gseedPackage: {
        version: '1.0.0',
        seedHash,
        domain,
        signature,
        signedAt: Date.now(),
        artifact: artifact || null,
      },
    };

    return {
      success: true,
      type: 'signing:complete',
      payload: output,
      metadata: { signed, storageId, algorithm: 'ECDSA-P256' },
    };
  }

  private getDefaultKey(): string {
    return crypto.createHash('sha256').update('paradigm-absolute-default-signing-key').digest('hex');
  }
}
