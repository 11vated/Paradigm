import { useSeedStore } from '@/stores/seedStore';

/**
 * KernelInterface defines the contract for GSPL kernel operations.
 * This allows the GSPL interpreter to call real API endpoints via the store.
 */
export interface KernelInterface {
  createSeed: (name: string, domain: string, genes?: Record<string, unknown>) => Promise<any>;
  mutateSeed: (seed: unknown, intensity?: number) => Promise<any>;
  breedSeeds: (parentA: unknown, parentB: unknown) => Promise<any>;
  growArtifact: (seed: unknown) => Promise<any>;
  evolveSeed: (seed: unknown, config?: Record<string, unknown>) => Promise<any>;
  composeSeed: (seed: unknown, targetDomain: string) => Promise<any>;
}

/**
 * Creates a KernelInterface implementation that delegates to the Zustand store actions.
 * This allows the GSPL interpreter to call real API endpoints via the store.
 *
 * Usage:
 *   const kernel = createStoreKernel();
 *   const interpreter = new Interpreter(kernel);
 */
export function createStoreKernel(): KernelInterface {
  // We need to get the current store state. Since this is called outside React components,
  // we can use the store directly. However, the store actions are async and return promises.
  // The KernelInterface expects async methods, so that's fine.

  // But note: The store actions are defined in a Zustand store which is a hook.
  // We can call the hook's methods directly: useSeedStore.getState().createSeed(...)
  // However, we need to be careful about React rendering. Since this is called from
  // the interpreter (which runs outside React event handlers), we can use the store's API directly.

  // Actually, let's create a kernel that uses the store's API directly.
  // We'll import the store and use its getState() method.

  const store = useSeedStore;

  return {
    createSeed: async (name: string, domain: string, genes?: Record<string, unknown>) => {
      const result = await store.getState().createSeed({ name, $domain: domain, genes: genes || {} });
      return result;
    },

    mutateSeed: async (seed: unknown, intensity?: number) => {
      // seed might be a seed object or an ID
      const seedId = typeof seed === 'object' && seed !== null && (seed as any).id 
        ? (seed as any).id 
        : seed;
      const result = await store.getState().mutateSeed(seedId, { intensity });
      return result;
    },

    breedSeeds: async (parentA: unknown, parentB: unknown) => {
      const parentAId = typeof parentA === 'object' && parentA !== null && (parentA as any).id 
        ? (parentA as any).id 
        : parentA;
      const parentBId = typeof parentB === 'object' && parentB !== null && (parentB as any).id 
        ? (parentB as any).id 
        : parentB;
      const result = await store.getState().breedSeeds(parentAId, parentBId);
      return result;
    },

    growArtifact: async (seed: unknown) => {
      const seedId = typeof seed === 'object' && seed !== null && (seed as any).id 
        ? (seed as any).id 
        : seed;
      const result = await store.getState().growArtifact(seedId);
      return result;
    },

    evolveSeed: async (seed: unknown, config?: Record<string, unknown>) => {
      const seedId = typeof seed === 'object' && seed !== null && (seed as any).id 
        ? (seed as any).id 
        : seed;
      const result = await store.getState().evolveSeed(seedId, config);
      return result;
    },

    composeSeed: async (seed: unknown, targetDomain: string) => {
      const seedId = typeof seed === 'object' && seed !== null && (seed as any).id 
        ? (seed as any).id 
        : seed;
      const result = await store.getState().composeSeed(seedId, targetDomain);
      return result;
    },
  };
}

/**
 * For use in React components, we can create a kernel that uses the store's actions
 * via the hook. However, since the interpreter is created during execution,
 * we can pass the kernel as a parameter.
 */
export function useStoreKernel(): KernelInterface {
  // This is a hook that returns a kernel backed by the store.
  // We can use the store's getState() inside the methods.
  const store = useSeedStore;

  return {
    createSeed: async (name: string, domain: string, genes?: Record<string, unknown>) => {
      const result = await store.getState().createSeed({ name, $domain: domain, genes: genes || {} });
      return result;
    },

    mutateSeed: async (seed: unknown, intensity?: number) => {
      const seedId = typeof seed === 'object' && seed !== null && (seed as any).id 
        ? (seed as any).id 
        : seed;
      const result = await store.getState().mutateSeed(seedId, { intensity });
      return result;
    },

    breedSeeds: async (parentA: unknown, parentB: unknown) => {
      const parentAId = typeof parentA === 'object' && parentA !== null && (parentA as any).id 
        ? (parentA as any).id 
        : parentA;
      const parentBId = typeof parentB === 'object' && parentB !== null && (parentB as any).id 
        ? (parentB as any).id 
        : parentB;
      const result = await store.getState().breedSeeds(parentAId, parentBId);
      return result;
    },

    growArtifact: async (seed: unknown) => {
      const seedId = typeof seed === 'object' && seed !== null && (seed as any).id 
        ? (seed as any).id 
        : seed;
      const result = await store.getState().growArtifact(seedId);
      return result;
    },

    evolveSeed: async (seed: unknown, config?: Record<string, unknown>) => {
      const seedId = typeof seed === 'object' && seed !== null && (seed as any).id 
        ? (seed as any).id 
        : seed;
      const result = await store.getState().evolveSeed(seedId, config);
      return result;
    },

    composeSeed: async (seed: unknown, targetDomain: string) => {
      const seedId = typeof seed === 'object' && seed !== null && (seed as any).id 
        ? (seed as any).id 
        : seed;
      const result = await store.getState().composeSeed(seedId, targetDomain);
      return result;
    },
  };
}
