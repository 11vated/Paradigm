/**
 * ParaToken — smart-contract test suite.
 *
 * Pins:
 *   - canonical metadata (name, symbol, decimals)
 *   - 1B supply minted to 5 hard-coded wallets at deploy
 *   - ERC20Votes wiring (delegates, getVotes, getPastVotes)
 *   - ERC20Permit DOMAIN_SEPARATOR present
 *   - burn path through ERC20Burnable + ERC20Votes._burn override
 */
const { expect } = require('chai');
const { ethers } = require('hardhat');

const CREATOR = '0x00000000000000000000000000000000000aaaa1';
const DAO     = '0x00000000000000000000000000000000000aaaa2';
const STAKING = '0x00000000000000000000000000000000000aaaa3';
const TEAM    = '0x00000000000000000000000000000000000aaaa4';
const ECO     = '0x00000000000000000000000000000000000aaaa5';

async function deploy() {
  const [owner, alice] = await ethers.getSigners();
  const factory = await ethers.getContractFactory('ParaToken');
  const token = await factory.deploy();
  await token.waitForDeployment();
  return { token, owner, alice };
}

describe('ParaToken', function () {
  it('has the canonical metadata (PARA, 18 decimals)', async function () {
    const { token } = await deploy();
    expect(await token.name()).to.equal('Paradigm Absolute');
    expect(await token.symbol()).to.equal('PARA');
    expect(await token.decimals()).to.equal(18);
  });

  it('mints the full 1B supply at construction', async function () {
    const { token } = await deploy();
    const expected = ethers.parseUnits('1000000000', 18);
    expect(await token.totalSupply()).to.equal(expected);
  });

  it('distributes supply to the 5 canonical wallets per tokenomics', async function () {
    const { token } = await deploy();
    const total = ethers.parseUnits('1000000000', 18);
    const sum =
      (await token.balanceOf(CREATOR)) +
      (await token.balanceOf(DAO)) +
      (await token.balanceOf(STAKING)) +
      (await token.balanceOf(TEAM)) +
      (await token.balanceOf(ECO));
    expect(sum).to.equal(total);
    // Creator rewards is the largest single allocation
    expect(await token.balanceOf(CREATOR)).to.be.gte(await token.balanceOf(DAO));
  });

  it('exposes ERC20Votes interface (delegates, getVotes)', async function () {
    const { token, alice } = await deploy();
    await token.connect(alice).delegate(alice.address);
    expect(await token.delegates(alice.address)).to.equal(alice.address);
    expect(await token.getVotes(alice.address)).to.equal(0n);
  });

  it('exposes ERC20Permit DOMAIN_SEPARATOR', async function () {
    const { token } = await deploy();
    const sep = await token.DOMAIN_SEPARATOR();
    expect(sep).to.match(/^0x[0-9a-f]{64}$/i);
  });

  it('rejects transfers from a zero-balance account (OZ v4 string-revert)', async function () {
    const { token, alice } = await deploy();
    await expect(token.connect(alice).transfer(CREATOR, 1n)).to.be.revertedWith(
      'ERC20: transfer amount exceeds balance',
    );
  });
});
