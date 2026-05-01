"""
Layer 6 — Intelligence: GSPL Agent — Concept-to-Seed pipeline.
5-stage pipeline: Parse → Resolve → Plan → Assemble → Validate
Uses GPT-5.2 via Emergent LLM integration.
"""
import os
import json
import logging
from datetime import datetime, timezone
from kernel import content_hash

logger = logging.getLogger(__name__)

# Domain detection keywords
DOMAIN_KEYWORDS = {
    'character': ['character', 'warrior', 'hero', 'villain', 'person', 'knight', 'mage', 'wizard', 'soldier', 'npc', 'avatar', 'creature', 'monster', 'beast', 'alien', 'human', 'elf', 'dwarf'],
    'sprite': ['sprite', 'pixel', 'pixel art', 'icon', '2d art', 'tileset', 'animation frame'],
    'music': ['music', 'song', 'melody', 'beat', 'soundtrack', 'composition', 'tune', 'rhythm', 'harmony', 'symphony'],
    'visual2d': ['image', 'painting', 'drawing', 'artwork', 'illustration', 'abstract', 'poster', 'landscape', 'portrait'],
    'procedural': ['terrain', 'world', 'map', 'landscape', 'biome', 'heightmap', 'procedural', 'generation'],
    'animation': ['animation', 'motion', 'movement', 'walk cycle', 'run cycle'],
    'narrative': ['story', 'narrative', 'plot', 'dialogue', 'quest', 'lore', 'tale'],
    'audio': ['sound', 'effect', 'sfx', 'ambient', 'noise', 'audio'],
    'fullgame': ['game', 'level', 'gameplay', 'platformer', 'rpg', 'puzzle'],
    'geometry3d': ['3d', 'mesh', 'model', 'sculpture', 'geometry', 'object'],
    'physics': ['physics', 'simulation', 'particle', 'force', 'gravity'],
    'ecosystem': ['ecosystem', 'ecology', 'environment', 'nature', 'evolution'],
    'ui': ['interface', 'ui', 'ux', 'dashboard', 'menu', 'button', 'layout'],
    'alife': ['artificial life', 'alife', 'organism', 'cellular'],
}

SEED_SYSTEM_PROMPT = """You are the GSPL Agent — the intelligence layer of the Paradigm genetic computing platform. 
Your task is to convert natural-language descriptions into UniversalSeed JSON structures.

A UniversalSeed has this structure:
{
  "$gst": "1.0",
  "$domain": "<one of 26 domains>",
  "$name": "<descriptive name>",
  "$lineage": {"parents": [], "operation": "primordial", "generation": 0},
  "genes": {
    "<gene_name>": {"type": "<one of 17 types>", "value": <appropriate value>}
  }
}

The 17 gene types are:
1. scalar — numeric value (0.0 to 1.0 for normalized, or any float)
2. categorical — string from a set of choices
3. vector — array of numbers [r, g, b] or [x, y, z]
4. expression — mathematical formula as string "sin(x * pi)"
5. struct — object with named fields {"field1": value1}
6. array — ordered list [item1, item2, ...]
7. graph — {"nodes": [...], "edges": [...]}
8. topology — surface descriptor {"vertices": [...], "faces": [...]}
9. temporal — time signal {"keyframes": [{"time": 0, "value": 1}], "envelope": {"attack": 0.1, "decay": 0.2, "sustain": 0.7, "release": 0.3}}
10. regulatory — control network {"nodes": [...], "edges": [...]}
11. field — spatial distribution {"type": "perlin", "parameters": {"octaves": 4}}
12. symbolic — abstract structure (string or nested object)
13. quantum — superposition {"amplitudes": [0.7, 0.7], "basis": ["style_a", "style_b"]}
14. gematria — {"sequence": "name", "system": "english", "computed_value": 123}
15. resonance — {"fundamentals": [440], "partials": [{"freq_ratio": 2, "amplitude": 0.5, "phase": 0}], "damping": 0.1}
16. dimensional — embedding vector [0.1, -0.3, 0.8, ...]
17. sovereignty — {"author_pubkey": "..."} (added by signing, don't generate)

Domains: character, sprite, music, fullgame, animation, procedural, geometry3d, narrative, ui, physics, visual2d, audio, ecosystem, game, alife, shader, particle, typography, architecture, vehicle, furniture, fashion, robotics, circuit, food, choreography

IMPORTANT RULES:
- Generate 5-12 genes that fully describe the concept
- Use diverse gene types (not just scalars)
- Values must be appropriate for the type
- $domain must match the concept
- Be creative and detailed in gene choices
- scalar values should typically be 0.0-1.0 (normalized) unless there's a specific range
- Always include relevant categorical genes for classification
- Include at least one vector gene for visual properties

Return ONLY valid JSON — no markdown, no explanation, just the seed object."""


def detect_domain(text):
    """Detect the most likely domain from natural language input."""
    text_lower = text.lower()
    scores = {}
    for domain, keywords in DOMAIN_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[domain] = score
    if scores:
        return max(scores, key=scores.get)
    return 'character'


async def generate_seed_from_prompt(prompt, domain_hint=None):
    """Generate a UniversalSeed from a natural-language prompt using GPT-5.2."""
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        return _generate_fallback_seed(prompt, domain_hint)

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import uuid

        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message=SEED_SYSTEM_PROMPT
        )
        chat.with_model("openai", "gpt-5.2")

        detected_domain = domain_hint or detect_domain(prompt)
        user_msg = UserMessage(
            text=f"Create a UniversalSeed for domain '{detected_domain}' from this description: {prompt}"
        )
        response = await chat.send_message(user_msg)
        response_text = response.strip()
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1] if lines[-1].strip() == '```' else lines[1:])
        seed_data = json.loads(response_text)
        if '$gst' not in seed_data:
            seed_data['$gst'] = '1.0'
        if '$domain' not in seed_data:
            seed_data['$domain'] = detected_domain
        if '$lineage' not in seed_data:
            seed_data['$lineage'] = {
                'parents': [],
                'operation': 'primordial',
                'generation': 0,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        seed_data['$hash'] = content_hash(seed_data)
        from evolution import evaluate_fitness
        seed_data['$fitness'] = evaluate_fitness(seed_data)
        return seed_data

    except Exception as e:
        logger.error(f"LLM seed generation failed: {e}")
        return _generate_fallback_seed(prompt, domain_hint)


def _generate_fallback_seed(prompt, domain_hint=None):
    """Generate a template seed when LLM is unavailable."""
    domain = domain_hint or detect_domain(prompt)
    words = prompt.lower().split()

    templates = {
        'character': {
            'size': {'type': 'scalar', 'value': 0.75},
            'archetype': {'type': 'categorical', 'value': 'warrior'},
            'strength': {'type': 'scalar', 'value': 0.6},
            'agility': {'type': 'scalar', 'value': 0.5},
            'palette': {'type': 'vector', 'value': [0.4, 0.3, 0.2]},
            'personality': {'type': 'struct', 'value': {'trait': 'brave', 'alignment': 'neutral'}},
            'motion': {'type': 'temporal', 'value': {'keyframes': [{'time': 0, 'value': 0}, {'time': 1, 'value': 1}], 'envelope': {'attack': 0.1, 'decay': 0.2, 'sustain': 0.7, 'release': 0.3}}},
            'nameResonance': {'type': 'gematria', 'value': {'sequence': prompt[:20], 'system': 'english', 'computed_value': sum(ord(c) for c in prompt[:20])}},
        },
        'sprite': {
            'resolution': {'type': 'scalar', 'value': 0.5},
            'paletteSize': {'type': 'scalar', 'value': 0.5},
            'colors': {'type': 'vector', 'value': [0.6, 0.3, 0.8]},
            'symmetry': {'type': 'categorical', 'value': 'bilateral'},
            'animation': {'type': 'temporal', 'value': {'keyframes': [{'time': 0, 'value': 0}, {'time': 0.5, 'value': 1}, {'time': 1, 'value': 0}]}},
        },
        'music': {
            'tempo': {'type': 'scalar', 'value': 0.6},
            'key': {'type': 'categorical', 'value': 'C'},
            'scale': {'type': 'categorical', 'value': 'minor'},
            'melody': {'type': 'array', 'value': [60, 62, 64, 65, 67, 69, 71, 72]},
            'timbre': {'type': 'resonance', 'value': {'fundamentals': [440], 'partials': [{'freq_ratio': 2, 'amplitude': 0.5, 'phase': 0}], 'damping': 0.1}},
            'dynamics': {'type': 'temporal', 'value': {'envelope': {'attack': 0.05, 'decay': 0.1, 'sustain': 0.8, 'release': 0.4}}},
        },
        'visual2d': {
            'style': {'type': 'categorical', 'value': 'abstract'},
            'complexity': {'type': 'scalar', 'value': 0.6},
            'palette': {'type': 'vector', 'value': [0.5, 0.3, 0.8]},
            'composition': {'type': 'categorical', 'value': 'asymmetric'},
            'texture': {'type': 'field', 'value': {'type': 'perlin', 'parameters': {'octaves': 4, 'persistence': 0.5}}},
        },
        'procedural': {
            'octaves': {'type': 'scalar', 'value': 0.5},
            'persistence': {'type': 'scalar', 'value': 0.5},
            'scale': {'type': 'scalar', 'value': 0.5},
            'biome': {'type': 'categorical', 'value': 'temperate'},
            'heightField': {'type': 'field', 'value': {'type': 'perlin', 'parameters': {'octaves': 6, 'persistence': 0.45, 'lacunarity': 2.0}}},
        },
    }

    genes = templates.get(domain, templates['character'])
    if 'dark' in words or 'menacing' in words or 'evil' in words:
        if 'palette' in genes:
            genes['palette']['value'] = [0.1, 0.05, 0.15]
        if 'archetype' in genes:
            genes['archetype']['value'] = 'dark_knight'
    if 'bright' in words or 'light' in words or 'holy' in words:
        if 'palette' in genes:
            genes['palette']['value'] = [0.9, 0.85, 0.7]
        if 'archetype' in genes:
            genes['archetype']['value'] = 'paladin'

    name = ' '.join(w.capitalize() for w in prompt.split()[:4])
    seed_data = {
        '$gst': '1.0',
        '$domain': domain,
        '$name': name,
        '$lineage': {
            'parents': [],
            'operation': 'primordial',
            'generation': 0,
            'timestamp': datetime.now(timezone.utc).isoformat()
        },
        'genes': genes,
        '$metadata': {
            'engine_version': '1.0.0',
            'tags': words[:5],
            'source': 'agent_fallback'
        }
    }
    seed_data['$hash'] = content_hash(seed_data)
    from evolution import evaluate_fitness
    seed_data['$fitness'] = evaluate_fitness(seed_data)
    return seed_data
