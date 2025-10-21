require("@nomicfoundation/hardhat-ethers");
require("@arbitrum/hardhat-patch");

module.exports = {
  solidity: "0.8.19",
  networks: { 
    hardhat: { chainId: 42161 }, 
    localhost: { url: "http://127.0.0.1:8549" } 
  },
  arbitrum: {
    enabled: true,
    chainId: 42161,
    arbOSVersion: 20,
    l1BaseFee: BigInt("20000000000"),
    precompiles: { mode: "shim" },  // default for users
    // gas: { pricesInWei: ["69440","496","2000000000000","100000000","0","100000000"] },
    // arbSysChainId: 42161,
    // nitroRpc: "http://127.0.0.1:8547",   // only  in native mode
    costing: {
    enabled: false,
    emulateNitro: false,
  },
  },
  paths: {
    tests: "test/m3"
  }
};


