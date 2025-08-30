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
        // Enable 0x7e transaction type support
        tx7e: {
          enabled: true,
          logTransactions: true,
          validateSignatures: true,
          mockL1Bridge: "0x0000000000000000000000000000000000000064",
        },
      },
    },
  },
};

export default config;
