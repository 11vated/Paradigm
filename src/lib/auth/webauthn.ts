import crypto from 'crypto';

const RP_NAME = 'Paradigm Absolute';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

interface CredentialRecord {
  id: string;
  publicKey: Buffer;
  counter: number;
  userId: string;
  transports?: string[];
}

const credentials = new Map<string, CredentialRecord>();

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function fromBase64url(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

export function generateRegistrationOptions(userId: string, username: string) {
  const challenge = crypto.randomBytes(32);
  const userIdBuf = Buffer.from(userId, 'utf-8');

  return {
    challenge: base64url(challenge),
    rp: { name: RP_NAME, id: RP_ID },
    user: { id: base64url(userIdBuf), name: username, displayName: username },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    attestation: 'none',
    timeout: 60000,
    _challenge: challenge,
  };
}

export async function verifyRegistrationResponse(
  credential: { id: string; rawId: string; response: { clientDataJSON: string; attestationObject: string } },
  expectedChallenge: Buffer,
) {
  const clientData = JSON.parse(
    Buffer.from(credential.response.clientDataJSON, 'base64url').toString('utf-8'),
  );

  if (clientData.challenge !== base64url(expectedChallenge)) {
    throw new Error('Challenge mismatch');
  }
  if (clientData.origin !== ORIGIN) {
    throw new Error(`Origin mismatch: ${clientData.origin} !== ${ORIGIN}`);
  }
  if (clientData.type !== 'webauthn.create') {
    throw new Error('Invalid type');
  }

  const authData = Buffer.from(credential.response.attestationObject, 'base64url');
  const credIdLen = authData.readUInt16BE(53);
  const credId = authData.subarray(55, 55 + credIdLen);
  const pubKeyBytes = authData.subarray(55 + credIdLen);

  const coseKey = parseCOSEKey(pubKeyBytes);
  const record: CredentialRecord = {
    id: credential.id,
    publicKey: pubKeyBytes,
    counter: 0,
    userId: '',
  };
  credentials.set(credential.id, record);

  return { credentialId: credential.id, publicKey: pubKeyBytes };
}

export function generateAuthenticationOptions() {
  const challenge = crypto.randomBytes(32);

  return {
    challenge: base64url(challenge),
    timeout: 60000,
    rpId: RP_ID,
    userVerification: 'preferred',
    allowCredentials: [],
    _challenge: challenge,
  };
}

export async function verifyAuthenticationResponse(
  credential: { id: string; rawId: string; response: { clientDataJSON: string; authenticatorData: string; signature: string } },
  expectedChallenge: Buffer,
) {
  const clientData = JSON.parse(
    Buffer.from(credential.response.clientDataJSON, 'base64url').toString('utf-8'),
  );

  if (clientData.challenge !== base64url(expectedChallenge)) {
    throw new Error('Challenge mismatch');
  }
  if (clientData.origin !== ORIGIN) {
    throw new Error(`Origin mismatch: ${clientData.origin} !== ${ORIGIN}`);
  }
  if (clientData.type !== 'webauthn.get') {
    throw new Error('Invalid type');
  }

  const record = credentials.get(credential.id);
  if (!record) throw new Error('Unknown credential');

  const authData = Buffer.from(credential.response.authenticatorData, 'base64url');
  const clientDataHash = crypto.createHash('sha256').update(
    Buffer.from(credential.response.clientDataJSON, 'base64url'),
  ).digest();

  const signatureBase = Buffer.concat([authData, clientDataHash]);
  const signature = Buffer.from(credential.response.signature, 'base64url');

  const valid = verifyCOSESignature(record.publicKey, signatureBase, signature);
  if (!valid) throw new Error('Signature verification failed');

  record.counter++;
  return { credentialId: credential.id, counter: record.counter };
}

function parseCOSEKey(keyBytes: Buffer): { crv: number; x: Buffer; y: Buffer } {
  return { crv: 1, x: Buffer.alloc(32), y: Buffer.alloc(32) };
}

function verifyCOSESignature(publicKey: Buffer, data: Buffer, signature: Buffer): boolean {
  try {
    const ecdsaSig = crypto.createVerify('SHA256');
    ecdsaSig.update(data);
    return ecdsaSig.verify(
      { key: publicKey, format: 'der', type: 'spki' },
      signature,
    );
  } catch {
    return false;
  }
}
