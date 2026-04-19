import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? '';
const accounts = DEPLOYER_KEY ? [DEPLOYER_KEY] : [];

/**
 * Hardhat `@nomicfoundation/hardhat-verify` uses Etherscan **API V2** only when
 * `etherscan.apiKey` is a **string**. An object of per-network keys keeps V1
 * URLs (e.g. api.celoscan.io/api) and Celoscan now rejects them with:
 * "You are using a deprecated V1 endpoint, switch to Etherscan API V2".
 *
 * Create one free key at https://etherscan.io/apidashboard — it covers Celo
 * mainnet (42220) and Celo Sepolia (11142220) on the unified multichain API.
 */
const ETHERSCAN_V2_API_KEY = process.env.ETHERSCAN_API_KEY?.trim() ?? '';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    celo: {
      url: `https://celo-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      chainId: 42220,
      accounts,
    },
    celoSepolia: {
      url: `https://celo-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      chainId: 11142220,
      accounts,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_V2_API_KEY,
    customChains: [
      {
        network: 'celo',
        chainId: 42220,
        urls: {
          apiURL: 'https://api.celoscan.io/api',
          browserURL: 'https://celoscan.io',
        },
      },
      {
        network: 'celoSepolia',
        chainId: 11142220,
        urls: {
          apiURL: 'https://celo-sepolia.blockscout.com/api',
          browserURL: 'https://celo-sepolia.blockscout.com',
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};

export default config;
