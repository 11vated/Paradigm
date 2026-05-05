"""
Seed Commons Library — Pre-built seed inventories from the GSPL specification.
18 inventory categories with foundational seeds.
"""
from kernel import content_hash
from evolution import evaluate_fitness


def _make_seed(name, domain, genes, tags=None):
    seed = {
        '$gst': '1.0',
        '$domain': domain,
        '$name': name,
        '$lineage': {'parents': [], 'operation': 'primordial', 'generation': 0},
        'genes': genes,
        '$metadata': {'engine_version': '1.0.0', 'tags': tags or [], 'source': 'seed_commons'}
    }
    seed['$hash'] = content_hash(seed)
    seed['$fitness'] = evaluate_fitness(seed)
    return seed


# ─── Character Inventory ──────────────────────────────────────────────────────
CHARACTER_SEEDS = [
    _make_seed("Blacksmith", "character", {
        'size': {'type': 'scalar', 'value': 0.78}, 'archetype': {'type': 'categorical', 'value': 'warrior'},
        'strength': {'type': 'scalar', 'value': 0.82}, 'agility': {'type': 'scalar', 'value': 0.35},
        'palette': {'type': 'vector', 'value': [0.38, 0.26, 0.18]},
        'personality': {'type': 'struct', 'value': {'trait': 'stoic', 'alignment': 'lawful'}},
        'motion': {'type': 'temporal', 'value': {'keyframes': [{'time': 0, 'value': 0}, {'time': 1, 'value': 1}], 'envelope': {'attack': 0.2, 'decay': 0.3, 'sustain': 0.6, 'release': 0.4}}},
    }, ['foundational', 'artisan']),
    _make_seed("Forest Ranger", "character", {
        'size': {'type': 'scalar', 'value': 0.68}, 'archetype': {'type': 'categorical', 'value': 'ranger'},
        'strength': {'type': 'scalar', 'value': 0.5}, 'agility': {'type': 'scalar', 'value': 0.85},
        'palette': {'type': 'vector', 'value': [0.22, 0.45, 0.18]},
        'personality': {'type': 'struct', 'value': {'trait': 'alert', 'alignment': 'neutral'}},
    }, ['foundational', 'scout']),
    _make_seed("Elderly Scholar", "character", {
        'size': {'type': 'scalar', 'value': 0.72}, 'archetype': {'type': 'categorical', 'value': 'mage'},
        'strength': {'type': 'scalar', 'value': 0.2}, 'agility': {'type': 'scalar', 'value': 0.3},
        'palette': {'type': 'vector', 'value': [0.22, 0.18, 0.45]},
        'personality': {'type': 'struct', 'value': {'trait': 'wise', 'alignment': 'lawful'}},
    }, ['foundational', 'mage']),
    _make_seed("Shadow Assassin", "character", {
        'size': {'type': 'scalar', 'value': 0.65}, 'archetype': {'type': 'categorical', 'value': 'rogue'},
        'strength': {'type': 'scalar', 'value': 0.55}, 'agility': {'type': 'scalar', 'value': 0.95},
        'palette': {'type': 'vector', 'value': [0.08, 0.06, 0.12]},
        'personality': {'type': 'struct', 'value': {'trait': 'cunning', 'alignment': 'chaotic'}},
    }, ['foundational', 'rogue']),
    _make_seed("Holy Paladin", "character", {
        'size': {'type': 'scalar', 'value': 0.85}, 'archetype': {'type': 'categorical', 'value': 'paladin'},
        'strength': {'type': 'scalar', 'value': 0.75}, 'agility': {'type': 'scalar', 'value': 0.4},
        'palette': {'type': 'vector', 'value': [0.85, 0.78, 0.55]},
        'personality': {'type': 'struct', 'value': {'trait': 'righteous', 'alignment': 'lawful'}},
    }, ['foundational', 'paladin']),
]

# ─── Music Inventory ──────────────────────────────────────────────────────────
MUSIC_SEEDS = [
    _make_seed("Piano Middle C", "music", {
        'tempo': {'type': 'scalar', 'value': 0.5}, 'key': {'type': 'categorical', 'value': 'C'},
        'scale': {'type': 'categorical', 'value': 'major'},
        'melody': {'type': 'array', 'value': [60, 64, 67, 72]},
        'timbre': {'type': 'resonance', 'value': {'fundamentals': [261.63], 'partials': [{'freq_ratio': 2, 'amplitude': 0.62, 'phase': 0}, {'freq_ratio': 3, 'amplitude': 0.41, 'phase': 0}], 'damping': 0.02}},
    }, ['foundational', 'piano']),
    _make_seed("Battle March", "music", {
        'tempo': {'type': 'scalar', 'value': 0.75}, 'key': {'type': 'categorical', 'value': 'Dm'},
        'scale': {'type': 'categorical', 'value': 'minor'},
        'melody': {'type': 'array', 'value': [62, 65, 69, 62, 65, 69, 74, 72]},
        'timbre': {'type': 'resonance', 'value': {'fundamentals': [220], 'partials': [{'freq_ratio': 2, 'amplitude': 0.8, 'phase': 0}], 'damping': 0.05}},
    }, ['foundational', 'orchestral']),
    _make_seed("Forest Ambience", "music", {
        'tempo': {'type': 'scalar', 'value': 0.25}, 'key': {'type': 'categorical', 'value': 'Am'},
        'scale': {'type': 'categorical', 'value': 'pentatonic'},
        'melody': {'type': 'array', 'value': [69, 72, 76, 72, 69, 64]},
    }, ['foundational', 'ambient']),
]

# ─── Sprite Inventory ─────────────────────────────────────────────────────────
SPRITE_SEEDS = [
    _make_seed("8-bit Hero", "sprite", {
        'resolution': {'type': 'scalar', 'value': 0.25}, 'paletteSize': {'type': 'scalar', 'value': 0.25},
        'colors': {'type': 'vector', 'value': [0.6, 0.3, 0.1]}, 'symmetry': {'type': 'categorical', 'value': 'bilateral'},
    }, ['foundational', 'retro']),
    _make_seed("Crystal Golem", "sprite", {
        'resolution': {'type': 'scalar', 'value': 0.5}, 'paletteSize': {'type': 'scalar', 'value': 0.4},
        'colors': {'type': 'vector', 'value': [0.3, 0.8, 0.9]}, 'symmetry': {'type': 'categorical', 'value': 'radial'},
    }, ['foundational', 'creature']),
]

# ─── Visual2D Inventory ───────────────────────────────────────────────────────
VISUAL2D_SEEDS = [
    _make_seed("Abstract Storm", "visual2d", {
        'style': {'type': 'categorical', 'value': 'abstract'}, 'complexity': {'type': 'scalar', 'value': 0.8},
        'palette': {'type': 'vector', 'value': [0.15, 0.12, 0.35]}, 'composition': {'type': 'categorical', 'value': 'dynamic'},
        'texture': {'type': 'field', 'value': {'type': 'turbulence', 'parameters': {'octaves': 6, 'persistence': 0.6}}},
    }, ['foundational', 'abstract']),
    _make_seed("Sunset Landscape", "visual2d", {
        'style': {'type': 'categorical', 'value': 'impressionist'}, 'complexity': {'type': 'scalar', 'value': 0.5},
        'palette': {'type': 'vector', 'value': [0.9, 0.5, 0.2]}, 'composition': {'type': 'categorical', 'value': 'horizontal'},
    }, ['foundational', 'landscape']),
]

# ─── Procedural Inventory ─────────────────────────────────────────────────────
PROCEDURAL_SEEDS = [
    _make_seed("Volcanic Island", "procedural", {
        'octaves': {'type': 'scalar', 'value': 0.75}, 'persistence': {'type': 'scalar', 'value': 0.6},
        'scale': {'type': 'scalar', 'value': 0.8}, 'biome': {'type': 'categorical', 'value': 'volcanic'},
        'heightField': {'type': 'field', 'value': {'type': 'perlin', 'parameters': {'octaves': 8, 'persistence': 0.55, 'lacunarity': 2.2}}},
    }, ['foundational', 'terrain']),
    _make_seed("Enchanted Forest", "procedural", {
        'octaves': {'type': 'scalar', 'value': 0.5}, 'persistence': {'type': 'scalar', 'value': 0.45},
        'scale': {'type': 'scalar', 'value': 0.6}, 'biome': {'type': 'categorical', 'value': 'temperate'},
    }, ['foundational', 'forest']),
]

# ─── Additional Domain Inventories ────────────────────────────────────────────
NARRATIVE_SEEDS = [
    _make_seed("Hero's Journey", "narrative", {
        'structure': {'type': 'categorical', 'value': 'heros_journey'},
        'tone': {'type': 'categorical', 'value': 'epic'},
        'complexity': {'type': 'scalar', 'value': 0.7},
        'characters': {'type': 'array', 'value': ['hero', 'mentor', 'villain', 'ally']},
        'plot': {'type': 'symbolic', 'value': 'call → threshold → trials → revelation → return'},
    }, ['foundational', 'epic']),
]

PHYSICS_SEEDS = [
    _make_seed("Gravity Well", "physics", {
        'gravity': {'type': 'scalar', 'value': 0.65},
        'friction': {'type': 'scalar', 'value': 0.3},
        'elasticity': {'type': 'scalar', 'value': 0.8},
        'simulationType': {'type': 'categorical', 'value': 'n_body'},
    }, ['foundational', 'simulation']),
]

ECOSYSTEM_SEEDS = [
    _make_seed("Coral Reef", "ecosystem", {
        'speciesCount': {'type': 'scalar', 'value': 0.8},
        'interactionRate': {'type': 'scalar', 'value': 0.6},
        'stability': {'type': 'scalar', 'value': 0.7},
        'environment': {'type': 'categorical', 'value': 'oceanic'},
    }, ['foundational', 'aquatic']),
]

ARCHITECTURE_SEEDS = [
    _make_seed("Gothic Cathedral", "architecture", {
        'style': {'type': 'categorical', 'value': 'gothic'},
        'scale': {'type': 'scalar', 'value': 0.9},
        'symmetry': {'type': 'categorical', 'value': 'bilateral'},
        'materials': {'type': 'array', 'value': ['stone', 'stained_glass', 'wood']},
    }, ['foundational', 'religious']),
]

VEHICLE_SEEDS = [
    _make_seed("Steam Locomotive", "vehicle", {
        'propulsion': {'type': 'categorical', 'value': 'steam'},
        'speed': {'type': 'scalar', 'value': 0.35},
        'mass': {'type': 'scalar', 'value': 0.9},
        'palette': {'type': 'vector', 'value': [0.15, 0.12, 0.1]},
    }, ['foundational', 'rail']),
]

FOOD_SEEDS = [
    _make_seed("Rustic Sourdough", "food", {
        'cuisine': {'type': 'categorical', 'value': 'european'},
        'complexity': {'type': 'scalar', 'value': 0.4},
        'flavor_profile': {'type': 'vector', 'value': [0.2, 0.1, 0.8, 0.3, 0.1]},
    }, ['foundational', 'bread']),
]

# ─── Library Registry ─────────────────────────────────────────────────────────
SEED_LIBRARY = {
    'character': CHARACTER_SEEDS,
    'music': MUSIC_SEEDS,
    'sprite': SPRITE_SEEDS,
    'visual2d': VISUAL2D_SEEDS,
    'procedural': PROCEDURAL_SEEDS,
    'narrative': NARRATIVE_SEEDS,
    'physics': PHYSICS_SEEDS,
    'ecosystem': ECOSYSTEM_SEEDS,
    'architecture': ARCHITECTURE_SEEDS,
    'vehicle': VEHICLE_SEEDS,
    'food': FOOD_SEEDS,
}

def get_library_stats():
    total = sum(len(v) for v in SEED_LIBRARY.values())
    return {
        'total_seeds': total,
        'categories': len(SEED_LIBRARY),
        'breakdown': {k: len(v) for k, v in SEED_LIBRARY.items()},
    }

def get_all_library_seeds():
    all_seeds = []
    for domain, seeds in SEED_LIBRARY.items():
        for s in seeds:
            all_seeds.append(s)
    return all_seeds

def get_library_seeds_by_domain(domain):
    return SEED_LIBRARY.get(domain, [])
