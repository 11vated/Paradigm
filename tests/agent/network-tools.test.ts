/**
 * Network tools — air-gap enforcement + fetch contract tests
 *
 * Uses a stub fetch so tests never touch the network. Pins:
 *   - air-gap mode blocks every network tool (sovereignty default)
 *   - opt-in mode allows the call with an explicit fetchImpl
 *   - web_search parses SearXNG JSON correctly
 *   - browse_page strips scripts/styles/tags
 *   - fetch_json rejects non-http schemes
 *   - installNetworkTools registers all three on a registry
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createWebSearchTool,
  createBrowsePageTool,
  createFetchJsonTool,
  installNetworkTools,
} from '../../src/lib/intelligence/tools/network';
import type { Tool, ToolContext } from '../../src/lib/intelligence/tools/types';

function ctx(airGap: boolean): ToolContext {
  return {
    caller: 'test',
    airGap,
    signal: new AbortController().signal,
  } as ToolContext;
}

describe('Network tools — sovereignty', () => {
  it('web_search refuses to run in air-gap mode', async () => {
    const tool = createWebSearchTool({ fetchImpl: vi.fn() });
    const r = await tool.execute({ query: 'test' }, ctx(true));
    expect(r.ok).toBe(false);
    expect(r.error!.code).toBe('air_gap');
  });

  it('browse_page refuses to run in air-gap mode', async () => {
    const tool = createBrowsePageTool({ fetchImpl: vi.fn() });
    const r = await tool.execute({ url: 'https://example.com' }, ctx(true));
    expect(r.ok).toBe(false);
    expect(r.error!.code).toBe('air_gap');
  });

  it('fetch_json refuses to run in air-gap mode', async () => {
    const tool = createFetchJsonTool(vi.fn() as never);
    const r = await tool.execute({ url: 'https://example.com/a.json' }, ctx(true));
    expect(r.ok).toBe(false);
    expect(r.error!.code).toBe('air_gap');
  });
});

describe('web_search', () => {
  it('parses SearXNG-format JSON into typed results', async () => {
    const stub = vi.fn(async () => new Response(JSON.stringify({
      results: [
        { title: 'A', url: 'https://a.test', content: 'snippetA', engine: 'duckduckgo' },
        { title: 'B', url: 'https://b.test', content: 'snippetB' },
      ],
    }), { status: 200 }));
    const tool = createWebSearchTool({ baseUrl: 'http://search.local:8888', fetchImpl: stub as never });
    const r = await tool.execute({ query: 'paradigm' }, ctx(false));
    expect(r.ok).toBe(true);
    expect(r.value!.count).toBe(2);
    expect(r.value!.results[0].title).toBe('A');
    expect(r.value!.results[0].source).toBe('duckduckgo');
    expect(stub).toHaveBeenCalledTimes(1);
    expect(stub.mock.calls[0][0]).toContain('q=paradigm');
  });

  it('respects limit caps', async () => {
    const stub = vi.fn(async () => new Response(JSON.stringify({
      results: Array.from({ length: 100 }, (_, i) => ({ title: `T${i}`, url: `https://t${i}.x`, content: '' })),
    }), { status: 200 }));
    const tool = createWebSearchTool({ fetchImpl: stub as never });
    const r = await tool.execute({ query: 'x', limit: 5 }, ctx(false));
    expect(r.ok).toBe(true);
    expect(r.value!.count).toBe(5);
  });

  it('reports HTTP failures cleanly', async () => {
    const stub = vi.fn(async () => new Response('boom', { status: 503 }));
    const tool = createWebSearchTool({ fetchImpl: stub as never });
    const r = await tool.execute({ query: 'x' }, ctx(false));
    expect(r.ok).toBe(false);
    expect(r.error!.code).toBe('http');
  });
});

describe('browse_page', () => {
  it('strips script/style/tags and normalizes whitespace', async () => {
    const html = '<html><head><style>body{color:red}</style></head><body><script>evil()</script><p>Hello\n\n  <b>world</b></p></body></html>';
    const stub = vi.fn(async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }));
    const tool = createBrowsePageTool({ fetchImpl: stub as never });
    const r = await tool.execute({ url: 'https://example.com' }, ctx(false));
    expect(r.ok).toBe(true);
    expect(r.value!.text).toBe('Hello world');
    expect(r.value!.text).not.toContain('evil');
    expect(r.value!.text).not.toContain('color:red');
  });

  it('rejects non-http schemes', async () => {
    const tool = createBrowsePageTool();
    const r = await tool.execute({ url: 'file:///etc/passwd' }, ctx(false));
    expect(r.ok).toBe(false);
    expect(r.error!.code).toBe('protocol');
  });

  it('enforces maxBytes', async () => {
    const huge = 'x'.repeat(600_000);
    const stub = vi.fn(async () => new Response(huge, { status: 200 }));
    const tool = createBrowsePageTool({ fetchImpl: stub as never, maxBytes: 100_000 });
    const r = await tool.execute({ url: 'https://big.test' }, ctx(false));
    expect(r.ok).toBe(false);
    expect(r.error!.code).toBe('too_large');
  });
});

describe('installNetworkTools', () => {
  it('registers all three tools on a registry stub', () => {
    const seen: string[] = [];
    const registry = { register<T>(t: Tool<T>) { seen.push(t.descriptor.id); } };
    installNetworkTools(registry);
    expect(seen.sort()).toEqual(['browse_page', 'fetch_json', 'web_search']);
  });
});
