/**
 * Network-tier tools — opt-in only, denied by default in air-gap mode.
 *
 * Sovereignty doctrine: these never run unless the harness's airGap
 * flag is explicitly false AND the tool is granted to the calling
 * sub-agent. Endpoints are user-configurable so you can point at
 * self-hosted alternatives (SearXNG, local Readability, local CLIP)
 * instead of commercial APIs.
 */

import type { Tool, ToolContext, ToolDescriptor, ToolResult } from './types';

type FetchImpl = typeof fetch;

function ok<T>(value: T, source?: string, cost?: number): ToolResult<T> {
  return { ok: true, value, source, cost };
}
function fail(code: string, message: string): ToolResult<never> {
  return { ok: false, error: { code, message } };
}

// ─── web_search (SearXNG-compatible) ───
export interface WebSearchOpts {
  baseUrl?: string;
  timeoutMs?: number;
  defaultLimit?: number;
  fetchImpl?: FetchImpl;
}
export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export function createWebSearchTool(opts: WebSearchOpts = {}): Tool<{ results: WebSearchResult[]; count: number }> {
  const baseUrl = (opts.baseUrl ?? process.env.PARADIGM_SEARXNG_URL ?? 'http://localhost:8888').replace(/\/$/, '');
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const defaultLimit = opts.defaultLimit ?? 10;
  const descriptor: ToolDescriptor = {
    id: 'web_search',
    category: 'network',
    description: 'Run a web search via a SearXNG-compatible JSON endpoint.',
    schema: { input: { query: { type: 'string' }, limit: { type: 'number' } } },
    permission: 'requires-consent',
    timeoutMs: timeoutMs + 2_000,
  };
  return {
    descriptor,
    async execute(args, ctx: ToolContext): Promise<ToolResult<{ results: WebSearchResult[]; count: number }>> {
      if (ctx.airGap) return fail('air_gap', 'network tools blocked in air-gap mode');
      const params = args as { query: string; limit?: number };
      const limit = Math.min(params.limit ?? defaultLimit, 30);
      const ac = new AbortController();
      const t0 = Date.now();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const url = `${baseUrl}/search?q=${encodeURIComponent(params.query)}&format=json`;
        const res = await fetchImpl(url, { signal: ac.signal });
        if (!res.ok) return fail('http', `searxng ${res.status}`);
        const body = (await res.json()) as { results?: Array<{ title: string; url: string; content?: string; engine?: string }> };
        const results = (body.results ?? []).slice(0, limit).map((r) => ({
          title: r.title, url: r.url, snippet: r.content ?? '', source: r.engine,
        }));
        return ok({ results, count: results.length }, baseUrl, Date.now() - t0);
      } catch (e) {
        return fail('network', (e as Error).message);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

// ─── browse_page (fetch + naive HTML→text) ───
export interface BrowsePageOpts {
  timeoutMs?: number;
  maxBytes?: number;
  fetchImpl?: FetchImpl;
  userAgent?: string;
}

const STRIP_TAGS_RE = /<(script|style|noscript)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi;
const TAG_RE = /<[^>]+>/g;
const WHITESPACE_RE = /\s+/g;

export function createBrowsePageTool(opts: BrowsePageOpts = {}): Tool<{ url: string; status: number; contentType: string; length: number; text: string }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const maxBytes = opts.maxBytes ?? 512_000;
  const userAgent = opts.userAgent ?? 'Paradigm-SovereignAgent/0.1 (+local)';
  const descriptor: ToolDescriptor = {
    id: 'browse_page',
    category: 'network',
    description: 'Fetch a URL and return readable text (no JS execution). Truncated to ~500 KB.',
    schema: { input: { url: { type: 'string' }, maxChars: { type: 'number' } } },
    permission: 'requires-consent',
    timeoutMs: timeoutMs + 2_000,
  };
  return {
    descriptor,
    async execute(args, ctx) {
      if (ctx.airGap) return fail('air_gap', 'network tools blocked in air-gap mode');
      const params = args as { url: string; maxChars?: number };
      if (!/^https?:\/\//i.test(params.url)) return fail('protocol', 'only http(s) URLs allowed');
      const ac = new AbortController();
      const t0 = Date.now();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const res = await fetchImpl(params.url, {
          signal: ac.signal,
          headers: { 'User-Agent': userAgent, Accept: 'text/html,text/plain' },
          redirect: 'follow',
        });
        if (!res.ok) return fail('http', `browse ${res.status}`);
        const buf = await res.arrayBuffer();
        if (buf.byteLength > maxBytes) return fail('too_large', `page exceeds maxBytes (${maxBytes})`);
        const html = new TextDecoder().decode(buf);
        const stripped = html.replace(STRIP_TAGS_RE, ' ').replace(TAG_RE, ' ').replace(WHITESPACE_RE, ' ').trim();
        const text = params.maxChars ? stripped.slice(0, params.maxChars) : stripped;
        return ok({
          url: res.url, status: res.status, contentType: res.headers.get('content-type') ?? '',
          length: text.length, text,
        }, params.url, Date.now() - t0);
      } catch (e) {
        return fail('network', (e as Error).message);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

// ─── fetch_json (typed JSON GET) ───
export function createFetchJsonTool(fetchImpl: FetchImpl = fetch): Tool<unknown> {
  const descriptor: ToolDescriptor = {
    id: 'fetch_json',
    category: 'network',
    description: 'GET a JSON URL with a 10s timeout.',
    schema: { input: { url: { type: 'string' } } },
    permission: 'requires-consent',
    timeoutMs: 12_000,
  };
  return {
    descriptor,
    async execute(args, ctx) {
      if (ctx.airGap) return fail('air_gap', 'network tools blocked in air-gap mode');
      const { url } = args as { url: string };
      if (!/^https?:\/\//i.test(url)) return fail('protocol', 'only http(s) URLs allowed');
      const ac = new AbortController();
      const t0 = Date.now();
      const timer = setTimeout(() => ac.abort(), 10_000);
      try {
        const res = await fetchImpl(url, { signal: ac.signal, headers: { Accept: 'application/json' } });
        if (!res.ok) return fail('http', `fetch_json ${res.status}`);
        return ok(await res.json(), url, Date.now() - t0);
      } catch (e) {
        return fail('network', (e as Error).message);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/** Register all network tools on a harness (or any registry). Returns the tools registered. */
export function installNetworkTools(
  registry: { register<T>(t: Tool<T>): void },
  opts: { search?: WebSearchOpts; browse?: BrowsePageOpts; fetchImpl?: FetchImpl } = {},
): Tool[] {
  const tools: Tool[] = [
    createWebSearchTool(opts.search),
    createBrowsePageTool(opts.browse),
    createFetchJsonTool(opts.fetchImpl),
  ];
  for (const t of tools) registry.register(t);
  return tools;
}
