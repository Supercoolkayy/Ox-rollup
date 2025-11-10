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



// // hardhat.config.js
// require("@nomiclabs/hardhat-ethers");
// require("@arbitrum/hardhat-patch");
// module.exports = { 
//     solidity: "0.8.19", 
//     networks: { 
//         hardhat: { chainId: 42161 },
//         localhost: { url: "http://127.0.0.1:8547", chainId: 42161 }
//         } 
//     };
