import { SovereigntyLayer } from '../src/lib/sovereignty/index.js';
import { createFedV1SignedExchange, verifyFedV1Exchange } from '../src/lib/sovereignty/index.js';

const kp = SovereigntyLayer.generateKeys();
console.log('Public key matches:', kp.public_key.length, 'chars');
console.log('Private key matches:', kp.private_key.length, 'chars');

const valid = createFedV1SignedExchange('evil', 'good', 'tamper-seed', ['anc-0'], kp.private_key);
console.log('Valid sig len:', valid.signature.length);
console.log('Valid sig last char:', JSON.stringify(valid.signature.slice(-1)));
console.log('Public key in ex:', valid.publicKey.length, 'chars');

const tampered = {
  ...valid,
  signature: valid.signature.slice(0, -1) + (valid.signature.slice(-1) === 'A' ? 'B' : 'A'),
};
console.log('Tampered sig last char:', JSON.stringify(tampered.signature.slice(-1)));
console.log('Sigs differ:', valid.signature !== tampered.signature);

const v1 = verifyFedV1Exchange(valid, valid.publicKey);
console.log('Valid verify:', v1);
const v2 = verifyFedV1Exchange(tampered, tampered.publicKey);
console.log('Tampered verify:', v2);

// Compare with kp.public_key
const v3 = verifyFedV1Exchange(tampered, kp.public_key);
console.log('Tampered verify w/ kp.pub:', v3);
