import { ethers } from 'hardhat';

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  const id = Number(chainId);

  const [deployer] = await ethers.getSigners();
  console.log(`\nDeploying on chain ${id} from ${deployer.address}`);

  // On testnet, deploy MockUSDm so the test flow (mint → approve → tip) works.
  // On mainnet, real tokens (USDm, USDC, USDT) are already live — no mock needed.
  let mockUsdmAddress: string | undefined;
  if (id === 11142220) {
    console.log('Testnet: deploying MockUSDm...');
    const MockUSDm = await ethers.getContractFactory('MockUSDm');
    const mockUsdm = await MockUSDm.deploy();
    await mockUsdm.waitForDeployment();
    mockUsdmAddress = await mockUsdm.getAddress();
    console.log(`MockUSDm deployed: ${mockUsdmAddress}`);
  } else if (id !== 42220) {
    throw new Error(
      `Unsupported chain ${id}. Use --network celo or celoSepolia`,
    );
  }

  console.log('Deploying AuraTip...');
  const AuraTip = await ethers.getContractFactory('AuraTip');
  const auraTip = await AuraTip.deploy();
  await auraTip.waitForDeployment();

  const address = await auraTip.getAddress();
  console.log(`AuraTip deployed:  ${address}`);

  console.log('\n── Copy this into .env.local ──────────────────────');
  if (id === 42220) {
    console.log(`NEXT_PUBLIC_AURA_TIP_ADDRESS_MAINNET=${address}`);
  } else {
    console.log(`NEXT_PUBLIC_AURA_TIP_ADDRESS_TESTNET=${address}`);
    console.log(`NEXT_PUBLIC_USDM_ADDRESS_TESTNET=${mockUsdmAddress}`);
  }
  console.log('────────────────────────────────────────────────────');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
