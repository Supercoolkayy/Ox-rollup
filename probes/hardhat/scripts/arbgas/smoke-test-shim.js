const { ethers } = require("hardhat");

const ADDR = "0x000000000000000000000000000000000000006c";

async function main() {
  console.log(`\nDIAGNOSTIC: ArbGasInfoShim Verification`);
  console.log(`Target: ${ADDR}\n`);

  // Existence Check
  process.stdout.write("[1/4] Checking contract existence... ");
  try {
    const code = await ethers.provider.getCode(ADDR);
    if (code === "0x") {
      console.log("FAIL");
      console.error("\n[Error] No contract found at target address.");
      console.error("Action: Run predeploy script or 'arb:install-shims'.");
      return;
    }
    console.log("OK");
  } catch (e) {
    console.log("ERROR");
    console.error(`\n[Fatal] Connection failed: ${e.message}`);
    return;
  }

  // ABI Compatibility Check
  // Defines new methods to detect if the deployed contract is outdated
  const abi = [
    "function getL1BaseFeeEstimate() view returns (uint256)",
    "function getGasPricingConstraints() view returns (tuple(uint64, uint64, uint64)[])",
    "function __seedNitroConfig(uint256, uint256, uint256, uint256, uint256) external"
  ];

  const [signer] = await ethers.getSigners();
  const contract = new ethers.Contract(ADDR, abi, signer);

  process.stdout.write("[2/4] Verifying ABI compatibility... ");
  try {
    // Calls a view function specific to the new version
    await contract.getGasPricingConstraints();
    console.log("OK");
  } catch (e) {
    console.log("FAIL");
    console.error("\n[Error] Version Mismatch.");
    console.error("The deployed contract is outdated and lacks Nitro methods.");
    console.error("Action: Re-compile artifacts and re-deploy shims.");
    return;
  }

  // Write Permission Check
  process.stdout.write("[3/4] Testing write permissions... ");
  const testValue = 123456789; 

  try {
    const tx = await contract.__seedNitroConfig(testValue, 0, 0, 0, 0);
    await tx.wait();
    console.log("OK");
  } catch (e) {
    console.log("FAIL");
    console.error(`\n[Error] Seeding failed: ${e.message}`);
    return;
  }

  // State Verification
  process.stdout.write("[4/4] Verifying state persistence... ");
  const val = await contract.getL1BaseFeeEstimate();
  
  if (val.toString() === testValue.toString()) {
    console.log("OK");
    console.log("\n[Success] Local environment is consistent.");
  } else {
    console.log("FAIL");
    console.error(`\n[Error] Data mismatch. Expected ${testValue}, got ${val}.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});