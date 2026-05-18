import { describe, it, expect } from 'vitest';
import { VerificationGate, defaultVerificationGate, getDomainChecker } from '../src/lib/commons/verification';

const CHAR_ARTIFACT = {
  type: 'character', name: 'Test Warrior', domain: 'character', seed_hash: 'abc123', generation: 1,
  generation_quality: { overall: 0.85 },
  archetype: 'warrior',
  visual: { body_width: 0.7, body_height: 1.6, size_factor: 2.0 },
  stats: { strength: 85, agility: 40, speed: 4.0, hp: 250 },
  personality: 'aggressive',
  render_hints: { mode: '3d_character', animated: true },
};

const FAKE_MUSIC = {
  type: 'music', name: 'Test Melody', domain: 'music', seed_hash: 'def456', generation: 1,
  music: { tempo: 0.8, key: 'C', scale: 'major', duration_ms: 5000, sampleRate: 44100 },
  render_hints: { mode: 'audio_waveform', playable: true },
};

const FAKE_AGENT = {
  type: 'agent', name: 'Test Bot', domain: 'agent', seed_hash: 'ghi789', generation: 1,
  config: { persona: 'architect', name: 'Test Bot', temperature: 0.3, reasoningDepth: 0.7, explorationRate: 0.4 },
  render_hints: { mode: 'chat_interface', color_scheme: 'dark', animated: false },
};

const FAKE_GAME = {
  type: 'game', name: 'Test Game', domain: 'game', seed_hash: 'jkl012', generation: 1,
  game: { genre: 'platformer', difficulty: 0.5, levelCount: 5, hasPowerups: true },
  render_hints: { mode: 'game_logic', interactive: true },
};

const FAKE_NARRATIVE = {
  type: 'narrative', name: 'Test Story', domain: 'narrative', seed_hash: 'mno345', generation: 1,
  story: { structure: 'heros_journey', tone: 'epic', characters: ['hero', 'villain'], plot: 'quest', acts: 3 },
  render_hints: { mode: 'narrative_flow', readable: true },
};

const MINIMAL_ARTIFACT = {
  type: 'character', name: 'Test', domain: 'character', seed_hash: 'xyz', generation: 0,
  render_hints: { mode: '3d_character' },
};

describe('Domain Checkers', () => {
  it('character checker matches warrior description', () => {
    const checker = getDomainChecker('character');
    const result = checker(CHAR_ARTIFACT, 'A strong warrior character');
    expect(result.score).toBeGreaterThanOrEqual(0.5);
    expect(result.issues.length).toBe(0);
  });

  it('character checker flags rogue/agility mismatch', () => {
    const checker = getDomainChecker('character');
    const result = checker(CHAR_ARTIFACT, 'A swift rogue assassin');
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(0.7);
  });

  it('music checker accepts matching description', () => {
    const checker = getDomainChecker('music');
    const result = checker(FAKE_MUSIC, 'A fast major key melody');
    expect(result.score).toBeGreaterThanOrEqual(0.5);
    expect(result.issues.length).toBe(0);
  });

  it('music checker flags scale mismatch', () => {
    const checker = getDomainChecker('music');
    const result = checker(FAKE_MUSIC, 'A slow minor key piece');
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('game checker matches platformer description', () => {
    const checker = getDomainChecker('game');
    const result = checker(FAKE_GAME, 'A fun platformer game');
    expect(result.issues.length).toBe(0);
  });

  it('game checker flags genre mismatch', () => {
    const checker = getDomainChecker('game');
    const result = checker(FAKE_GAME, 'An RPG adventure game');
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('agent checker matches architect description', () => {
    const checker = getDomainChecker('agent');
    const result = checker(FAKE_AGENT, 'An architect agent');
    expect(result.issues.length).toBe(0);
  });

  it('agent checker flags persona mismatch', () => {
    const checker = getDomainChecker('agent');
    const result = checker(FAKE_AGENT, 'A creative artist agent who imagines');
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('narrative checker matches epic tone', () => {
    const checker = getDomainChecker('narrative');
    const result = checker(FAKE_NARRATIVE, 'An epic heroic tale');
    expect(result.issues.length).toBe(0);
  });

  it('generic checker returns baseline for unknown domain', () => {
    const checker = getDomainChecker('unknown_domain');
    const result = checker(MINIMAL_ARTIFACT, 'some description');
    expect(result.score).toBeGreaterThanOrEqual(0.3);
  });
});

describe('VerificationGate', () => {
  it('returns match for well-matched character', async () => {
    const gate = defaultVerificationGate();
    const result = await gate.verify('A strong warrior', CHAR_ARTIFACT, 'character');
    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.issues.length).toBe(0);
  });

  it('returns no match for poorly matched character', async () => {
    const gate = new VerificationGate({ confidenceThreshold: 0.6 });
    const result = await gate.verify('A swift rogue assassin', CHAR_ARTIFACT, 'character');
    expect(result.match).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('returns match for matching music', async () => {
    const gate = defaultVerificationGate();
    const result = await gate.verify('Fast major key music', FAKE_MUSIC, 'music');
    expect(result.match).toBe(true);
  });

  it('returns match for matching game', async () => {
    const gate = defaultVerificationGate();
    const result = await gate.verify('A platformer adventure', FAKE_GAME, 'game');
    expect(result.match).toBe(true);
  });

  it('handles minimal artifact gracefully', async () => {
    const gate = defaultVerificationGate();
    const result = await gate.verify('test', MINIMAL_ARTIFACT, 'character');
    expect(typeof result.match).toBe('boolean');
    expect(typeof result.confidence).toBe('number');
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('handles null/undefined artifact', async () => {
    const gate = defaultVerificationGate();
    const result = await gate.verify('test', null, 'character');
    expect(typeof result.match).toBe('boolean');
  });

  it('includes detailed scores in result', async () => {
    const gate = defaultVerificationGate();
    const result = await gate.verify('A strong warrior', CHAR_ARTIFACT, 'character');
    expect(result.details.domainScore).toBeDefined();
    expect(result.details.keywordScore).toBeDefined();
    expect(result.details.combinedScore).toBeDefined();
  });

  it('explanation is non-empty for match', async () => {
    const gate = defaultVerificationGate();
    const result = await gate.verify('A strong warrior', CHAR_ARTIFACT, 'character');
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it('explanation is non-empty for no match', async () => {
    const gate = new VerificationGate({ confidenceThreshold: 0.9 });
    const result = await gate.verify('A strong warrior', CHAR_ARTIFACT, 'character');
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it('allows config override', async () => {
    const gate = new VerificationGate({ enableDomainCheckers: false, enableKeywordMatching: false });
    const result = await gate.verify('anything', CHAR_ARTIFACT, 'character');
    expect(result.confidence).toBe(0.5);
    expect(result.match).toBe(true);
  });
});
