const { ethers } = require("hardhat");

const ADDR = "0x000000000000000000000000000000000000006c";

async function main() {
  console.log(`\nTEST SUITE: ArbGasInfo Seeding & Validation`);
  console.log(`Target Contract: ${ADDR}\n`);

  const [signer] = await ethers.getSigners();
  
  const abi = [
    // Seeding Methods
    "function __seed(uint256[6] calldata v) external",
    "function __seedArbGasTuple(uint256, uint256, uint256) external",
    "function __seedNitroConfig(uint256, uint256, uint256, uint256, uint256) external",
    "function __clearPricingConstraints() external",
    "function __pushPricingConstraint(uint64, uint64, uint64) external",
    "function __seedCurrentTxL1GasFees(uint256) external",

    // Verification Methods
    "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
    "function getPricesInArbGas() view returns (uint256,uint256,uint256)",
    "function getL1BaseFeeEstimate() view returns (uint256)",
    "function getGasAccountingParams() view returns (uint256, uint256, uint256)",
    "function getMaxTxGasLimit() view returns (uint256)",
    "function getMinimumGasPrice() view returns (uint256)",
    "function getGasPricingConstraints() view returns (tuple(uint64, uint64, uint64)[])",
    "function getCurrentTxL1GasFees() view returns (uint256)"
  ];

  const c = new ethers.Contract(ADDR, abi, signer);

  // Legacy Prices
  process.stdout.write("Test 1: Legacy Prices... ");
  const legacyData = [11, 22, 33, 44, 55, 66];
  await (await c.__seed(legacyData)).wait();
  
  const rLegacy = await c.getPricesInWei();
  const rLegacyArr = rLegacy.map(x => Number(x));
  const legacyOk = JSON.stringify(rLegacyArr) === JSON.stringify(legacyData);
  console.log(legacyOk ? "PASS" : "FAIL");

  // ArbGas Prices
  process.stdout.write("Test 2: ArbGas Prices... ");
  const arbGasData = [777, 888, 999];
  await (await c.__seedArbGasTuple(arbGasData[0], arbGasData[1], arbGasData[2])).wait();

  const rArb = await c.getPricesInArbGas();
  const rArbArr = rArb.map(x => Number(x));
  const arbOk = JSON.stringify(rArbArr) === JSON.stringify(arbGasData);
  console.log(arbOk ? "PASS" : "FAIL");

  // Nitro Configuration
  process.stdout.write("Test 3: Nitro Config... ");
  const nitroData = {
    l1Base: 12345,
    speedLimit: 500000,
    maxBlock: 30000000,
    maxTx: 15000000,
    minPrice: 100000000
  };
  await (await c.__seedNitroConfig(
    nitroData.l1Base, nitroData.speedLimit, nitroData.maxBlock, 
    nitroData.maxTx, nitroData.minPrice
  )).wait();

  const rL1 = await c.getL1BaseFeeEstimate();
  const rMin = await c.getMinimumGasPrice();
  const rAcc = await c.getGasAccountingParams(); // [speed, pool, maxBlock]
  const rTx = await c.getMaxTxGasLimit();

  const nitroOk = 
    Number(rL1) === nitroData.l1Base &&
    Number(rMin) === nitroData.minPrice &&
    Number(rTx) === nitroData.maxTx &&
    Number(rAcc[0]) === nitroData.speedLimit &&
    Number(rAcc[2]) === nitroData.maxBlock;

  console.log(nitroOk ? "PASS" : "FAIL");
  if (!nitroOk) console.log("   -> Error: Nitro parameter mismatch detected.");

  // Constraints
  process.stdout.write("Test 4: Pricing Constraints... ");
  await (await c.__clearPricingConstraints()).wait();
  await (await c.__pushPricingConstraint(100, 200, 300)).wait();
  
  const rCons = await c.getGasPricingConstraints();
  const consOk = rCons.length === 1 && 
                 Number(rCons[0][0]) === 100 && 
                 Number(rCons[0][1]) === 200 && 
                 Number(rCons[0][2]) === 300;
  console.log(consOk ? "PASS" : "FAIL");

  // Current Tx L1 Fees
  process.stdout.write("Test 5: Current Tx L1 Fees... ");
  const testFee = 42000;
  await (await c.__seedCurrentTxL1GasFees(testFee)).wait();

  const rFees = await c.getCurrentTxL1GasFees();
  const feesOk = Number(rFees) === testFee;
  console.log(feesOk ? "PASS" : `FAIL (Expected ${testFee}, got ${rFees})`);

  console.log("\nDone.");
}

main().catch(console.error);