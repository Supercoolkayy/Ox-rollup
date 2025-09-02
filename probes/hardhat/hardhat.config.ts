import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

// Import our Arbitrum patch plugin
import "../../src/hardhat-patch";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 42161, // Arbitrum chain ID
    },
  },
  // Configure our Arbitrum patch
  arbitrum: {
    enabled: true,
    chainId: 42161,
    arbOSVersion: 20,
    l1BaseFee: BigInt("20000000000"), // 20 gwei
  },
};

export default config;
