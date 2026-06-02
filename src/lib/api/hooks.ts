/**
 * PARADIGM REACT HOOKS
 * Custom hooks for interacting with the Paradigm API
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// ─────────────────────────────────────────────────────────────────────────
// SEED HOOKS
// ─────────────────────────────────────────────────────────────────────────

export function useSeeds(initialDomain?: string) {
  const [seeds, setSeeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const fetchSeeds = useCallback(async (domain?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listSeeds({ domain: domain || initialDomain, page });
      setSeeds(result.seeds);
      setTotal(result.pagination?.total ?? result.seeds.length);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, initialDomain]);

  useEffect(() => {
    fetchSeeds();
  }, [fetchSeeds]);

  return { seeds, loading, error, total, page, setPage, refetch: fetchSeeds };
}

export function useSeed(id: string) {
  const [seed, setSeed] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from props; effect is correct
    setLoading(true);
    api.getSeed(id)
      .then(result => setSeed(result))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { seed, loading, error };
}

export function useCreateSeed() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (domain: string, genes: Record<string, any>, name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.createSeed(domain, genes, name);
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────
// GENETIC OPERATIONS HOOKS
// ─────────────────────────────────────────────────────────────────────────

export function useMutate(seedId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (intensity: number = 0.15) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.mutateSeed(seedId, intensity);
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [seedId]);

  return { mutate, loading, error };
}

export function useBreed() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breed = useCallback(async (parent1Id: string, parent2Id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.breedSeeds(parent1Id, parent2Id);
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { breed, loading, error };
}

export function useEvolve(seedId: string) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const evolve = useCallback(async (config: {
    populationSize?: number;
    generationLimit?: number;
    mutationRate?: number;
  } = {}) => {
    setLoading(true);
    setError(null);
    setHistory([]);
    try {
      const evolutionResult = await api.evolveSeed(seedId, config);
      setResult({ population: evolutionResult.population, count: evolutionResult.count, algorithm: evolutionResult.algorithm });
      
      return evolutionResult;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [seedId]);

  return { evolve, result, history, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────
// GROWTH HOOKS
// ─────────────────────────────────────────────────────────────────────────

export function useGrow(seedId: string) {
  const [artifact, setArtifact] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grow = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.growSeed(seedId);
      setArtifact(result);
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [seedId]);

  return { grow, artifact, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────
// COMPOSITION HOOKS
// ─────────────────────────────────────────────────────────────────────────

export function useComposition() {
  const [graph, setGraph] = useState<{ nodes: string[]; edges: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getCompositionGraph();
      setGraph(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const compose = useCallback(async (seedId: string, targetDomain: string) => {
    const result = await api.composeSeed(seedId, targetDomain);
    return result.seed;
  }, []);

  const findPath = useCallback(async (source: string, target: string) => {
    const result = await api.findCompositionPath(source, target);
    return result.path;
  }, []);

  return { graph, compose, findPath, loading, error, refetch: fetchGraph };
}

// ─────────────────────────────────────────────────────────────────────────
// GSPL HOOKS
// ─────────────────────────────────────────────────────────────────────────

export function useGspl() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parse = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      return await api.parseGspl(code);
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const execute = useCallback(async (code: string, context?: any) => {
    setLoading(true);
    setError(null);
    try {
      // First parse
      const { ast, errors } = await parse(code);
      if (errors?.length) {
        throw new Error(errors.map((e: any) => e.message).join('\n'));
      }
      // Then execute
      return await api.executeGspl(ast, context);
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [parse]);

  return { parse, execute, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────
// AGENT HOOKS
// ─────────────────────────────────────────────────────────────────────────

export function useAgent(seedContext?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [generatedSeed, setGeneratedSeed] = useState<any>(null);

  const query = useCallback(async (prompt: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setGeneratedSeed(null);
    try {
      const result = await api.queryAgent(prompt, seedContext);
      setResponse(result.message);
      setGeneratedSeed((result as any).generatedSeed);
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [seedContext]);

  return { query, response, generatedSeed, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────
// SEARCH HOOKS
// ─────────────────────────────────────────────────────────────────────────

export function useSearch() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const search = useCallback(async (query: string, options?: {
    domain?: string;
    minFitness?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.searchSeeds(query, options);
      setResults(result.seeds);
      setTotal(result.pagination?.total ?? result.seeds.length);
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSimilar = useCallback(async (seedId: string, limit: number = 10) => {
    const result = await api.getSimilarSeeds(seedId, limit);
    return result;
  }, []);

  return { search, results, total, loading, error, getSimilar };
}

// ─────────────────────────────────────────────────────────────────────────
// AUTH HOOKS
// ─────────────────────────────────────────────────────────────────────────

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.login(email, password);
      api.setToken(result.accessToken);
      setUser(result.user);
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.register(email, password, name);
      api.setToken(result.accessToken);
      setUser(result.user);
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      api.setToken(null);
      setUser(null);
    }
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      // Could validate token here, for now just assume logged in
      setUser({ loggedIn: true });
    }
    setLoading(false);
  }, []);

  return { user, login, register, logout, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────
// HEALTH HOOKS
// ─────────────────────────────────────────────────────────────────────────

export function useHealth() {
  const [healthy, setHealthy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.healthCheck()
      .then(() => setHealthy(true))
      .catch(() => setHealthy(false))
      .finally(() => setChecking(false));

    const interval = setInterval(async () => {
      try {
        await api.healthCheck();
        setHealthy(true);
      } catch {
        setHealthy(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return { healthy, checking };
}