import fs from 'fs';
import path from 'path';
import { geneTypeRegistry } from '../kernel/gene-type-registry';

const FILE_NAME = 'custom-gene-types.json';

export function persistCustomGeneTypes(dataDir: string): void {
  try {
    const data = geneTypeRegistry.serializeCustomTypes();
    if (data.length === 0) return;
    const filePath = path.join(dataDir, FILE_NAME);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch {
    // Non-critical
  }
}

export function loadCustomGeneTypes(dataDir: string): number {
  try {
    const filePath = path.join(dataDir, FILE_NAME);
    if (!fs.existsSync(filePath)) return 0;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const count = geneTypeRegistry.deserializeCustomTypes(JSON.parse(raw));
    return count;
  } catch {
    return 0;
  }
}
