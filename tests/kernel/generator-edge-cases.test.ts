/**
 * Generator Edge Case Tests
 * 
 * Tests boundary conditions, invalid inputs, and error handling
 * for all 13 flagship generators with correct API (seed, outputPath).
 * 
 * Phase 17: Test Coverage to 90%+
 * Target: +5% coverage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Seed } from '../../src/lib/kernel/engines';

// Import flagship generators
import { generateCharacterV3 } from '../../src/lib/kernel/generators/character';
import { generateMusicV3 } from '../../src/lib/kernel/generators/music';
import { generateVisual2DV3 } from '../../src/lib/kernel/generators/visual2d';
import { generateAnimationV3 } from '../../src/lib/kernel/generators/animation';
import { generateSpriteV3 } from '../../src/lib/kernel/generators/sprite';
import { generateGeometry3DV4 } from '../../src/lib/kernel/generators/geometry3d';
import { generateWorld } from '../../src/lib/kernel/generators/world';
import { generateWebsite } from '../../src/lib/kernel/generators/website';
import { generateMolecule } from '../../src/lib/kernel/generators/molecule';
import { generateQuantum } from '../../src/lib/kernel/generators/quantum';
import { generateCosmology } from '../../src/lib/kernel/generators/cosmology';
import { generateField } from '../../src/lib/kernel/generators/field';
import { generateFullGameV3 } from '../../src/lib/kernel/generators/fullgame';

// Test output directory
let testOutputDir: string;

beforeEach(() => {
  testOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paradigm-edge-test-'));
});

afterEach(() => {
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  }
});

describe('Generator Edge Cases', () => {
  describe('Character Generator', () => {
    it('should handle minimal seed', async () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'MinChar',
        $hash: 'test-hash-minimal',
        genes: {}
      };
      const outputPath = path.join(testOutputDir, 'char-minimal.glb');
      const result = await generateCharacterV3(seed, outputPath);
      expect(result).toBeDefined();
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it('should handle maximum complexity', async () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'MaxChar',
        $hash: 'test-hash-max',
        genes: {
          quality: { type: 'enum', value: 'photorealistic' },
          complexity: { type: 'float', value: 1.0 }
        }
      };
      const outputPath = path.join(testOutputDir, 'char-max.glb');
      const result = await generateCharacterV3(seed, outputPath);
      expect(result).toBeDefined();
      expect(result.vertices).toBeGreaterThan(0);
    });

    it('should handle empty genes object', async () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'EmptyGenes',
        $hash: 'test-hash-empty',
        genes: {}
      };
      const outputPath = path.join(testOutputDir, 'char-empty.glb');
      const result = await generateCharacterV3(seed, outputPath);
      expect(result).toBeDefined();
    });

    it('should handle very long name', async () => {
      const longName = 'A'.repeat(1000);
      const seed: Seed = {
        $domain: 'character',
        $name: longName,
        $hash: 'test-hash-long',
        genes: {}
      };
      const outputPath = path.join(testOutputDir, 'char-long.glb');
      const result = await generateCharacterV3(seed, outputPath);
      expect(result).toBeDefined();
    });

    it('should handle special characters in name', async () => {
      const seed: Seed = {
        $domain: 'character',
        $name: '特殊字符-🎮-Test',
        $hash: 'test-hash-special',
        genes: {}
      };
      const outputPath = path.join(testOutputDir, 'char-special.glb');
      const result = await generateCharacterV3(seed, outputPath);
      expect(result).toBeDefined();
    });
  });

  describe('Music Generator', () => {
    it('should handle minimal seed', async () => {
      const seed: Seed = {
        $domain: 'music',
        $name: 'MinMusic',
        $hash: 'test-hash-music-min',
        genes: {}
      };
      const outputDir = path.join(testOutputDir, 'music-minimal');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateMusicV3(seed, outputDir);
      expect(result).toBeDefined();
      expect(fs.existsSync(path.join(outputDir, `music_${seed.$hash}.wav`))).toBe(true);
    });

    it('should handle maximum duration', async () => {
      const seed: Seed = {
        $domain: 'music',
        $name: 'LongMusic',
        $hash: 'test-hash-music-long',
        genes: {
          duration: { type: 'float', value: 300 } // 5 minutes
        }
      };
      const outputDir = path.join(testOutputDir, 'music-long');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateMusicV3(seed, outputDir);
      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle extreme tempo', async () => {
      const seed: Seed = {
        $domain: 'music',
        $name: 'FastMusic',
        $hash: 'test-hash-music-fast',
        genes: {
          tempo: { type: 'float', value: 200 }
        }
      };
      const outputDir = path.join(testOutputDir, 'music-fast');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateMusicV3(seed, outputDir);
      expect(result).toBeDefined();
    });
  });

  describe('Visual2D Generator', () => {
    it('should handle minimal seed', async () => {
      const seed: Seed = {
        $domain: 'visual2d',
        $name: 'MinVisual',
        $hash: 'test-hash-visual-min',
        genes: {}
      };
      const outputDir = path.join(testOutputDir, 'visual-minimal');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateVisual2DV3(seed, outputDir);
      expect(result).toBeDefined();
      expect(fs.existsSync(result.pngPath)).toBe(true);
    }, 120000);

    it('should handle 4K resolution', async () => {
      const seed: Seed = {
        $domain: 'visual2d',
        $name: '4KVisual',
        $hash: 'test-hash-visual-4k',
        genes: {
          resolution: { type: 'float', value: 1.0 }
        }
      };
      const outputDir = path.join(testOutputDir, 'visual-4k');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateVisual2DV3(seed, outputDir);
      expect(result).toBeDefined();
      expect(result.resolution).toBe(4096);
    }, 60000);

    it('should handle maximum layers', async () => {
      const seed: Seed = {
        $domain: 'visual2d',
        $name: 'LayeredVisual',
        $hash: 'test-hash-visual-layers',
        genes: {
          layers: { type: 'int', value: 20 }
        }
      };
      const outputDir = path.join(testOutputDir, 'visual-layers');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateVisual2DV3(seed, outputDir);
      expect(result).toBeDefined();
      expect(result.layers).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Animation Generator', () => {
    it('should handle minimal seed', async () => {
      const seed: Seed = {
        $domain: 'animation',
        $name: 'MinAnim',
        $hash: 'test-hash-anim-min',
        genes: {}
      };
      const outputDir = path.join(testOutputDir, 'anim-minimal');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateAnimationV3(seed, outputDir);
      expect(result).toBeDefined();
    });

    it('should handle high frame rate', async () => {
      const seed: Seed = {
        $domain: 'animation',
        $name: 'HighFPSAnim',
        $hash: 'test-hash-anim-fps',
        genes: {
          fps: { type: 'int', value: 120 }
        }
      };
      const outputDir = path.join(testOutputDir, 'anim-highfps');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateAnimationV3(seed, outputDir);
      expect(result).toBeDefined();
    });
  });

  describe('Sprite Generator', () => {
    it('should handle minimal seed', async () => {
      const seed: Seed = {
        $domain: 'sprite',
        $name: 'MinSprite',
        $hash: 'test-hash-sprite-min',
        genes: {}
      };
      const outputDir = path.join(testOutputDir, 'sprite-minimal');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateSpriteV3(seed, outputDir);
      expect(result).toBeDefined();
    });

    it('should handle maximum frames', async () => {
      const seed: Seed = {
        $domain: 'sprite',
        $name: 'AnimatedSprite',
        $hash: 'test-hash-sprite-frames',
        genes: {
          frames: { type: 'int', value: 64 }
        }
      };
      const outputDir = path.join(testOutputDir, 'sprite-animated');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateSpriteV3(seed, outputDir);
      expect(result).toBeDefined();
    });
  });

  describe('Geometry3D Generator', () => {
    it('should handle minimal seed', async () => {
      const seed: Seed = {
        $domain: 'geometry3d',
        $name: 'MinGeometry',
        $hash: 'test-hash-geo-min',
        genes: {}
      };
      const outputDir = path.join(testOutputDir, 'geo-minimal');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateGeometry3DV4(seed, path.join(outputDir, 'geo-minimal.glb'));
      expect(result).toBeDefined();
    }, 60000);

    it('should handle high polygon count', async () => {
      const seed: Seed = {
        $domain: 'geometry3d',
        $name: 'HighPolyGeometry',
        $hash: 'test-hash-geo-poly-2',
        genes: {
          quality: { type: 'enum', value: 'ultra' },
          primitive: { type: 'enum', value: 'sphere' },
          params: { type: 'vec3', value: [1.0, 0.5, 0.5] }
        }
      };
      const outputDir = path.join(testOutputDir, 'geo-highpoly');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateGeometry3DV4(seed, path.join(outputDir, 'geo-highpoly.glb'));
      expect(result).toBeDefined();
      expect(result.vertices).toBeGreaterThan(0);
    }, 60000);
  });

  describe('World Generator', () => {
    it('should handle minimal seed', async () => {
      const seed: Seed = {
        $domain: 'world',
        $name: 'MinWorld',
        $hash: 'test-hash-world-min',
        genes: {}
      };
      const outputPath = path.join(testOutputDir, 'world-minimal.json');
      const result = await generateWorld(seed, outputPath);
      expect(result).toBeDefined();
    }, 60000);

    it('should handle large world size', async () => {
      const seed: Seed = {
        $domain: 'world',
        $name: 'LargeWorld',
        $hash: 'test-hash-world-large',
        genes: {
          size: { type: 'float', value: 1.0 }
        }
      };
      const outputPath = path.join(testOutputDir, 'world-large.json');
      const result = await generateWorld(seed, outputPath);
      expect(result).toBeDefined();
    }, 60000);
  });

  describe('Website Generator', () => {
    it('should handle minimal seed', async () => {
      const seed: Seed = {
        $domain: 'website',
        $name: 'MinWebsite',
        $hash: 'test-hash-web-min',
        genes: {}
      };
      const outputPath = path.join(testOutputDir, 'website-minimal.html');
      const result = await generateWebsite(seed, outputPath);
      expect(result).toBeDefined();
    });

    it('should handle complex website', async () => {
      const seed: Seed = {
        $domain: 'website',
        $name: 'ComplexWebsite',
        $hash: 'test-hash-web-complex',
        genes: {
          pages: { type: 'int', value: 10 },
          complexity: { type: 'float', value: 1.0 }
        }
      };
      const outputPath = path.join(testOutputDir, 'website-complex.html');
      const result = await generateWebsite(seed, outputPath);
      expect(result).toBeDefined();
    });
  });

  describe('Molecule Generator', () => {
    it('should handle minimal seed', async () => {
      const seed: Seed = {
        $domain: 'molecule',
        $name: 'MinMolecule',
        $hash: 'test-hash-mol-min',
        genes: {}
      };
      const outputPath = path.join(testOutputDir, 'molecule-minimal.pdb');
      const result = await generateMolecule(seed, outputPath);
      expect(result).toBeDefined();
    });

    it('should handle large molecule', async () => {
      const seed: Seed = {
        $domain: 'molecule',
        $name: 'LargeMolecule',
        $hash: 'test-hash-mol-large',
        genes: {
          atoms: { type: 'int', value: 1000 }
        }
      };
      const outputPath = path.join(testOutputDir, 'molecule-large.pdb');
      const result = await generateMolecule(seed, outputPath);
      expect(result).toBeDefined();
    });
  });

  describe('Quantum Generator', () => {
    it('should handle minimal seed', async () => {
      const seed: Seed = {
        $domain: 'quantum',
        $name: 'MinQuantum',
        $hash: 'test-hash-quantum-min',
        genes: {}
      };
      const outputPath = path.join(testOutputDir, 'quantum-minimal.json');
      const result = await generateQuantum(seed, outputPath);
      expect(result).toBeDefined();
    });

    it('should handle high qubit count', async () => {
      const seed: Seed = {
        $domain: 'quantum',
        $name: 'HighQubitQuantum',
        $hash: 'test-hash-quantum-qubits',
        genes: {
          qubits: { type: 'int', value: 20 }
        }
      };
      const outputPath = path.join(testOutputDir, 'quantum-highqubit.json');
      const result = await generateQuantum(seed, outputPath);
      expect(result).toBeDefined();
    });
  });

  describe('Cosmology Generator', () => {
    it('should handle minimal seed', async () => {
      const seed: Seed = {
        $domain: 'cosmology',
        $name: 'MinCosmology',
        $hash: 'test-hash-cosmo-min',
        genes: {}
      };
      const outputPath = path.join(testOutputDir, 'cosmology-minimal.json');
      const result = await generateCosmology(seed, outputPath);
      expect(result).toBeDefined();
    });

    it('should handle large universe', async () => {
      const seed: Seed = {
        $domain: 'cosmology',
        $name: 'LargeUniverse',
        $hash: 'test-hash-cosmo-large',
        genes: {
          scale: { type: 'float', value: 1.0 }
        }
      };
      const outputPath = path.join(testOutputDir, 'cosmology-large.json');
      const result = await generateCosmology(seed, outputPath);
      expect(result).toBeDefined();
    });
  });

  describe('Field Generator', () => {
    it('should handle minimal seed', async () => {
      const seed: Seed = {
        $domain: 'field',
        $name: 'MinField',
        $hash: 'test-hash-field-min',
        genes: {}
      };
      const outputPath = path.join(testOutputDir, 'field-minimal.json');
      const result = await generateField(seed, outputPath);
      expect(result).toBeDefined();
    });

    it('should handle high resolution field', async () => {
      const seed: Seed = {
        $domain: 'field',
        $name: 'HighResField',
        $hash: 'test-hash-field-res',
        genes: {
          resolution: { type: 'int', value: 256 }
        }
      };
      const outputPath = path.join(testOutputDir, 'field-highres.json');
      const result = await generateField(seed, outputPath);
      expect(result).toBeDefined();
    });
  });

  describe('FullGame Generator', () => {
    it('should handle minimal seed', async () => {
      const seed: Seed = {
        $domain: 'fullgame',
        $name: 'MinGame',
        $hash: 'test-hash-game-min',
        genes: {}
      };
      const outputDir = path.join(testOutputDir, 'game-minimal');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateFullGameV3(seed, outputDir);
      expect(result).toBeDefined();
    }, 60000);

    it('should handle complex game', async () => {
      const seed: Seed = {
        $domain: 'fullgame',
        $name: 'ComplexGame',
        $hash: 'test-hash-game-complex',
        genes: {
          levels: { type: 'int', value: 10 },
          complexity: { type: 'float', value: 1.0 }
        }
      };
      const outputDir = path.join(testOutputDir, 'game-complex');
      fs.mkdirSync(outputDir, { recursive: true });
      const result = await generateFullGameV3(seed, outputDir);
      expect(result).toBeDefined();
    }, 60000);
  });

  describe('Cross-Generator Edge Cases', () => {
    it('should handle same hash across different generators', async () => {
      const hash = 'test-hash-shared';
      
      const charSeed: Seed = { $domain: 'character', $name: 'Shared', $hash: hash, genes: {} };
      const musicSeed: Seed = { $domain: 'music', $name: 'Shared', $hash: hash, genes: {} };
      
      const charPath = path.join(testOutputDir, 'shared-char.glb');
      const musicDir = path.join(testOutputDir, 'shared-music');
      fs.mkdirSync(musicDir, { recursive: true });
      
      const charResult = await generateCharacterV3(charSeed, charPath);
      const musicResult = await generateMusicV3(musicSeed, musicDir);
      
      expect(charResult).toBeDefined();
      expect(musicResult).toBeDefined();
      expect(fs.existsSync(charPath)).toBe(true);
      expect(fs.existsSync(path.join(musicDir, `music_${hash}.wav`))).toBe(true);
    });

    it('should handle concurrent generation', async () => {
      const seeds: Seed[] = [
        { $domain: 'character', $name: 'Concurrent1', $hash: 'hash1', genes: {} },
        { $domain: 'music', $name: 'Concurrent2', $hash: 'hash2', genes: {} },
        { $domain: 'visual2d', $name: 'Concurrent3', $hash: 'hash3', genes: {} }
      ];
      
      const charPath = path.join(testOutputDir, 'concurrent1.glb');
      const musicDir = path.join(testOutputDir, 'concurrent2');
      const visualDir = path.join(testOutputDir, 'concurrent3');
      fs.mkdirSync(musicDir, { recursive: true });
      fs.mkdirSync(visualDir, { recursive: true });
      
      const results = await Promise.all([
        generateCharacterV3(seeds[0], charPath),
        generateMusicV3(seeds[1], musicDir),
        generateVisual2DV3(seeds[2], visualDir)
      ]);
      
      expect(results).toHaveLength(3);
      results.forEach(result => expect(result).toBeDefined());
    });
  });
});

// Made with Bob
