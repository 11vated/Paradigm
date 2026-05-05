import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface GsplSeed {
  id: string;
  $domain: string;
  $name: string;
  $lineage: { generation: number; operation: string };
  $hash: string;
  $fitness: { overall: number };
  $sovereignty?: { signature: string; signed_at: string };
  $embedding?: number[];
  genes: Record<string, any>;
}

export function parseGsplValue(valueStr: string): any {
  valueStr = valueStr.trim();
  if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
    return { type: 'categorical', value: valueStr.slice(1, -1) };
  }
  if (!isNaN(Number(valueStr))) {
    return { type: 'scalar', value: Number(valueStr) };
  }
  if (valueStr === 'true' || valueStr === 'false') {
    return { type: 'categorical', value: valueStr === 'true' };
  }
  if (valueStr.startsWith('Std.')) {
    return { type: 'categorical', value: valueStr };
  }
  if (valueStr.startsWith('[')) {
    try {
      // Try to parse as JSON array if it's simple
      const parsed = JSON.parse(valueStr);
      if (Array.isArray(parsed)) {
        return { type: 'vector', value: parsed };
      }
    } catch (_) {
      // If not valid JSON, try to extract numbers
      const numbers = valueStr.match(/-?\d+(\.\d+)?/g);
      if (numbers) {
        return { type: 'vector', value: numbers.map(Number) };
      }
    }
    return { type: 'vector', value: valueStr };
  }
  return { type: 'categorical', value: valueStr };
}

export function parseGsplFile(content: string, domain: string): GsplSeed[] {
  const seeds: GsplSeed[] = [];
  
  // Find all seed blocks
  const seedRegex = /seed\s+Std\.([A-Za-z]+)\.Seed\s*\{([\s\S]*?)\n\s*\}/g;
  let match;
  
  while ((match = seedRegex.exec(content)) !== null) {
    const body = match[2];
    const genes: Record<string, any> = {};
    let name = `Unknown ${domain} seed`;
    
    // Better parsing logic to handle nested structures
    let currentKey = '';
    let currentValue = '';
    let depth = 0;
    let inString = false;
    let parsingKey = true;
    
    for (let i = 0; i < body.length; i++) {
      const char = body[i];
      
      if (char === '"' && body[i-1] !== '\\') {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{' || char === '[' || char === '(') depth++;
        if (char === '}' || char === ']' || char === ')') depth--;
      }
      
      if (char === '=' && depth === 0 && !inString && parsingKey) {
        // We found a key
        currentKey = currentKey.trim();
        parsingKey = false;
        continue;
      }
      
      if (char === ',' && depth === 0 && !inString) {
        // We found the end of a value
        if (currentKey) {
          if (currentKey === 'name') {
            name = currentValue.trim().replace(/"/g, '');
          } else if (currentKey !== 'version' && currentKey !== 'provenance' && currentKey !== 'lineage') {
            genes[currentKey] = parseGsplValue(currentValue.trim());
          }
        }
        currentKey = '';
        currentValue = '';
        parsingKey = true;
        continue;
      }
      
      if (parsingKey) {
        if (char.trim() !== '' || currentKey !== '') {
          currentKey += char;
        }
      } else {
        if (char.trim() !== '' || currentValue !== '') {
          currentValue += char;
        }
      }
    }
    
    // Handle the last key-value pair if it doesn't end with a comma
    if (currentKey && currentValue) {
      if (currentKey === 'name') {
        name = currentValue.trim().replace(/"/g, '');
      } else if (currentKey !== 'version' && currentKey !== 'provenance' && currentKey !== 'lineage') {
        genes[currentKey] = parseGsplValue(currentValue.trim());
      }
    }
    
    seeds.push({
      id: crypto.randomUUID(),
      $domain: domain,
      $name: name,
      $lineage: { generation: 0, operation: 'primordial' },
      $hash: crypto.createHash('sha256').update(name + Date.now().toString()).digest('hex'),
      $fitness: { overall: 1.0 },
      genes
    });
  }
  
  return seeds;
}

export function loadAllGsplSeeds(): GsplSeed[] {
  const seeds: GsplSeed[] = [];
  const dataDir = path.join(process.cwd(), 'data', 'seed-commons', 'inventories');
  
  if (!fs.existsSync(dataDir)) return seeds;

  function walk(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (fullPath.endsWith('.gspl')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const domainMatch = fullPath.match(/inventories[\\/]([^\\/]+)/);
        const domain = domainMatch ? domainMatch[1] : 'unknown';
        
        const fileSeeds = parseGsplFile(content, domain);
        seeds.push(...fileSeeds);
      }
    }
  }
  
  walk(dataDir);
  return seeds;
}
