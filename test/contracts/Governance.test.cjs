/**
 * Paradigm governance suite — Timelock + Governor + ParaToken end-to-end.
 * Pins:
 *   - Timelock deploys with correct role wiring
 *   - Governor deploys against ParaToken (IVotes) + Timelock
 *   - votingDelay / votingPeriod / proposalThreshold values stick
 *   - quorum() reflects 4% of totalSupply at a given block
 *   - delegate() + getVotes() actually counts ERC20Votes balance
 */
const { expect } = require('chai');
const { ethers } = require('hardhat');

async function deployStack() {
  const [admin] = await ethers.getSigners();
  const Token = await ethers.getContractFactory('ParaToken');
  const token = await Token.deploy();
  await token.waitForDeployment();
  const Timelock = await ethers.getContractFactory('ParadigmTimelock');
  const timelock = await Timelock.deploy(2 * 24 * 60 * 60, [], [], admin.address);
  await timelock.waitForDeployment();
  const Governor = await ethers.getContractFactory('ParadigmGovernor');
  const governor = await Governor.deploy(
    await token.getAddress(),
    await timelock.getAddress(),
    1,        // votingDelay (blocks)
    50400,    // votingPeriod (~1 week at 12s blocks)
    ethers.parseEther('1000'), // proposalThreshold
  );
  await governor.waitForDeployment();
  return { admin, token, timelock, governor };
}

describe('Paradigm governance stack', function () {
  it('deploys all three contracts', async function () {
    const { token, timelock, governor } = await deployStack();
    expect(await token.symbol()).to.equal('PARA');
    expect(await timelock.getMinDelay()).to.equal(2n * 24n * 60n * 60n);
    expect(await governor.name()).to.equal('Paradigm Governor');
  });

  it('persists governor settings (votingDelay / votingPeriod / proposalThreshold)', async function () {
    const { governor } = await deployStack();
    expect(await governor.votingDelay()).to.equal(1n);
    expect(await governor.votingPeriod()).to.equal(50400n);
    expect(await governor.proposalThreshold()).to.equal(ethers.parseEther('1000'));
  });

  it('uses ParaToken (IVotes) and reflects 4% quorum at a past block', async function () {
    const { token, governor } = await deployStack();
    expect(await governor.token()).to.equal(await token.getAddress());
    // Move chain forward so quorum() has a finalized snapshot to read.
    await ethers.provider.send('evm_mine', []);
    await ethers.provider.send('evm_mine', []);
    const blk = (await ethers.provider.getBlockNumber()) - 1;
    const supply = await token.totalSupply();
    // 4% quorum
    expect(await governor.quorum(blk)).to.equal((supply * 4n) / 100n);
  });

  it('ERC20Votes delegate() actually empowers a delegate with getVotes()', async function () {
    const { token } = await deployStack();
    const [admin] = await ethers.getSigners();
    const CREATOR_REWARDS_WALLET = '0x00000000000000000000000000000000000AAAA1';
    // Impersonate the rewards wallet, fund it, then delegate to admin.
    await ethers.provider.send('hardhat_impersonateAccount', [CREATOR_REWARDS_WALLET]);
    await ethers.provider.send('hardhat_setBalance', [CREATOR_REWARDS_WALLET, '0x1000000000000000']);
    const signer = await ethers.getSigner(CREATOR_REWARDS_WALLET);
    await token.connect(signer).delegate(admin.address);
    await ethers.provider.send('evm_mine', []);
    const votes = await token.getVotes(admin.address);
    expect(votes).to.be.gt(0n);
  });
});
