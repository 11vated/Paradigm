import type { Seed } from '../kernel/types.js';

declare global {
  interface PublicKeyCredential {
    id: string;
    type: 'public-key';
    transports: AuthenticatorTransport[];
    extensionResults?: AuthenticationExtensionsClientOutputs;
  }
  
  interface AuthenticatorTransport {
    type: 'usb' | 'nfc' | 'ble' | 'hybrid';
  }
  
  interface AuthenticationExtensionsClientOutputs {
    credProps?: { rpid?: boolean; authenticatorAllowsCRP?: boolean };
    appid?: boolean;
  }
  
  interface CredentialMediationRequirement {
    optional: string;
    silent: string;
    required: string;
  }
}

export interface PasskeyCredential {
  id: string;
  publicKey: string;
  transports: string[];
  createdAt: number;
}

const CREDENTIAL_STORE_KEY = 'paradigm_passkeys';

export async function createPasskey(
  rp: { name: string; id: string },
  user: { name: string; id: string }
): Promise<PasskeyCredential | null> {
  if (!navigator.credentials || !PublicKeyCredential.isConditionalMediationAvailable?.()) {
    console.warn('[WebAuthn] Not supported in this browser');
    return null;
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        rp,
        user: {
          id: new TextEncoder().encode(user.id),
          name: user.name,
          displayName: user.name,
        },
        challenge,
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        timeout: 60000,
        excludeCredentials: [],
        authenticatorSelection: {
          userVerification: 'preferred',
        },
      },
      mediation: 'optional',
    } as CredentialCreationOptions);

    if (!credential) return null;

    const attestation = credential as PublicKeyCredential;
    const publicKeyArrayBuffer = attestation.response.getPublicKey();
    const publicKey = publicKeyArrayBuffer 
      ? btoa(String.fromCharCode(...new Uint8Array(publicKeyArrayBuffer)))
      : '';

    const passkey: PasskeyCredential = {
      id: attestation.id,
      publicKey,
      transports: attestation.transports || [],
      createdAt: Date.now(),
    };

    const stored = getStoredPasskeys();
    stored.push(passkey);
    localStorage.setItem(CREDENTIAL_STORE_KEY, JSON.stringify(stored));

    return passkey;
  } catch (e) {
    console.error('[WebAuthn] Create failed:', e);
    return null;
  }
}

export async function signWithPasskey(
  challenge: string
): Promise<{ signature: string; credentialId: string } | null> {
  if (!navigator.credentials) return null;

  const stored = getStoredPasskeys();
  if (stored.length === 0) {
    console.warn('[WebAuthn] No passkeys stored');
    return null;
  }

  const challengeBytes = new TextEncoder().encode(challenge);

  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: challengeBytes,
        rpId: window.location.hostname,
        userVerification: 'preferred',
        timeout: 60000,
        allowCredentials: stored.map(s => ({
          id: new TextEncoder().encode(s.id),
          type: 'public-key',
          transports: s.transports as AuthenticatorTransport[],
        })),
      },
      mediation: 'optional',
    } as CredentialRequestOptions);

    if (!credential) return null;

    const att = credential as PublicKeyCredential;
    const response = att.response as AuthenticatorAssertionResponse;
    const signatureArr = response.signature;
    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureArr)));

    return {
      signature,
      credentialId: att.id,
    };
  } catch (e) {
    console.error('[WebAuthn] Sign failed:', e);
    return null;
  }
}

export function getStoredPasskeys(): PasskeyCredential[] {
  try {
    const data = localStorage.getItem(CREDENTIAL_STORE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function deletePasskey(id: string): boolean {
  const stored = getStoredPasskeys().filter(p => p.id !== id);
  if (stored.length === 0) {
    localStorage.removeItem(CREDENTIAL_STORE_KEY);
  } else {
    localStorage.setItem(CREDENTIAL_STORE_KEY, JSON.stringify(stored));
  }
  return true;
}

export async function verifyPasskey(seed: Seed): Promise<boolean> {
  const stored = getStoredPasskeys();
  if (stored.length === 0) return false;

  const challenge = `verify:${seed.$hash}:${seed.$lineage?.generation || 0}`;
  const result = await signWithPasskey(challenge);
  
  return result !== null && stored.some(s => s.id === result.credentialId);
}