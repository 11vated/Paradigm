/**
 * Sovereign Agent — thin browser client over the /api/sovereign-agent/* routes.
 */

export interface SovereignAgentRunResponse {
  ok: boolean;
  elapsedMs?: number;
  intent?: { top: string; sub?: string; domains: string[] };
  planHash?: string;
  seed?: any;
  oracle?: { overall: number; axes: Record<string, number>; notes: string[]; conformsTo: string };
  signed?: boolean;
  reality?: { signature: any; dominant: string; magnitude: number };
  iterations?: number;
  timings?: Record<string, number>;
  error?: string;
}

export interface CanonHit {
  hash: string;
  similarity: number;
  text: string;
  meta?: Record<string, unknown>;
}

export interface CanonSearchResponse {
  ok: boolean;
  q?: string;
  count?: number;
  hits?: CanonHit[];
  error?: string;
}

const BASE = '/api/sovereign-agent';

export async function runSovereignAgent(
  utterance: string,
  opts: { feedbackLoop?: boolean; skipValidate?: boolean } = {},
): Promise<SovereignAgentRunResponse> {
  const res = await fetch(`${BASE}/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ utterance, ...opts }),
  });
  return res.json();
}

export async function canonSearch(q: string, k = 10): Promise<CanonSearchResponse> {
  const url = `${BASE}/canon/search?q=${encodeURIComponent(q)}&k=${k}`;
  const res = await fetch(url);
  return res.json();
}

export async function ingestSeedToCanon(seed: unknown): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await fetch(`${BASE}/canon/ingest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ seed }),
  });
  return res.json();
}

export async function getAgentInfo(): Promise<{ ok: boolean; provider?: string; agentVersion?: string; endpoints?: string[] }> {
  const res = await fetch(`${BASE}/info`);
  return res.json();
}
