const { task } = require("hardhat/config");

task("smoke:nitro", "Call ArbSys/ArbGasInfo via contract + raw")
  .addParam("addr", "ArbProbes contract address")
  .setAction(async ({ addr }, hre) => {
    const c = await hre.ethers.getContractAt("ArbProbes", addr);
    const chainId = await c.getArbChainId();
    const l1GasA  = await c.getCurrentTxL1GasFees().catch(() => null);

    console.log("via contract -> chainId:", chainId.toString());
    if (l1GasA) console.log("via contract -> L1 gas (getCurrentTxL1GasFees):", l1GasA.toString(), "wei");

    // Raw precompile calls (try both selectors)
    const sys = "0x0000000000000000000000000000000000000064";
    const gas = "0x000000000000000000000000000000000000006c";
    const selChainID = "0xa3b1b31d"; // arbChainID()
    const selChainId = "0x4f15b71e"; // arbChainId()
    const selGasB    = "0x4d2301cc"; // getL1BaseFeeEstimate()

    const rawId1 = await hre.ethers.provider.call({ to: sys, data: selChainID });
    const rawId2 = await hre.ethers.provider.call({ to: sys, data: selChainId });
    console.log("raw -> chainID():", rawId1);
    console.log("raw -> chainId():", rawId2);

    const rawGasB = await hre.ethers.provider.call({ to: gas, data: selGasB });
    console.log("raw -> getL1BaseFeeEstimate():", rawGasB);
  });

module.exports = {};
