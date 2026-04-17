import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('AuraTip', function () {
  async function deploy() {
    const [owner, sender, receiver] = await ethers.getSigners();

    const MockUSDm = await ethers.getContractFactory('MockUSDm');
    const usdm = await MockUSDm.deploy();
    await usdm.waitForDeployment();

    const AuraTip = await ethers.getContractFactory('AuraTip');
    const auraTip = await AuraTip.deploy(await usdm.getAddress());
    await auraTip.waitForDeployment();

    return { owner, sender, receiver, usdm, auraTip };
  }

  it('transfers USDm and emits TipSent', async function () {
    const { sender, receiver, usdm, auraTip } = await deploy();
    const amount = ethers.parseUnits('1', 18);

    await usdm.mint(sender.address, amount);
    await usdm.connect(sender).approve(await auraTip.getAddress(), amount);

    await expect(
      auraTip
        .connect(sender)
        .tip(receiver.address, amount, 'support', 'Great work!'),
    )
      .to.emit(auraTip, 'TipSent')
      .withArgs(
        sender.address,
        receiver.address,
        amount,
        'support',
        'Great work!',
      );

    expect(await usdm.balanceOf(receiver.address)).to.equal(amount);
    expect(await usdm.balanceOf(sender.address)).to.equal(0n);
  });

  it('reverts on zero recipient', async function () {
    const { sender, usdm, auraTip } = await deploy();
    const amount = ethers.parseUnits('1', 18);
    await usdm.mint(sender.address, amount);
    await usdm.connect(sender).approve(await auraTip.getAddress(), amount);

    await expect(
      auraTip.connect(sender).tip(ethers.ZeroAddress, amount, 'test', ''),
    ).to.be.revertedWith('AuraTip: zero recipient');
  });

  it('reverts on zero amount', async function () {
    const { sender, receiver, auraTip } = await deploy();
    await expect(
      auraTip.connect(sender).tip(receiver.address, 0n, 'test', ''),
    ).to.be.revertedWith('AuraTip: zero amount');
  });

  it('reverts without sufficient allowance', async function () {
    const { sender, receiver, usdm, auraTip } = await deploy();
    const amount = ethers.parseUnits('1', 18);
    await usdm.mint(sender.address, amount);
    // deliberately skip approve

    await expect(
      auraTip.connect(sender).tip(receiver.address, amount, 'test', ''),
    ).to.be.revertedWith('MockUSDm: insufficient allowance');
  });
});
