"""
ECDSA P-256 Cryptographic Sovereignty — signing & verification for seeds.
Seeds are content-addressed (SHA-256 of JCS-canonical payload).
Signing embeds the author's identity into the seed itself.
"""
import base64
import json
import hashlib
from datetime import datetime, timezone
from ecdsa import SigningKey, VerifyingKey, NIST256p, BadSignatureError


def generate_keypair():
    """Generate a new ECDSA P-256 keypair. Returns (private_key_hex, public_key_jwk)."""
    sk = SigningKey.generate(curve=NIST256p)
    vk = sk.get_verifying_key()
    x_bytes = vk.to_string()[:32]
    y_bytes = vk.to_string()[32:]
    jwk = {
        "kty": "EC",
        "crv": "P-256",
        "x": base64.urlsafe_b64encode(x_bytes).decode().rstrip('='),
        "y": base64.urlsafe_b64encode(y_bytes).decode().rstrip('='),
    }
    return sk.to_string().hex(), f"jwk:{json.dumps(jwk, separators=(',', ':'))}"


def sign_seed(seed_data, private_key_hex):
    """Sign a seed with the given private key. Returns updated sovereignty field."""
    sk = SigningKey.from_string(bytes.fromhex(private_key_hex), curve=NIST256p)
    vk = sk.get_verifying_key()
    x_bytes = vk.to_string()[:32]
    y_bytes = vk.to_string()[32:]
    jwk = {
        "kty": "EC",
        "crv": "P-256",
        "x": base64.urlsafe_b64encode(x_bytes).decode().rstrip('='),
        "y": base64.urlsafe_b64encode(y_bytes).decode().rstrip('='),
    }
    pubkey_str = f"jwk:{json.dumps(jwk, separators=(',', ':'))}"
    hash_str = seed_data.get('$hash', '')
    hash_bytes = hash_str.replace('sha256:', '').encode('utf-8')
    signature = sk.sign(hashlib.sha256(hash_bytes).digest())
    sig_b64 = base64.b64encode(signature).decode()
    return {
        "author_pubkey": pubkey_str,
        "signature": f"base64:{sig_b64}",
        "signed_at": datetime.now(timezone.utc).isoformat(),
    }


def verify_seed(seed_data):
    """Verify the embedded ECDSA signature of a seed. Returns True/False."""
    sov = seed_data.get('$sovereignty')
    if not sov or not sov.get('signature') or not sov.get('author_pubkey'):
        return False
    try:
        pubkey_str = sov['author_pubkey']
        jwk_json = pubkey_str.replace('jwk:', '')
        jwk = json.loads(jwk_json)
        x_bytes = base64.urlsafe_b64decode(jwk['x'] + '==')
        y_bytes = base64.urlsafe_b64decode(jwk['y'] + '==')
        vk = VerifyingKey.from_string(x_bytes + y_bytes, curve=NIST256p)
        sig_b64 = sov['signature'].replace('base64:', '')
        signature = base64.b64decode(sig_b64)
        hash_str = seed_data.get('$hash', '')
        hash_bytes = hash_str.replace('sha256:', '').encode('utf-8')
        vk.verify(signature, hashlib.sha256(hash_bytes).digest())
        return True
    except (BadSignatureError, Exception):
        return False
