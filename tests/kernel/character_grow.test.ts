
import { describe, it, expect, beforeAll } from 'vitest';
import { Seed } from '../../src/lib/kernel/seed-class';
import { growSeed } from '../../src/lib/kernel/engines';
import { initServerPolyfills } from '../../src/lib/kernel/server-polyfills';
import * as fs from 'fs';
import * as path from 'path';

describe('Character Generation Stress Test', () => {
  beforeAll(() => {
    initServerPolyfills();
  });

  it('should grow a character seed and produce a valid GLTF file', async () => {
    const seed = new Seed('character', 'Test Hero');
    const result: any = await growSeed(seed);
    
    expect(result).toBeDefined();
    expect(result.filePath).toBeDefined();
    
    const absolutePath = path.isAbsolute(result.filePath) ? result.filePath : path.join(process.cwd(), result.filePath);
    expect(fs.existsSync(absolutePath)).toBe(true);
    
    const stats = fs.statSync(absolutePath);
    console.log(`Character GLTF size: ${stats.size} bytes`);
    expect(stats.size).toBeGreaterThan(0);
  });
});
