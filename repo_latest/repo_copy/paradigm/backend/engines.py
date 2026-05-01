"""
Layer 4 — Domain Engines: Developmental pipelines that grow seeds into artifacts.
Each engine follows: extract → morphogenesis → populate → parameterize → simulate → pose → texture → compose → render → export.
"""
import copy


def grow_character(seed):
    """Character engine: grow a character seed into a visual artifact descriptor."""
    genes = seed.get('genes', {})
    size = genes.get('size', {}).get('value', 1.0)
    archetype = genes.get('archetype', {}).get('value', 'warrior')
    strength = genes.get('strength', {}).get('value', 0.5)
    agility = genes.get('agility', {}).get('value', 0.5)
    palette = genes.get('palette', {}).get('value', [0.5, 0.5, 0.5])
    personality = genes.get('personality', {}).get('value', 'neutral')
    if isinstance(personality, dict):
        personality = personality.get('trait', 'neutral')
    body_width = 0.3 + strength * 0.4
    body_height = size * 0.8
    speed = agility * 10
    r = int(min(palette[0] if len(palette) > 0 else 0.5, 1) * 255)
    g = int(min(palette[1] if len(palette) > 1 else 0.5, 1) * 255)
    b = int(min(palette[2] if len(palette) > 2 else 0.5, 1) * 255)
    return {
        'type': 'character',
        'name': seed.get('$name', 'Unknown'),
        'archetype': archetype,
        'visual': {
            'body_width': round(body_width, 2),
            'body_height': round(body_height, 2),
            'color': f'rgb({r},{g},{b})',
            'size_factor': round(size, 2),
        },
        'stats': {
            'strength': round(strength * 100),
            'agility': round(agility * 100),
            'speed': round(speed, 1),
            'hp': round(100 + strength * 200),
        },
        'personality': personality,
        'render_hints': {'mode': '2d_character', 'animated': True},
    }


def grow_sprite(seed):
    """Sprite engine: grow a sprite seed into pixel art parameters."""
    genes = seed.get('genes', {})
    resolution = genes.get('resolution', {}).get('value', 32)
    if isinstance(resolution, float):
        resolution = int(resolution * 64)
    palette_size = genes.get('paletteSize', {}).get('value', 8)
    if isinstance(palette_size, float):
        palette_size = int(palette_size * 16)
    colors = genes.get('colors', {}).get('value', [0.8, 0.2, 0.3])
    symmetry = genes.get('symmetry', {}).get('value', 'bilateral')
    return {
        'type': 'sprite',
        'name': seed.get('$name', 'Sprite'),
        'visual': {
            'resolution': max(8, min(resolution, 128)),
            'palette_size': max(2, min(palette_size, 32)),
            'primary_color': f'hsl({int(colors[0] * 360 if len(colors) > 0 else 180)}, 70%, 50%)',
            'secondary_color': f'hsl({int(colors[1] * 360 if len(colors) > 1 else 90)}, 60%, 40%)',
            'symmetry': symmetry,
        },
        'render_hints': {'mode': '2d_sprite', 'pixel_art': True},
    }


def grow_music(seed):
    """Music engine: grow a music seed into musical parameters."""
    genes = seed.get('genes', {})
    tempo = genes.get('tempo', {}).get('value', 0.5)
    if isinstance(tempo, float) and tempo <= 1:
        tempo = 60 + tempo * 140
    key_val = genes.get('key', {}).get('value', 'C')
    scale = genes.get('scale', {}).get('value', 'major')
    timbre = genes.get('timbre', {}).get('value', {})
    melody = genes.get('melody', {}).get('value', [])
    return {
        'type': 'music',
        'name': seed.get('$name', 'Composition'),
        'musical': {
            'tempo': round(tempo),
            'key': key_val,
            'scale': scale,
            'time_signature': '4/4',
            'measures': 8,
        },
        'timbre': timbre if isinstance(timbre, dict) else {'warmth': 0.5},
        'melody_preview': melody[:16] if isinstance(melody, list) else [],
        'render_hints': {'mode': 'audio_waveform', 'playable': True},
    }


def grow_visual2d(seed):
    """Visual2D engine: grow a 2D visual seed into rendering parameters."""
    genes = seed.get('genes', {})
    style = genes.get('style', {}).get('value', 'abstract')
    complexity = genes.get('complexity', {}).get('value', 0.5)
    palette = genes.get('palette', {}).get('value', [0.5, 0.3, 0.8])
    composition = genes.get('composition', {}).get('value', 'centered')
    return {
        'type': 'visual2d',
        'name': seed.get('$name', 'Visual'),
        'visual': {
            'style': style,
            'complexity': round(complexity, 2) if isinstance(complexity, float) else complexity,
            'palette': palette,
            'composition': composition,
            'layers': max(3, int(complexity * 10)) if isinstance(complexity, (int, float)) else 5,
        },
        'render_hints': {'mode': '2d_canvas', 'generative': True},
    }


def grow_procedural(seed):
    """Procedural engine: grow terrain/procedural content from a seed."""
    genes = seed.get('genes', {})
    octaves = genes.get('octaves', {}).get('value', 4)
    if isinstance(octaves, float):
        octaves = max(1, int(octaves * 8))
    persistence = genes.get('persistence', {}).get('value', 0.5)
    scale = genes.get('scale', {}).get('value', 1.0)
    biome = genes.get('biome', {}).get('value', 'temperate')
    return {
        'type': 'procedural',
        'name': seed.get('$name', 'Terrain'),
        'terrain': {
            'octaves': octaves,
            'persistence': round(persistence, 3) if isinstance(persistence, float) else persistence,
            'scale': round(scale, 2) if isinstance(scale, float) else scale,
            'biome': biome,
            'heightmap_size': 256,
        },
        'render_hints': {'mode': '2d_heightmap', 'interactive': True},
    }


# Engine registry
ENGINES = {
    'character': grow_character,
    'sprite': grow_sprite,
    'music': grow_music,
    'visual2d': grow_visual2d,
    'procedural': grow_procedural,
}

def grow_fullgame(seed):
    genes = seed.get('genes', {})
    genre = genes.get('genre', {}).get('value', 'action')
    diff = genes.get('difficulty', {}).get('value', 0.5)
    return {
        'type': 'fullgame', 'name': seed.get('$name', 'Game'),
        'game': {'genre': genre, 'difficulty': round(diff, 2) if isinstance(diff, float) else diff, 'levels': max(3, int((genes.get('levelCount', {}).get('value', 0.5)) * 20)) if isinstance(genes.get('levelCount', {}).get('value', 0.5), (int, float)) else 10, 'mechanics': genes.get('mechanics', {}).get('value', ['action'])},
        'render_hints': {'mode': 'game_preview', 'interactive': True},
    }

def grow_animation(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'animation', 'name': seed.get('$name', 'Animation'),
        'animation': {'frame_count': max(4, int(genes.get('frameCount', {}).get('value', 0.5) * 60)), 'fps': max(8, int(genes.get('fps', {}).get('value', 0.5) * 60)), 'motion_type': genes.get('motionType', {}).get('value', 'skeletal'), 'loop': genes.get('loop', {}).get('value', 'loop')},
        'render_hints': {'mode': 'animation_timeline', 'animated': True},
    }

def grow_geometry3d(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'geometry3d', 'name': seed.get('$name', '3D Object'),
        'mesh': {'primitive': genes.get('primitive', {}).get('value', 'sphere'), 'subdivisions': max(1, int(genes.get('detail', {}).get('value', 0.5) * 8)), 'material': genes.get('material', {}).get('value', 'metal'), 'scale': [1, 1, 1]},
        'render_hints': {'mode': '3d_viewport', 'rotatable': True},
    }

def grow_narrative(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'narrative', 'name': seed.get('$name', 'Story'),
        'story': {'structure': genes.get('structure', {}).get('value', 'heros_journey'), 'tone': genes.get('tone', {}).get('value', 'epic'), 'characters': genes.get('characters', {}).get('value', ['hero', 'villain']), 'plot': genes.get('plot', {}).get('value', 'quest'), 'acts': 3},
        'render_hints': {'mode': 'narrative_flow', 'readable': True},
    }

def grow_ui(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'ui', 'name': seed.get('$name', 'Interface'),
        'interface': {'layout': genes.get('layout', {}).get('value', 'dashboard'), 'theme': genes.get('theme', {}).get('value', 'dark'), 'components': genes.get('components', {}).get('value', ['header', 'sidebar', 'main'])},
        'render_hints': {'mode': 'ui_preview', 'interactive': True},
    }

def grow_physics(seed):
    genes = seed.get('genes', {})
    grav = genes.get('gravity', {}).get('value', 0.5)
    return {
        'type': 'physics', 'name': seed.get('$name', 'Simulation'),
        'simulation': {'gravity': round(grav * 20, 2) if isinstance(grav, float) else grav, 'friction': genes.get('friction', {}).get('value', 0.3), 'elasticity': genes.get('elasticity', {}).get('value', 0.8), 'type': genes.get('simulationType', {}).get('value', 'rigid_body'), 'steps': 1000},
        'render_hints': {'mode': 'physics_sim', 'animated': True},
    }

def grow_audio(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'audio', 'name': seed.get('$name', 'Sound'),
        'audio': {'type': genes.get('soundType', {}).get('value', 'sfx'), 'duration_ms': max(100, int(genes.get('duration', {}).get('value', 0.5) * 5000)), 'frequency': genes.get('frequency', {}).get('value', 440)},
        'render_hints': {'mode': 'audio_waveform', 'playable': True},
    }

def grow_ecosystem(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'ecosystem', 'name': seed.get('$name', 'Ecosystem'),
        'ecosystem': {'species_count': max(2, int(genes.get('speciesCount', {}).get('value', 0.5) * 20)), 'environment': genes.get('environment', {}).get('value', 'forest'), 'stability': genes.get('stability', {}).get('value', 0.6), 'interactions': ['predation', 'symbiosis', 'competition']},
        'render_hints': {'mode': 'ecosystem_graph', 'animated': True},
    }

def grow_game(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'game', 'name': seed.get('$name', 'Game Mechanic'),
        'mechanic': {'type': genes.get('mechanicType', {}).get('value', 'turn_based'), 'complexity': genes.get('complexity', {}).get('value', 0.5), 'players': genes.get('players', {}).get('value', 2)},
        'render_hints': {'mode': 'mechanic_diagram'},
    }

def grow_alife(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'alife', 'name': seed.get('$name', 'Artificial Life'),
        'alife': {'rules': genes.get('rules', {}).get('value', 'conway'), 'grid_size': max(16, int(genes.get('gridSize', {}).get('value', 0.5) * 128)), 'initial_density': genes.get('density', {}).get('value', 0.3)},
        'render_hints': {'mode': 'cellular_automata', 'animated': True},
    }

def grow_shader(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'shader', 'name': seed.get('$name', 'Shader'),
        'shader': {'type': genes.get('shaderType', {}).get('value', 'fragment'), 'technique': genes.get('technique', {}).get('value', 'raymarching'), 'parameters': {'iterations': 64, 'epsilon': 0.001}},
        'render_hints': {'mode': 'shader_preview', 'realtime': True},
    }

def grow_particle(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'particle', 'name': seed.get('$name', 'Particle System'),
        'particles': {'emitter': genes.get('emitter', {}).get('value', 'point'), 'count': max(10, int(genes.get('count', {}).get('value', 0.5) * 1000)), 'lifetime': genes.get('lifetime', {}).get('value', 2.0), 'velocity': genes.get('velocity', {}).get('value', [0, 1, 0])},
        'render_hints': {'mode': 'particle_sim', 'animated': True},
    }

def grow_typography(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'typography', 'name': seed.get('$name', 'Typeface'),
        'typography': {'style': genes.get('style', {}).get('value', 'sans_serif'), 'weight_range': [100, 900], 'x_height': genes.get('xHeight', {}).get('value', 0.5), 'contrast': genes.get('contrast', {}).get('value', 0.3)},
        'render_hints': {'mode': 'type_specimen'},
    }

def grow_architecture(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'architecture', 'name': seed.get('$name', 'Building'),
        'building': {'style': genes.get('style', {}).get('value', 'modern'), 'floors': max(1, int(genes.get('scale', {}).get('value', 0.5) * 10)), 'symmetry': genes.get('symmetry', {}).get('value', 'bilateral'), 'materials': genes.get('materials', {}).get('value', ['concrete', 'glass'])},
        'render_hints': {'mode': '3d_building', 'rotatable': True},
    }

def grow_vehicle(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'vehicle', 'name': seed.get('$name', 'Vehicle'),
        'vehicle': {'propulsion': genes.get('propulsion', {}).get('value', 'combustion'), 'top_speed': max(10, int(genes.get('speed', {}).get('value', 0.5) * 300)), 'mass_kg': max(100, int(genes.get('mass', {}).get('value', 0.5) * 5000))},
        'render_hints': {'mode': '3d_vehicle', 'rotatable': True},
    }

def grow_furniture(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'furniture', 'name': seed.get('$name', 'Furniture'),
        'furniture': {'type': genes.get('furnitureType', {}).get('value', 'chair'), 'style': genes.get('style', {}).get('value', 'modern'), 'material': genes.get('material', {}).get('value', 'wood')},
        'render_hints': {'mode': '3d_furniture'},
    }

def grow_fashion(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'fashion', 'name': seed.get('$name', 'Garment'),
        'garment': {'type': genes.get('garmentType', {}).get('value', 'dress'), 'fabric': genes.get('fabric', {}).get('value', 'silk'), 'palette': genes.get('palette', {}).get('value', [0.8, 0.1, 0.3])},
        'render_hints': {'mode': '3d_garment'},
    }

def grow_robotics(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'robotics', 'name': seed.get('$name', 'Robot'),
        'robot': {'type': genes.get('robotType', {}).get('value', 'humanoid'), 'dof': max(3, int(genes.get('dof', {}).get('value', 0.5) * 12)), 'actuators': genes.get('actuators', {}).get('value', ['servo', 'linear'])},
        'render_hints': {'mode': '3d_robot', 'animated': True},
    }

def grow_circuit(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'circuit', 'name': seed.get('$name', 'Circuit'),
        'circuit': {'type': genes.get('circuitType', {}).get('value', 'digital'), 'components': genes.get('components', {}).get('value', ['resistor', 'capacitor', 'IC']), 'layers': max(1, int(genes.get('layers', {}).get('value', 0.5) * 6))},
        'render_hints': {'mode': 'schematic'},
    }

def grow_food(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'food', 'name': seed.get('$name', 'Recipe'),
        'recipe': {'cuisine': genes.get('cuisine', {}).get('value', 'italian'), 'complexity': genes.get('complexity', {}).get('value', 0.5), 'servings': 4, 'flavor_profile': genes.get('flavor_profile', {}).get('value', [0.5, 0.3, 0.7, 0.2, 0.1])},
        'render_hints': {'mode': 'recipe_card'},
    }

def grow_choreography(seed):
    genes = seed.get('genes', {})
    return {
        'type': 'choreography', 'name': seed.get('$name', 'Dance'),
        'choreography': {'style': genes.get('style', {}).get('value', 'contemporary'), 'tempo': genes.get('tempo', {}).get('value', 0.5), 'dancers': max(1, int(genes.get('dancers', {}).get('value', 0.5) * 8)), 'duration_beats': 32},
        'render_hints': {'mode': 'motion_timeline', 'animated': True},
    }


# Engine registry — all 26 domains
ENGINES = {
    'character': grow_character, 'sprite': grow_sprite, 'music': grow_music,
    'visual2d': grow_visual2d, 'procedural': grow_procedural,
    'fullgame': grow_fullgame, 'animation': grow_animation, 'geometry3d': grow_geometry3d,
    'narrative': grow_narrative, 'ui': grow_ui, 'physics': grow_physics,
    'audio': grow_audio, 'ecosystem': grow_ecosystem, 'game': grow_game,
    'alife': grow_alife, 'shader': grow_shader, 'particle': grow_particle,
    'typography': grow_typography, 'architecture': grow_architecture,
    'vehicle': grow_vehicle, 'furniture': grow_furniture, 'fashion': grow_fashion,
    'robotics': grow_robotics, 'circuit': grow_circuit, 'food': grow_food,
    'choreography': grow_choreography,
}


def grow_generic(seed):
    genes = seed.get('genes', {})
    gene_summary = {}
    for name, gene in genes.items():
        gene_summary[name] = {'type': gene.get('type'), 'value_preview': str(gene.get('value', ''))[:50]}
    return {
        'type': seed.get('$domain', 'unknown'), 'name': seed.get('$name', 'Artifact'),
        'gene_summary': gene_summary,
        'render_hints': {'mode': 'generic', 'description_only': True},
    }


def grow_seed(seed):
    domain = seed.get('$domain', 'character')
    engine = ENGINES.get(domain, grow_generic)
    artifact = engine(seed)
    artifact['seed_hash'] = seed.get('$hash', '')
    artifact['domain'] = domain
    artifact['generation'] = seed.get('$lineage', {}).get('generation', 0)
    return artifact
