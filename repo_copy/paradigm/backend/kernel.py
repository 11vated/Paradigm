"""
Layer 1 — Kernel: Deterministic RNG (xoshiro256**), SHA-256 hashing, JCS canonicalization.
The substrate's deterministic foundation. No domain knowledge.
"""
import hashlib
import json
import math


class Xoshiro256StarStar:
    """xoshiro256** deterministic PRNG with SplitMix64 initialization."""

    def __init__(self, seed_bytes):
        if isinstance(seed_bytes, str):
            seed_bytes = seed_bytes.encode()
        self.s = self._init_state(seed_bytes)

    def _init_state(self, seed_bytes):
        h = int.from_bytes(hashlib.sha256(seed_bytes).digest()[:8], 'little')
        state = []
        for _ in range(4):
            h = (h + 0x9E3779B97F4A7C15) & 0xFFFFFFFFFFFFFFFF
            z = h
            z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & 0xFFFFFFFFFFFFFFFF
            z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & 0xFFFFFFFFFFFFFFFF
            z = z ^ (z >> 31)
            state.append(z)
        return state

    def _rotl(self, x, k):
        return ((x << k) | (x >> (64 - k))) & 0xFFFFFFFFFFFFFFFF

    def next_u64(self):
        result = self._rotl((self.s[1] * 5) & 0xFFFFFFFFFFFFFFFF, 7)
        result = (result * 9) & 0xFFFFFFFFFFFFFFFF
        t = (self.s[1] << 17) & 0xFFFFFFFFFFFFFFFF
        self.s[2] ^= self.s[0]
        self.s[3] ^= self.s[1]
        self.s[1] ^= self.s[2]
        self.s[0] ^= self.s[3]
        self.s[2] ^= t
        self.s[3] = self._rotl(self.s[3], 45)
        return result

    def next_f64(self):
        return (self.next_u64() >> 11) / (1 << 53)

    def next_gaussian(self):
        u1 = max(self.next_f64(), 1e-10)
        u2 = self.next_f64()
        return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)

    def next_int(self, low, high):
        if low >= high:
            return low
        return low + (self.next_u64() % (high - low + 1))

    def next_choice(self, items):
        if not items:
            return None
        idx = self.next_u64() % len(items)
        return items[idx]

    def next_bool(self, probability=0.5):
        return self.next_f64() < probability


def canonicalize(obj):
    """RFC 8785 JCS deterministic JSON serialization."""
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def content_hash(seed_data):
    """SHA-256 of canonicalized seed (excluding $hash and $sovereignty.signature)."""
    data = {}
    for k, v in seed_data.items():
        if k == '$hash':
            continue
        if k == '$sovereignty' and v:
            sov = dict(v)
            sov.pop('signature', None)
            data[k] = sov
        else:
            data[k] = v
    canonical = canonicalize(data)
    return 'sha256:' + hashlib.sha256(canonical.encode('utf-8')).hexdigest()


def rng_from_hash(hash_str):
    """Create deterministic RNG from a content hash string."""
    hex_str = hash_str.replace('sha256:', '')
    return Xoshiro256StarStar(bytes.fromhex(hex_str))


# 26 recognized domains
DOMAINS = [
    "character", "sprite", "music", "fullgame", "animation",
    "procedural", "geometry3d", "narrative", "ui", "physics",
    "visual2d", "audio", "ecosystem", "game", "alife",
    "shader", "particle", "typography", "architecture",
    "vehicle", "furniture", "fashion", "robotics",
    "circuit", "food", "choreography"
]

# 17 gene type names
GENE_TYPE_NAMES = [
    "scalar", "categorical", "vector", "expression", "struct",
    "array", "graph", "topology", "temporal", "regulatory",
    "field", "symbolic", "quantum", "gematria", "resonance",
    "dimensional", "sovereignty"
]
