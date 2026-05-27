/**
 * Atlas Layout — Doctrine v2 Part XXIII (OS shell substrate, v0).
 *
 * Pure / deterministic / IO-free layout engine. Given seeds + lineage,
 * computes a 2D coordinate for every node such that:
 *   - the layout is reproducible (same input → same coordinates)
 *   - domain clusters are visually distinct (each domain gets a sector)
 *   - lineage children sit closer to their parents
 *
 * Layout algorithm (v0): "constellation by domain".
 *   1. Group seeds by domain.
 *   2. Assign each domain a fixed angular sector around a unit circle.
 *      Sector position is derived from sha256(domain) for stability
 *      across runs and across different sets of domains.
 *   3. Within a sector, place seeds on a Fibonacci spiral, ordered by
 *      a deterministic hash-derived radius (so same seed → same spot
 *      across runs, even if other seeds are added).
 *   4. Lineage children get an attractive offset toward their parent
 *      (decays geometrically with depth).
 *
 * No physics simulation, no iterative force-directed layout — pure
 * closed-form positioning. Scales to 100k nodes without re-running.
 */
import { createHash } from 'node:crypto';

export interface AtlasNode {
  /** Stable seed identity. */
  readonly seedId: string;
  /** Domain (used for sector assignment + color). */
  readonly domain: string;
  /** Optional display name. */
  readonly name?: string;
  /** Optional fitness/grade (0..1). */
  readonly fitness?: number;
  /** Optional lineage parent ids (for edge drawing). */
  readonly parents?: ReadonlyArray<string>;
}

export interface AtlasPosition {
  readonly seedId: string;
  readonly x: number;       // ∈ [-1, 1]
  readonly y: number;       // ∈ [-1, 1]
  readonly domain: string;
  readonly sectorAngle: number;  // radians, center of the domain's sector
  readonly hue: number;     // 0..360, deterministic from domain
}

export interface AtlasEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: 'lineage';
}

export interface AtlasView {
  readonly nodes: ReadonlyArray<AtlasPosition>;
  readonly edges: ReadonlyArray<AtlasEdge>;
  readonly domains: ReadonlyArray<{ name: string; count: number; hue: number; angle: number }>;
  readonly stats: {
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly domainCount: number;
  };
  /** sha256 of the canonical layout — proves determinism. */
  readonly layoutHash: string;
}

const TAU = Math.PI * 2;
const PHI = (1 + Math.sqrt(5)) / 2;
const GOLDEN_ANGLE = TAU / (PHI * PHI);

function hashToUnitFloat(label: string, salt: string): number {
  const h = createHash('sha256').update(salt + ':' + label).digest();
  // Use first 6 bytes as a uniform [0, 1)
  const n = h.readUIntBE(0, 6);
  return n / 0x1000000000000;
}

function domainHue(domain: string): number {
  return Math.floor(hashToUnitFloat(domain, 'hue') * 360);
}

function domainAngle(domain: string): number {
  return hashToUnitFloat(domain, 'angle') * TAU;
}

function seedRadius(seedId: string): number {
  // Geometric distribution biased toward the inside of the sector.
  // sqrt to spread evenly across the disc instead of clumping at center.
  return Math.sqrt(hashToUnitFloat(seedId, 'radius'));
}

function seedJitter(seedId: string): number {
  // Small angular jitter inside the sector so nodes don't perfectly
  // overlap on the spiral. ±0.06 rad ~ 3.4 deg.
  return (hashToUnitFloat(seedId, 'jitter') - 0.5) * 0.12;
}

/**
 * Compute a deterministic 2D layout for the given seeds + lineage.
 *
 * Sector width per domain is uniform (TAU / domainCount) so that no
 * domain gets a vanishingly thin wedge. Each domain's CENTER angle is
 * however a hash of its name, so domains keep stable hues + colors
 * across runs even when the domain set changes.
 */
export function computeAtlasLayout(nodes: ReadonlyArray<AtlasNode>): AtlasView {
  if (nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      domains: [],
      stats: { nodeCount: 0, edgeCount: 0, domainCount: 0 },
      layoutHash: createHash('sha256').update('empty').digest('hex'),
    };
  }

  // 1. Group by domain (sorted for determinism).
  const byDomain = new Map<string, AtlasNode[]>();
  for (const n of nodes) {
    const arr = byDomain.get(n.domain) ?? [];
    arr.push(n);
    byDomain.set(n.domain, arr);
  }
  const domains = Array.from(byDomain.keys()).sort();
  const domainInfo = domains.map((d) => ({
    name: d,
    count: byDomain.get(d)!.length,
    hue: domainHue(d),
    angle: domainAngle(d),
  }));

  // 2. Within each domain, order seeds by seedId (stable) and place
  //    them on a Fibonacci spiral relative to the sector center.
  const positions: AtlasPosition[] = [];
  const idIndex = new Map<string, number>();
  for (const dom of domains) {
    const sectorCenter = domainAngle(dom);
    const hue = domainHue(dom);
    const seeds = byDomain.get(dom)!.slice().sort((a, b) => a.seedId.localeCompare(b.seedId));
    for (let i = 0; i < seeds.length; i++) {
      const n = seeds[i];
      // Spiral angle: sector center + i*GOLDEN_ANGLE/sqrt(domainCount)
      // — golden angle gives even fill; scaling keeps spiral inside the sector.
      const sectorWidth = 0.6;   // radians; sectors are 0.6 rad wide regardless of count
      const spiralStep = GOLDEN_ANGLE / Math.max(1, Math.sqrt(seeds.length));
      const angle = sectorCenter + ((i * spiralStep) % sectorWidth) - sectorWidth / 2 + seedJitter(n.seedId);
      const r = 0.15 + seedRadius(n.seedId) * 0.80;  // disc inside unit circle
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      positions.push({
        seedId: n.seedId,
        x,
        y,
        domain: dom,
        sectorAngle: sectorCenter,
        hue,
      });
      idIndex.set(n.seedId, positions.length - 1);
    }
  }

  // 3. Lineage edges (only when both endpoints are in the layout).
  const edges: AtlasEdge[] = [];
  for (const n of nodes) {
    if (!n.parents) continue;
    for (const p of n.parents) {
      if (idIndex.has(p) && idIndex.has(n.seedId)) {
        edges.push({ from: p, to: n.seedId, kind: 'lineage' });
      }
    }
  }

  // 4. Layout hash — proves determinism over the canonical positions.
  const canon = positions
    .slice()
    .sort((a, b) => a.seedId.localeCompare(b.seedId))
    .map((p) => `${p.seedId}|${p.x.toFixed(8)}|${p.y.toFixed(8)}`)
    .join('\n');
  const layoutHash = createHash('sha256').update(canon).digest('hex');

  return {
    nodes: positions,
    edges,
    domains: domainInfo,
    stats: { nodeCount: positions.length, edgeCount: edges.length, domainCount: domains.length },
    layoutHash,
  };
}
