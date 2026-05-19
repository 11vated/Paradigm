/**
 * Friend API client — typed fetch wrappers for /api/v1/friend/*.
 *
 * Used by the Studio components. All functions return the parsed JSON
 * payload and throw on non-2xx responses.
 */

import type { FriendSeedData, FriendArtifact, LineageNode } from '@/lib/friend';

const BASE = '/api/v1/friend';

export interface FriendGenerateResponse {
  friendSeed: FriendSeedData;
  artifact: FriendArtifact;
  stored: boolean;
}

export interface FriendListResponse {
  friends: FriendSeedData[];
  total: number;
  limit: number;
  offset: number;
}

export interface FriendVerifyResponse {
  valid: boolean;
  reason?: string;
  payloadHash?: string;
  author?: string;
}

export interface FriendKeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: string;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.error ?? body.detail ?? body.message ?? detail;
    } catch { /* not json */ }
    throw new Error(`${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const friendApi = {
  generate: (body: { seed: string; name?: string; archetypeBias?: string }) =>
    jsonFetch<FriendGenerateResponse>(`${BASE}/generate`, { method: 'POST', body: JSON.stringify(body) }),

  breed: (body: { parentAId?: string; parentBId?: string; parentA?: string; parentB?: string; salt?: string }) =>
    jsonFetch<FriendGenerateResponse>(`${BASE}/breed`, { method: 'POST', body: JSON.stringify(body) }),

  mutate: (body: { parentId?: string; parent?: string; magnitude?: number; salt?: string }) =>
    jsonFetch<FriendGenerateResponse>(`${BASE}/mutate`, { method: 'POST', body: JSON.stringify(body) }),

  list: (opts: { limit?: number; offset?: number; sortBy?: 'created' | 'name' } = {}) => {
    const qs = new URLSearchParams();
    if (opts.limit !== undefined) qs.set('limit', String(opts.limit));
    if (opts.offset !== undefined) qs.set('offset', String(opts.offset));
    if (opts.sortBy) qs.set('sortBy', opts.sortBy);
    const q = qs.toString();
    return jsonFetch<FriendListResponse>(`${BASE}/list${q ? '?' + q : ''}`);
  },

  get: (id: string) =>
    jsonFetch<{ friendSeed: FriendSeedData; artifact: FriendArtifact }>(`${BASE}/${id}`),

  lineage: (id: string, depth = 6) =>
    jsonFetch<{ lineage: LineageNode }>(`${BASE}/${id}/lineage?depth=${depth}`),

  remove: (id: string) =>
    jsonFetch<{ removed: boolean; id: string }>(`${BASE}/${id}`, { method: 'DELETE' }),

  generateKeys: () =>
    jsonFetch<FriendKeyPair>(`${BASE}/keys/generate`, { method: 'POST' }),

  sign: (id: string, body: { publicKey: string; privateKey: string }) =>
    jsonFetch<{ friendSeed: FriendSeedData; sovereignty: any }>(
      `${BASE}/${id}/sign`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  verify: (id: string) =>
    jsonFetch<FriendVerifyResponse>(`${BASE}/${id}/verify`, { method: 'POST' }),
};
