import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('AuraTip', function () {
  async function deploy() {
    const [owner, sender, receiver] = await ethers.getSigners();

    const MockUSDm = await ethers.getContractFactory('MockUSDm');
    const usdm = await MockUSDm.deploy();
    await usdm.waitForDeployment();

    const AuraTip = await ethers.getContractFactory('AuraTip');
    const auraTip = await AuraTip.deploy();
    await auraTip.waitForDeployment();

    const usdmAddress = await usdm.getAddress();
    const auraTipAddress = await auraTip.getAddress();

    return {
      owner,
      sender,
      receiver,
      usdm,
      auraTip,
      usdmAddress,
      auraTipAddress,
    };
  }

  it('transfers tokens and emits TipSent', async function () {
    const { sender, receiver, usdm, auraTip, usdmAddress, auraTipAddress } =
      await deploy();
    const amount = ethers.parseUnits('1', 18);

    await usdm.mint(sender.address, amount);
    await usdm.connect(sender).approve(auraTipAddress, amount);

    await expect(
      auraTip
        .connect(sender)
        .tip(receiver.address, amount, usdmAddress, 'support', 'Great work!'),
    )
      .to.emit(auraTip, 'TipSent')
      .withArgs(
        sender.address,
        receiver.address,
        usdmAddress,
        amount,
        'support',
        'Great work!',
      );

    expect(await usdm.balanceOf(receiver.address)).to.equal(amount);
    expect(await usdm.balanceOf(sender.address)).to.equal(0n);
  });

  it('increments tipsReceivedCount for recipient', async function () {
    const { sender, receiver, usdm, auraTip, usdmAddress, auraTipAddress } =
      await deploy();
    const amount = ethers.parseUnits('1', 18);

    await usdm.mint(sender.address, amount * 2n);
    await usdm.connect(sender).approve(auraTipAddress, amount * 2n);

    expect(await auraTip.tipsReceivedCount(receiver.address)).to.equal(0n);

    await auraTip
      .connect(sender)
      .tip(receiver.address, amount, usdmAddress, 'thanks', '');
    expect(await auraTip.tipsReceivedCount(receiver.address)).to.equal(1n);

    await auraTip
      .connect(sender)
      .tip(receiver.address, amount, usdmAddress, 'support', 'again');
    expect(await auraTip.tipsReceivedCount(receiver.address)).to.equal(2n);
  });

  it('increments tipsSentCount for sender', async function () {
    const { sender, receiver, usdm, auraTip, usdmAddress, auraTipAddress } =
      await deploy();
    const amount = ethers.parseUnits('0.5', 18);

    await usdm.mint(sender.address, amount * 2n);
    await usdm.connect(sender).approve(auraTipAddress, amount * 2n);

    expect(await auraTip.tipsSentCount(sender.address)).to.equal(0n);

    await auraTip
      .connect(sender)
      .tip(receiver.address, amount, usdmAddress, 'code', '');
    expect(await auraTip.tipsSentCount(sender.address)).to.equal(1n);

    await auraTip
      .connect(sender)
      .tip(receiver.address, amount, usdmAddress, 'design', '');
    expect(await auraTip.tipsSentCount(sender.address)).to.equal(2n);
  });

  it('counts are independent per address', async function () {
    const [, senderA, senderB, recipientA, recipientB] =
      await ethers.getSigners();
    const MockUSDm = await ethers.getContractFactory('MockUSDm');
    const usdm = await MockUSDm.deploy();
    const AuraTip = await ethers.getContractFactory('AuraTip');
    const auraTip = await AuraTip.deploy();
    const usdmAddress = await usdm.getAddress();
    const auraTipAddress = await auraTip.getAddress();

    const amount = ethers.parseUnits('1', 18);
    await usdm.mint(senderA.address, amount);
    await usdm.mint(senderB.address, amount);
    await usdm.connect(senderA).approve(auraTipAddress, amount);
    await usdm.connect(senderB).approve(auraTipAddress, amount);

    await auraTip
      .connect(senderA)
      .tip(recipientA.address, amount, usdmAddress, 'thanks', '');
    await auraTip
      .connect(senderB)
      .tip(recipientB.address, amount, usdmAddress, 'code', '');

    expect(await auraTip.tipsReceivedCount(recipientA.address)).to.equal(1n);
    expect(await auraTip.tipsReceivedCount(recipientB.address)).to.equal(1n);
    expect(await auraTip.tipsSentCount(senderA.address)).to.equal(1n);
    expect(await auraTip.tipsSentCount(senderB.address)).to.equal(1n);
    expect(await auraTip.tipsReceivedCount(senderA.address)).to.equal(0n);
  });

  it('reverts on zero recipient', async function () {
    const { sender, usdm, auraTip, usdmAddress, auraTipAddress } =
      await deploy();
    const amount = ethers.parseUnits('1', 18);
    await usdm.mint(sender.address, amount);
    await usdm.connect(sender).approve(auraTipAddress, amount);

    await expect(
      auraTip
        .connect(sender)
        .tip(ethers.ZeroAddress, amount, usdmAddress, 'test', ''),
    ).to.be.revertedWith('AuraTip: zero recipient');
  });

  it('reverts on zero amount', async function () {
    const { sender, receiver, auraTip, usdmAddress } = await deploy();
    await expect(
      auraTip
        .connect(sender)
        .tip(receiver.address, 0n, usdmAddress, 'test', ''),
    ).to.be.revertedWith('AuraTip: zero amount');
  });

  it('reverts on zero token address', async function () {
    const { sender, receiver, auraTip } = await deploy();
    await expect(
      auraTip
        .connect(sender)
        .tip(receiver.address, 1n, ethers.ZeroAddress, 'test', ''),
    ).to.be.revertedWith('AuraTip: zero token');
  });

  it('reverts without sufficient allowance', async function () {
    const { sender, receiver, usdm, auraTip, usdmAddress } = await deploy();
    const amount = ethers.parseUnits('1', 18);
    await usdm.mint(sender.address, amount);
    // deliberately skip approve

    await expect(
      auraTip
        .connect(sender)
        .tip(receiver.address, amount, usdmAddress, 'test', ''),
    ).to.be.revertedWith('MockUSDm: insufficient allowance');
  });
});
