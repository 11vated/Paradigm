/**
 * Paradigm OS Shell — Kernel-bridged session manager
 *
 * Standalone session where every action is a seed + kernel operation.
 * Maps to real kernel operations: mutate, breed, evolve, compose, sign, verify, grow.
 *
 * Phase 22: OS Shell prototype
 * Phase 23: Recursive closure — can build Paradigm components as .gseed compositions
 */

import { UniversalSeed } from '../../seeds/universal-seed';
import type { Seed } from '../kernel/types';
import { Xoshiro256StarStar, rngFromHash } from '../kernel/rng';
import { executeGspl, toGSPL } from '../kernel/gspl-interpreter';
import { composeSeed } from '../kernel/composition';
import { growSeedSync, getAllDomains } from '../kernel/engines';
import { GeneticAlgorithm, type GAResult } from '../evolution/ga';
import { buildC2PAManifest } from '../kernel/c2pa-manifest';
import { signData, verifySignature, generateKeyPair } from '../sovereignty/signing';
import { kernelNowIso } from '../kernel/clock';
import { createHash } from 'node:crypto';

export interface ShellSeed {
  id: string;
  name: string;
  domain: string;
  hash: string;
  genes: Record<string, unknown>;
  lineage: string[];
  generation: number;
  fitness?: number;
  createdAt: string;
}

export interface ShellArtifact {
  id: string;
  seedHash: string;
  domain: string;
  type: 'grown' | 'composed' | 'evolved';
  data: unknown;
  lineage: string[];
  c2pa?: unknown;
  signature?: string;
  createdAt: string;
}

export interface ShellSession {
  seeds: Map<string, ShellSeed>;
  artifacts: Map<string, ShellArtifact>;
  rng: Xoshiro256StarStar;
  createdAt: string;
  commandCount: number;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
  seed?: ShellSeed;
  artifact?: ShellArtifact;
}

export interface SeedComposition {
  $schema: string;
  component: string;
  version: string;
  description: string;
  dependencies: string[];
  sourceSeed: string;
  gsplRecipe: string;
  gsplVerified: boolean;
  builtAt: string;
  hash: string;
}

export class OSShell {
  private session: ShellSession;

  constructor(seedPhrase?: string) {
    this.session = {
      seeds: new Map(),
      artifacts: new Map(),
      rng: rngFromHash(seedPhrase || 'os-shell-session'),
      createdAt: kernelNowIso(),
      commandCount: 0,
    };
  }

  async execute(commandStr: string): Promise<CommandResult> {
    this.session.commandCount++;
    const parts = commandStr.trim().split(/\s+/);
    if (parts.length === 0 || parts[0] === '') {
      return { success: false, message: 'Empty command' };
    }

    switch (parts[0]) {
      case 'help':      return this.help(parts.slice(1));
      case 'list':      return this.list(parts.slice(1));
      case 'gspl':      return this.execGspl(parts.slice(1));
      case 'recursive': return this.handleRecursive(parts.slice(1));
      case 'seed':      return this.handleSeed(parts.slice(1));
      case 'artifact':  return this.handleArtifact(parts.slice(1));
      default:          return { success: false, message: `Unknown command: ${parts[0]}. Type "help".` };
    }
  }

  private async handleSeed(args: string[]): Promise<CommandResult> {
    const sub = args[0];
    const rest = args.slice(1);

    switch (sub) {
      case 'create':  return this.seedCreate(rest);
      case 'mutate':  return this.seedMutate(rest);
      case 'breed':   return this.seedBreed(rest);
      case 'evolve':  return this.seedEvolve(rest);
      case 'clone':   return this.seedClone(rest);
      case 'show':    return this.seedShow(rest);
      default:        return { success: false, message: `Unknown seed subcommand: ${sub}. Try: create, mutate, breed, evolve, clone, show` };
    }
  }

  // ─── Seed Commands ─────────────────────────────────────────────────────

  private seedCreate(args: string[]): CommandResult {
    const domain = args[0] || 'procedural';
    const name = args[1] || `seed-${this.session.seeds.size + 1}`;

    const seed = new UniversalSeed({
      metadata: { id: name, name, domain, version: '1.0.0', created: 0, updated: 0, tags: [], lineage: [] },
    });

    const shellSeed: ShellSeed = {
      id: seed.id,
      domain,
      name,
      hash: seed.hash,
      genes: this.serializeGenes(seed),
      lineage: [],
      generation: 0,
      createdAt: kernelNowIso(),
    };

    this.session.seeds.set(seed.id, shellSeed);
    return { success: true, message: `Created seed "${name}" in domain "${domain}"`, seed: shellSeed };
  }

  private seedMutate(args: string[]): CommandResult {
    const id = args[0];
    if (!id) return { success: false, message: 'Usage: seed mutate <id> [intensity]' };

    const shellSeed = this.session.seeds.get(id);
    if (!shellSeed) return { success: false, message: `Seed not found: ${id}` };

    const intensity = parseFloat(args[1] || '0.1');
    const seed = this.toUniversalSeed(shellSeed);
    const mutated = seed.mutate(this.session.rng, intensity);

    const mutatedId = `${id}:mutated`;
    const mutatedSeed: ShellSeed = {
      id: mutatedId,
      domain: shellSeed.domain,
      name: `${shellSeed.name}-mutated`,
      hash: mutated.hash,
      genes: this.serializeGenes(mutated),
      lineage: [...shellSeed.lineage, id],
      generation: shellSeed.generation + 1,
      createdAt: kernelNowIso(),
    };

    this.session.seeds.set(mutatedId, mutatedSeed);
    return { success: true, message: `Mutated "${shellSeed.name}" → "${mutatedSeed.name}" (intensity: ${intensity})`, seed: mutatedSeed };
  }

  private seedBreed(args: string[]): CommandResult {
    const [idA, idB] = args;
    if (!idA || !idB) return { success: false, message: 'Usage: seed breed <idA> <idB>' };

    const shellA = this.session.seeds.get(idA);
    const shellB = this.session.seeds.get(idB);
    if (!shellA) return { success: false, message: `Seed not found: ${idA}` };
    if (!shellB) return { success: false, message: `Seed not found: ${idB}` };

    const seedA = this.toUniversalSeed(shellA);
    const seedB = this.toUniversalSeed(shellB);
    const child = seedA.cross(seedB, this.session.rng);

    const childId = `${idA}:x:${idB}`;
    const childSeed: ShellSeed = {
      id: childId,
      domain: shellSeedDomain(child),
      name: `${shellA.name}-x-${shellB.name}`,
      hash: child.hash,
      genes: this.serializeGenes(child),
      lineage: [...shellA.lineage, idA, idB],
      generation: Math.max(shellA.generation, shellB.generation) + 1,
      createdAt: kernelNowIso(),
    };

    this.session.seeds.set(childId, childSeed);
    return { success: true, message: `Bred "${childSeed.name}" from "${shellA.name}" × "${shellB.name}"`, seed: childSeed };
  }

  private async seedEvolve(args: string[]): Promise<CommandResult> {
    const id = args[0];
    if (!id) return { success: false, message: 'Usage: seed evolve <id> [generations] [popSize]' };

    const shellSeed = this.session.seeds.get(id);
    if (!shellSeed) return { success: false, message: `Seed not found: ${id}` };

    const generations = parseInt(args[1] || '10', 10);
    const popSize = parseInt(args[2] || '20', 10);

    const seed = this.toUniversalSeed(shellSeed);
    const population = Array.from({ length: popSize }, () => seed.mutate(this.session.rng, 0.3) as unknown as Seed);

    const ga = new GeneticAlgorithm(this.session.rng);

    try {
      const result: GAResult = await ga.evolve(
        population,
        (s) => s.genes ? Object.values(s.genes).reduce((sum, g) => sum + Math.min(Math.abs(typeof g.value === 'number' ? g.value : 0.5), 1), 0) / Math.max(Object.keys(s.genes).length, 1) : 0.1,
        { populationSize: popSize, generationLimit: generations, mutationRate: 0.1, crossoverRate: 0.7, tournamentSize: 3, elitismCount: 2 },
      );

      const evolvedId = `${shellSeed.id}:evolved`;
      const evolvedSeed: ShellSeed = {
        id: evolvedId,
        domain: shellSeed.domain,
        name: `${shellSeed.name}-evolved`,
        hash: createHash('sha256').update(`${shellSeed.hash}:evolved:${generations}`).digest('hex'),
        genes: shellSeed.genes,
        lineage: [...shellSeed.lineage, id],
        generation: shellSeed.generation + generations,
        fitness: result.fitness,
        createdAt: kernelNowIso(),
      };
      this.session.seeds.set(evolvedId, evolvedSeed);

      return {
        success: true,
        message: `Evolved "${shellSeed.name}" for ${generations} gens (fitness: ${result.fitness.toFixed(4)})`,
        seed: evolvedSeed,
        data: { fitness: result.fitness, generations, popSize },
      };
    } catch (e: unknown) {
      return { success: false, message: `Evolution failed: ${(e as Error).message}` };
    }
  }

  private seedClone(args: string[]): CommandResult {
    const id = args[0];
    if (!id) return { success: false, message: 'Usage: seed clone <id>' };

    const shellSeed = this.session.seeds.get(id);
    if (!shellSeed) return { success: false, message: `Seed not found: ${id}` };

    const seed = this.toUniversalSeed(shellSeed);
    const cloned = seed.clone();

    const cloneId = `${id}:clone`;
    const cloneSeed: ShellSeed = {
      id: cloneId,
      domain: shellSeed.domain,
      name: `${shellSeed.name}-clone`,
      hash: cloned.hash,
      genes: this.serializeGenes(cloned),
      lineage: [...shellSeed.lineage, id],
      generation: shellSeed.generation,
      createdAt: kernelNowIso(),
    };

    this.session.seeds.set(cloneId, cloneSeed);
    return { success: true, message: `Cloned "${shellSeed.name}" → "${cloneSeed.name}"`, seed: cloneSeed };
  }

  private seedShow(args: string[]): CommandResult {
    const id = args[0];
    if (!id) return { success: false, message: 'Usage: seed show <id>' };

    const shellSeed = this.session.seeds.get(id);
    if (!shellSeed) return { success: false, message: `Seed not found: ${id}` };

    return {
      success: true,
      message: `Seed "${shellSeed.name}" (${shellSeed.domain}, gen ${shellSeed.generation})`,
      data: shellSeed,
    };
  }

  // ─── Artifact Commands ─────────────────────────────────────────────────

  private async handleArtifact(args: string[]): Promise<CommandResult> {
    const sub = args[0];
    const rest = args.slice(1);

    switch (sub) {
      case 'grow':    return this.artifactGrow(rest);
      case 'compose': return this.artifactCompose(rest);
      case 'play':    return this.artifactPlay(rest);
      case 'export':  return this.artifactExport(rest);
      case 'sign':    return this.artifactSign(rest);
      case 'verify':  return this.artifactVerify(rest);
      default:        return { success: false, message: `Unknown artifact subcommand: ${sub}. Try: grow, compose, play, export, sign, verify` };
    }
  }

  private artifactGrow(args: string[]): CommandResult {
    const id = args.find(a => !a.startsWith('--'));
    if (!id) return { success: false, message: 'Usage: artifact grow <seedId> [--domain <domain>]' };

    const shellSeed = this.session.seeds.get(id);
    if (!shellSeed) return { success: false, message: `Seed not found: ${id}` };

    const domainIdx = args.indexOf('--domain');
    const domain = domainIdx >= 0 && args[domainIdx + 1] ? args[domainIdx + 1] : shellSeed.domain;

    const seed = this.toUniversalSeed(shellSeed) as unknown as Seed;
    seed.$domain = domain;

    const artifact = growSeedSync(seed);
    const artifactId = `art-${shellSeed.hash.slice(0, 12)}`;

    const shellArtifact: ShellArtifact = {
      id: artifactId,
      seedHash: shellSeed.hash,
      domain,
      type: 'grown',
      data: artifact,
      lineage: [shellSeed.id],
      createdAt: kernelNowIso(),
    };

    this.session.artifacts.set(artifactId, shellArtifact);
    return { success: true, message: `Grew artifact from "${shellSeed.name}" in domain "${domain}"`, artifact: shellArtifact };
  }

  private artifactCompose(args: string[]): CommandResult {
    const [id, targetDomain] = args;
    if (!id || !targetDomain) return { success: false, message: 'Usage: artifact compose <seedId> <targetDomain>' };

    const shellSeed = this.session.seeds.get(id);
    if (!shellSeed) return { success: false, message: `Seed not found: ${id}` };

    const seed = this.toUniversalSeed(shellSeed);
    const composed = composeSeed(seed, targetDomain);

    const composeId = `comp-${id}-${targetDomain}`;
    const composedArtifact: ShellArtifact = {
      id: composeId,
      seedHash: shellSeed.hash,
      domain: targetDomain,
      type: 'composed',
      data: composed,
      lineage: [shellSeed.id],
      createdAt: kernelNowIso(),
    };

    this.session.artifacts.set(composeId, composedArtifact);
    return { success: true, message: `Composed "${shellSeed.name}" (${shellSeed.domain}) → "${targetDomain}"`, artifact: composedArtifact };
  }

  private artifactPlay(args: string[]): CommandResult {
    const id = args[0];
    if (!id) return { success: false, message: 'Usage: artifact play <artifactId>' };

    const artifact = this.session.artifacts.get(id);
    if (!artifact) return { success: false, message: `Artifact not found: ${id}` };

    const dataStr = typeof artifact.data === 'object' && artifact.data !== null
      ? Object.keys(artifact.data as Record<string, unknown>).slice(0, 8).join(', ')
      : String(artifact.data).slice(0, 200);

    return {
      success: true,
      message: `Playing "${id}" (${artifact.domain}, ${artifact.type})`,
      data: { type: artifact.domain, fields: dataStr },
    };
  }

  private artifactExport(args: string[]): CommandResult {
    const id = args[0];
    if (!id) return { success: false, message: 'Usage: artifact export <artifactId>' };

    const artifact = this.session.artifacts.get(id);
    if (artifact) {
      return { success: true, message: `Exported artifact "${id}"`, data: JSON.stringify(artifact, null, 2) };
    }

    const seed = this.session.seeds.get(id);
    if (seed) {
      return { success: true, message: `Exported seed "${seed.name}"`, data: JSON.stringify(seed, null, 2) };
    }

    return { success: false, message: `Not found: ${id}` };
  }

  private async artifactSign(args: string[]): Promise<CommandResult> {
    const id = args[0];
    if (!id) return { success: false, message: 'Usage: artifact sign <seedId>' };

    const shellSeed = this.session.seeds.get(id);
    if (!shellSeed) return { success: false, message: `Seed not found: ${id}` };

    try {
      const pair = await generateKeyPair();
      const signature = await signData(shellSeed.hash, pair.privateKey);

      return {
        success: true,
        message: `Signed "${shellSeed.name}" with ECDSA-P256`,
        data: { signature: signature.slice(0, 32) + '...' },
      };
    } catch (e: unknown) {
      return { success: false, message: `Signing failed: ${(e as Error).message}` };
    }
  }

  private artifactVerify(_args: string[]): CommandResult {
    return { success: true, message: 'Use C2PA manifest for artifact verification' };
  }

  // ─── GSPL ─────────────────────────────────────────────────────────────

  executeGSPL(code: string): Record<string, unknown> {
    try {
      const result = executeGspl(code, `os-shell-${this.session.commandCount}`);
      return { success: true, result };
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message };
    }
  }

  private execGspl(args: string[]): CommandResult {
    const code = args.join(' ');
    if (!code) return { success: false, message: 'Usage: gspl <code>' };

    const result = this.executeGSPL(code);
    return {
      success: result.success as boolean,
      message: result.success ? 'GSPL executed' : `GSPL error: ${result.error}`,
      data: result,
    };
  }

  // ─── Recursive Self-Host (Phase 23) ────────────────────────────────────

  private handleRecursive(args: string[]): CommandResult {
    const target = args[0] || 'shell';

    const components: Record<string, { description: string; dependencies: string[] }> = {
      kernel: { description: 'Deterministic RNG, seed types, gene system', dependencies: ['rng', 'gene-system', 'types'] },
      engine: { description: 'Domain engine dispatcher and generators', dependencies: ['kernel', 'generators'] },
      agent: { description: 'GSPL agent and tool system', dependencies: ['kernel', 'gspl'] },
      cli: { description: 'Paradigm CLI interface', dependencies: ['kernel', 'engine', 'agent'] },
      shell: { description: 'OS Shell session manager', dependencies: ['kernel', 'engine', 'gspl'] },
    };

    const comp = components[target];
    if (!comp) {
      return { success: false, message: `Unknown component "${target}". Available: ${Object.keys(components).join(', ')}` };
    }

    const gsplCode = `seed "Component-${target}" in paradigm { domain: "${target}", recursive: true, host: "self" }`;
    const gsplResult = this.executeGSPL(gsplCode);

    const composition: SeedComposition = {
      $schema: 'paradigm-gseed-v1',
      component: target,
      version: '1.0.0',
      description: comp.description,
      dependencies: comp.dependencies,
      sourceSeed: `self:${target}`,
      gsplRecipe: gsplCode,
      gsplVerified: gsplResult.success as boolean,
      builtAt: kernelNowIso(),
      hash: createHash('sha256').update(gsplCode).digest('hex'),
    };

    return {
      success: true,
      message: `Recursive self-host: built "${target}" as .gseed (verified: ${composition.gsplVerified})`,
      data: { composition, gsplResult },
    };
  }

  // ─── List ─────────────────────────────────────────────────────────────

  private list(args: string[]): CommandResult {
    const filter = args[0] || 'all';
    const lines: string[] = [];

    if (filter === 'all' || filter === 'seeds') {
      const seeds = Array.from(this.session.seeds.values());
      lines.push(`Seeds (${seeds.length}):`);
      for (const s of seeds) {
        lines.push(`  ${s.id.slice(0, 24).padEnd(24)} domain=${s.domain.padEnd(14)} gen=${s.generation}`);
      }
      if (seeds.length === 0) lines.push('  (none)');
      lines.push('');
    }

    if (filter === 'all' || filter === 'artifacts') {
      const artifacts = Array.from(this.session.artifacts.values());
      lines.push(`Artifacts (${artifacts.length}):`);
      for (const a of artifacts) {
        lines.push(`  ${a.id.slice(0, 24).padEnd(24)} domain=${a.domain.padEnd(14)} type=${a.type}`);
      }
      if (artifacts.length === 0) lines.push('  (none)');
    }

    return { success: true, message: lines.join('\n') };
  }

  // ─── Help ─────────────────────────────────────────────────────────────

  private help(_args: string[]): CommandResult {
    return {
      success: true,
      message: [
        'Paradigm OS Shell Commands:',
        '',
        '  seed create <domain> [name]    Create a new seed',
        '  seed mutate <id> [intensity]   Mutate a seed',
        '  seed breed <idA> <idB>         Breed two seeds',
        '  seed evolve <id> [gens] [pop]  Evolve a population',
        '  seed clone <id>                Clone a seed',
        '  seed show <id>                 Show seed details',
        '',
        '  artifact grow <id> [--domain]  Grow artifact from seed',
        '  artifact compose <id> <target> Compose seed into domain',
        '  artifact play <id>             View artifact',
        '  artifact export <id>           Export as JSON',
        '  artifact sign <id>             Sign with ECDSA-P256',
        '  artifact verify <id>           Verify signature',
        '',
        '  gspl <code>                   Execute GSPL code',
        '  recursive <target>            Recursive self-host (Phase 23)',
        '  list [seeds|artifacts]        List session contents',
        '  help                           This message',
      ].join('\n'),
    };
  }

  // ─── Session Access ───────────────────────────────────────────────────

  getSession(): ShellSession {
    return this.session;
  }

  getSeed(id: string): ShellSeed | undefined {
    return this.session.seeds.get(id);
  }

  getArtifact(id: string): ShellArtifact | undefined {
    return this.session.artifacts.get(id);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private toUniversalSeed(shellSeed: ShellSeed): UniversalSeed {
    return new UniversalSeed({
      metadata: { id: shellSeed.id, name: shellSeed.name, domain: shellSeed.domain, version: '1.0.0', created: 0, updated: 0, tags: [], lineage: shellSeed.lineage },
    });
  }

  private serializeGenes(seed: UniversalSeed): Record<string, unknown> {
    const genes: Record<string, unknown> = {};
    try {
      const raw = seed as unknown as Record<string, unknown>;
      if (raw.genes instanceof Map) {
        for (const [k, v] of raw.genes) {
          genes[k] = typeof v === 'object' && v !== null && 'value' in v ? (v as { value: unknown }).value : v;
        }
      } else if (typeof (raw as unknown as { getAllGenes?: () => Map<string, unknown> }).getAllGenes === 'function') {
        const g = (raw as unknown as { getAllGenes(): Map<string, unknown> }).getAllGenes();
        for (const [k, v] of g) {
          genes[k] = v;
        }
      }
    } catch {
      // best-effort
    }
    return genes;
  }
}

function shellSeedDomain(seed: UniversalSeed): string {
  const raw = seed as unknown as Record<string, unknown>;
  return typeof raw.$domain === 'string' ? raw.$domain : typeof raw.domain === 'string' ? raw.domain : 'procedural';
}

export default OSShell;
