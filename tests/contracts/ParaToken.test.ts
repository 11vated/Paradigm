// @vitest-environment node
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ParaToken } from '../../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('ParaToken', function () {
  let paraToken: ParaToken;
  let owner: SignerWithAddress;
  let creatorRewards: SignerWithAddress;
  let daoTreasury: SignerWithAddress;
  let stakingRewards: SignerWithAddress;
  let team: SignerWithAddress;
  let ecosystem: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const TOTAL_SUPPLY = ethers.parseEther('1000000000'); // 1 billion PARA
  const CREATOR_REWARDS_AMOUNT = (TOTAL_SUPPLY * 40n) / 100n; // 40%
  const DAO_TREASURY_AMOUNT = (TOTAL_SUPPLY * 20n) / 100n; // 20%
  const STAKING_REWARDS_AMOUNT = (TOTAL_SUPPLY * 15n) / 100n; // 15%
  const TEAM_AMOUNT = (TOTAL_SUPPLY * 15n) / 100n; // 15%
  const ECOSYSTEM_AMOUNT = (TOTAL_SUPPLY * 10n) / 100n; // 10%

  beforeEach(async function () {
    // Get signers
    [owner, creatorRewards, daoTreasury, stakingRewards, team, ecosystem, user1, user2] =
      await ethers.getSigners();

    // Deploy ParaToken
    const ParaToken = await ethers.getContractFactory('ParaToken');
    paraToken = await ParaToken.deploy(
      creatorRewards.address,
      daoTreasury.address,
      stakingRewards.address,
      team.address,
      ecosystem.address
    );

    await paraToken.waitForDeployment();
  });

  describe('Deployment', function () {
    it('Should set the correct name and symbol', async function () {
      expect(await paraToken.name()).to.equal('Paradigm Absolute');
      expect(await paraToken.symbol()).to.equal('PARA');
    });

    it('Should mint correct amounts to each wallet', async function () {
      expect(await paraToken.balanceOf(creatorRewards.address)).to.equal(CREATOR_REWARDS_AMOUNT);
      expect(await paraToken.balanceOf(daoTreasury.address)).to.equal(DAO_TREASURY_AMOUNT);
      expect(await paraToken.balanceOf(stakingRewards.address)).to.equal(STAKING_REWARDS_AMOUNT);
      expect(await paraToken.balanceOf(team.address)).to.equal(TEAM_AMOUNT);
      expect(await paraToken.balanceOf(ecosystem.address)).to.equal(ECOSYSTEM_AMOUNT);
    });

    it('Should have correct total supply', async function () {
      expect(await paraToken.totalSupply()).to.equal(TOTAL_SUPPLY);
    });

    it('Should set immutable wallet addresses', async function () {
      expect(await paraToken.CREATOR_REWARDS_WALLET()).to.equal(creatorRewards.address);
      expect(await paraToken.DAO_TREASURY_WALLET()).to.equal(daoTreasury.address);
      expect(await paraToken.STAKING_REWARDS_WALLET()).to.equal(stakingRewards.address);
      expect(await paraToken.TEAM_WALLET()).to.equal(team.address);
      expect(await paraToken.ECOSYSTEM_WALLET()).to.equal(ecosystem.address);
    });

    it('Should grant correct roles to deployer', async function () {
      const DEFAULT_ADMIN_ROLE = await paraToken.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await paraToken.MINTER_ROLE();
      const TIMELOCK_ROLE = await paraToken.TIMELOCK_ROLE();
      const CREATOR_REWARDS_ROLE = await paraToken.CREATOR_REWARDS_ROLE();

      expect(await paraToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await paraToken.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await paraToken.hasRole(TIMELOCK_ROLE, owner.address)).to.be.true;
      expect(await paraToken.hasRole(CREATOR_REWARDS_ROLE, owner.address)).to.be.true;
    });

    it('Should reject zero addresses in constructor', async function () {
      const ParaToken = await ethers.getContractFactory('ParaToken');
      
      await expect(
        ParaToken.deploy(
          ethers.ZeroAddress,
          daoTreasury.address,
          stakingRewards.address,
          team.address,
          ecosystem.address
        )
      ).to.be.revertedWith('Invalid creator rewards wallet');
    });
  });

  describe('Transfers', function () {
    it('Should transfer tokens between accounts', async function () {
      const amount = ethers.parseEther('1000');
      
      await paraToken.connect(creatorRewards).transfer(user1.address, amount);
      expect(await paraToken.balanceOf(user1.address)).to.equal(amount);
      
      await paraToken.connect(user1).transfer(user2.address, amount);
      expect(await paraToken.balanceOf(user2.address)).to.equal(amount);
      expect(await paraToken.balanceOf(user1.address)).to.equal(0);
    });

    it('Should fail if sender does not have enough tokens', async function () {
      const amount = ethers.parseEther('1');
      await expect(
        paraToken.connect(user1).transfer(user2.address, amount)
      ).to.be.reverted;
    });
  });

  describe('Minting', function () {
    it('Should allow minter to mint new tokens', async function () {
      const amount = ethers.parseEther('1000');
      await paraToken.connect(owner).mint(user1.address, amount);
      expect(await paraToken.balanceOf(user1.address)).to.equal(amount);
    });

    it('Should reject minting from non-minter', async function () {
      const amount = ethers.parseEther('1000');
      await expect(
        paraToken.connect(user1).mint(user2.address, amount)
      ).to.be.reverted;
    });
  });

  describe('Burning', function () {
    it('Should allow token holders to burn their tokens', async function () {
      const initialBalance = await paraToken.balanceOf(creatorRewards.address);
      const burnAmount = ethers.parseEther('1000');
      
      await paraToken.connect(creatorRewards).burn(burnAmount);
      
      expect(await paraToken.balanceOf(creatorRewards.address)).to.equal(
        initialBalance - burnAmount
      );
      expect(await paraToken.totalSupply()).to.equal(TOTAL_SUPPLY - burnAmount);
    });
  });

  describe('Governance', function () {
    it('Should create a proposal with sufficient tokens', async function () {
      const description = 'Test Proposal';
      const proposalThreshold = await paraToken.PROPOSAL_THRESHOLD();
      
      // Transfer enough tokens to user1 to meet threshold
      await paraToken.connect(creatorRewards).transfer(user1.address, proposalThreshold);
      
      await expect(paraToken.connect(user1).propose(description))
        .to.emit(paraToken, 'ProposalCreated');
    });

    it('Should reject proposal from account below threshold', async function () {
      const description = 'Test Proposal';
      await expect(
        paraToken.connect(user1).propose(description)
      ).to.be.revertedWith('Below proposal threshold');
    });

    it('Should allow voting on active proposals', async function () {
      const description = 'Test Proposal';
      const proposalThreshold = await paraToken.PROPOSAL_THRESHOLD();
      const voteAmount = ethers.parseEther('1000');
      
      // Setup: user1 creates proposal, user2 gets voting power
      await paraToken.connect(creatorRewards).transfer(user1.address, proposalThreshold);
      await paraToken.connect(creatorRewards).transfer(user2.address, voteAmount);
      
      const tx = await paraToken.connect(user1).propose(description);
      const receipt = await tx.wait();
      const proposalId = await paraToken.proposalCount();
      
      // Wait for voting delay
      await ethers.provider.send('evm_mine', []);
      
      await expect(paraToken.connect(user2).castVote(proposalId, voteAmount))
        .to.emit(paraToken, 'VoteCast');
    });
  });

  describe('Creator Rewards', function () {
    it('Should allow creator rewards role to distribute rewards', async function () {
      const amount = ethers.parseEther('100');
      
      await paraToken.connect(owner).distributeCreatorReward(user1.address, amount);
      expect(await paraToken.balanceOf(user1.address)).to.equal(amount);
    });

    it('Should allow batch distribution of creator rewards', async function () {
      const creators = [user1.address, user2.address];
      const amounts = [ethers.parseEther('100'), ethers.parseEther('200')];
      
      await paraToken.connect(owner).batchDistributeCreatorReward(creators, amounts);
      
      expect(await paraToken.balanceOf(user1.address)).to.equal(amounts[0]);
      expect(await paraToken.balanceOf(user2.address)).to.equal(amounts[1]);
    });

    it('Should reject creator reward distribution from unauthorized account', async function () {
      const amount = ethers.parseEther('100');
      await expect(
        paraToken.connect(user1).distributeCreatorReward(user2.address, amount)
      ).to.be.reverted;
    });
  });

  describe('Vesting', function () {
    it('Should start vesting for a recipient', async function () {
      const amount = ethers.parseEther('10000');
      const cliffDuration = 365 * 24 * 60 * 60; // 1 year
      const duration = 4 * 365 * 24 * 60 * 60; // 4 years
      
      await expect(
        paraToken.connect(owner).startVesting(user1.address, amount, cliffDuration, duration)
      ).to.emit(paraToken, 'VestingStarted');
      
      expect(await paraToken.vestingAmount(user1.address)).to.equal(amount);
    });

    it('Should not allow claiming before cliff', async function () {
      const amount = ethers.parseEther('10000');
      const cliffDuration = 365 * 24 * 60 * 60; // 1 year
      const duration = 4 * 365 * 24 * 60 * 60; // 4 years
      
      await paraToken.connect(owner).startVesting(user1.address, amount, cliffDuration, duration);
      
      await expect(
        paraToken.connect(user1).claimVested()
      ).to.be.revertedWith('No tokens to claim');
    });

    it('Should allow claiming after cliff', async function () {
      const amount = ethers.parseEther('10000');
      const cliffDuration = 100; // 100 seconds for testing
      const duration = 1000; // 1000 seconds total
      
      await paraToken.connect(owner).startVesting(user1.address, amount, cliffDuration, duration);
      
      // Fast forward past cliff
      await ethers.provider.send('evm_increaseTime', [cliffDuration + 1]);
      await ethers.provider.send('evm_mine', []);
      
      const claimable = await paraToken.getClaimableAmount(user1.address);
      expect(claimable).to.be.gt(0);
      
      await expect(paraToken.connect(user1).claimVested())
        .to.emit(paraToken, 'TokensClaimed');
    });
  });
});

// Made with Bob
