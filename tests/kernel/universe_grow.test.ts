
import { describe, it, expect } from 'vitest';
import { Seed } from '../../src/lib/kernel/seed-class';
import { growSeed } from '../../src/lib/kernel/engines';
import * as fs from 'fs';
import * as path from 'path';

describe('Universe Generation Test', () => {
  it('should grow a universe seed and produce a valid JSON config', async () => {
    const seed = new Seed('universe', 'Test Cosmos');
    const result: any = await growSeed(seed);
    
    expect(result).toBeDefined();
    expect(result.filePath).toBeDefined();
    
    const absolutePath = path.isAbsolute(result.filePath) ? result.filePath : path.join(process.cwd(), result.filePath);
    expect(fs.existsSync(absolutePath)).toBe(true);
    
    const content = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    expect(content.universe).toBeDefined();
    expect(content.galaxies.length).toBeGreaterThan(0);
    console.log(`Universe generated with ${result.galaxyCount} galaxies.`);
  });
});
