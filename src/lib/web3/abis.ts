/**
 * Contract ABIs
 * 
 * Minimal ABIs for frontend interaction with smart contracts.
 * Full ABIs will be generated during contract compilation.
 * 
 * Phase 15.3: Contract ABIs
 * Date: 2026-06-18
 */

// ParaToken (ERC-20) ABI - Essential functions only
export const ParaTokenABI = [
  // Read functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  
  // Write functions
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

// SeedNFT (ERC-721) ABI - Essential functions only
export const SeedNFTABI = [
  // Read functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  
  // Write functions
  'function approve(address to, uint256 tokenId)',
  'function setApprovalForAll(address operator, bool approved)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)',
  
  // Paradigm-specific
  'function mintSeed(address to, string seedData) returns (uint256)',
  'function getSeedData(uint256 tokenId) view returns (string)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
] as const;

// ParadigmMarketplace ABI - Essential functions only
export const MarketplaceABI = [
  // Read functions
  'function getListing(uint256 listingId) view returns (tuple(address seller, uint256 tokenId, uint256 price, bool active))',
  'function getActiveListings() view returns (uint256[])',
  'function getListingsBySeller(address seller) view returns (uint256[])',
  
  // Write functions
  'function listSeed(uint256 tokenId, uint256 price) returns (uint256)',
  'function delistSeed(uint256 listingId)',
  'function buySeed(uint256 listingId) payable',
  
  // Events
  'event SeedListed(uint256 indexed listingId, address indexed seller, uint256 indexed tokenId, uint256 price)',
  'event SeedDelisted(uint256 indexed listingId)',
  'event SeedSold(uint256 indexed listingId, address indexed buyer, uint256 price)',
] as const;

// ParadigmGovernor ABI - Essential functions only
export const GovernorABI = [
  // Read functions
  'function name() view returns (string)',
  'function votingDelay() view returns (uint256)',
  'function votingPeriod() view returns (uint256)',
  'function proposalThreshold() view returns (uint256)',
  'function quorum(uint256 blockNumber) view returns (uint256)',
  'function state(uint256 proposalId) view returns (uint8)',
  'function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)',
  'function hasVoted(uint256 proposalId, address account) view returns (bool)',
  'function getVotes(address account, uint256 blockNumber) view returns (uint256)',
  
  // Write functions
  'function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)',
  'function castVote(uint256 proposalId, uint8 support) returns (uint256)',
  'function castVoteWithReason(uint256 proposalId, uint8 support, string reason) returns (uint256)',
  'function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) payable returns (uint256)',
  
  // Events
  'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)',
  'event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)',
  'event ProposalExecuted(uint256 proposalId)',
] as const;

// ParadigmTimelock ABI - Essential functions only
export const TimelockABI = [
  // Read functions
  'function getMinDelay() view returns (uint256)',
  'function isOperation(bytes32 id) view returns (bool)',
  'function isOperationPending(bytes32 id) view returns (bool)',
  'function isOperationReady(bytes32 id) view returns (bool)',
  'function isOperationDone(bytes32 id) view returns (bool)',
  'function getTimestamp(bytes32 id) view returns (uint256)',
  
  // Write functions
  'function schedule(address target, uint256 value, bytes data, bytes32 predecessor, bytes32 salt, uint256 delay)',
  'function execute(address target, uint256 value, bytes data, bytes32 predecessor, bytes32 salt)',
  'function cancel(bytes32 id)',
  
  // Events
  'event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)',
  'event CallExecuted(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data)',
  'event Cancelled(bytes32 indexed id)',
] as const;

// Made with Bob
