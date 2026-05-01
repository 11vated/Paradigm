"""
Layer 2 — Gene System: All 17 gene types with validate/mutate/crossover/distance operators.
Each type is a pure function module — no side effects, deterministic given RNG state.
"""
import math
import copy


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


# ─── 1. SCALAR ────────────────────────────────────────────────────────────────
def scalar_validate(value, schema=None):
    if not isinstance(value, (int, float)):
        return False
    if math.isnan(value) or math.isinf(value):
        return False
    if schema:
        lo, hi = schema.get('min', float('-inf')), schema.get('max', float('inf'))
        if value < lo or value > hi:
            return False
    return True

def scalar_mutate(value, rate, rng, schema=None):
    lo = schema.get('min', 0.0) if schema else 0.0
    hi = schema.get('max', 1.0) if schema else 1.0
    sigma = rate * (hi - lo)
    return clamp(value + sigma * rng.next_gaussian(), lo, hi)

def scalar_crossover(a, b, rng):
    alpha = rng.next_f64()
    return a + alpha * (b - a)

def scalar_distance(a, b, schema=None):
    lo = schema.get('min', 0.0) if schema else 0.0
    hi = schema.get('max', 1.0) if schema else 1.0
    r = hi - lo if hi - lo > 0 else 1.0
    return abs(a - b) / r


# ─── 2. CATEGORICAL ───────────────────────────────────────────────────────────
def categorical_validate(value, schema=None):
    if not isinstance(value, str):
        return False
    if schema and 'choices' in schema:
        return value in schema['choices']
    return True

def categorical_mutate(value, rate, rng, schema=None):
    choices = schema.get('choices', [value]) if schema else [value]
    if rng.next_f64() < rate and len(choices) > 1:
        others = [c for c in choices if c != value]
        return rng.next_choice(others) if others else value
    return value

def categorical_crossover(a, b, rng):
    return a if rng.next_bool() else b

def categorical_distance(a, b, schema=None):
    return 0.0 if a == b else 1.0


# ─── 3. VECTOR ────────────────────────────────────────────────────────────────
def vector_validate(value, schema=None):
    if not isinstance(value, list):
        return False
    if schema and 'dimensions' in schema and len(value) != schema['dimensions']:
        return False
    return all(isinstance(v, (int, float)) and not math.isnan(v) for v in value)

def vector_mutate(value, rate, rng, schema=None):
    return [clamp(v + rate * rng.next_gaussian(), 0.0, 1.0) for v in value]

def vector_crossover(a, b, rng):
    return [ai + rng.next_f64() * (bi - ai) for ai, bi in zip(a, b)]

def vector_distance(a, b, schema=None):
    return math.sqrt(sum((ai - bi) ** 2 for ai, bi in zip(a, b)))


# ─── 4. EXPRESSION ────────────────────────────────────────────────────────────
def expression_validate(value, schema=None):
    return isinstance(value, str) and len(value) > 0

def expression_mutate(value, rate, rng, schema=None):
    ops = ['+', '-', '*', '/']
    fns = ['sin', 'cos', 'abs', 'sqrt']
    if rng.next_f64() < rate:
        if rng.next_bool():
            return f"{rng.next_choice(fns)}({value})"
        else:
            c = round(rng.next_f64() * 2, 2)
            return f"({value}) {rng.next_choice(ops)} {c}"
    return value

def expression_crossover(a, b, rng):
    return a if rng.next_bool() else b

def expression_distance(a, b, schema=None):
    return 0.0 if a == b else 1.0


# ─── 5. STRUCT ─────────────────────────────────────────────────────────────────
def struct_validate(value, schema=None):
    return isinstance(value, dict)

def struct_mutate(value, rate, rng, schema=None):
    result = copy.deepcopy(value)
    keys = list(result.keys())
    if keys and rng.next_f64() < rate:
        key = rng.next_choice(keys)
        v = result[key]
        if isinstance(v, (int, float)):
            result[key] = v + rate * rng.next_gaussian()
        elif isinstance(v, str):
            pass  # strings unchanged
    return result

def struct_crossover(a, b, rng):
    result = {}
    all_keys = set(list(a.keys()) + list(b.keys()))
    for k in all_keys:
        if k in a and k in b:
            result[k] = a[k] if rng.next_bool() else b[k]
        elif k in a:
            result[k] = a[k]
        else:
            result[k] = b[k]
    return result

def struct_distance(a, b, schema=None):
    all_keys = set(list(a.keys()) + list(b.keys()))
    if not all_keys:
        return 0.0
    diffs = 0
    for k in all_keys:
        if k not in a or k not in b:
            diffs += 1
        elif a[k] != b[k]:
            diffs += 0.5
    return diffs / len(all_keys)


# ─── 6. ARRAY ─────────────────────────────────────────────────────────────────
def array_validate(value, schema=None):
    return isinstance(value, list)

def array_mutate(value, rate, rng, schema=None):
    result = copy.deepcopy(value)
    if result and rng.next_f64() < rate:
        idx = rng.next_int(0, len(result) - 1)
        if isinstance(result[idx], (int, float)):
            result[idx] = result[idx] + rate * rng.next_gaussian()
    return result

def array_crossover(a, b, rng):
    if not a or not b:
        return a or b
    point = rng.next_int(0, min(len(a), len(b)) - 1)
    return a[:point] + b[point:]

def array_distance(a, b, schema=None):
    max_len = max(len(a), len(b))
    if max_len == 0:
        return 0.0
    diffs = abs(len(a) - len(b))
    for i in range(min(len(a), len(b))):
        if a[i] != b[i]:
            diffs += 1
    return diffs / max_len


# ─── 7. GRAPH ─────────────────────────────────────────────────────────────────
def graph_validate(value, schema=None):
    if not isinstance(value, dict):
        return False
    return 'nodes' in value and 'edges' in value

def graph_mutate(value, rate, rng, schema=None):
    result = copy.deepcopy(value)
    if rng.next_f64() < rate:
        op = rng.next_int(0, 2)
        if op == 0 and result['nodes']:
            node = rng.next_choice(result['nodes'])
            if 'weight' in node:
                node['weight'] = clamp(node['weight'] + rng.next_gaussian() * rate, 0, 1)
        elif op == 1 and len(result['nodes']) > 1:
            n1 = rng.next_choice(result['nodes'])
            n2 = rng.next_choice(result['nodes'])
            if n1['id'] != n2['id']:
                result['edges'].append({'from': n1['id'], 'to': n2['id'], 'weight': rng.next_f64()})
        elif op == 2 and result['edges']:
            idx = rng.next_int(0, len(result['edges']) - 1)
            result['edges'].pop(idx)
    return result

def graph_crossover(a, b, rng):
    return a if rng.next_bool() else b

def graph_distance(a, b, schema=None):
    return abs(len(a.get('nodes', [])) - len(b.get('nodes', []))) + abs(len(a.get('edges', [])) - len(b.get('edges', [])))


# ─── 8. TOPOLOGY ──────────────────────────────────────────────────────────────
def topology_validate(value, schema=None):
    return isinstance(value, dict)

def topology_mutate(value, rate, rng, schema=None):
    result = copy.deepcopy(value)
    if 'vertices' in result and result['vertices'] and rng.next_f64() < rate:
        idx = rng.next_int(0, len(result['vertices']) - 1)
        result['vertices'][idx] = [v + rate * rng.next_gaussian() for v in result['vertices'][idx]]
    return result

def topology_crossover(a, b, rng):
    return a if rng.next_bool() else b

def topology_distance(a, b, schema=None):
    return 0.0 if a == b else 1.0


# ─── 9. TEMPORAL ──────────────────────────────────────────────────────────────
def temporal_validate(value, schema=None):
    if not isinstance(value, dict):
        return False
    return 'keyframes' in value or 'expression' in value or 'envelope' in value

def temporal_mutate(value, rate, rng, schema=None):
    result = copy.deepcopy(value)
    if 'keyframes' in result and result['keyframes'] and rng.next_f64() < rate:
        idx = rng.next_int(0, len(result['keyframes']) - 1)
        kf = result['keyframes'][idx]
        kf['value'] = kf['value'] + rate * rng.next_gaussian()
    if 'envelope' in result and rng.next_f64() < rate:
        env = result['envelope']
        for k in ['attack', 'decay', 'sustain', 'release']:
            if k in env:
                env[k] = clamp(env[k] + rate * rng.next_gaussian() * 0.1, 0, 2)
    return result

def temporal_crossover(a, b, rng):
    return a if rng.next_bool() else b

def temporal_distance(a, b, schema=None):
    return 0.0 if a == b else 1.0


# ─── 10. REGULATORY ───────────────────────────────────────────────────────────
def regulatory_validate(value, schema=None):
    if not isinstance(value, dict):
        return False
    return 'nodes' in value and 'edges' in value

def regulatory_mutate(value, rate, rng, schema=None):
    result = copy.deepcopy(value)
    if result.get('edges') and rng.next_f64() < rate:
        edge = rng.next_choice(result['edges'])
        if 'weight' in edge:
            edge['weight'] = clamp(edge['weight'] + rate * rng.next_gaussian(), -1, 1)
    return result

def regulatory_crossover(a, b, rng):
    return a if rng.next_bool() else b

def regulatory_distance(a, b, schema=None):
    return 0.0 if a == b else 1.0


# ─── 11. FIELD ─────────────────────────────────────────────────────────────────
def field_validate(value, schema=None):
    return isinstance(value, dict) and 'type' in value

def field_mutate(value, rate, rng, schema=None):
    result = copy.deepcopy(value)
    if 'parameters' in result:
        for k, v in result['parameters'].items():
            if isinstance(v, (int, float)):
                result['parameters'][k] = v + rate * rng.next_gaussian()
    return result

def field_crossover(a, b, rng):
    return a if rng.next_bool() else b

def field_distance(a, b, schema=None):
    return 0.0 if a == b else 1.0


# ─── 12. SYMBOLIC ─────────────────────────────────────────────────────────────
def symbolic_validate(value, schema=None):
    return isinstance(value, (str, dict, list))

def symbolic_mutate(value, rate, rng, schema=None):
    if isinstance(value, str) and rng.next_f64() < rate:
        return value + " (mutated)"
    return value

def symbolic_crossover(a, b, rng):
    return a if rng.next_bool() else b

def symbolic_distance(a, b, schema=None):
    return 0.0 if a == b else 1.0


# ─── 13. QUANTUM ──────────────────────────────────────────────────────────────
def quantum_validate(value, schema=None):
    if not isinstance(value, dict):
        return False
    if 'amplitudes' not in value or 'basis' not in value:
        return False
    return len(value['amplitudes']) == len(value['basis'])

def quantum_mutate(value, rate, rng, schema=None):
    result = copy.deepcopy(value)
    amps = result['amplitudes']
    if amps and rng.next_f64() < rate:
        idx = rng.next_int(0, len(amps) - 1)
        amps[idx] = clamp(amps[idx] + rate * rng.next_gaussian() * 0.1, 0, 1)
        total = sum(a * a for a in amps)
        if total > 0:
            norm = math.sqrt(total)
            result['amplitudes'] = [a / norm for a in amps]
    return result

def quantum_crossover(a, b, rng):
    if len(a['basis']) != len(b['basis']):
        return a if rng.next_bool() else b
    alpha = rng.next_f64()
    amps = [ai * alpha + bi * (1 - alpha) for ai, bi in zip(a['amplitudes'], b['amplitudes'])]
    total = sum(x * x for x in amps)
    if total > 0:
        norm = math.sqrt(total)
        amps = [x / norm for x in amps]
    return {'amplitudes': amps, 'basis': a['basis']}

def quantum_distance(a, b, schema=None):
    if len(a['amplitudes']) != len(b['amplitudes']):
        return 1.0
    dot = sum(ai * bi for ai, bi in zip(a['amplitudes'], b['amplitudes']))
    return 1.0 - abs(dot) ** 2


# ─── 14. GEMATRIA ─────────────────────────────────────────────────────────────
def gematria_validate(value, schema=None):
    if not isinstance(value, dict):
        return False
    return 'sequence' in value and 'system' in value

def gematria_mutate(value, rate, rng, schema=None):
    result = copy.deepcopy(value)
    if rng.next_f64() < rate:
        seq = list(result['sequence'])
        if seq:
            idx = rng.next_int(0, len(seq) - 1)
            offset = rng.next_int(-3, 3)
            c = ord(seq[idx]) + offset
            if 32 <= c <= 126:
                seq[idx] = chr(c)
            result['sequence'] = ''.join(seq)
    result['computed_value'] = sum(ord(c) for c in result['sequence'])
    return result

def gematria_crossover(a, b, rng):
    return a if rng.next_bool() else b

def gematria_distance(a, b, schema=None):
    return abs(a.get('computed_value', 0) - b.get('computed_value', 0))


# ─── 15. RESONANCE ────────────────────────────────────────────────────────────
def resonance_validate(value, schema=None):
    if not isinstance(value, dict):
        return False
    return 'fundamentals' in value

def resonance_mutate(value, rate, rng, schema=None):
    result = copy.deepcopy(value)
    if result.get('partials') and rng.next_f64() < rate:
        p = rng.next_choice(result['partials'])
        p['amplitude'] = clamp(p['amplitude'] + rate * rng.next_gaussian() * 0.1, 0, 1)
    if result.get('fundamentals') and rng.next_f64() < rate:
        idx = rng.next_int(0, len(result['fundamentals']) - 1)
        result['fundamentals'][idx] = max(20, result['fundamentals'][idx] + rate * rng.next_gaussian() * 50)
    return result

def resonance_crossover(a, b, rng):
    return a if rng.next_bool() else b

def resonance_distance(a, b, schema=None):
    af = a.get('fundamentals', [])
    bf = b.get('fundamentals', [])
    if not af or not bf:
        return 1.0
    return abs(af[0] - bf[0]) / max(af[0], bf[0], 1)


# ─── 16. DIMENSIONAL ──────────────────────────────────────────────────────────
def dimensional_validate(value, schema=None):
    if not isinstance(value, list):
        return False
    return all(isinstance(v, (int, float)) for v in value)

def dimensional_mutate(value, rate, rng, schema=None):
    return [v + rate * rng.next_gaussian() * 0.1 for v in value]

def dimensional_crossover(a, b, rng):
    if len(a) != len(b):
        return a
    t = rng.next_f64()
    result = [ai * (1 - t) + bi * t for ai, bi in zip(a, b)]
    norm = math.sqrt(sum(x * x for x in result))
    if norm > 0:
        result = [x / norm for x in result]
    return result

def dimensional_distance(a, b, schema=None):
    if len(a) != len(b):
        return 1.0
    dot = sum(ai * bi for ai, bi in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 1.0
    return 1.0 - abs(dot / (na * nb))


# ─── 17. SOVEREIGNTY ──────────────────────────────────────────────────────────
def sovereignty_validate(value, schema=None):
    if not isinstance(value, dict):
        return False
    return 'author_pubkey' in value

def sovereignty_mutate(value, rate, rng, schema=None):
    return value  # Immutable — mutation forbidden

def sovereignty_crossover(a, b, rng):
    return a  # Crossover forbidden

def sovereignty_distance(a, b, schema=None):
    return 0.0 if a.get('author_pubkey') == b.get('author_pubkey') else 1.0


# ─── REGISTRY ─────────────────────────────────────────────────────────────────
GENE_TYPES = {
    'scalar': {'validate': scalar_validate, 'mutate': scalar_mutate, 'crossover': scalar_crossover, 'distance': scalar_distance},
    'categorical': {'validate': categorical_validate, 'mutate': categorical_mutate, 'crossover': categorical_crossover, 'distance': categorical_distance},
    'vector': {'validate': vector_validate, 'mutate': vector_mutate, 'crossover': vector_crossover, 'distance': vector_distance},
    'expression': {'validate': expression_validate, 'mutate': expression_mutate, 'crossover': expression_crossover, 'distance': expression_distance},
    'struct': {'validate': struct_validate, 'mutate': struct_mutate, 'crossover': struct_crossover, 'distance': struct_distance},
    'array': {'validate': array_validate, 'mutate': array_mutate, 'crossover': array_crossover, 'distance': array_distance},
    'graph': {'validate': graph_validate, 'mutate': graph_mutate, 'crossover': graph_crossover, 'distance': graph_distance},
    'topology': {'validate': topology_validate, 'mutate': topology_mutate, 'crossover': topology_crossover, 'distance': topology_distance},
    'temporal': {'validate': temporal_validate, 'mutate': temporal_mutate, 'crossover': temporal_crossover, 'distance': temporal_distance},
    'regulatory': {'validate': regulatory_validate, 'mutate': regulatory_mutate, 'crossover': regulatory_crossover, 'distance': regulatory_distance},
    'field': {'validate': field_validate, 'mutate': field_mutate, 'crossover': field_crossover, 'distance': field_distance},
    'symbolic': {'validate': symbolic_validate, 'mutate': symbolic_mutate, 'crossover': symbolic_crossover, 'distance': symbolic_distance},
    'quantum': {'validate': quantum_validate, 'mutate': quantum_mutate, 'crossover': quantum_crossover, 'distance': quantum_distance},
    'gematria': {'validate': gematria_validate, 'mutate': gematria_mutate, 'crossover': gematria_crossover, 'distance': gematria_distance},
    'resonance': {'validate': resonance_validate, 'mutate': resonance_mutate, 'crossover': resonance_crossover, 'distance': resonance_distance},
    'dimensional': {'validate': dimensional_validate, 'mutate': dimensional_mutate, 'crossover': dimensional_crossover, 'distance': dimensional_distance},
    'sovereignty': {'validate': sovereignty_validate, 'mutate': sovereignty_mutate, 'crossover': sovereignty_crossover, 'distance': sovereignty_distance},
}


def validate_gene(gene_type, value, schema=None):
    if gene_type not in GENE_TYPES:
        return False
    return GENE_TYPES[gene_type]['validate'](value, schema)


def mutate_gene(gene_type, value, rate, rng, schema=None):
    if gene_type not in GENE_TYPES:
        return value
    return GENE_TYPES[gene_type]['mutate'](value, rate, rng, schema)


def crossover_gene(gene_type, a, b, rng):
    if gene_type not in GENE_TYPES:
        return a
    return GENE_TYPES[gene_type]['crossover'](a, b, rng)


def distance_gene(gene_type, a, b, schema=None):
    if gene_type not in GENE_TYPES:
        return 1.0
    return GENE_TYPES[gene_type]['distance'](a, b, schema)


def get_gene_type_info():
    """Return metadata about all 17 gene types."""
    return [
        {"id": 1, "name": "scalar", "encodes": "Continuous numeric values", "example": "size, intensity, speed"},
        {"id": 2, "name": "categorical", "encodes": "Discrete choices from finite sets", "example": "species, genre, archetype"},
        {"id": 3, "name": "vector", "encodes": "Multi-dimensional numeric arrays", "example": "color(rgb), position(xyz)"},
        {"id": 4, "name": "expression", "encodes": "Runtime-evaluated mathematical formulas", "example": "x → sin(x*π)/2"},
        {"id": 5, "name": "struct", "encodes": "Composite records with named fields", "example": "{head, torso, limbs}"},
        {"id": 6, "name": "array", "encodes": "Ordered homogeneous collections", "example": "melody_notes[32]"},
        {"id": 7, "name": "graph", "encodes": "Nodes and edges encoding relational structure", "example": "state_machine, skill_tree"},
        {"id": 8, "name": "topology", "encodes": "Surface and manifold descriptions", "example": "silhouette, blend_shapes"},
        {"id": 9, "name": "temporal", "encodes": "Time-varying signals and envelopes", "example": "motion_curve, ADSR"},
        {"id": 10, "name": "regulatory", "encodes": "Gene-expression control networks", "example": "personality → behavior_bias"},
        {"id": 11, "name": "field", "encodes": "Continuous spatial distributions", "example": "density_field, temperature_map"},
        {"id": 12, "name": "symbolic", "encodes": "Abstract symbolic representations", "example": "story_grammar, dialogue_tree"},
        {"id": 13, "name": "quantum", "encodes": "Superposition and entanglement states", "example": "style_superposition(cubist, art_nouveau)"},
        {"id": 14, "name": "gematria", "encodes": "Numerological / symbolic-numeric encodings", "example": "name_numerology, title_resonance"},
        {"id": 15, "name": "resonance", "encodes": "Harmonic frequency profiles", "example": "voice_timbre, material_tap_tone"},
        {"id": 16, "name": "dimensional", "encodes": "Embedding-space coordinates", "example": "style_embedding, semantic_vector"},
        {"id": 17, "name": "sovereignty", "encodes": "Cryptographic ownership chains", "example": "author_key, lineage_proof"},
    ]
