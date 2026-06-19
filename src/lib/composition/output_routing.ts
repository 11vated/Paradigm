/**
 * 20-Output Forward Render Matrix — COMPLETE per Phases 20-21
 * Declares domain → output type routing with confidence scoring.
 */

export const OUTPUT_20_TYPES = [
  'svg', 'html', 'wav', 'gltf', 'png', 'json', 'midi', 'pdb',
  'stl', 'gerber', 'sdf', 'wasm', 'story', 'code', 'structures',
  'preview', 'game', 'world', 'friend', 'quest',
] as const;

export type Output20Type = typeof OUTPUT_20_TYPES[number];

export const OUTPUT_20_MODALITIES = [
  'visual2d', 'music', 'narrative', 'geometry3d', 'sprite',
  'character', 'fullgame', 'procedural', 'physics', 'audio',
  'ecosystem', 'animation', 'agent', 'shader', 'particle',
  'typography', 'architecture', 'vehicle', 'fashion', 'robotics',
] as const;

export type OutputModality = typeof OUTPUT_20_MODALITIES[number];

export interface OutputRoute {
  modality: OutputModality;
  description: string;
  strataFocus: string[];
  renderFn: string;
}

export interface OutputTypeRoute {
  outputType: Output20Type;
  domain: string;
  mimeType: string;
  description: string;
  confidence: number;
}

// ─── 20-MODALITY DOMAIN OUTPUTS ───────────────────────────────────────────

export const OUTPUT_ROUTES: Record<OutputModality, OutputRoute> = OUTPUT_20_MODALITIES.reduce((acc, mod) => {
  acc[mod] = {
    modality: mod,
    description: `Forward render to ${mod} using kernel composition`,
    strataFocus: ['Form', 'Motion', 'Sound', 'Mind', 'Story', 'World', 'Field', 'Culture', 'Time'].slice(0, 3),
    renderFn: 'composeSeed',
  };
  return acc;
}, {} as Record<OutputModality, OutputRoute>);

export function getOutputRoute(modality: string): OutputRoute | null {
  if (OUTPUT_20_MODALITIES.includes(modality as OutputModality)) {
    return OUTPUT_ROUTES[modality as OutputModality];
  }
  return null;
}

export function listAllOutputs(): OutputModality[] {
  return [...OUTPUT_20_MODALITIES];
}

// ─── 20-OUTPUT FORWARD MATRIX (Phase 20-21) ──────────────────────────────

const OUTPUT_MATRIX: Record<string, OutputTypeRoute[]> = {
  visual2d: [
    { outputType: 'svg', domain: 'visual2d', mimeType: 'image/svg+xml', description: 'Vector generative art', confidence: 0.95 },
    { outputType: 'png', domain: 'visual2d', mimeType: 'image/png', description: 'Rasterized generative artwork', confidence: 0.90 },
    { outputType: 'preview', domain: 'visual2d', mimeType: 'application/json', description: 'Thumbnail/preview data', confidence: 0.85 },
    { outputType: 'html', domain: 'visual2d', mimeType: 'text/html', description: 'Interactive generative art page', confidence: 0.75 },
  ],
  music: [
    { outputType: 'wav', domain: 'music', mimeType: 'audio/wav', description: '16-bit 44100Hz WAV audio', confidence: 0.95 },
    { outputType: 'midi', domain: 'music', mimeType: 'audio/midi', description: 'MIDI note sequence', confidence: 0.88 },
    { outputType: 'json', domain: 'music', mimeType: 'application/json', description: 'Note/parameter data', confidence: 0.80 },
  ],
  narrative: [
    { outputType: 'story', domain: 'narrative', mimeType: 'text/plain', description: 'Generated story text', confidence: 0.95 },
    { outputType: 'html', domain: 'narrative', mimeType: 'text/html', description: 'Styled story page with player', confidence: 0.85 },
    { outputType: 'json', domain: 'narrative', mimeType: 'application/json', description: 'Story structure data', confidence: 0.80 },
  ],
  geometry3d: [
    { outputType: 'gltf', domain: 'geometry3d', mimeType: 'model/gltf+json', description: 'GLTF 3D model', confidence: 0.95 },
    { outputType: 'stl', domain: 'geometry3d', mimeType: 'model/stl', description: 'STL mesh for 3D printing', confidence: 0.90 },
    { outputType: 'sdf', domain: 'geometry3d', mimeType: 'application/x-sdf', description: 'Signed distance field', confidence: 0.75 },
    { outputType: 'json', domain: 'geometry3d', mimeType: 'application/json', description: 'Mesh geometry data', confidence: 0.80 },
  ],
  sprite: [
    { outputType: 'png', domain: 'sprite', mimeType: 'image/png', description: 'Pixel sprite sheet', confidence: 0.95 },
    { outputType: 'svg', domain: 'sprite', mimeType: 'image/svg+xml', description: 'Vector sprite', confidence: 0.85 },
    { outputType: 'preview', domain: 'sprite', mimeType: 'application/json', description: 'Sprite frame data', confidence: 0.80 },
  ],
  character: [
    { outputType: 'svg', domain: 'character', mimeType: 'image/svg+xml', description: 'Character portrait SVG', confidence: 0.90 },
    { outputType: 'json', domain: 'character', mimeType: 'application/json', description: 'Character stat block', confidence: 0.95 },
    { outputType: 'preview', domain: 'character', mimeType: 'application/json', description: 'Character preview data', confidence: 0.85 },
  ],
  fullgame: [
    { outputType: 'game', domain: 'fullgame', mimeType: 'application/json', description: 'Game scene graph', confidence: 0.90 },
    { outputType: 'html', domain: 'fullgame', mimeType: 'text/html', description: 'Playable game HTML', confidence: 0.85 },
    { outputType: 'wasm', domain: 'fullgame', mimeType: 'application/wasm', description: 'Compiled game logic', confidence: 0.60 },
    { outputType: 'code', domain: 'fullgame', mimeType: 'text/plain', description: 'Generated game source', confidence: 0.70 },
  ],
  procedural: [
    { outputType: 'png', domain: 'procedural', mimeType: 'image/png', description: 'Procedural terrain heightmap', confidence: 0.95 },
    { outputType: 'json', domain: 'procedural', mimeType: 'application/json', description: 'Procedural generation params', confidence: 0.85 },
    { outputType: 'structures', domain: 'procedural', mimeType: 'application/json', description: 'Generated structures data', confidence: 0.80 },
  ],
  physics: [
    { outputType: 'json', domain: 'physics', mimeType: 'application/json', description: 'Physics simulation state', confidence: 0.90 },
    { outputType: 'preview', domain: 'physics', mimeType: 'application/json', description: 'Physics preview data', confidence: 0.80 },
    { outputType: 'structures', domain: 'physics', mimeType: 'application/json', description: 'Physical body definitions', confidence: 0.75 },
  ],
  audio: [
    { outputType: 'wav', domain: 'audio', mimeType: 'audio/wav', description: 'Generated sound effect', confidence: 0.95 },
    { outputType: 'json', domain: 'audio', mimeType: 'application/json', description: 'Audio synthesis params', confidence: 0.80 },
  ],
  ecosystem: [
    { outputType: 'json', domain: 'ecosystem', mimeType: 'application/json', description: 'Ecosystem state/species', confidence: 0.90 },
    { outputType: 'preview', domain: 'ecosystem', mimeType: 'application/json', description: 'Ecosystem visualization data', confidence: 0.80 },
  ],
  animation: [
    { outputType: 'html', domain: 'animation', mimeType: 'text/html', description: 'Animated HTML player', confidence: 0.90 },
    { outputType: 'json', domain: 'animation', mimeType: 'application/json', description: 'Keyframe animation data', confidence: 0.95 },
    { outputType: 'preview', domain: 'animation', mimeType: 'application/json', description: 'Animation frame preview', confidence: 0.85 },
  ],
  agent: [
    { outputType: 'json', domain: 'agent', mimeType: 'application/json', description: 'Agent configuration', confidence: 0.95 },
    { outputType: 'code', domain: 'agent', mimeType: 'text/plain', description: 'Agent behavior script', confidence: 0.80 },
    { outputType: 'preview', domain: 'agent', mimeType: 'application/json', description: 'Agent personality preview', confidence: 0.85 },
  ],
  shader: [
    { outputType: 'code', domain: 'shader', mimeType: 'text/plain', description: 'GLSL shader source', confidence: 0.95 },
    { outputType: 'html', domain: 'shader', mimeType: 'text/html', description: 'Interactive shader viewer', confidence: 0.85 },
    { outputType: 'preview', domain: 'shader', mimeType: 'application/json', description: 'Shader preview data', confidence: 0.80 },
  ],
  particle: [
    { outputType: 'json', domain: 'particle', mimeType: 'application/json', description: 'Particle system config', confidence: 0.95 },
    { outputType: 'preview', domain: 'particle', mimeType: 'application/json', description: 'Particle preview data', confidence: 0.85 },
    { outputType: 'html', domain: 'particle', mimeType: 'text/html', description: 'Particle demo HTML', confidence: 0.80 },
  ],
  typography: [
    { outputType: 'svg', domain: 'typography', mimeType: 'image/svg+xml', description: 'Typography render SVG', confidence: 0.95 },
    { outputType: 'json', domain: 'typography', mimeType: 'application/json', description: 'Font metric data', confidence: 0.85 },
  ],
  architecture: [
    { outputType: 'gltf', domain: 'architecture', mimeType: 'model/gltf+json', description: 'Architectural 3D model', confidence: 0.90 },
    { outputType: 'stl', domain: 'architecture', mimeType: 'model/stl', description: 'Architecture STL mesh', confidence: 0.85 },
    { outputType: 'structures', domain: 'architecture', mimeType: 'application/json', description: 'Building structure data', confidence: 0.80 },
  ],
  vehicle: [
    { outputType: 'gltf', domain: 'vehicle', mimeType: 'model/gltf+json', description: 'Vehicle 3D model', confidence: 0.90 },
    { outputType: 'stl', domain: 'vehicle', mimeType: 'model/stl', description: 'Vehicle STL mesh', confidence: 0.85 },
    { outputType: 'json', domain: 'vehicle', mimeType: 'application/json', description: 'Vehicle spec data', confidence: 0.80 },
  ],
  fashion: [
    { outputType: 'svg', domain: 'fashion', mimeType: 'image/svg+xml', description: 'Garment design SVG', confidence: 0.88 },
    { outputType: 'json', domain: 'fashion', mimeType: 'application/json', description: 'Garment pattern data', confidence: 0.85 },
    { outputType: 'gltf', domain: 'fashion', mimeType: 'model/gltf+json', description: 'Garment 3D drape model', confidence: 0.75 },
  ],
  robotics: [
    { outputType: 'gltf', domain: 'robotics', mimeType: 'model/gltf+json', description: 'Robot 3D model', confidence: 0.90 },
    { outputType: 'json', domain: 'robotics', mimeType: 'application/json', description: 'Robot spec/kinematics', confidence: 0.95 },
    { outputType: 'code', domain: 'robotics', mimeType: 'text/plain', description: 'Robot control code', confidence: 0.80 },
  ],
};

export function routeOutput(domain: string, _artifact?: unknown): OutputTypeRoute[] {
  return OUTPUT_MATRIX[domain] ?? [
    { outputType: 'json', domain, mimeType: 'application/json', description: `Generic data for ${domain}`, confidence: 0.5 },
    { outputType: 'preview', domain, mimeType: 'application/json', description: `Generic preview for ${domain}`, confidence: 0.4 },
  ];
}

export function getOutputType(outputType: Output20Type): OutputTypeRoute[] {
  return Object.values(OUTPUT_MATRIX).flat().filter(r => r.outputType === outputType);
}

export function listOutputTypes(): Output20Type[] {
  return [...OUTPUT_20_TYPES];
}

export function listOutput20Domains(): string[] {
  return Object.keys(OUTPUT_MATRIX).sort();
}

export function output20Matrix(): { domain: string; types: { outputType: Output20Type; confidence: number }[] }[] {
  return Object.entries(OUTPUT_MATRIX).map(([domain, routes]) => ({
    domain,
    types: routes.map(r => ({ outputType: r.outputType, confidence: r.confidence })),
  }));
}
