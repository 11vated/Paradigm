import { describe, it, expect } from 'vitest';
import {
  OUTPUT_20_TYPES, OUTPUT_20_MODALITIES,
  getOutputRoute, listAllOutputs,
  routeOutput, getOutputType, listOutputTypes,
  listOutput20Domains, output20Matrix,
} from '../../src/lib/composition/output_routing.js';

describe('OUTPUT_20_TYPES', () => {
  it('has exactly 20 output types', () => {
    expect(OUTPUT_20_TYPES).toHaveLength(20);
  });

  it('includes expected output types', () => {
    const types = ['svg', 'html', 'wav', 'gltf', 'png', 'json', 'midi', 'pdb',
      'stl', 'gerber', 'sdf', 'wasm', 'story', 'code', 'structures',
      'preview', 'game', 'world', 'friend', 'quest'];
    for (const t of types) {
      expect(OUTPUT_20_TYPES).toContain(t);
    }
  });
});

describe('OUTPUT_20_MODALITIES', () => {
  it('has exactly 20 modalities', () => {
    expect(OUTPUT_20_MODALITIES).toHaveLength(20);
  });

  it('includes expected modalities', () => {
    const mods = ['visual2d', 'music', 'narrative', 'geometry3d', 'sprite',
      'character', 'fullgame', 'procedural', 'physics', 'audio',
      'ecosystem', 'animation', 'agent', 'shader', 'particle',
      'typography', 'architecture', 'vehicle', 'fashion', 'robotics'];
    for (const m of mods) {
      expect(OUTPUT_20_MODALITIES).toContain(m);
    }
  });
});

describe('getOutputRoute', () => {
  it('returns route for known modality', () => {
    const route = getOutputRoute('visual2d');
    expect(route).not.toBeNull();
    expect(route!.modality).toBe('visual2d');
    expect(route!.renderFn).toBe('composeSeed');
    expect(route!.strataFocus.length).toBeGreaterThan(0);
  });

  it('returns null for unknown modality', () => {
    expect(getOutputRoute('nonexistent')).toBeNull();
  });

  it('returns route for music', () => {
    const route = getOutputRoute('music');
    expect(route).not.toBeNull();
    expect(route!.description).toContain('music');
  });
});

describe('listAllOutputs', () => {
  it('returns all 20 modalities', () => {
    expect(listAllOutputs()).toHaveLength(20);
  });

  it('returns a fresh copy each call', () => {
    const a = listAllOutputs();
    const b = listAllOutputs();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

describe('routeOutput — 20-output forward matrix', () => {
  it('visual2d routes to svg, png, preview, html', () => {
    const routes = routeOutput('visual2d');
    expect(routes.length).toBe(4);
    const types = routes.map(r => r.outputType);
    expect(types).toContain('svg');
    expect(types).toContain('png');
    expect(types).toContain('preview');
  });

  it('music routes to wav, midi, json', () => {
    const routes = routeOutput('music');
    expect(routes.length).toBe(3);
    expect(routes.map(r => r.outputType)).toContain('wav');
    expect(routes.map(r => r.outputType)).toContain('midi');
  });

  it('fullgame routes to game, html, wasm, code', () => {
    const routes = routeOutput('fullgame');
    expect(routes.length).toBe(4);
    const types = routes.map(r => r.outputType);
    expect(types).toContain('game');
    expect(types).toContain('wasm');
    expect(types).toContain('code');
  });

  it('all routes have positive confidence', () => {
    for (const mod of OUTPUT_20_MODALITIES) {
      const routes = routeOutput(mod);
      for (const r of routes) {
        expect(r.confidence).toBeGreaterThan(0);
        expect(r.confidence).toBeLessThanOrEqual(1);
      }
    }
  });

  it('all routes have mimeType', () => {
    for (const mod of OUTPUT_20_MODALITIES) {
      const routes = routeOutput(mod);
      for (const r of routes) {
        expect(r.mimeType).toBeTruthy();
      }
    }
  });

  it('unknown domain gets generic fallback', () => {
    const routes = routeOutput('unknown-domain');
    expect(routes.length).toBe(2);
    expect(routes[0].outputType).toBe('json');
    expect(routes[1].outputType).toBe('preview');
  });
});

describe('getOutputType — reverse lookup', () => {
  it('finds all svg routes', () => {
    const svgRoutes = getOutputType('svg');
    expect(svgRoutes.length).toBeGreaterThanOrEqual(4);
    for (const r of svgRoutes) {
      expect(r.outputType).toBe('svg');
    }
  });

  it('finds all json routes', () => {
    const jsonRoutes = getOutputType('json');
    expect(jsonRoutes.length).toBeGreaterThan(5);
  });

  it('returns empty for nonexistent type', () => {
    const routes = getOutputType('xyz' as any);
    expect(routes).toEqual([]);
  });
});

describe('listOutputTypes / listOutput20Domains', () => {
  it('listOutputTypes returns 20 types', () => {
    expect(listOutputTypes()).toHaveLength(20);
  });

  it('listOutput20Domains returns all matrix domains', () => {
    const domains = listOutput20Domains();
    expect(domains.length).toBe(20);
    expect(domains).toContain('visual2d');
    expect(domains).toContain('robotics');
  });
});

describe('output20Matrix', () => {
  it('returns structured matrix with all 20 domains', () => {
    const matrix = output20Matrix();
    expect(matrix).toHaveLength(20);
    for (const entry of matrix) {
      expect(entry.domain).toBeTruthy();
      expect(entry.types.length).toBeGreaterThan(0);
      for (const t of entry.types) {
        expect(t.confidence).toBeGreaterThan(0);
        expect(t.confidence).toBeLessThanOrEqual(1);
      }
    }
  });

  it('visual2d entry has 4 output types', () => {
    const matrix = output20Matrix();
    const visual2d = matrix.find(m => m.domain === 'visual2d');
    expect(visual2d).toBeDefined();
    expect(visual2d!.types).toHaveLength(4);
  });
});
