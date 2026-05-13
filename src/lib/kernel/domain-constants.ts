export const DOMAINS = [
  'character', 'sprite', 'music', 'visual2d', 'geometry3d', 'fullgame',
  'animation', 'narrative', 'ui', 'physics', 'audio', 'ecosystem',
  'game', 'alife', 'shader', 'particle', 'procedural',
  'typography', 'architecture', 'vehicle', 'furniture', 'fashion',
  'robotics', 'circuit', 'food', 'choreography', 'agent',
] as const;

export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_SET = new Set<string>(DOMAINS);

export const DOMAIN_ALIASES: Record<string, string> = {
  '2d': 'visual2d', 'visual-2d': 'visual2d', 'visual_2d': 'visual2d', '2dvisual': 'visual2d',
  '3d': 'geometry3d', 'geometry-3d': 'geometry3d', 'geometry_3d': 'geometry3d', '3dgeometry': 'geometry3d',
  'full-game': 'fullgame', 'full_game': 'fullgame', 'full game': 'fullgame',
  'anims': 'animation', 'animations': 'animation', 'animate': 'animation',
  'narratives': 'narrative', 'story': 'narrative', 'stories': 'narrative',
  'sound': 'audio', 'sfx': 'audio',
  'ecosystems': 'ecosystem', 'eco': 'ecosystem',
  'shaders': 'shader', 'glsl': 'shader',
  'particles': 'particle', 'vfx': 'particle',
  'typo': 'typography', 'type': 'typography', 'fonts': 'typography',
  'arch': 'architecture', 'buildings': 'architecture',
  'robot': 'robotics', 'robots': 'robotics',
  'car': 'vehicle', 'cars': 'vehicle',
  'furnitures': 'furniture',
  'fashions': 'fashion', 'cloth': 'fashion', 'clothing': 'fashion',
  'circuits': 'circuit', 'electronics': 'circuit',
  'dance': 'choreography',
  'agents': 'agent', 'npc': 'agent',
  'recipes': 'food', 'recipe': 'food',
  'procgen': 'procedural', 'noise': 'procedural',
  'artificial_life': 'alife',
  'user_interface': 'ui', 'interface': 'ui',
  'algorithm': 'procedural', 'algorithms': 'procedural',
  'biology': 'ecosystem', 'biochemistry': 'ecosystem',
  'engineering': 'physics',
  'data': 'procedural', 'analytics': 'procedural',
  'camera': 'visual2d', 'photography': 'visual2d',
  'creature': 'character', 'monster': 'character', 'beast': 'character',
  'scene': 'visual2d', 'environment': 'procedural',
  'weather': 'procedural', 'climate': 'procedural',
  'lighting': 'shader', 'illumination': 'shader',
  'materials': 'procedural',
  'plant': 'ecosystem', 'plants': 'ecosystem', 'flora': 'ecosystem',
  'field': 'physics', 'force': 'physics',
  'style': 'visual2d', 'styling': 'visual2d', 'theme': 'visual2d',
  'framework': 'agent', 'system': 'agent',
  'cross-domain': 'agent', 'multidomain': 'agent', 'hybrid': 'agent',
  'fluid': 'physics', 'liquid': 'physics', 'gas': 'physics',
  'element': 'alife', 'elements': 'alife',
  'abstract': 'visual2d', 'generative': 'procedural',
};

export function resolveDomain(input: string): string | null {
  if (!input) return null;
  const lower = input.toLowerCase().trim();
  if (DOMAIN_SET.has(lower)) return lower;
  if (DOMAIN_ALIASES[lower]) return DOMAIN_ALIASES[lower];
  for (const c of DOMAINS) {
    if (c.includes(lower) || lower.includes(c)) return c;
  }
  for (const [alias, canonical] of Object.entries(DOMAIN_ALIASES)) {
    if (canonical && (alias.includes(lower) || lower.includes(alias))) return canonical;
  }
  return null;
}
