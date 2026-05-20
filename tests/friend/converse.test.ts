import { describe, it, expect } from 'vitest';
import { generateReply, greetingFor } from '@/lib/friend/converse';
import { createFriendSeed } from '@/lib/friend';

describe('Friend conversation engine', () => {
  const friend = createFriendSeed('nori-converse');

  it('greetingFor returns a non-empty string and is deterministic', () => {
    const a = greetingFor(friend);
    const b = greetingFor(friend);
    expect(a.length).toBeGreaterThan(0);
    expect(a).toBe(b);
    expect(a).toContain(friend.name);
  });

  it('generateReply is deterministic from (friend, history, userText)', () => {
    const ctx = { history: [], userText: 'I feel anxious about my work.' };
    const a = generateReply(friend, ctx);
    const b = generateReply(friend, ctx);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });

  it('replies vary by user text (different topic → different frame)', () => {
    const ctxFeel = { history: [], userText: 'I feel sad today' };
    const ctxIdea = { history: [], userText: 'Why is the sky blue?' };
    expect(generateReply(friend, ctxFeel)).not.toBe(generateReply(friend, ctxIdea));
  });

  it('different friends give different replies to the same prompt', () => {
    const f1 = createFriendSeed('atlas');
    const f2 = createFriendSeed('vesper');
    const ctx = { history: [], userText: 'What do you think?' };
    expect(generateReply(f1, ctx)).not.toBe(generateReply(f2, ctx));
  });
});
