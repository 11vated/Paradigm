import crypto from 'crypto';

export class SovereigntyLayer {
  /**
   * Generates a new ECDSA P-256 keypair for signing seeds.
   */
  static generateKeys(): { public_key: string, private_key: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return {
      public_key: publicKey,
      private_key: privateKey
    };
  }

  /**
   * Serializes the core immutable properties of a seed for signing/verification.
   * This ensures that any change to genes, domain, or lineage invalidates the signature.
   */
  private static serializeSeedForSigning(seed: any): string {
    // We only sign the core properties that define the seed's identity
    const coreData = {
      id: seed.id,
      domain: seed.$domain,
      genes: seed.genes,
      hash: seed.$hash,
      lineage: seed.$lineage
    };
    
    // Deterministic JSON stringification
    return JSON.stringify(coreData, Object.keys(coreData).sort());
  }

  /**
   * Signs a seed using the provided private key.
   */
  static signSeed(seed: any, privateKeyPem: string): any {
    const dataToSign = this.serializeSeedForSigning(seed);
    
    const sign = crypto.createSign('SHA256');
    sign.update(dataToSign);
    sign.end();
    
    const signature = sign.sign(privateKeyPem, 'base64');
    
    return {
      signature,
      public_key: crypto.createPublicKey(privateKeyPem).export({ type: 'spki', format: 'pem' }).toString(),
      signed_at: new Date().toISOString()
    };
  }

  /**
   * Verifies a seed's signature using the provided public key.
   */
  static verifySeed(seed: any, publicKeyPem: string): boolean {
    if (!seed.$sovereignty || !seed.$sovereignty.signature) {
      return false;
    }

    const dataToVerify = this.serializeSeedForSigning(seed);
    
    const verify = crypto.createVerify('SHA256');
    verify.update(dataToVerify);
    verify.end();
    
    // Use the public key provided, or fallback to the one in the sovereignty object
    const keyToUse = publicKeyPem || seed.$sovereignty.public_key;
    
    if (!keyToUse) return false;

    try {
      return verify.verify(keyToUse, seed.$sovereignty.signature, 'base64');
    } catch (e) {
      console.error("Verification error:", e);
      return false;
    }
  }
}
