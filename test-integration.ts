/**
 * Integration test for Phase 4 — verify all 27 engines produce artifacts
 * Run with: tsx test-integration.ts
 */

import { growSeed } from './src/lib/kernel/engines';
import type { Seed } from './src/lib/kernel/engines';

const testSeeds: Seed[] = [
  // Original 15 engines
  { $name: 'TestVisual', $domain: 'visual2d', $hash: 'test001', $lineage: { generation: 1 }, genes: { style: { type: 'string', value: 'abstract' }, complexity: { type: 'float', value: 0.7 }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestAudio', $domain: 'audio', $hash: 'test002', $lineage: { generation: 1 }, genes: { duration: { type: 'float', value: 2 }, quality: { type: 'string', value: 'low' } } },
  { $name: 'Test3D', $domain: 'geometry3d', $hash: 'test003', $lineage: { generation: 1 }, genes: { primitive: { type: 'string', value: 'sphere' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestChar', $domain: 'character', $hash: 'test004', $lineage: { generation: 1 }, genes: { size: { type: 'float', value: 1.0 }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestSprite', $domain: 'sprite', $hash: 'test005', $lineage: { generation: 1 }, genes: { resolution: { type: 'int', value: 32 }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestMusic', $domain: 'music', $hash: 'test006', $lineage: { generation: 1 }, genes: { tempo: { type: 'float', value: 0.5 }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestNarrative', $domain: 'narrative', $hash: 'test007', $lineage: { generation: 1 }, genes: { structure: { type: 'string', value: 'heros_journey' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestPhysics', $domain: 'physics', $hash: 'test008', $lineage: { generation: 1 }, genes: { gravity: { type: 'float', value: 0.5 }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestGame', $domain: 'game', $hash: 'test009', $lineage: { generation: 1 }, genes: { genre: { type: 'string', value: 'action' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestAnimation', $domain: 'animation', $hash: 'test010', $lineage: { generation: 1 }, genes: { frameCount: { type: 'float', value: 0.3 }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestShader', $domain: 'shader', $hash: 'test011', $lineage: { generation: 1 }, genes: { technique: { type: 'string', value: 'raymarching' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestParticle', $domain: 'particle', $hash: 'test012', $lineage: { generation: 1 }, genes: { count: { type: 'float', value: 0.1 }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestEcosystem', $domain: 'ecosystem', $hash: 'test013', $lineage: { generation: 1 }, genes: { speciesCount: { type: 'float', value: 0.3 }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestProcedural', $domain: 'procedural', $hash: 'test014', $lineage: { generation: 1 }, genes: { octaves: { type: 'float', value: 0.3 }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestFullGame', $domain: 'fullgame', $hash: 'test015', $lineage: { generation: 1 }, genes: { genre: { type: 'string', value: 'action' }, quality: { type: 'string', value: 'low' } } },
  // Additional 12 engines
  { $name: 'TestTypography', $domain: 'typography', $hash: 'test016', $lineage: { generation: 1 }, genes: { style: { type: 'string', value: 'sans_serif' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestArchitecture', $domain: 'architecture', $hash: 'test017', $lineage: { generation: 1 }, genes: { building_type: { type: 'string', value: 'residential' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestVehicle', $domain: 'vehicle', $hash: 'test018', $lineage: { generation: 1 }, genes: { type: { type: 'string', value: 'car' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestFurniture', $domain: 'furniture', $hash: 'test019', $lineage: { generation: 1 }, genes: { type: { type: 'string', value: 'chair' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestFashion', $domain: 'fashion', $hash: 'test020', $lineage: { generation: 1 }, genes: { type: { type: 'string', value: 'dress' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestRobotics', $domain: 'robotics', $hash: 'test021', $lineage: { generation: 1 }, genes: { type: { type: 'string', value: 'manipulator' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestCircuit', $domain: 'circuit', $hash: 'test022', $lineage: { generation: 1 }, genes: { type: { type: 'string', value: 'analog' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestFood', $domain: 'food', $hash: 'test023', $lineage: { generation: 1 }, genes: { type: { type: 'string', value: 'pizza' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestChoreography', $domain: 'choreography', $hash: 'test024', $lineage: { generation: 1 }, genes: { style: { type: 'string', value: 'ballet' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestAlife', $domain: 'alife', $hash: 'test025', $lineage: { generation: 1 }, genes: { rules: { type: 'string', value: 'conway' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestUI', $domain: 'ui', $hash: 'test026', $lineage: { generation: 1 }, genes: { layout: { type: 'string', value: 'dashboard' }, quality: { type: 'string', value: 'low' } } },
  { $name: 'TestAgent', $domain: 'agent', $hash: 'test027', $lineage: { generation: 1 }, genes: { persona: { type: 'string', value: 'architect' }, quality: { type: 'string', value: 'low' } } },
];

async function runTests() {
  console.log('Running integration tests for Phase 4...\n');

  let passed = 0;
  let failed = 0;

  for (const seed of testSeeds) {
    try {
      const result = await growSeed(seed);
      const hasFile = result.artifact?.filePath;
      if (hasFile) {
        console.log(`✓ ${seed.$domain}: ${result.artifact.format} generated`);
        passed++;
      } else {
        console.log(`✗ ${seed.$domain}: No artifact generated`);
        failed++;
      }
    } catch (err) {
      console.log(`✗ ${seed.$domain}: Error - ${err}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testSeeds.length} tests`);
}

runTests();
