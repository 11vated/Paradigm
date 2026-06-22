/**
 * Engines registry — close-out test.
 *
 * Proves the substrate surface is complete: 8 working engines registered
 * (form, motion, sound, world, mind, play, story, matter) + field listed
 * as scaffold pending PR #58.
 */
import { describe, it as test, expect } from 'vitest';
import {
  ENGINES,
  ENGINE_IDS,
  getEngine,
  listEngineCapabilities,
} from '../../src/lib/engines';

describe('engines registry', () => {
  test('all 9 engine ids declared', () => {
    expect(ENGINE_IDS.length).toBe(9);
    for (const id of ['form', 'motion', 'sound', 'world', 'mind', 'play', 'story', 'matter', 'field']) {
      expect(ENGINE_IDS).toContain(id);
    }
  });

  test('8 working engines registered (field scaffold pending PR #58)', () => {
    expect(Object.keys(ENGINES).length).toBe(8);
  });

  test('every registered engine has frozen capability + generate + validate', () => {
    for (const [id, eng] of Object.entries(ENGINES)) {
      expect(Object.isFrozen(eng)).toBe(true);
      expect(eng.capability.id).toBe(id);
      expect(typeof eng.generate).toBe('function');
      expect(typeof eng.validate).toBe('function');
    }
  });

  test('capability ids are unique', () => {
    const ids = listEngineCapabilities().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('composesWith references are valid engine ids', () => {
    const validIds = new Set<string>(ENGINE_IDS);
    for (const cap of listEngineCapabilities()) {
      for (const other of cap.composesWith) {
        expect(validIds.has(other)).toBe(true);
      }
    }
  });

  test('getEngine resolves and returns frozen handles', () => {
    const play = getEngine('play');
    expect(play).toBeDefined();
    expect(play!.capability.id).toBe('play');
    expect(Object.isFrozen(play)).toBe(true);
  });

  test('getEngine returns undefined for field (scaffold-only on main)', () => {
    expect(getEngine('field')).toBeUndefined();
  });
});
