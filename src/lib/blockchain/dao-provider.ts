import { ethers } from 'ethers';
import { creativeDAO } from './creative-dao';

let governorContract: ethers.Contract | null = null;
let timelockContract: ethers.Contract | null = null;

const GOVERNOR_ABI = [
  'function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)',
  'function castVote(uint256 proposalId, uint8 support) returns (uint256)',
  'function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)',
  'function state(uint256 proposalId) view returns (uint8)',
  'function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)',
  'function proposalDeadline(uint256 proposalId) view returns (uint256)',
  'function proposalProposer(uint256 proposalId) view returns (address)',
  'function quorum(uint256 blockNumber) view returns (uint256)',
  'function votingDelay() view returns (uint256)',
  'function votingPeriod() view returns (uint256)',
  'function proposalThreshold() view returns (uint256)',
];

const TIMELOCK_ABI = [
  'function minDelay() view returns (uint256)',
  'function isOperation(bytes32 id) view returns (bool)',
  'function isOperationPending(bytes32 id) view returns (bool)',
  'function isOperationReady(bytes32 id) view returns (bool)',
  'function isOperationDone(bytes32 id) view returns (bool)',
  'function getTimestamp(bytes32 id) view returns (uint256)',
];

export function configureOnChainDAO(
  governorAddress: string,
  timelockAddress: string,
  providerOrUrl?: ethers.Provider | string,
  signer?: ethers.Signer
): void {
  const provider = typeof providerOrUrl === 'string'
    ? new ethers.JsonRpcProvider(providerOrUrl)
    : (providerOrUrl || ethers.getDefaultProvider());
  governorContract = new ethers.Contract(governorAddress, GOVERNOR_ABI, signer || provider);
  timelockContract = new ethers.Contract(timelockAddress, TIMELOCK_ABI, provider);
}

export function isOnChainConfigured(): boolean {
  return governorContract !== null;
}

export interface ProposalResult {
  id: string;
  title: string;
  description: string;
  proposer: string;
  startBlock: number;
  endBlock: number;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  executed: boolean;
  canceled: boolean;
}

export interface DAOState {
  name: string;
  proposals: number;
  activeProposals: number;
  approvedGeneTypes: number;
  royaltyCurve: number[];
  constitutionalCommitments: number;
  onChain: boolean;
  governorAddress: string | null;
  timelockAddress: string | null;
}

function getDAOStateFromCreativeDAO(): DAOState {
  return {
    name: 'Paradigm Creative DAO',
    proposals: creativeDAO.getProposals().length,
    activeProposals: creativeDAO.getProposals('voting').length,
    approvedGeneTypes: creativeDAO.approvedGeneTypes.length,
    royaltyCurve: creativeDAO.royaltyCurve,
    constitutionalCommitments: creativeDAO.commitments.length,
    onChain: false,
    governorAddress: null,
    timelockAddress: null,
  };
}

export async function getDAOState(): Promise<DAOState> {
  if (!governorContract || !timelockContract) return getDAOStateFromCreativeDAO();

  try {
    const [delay, votingDelay, votingPeriod] = await Promise.all([
      timelockContract.minDelay(),
      governorContract.votingDelay(),
      governorContract.votingPeriod(),
    ]);

    return {
      name: 'Paradigm On-Chain DAO',
      proposals: 0,
      activeProposals: 0,
      approvedGeneTypes: creativeDAO.approvedGeneTypes.length,
      royaltyCurve: creativeDAO.royaltyCurve,
      constitutionalCommitments: creativeDAO.commitments.length,
      onChain: true,
      governorAddress: await governorContract.getAddress(),
      timelockAddress: await timelockContract.getAddress(),
    };
  } catch {
    return getDAOStateFromCreativeDAO();
  }
}

export async function propose(
  targets: string[],
  values: string[],
  calldatas: string[],
  description: string,
  title: string,
  type: string,
  payload: any,
  userId: string,
  stake: number
): Promise<any> {
  if (!governorContract) {
    return creativeDAO.propose(title, description, userId, type, payload, stake);
  }

  try {
    const tx = await governorContract.propose(targets, values, calldatas, description);
    const receipt = await tx.wait();
    const proposalId = receipt?.logs?.[0]?.args?.[0]?.toString() || '0';
    return { id: proposalId, transactionHash: receipt?.hash, onChain: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function vote(
  proposalId: string,
  userId: string,
  support: boolean,
  votingPower: number
): Promise<any> {
  if (!governorContract) {
    return creativeDAO.vote(proposalId, userId, support, votingPower);
  }

  try {
    const supportEnum = support ? 1 : 0;
    const tx = await governorContract.castVote(proposalId, supportEnum);
    const receipt = await tx.wait();
    return { id: proposalId, transactionHash: receipt?.hash, onChain: true, support };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function executeProposal(
  proposalId: string
): Promise<any> {
  if (!governorContract) {
    return creativeDAO.execute(proposalId);
  }

  try {
    const state = await governorContract.state(proposalId);
    if (state !== 4) {
      return { error: 'Proposal not in Succeeded state', currentState: state };
    }
    return { error: 'On-chain execute requires targets, values, calldatas, and descriptionHash' };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getProposals(status?: string): Promise<any> {
  if (!governorContract) return { proposals: creativeDAO.getProposals(status as any) };
  return { proposals: creativeDAO.getProposals(status as any), onChainAvailable: true };
}
