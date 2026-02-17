const hre = require("hardhat");
const { ethers } = hre;

const ADDR_GASINFO = "0x000000000000000000000000000000000000006c";

// --- Formatting Helpers ---
const fmt = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  dim: "\x1b[2m"
};

function pad(str, len) {
  return str.padEnd(len).slice(0, len);
}

function printRow(label, actual, expected) {
  const isMatch = actual.toString() === expected.toString();
  const status = isMatch ? `${fmt.green}OK${fmt.reset}` : `${fmt.red}FAIL${fmt.reset}`;
  const actDisp = actual.toString().length > 15 ? actual.toString().substring(0, 12) + "..." : actual.toString();
  const expDisp = expected.toString().length > 15 ? expected.toString().substring(0, 12) + "..." : expected.toString();
  
  console.log(`   ${pad(label, 20)} | ${pad(actDisp, 15)} | ${pad(expDisp, 15)} | ${status}`);
}

async function main() {
  console.log(`\n${fmt.bold}Arbitrum Precompile Installer & Verifier${fmt.reset}`);
  console.log(`${fmt.dim}Target Address: ${ADDR_GASINFO}${fmt.reset}\n`);

  //Compile
  process.stdout.write("   [1/4] Compiling contracts... ");
  await hre.run("compile");
  console.log("Done.");

  const Artifact = await hre.artifacts.readArtifact("ArbGasInfoShim");
  const bytecode = Artifact.deployedBytecode;

  // Install
  process.stdout.write(`   [2/4] Installing bytecode (${bytecode.length / 2 - 1} bytes)... `);
  await hre.network.provider.send("hardhat_setCode", [ADDR_GASINFO, bytecode]);
  console.log("Done.");

  // Connect & Seed
  const [signer] = await ethers.getSigners();
  const gasInfo = new ethers.Contract(ADDR_GASINFO, Artifact.abi, signer);

  // Mainnet values (as of Feb 2026)
  const MAINNET_WEI = ["1843139200", "13165280", "404000000000", "20000000", "200000", "20200000"];
  const MAINNET_ARBGAS = ["91", "0", "20000"]; 

  console.log("   [3/4] Seeding default configuration...");
  
  // Seed Legacy Wei
  await (await gasInfo.__seed(MAINNET_WEI)).wait();
  
  // Seed New ArbGas
  if (typeof gasInfo.__seedArbGasTuple === 'function') {
      await (await gasInfo.__seedArbGasTuple(...MAINNET_ARBGAS)).wait();
  } else {
      console.log(`         ${fmt.red}Error: __seedArbGasTuple missing on contract.${fmt.reset}`);
  }

  // Seed Nitro Scalars
  if (typeof gasInfo.__seedNitroConfig === 'function') {
      await (await gasInfo.__seedNitroConfig(
          "25000000000", // L1 Base Fee
          "120000000",   // Speed Limit
          "32000000",    // Block Gas
          "32000000",    // Tx Gas
          "100000000"    // Min Gas
      )).wait();
  }

  // Verify
  console.log("\n   [4/4] Verifying State:");
  console.log(`   ${pad("Parameter", 20)} | ${pad("Actual", 15)} | ${pad("Expected", 15)} | Status`);
  console.log(`   ${"-".repeat(20)}-+-${"-".repeat(15)}-+-${"-".repeat(15)}-+-------`);

  // Check 1: Legacy Wei
  const wei = await gasInfo.getPricesInWei();
  printRow("Wei: Per L2 Tx", wei[0], MAINNET_WEI[0]);
  printRow("Wei: Per L1 Call", wei[1], MAINNET_WEI[1]);

  // Check 2: ArbGas
  const arb = await gasInfo.getPricesInArbGas();
  printRow("Arb: Per L2 Tx", arb[0], MAINNET_ARBGAS[0]);
  printRow("Arb: Per Storage", arb[2], MAINNET_ARBGAS[2]);

  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});