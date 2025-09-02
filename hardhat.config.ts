import { HardhatUserConfig } from "hardhat/config";

// Import our custom Arbitrum plugin
import "./src/hardhat-patch";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 42161, // Arbitrum One
      // Enable our Arbitrum features
      gasPrice: 1000000000, // 1 gwei
      gasMultiplier: 1.2,
      blockGasLimit: 30000000,
    },
  },
  mocha: {
    timeout: 20000, // 20 seconds
  },
  paths: {
    sources: "./contracts",
    tests: "./tests",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
