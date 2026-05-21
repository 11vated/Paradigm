/**
 * Tool Harness — permission-gated, timeout-bounded, audit-logged invoker.
 *
 * The harness is the only legal call site for tools from sub-agents.
 * It enforces:
 *   - per-sub-agent grants (DEFAULT_TOOL_GRANTS or user-supplied)
 *   - air-gap mode (network + fs tools throw)
 *   - consent gates for 'requires-consent' tools
 *   - timeouts (per-tool, with abort signal)
 *   - audit logging (immutable append-only)
 *
 * Pure deterministic when given pure tools — the harness adds no entropy
 * of its own beyond the kernelNow timestamp on audit entries.
 */

import { kernelNow } from '../../kernel/clock';
import type {
  SubAgentToolGrants,
  Tool,
  ToolAuditEntry,
  ToolContext,
  ToolDescriptor,
  ToolHarness,
  ToolInvocation,
  ToolRegistry,
  ToolResult,
} from './types';
import { DEFAULT_TOOL_GRANTS } from './types';

class InMemoryRegistry implements ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register<T>(tool: Tool<T>): void {
    this.tools.set(tool.descriptor.id, tool as Tool);
  }
  get(id: string): Tool | undefined {
    return this.tools.get(id);
  }
  list(): ToolDescriptor[] {
    return Array.from(this.tools.values(), (t) => t.descriptor);
  }
  listAllowed(callerId: string): ToolDescriptor[] {
    const grants = this.grants[callerId] ?? [];
    return Array.from(this.tools.values())
      .filter((t) => grants.includes(t.descriptor.id))
      .map((t) => t.descriptor);
  }
  grants: SubAgentToolGrants = DEFAULT_TOOL_GRANTS;
}

export interface HarnessOptions {
  airGap?: boolean;
  grants?: SubAgentToolGrants;
  /** Default timeout if a tool descriptor doesn't supply one. */
  defaultTimeoutMs?: number;
  /** Hook for custom audit log persistence. */
  onAudit?: (entry: ToolAuditEntry) => void;
}

export class StandardToolHarness implements ToolHarness {
  readonly registry: InMemoryRegistry;
  private readonly airGap: boolean;
  private readonly defaultTimeoutMs: number;
  private readonly onAudit?: (entry: ToolAuditEntry) => void;
  private readonly log: ToolAuditEntry[] = [];

  constructor(opts: HarnessOptions = {}) {
    this.registry = new InMemoryRegistry();
    if (opts.grants) this.registry.grants = opts.grants;
    this.airGap = opts.airGap ?? true;
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? 5000;
    this.onAudit = opts.onAudit;
  }

  async invoke<T = unknown>({ toolId, args, ctx }: ToolInvocation): Promise<ToolResult<T>> {
    const t0 = kernelNow();
    const tool = this.registry.get(toolId);
    if (!tool) return this.audit({ toolId, caller: ctx.caller, ok: false, errorCode: 'tool-not-found', durationMs: 0, argsHash: hashArgs(args) }, { ok: false, error: { code: 'tool-not-found', message: `No tool registered as '${toolId}'` } });

    // Permission gate: must be granted to this caller (caller="user" bypasses)
    const grants = this.registry.grants[ctx.caller] ?? [];
    if (ctx.caller !== 'user' && !grants.includes(toolId)) {
      return this.audit({ toolId, caller: ctx.caller, ok: false, errorCode: 'not-granted', durationMs: kernelNow() - t0, argsHash: hashArgs(args) }, { ok: false, error: { code: 'not-granted', message: `Tool '${toolId}' is not granted to caller '${ctx.caller}'` } });
    }

    // Air-gap enforcement
    const airGap = ctx.airGap ?? this.airGap;
    if (airGap && (tool.descriptor.category === 'network' || tool.descriptor.category === 'fs')) {
      return this.audit({ toolId, caller: ctx.caller, ok: false, errorCode: 'air-gapped', durationMs: kernelNow() - t0, argsHash: hashArgs(args) }, { ok: false, error: { code: 'air-gapped', message: `Tool '${toolId}' is in category '${tool.descriptor.category}' which is disabled in air-gap mode` } });
    }

    // Consent gate
    if (tool.descriptor.permission === 'requires-consent' && !ctx.consent) {
      return this.audit({ toolId, caller: ctx.caller, ok: false, errorCode: 'no-consent', durationMs: kernelNow() - t0, argsHash: hashArgs(args) }, { ok: false, error: { code: 'no-consent', message: `Tool '${toolId}' requires user consent` } });
    }

    // Timeout-wrapped execution
    const timeoutMs = tool.descriptor.timeoutMs ?? this.defaultTimeoutMs;
    const ac = new AbortController();
    const signal = ctx.signal ? mergeSignals(ctx.signal, ac.signal) : ac.signal;
    const wrappedCtx: ToolContext = { ...ctx, airGap, signal };
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeout = new Promise<ToolResult<T>>((_resolve, reject) => {
        timer = setTimeout(() => {
          ac.abort();
          reject(new Error(`timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });
      const exec = tool.execute(args, wrappedCtx) as Promise<ToolResult<T>>;
      const result = await Promise.race([exec, timeout]);
      const dur = kernelNow() - t0;
      return this.audit({ toolId, caller: ctx.caller, ok: result.ok, errorCode: result.error?.code, durationMs: dur, argsHash: hashArgs(args) }, result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const dur = kernelNow() - t0;
      return this.audit({ toolId, caller: ctx.caller, ok: false, errorCode: 'throw', durationMs: dur, argsHash: hashArgs(args) }, { ok: false, error: { code: 'throw', message: msg } });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  auditLog(): readonly ToolAuditEntry[] {
    return this.log;
  }

  private audit<T>(entry: Omit<ToolAuditEntry, 'ts'>, result: ToolResult<T>): ToolResult<T> {
    const full: ToolAuditEntry = { ts: kernelNow(), ...entry };
    this.log.push(full);
    if (this.onAudit) this.onAudit(full);
    return result;
  }
}

function hashArgs(args: unknown): string {
  const s = JSON.stringify(args ?? null);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function mergeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  if (a.aborted || b.aborted) ac.abort();
  else {
    a.addEventListener('abort', onAbort, { once: true });
    b.addEventListener('abort', onAbort, { once: true });
  }
  return ac.signal;
}
