/**
 * Friend conversation engine — pure, deterministic, persona-genes-driven.
 *
 * No LLM, no network. Heuristic reply selection from a small per-style template bank,
 * filled in with the friend's interests/values and the user's message tokens.
 * Deterministic from (friend.id, userText, turnIndex) so a conversation is replayable.
 */
import { createHash } from 'crypto';
import type { FriendSeedData } from './types';

export interface Turn {
  speaker: 'user' | 'friend';
  text: string;
  /** Logical turn number, NOT wall-clock — kept for replay determinism. */
  turn: number;
}

export interface ReplyContext {
  /** Most recent N turns. New friends have just the opening greeting. */
  history: Turn[];
  /** The latest user utterance (NOT yet in history). */
  userText: string;
}

function rng(seed: string): () => number {
  const h = createHash('sha256').update(seed).digest();
  let s = (h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3];
  return () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 0xffffffff); };
}

const pick = <T,>(arr: T[], r: () => number): T => arr[Math.floor(r() * arr.length)];

// ─── Per-style reply banks ────────────────────────────────────────────────────
const OPENERS: Record<string, string[]> = {
  casual:  ['Hey.', 'Yeah.', 'Right.', 'Okay—', 'Honestly,'],
  formal:  ['Indeed.', 'I would say:', 'Allow me—', 'To be candid:'],
  poetic:  ['Ah—', 'Listen,', 'There is a thing about', 'Once,'],
  precise: ['Note:', 'Specifically:', 'Consider:', 'To be exact:'],
};

const ACKS: Record<string, string[]> = {
  casual:  ['I hear you.', 'That tracks.', 'Makes sense.', 'I get that.'],
  formal:  ['I understand.', 'I see your meaning.', 'Acknowledged.'],
  poetic:  ['I feel that, like wind in a chimney.', 'That has weight.', 'I will remember that.'],
  precise: ['Recorded.', 'Logged.', 'Understood.'],
};

const QUESTIONS: Record<string, string[]> = {
  casual:  ['What got you thinking about that?', 'How does that feel?', 'Want to keep going?'],
  formal:  ['What prompted that reflection?', 'Would you elaborate?', 'May I ask what you would change?'],
  poetic:  ['What does it mean to you, really?', 'When did that first arrive?', 'Where does it lead?'],
  precise: ['What is the precise outcome you seek?', 'What constraints apply?', 'When?'],
};

// ─── Topic detection (cheap keyword classifier) ──────────────────────────────
const TOPIC_TAGS: Array<[RegExp, string]> = [
  [/feel|sad|happy|tired|anxious|excited|angry|lonely/i, 'feeling'],
  [/think|believe|reason|because|why|how|explain/i, 'idea'],
  [/work|job|career|study|learn|build|make|project/i, 'making'],
  [/love|family|friend|partner|home|miss|relationship/i, 'bond'],
  [/dream|wish|hope|future|plan/i, 'future'],
  [/past|remember|before|used to|ago/i, 'memory'],
  [/help|stuck|hard|difficult|problem/i, 'support'],
];

function detectTopic(text: string): string {
  for (const [re, tag] of TOPIC_TAGS) if (re.test(text)) return tag;
  return 'open';
}

const TOPIC_FRAMES: Record<string, string[]> = {
  feeling: [
    "Tell me where that lives in your day.",
    "Has it been growing, or holding steady?",
    "Name the smallest version of it you can — what shape does that have?",
  ],
  idea: [
    "What would change if it were true?",
    "What is the simplest test you could run on it?",
    "I would push on this: is there a counter-version that also holds?",
  ],
  making: [
    "What is blocking the next move?",
    "What would a five-minute version of that look like?",
    "Who is the user you keep coming back to?",
  ],
  bond: [
    "Who is closest in this — and who feels far?",
    "What would they say if they read what you just told me?",
    "Where does the warmth in that begin?",
  ],
  future: [
    "What does the version of you who already has it look like?",
    "What is the first crack of light toward it?",
    "What would you stop doing to make room for it?",
  ],
  memory: [
    "What part of that is still alive in you?",
    "What did you not know then, that you know now?",
    "If that day had a sound, what would it be?",
  ],
  support: [
    "Walk me through where you are stuck.",
    "What did you try last, and what happened?",
    "Would it help to name the smallest next step out loud?",
  ],
  open: [
    "Where do you want to start?",
    "What is on the surface for you right now?",
    "Pick a thread — I will follow it.",
  ],
};

/** Generate the friend's next reply. Pure, deterministic. */
export function generateReply(friend: FriendSeedData, ctx: ReplyContext): string {
  const persona = friend.genes.persona;
  const style = persona.speechStyle ?? 'casual';
  const big = persona.bigFive ?? { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.3 };
  const turnIndex = ctx.history.length;
  const r = rng(friend.id + '|' + turnIndex + '|' + ctx.userText.slice(0, 64));

  const topic = detectTopic(ctx.userText);
  const opener = pick(OPENERS[style] ?? OPENERS.casual, r);
  const ack    = pick(ACKS[style]    ?? ACKS.casual,    r);
  const frame  = pick(TOPIC_FRAMES[topic],               r);

  // Bias on curiosity → append a question; bias on agreeableness → soften.
  const wantsQuestion = persona.curiosity > 0.4 + (r() * 0.2);
  const question = wantsQuestion ? ' ' + pick(QUESTIONS[style] ?? QUESTIONS.casual, r) : '';

  // Inject an interest reference 25% of the time if the user opened up.
  let flavor = '';
  if (persona.interests?.length && r() < 0.25 && topic !== 'support') {
    const i = pick(persona.interests, r);
    flavor = ` (this reminds me of ${i}.)`;
  }

  // Big-five tuning:
  // - high neuroticism → softer opener
  // - high extraversion → exclamation
  // - high openness → more poetic frame substitution
  let line = `${opener} ${ack} ${frame}${question}${flavor}`.trim().replace(/ +/g, ' ');
  if (big.extraversion > 0.7 && !line.endsWith('?')) line = line.replace(/\.$/, '!');
  if (big.neuroticism > 0.7) line = line.replace(/^[^,]+,/, m => m.toLowerCase());

  // Humor: append a wry tag occasionally.
  if (persona.humor > 0.6 && r() < 0.3) {
    line += pick([' (— I am only mostly joking.)', ' (which is funnier than it sounds.)', ' (— take that with a grain of salt.)'], r);
  }
  return line;
}

/** Greeting line used by FriendAvatar / first turn on /chat. */
export function greetingFor(friend: FriendSeedData): string {
  const style = friend.genes.persona.speechStyle ?? 'casual';
  const name = friend.name ?? 'your friend';
  const banks: Record<string, string[]> = {
    casual:  [`Hey — I'm ${name}.`, `Hi, I'm ${name}. Glad you're here.`],
    formal:  [`Greetings. I am ${name}.`, `Pleased to make your acquaintance — I am ${name}.`],
    poetic:  [`So — you found me. I'm ${name}.`, `${name}. That is my name, and I am listening.`],
    precise: [`I am ${name}. Ready.`, `Identity: ${name}. Listening.`],
  };
  const r = rng(friend.id + '|greeting');
  return pick(banks[style] ?? banks.casual, r);
}
