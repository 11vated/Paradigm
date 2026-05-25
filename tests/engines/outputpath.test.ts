import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { normalizeForEngine, getOutputShape, listKindsForEngine } from '../../src/lib/engines/outputpath';

const TMP = path.join(os.tmpdir(), 'paradigm-outputpath-ws26-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('output-path normalization', () => {
  it('directory shape: returns the input dir, creates it', () => {
    const dir = path.join(TMP, 'form-character');
    const out = normalizeForEngine('form', 'character', dir);
    expect(out).toBe(dir);
    expect(fs.existsSync(dir)).toBe(true);
  });
  it('json-file shape: returns path/basename, parent dir exists', () => {
    const dir = path.join(TMP, 'motion-dance');
    const out = normalizeForEngine('motion', 'dance', dir);
    expect(out).toBe(path.join(dir, 'choreo.json'));
    expect(fs.existsSync(dir)).toBe(true);
  });
  it('json-file shape: motion + sound + mind specific kinds', () => {
    expect(getOutputShape('motion', 'dance')).toBe('json-file');
    expect(getOutputShape('sound', 'acoustics')).toBe('json-file');
    expect(getOutputShape('mind', 'neuroscience')).toBe('json-file');
  });
  it('directory shape for all 6 visual/audio/world engines', () => {
    expect(getOutputShape('form', 'character')).toBe('directory');
    expect(getOutputShape('world', 'ecosystem')).toBe('directory');
    expect(getOutputShape('play', 'game')).toBe('directory');
    expect(getOutputShape('story', 'theater')).toBe('directory');
    expect(getOutputShape('matter', 'molecule')).toBe('directory');
    expect(getOutputShape('field', 'electromagnetic')).toBe('directory');
  });
  it('unknown kind: returns null shape, falls back to directory', () => {
    expect(getOutputShape('play', 'nonexistent')).toBeNull();
    const dir = path.join(TMP, 'unknown');
    const out = normalizeForEngine('play', 'nonexistent', dir);
    expect(out).toBe(dir);
    expect(fs.existsSync(dir)).toBe(true);
  });
  it('listKindsForEngine returns documented kinds per engine', () => {
    expect(listKindsForEngine('form').sort()).toEqual(['character', 'sprite', 'typography']);
    expect(listKindsForEngine('field').sort()).toEqual(['cosmology', 'electromagnetic', 'quantum']);
    expect(listKindsForEngine('matter').sort()).toEqual(['material', 'molecule', 'protein']);
  });
  it('determinism: same inputs → same output path string', () => {
    const dir = path.join(TMP, 'det');
    const a = normalizeForEngine('sound', 'acoustics', dir);
    const b = normalizeForEngine('sound', 'acoustics', dir);
    expect(a).toBe(b);
  });
});
