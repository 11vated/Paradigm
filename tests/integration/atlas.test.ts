/**
 * Atlas layout + routes — Doctrine v2 Part XXIII v0.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { computeAtlasLayout, type AtlasNode } from '../../src/lib/atlas/atlas-layout';
import { registerAtlasRoutes } from '../../src/server/routes/atlas';

const SAMPLE: AtlasNode[] = [
  { seedId: 'agent-001', domain: 'agent', name: 'A1' },
  { seedId: 'agent-002', domain: 'agent', name: 'A2', parents: ['agent-001'] },
  { seedId: 'music-001', domain: 'music', name: 'M1' },
  { seedId: 'music-002', domain: 'music', name: 'M2', parents: ['music-001', 'agent-001'] },
  { seedId: 'world-001', domain: 'world', name: 'W1' },
];

describe('Doctrine v2 Part XXIII — atlas layout engine', () => {
  it('is deterministic across runs', () => {
    const a = computeAtlasLayout(SAMPLE);
    const b = computeAtlasLayout(SAMPLE);
    expect(a.layoutHash).toBe(b.layoutHash);
  });

  it('preserves nodes count and domain count', () => {
    const view = computeAtlasLayout(SAMPLE);
    expect(view.stats.nodeCount).toBe(5);
    expect(view.stats.domainCount).toBe(3);
  });

  it('places every node strictly inside the unit disc', () => {
    const view = computeAtlasLayout(SAMPLE);
    for (const n of view.nodes) {
      const r = Math.sqrt(n.x * n.x + n.y * n.y);
      expect(r).toBeLessThanOrEqual(1.0001);
      expect(r).toBeGreaterThanOrEqual(0.149);
    }
  });

  it('emits lineage edges only when both endpoints are present', () => {
    const view = computeAtlasLayout(SAMPLE);
    // music-002 has 2 parents both present; agent-002 has 1 parent present → 3 edges
    expect(view.stats.edgeCount).toBe(3);
    const edgePairs = view.edges.map((e) => `${e.from}->${e.to}`).sort();
    expect(edgePairs).toContain('agent-001->agent-002');
    expect(edgePairs).toContain('music-001->music-002');
    expect(edgePairs).toContain('agent-001->music-002');
  });

  it('drops dangling lineage references', () => {
    const view = computeAtlasLayout([
      ...SAMPLE,
      { seedId: 'orphan', domain: 'world', parents: ['nonexistent-parent'] },
    ]);
    expect(view.stats.edgeCount).toBe(3); // unchanged
  });

  it('produces stable per-seed positions across containing-set changes', () => {
    // agent-001 should land in the same spot regardless of what else is in the layout
    const a = computeAtlasLayout([{ seedId: 'agent-001', domain: 'agent' }]);
    const b = computeAtlasLayout(SAMPLE);
    const aPos = a.nodes.find((n) => n.seedId === 'agent-001')!;
    const bPos = b.nodes.find((n) => n.seedId === 'agent-001')!;
    // Same domain → same sector angle and hue
    expect(aPos.sectorAngle).toBe(bPos.sectorAngle);
    expect(aPos.hue).toBe(bPos.hue);
  });

  it('emits a stable domain palette', () => {
    const view = computeAtlasLayout(SAMPLE);
    const agent1 = view.domains.find((d) => d.name === 'agent');
    const agent2 = view.domains.find((d) => d.name === 'agent');
    expect(agent1?.hue).toBeGreaterThanOrEqual(0);
    expect(agent1?.hue).toBeLessThan(360);
    expect(agent1?.hue).toBe(agent2?.hue);
  });

  it('handles empty input', () => {
    const view = computeAtlasLayout([]);
    expect(view.stats.nodeCount).toBe(0);
    expect(view.layoutHash).toBeTruthy();
  });
});

describe('Doctrine v2 Part XXIII — atlas HTTP routes', () => {
  let app: Express;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    registerAtlasRoutes(app);
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /api/atlas/health returns a stable layout hash', async () => {
    const r1 = await (await fetch(`${baseUrl}/api/atlas/health`)).json();
    const r2 = await (await fetch(`${baseUrl}/api/atlas/health`)).json();
    expect(r1.ok).toBe(true);
    expect(r1.layoutHash).toBe(r2.layoutHash);
    expect(r1.stats.nodeCount).toBe(3);
  });

  it('GET /api/atlas returns a valid view from the commons index', async () => {
    const r = await fetch(`${baseUrl}/api/atlas?limit=50`);
    expect(r.status).toBe(200);
    const view = await r.json() as { stats: { nodeCount: number; domainCount: number }; nodes: Array<{ x: number; y: number }> };
    expect(view.stats.nodeCount).toBeGreaterThan(0);
    expect(view.stats.nodeCount).toBeLessThanOrEqual(50);
    for (const n of view.nodes) {
      const r2 = Math.sqrt(n.x * n.x + n.y * n.y);
      expect(r2).toBeLessThanOrEqual(1.0001);
    }
  });

  it('GET /api/atlas?domains=… filters correctly', async () => {
    const r = await fetch(`${baseUrl}/api/atlas?domains=music&limit=200`);
    const view = await r.json() as { nodes: Array<{ domain: string }>; stats: { domainCount: number } };
    expect(view.stats.domainCount).toBeLessThanOrEqual(1);
    for (const n of view.nodes) {
      expect(n.domain).toBe('music');
    }
  });
});
