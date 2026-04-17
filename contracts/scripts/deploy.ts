import { ethers } from 'hardhat';

// Real USDm on Celo Mainnet (Mento Dollar)
const USDM_MAINNET = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  const id = Number(chainId);

  const [deployer] = await ethers.getSigners();
  console.log(`\nDeploying on chain ${id} from ${deployer.address}`);

  let usdmAddress: string;

  if (id === 42220) {
    // Mainnet — use real USDm (Mento Dollar)
    usdmAddress = USDM_MAINNET;
    console.log(`Using real USDm: ${usdmAddress}`);
  } else if (id === 11142220) {
    // Celo Sepolia testnet — deploy MockUSDm for testing
    console.log('Testnet: deploying MockUSDm...');
    const MockUSDm = await ethers.getContractFactory('MockUSDm');
    const mockUsdm = await MockUSDm.deploy();
    await mockUsdm.waitForDeployment();
    usdmAddress = await mockUsdm.getAddress();
    console.log(`MockUSDm deployed: ${usdmAddress}`);
  } else {
    throw new Error(
      `Unsupported chain ${id}. Use --network celo or celoSepolia`,
    );
  }

  console.log('Deploying AuraTip...');
  const AuraTip = await ethers.getContractFactory('AuraTip');
  const auraTip = await AuraTip.deploy(usdmAddress);
  await auraTip.waitForDeployment();

  const address = await auraTip.getAddress();
  console.log(`AuraTip deployed:  ${address}`);

  console.log('\n── Copy this into .env.local ──────────────────────');
  if (id === 42220) {
    console.log(`NEXT_PUBLIC_AURA_TIP_ADDRESS_MAINNET=${address}`);
  } else {
    console.log(`NEXT_PUBLIC_AURA_TIP_ADDRESS_TESTNET=${address}`);
    console.log(
      `\n# Also save MockUSDm address (needed for minting test tokens):`,
    );
    console.log(`NEXT_PUBLIC_USDM_ADDRESS_TESTNET=${usdmAddress}`);
  }
  console.log('────────────────────────────────────────────────────');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
