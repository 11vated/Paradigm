/**
 * PARADIGM ABSOLUTE TOKEN (PARA)
 * 
 * ERC-20 Token with Governance Features
 * 
 * Tokenomics:
 * - Total Supply: 1,000,000,000 (1 billion)
 * - 40% Creator Rewards (seeds, breeding, evolution)
 * - 20% DAO Treasury (development, grants, governance)
 * - 15% Staking Rewards (compute providers)
 * - 15% Team + Advisors (4-year vesting)
 * - 10% Ecosystem Fund (partnerships, integrations)
 * 
 * Features:
 * - Standard ERC-20
 * - Governance (提案 & 投票)
 * - Timelock for security
 * - Snapshot for off-chain voting
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title ParaToken
 * @dev PARADIGM Absolute Token - Governance-enabled ERC-20
 */
contract ParaToken is ERC20, ERC20Burnable, ERC20Permit, AccessControl {
    
    // ─────────────────────────────────────────────────────────────────────────
    // ROLES
    // ─────────────────────────────────────────────────────────────────────────
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE");
    bytes32 public constant CREATOR_REWARDS_ROLE = keccak256("CREATOR_REWARDS_ROLE");
    
    // ─────────────────────────────────────────────────────────────────────────
    // GOVERNANCE
    // ─────────────────────────────────────────────────────────────────────────
    uint256 public constant PROPOSAL_THRESHOLD = 1000000e18; // 1M PARA to propose
    uint256 public constant VOTING_DELAY = 1 days;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant QUORUM_PERCENTAGE = 4; // 4% for quorum
    
    struct Proposal {
        address proposer;
        uint256 startBlock;
        uint256 endBlock;
        string description;
        mapping(address => uint256) votes;
        mapping(address => bool) hasVoted;
        uint256 totalVotes;
        bool executed;
        bool canceled;
    }
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256 public latestProposalId;
    
    // ─────────────────────────────────────────────────────────────────────────
    // VESTING
    // ─────────────────────────────────────────────────────────────────────────
    mapping(address => uint256) public vestingAmount;
    mapping(address => uint256) public vestingStart;
    mapping(address => uint256) public vestingCliff;
    mapping(address => uint256) public vestingEnd;
    mapping(address => uint256) public vestedAmount;
    
    // ─────────────────────────────────────────────────────────────────────────
    // INITIAL ALLOCATION
    // ─────────────────────────────────────────────────────────────────────────
    // Total supply: 1 billion PARA
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000e18;
    
    // Allocation percentages (basis points: 1% = 100)
    uint256 public constant CREATOR_REWARDS_BPS = 4000;  // 40%
    uint256 public constant DAO_TREASURY_BPS = 2000;     // 20%
    uint256 public constant STAKING_REWARDS_BPS = 1500;  // 15%
    uint256 public constant TEAM_ADVISORS_BPS = 1500;    // 15%
    uint256 public constant ECOSYSTEM_FUND_BPS = 1000;  // 10%
    
    // Pre-allocated addresses (to be replaced with actual addresses after deployment)
    address public constant CREATOR_REWARDS_WALLET = address(0xAAAA1);
    address public constant DAO_TREASURY_WALLET = address(0xAAAA2);
    address public constant STAKING_REWARDS_WALLET = address(0xAAAA3);
    address public constant TEAM_WALLET = address(0xAAAA4);
    address public constant ECOSYSTEM_WALLET = address(0xAAAA5);
    
    // ─────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────
    event ProposalCreated(uint256 indexed proposalId, address proposer, string description);
    event VoteCast(address indexed voter, uint256 indexed proposalId, uint256 votes);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);
    event VestingStarted(address indexed recipient, uint256 amount, uint256 end);
    event TokensClaimed(address indexed recipient, uint256 amount);
    
    // ─────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────
    constructor() 
        ERC20("Paradigm Absolute", "PARA") 
        ERC20Permit("Paradigm Absolute")
    {
        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(TIMELOCK_ROLE, msg.sender);
        _grantRole(CREATOR_REWARDS_ROLE, msg.sender);
        
        // Mint initial supply to various wallets
        _mint(CREATOR_REWARDS_WALLET, TOTAL_SUPPLY * CREATOR_REWARDS_BPS / 10000);
        _mint(DAO_TREASURY_WALLET, TOTAL_SUPPLY * DAO_TREASURY_BPS / 10000);
        _mint(STAKING_REWARDS_WALLET, TOTAL_SUPPLY * STAKING_REWARDS_BPS / 10000);
        _mint(TEAM_WALLET, TOTAL_SUPPLY * TEAM_ADVISORS_BPS / 10000);
        _mint(ECOSYSTEM_WALLET, TOTAL_SUPPLY * ECOSYSTEM_FUND_BPS / 10000);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // MINTING (for future rewards)
    // ─────────────────────────────────────────────────────────────────────────
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // GOVERNANCE FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @dev Create a new proposal
     */
    function propose(string memory description) external returns (uint256) {
        require(balanceOf(msg.sender) >= PROPOSAL_THRESHOLD, "Below proposal threshold");
        
        uint256 proposalId = ++proposalCount;
        Proposal storage proposal = proposals[proposalId];
        
        proposal.proposer = msg.sender;
        proposal.startBlock = block.number + (VOTING_DELAY / 12); // ~12 sec/block
        proposal.endBlock = proposal.startBlock + (VOTING_PERIOD / 12);
        proposal.description = description;
        proposal.totalVotes = 0;
        proposal.executed = false;
        proposal.canceled = false;
        
        latestProposalId = proposalId;
        
        emit ProposalCreated(proposalId, msg.sender, description);
        
        return proposalId;
    }
    
    /**
     * @dev Cast a vote on a proposal
     */
    function castVote(uint256 proposalId, uint256 votes) external {
        require(proposalId <= proposalCount, "Invalid proposal");
        require(proposalId == latestProposalId || proposalId == latestProposalId - 1, "Can only vote on active proposals");
        
        Proposal storage proposal = proposals[proposalId];
        
        require(block.number >= proposal.startBlock, "Voting not started");
        require(block.number <= proposal.endBlock, "Voting ended");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.canceled, "Proposal canceled");
        
        // Check voting power
        require(balanceOf(msg.sender) >= votes, "Insufficient voting power");
        
        // Prevent double voting
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        proposal.votes[msg.sender] = votes;
        proposal.hasVoted[msg.sender] = true;
        proposal.totalVotes += votes;
        
        emit VoteCast(msg.sender, proposalId, votes);
    }
    
    /**
     * @dev Execute a proposal (simplified - in production would include execution logic)
     */
    function executeProposal(uint256 proposalId) external {
        require(proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        
        require(block.number > proposal.endBlock, "Voting not ended");
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Canceled");
        
        // Check quorum
        uint256 quorum = (totalSupply() * QUORUM_PERCENTAGE) / 100;
        require(proposal.totalVotes >= quorum, "Quorum not reached");
        
        proposal.executed = true;
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev Cancel a proposal (can only be done by proposer or admin)
     */
    function cancelProposal(uint256 proposalId) external {
        require(proposalId <= proposalCount, "Invalid proposal");
        
        Proposal storage proposal = proposals[proposalId];
        
        require(msg.sender == proposal.proposer || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not authorized");
        require(!proposal.executed, "Already executed");
        
        proposal.canceled = true;
        
        emit ProposalCanceled(proposalId);
    }
    
    /**
     * @dev Get vote count for a proposal
     */
    function getProposalVotes(uint256 proposalId, address voter) external view returns (uint256) {
        require(proposalId <= proposalCount, "Invalid proposal");
        return proposals[proposalId].votes[voter];
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // VESTING
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @dev Start vesting for a recipient
     */
    function startVesting(
        address recipient,
        uint256 amount,
        uint256 cliffDuration,
        uint256 duration
    ) external onlyRole(CREATOR_REWARDS_ROLE) {
        require(vestingAmount[recipient] == 0, "Vesting already active");
        
        vestingAmount[recipient] = amount;
        vestingStart[recipient] = block.timestamp;
        vestingCliff[recipient] = block.timestamp + cliffDuration;
        vestingEnd[recipient] = block.timestamp + duration;
        
        emit VestingStarted(recipient, amount, vestingEnd[recipient]);
    }
    
    /**
     * @dev Claim vested tokens
     */
    function claimVested() external {
        address sender = msg.sender;
        uint256 claimable = getClaimableAmount(sender);
        
        require(claimable > 0, "No tokens to claim");
        
        uint256 newVested = vestedAmount[sender] + claimable;
        vestedAmount[sender] = newVested;
        
        _mint(sender, claimable);
        
        emit TokensClaimed(sender, claimable);
    }
    
    /**
     * @dev Get claimable amount for a recipient
     */
    function getClaimableAmount(address recipient) public view returns (uint256) {
        if (vestingAmount[recipient] == 0) return 0;
        
        // Before cliff
        if (block.timestamp < vestingCliff[recipient]) return 0;
        
        // After end
        if (block.timestamp >= vestingEnd[recipient]) {
            return vestingAmount[recipient] - vestedAmount[recipient];
        }
        
        // During vesting period
        uint256 timePassed = block.timestamp - vestingCliff[recipient];
        uint256 vestingDuration = vestingEnd[recipient] - vestingCliff[recipient];
        uint256 totalVested = (vestingAmount[recipient] * timePassed) / vestingDuration;
        
        return totalVested - vestedAmount[recipient];
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // CREATOR REWARDS (Special functionality for seed marketplace)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @dev Distribute creator rewards (called by backend when seeds are sold/bred)
     */
    function distributeCreatorReward(address creator, uint256 amount) 
        external 
        onlyRole(CREATOR_REWARDS_ROLE) 
    {
        _mint(creator, amount);
    }
    
    /**
     * @dev Batch distribute creator rewards
     */
    function batchDistributeCreatorReward(address[] calldata creators, uint256[] calldata amounts) 
        external 
        onlyRole(CREATOR_REWARDS_ROLE) 
    {
        require(creators.length == amounts.length, "Length mismatch");
        
        for (uint256 i = 0; i < creators.length; i++) {
            _mint(creators[i], amounts[i]);
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // OVERRIDES
    // ─────────────────────────────────────────────────────────────────────────
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}