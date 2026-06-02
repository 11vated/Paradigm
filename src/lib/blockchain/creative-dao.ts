import crypto from 'crypto';

// ─── PROPOSAL ─────────────────────────────────────────────────────────────

export interface DAOProposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  type: 'gene_type' | 'domain' | 'royalty_curve' | 'governance' | 'treasury' | 'substrate';
  status: 'draft' | 'voting' | 'passed' | 'rejected' | 'executed';
  votesFor: number;
  votesAgainst: number;
  votingDeadline: string;
  createdAt: string;
  executedAt?: string;
  /** The actual change payload (e.g., a new gene type schema, royalty %) */
  payload: any;
  /** Minimum tokens needed to propose */
  proposalThreshold: number;
}

// ─── ROYALTY CURVE ────────────────────────────────────────────────────────

export interface RoyaltyCurve {
  /** Platform fee percentage (basis points, e.g., 1000 = 10%) */
  platformFeeBps: number;
  /** Seller share percentage (basis points) */
  sellerShareBps: number;
  /** Lineage pool percentage (basis points) — distributed to ancestors */
  lineagePoolBps: number;
  /** Decay factor — each generation gets this fraction of the previous */
  decayFactor: number;
  /** Minimum dust threshold in cents */
  dustThresholdCents: number;
}

export const DEFAULT_ROYALTY_CURVE: RoyaltyCurve = {
  platformFeeBps: 1000,
  sellerShareBps: 7000,
  lineagePoolBps: 3000,
  decayFactor: 0.5,
  dustThresholdCents: 1,
};

// ─── CREATIVE DAO ─────────────────────────────────────────────────────────

export class CreativeDAO {
  private proposals: DAOProposal[] = [];
  private proposalCount = 0;
  private _royaltyCurve: RoyaltyCurve = { ...DEFAULT_ROYALTY_CURVE };
  private _approvedGeneTypes = new Set<string>();
  private _constitutionalCommitments: string[] = [];

  get royaltyCurve(): RoyaltyCurve { return { ...this._royaltyCurve }; }
  get approvedGeneTypes(): string[] { return Array.from(this._approvedGeneTypes); }

  /**
   * Initialize with constitutional commitments.
   */
  constructor() {
    this._constitutionalCommitments = [
      'No silent guesses — every measured value carries confidence',
      'No living-person gseeds in foundation namespace',
      'No copyrighted derivatives without fair-use attestation',
      'No trademarked-specific named gseeds in foundation namespace',
      'No sacred cultural symbols without source-culture attribution',
      'No diagnostic claims about identifiable persons',
      'No weapon manufacturing schematics',
      'Forever-signed credit lineage on every authoreowned gseed',
      'Tombstone deletion preserves lineage — credit cannot be erased',
      'Mechanics yes, trademark no — character power systems',
      'Mechanics yes, studio no — media craft techniques',
      'The substrate is open by construction — ext:// protocol for anything',
    ];
  }

  get commitments(): string[] { return [...this._constitutionalCommitments]; }

  /**
   * Submit a new proposal (requires minimum tokens staked).
   */
  propose(
    title: string,
    description: string,
    proposer: string,
    type: DAOProposal['type'],
    payload: any,
    stakeTokens: number = 0,
  ): DAOProposal | { error: string } {
    if (stakeTokens < this.getProposalThreshold(type)) {
      return { error: `Minimum stake: ${this.getProposalThreshold(type)} PARA tokens` };
    }

    const proposal: DAOProposal = {
      id: `PIP-${++this.proposalCount}`,
      title,
      description,
      proposer,
      type,
      status: 'voting',
      votesFor: 0,
      votesAgainst: 0,
      votingDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      payload,
      proposalThreshold: this.getProposalThreshold(type),
    };

    this.proposals.push(proposal);
    return proposal;
  }

  /**
   * Cast a vote on a proposal.
   */
  vote(proposalId: string, _voter: string, support: boolean, votingPower: number): { success: boolean } | { error: string } {
    const prop = this.proposals.find(p => p.id === proposalId);
    if (!prop) return { error: 'Proposal not found' };
    if (prop.status !== 'voting') return { error: 'Voting period ended' };
    if (new Date(prop.votingDeadline) < new Date()) {
      prop.status = prop.votesFor > prop.votesAgainst ? 'passed' : 'rejected';
      return { error: 'Voting period ended' };
    }

    if (support) prop.votesFor += votingPower;
    else prop.votesAgainst += votingPower;

    return { success: true };
  }

  /**
   * Execute a passed proposal.
   */
  execute(proposalId: string): { success: boolean; result?: string } | { error: string } {
    const prop = this.proposals.find(p => p.id === proposalId);
    if (!prop) return { error: 'Proposal not found' };
    if (prop.status !== 'passed') return { error: 'Proposal has not passed' };

    prop.status = 'executed';
    prop.executedAt = new Date().toISOString();

    switch (prop.type) {
      case 'royalty_curve':
        this._royaltyCurve = { ...this._royaltyCurve, ...prop.payload };
        return { success: true, result: 'Royalty curve updated' };
      case 'gene_type':
        if (prop.payload.name) this._approvedGeneTypes.add(prop.payload.name);
        return { success: true, result: `Gene type ${prop.payload.name} approved` };
      default:
        return { success: true, result: 'Proposal executed' };
    }
  }

  private getProposalThreshold(type: DAOProposal['type']): number {
    switch (type) {
      case 'gene_type': return 1000;
      case 'domain': return 5000;
      case 'royalty_curve': return 10000;
      case 'governance': return 25000;
      case 'treasury': return 50000;
      case 'substrate': return 100000;
      default: return 1000;
    }
  }

  /**
   * Get all proposals.
   */
  getProposals(status?: DAOProposal['status']): DAOProposal[] {
    if (status) return this.proposals.filter(p => p.status === status);
    return [...this.proposals];
  }

  /**
   * Get proposal by ID.
   */
  getProposal(id: string): DAOProposal | undefined {
    return this.proposals.find(p => p.id === id);
  }
}

// ─── SINGLETON ────────────────────────────────────────────────────────────

export const creativeDAO = new CreativeDAO();

// ─── TRAINING DATA CANON ─────────────────────────────────────────────────

export interface TrainingEntry {
  seedHash: string;
  domain: string;
  license: string;
  genes: Record<string, any>;
  artifactHash: string;
  quality: number;
  contributedBy: string;
}

/**
 * The AI Training Data Canon — every seed here is provably licensed
 * for AI training use. This solves the $1T+ unlicensed data liability
 * problem.
 */
export class TrainingDataCanon {
  private entries: TrainingEntry[] = [];

  /**
   * Register a seed for training use (must have permissive license).
   */
  register(seed: any, licenseType: string): TrainingEntry | { error: string } {
    if (!['CC-BY-4.0', 'CC-BY-SA-4.0', 'MIT', 'public-domain'].includes(licenseType)) {
      return { error: `License ${licenseType} does not permit training use` };
    }

    const entry: TrainingEntry = {
      seedHash: seed.$hash || seed.id,
      domain: seed.$domain || 'unknown',
      license: licenseType,
      genes: seed.genes || {},
      artifactHash: crypto.createHash('sha256').update(JSON.stringify(seed)).digest('hex'),
      quality: seed.$fitness?.overall || 0.5,
      contributedBy: seed.$owner?.userId || 'anonymous',
    };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Query the canon — returns seeds that can be used for training.
   */
  query(opts: {
    domains?: string[];
    minQuality?: number;
    license?: string;
    limit?: number;
  }): TrainingEntry[] {
    let results = [...this.entries];

    if (opts.domains) results = results.filter(e => opts.domains!.includes(e.domain));
    if (opts.minQuality) results = results.filter(e => e.quality >= opts.minQuality!);
    if (opts.license) results = results.filter(e => e.license === opts.license);

    return results.slice(0, opts.limit || 100);
  }

  get size(): number { return this.entries.length; }
}

export const trainingCanon = new TrainingDataCanon();
