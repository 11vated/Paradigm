import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ─── NAMESPACE ────────────────────────────────────────────────────────────

export const SUBSTRATE_NAMESPACES = [
  'chem', 'phys', 'mat', 'fx', 'bio', 'earth', 'astro', 'math',
  'audio', 'lang', 'culture', 'arch', 'urban', 'vehicle', 'garment',
  'food', 'psy', 'power', 'form', 'move', 'medium',
] as const;

export type SubstrateNamespace = (typeof SUBSTRATE_NAMESPACES)[number];

// ─── SUBSTRATE ENTRY ──────────────────────────────────────────────────────

export interface SubstrateEntry {
  id: string;
  namespace: SubstrateNamespace;
  name: string;
  description: string;
  tags: string[];
  value: any;
  confidence: number;
  source: string;
  signature?: string;
  createdAt: string;
}

// ─── SIGNED SEED LIBRARY ─────────────────────────────────────────────────

export class SubstrateLibrary {
  private entries = new Map<string, SubstrateEntry>();
  private indexByNamespace = new Map<SubstrateNamespace, SubstrateEntry[]>();

  constructor() {
    for (const ns of SUBSTRATE_NAMESPACES) {
      this.indexByNamespace.set(ns as SubstrateNamespace, []);
    }
  }

  /**
   * Register a substrate entry.
   */
  register(entry: SubstrateEntry): void {
    this.entries.set(entry.id, entry);
    const ns = this.indexByNamespace.get(entry.namespace as SubstrateNamespace);
    if (ns) ns.push(entry);
  }

  /**
   * Get an entry by its fully-qualified ID (e.g., "chem://water").
   */
  get(id: string): SubstrateEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Query entries by namespace and optional tag filter.
   */
  query(ns: SubstrateNamespace, tag?: string, limit = 50): SubstrateEntry[] {
    const entries = this.indexByNamespace.get(ns as SubstrateNamespace) || [];
    if (tag) return entries.filter(e => e.tags.includes(tag)).slice(0, limit);
    return entries.slice(0, limit);
  }

  /**
   * Search across all namespaces.
   */
  search(query: string): SubstrateEntry[] {
    const q = query.toLowerCase();
    const results: SubstrateEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.name.toLowerCase().includes(q) ||
          entry.description.toLowerCase().includes(q) ||
          entry.tags.some(t => t.toLowerCase().includes(q))) {
        results.push(entry);
      }
    }
    return results.slice(0, 50);
  }

  /**
   * Get all entries in a namespace.
   */
  getAll(ns: SubstrateNamespace): SubstrateEntry[] {
    return this.indexByNamespace.get(ns as SubstrateNamespace) || [];
  }

  /**
   * Total entries loaded.
   */
  get size(): number { return this.entries.size; }

  /**
   * Load substrate entries from a JSON file.
   */
  loadFromFile(filePath: string): number {
    if (!fs.existsSync(filePath)) return 0;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      let count = 0;
      if (Array.isArray(data)) {
        for (const entry of data) {
          if (entry.id && entry.namespace && SUBSTRATE_NAMESPACES.includes(entry.namespace as any)) {
            this.register(entry);
            count++;
          }
        }
      }
      return count;
    } catch { return 0; }
  }

  /**
   * Save substrate entries to a JSON file.
   */
  saveToFile(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(Array.from(this.entries.values()), null, 2));
  }
}

// ─── SINGLETON ────────────────────────────────────────────────────────────

export const substrateLibrary = new SubstrateLibrary();

// ─── FOUNDATION ENTRIES (seeded from Round 4 research briefs) ────────────

export function seedFoundationPrimitives(): number {
  let count = 0;

  // Physics constants (from brief 082)
  const physConstants = [
    { name: 'speed_of_light', value: 299792458, unit: 'm/s', description: 'Speed of light in vacuum' },
    { name: 'gravitational_constant', value: 6.6743e-11, unit: 'm^3/kg/s^2', description: 'Newtonian gravitational constant' },
    { name: 'planck_constant', value: 6.62607015e-34, unit: 'J/Hz', description: 'Planck constant' },
    { name: 'elementary_charge', value: 1.602176634e-19, unit: 'C', description: 'Elementary charge' },
    { name: 'boltzmann_constant', value: 1.380649e-23, unit: 'J/K', description: 'Boltzmann constant' },
    { name: 'avogadro_number', value: 6.02214076e23, unit: '/mol', description: 'Avogadro constant' },
    { name: 'standard_gravity', value: 9.80665, unit: 'm/s^2', description: 'Standard gravitational acceleration' },
  ];
  for (const c of physConstants) {
    substrateLibrary.register({
      id: `phys://${c.name}`, namespace: 'phys', name: c.name,
      description: `${c.description} (${c.value} ${c.unit})`,
      tags: ['constant', 'physics'], value: c.value, confidence: 1.0,
      source: 'CODATA 2018', createdAt: new Date().toISOString(),
    });
    count++;
  }

  // Standard materials (from brief 083)
  const materials = [
    { name: 'water', density: 997, color: '#4a90d9', description: 'Fresh water at 25°C' },
    { name: 'copper', density: 8960, color: '#b87333', description: 'Copper metal' },
    { name: 'steel', density: 7850, color: '#808080', description: 'Mild steel' },
    { name: 'aluminum', density: 2700, color: '#c0c0c0', description: 'Aluminum metal' },
    { name: 'glass', density: 2500, color: '#e8e8e8', description: 'Soda-lime glass' },
    { name: 'wood_oak', density: 750, color: '#8b6914', description: 'Oak wood' },
    { name: 'skin', density: 1020, color: '#f5d0b0', description: 'Human skin (generic)' },
    { name: 'gold', density: 19320, color: '#ffd700', description: 'Gold metal' },
  ];
  for (const m of materials) {
    substrateLibrary.register({
      id: `mat://${m.name}`, namespace: 'mat', name: m.name,
      description: m.description, tags: ['material'],
      value: { density: m.density, color: m.color },
      confidence: 0.95, source: 'Engineering Toolbox',
      createdAt: new Date().toISOString(),
    });
    count++;
  }

  // Music theory (from brief 086C)
  const noteFreqs: Record<string, number> = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25
  };
  for (const [note, freq] of Object.entries(noteFreqs)) {
    substrateLibrary.register({
      id: `audio://note_${note}`, namespace: 'audio', name: `Note ${note}`,
      description: `Fundamental frequency of ${note}: ${freq} Hz`,
      tags: ['note', 'frequency'], value: freq,
      confidence: 1.0, source: 'ISO 16:1975',
      createdAt: new Date().toISOString(),
    });
    count++;
  }
  // Scales
  const scales = ['major', 'minor', 'pentatonic_major', 'pentatonic_minor', 'blues', 'dorian', 'mixolydian'];
  for (const scale of scales) {
    substrateLibrary.register({
      id: `audio://scale_${scale}`, namespace: 'audio', name: `Scale ${scale}`,
      description: `Music theory scale pattern for ${scale}`,
      tags: ['scale', 'music_theory'], value: scale,
      confidence: 1.0, source: 'Music Theory Standard',
      createdAt: new Date().toISOString(),
    });
    count++;
  }

  return count;
}

// ─── SUBSTRATE API ───────────────────────────────────────────────────────

export function querySubstrate(ns: string, tag?: string, limit = 50): any {
  if (SUBSTRATE_NAMESPACES.includes(ns as any)) {
    return substrateLibrary.query(ns as SubstrateNamespace, tag, limit);
  }
  return substrateLibrary.search(ns);
}
