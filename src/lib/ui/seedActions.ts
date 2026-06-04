/**
 * seedActions — shared seed-lifecycle handlers for the UI.
 *
 * One place that owns "create + activate", "grow", "mutate", etc. Consumers:
 *   - EmptyState prompt cards   (CrucibleMode)
 *   - LeftRail action chips     (ActivePin)
 *   - Composer slash commands   (AgentPanel)
 *   - TopBar "new" chip
 */
import { createSeed, growSeed, mutateSeed } from '@/services/api';
import { useActiveSeed } from '@/stores/activeSeed';
import { inferDomain } from '@/lib/ui/inferDomain';

export type ActionResult = {
  ok: boolean;
  message: string;
  seedId?: string;
};

/** Bus event names — components subscribe to refresh after a mutation. */
export const EVENTS = {
  COMPOSE_PROMPT: 'paradigm:compose-prompt',
  GROW_SUCCESS:   'paradigm:grow-success',
  GROW_FAILED:    'paradigm:grow-failed',
  MUTATE_SUCCESS: 'paradigm:mutate-success',
  CREATE_FAILED:  'paradigm:create-failed',
} as const;

function dispatch(name: string, detail: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * Create a fresh seed from a free-text prompt (domain inferred if not given),
 * make it the active seed. The CrucibleMode's `useGrowArtifact` auto-grows it.
 */
export async function actCreateFromPrompt(
  text: string,
  domain?: string,
): Promise<ActionResult> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, message: 'Empty prompt' };
  const d = domain ?? inferDomain(trimmed);
  try {
    const created: any = await createSeed({ name: trimmed, domain: d } as any);
    useActiveSeed.getState().setSeed({
      id: created.id,
      name: trimmed,
      domain: d,
      hash: created.hash ?? created.$hash ?? '',
      generation: created.generation ?? created.$lineage?.generation ?? 0,
    });
    return { ok: true, message: `seed created · ${d}`, seedId: created.id };
  } catch (e) {
    dispatch(EVENTS.CREATE_FAILED, { text: trimmed, error: String(e) });
    return { ok: false, message: `create failed: ${String(e).slice(0, 80)}` };
  }
}

/** Re-grow a seed and announce success so viewports refetch. */
export async function actGrow(seedId?: string): Promise<ActionResult> {
  const id = seedId ?? useActiveSeed.getState().seed?.id;
  if (!id) return { ok: false, message: 'no active seed' };
  try {
    const artifact: any = await growSeed(id);
    const richName = artifact?.name || artifact?.$name || 'Artifact';
    const richStrata = artifact?.strata || artifact?.stratumScores || [];
    // dispatch rich named visual + strata so Studio live preview + name + strata update perfectly (uniform rich)
    dispatch(EVENTS.GROW_SUCCESS, { id, artifact, name: richName, strata: richStrata });
    return { ok: true, message: `grown · ${id}`, seedId: id };
  } catch (e) {
    dispatch(EVENTS.GROW_FAILED, { id, error: String(e) });
    return { ok: false, message: `grow failed: ${String(e).slice(0, 80)}` };
  }
}

/** Mutate the active seed → new seed becomes active. */
export async function actMutate(seedId?: string): Promise<ActionResult> {
  const cur = useActiveSeed.getState().seed;
  const id = seedId ?? cur?.id;
  if (!id || !cur) return { ok: false, message: 'no active seed' };
  try {
    const mutated: any = await mutateSeed(id, { rate: 0.15 });
    useActiveSeed.getState().setSeed({
      id: mutated.id,
      name: mutated.$name ?? `${cur.name} (mut)`,
      domain: mutated.$domain ?? cur.domain,
      hash: mutated.hash ?? mutated.$hash ?? '',
      generation: (cur.generation ?? 0) + 1,
    });
    dispatch(EVENTS.MUTATE_SUCCESS, { from: id, to: mutated.id });
    return { ok: true, message: `mutated → ${mutated.id}`, seedId: mutated.id };
  } catch (e) {
    return { ok: false, message: `mutate failed: ${String(e).slice(0, 80)}` };
  }
}

/**
 * Try to parse a slash command from the composer text.
 * Returns null if not a slash command we handle locally.
 * Returns a Promise<ActionResult> if we handled it.
 */
export function parseSlashCommand(text: string): null | Promise<ActionResult> {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;
  const [head, ...rest] = trimmed.split(/\s+/);
  const args = rest.join(' ').trim();
  switch (head.toLowerCase()) {
    case '/grow':
      // /grow                 -> regrow active
      // /grow <free text>     -> create from prompt then activate (auto-grows)
      if (!args) return actGrow();
      return actCreateFromPrompt(args);
    case '/mutate':
      return actMutate();
    case '/breed':
    case '/compose':
    case '/sign':
    case '/verify':
      // Deferred to next slices — surface a friendly status and let the agent
      // also respond, so user gets context.
      return Promise.resolve({
        ok: false,
        message: `${head} — coming in next slice. Ask the agent for now.`,
      });
    default:
      return null;
  }
}
