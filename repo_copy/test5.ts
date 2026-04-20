import crypto from 'crypto';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

const data = Buffer.from('hello world');

try {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  const signature = sign.sign(privateKey, 'base64');
  console.log('Signed:', signature);
} catch (e: any) {
  console.error('Error signing:', e.message);
}
