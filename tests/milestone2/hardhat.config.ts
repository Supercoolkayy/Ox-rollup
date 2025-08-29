import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      // Enable Arbitrum features
      arbitrum: {
        enabled: true,
        chainId: 42161, // Arbitrum One
        arbOSVersion: 20,
      },
    },
  },
};

export default config;
