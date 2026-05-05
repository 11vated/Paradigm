import type { Seed } from './types';

export interface SeedBranch {
  name: string;
  head: string;
  createdAt: string;
  createdBy: string;
  description?: string;
}

export interface SeedCommit {
  hash: string;
  parentHashes: string[];
  branch: string;
  message: string;
  author: string;
  timestamp: string;
  geneDiffs: GeneDiff[];
}

export interface GeneDiff {
  gene: string;
  oldValue: any;
  newValue: any;
  type: 'modify' | 'add' | 'remove';
}

export interface BranchResult {
  success: boolean;
  branch?: SeedBranch;
  error?: string;
}

class GitForSeedsStore {
  private branches: Map<string, SeedBranch> = new Map();
  private commits: Map<string, SeedCommit> = new Map();
  private refs: Map<string, string> = new Map();

  async createBranch(
    name: string,
    seedHash: string,
    author: string,
    description?: string
  ): Promise<BranchResult> {
    if (this.branches.has(name)) {
      return { success: false, error: `Branch '${name}' already exists` };
    }

    const branch: SeedBranch = {
      name,
      head: seedHash,
      createdAt: new Date().toISOString(),
      createdBy: author,
      description,
    };

    this.branches.set(name, branch);
    this.refs.set(`heads/${name}`, seedHash);

    return { success: true, branch };
  }

  async getBranch(name: string): Promise<SeedBranch | null> {
    return this.branches.get(name) || null;
  }

  async listBranches(): Promise<SeedBranch[]> {
    return Array.from(this.branches.values());
  }

  async deleteBranch(name: string): Promise<boolean> {
    if (name === 'main') {
      return false;
    }
    return this.branches.delete(name);
  }

  async checkout(branchName: string, seedHash: string): Promise<BranchResult> {
    const branch = this.branches.get(branchName);
    if (!branch) {
      return { success: false, error: `Branch '${branchName}' not found` };
    }

    branch.head = seedHash;
    this.refs.set(`heads/${branchName}`, seedHash);

    return { success: true, branch };
  }

  computeGeneDiff(parent: Seed, child: Seed): GeneDiff[] {
    const diffs: GeneDiff[] = [];
    const parentGenes = parent.genes || {};
    const childGenes = child.genes || {};

    const allGenes = new Set([...Object.keys(parentGenes), ...Object.keys(childGenes)]);

    for (const gene of allGenes) {
      const parentVal = parentGenes[gene];
      const childVal = childGenes[gene];

      if (parentVal && !childVal) {
        diffs.push({ gene, oldValue: parentVal, newValue: null, type: 'remove' });
      } else if (!parentVal && childVal) {
        diffs.push({ gene, oldValue: null, newValue: childVal, type: 'add' });
      } else if (JSON.stringify(parentVal) !== JSON.stringify(childVal)) {
        diffs.push({ gene, oldValue: parentVal, newValue: childVal, type: 'modify' });
      }
    }

    return diffs;
  }

  async commit(
    branchName: string,
    seed: Seed,
    parentHashes: string[],
    message: string,
    author: string
  ): Promise<SeedCommit | null> {
    const branch = this.branches.get(branchName);
    if (!branch) return null;

    const parentSeed: Seed | undefined = parentHashes[0] 
      ? { $hash: parentHashes[0], genes: {} } as Seed
      : undefined;

    const geneDiffs = parentSeed 
      ? this.computeGeneDiff(parentSeed, seed)
      : [];

    const commit: SeedCommit = {
      hash: seed.$hash || `seed-${Date.now()}`,
      parentHashes,
      branch: branchName,
      message,
      author,
      timestamp: new Date().toISOString(),
      geneDiffs,
    };

    this.commits.set(commit.hash, commit);
    branch.head = commit.hash;

    return commit;
  }

  async getCommit(hash: string): Promise<SeedCommit | null> {
    return this.commits.get(hash) || null;
  }

  async getCommits(branchName: string, limit: number = 50): Promise<SeedCommit[]> {
    const branch = this.branches.get(branchName);
    if (!branch) return [];

    const commits: SeedCommit[] = [];
    let currentHash = branch.head;

    while (commits.length < limit && currentHash) {
      const commit = this.commits.get(currentHash);
      if (!commit) break;

      commits.push(commit);
      currentHash = commit.parentHashes[0];
    }

    return commits;
  }

  async merge(
    sourceBranch: string,
    targetBranch: string,
    author: string,
    message?: string
  ): Promise<{ success: boolean; commit?: SeedCommit; error?: string }> {
    const source = this.branches.get(sourceBranch);
    const target = this.branches.get(targetBranch);

    if (!source || !target) {
      return { success: false, error: 'Branch not found' };
    }

    const sourceCommits = await this.getCommits(sourceBranch, 100);
    const targetCommits = await this.getCommits(targetBranch, 100);

    const sourceSet = new Set(sourceCommits.map(c => c.hash));
    const mergeBase = targetCommits.find(c => sourceSet.has(c.hash));

    if (!mergeBase) {
      return { 
        success: false, 
        error: 'No common ancestor - cannot merge' 
      };
    }

    const sourceHead = source.head;
    const targetHead = target.head;

    await this.commit(
      targetBranch,
      { $hash: `${sourceHead}+${targetHead}`, genes: {} } as Seed,
      [sourceHead, targetHead],
      message || `Merge branch '${sourceBranch}' into '${targetBranch}'`,
      author
    );

    return { success: true };
  }

  async diff(branchA: string, branchB: string): Promise<GeneDiff[]> {
    const branchACommits = await this.getCommits(branchA, 1);
    const branchBCommits = await this.getCommits(branchB, 1);

    if (!branchACommits.length || !branchBCommits.length) {
      return [];
    }

    const seedA = { $hash: branchACommits[0].hash, genes: {} } as Seed;
    const seedB = { $hash: branchBCommits[0].hash, genes: {} } as Seed;

    return this.computeGeneDiff(seedA, seedB);
  }

  async squash(
    branchName: string,
    message: string,
    author: string
  ): Promise<SeedCommit | null> {
    const commits = await this.getCommits(branchName, 20);
    if (commits.length <= 1) return commits[0] || null;

    const firstParent = commits[commits.length - 1].hash;
    const allGeneDiffs = commits.flatMap(c => c.geneDiffs);

    const squashed: SeedCommit = {
      hash: `squashed-${Date.now()}`,
      parentHashes: [firstParent],
      branch: branchName,
      message,
      author,
      timestamp: new Date().toISOString(),
      geneDiffs: allGeneDiffs,
    };

    this.commits.set(squashed.hash, squashed);
    await this.checkout(branchName, squashed.hash);

    return squashed;
  }
}

export const gitForSeeds = new GitForSeedsStore();