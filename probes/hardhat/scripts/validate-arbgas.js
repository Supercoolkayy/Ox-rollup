/**
 * Hardhat Script: Validate ArbGasInfo Precompiles
 * Focus: getL1BaseFeeEstimate & getCurrentTxL1GasFees
 */

const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("🔍 Validating ArbGasInfo Precompile Patch...\n");


  const arbitrumPatch = hre.arbitrumPatch || hre.arbitrum;

  if (!arbitrumPatch) {
    console.error("❌ Arbitrum patch not found in HRE. Did you import the plugin?");
    process.exit(1);
  }
  console.log("✅ Arbitrum patch found in HRE");
  const registry = arbitrumPatch.getRegistry();

  // ------------------------------------------------------
  // PART A: Raw Registry Calls (Low-Level Validation)
  // ------------------------------------------------------
  console.log("\n--- [Part A] Raw Registry Validation ---");

  // Mock Context
  const context = {
    blockNumber: 12345,
    chainId: 42161,
    gasPrice: BigInt(1e9),
    caller: "0x1234567890123456789012345678901234567890",
    callStack: [],
  };

  const ARBGAS_ADDR = "0x000000000000000000000000000000000000006c";

  // Function 1: getL1BaseFeeEstimate()
  // Selector: 0xf5d6ded7
  const calldata1 = new Uint8Array([0xf5, 0xd6, 0xde, 0xd7]); 
  const res1 = await registry.handleCall(ARBGAS_ADDR, calldata1, context);
  
  if (res1.success) {
    const val = new DataView(res1.data.buffer).getBigUint64(24, false);
    console.log(`✅ Raw getL1BaseFeeEstimate: ${Number(val)}`);
  } else {
    console.log("❌ Raw getL1BaseFeeEstimate: FAILED");
  }

  // Function 2: getCurrentTxL1GasFees()
  // Selector: 0x3e593258  (Keccak hash of "getCurrentTxL1GasFees()")
  const calldata2 = new Uint8Array([0xc6, 0xf7, 0xde, 0x0e]);
  const res2 = await registry.handleCall(ARBGAS_ADDR, calldata2, context);

  if (res2.success) {
    const val = new DataView(res2.data.buffer).getBigUint64(24, false);
    console.log(`✅ Raw getCurrentTxL1GasFees: ${Number(val)}`);
  } else {
    console.log("❌ Raw getCurrentTxL1GasFees: FAILED");
  }

  // ------------------------------------------------------
  // PART B: Contract Calls (Integration Validation)
  // ------------------------------------------------------
  console.log("\n--- [Part B] Contract Integration Validation ---");

  try {
    const ArbProbesFactory = await ethers.getContractFactory("ArbProbes");
    const arbProbes = await ArbProbesFactory.deploy();
    await arbProbes.waitForDeployment();
    console.log(`📄 ArbProbes deployed at: ${await arbProbes.getAddress()}`);


    try {

        if (arbProbes.getL1BaseFeeEstimate) {
            const val = await arbProbes.getL1BaseFeeEstimate();
            console.log(`✅ Contract getL1BaseFeeEstimate: ${val}`);
        } else {
            console.log("⚠️  Skipping: 'getL1BaseFeeEstimate' function not found on ArbProbes contract.");
        }
    } catch (e) {
        console.log(`❌ Contract getL1BaseFeeEstimate failed: ${e.message}`);
    }

    // Call 2: getCurrentTxL1GasFees
    try {
        const val = await arbProbes.getCurrentTxL1GasFees();
        console.log(`✅ Contract getCurrentTxL1GasFees: ${val}`);
    } catch (e) {
        console.log(`❌ Contract getCurrentTxL1GasFees failed: ${e.message}`);
    }

  } catch (error) {
    console.log(`❌ Contract deployment failed: ${error.message}`);
  }

  console.log("\nValidation completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });