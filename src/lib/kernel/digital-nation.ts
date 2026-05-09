/**
 * DIGITAL NATION GOVERNANCE MODEL
 * 
 * Sovereign governance framework for Paradigm territory:
 * - DAO-based governance
 * - Quadratic voting
 * - Reputation-weighted influence
 * - Treasury management
 * - Constitutional charter
 * - Diplomatic relations
 */

import { ethers } from 'ethers';

export interface NationConfig {
  name: string;
  symbol: string;
  territory: {
    x: number;
    y: number;
    size: 'plot' | 'parcel' | 'estate';
  };
  initialMembers: string[];
  initialTreasury: string; // ETH amount
}

export interface Proposal {
  id: string;
  type: 
    | 'constitutional'   // Charter amendments
    | 'treasury'         // Fund allocation
    | 'membership'       // Add/remove citizens
    | 'diplomatic'       // Relations with other nations
    | 'infrastructure'   // Build/upgrade
    | 'evolution'        // Protocol upgrades
    | 'judicial'         // Dispute resolution
    | 'election'         // Leadership positions
    | 'referendum';      // Direct citizen vote
  title: string;
  description: string;
  proposer: string;
  createdAt: number;
  deadline: number;
  status: 'active' | 'passed' | 'rejected' | 'executed' | 'vetoed';
  votes: Vote[];
  executionData?: string;
  quorum: number;      // Required votes to pass
  threshold: number;   // Required ratio to pass
}

export interface Vote {
  voter: string;
  choice: 'for' | 'against' | 'abstain';
  weight: number;       // Quadratic voting weight
  reason?: string;
  timestamp: number;
}

export interface Citizen {
  address: string;
  joinedAt: number;
  reputation: number;
  tokensStaked: number;
  votingPower: number;
  roles: ('citizen' | 'senator' | 'judge' | 'ambassador' | 'founder')[];
  contributionScore: number;
}

export interface Treaty {
  id: string;
  parties: string[]; // Nation IDs
  type: 'trade' | 'alliance' | 'non_aggression' | 'cultural';
  terms: Record<string, any>;
  ratifiedAt: number;
  expiresAt?: number;
  status: 'proposed' | 'ratified' | 'violated' | 'expired';
}

/**
 * Digital Nation DAO
 */
export class DigitalNation {
  private citizens: Map<string, Citizen> = new Map();
  private proposals: Map<string, Proposal> = new Map();
  private treaties: Map<string, Treaty> = new Map();
  private treasury: string = '0';
  private constitution: Record<string, any> = {};
  private currentProposalId = 0;
  
  constructor(
    public readonly nationId: string,
    private config: NationConfig
  ) {
    this.initialize(config);
  }
  
  private initialize(config: NationConfig): void {
    this.treasury = config.initialTreasury;
    this.constitution = {
      version: '1.0',
      preamble: `Constitution of ${config.name}`,
      articles: {
        1: { title: 'Sovereignty', content: 'This nation is sovereign and self-governing' },
        2: { title: 'Citizenship', content: 'All token holders are citizens' },
        3: { title: 'Voting', content: 'Quadratic voting with reputation weighting' },
        4: { title: 'Treasury', content: 'Transparent on-chain treasury' },
        5: { title: 'Rights', content: 'Freedom of creation, speech, commerce' },
      },
      amendments: [],
    };
    
    // Initialize founding citizens
    for (const member of config.initialMembers) {
      this.citizens.set(member.toLowerCase(), {
        address: member,
        joinedAt: Date.now(),
        reputation: 1000, // Starting reputation for founders
        tokensStaked: 0,
        votingPower: 10,
        roles: ['founder', 'senator'],
        contributionScore: 100,
      });
    }
  }
  
  /**
   * Add citizen to nation
   */
  async addCitizen(address: string, stake?: string): Promise<void> {
    if (this.citizens.has(address.toLowerCase())) {
      throw new Error('Already a citizen');
    }
    
    const stakeAmount = stake ? ethers.parseEther(stake) : BigInt(0);
    
    this.citizens.set(address.toLowerCase(), {
      address: address.toLowerCase(),
      joinedAt: Date.now(),
      reputation: 100,
      tokensStaked: Number(stakeAmount),
      votingPower: this.calculateVotingPower(100, stakeAmount),
      roles: ['citizen'],
      contributionScore: 0,
    });
  }
  
  /**
   * Calculate quadratic voting power
   */
  private calculateVotingPower(reputation: number, staked: bigint): number {
    const basePower = Math.sqrt(reputation);
    const stakePower = Number(staked) > 0 ? Math.sqrt(Number(staked) / 1e18) : 0;
    return Math.floor(basePower + stakePower);
  }
  
  /**
   * Submit governance proposal
   */
  async submitProposal(
    proposer: string,
    type: Proposal['type'],
    title: string,
    description: string,
    executionData?: string
  ): Promise<string> {
    const citizen = this.citizens.get(proposer.toLowerCase());
    if (!citizen) {
      throw new Error('Only citizens can submit proposals');
    }
    
    // Minimum voting power to submit
    if (citizen.votingPower < 10) {
      throw new Error('Insufficient voting power to submit proposal');
    }
    
    const proposalId = `prop_${this.nationId}_${++this.currentProposalId}`;
    const quorum = this.getQuorumRequirement(type);
    const threshold = this.getThresholdRequirement(type);
    const duration = this.getProposalDuration(type);
    
    const proposal: Proposal = {
      id: proposalId,
      type,
      title,
      description,
      proposer: proposer.toLowerCase(),
      createdAt: Date.now(),
      deadline: Date.now() + duration,
      status: 'active',
      votes: [],
      quorum,
      threshold,
      executionData,
    };
    
    this.proposals.set(proposalId, proposal);
    
    return proposalId;
  }
  
  /**
   * Cast vote on proposal
   */
  async vote(
    voter: string,
    proposalId: string,
    choice: Vote['choice'],
    reason?: string
  ): Promise<void> {
    const citizen = this.citizens.get(voter.toLowerCase());
    if (!citizen) {
      throw new Error('Only citizens can vote');
    }
    
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }
    
    if (proposal.status !== 'active') {
      throw new Error('Proposal is not active');
    }
    
    if (Date.now() > proposal.deadline) {
      throw new Error('Voting period has ended');
    }
    
    // Check if already voted
    const existingVote = proposal.votes.find(v => v.voter.toLowerCase() === voter.toLowerCase());
    if (existingVote) {
      throw new Error('Already voted on this proposal');
    }
    
    // Quadratic voting - cost increases with more voting power used
    const weight = Math.sqrt(citizen.votingPower);
    
    proposal.votes.push({
      voter: voter.toLowerCase(),
      choice,
      weight,
      reason,
      timestamp: Date.now(),
    });
    
    // Check if proposal should be executed after vote
    this.evaluateProposal(proposal);
  }
  
  /**
   * Evaluate and execute proposal if conditions met
   */
  private evaluateProposal(proposal: Proposal): void {
    const forVotes = proposal.votes
      .filter(v => v.choice === 'for')
      .reduce((sum, v) => sum + v.weight, 0);
    
    const againstVotes = proposal.votes
      .filter(v => v.choice === 'against')
      .reduce((sum, v) => sum + v.weight, 0);
    
    const totalVotingPower = proposal.votes
      .reduce((sum, v) => sum + v.weight, 0);
    
    // Check quorum
    if (totalVotingPower < proposal.quorum) return;
    
    // Check threshold
    const ratio = forVotes / (forVotes + againstVotes);
    if (ratio >= proposal.threshold) {
      proposal.status = 'passed';
      
      // Auto-execute treasury and constitutional proposals
      if (proposal.type === 'treasury' || proposal.type === 'constitutional') {
        this.executeProposal(proposal.id);
      }
    } else if (Date.now() > proposal.deadline) {
      proposal.status = 'rejected';
    }
  }
  
  /**
   * Execute passed proposal
   */
  async executeProposal(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error('Proposal not found');
    if (proposal.status !== 'passed') throw new Error('Proposal not passed');
    
    proposal.status = 'executed';
    
    switch (proposal.type) {
      case 'treasury':
        // Execute treasury allocation
        if (proposal.executionData) {
          const { recipient, amount } = JSON.parse(proposal.executionData);
          this.treasury = (BigInt(this.treasury) - BigInt(amount)).toString();
          console.log(`💰 Allocated ${amount} to ${recipient}`);
        }
        break;
        
      case 'membership':
        // Execute membership changes
        if (proposal.executionData) {
          const { action, address } = JSON.parse(proposal.executionData);
          if (action === 'add') {
            await this.addCitizen(address);
          } else if (action === 'remove') {
            this.citizens.delete(address.toLowerCase());
          }
        }
        break;
        
      case 'constitutional':
        // Execute charter amendments
        if (proposal.executionData) {
          const amendment = JSON.parse(proposal.executionData);
          this.constitution.amendments.push({
            ...amendment,
            ratifiedAt: Date.now(),
          });
        }
        break;
    }
  }
  
  /**
   * Propose treaty with another nation
   */
  async proposeTreaty(
    proposer: string,
    otherNationId: string,
    type: Treaty['type'],
    terms: Record<string, any>
  ): Promise<string> {
    const treatyId = `treaty_${Date.now()}`;
    
    const treaty: Treaty = {
      id: treatyId,
      parties: [this.nationId, otherNationId],
      type,
      terms,
      ratifiedAt: 0,
      status: 'proposed',
    };
    
    this.treaties.set(treatyId, treaty);
    
    return treatyId;
  }
  
  /**
   * Ratify treaty
   */
  async ratifyTreaty(treatyId: string): Promise<void> {
    const treaty = this.treaties.get(treatyId);
    if (!treaty) throw new Error('Treaty not found');
    if (treaty.status !== 'proposed') throw new Error('Treaty not in proposal state');
    
    // Requires majority vote from citizens
    const forVotes = 0; // Simplified - would check actual votes
    const totalCitizens = this.citizens.size;
    
    if (forVotes / totalCitizens > 0.5) {
      treaty.status = 'ratified';
      treaty.ratifiedAt = Date.now();
    }
  }
  
  /**
   * Update citizen reputation
   */
  async updateReputation(address: string, delta: number): Promise<void> {
    const citizen = this.citizens.get(address.toLowerCase());
    if (!citizen) throw new Error('Citizen not found');
    
    citizen.reputation = Math.max(0, citizen.reputation + delta);
    citizen.votingPower = this.calculateVotingPower(citizen.reputation, BigInt(citizen.tokensStaked));
    
    // Check for role upgrades
    if (citizen.reputation >= 5000 && !citizen.roles.includes('senator')) {
      citizen.roles.push('senator');
    }
    if (citizen.contributionScore >= 1000 && !citizen.roles.includes('judge')) {
      citizen.roles.push('judge');
    }
  }
  
  /**
   * Deposit to treasury
   */
  async depositToTreasury(amount: string): Promise<void> {
    this.treasury = (BigInt(this.treasury) + BigInt(amount)).toString();
  }
  
  /**
   * Get governance statistics
   */
  getStats(): {
    population: number;
    treasury: string;
    activeProposals: number;
    passedProposals: number;
    treaties: number;
    totalVotingPower: number;
    avgReputation: number;
  } {
    const activeProposals = Array.from(this.proposals.values()).filter(p => p.status === 'active').length;
    const passedProposals = Array.from(this.proposals.values()).filter(p => p.status === 'passed' || p.status === 'executed').length;
    const totalVotingPower = Array.from(this.citizens.values()).reduce((sum, c) => sum + c.votingPower, 0);
    const avgReputation = Array.from(this.citizens.values()).reduce((sum, c) => sum + c.reputation, 0) / this.citizens.size;
    
    return {
      population: this.citizens.size,
      treasury: this.treasury,
      activeProposals,
      passedProposals,
      treaties: this.treaties.size,
      totalVotingPower,
      avgReputation: Math.round(avgReputation),
    };
  }
  
  /**
   * Helper functions
   */
  private getQuorumRequirement(type: Proposal['type']): number {
    const thresholds: Record<Proposal['type'], number> = {
      constitutional: 50,
      treasury: 20,
      membership: 10,
      diplomatic: 30,
      infrastructure: 15,
      evolution: 40,
      judicial: 15,
      election: 20,
      referendum: 30,
    };
    return thresholds[type];
  }
  
  private getThresholdRequirement(type: Proposal['type']): number {
    return 0.51; // Simple majority
  }
  
  private getProposalDuration(type: Proposal['type']): number {
    const durations: Record<Proposal['type'], number> = {
      constitutional: 7 * 24 * 60 * 60 * 1000, // 7 days
      treasury: 3 * 24 * 60 * 60 * 1000,
      membership: 2 * 24 * 60 * 60 * 1000,
      diplomatic: 5 * 24 * 60 * 60 * 1000,
      infrastructure: 5 * 24 * 60 * 60 * 1000,
      evolution: 14 * 24 * 60 * 60 * 1000,
      judicial: 3 * 24 * 60 * 60 * 1000,
      election: 5 * 24 * 60 * 60 * 1000,
      referendum: 3 * 24 * 60 * 60 * 1000,
    };
    return durations[type];
  }
  
  /**
   * Export nation data for IPFS
   */
  exportNation(): {
    nationId: string;
    config: NationConfig;
    constitution: any;
    stats: ReturnType<this['getStats']>;
    exportedAt: number;
  } {
    return {
      nationId: this.nationId,
      config: this.config,
      constitution: this.constitution,
      stats: this.getStats(),
      exportedAt: Date.now(),
    };
  }
}

export default DigitalNation;