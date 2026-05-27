/**
 * Mind stratum — Behavior tree + GOAP planner spec for civilisational agents.
 * Pure / deterministic / IO-free.
 */
import type { Xoshiro256StarStar } from '../kernel/rng.js';

export type BTNode =
  | { kind: 'sequence'; children: BTNode[] }
  | { kind: 'selector'; children: BTNode[] }
  | { kind: 'parallel'; required: number; children: BTNode[] }
  | { kind: 'condition'; predicate: string }
  | { kind: 'action'; name: string; cost?: number; preconds?: string[]; effects?: string[] };

export interface AgentArchetype {
  schema: 'https://paradigm.ai/schema/mind/v1';
  archetype: string;
  goals: string[];
  beliefs: Record<string, number>;
  personality: { logic: number; intuition: number; aggression: number; empathy: number; curiosity: number };
  bt: BTNode;
  actions: ReadonlyArray<{ name: string; cost: number; preconds: string[]; effects: string[] }>;
}

const ARCHETYPES = {
  'oracle-priest': {
    goals: ['interpret-omen', 'guide-the-flock', 'maintain-sanctum'],
    beliefs: { divine_will: 0.95, fate: 0.7, free_will: 0.3 },
    personality: { logic: 0.4, intuition: 0.9, aggression: 0.1, empathy: 0.8, curiosity: 0.6 },
    actions: [
      { name: 'consult-stars', cost: 2, preconds: ['nighttime'], effects: ['omen-known'] },
      { name: 'speak-prophecy', cost: 1, preconds: ['omen-known'], effects: ['flock-guided'] },
      { name: 'tend-sanctum', cost: 3, preconds: ['sanctum-dim'], effects: ['sanctum-lit'] },
      { name: 'fast', cost: 4, preconds: [], effects: ['clarity-high'] },
    ],
  },
  'warrior': {
    goals: ['defend-realm', 'gain-honor', 'survive'],
    beliefs: { courage: 0.9, honor: 0.95, mercy: 0.4 },
    personality: { logic: 0.5, intuition: 0.6, aggression: 0.85, empathy: 0.3, curiosity: 0.3 },
    actions: [
      { name: 'patrol', cost: 2, preconds: [], effects: ['threat-known'] },
      { name: 'engage', cost: 5, preconds: ['threat-known', 'armed'], effects: ['threat-down'] },
      { name: 'sharpen-blade', cost: 1, preconds: [], effects: ['armed'] },
      { name: 'rest', cost: 1, preconds: ['safe'], effects: ['vigor-restored'] },
    ],
  },
  'merchant': {
    goals: ['profit', 'expand-trade', 'gather-rumors'],
    beliefs: { trust_kin: 0.7, trust_strangers: 0.3, market_efficiency: 0.8 },
    personality: { logic: 0.7, intuition: 0.5, aggression: 0.2, empathy: 0.4, curiosity: 0.7 },
    actions: [
      { name: 'haggle', cost: 1, preconds: ['has-goods'], effects: ['coin-gained'] },
      { name: 'travel', cost: 4, preconds: [], effects: ['new-market'] },
      { name: 'buy-low', cost: 3, preconds: ['has-coin'], effects: ['has-goods'] },
      { name: 'gossip', cost: 1, preconds: [], effects: ['rumor-known'] },
    ],
  },
  'scholar': {
    goals: ['learn', 'document', 'teach'],
    beliefs: { knowledge_value: 0.95, doubt_authority: 0.65, empirical_truth: 0.85 },
    personality: { logic: 0.95, intuition: 0.5, aggression: 0.1, empathy: 0.55, curiosity: 0.98 },
    actions: [
      { name: 'read', cost: 2, preconds: ['has-book'], effects: ['knowledge-up'] },
      { name: 'experiment', cost: 4, preconds: ['has-materials'], effects: ['knowledge-up', 'risk'] },
      { name: 'teach', cost: 2, preconds: ['knowledge-up'], effects: ['legacy'] },
      { name: 'write-treatise', cost: 5, preconds: ['knowledge-up'], effects: ['has-book'] },
    ],
  },
  'rebel': {
    goals: ['overturn-order', 'inspire-others', 'survive'],
    beliefs: { justice: 0.92, authority: 0.05, secrecy: 0.7 },
    personality: { logic: 0.55, intuition: 0.7, aggression: 0.7, empathy: 0.6, curiosity: 0.6 },
    actions: [
      { name: 'agitate', cost: 2, preconds: ['crowd-present'], effects: ['rumor-known', 'tension-up'] },
      { name: 'sabotage', cost: 4, preconds: ['armed'], effects: ['system-broken', 'risk'] },
      { name: 'hide', cost: 1, preconds: ['risk'], effects: ['safe'] },
      { name: 'recruit', cost: 3, preconds: ['tension-up'], effects: ['ally-gained'] },
    ],
  },
} as const;

/** Build a behavior tree from action set: sequence of (try-goal selector). */
function buildBT(goals: string[], actions: ReadonlyArray<{ name: string; effects: ReadonlyArray<string> }>): BTNode {
  const selectors: BTNode[] = goals.map(goal => {
    const matching = actions.filter(a => a.effects.some(e => goal.includes(e) || e.includes(goal.split('-')[0])));
    if (matching.length === 0) return { kind: 'condition', predicate: `goal:${goal}` };
    return {
      kind: 'selector',
      children: matching.slice(0, 4).map(a => ({
        kind: 'sequence' as const,
        children: [
          { kind: 'condition' as const, predicate: `precond:${a.name}` },
          { kind: 'action' as const, name: a.name },
        ],
      })),
    };
  });
  return { kind: 'sequence', children: selectors };
}

export function generateMind(archetype: keyof typeof ARCHETYPES, rng: Xoshiro256StarStar): AgentArchetype {
  const a = ARCHETYPES[archetype];
  // Inject small deterministic personality drift
  const drift = (v: number, j: number) => Math.max(0, Math.min(1, v + (rng.nextF64() - 0.5) * j));
  const p = {
    logic:     drift(a.personality.logic, 0.06),
    intuition: drift(a.personality.intuition, 0.06),
    aggression: drift(a.personality.aggression, 0.05),
    empathy:    drift(a.personality.empathy, 0.05),
    curiosity:  drift(a.personality.curiosity, 0.05),
  };
  return {
    schema: 'https://paradigm.ai/schema/mind/v1',
    archetype,
    goals: [...a.goals],
    beliefs: { ...a.beliefs },
    personality: p,
    bt: buildBT([...a.goals], [...a.actions]),
    actions: a.actions.map(x => ({ name: x.name, cost: x.cost, preconds: [...x.preconds], effects: [...x.effects] })),
  };
}

/** GOAP planner — produces a least-cost action sequence achieving the goal. */
export function planToward(agent: AgentArchetype, goal: string, initial: Set<string>, maxDepth: number = 8): string[] | null {
  // Simple BFS over state space; treats each effect as setting a flag.
  type State = { flags: Set<string>; path: string[]; cost: number };
  const queue: State[] = [{ flags: new Set(initial), path: [], cost: 0 }];
  const seen = new Set<string>();
  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const cur = queue.shift()!;
    if (cur.flags.has(goal) || [...cur.flags].some(f => f.includes(goal))) return cur.path;
    if (cur.path.length >= maxDepth) continue;
    const key = [...cur.flags].sort().join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    for (const a of agent.actions) {
      const ok = a.preconds.every(p => cur.flags.has(p));
      if (!ok) continue;
      const nextFlags = new Set(cur.flags);
      for (const e of a.effects) nextFlags.add(e);
      queue.push({ flags: nextFlags, path: [...cur.path, a.name], cost: cur.cost + a.cost });
    }
  }
  return null;
}

export const MIND_ARCHETYPES = Object.keys(ARCHETYPES) as Array<keyof typeof ARCHETYPES>;
