/**
 * Hardhat Script: Validate ArbSys + ArbGasInfo Precompiles
 *
 * This script validates that our Arbitrum patch works correctly
 * within the Hardhat runtime environment.
 */

const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log(" Validating Arbitrum Precompiles in Hardhat Context...\n");

  // Check if our patch is available
  const arbitrumPatch = hre.arbitrumPatch || hre.arbitrum;

  if (!arbitrumPatch) {
    console.error("❌ Arbitrum patch not found in HRE");
    process.exit(1);
  }

  console.log("Arbitrum patch found in HRE");

  // Test registry functionality
  const registry = arbitrumPatch.getRegistry();
  const handlers = registry.list();

  console.log(` Found ${handlers.length} precompile handlers:`);
  handlers.forEach((handler) => {
    console.log(`   ${handler.name}: ${handler.address}`);
  });

  // Test ArbSys arbChainID
  console.log("\n Testing ArbSys arbChainID...");
  const arbSysCalldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // arbChainID()
  const context = {
    blockNumber: 12345,
    chainId: 42161,
    gasPrice: BigInt(1e9),
    caller: "0x1234567890123456789012345678901234567890",
    callStack: [],
  };

  const arbSysResult = await registry.handleCall(
    "0x0000000000000000000000000000000000000064", // ArbSys address
    arbSysCalldata,
    context
  );

  if (arbSysResult.success) {
    const chainId = new DataView(arbSysResult.data.buffer).getBigUint64(
      24,
      false
    );
    console.log(`ArbSys arbChainID returned: ${Number(chainId)}`);
  } else {
    console.log("❌ ArbSys arbChainID failed");
  }

  // Test ArbGasInfo getL1BaseFeeEstimate
  console.log("\n⛽ Testing ArbGasInfo getL1BaseFeeEstimate...");
  const arbGasInfoCalldata = new Uint8Array([0x4d, 0x23, 0x01, 0xcc]); // getL1BaseFeeEstimate()

  const arbGasInfoResult = await registry.handleCall(
    "0x000000000000000000000000000000000000006c", // ArbGasInfo address
    arbGasInfoCalldata,
    context
  );

  if (arbGasInfoResult.success) {
    const l1BaseFee = new DataView(arbGasInfoResult.data.buffer).getBigUint64(
      24,
      false
    );
    console.log(
      `ArbGasInfo getL1BaseFeeEstimate returned: ${Number(l1BaseFee)} wei (${
        Number(l1BaseFee) / 1e9
      } gwei)`
    );
  } else {
    console.log("❌ ArbGasInfo getL1BaseFeeEstimate failed");
  }

 

  // Test contract deployment and precompile calls
  console.log("\n📄 Testing contract deployment and precompile calls...");
  try {
    const ArbProbesFactory = await ethers.getContractFactory("ArbProbes");
    const arbProbes = await ArbProbesFactory.deploy();          // v6
    await arbProbes.waitForDeployment();                        // v6
    const addr = await arbProbes.getAddress();                  // v6
    console.log(`ArbProbes contract deployed at: ${addr}`);

    // Try to call ArbSys through the contract
    try {
        const chainId = await arbProbes.getArbChainId();
        console.log(`Contract ArbSys call returned: ${chainId.toString?.() ?? chainId}`);
    } catch (error) {
      console.log(
        `⚠️  Contract ArbSys call failed (expected for unpatched nodes): ${error.message}`
      );
    }

    // Try to call ArbGasInfo through the contract
    try {
      const l1GasFees = await arbProbes.getCurrentTxL1GasFees();
     console.log(`Contract ArbGasInfo call returned: ${l1GasFees.toString?.() ?? l1GasFees}`);
    } catch (error) {
      console.log(
        `⚠️  Contract ArbGasInfo call failed (expected for unpatched nodes): ${error.message}`
      );
    }
  } catch (error) {
    console.log(`❌ Contract deployment failed: ${error.message}`);
  }

  console.log("\n Precompile validation completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
