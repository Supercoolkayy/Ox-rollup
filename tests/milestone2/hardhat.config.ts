import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      // Enable Arbitrum features
      chainId: 42161, // Arbitrum One
      // Note: Arbitrum-specific configuration will be handled by the plugin
    },
  },
};

export default config;
