/**
 * SubstrateMemory — Commons seeds knowledge base
 * Reads from data/commons/ — the canonical seed library, inventories, and GSPL modules.
 */

import fs from 'fs';
import path from 'path';
import { loadIndex, findByDomain, searchSeeds, COMMONS_ROOT, SEEDS_DIR } from '../commons-index';
import type { CanonicalSeedEntry } from '../commons-index';

export interface SubstrateQuery {
  domain?: string;
  tags?: string[];
  query?: string;
  limit?: number;
}

export interface SubstrateResult {
  seeds: CanonicalSeedEntry[];
  total: number;
}

export interface LibraryModule {
  name: string;
  path: string;
  size: number;
}

export interface InventoryBatch {
  domain: string;
  batch: string;
  path: string;
  size: number;
}

export class SubstrateMemory {
  private libraries: LibraryModule[] = [];
  private inventories: InventoryBatch[] = [];

  constructor() {
    this.scanLibraries();
    this.scanInventories();
  }

  querySeeds(opts: SubstrateQuery): SubstrateResult {
    let results: CanonicalSeedEntry[] = [];

    if (opts.domain) {
      results = findByDomain(opts.domain);
    } else if (opts.tags && opts.tags.length > 0) {
      results = loadIndex().seeds.filter(s => opts.tags!.some(t => s.tags.includes(t)));
    } else if (opts.query) {
      results = searchSeeds(opts.query);
    } else {
      results = loadIndex().seeds;
    }

    if (opts.limit && results.length > opts.limit) {
      results = results.slice(0, opts.limit);
    }

    return { seeds: results, total: results.length };
  }

  getSeedById(id: string): CanonicalSeedEntry | undefined {
    return loadIndex().seeds.find(s => s.id === id);
  }

  getSeedData(entry: CanonicalSeedEntry): Record<string, unknown> | null {
    const filePath = path.join(SEEDS_DIR, entry.file);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  getLibraries(): LibraryModule[] {
    return [...this.libraries];
  }

  getLibraryContent(name: string): string | null {
    const lib = this.libraries.find(l => l.name === name);
    if (!lib || !fs.existsSync(lib.path)) return null;
    return fs.readFileSync(lib.path, 'utf-8');
  }

  getInventoryBatches(): InventoryBatch[] {
    return [...this.inventories];
  }

  getInventoryContent(domain: string, batch: string): string | null {
    const item = this.inventories.find(i => i.domain === domain && i.batch === batch);
    if (!item || !fs.existsSync(item.path)) return null;
    return fs.readFileSync(item.path, 'utf-8');
  }

  getDomainCount(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const s of loadIndex().seeds) {
      counts[s.domain] = (counts[s.domain] || 0) + 1;
    }
    return counts;
  }

  private scanLibraries(): void {
    const libDir = path.join(COMMONS_ROOT, 'libraries');
    if (!fs.existsSync(libDir)) return;
    for (const file of fs.readdirSync(libDir)) {
      if (file.endsWith('.gspl')) {
        this.libraries.push({
          name: file.replace('.gspl', ''),
          path: path.join(libDir, file),
          size: fs.statSync(path.join(libDir, file)).size,
        });
      }
    }
  }

  private scanInventories(): void {
    const invDir = path.join(COMMONS_ROOT, 'inventories');
    if (!fs.existsSync(invDir)) return;
    for (const domain of fs.readdirSync(invDir)) {
      const domainDir = path.join(invDir, domain);
      if (!fs.statSync(domainDir).isDirectory()) continue;
      for (const file of fs.readdirSync(domainDir)) {
        if (file.endsWith('.gspl')) {
          this.inventories.push({
            domain,
            batch: file.replace('.gspl', ''),
            path: path.join(domainDir, file),
            size: fs.statSync(path.join(domainDir, file)).size,
          });
        }
      }
    }
  }
}