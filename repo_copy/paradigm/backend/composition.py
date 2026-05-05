"""
Layer 5 — Cross-Domain Composition: Functor bridges + registry + BFS pathfinding.
9 pre-registered functors following category-theoretic laws.
"""
import copy
from kernel import content_hash, rng_from_hash, Xoshiro256StarStar
from evolution import evaluate_fitness


def _make_lineage(source_seed, functor_name):
    return {
        'parents': [source_seed.get('$hash', '')],
        'operation': f'compose:{functor_name}',
        'generation': source_seed.get('$lineage', {}).get('generation', 0) + 1,
        'timestamp': None,
    }


def _finalize_seed(seed):
    seed['$hash'] = content_hash(seed)
    seed['$fitness'] = evaluate_fitness(seed)
    return seed


# ─── 9 Pre-Registered Functors ───────────────────────────────────────────────

def character_to_sprite(seed):
    """Transform character seed into sprite seed."""
    genes = seed.get('genes', {})
    palette = genes.get('palette', {}).get('value', [0.5, 0.3, 0.2])
    size = genes.get('size', {}).get('value', 0.75)
    result = {
        '$gst': seed.get('$gst', '1.0'),
        '$domain': 'sprite',
        '$name': seed.get('$name', '') + ' — Sprite',
        '$lineage': _make_lineage(seed, 'character_to_sprite'),
        'genes': {
            'resolution': {'type': 'scalar', 'value': 0.3 + size * 0.4},
            'paletteSize': {'type': 'scalar', 'value': 0.5},
            'colors': {'type': 'vector', 'value': palette if isinstance(palette, list) else [0.5, 0.3, 0.2]},
            'symmetry': {'type': 'categorical', 'value': 'bilateral'},
            'animation': {'type': 'temporal', 'value': {'keyframes': [{'time': 0, 'value': 0}, {'time': 0.5, 'value': 1}, {'time': 1, 'value': 0}]}},
        },
        '$metadata': {'source_domain': 'character', 'functor': 'character_to_sprite'},
    }
    return _finalize_seed(result)


def character_to_music(seed):
    """Compose a theme song matching the character's personality."""
    genes = seed.get('genes', {})
    strength = genes.get('strength', {}).get('value', 0.5)
    agility = genes.get('agility', {}).get('value', 0.5)
    archetype = genes.get('archetype', {}).get('value', 'warrior')
    mode_map = {'warrior': 'minor', 'mage': 'dorian', 'rogue': 'blues', 'paladin': 'major', 'ranger': 'pentatonic', 'dark_knight': 'minor', 'bard': 'mixolydian'}
    inst_map = {'warrior': ['timpani', 'brass', 'low_strings'], 'mage': ['choir', 'harp', 'celeste'], 'rogue': ['pizzicato', 'woodwinds', 'harp'], 'paladin': ['organ', 'brass', 'choir']}
    result = {
        '$gst': seed.get('$gst', '1.0'),
        '$domain': 'music',
        '$name': seed.get('$name', '') + ' — Theme',
        '$lineage': _make_lineage(seed, 'character_to_music'),
        'genes': {
            'tempo': {'type': 'scalar', 'value': 0.3 + strength * 0.5},
            'key': {'type': 'categorical', 'value': 'C'},
            'scale': {'type': 'categorical', 'value': mode_map.get(archetype, 'minor')},
            'melody': {'type': 'array', 'value': [60, 62, 64, 67, 69, 72, 67, 64]},
            'timbre': {'type': 'resonance', 'value': {'fundamentals': [440], 'partials': [{'freq_ratio': 2, 'amplitude': 0.5 + agility * 0.3, 'phase': 0}], 'damping': 0.1}},
            'instruments': {'type': 'array', 'value': inst_map.get(archetype, ['full_orchestra'])},
        },
        '$metadata': {'source_domain': 'character', 'functor': 'character_to_music'},
    }
    return _finalize_seed(result)


def character_to_fullgame(seed):
    """Spawn a playable game starring the character."""
    genes = seed.get('genes', {})
    archetype = genes.get('archetype', {}).get('value', 'warrior')
    strength = genes.get('strength', {}).get('value', 0.5)
    genre_map = {'warrior': 'action', 'mage': 'rpg', 'rogue': 'stealth', 'paladin': 'adventure', 'ranger': 'exploration'}
    result = {
        '$gst': seed.get('$gst', '1.0'),
        '$domain': 'fullgame',
        '$name': seed.get('$name', '') + ' — Game',
        '$lineage': _make_lineage(seed, 'character_to_fullgame'),
        'genes': {
            'genre': {'type': 'categorical', 'value': genre_map.get(archetype, 'action')},
            'difficulty': {'type': 'scalar', 'value': strength},
            'levelCount': {'type': 'scalar', 'value': 0.5},
            'mechanics': {'type': 'array', 'value': ['combat', 'exploration', 'dialogue']},
            'protagonist': {'type': 'struct', 'value': {'name': seed.get('$name', ''), 'archetype': archetype}},
        },
        '$metadata': {'source_domain': 'character', 'functor': 'character_to_fullgame'},
    }
    return _finalize_seed(result)


def procedural_to_fullgame(seed):
    """Wrap a procedural world in a playable game."""
    genes = seed.get('genes', {})
    biome = genes.get('biome', {}).get('value', 'temperate')
    result = {
        '$gst': seed.get('$gst', '1.0'),
        '$domain': 'fullgame',
        '$name': seed.get('$name', '') + ' — Open World',
        '$lineage': _make_lineage(seed, 'procedural_to_fullgame'),
        'genes': {
            'genre': {'type': 'categorical', 'value': 'exploration'},
            'worldBiome': {'type': 'categorical', 'value': biome},
            'levelCount': {'type': 'scalar', 'value': 0.8},
            'mechanics': {'type': 'array', 'value': ['exploration', 'crafting', 'survival']},
        },
        '$metadata': {'source_domain': 'procedural', 'functor': 'procedural_to_fullgame'},
    }
    return _finalize_seed(result)


def music_to_ecosystem(seed):
    """Drive ecosystem from music structure."""
    genes = seed.get('genes', {})
    tempo = genes.get('tempo', {}).get('value', 0.5)
    result = {
        '$gst': seed.get('$gst', '1.0'),
        '$domain': 'ecosystem',
        '$name': seed.get('$name', '') + ' — Ecosystem',
        '$lineage': _make_lineage(seed, 'music_to_ecosystem'),
        'genes': {
            'speciesCount': {'type': 'scalar', 'value': tempo},
            'interactionRate': {'type': 'scalar', 'value': tempo * 0.8},
            'stability': {'type': 'scalar', 'value': 0.6},
            'environment': {'type': 'categorical', 'value': 'forest'},
        },
        '$metadata': {'source_domain': 'music', 'functor': 'music_to_ecosystem'},
    }
    return _finalize_seed(result)


def visual2d_to_animation(seed):
    """Animate a static 2D image."""
    genes = seed.get('genes', {})
    result = {
        '$gst': seed.get('$gst', '1.0'),
        '$domain': 'animation',
        '$name': seed.get('$name', '') + ' — Animated',
        '$lineage': _make_lineage(seed, 'visual2d_to_animation'),
        'genes': {
            'frameCount': {'type': 'scalar', 'value': 0.5},
            'fps': {'type': 'scalar', 'value': 0.5},
            'motionType': {'type': 'categorical', 'value': 'skeletal'},
            'loop': {'type': 'categorical', 'value': 'loop'},
            'easing': {'type': 'expression', 'value': 'ease_in_out(t)'},
        },
        '$metadata': {'source_domain': 'visual2d', 'functor': 'visual2d_to_animation'},
    }
    return _finalize_seed(result)


def narrative_to_fullgame(seed):
    """Generate game from a story."""
    genes = seed.get('genes', {})
    result = {
        '$gst': seed.get('$gst', '1.0'),
        '$domain': 'fullgame',
        '$name': seed.get('$name', '') + ' — Narrative Game',
        '$lineage': _make_lineage(seed, 'narrative_to_fullgame'),
        'genes': {
            'genre': {'type': 'categorical', 'value': 'adventure'},
            'levelCount': {'type': 'scalar', 'value': 0.6},
            'mechanics': {'type': 'array', 'value': ['dialogue', 'choice', 'exploration']},
            'narrative': {'type': 'symbolic', 'value': genes.get('plot', {}).get('value', 'hero_journey')},
        },
        '$metadata': {'source_domain': 'narrative', 'functor': 'narrative_to_fullgame'},
    }
    return _finalize_seed(result)


def physics_to_fullgame(seed):
    """Build a physics-puzzle game."""
    result = {
        '$gst': seed.get('$gst', '1.0'),
        '$domain': 'fullgame',
        '$name': seed.get('$name', '') + ' — Physics Puzzle',
        '$lineage': _make_lineage(seed, 'physics_to_fullgame'),
        'genes': {
            'genre': {'type': 'categorical', 'value': 'puzzle'},
            'difficulty': {'type': 'scalar', 'value': 0.5},
            'mechanics': {'type': 'array', 'value': ['physics', 'construction', 'destruction']},
        },
        '$metadata': {'source_domain': 'physics', 'functor': 'physics_to_fullgame'},
    }
    return _finalize_seed(result)


def sprite_to_animation(seed):
    """Animate a sprite into a spritesheet animation."""
    result = {
        '$gst': seed.get('$gst', '1.0'),
        '$domain': 'animation',
        '$name': seed.get('$name', '') + ' — Spritesheet',
        '$lineage': _make_lineage(seed, 'sprite_to_animation'),
        'genes': {
            'frameCount': {'type': 'scalar', 'value': 0.5},
            'fps': {'type': 'scalar', 'value': 0.4},
            'motionType': {'type': 'categorical', 'value': 'frame_by_frame'},
            'loop': {'type': 'categorical', 'value': 'loop'},
        },
        '$metadata': {'source_domain': 'sprite', 'functor': 'sprite_to_animation'},
    }
    return _finalize_seed(result)


# ─── Functor Registry ────────────────────────────────────────────────────────
FUNCTOR_REGISTRY = {
    ('character', 'sprite'): {'fn': character_to_sprite, 'name': 'character_to_sprite'},
    ('character', 'music'): {'fn': character_to_music, 'name': 'character_to_music'},
    ('character', 'fullgame'): {'fn': character_to_fullgame, 'name': 'character_to_fullgame'},
    ('procedural', 'fullgame'): {'fn': procedural_to_fullgame, 'name': 'procedural_to_fullgame'},
    ('music', 'ecosystem'): {'fn': music_to_ecosystem, 'name': 'music_to_ecosystem'},
    ('visual2d', 'animation'): {'fn': visual2d_to_animation, 'name': 'visual2d_to_animation'},
    ('narrative', 'fullgame'): {'fn': narrative_to_fullgame, 'name': 'narrative_to_fullgame'},
    ('physics', 'fullgame'): {'fn': physics_to_fullgame, 'name': 'physics_to_fullgame'},
    ('sprite', 'animation'): {'fn': sprite_to_animation, 'name': 'sprite_to_animation'},
}


def get_functor(source_domain, target_domain):
    """Get a direct functor between two domains."""
    key = (source_domain, target_domain)
    return FUNCTOR_REGISTRY.get(key)


def find_composition_path(source_domain, target_domain):
    """BFS pathfinding through functor graph. Returns list of (source, target, functor_name)."""
    if source_domain == target_domain:
        return []
    visited = {source_domain}
    queue = [(source_domain, [])]
    while queue:
        node, path = queue.pop(0)
        outgoing = [(k, v) for k, v in FUNCTOR_REGISTRY.items() if k[0] == node]
        outgoing.sort(key=lambda x: x[1]['name'])
        for (src, tgt), functor in outgoing:
            if tgt == target_domain:
                return path + [(src, tgt, functor['name'])]
            if tgt not in visited:
                visited.add(tgt)
                queue.append((tgt, path + [(src, tgt, functor['name'])]))
    return None


def compose_seed(seed, target_domain):
    """Compose a seed into a target domain, finding the path automatically."""
    source = seed.get('$domain', '')
    if source == target_domain:
        return seed
    direct = get_functor(source, target_domain)
    if direct:
        return direct['fn'](seed)
    path = find_composition_path(source, target_domain)
    if path is None:
        return None
    current = seed
    for src, tgt, fname in path:
        functor = FUNCTOR_REGISTRY[(src, tgt)]
        current = functor['fn'](current)
    return current


def get_composition_graph():
    """Return the full functor graph for visualization."""
    nodes = set()
    edges = []
    for (src, tgt), info in FUNCTOR_REGISTRY.items():
        nodes.add(src)
        nodes.add(tgt)
        edges.append({'source': src, 'target': tgt, 'functor': info['name']})
    return {'nodes': sorted(nodes), 'edges': edges}
