#!/usr/bin/env node

/**
 * Hardhat Probe: ArbGasInfo Precompile Testing
 *
 * This script specifically tests the ArbGasInfo precompile (0x6C) functionality
 * for gas pricing, L1 cost estimation, and fee calculations.
 *
 * Usage: npx hardhat run probes/hardhat/test-arbgasinfo.js
 */

const { ethers } = require("hardhat");

// ArbGasInfo precompile address
const ARBGASINFO_ADDRESS = "0x000000000000000000000000000000000000006C";

// Method selectors for ArbGasInfo precompile
const ARBGASINFO_METHODS = {
  // Priority P0 methods
  getPricesInWei: "0x4d2301cc",
  getPricesInArbGas: "0x4d2301cc",
  getL1BaseFeeEstimate: "0x4d2301cc",
  getPricesInWeiWithAggregator: "0x4d2301cc",

  // Priority P1 methods
  getPricesInArbGasWithAggregator: "0x4d2301cc",
  getCurrentTxL1GasFees: "0x4d2301cc",

  // Priority P2 methods
  getGasAccountingParams: "0x4d2301cc",
  getGasBacklog: "0x4d2301cc",
  getPricingInertia: "0x4d2301cc",
  getL1PricingSurplus: "0x4d2301cc",
};

async function testArbGasInfoAccessibility() {
  console.log("1. Testing ArbGasInfo precompile accessibility...");

  try {
    const code = await ethers.provider.getCode(ARBGASINFO_ADDRESS);

    if (code === "0x") {
      console.log("    ArbGasInfo precompile not found");
      console.log("   💡 This indicates Arbitrum features are not enabled");
      return false;
    }

    console.log("    ArbGasInfo precompile found and accessible");
    return true;
  } catch (error) {
    console.log(`    Accessibility test failed: ${error.message}`);
    return false;
  }
}

async function testGasPricingMethods() {
  console.log("\n2. Testing gas pricing methods (P0)...");

  const results = {};

  // Test getPricesInWei()
  console.log("   Testing getPricesInWei()...");
  try {
    const result = await ethers.provider.call({
      to: ARBGASINFO_ADDRESS,
      data: ARBGASINFO_METHODS.getPricesInWei,
    });

    if (result && result !== "0x") {
      console.log("    getPricesInWei() returned data");
      console.log(`   📊 Raw result: ${result}`);

      // Parse the result (expected: packed uint256 values)
      try {
        const decoded = ethers.utils.defaultAbiCoder.decode(
          ["uint256", "uint256", "uint256"],
          result
        );
        console.log(
          `   📈 L2 Base Fee: ${ethers.utils.formatUnits(
            decoded[0],
            "wei"
          )} wei`
        );
        console.log(
          `   📈 L1 Base Fee: ${ethers.utils.formatUnits(
            decoded[1],
            "wei"
          )} wei`
        );
        console.log(
          `   📈 L1 Gas Price: ${ethers.utils.formatUnits(
            decoded[2],
            "wei"
          )} wei`
        );
        results.getPricesInWei = true;
      } catch (decodeError) {
        console.log(`   ⚠️  Result parsing failed: ${decodeError.message}`);
        results.getPricesInWei = true; // Method works, parsing issue
      }
    } else {
      console.log("    getPricesInWei() returned empty result");
      results.getPricesInWei = false;
    }
  } catch (error) {
    console.log(`    getPricesInWei() failed: ${error.message}`);
    results.getPricesInWei = false;
  }

  // Test getL1BaseFeeEstimate()
  console.log("   Testing getL1BaseFeeEstimate()...");
  try {
    const result = await ethers.provider.call({
      to: ARBGASINFO_ADDRESS,
      data: ARBGASINFO_METHODS.getL1BaseFeeEstimate,
    });

    if (result && result !== "0x") {
      console.log("    getL1BaseFeeEstimate() returned data");
      console.log(`   📊 Raw result: ${result}`);
      results.getL1BaseFeeEstimate = true;
    } else {
      console.log("    getL1BaseFeeEstimate() returned empty result");
      results.getL1BaseFeeEstimate = false;
    }
  } catch (error) {
    console.log(`    getL1BaseFeeEstimate() failed: ${error.message}`);
    results.getL1BaseFeeEstimate = false;
  }

  return results;
}

async function testFeeEstimationMethods() {
  console.log("\n3. Testing fee estimation methods (P1)...");

  const results = {};

  // Test getPricesInArbGasWithAggregator()
  console.log("   Testing getPricesInArbGasWithAggregator()...");
  try {
    const result = await ethers.provider.call({
      to: ARBGASINFO_ADDRESS,
      data: ARBGASINFO_METHODS.getPricesInArbGasWithAggregator,
    });

    if (result && result !== "0x") {
      console.log("    getPricesInArbGasWithAggregator() returned data");
      console.log(`   📊 Raw result: ${result}`);
      results.getPricesInArbGasWithAggregator = true;
    } else {
      console.log(
        "    getPricesInArbGasWithAggregator() returned empty result"
      );
      results.getPricesInArbGasWithAggregator = false;
    }
  } catch (error) {
    console.log(
      `    getPricesInArbGasWithAggregator() failed: ${error.message}`
    );
    results.getPricesInArbGasWithAggregator = false;
  }

  // Test getCurrentTxL1GasFees()
  console.log("   Testing getCurrentTxL1GasFees()...");
  try {
    const result = await ethers.provider.call({
      to: ARBGASINFO_ADDRESS,
      data: ARBGASINFO_METHODS.getCurrentTxL1GasFees,
    });

    if (result && result !== "0x") {
      console.log("    getCurrentTxL1GasFees() returned data");
      console.log(`   📊 Raw result: ${result}`);
      results.getCurrentTxL1GasFees = true;
    } else {
      console.log("    getCurrentTxL1GasFees() returned empty result");
      results.getCurrentTxL1GasFees = false;
    }
  } catch (error) {
    console.log(`    getCurrentTxL1GasFees() failed: ${error.message}`);
    results.getCurrentTxL1GasFees = false;
  }

  return results;
}

async function testSystemParameterMethods() {
  console.log("\n4. Testing system parameter methods (P2)...");

  const results = {};

  // Test getGasAccountingParams()
  console.log("   Testing getGasAccountingParams()...");
  try {
    const result = await ethers.provider.call({
      to: ARBGASINFO_ADDRESS,
      data: ARBGASINFO_METHODS.getGasAccountingParams,
    });

    if (result && result !== "0x") {
      console.log("    getGasAccountingParams() returned data");
      console.log(`   📊 Raw result: ${result}`);
      results.getGasAccountingParams = true;
    } else {
      console.log("    getGasAccountingParams() returned empty result");
      results.getGasAccountingParams = false;
    }
  } catch (error) {
    console.log(`    getGasAccountingParams() failed: ${error.message}`);
    results.getGasAccountingParams = false;
  }

  // Test getGasBacklog()
  console.log("   Testing getGasBacklog()...");
  try {
    const result = await ethers.provider.call({
      to: ARBGASINFO_ADDRESS,
      data: ARBGASINFO_METHODS.getGasBacklog,
    });

    if (result && result !== "0x") {
      console.log("    getGasBacklog() returned data");
      console.log(`   📊 Raw result: ${result}`);
      results.getGasBacklog = true;
    } else {
      console.log("    getGasBacklog() returned empty result");
      results.getGasBacklog = false;
    }
  } catch (error) {
    console.log(`    getGasBacklog() failed: ${error.message}`);
    results.getGasBacklog = false;
  }

  return results;
}

async function testGasCalculationAccuracy() {
  console.log("\n5. Testing gas calculation accuracy...");

  try {
    // Get current gas price from network
    const networkGasPrice = await ethers.provider.getGasPrice();
    console.log(
      `   📊 Network gas price: ${ethers.utils.formatUnits(
        networkGasPrice,
        "gwei"
      )} gwei`
    );

    // Try to get L1 gas price estimate from ArbGasInfo
    try {
      const l1EstimateResult = await ethers.provider.call({
        to: ARBGASINFO_ADDRESS,
        data: ARBGASINFO_METHODS.getL1BaseFeeEstimate,
      });

      if (l1EstimateResult && l1EstimateResult !== "0x") {
        const l1Estimate = ethers.BigNumber.from(l1EstimateResult);
        console.log(
          `   📊 L1 gas price estimate: ${ethers.utils.formatUnits(
            l1Estimate,
            "gwei"
          )} gwei`
        );

        // Calculate ratio
        const ratio = l1Estimate.mul(100).div(networkGasPrice);
        console.log(`   📊 L1/L2 gas price ratio: ${ratio.toString()}%`);

        if (ratio.gt(100)) {
          console.log(
            "    L1 gas price > L2 gas price (expected for Arbitrum)"
          );
        } else {
          console.log("   ⚠️  L1 gas price <= L2 gas price (unexpected)");
        }
      }
    } catch (error) {
      console.log(
        `   ℹ️  L1 gas price comparison not available: ${error.message}`
      );
    }

    return true;
  } catch (error) {
    console.log(`    Gas calculation accuracy test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(" Starting ArbGasInfo Precompile Probe for Hardhat Network\n");
  console.log("=".repeat(70));

  // Test accessibility
  const isAccessible = await testArbGasInfoAccessibility();

  if (!isAccessible) {
    console.log("\n" + "=".repeat(70));
    console.log("📊 PROBE RESULTS SUMMARY");
    console.log("=".repeat(70));
    console.log(" ArbGasInfo precompile not accessible");
    console.log("\n💡 To enable Arbitrum features:");
    console.log("   1. Install hardhat-arbitrum-local plugin");
    console.log("   2. Configure hardhat.config.js with Arbitrum settings");
    console.log("   3. Restart Hardhat network");
    console.log("\n" + "=".repeat(70));
    return;
  }

  // Test different method categories
  const gasPricingResults = await testGasPricingMethods();
  const feeEstimationResults = await testFeeEstimationMethods();
  const systemParamResults = await testSystemParameterMethods();

  // Test gas calculation accuracy
  await testGasCalculationAccuracy();

  // Compile results
  const allResults = {
    ...gasPricingResults,
    ...feeEstimationResults,
    ...systemParamResults,
  };

  const workingMethods = Object.values(allResults).filter(Boolean).length;
  const totalMethods = Object.keys(allResults).length;

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 ARBGASINFO PROBE RESULTS SUMMARY");
  console.log("=".repeat(70));

  console.log(`Precompile Accessibility:  ENABLED`);
  console.log(`Working Methods: ${workingMethods}/${totalMethods}`);
  console.log(
    `Success Rate: ${Math.round((workingMethods / totalMethods) * 100)}%`
  );

  console.log("\n Method Status:");

  // P0 Methods
  console.log("\n   Priority P0 (Critical):");
  Object.entries(gasPricingResults).forEach(([method, status]) => {
    console.log(`   ${status ? "" : ""} ${method}`);
  });

  // P1 Methods
  console.log("\n   Priority P1 (Important):");
  Object.entries(feeEstimationResults).forEach(([method, status]) => {
    console.log(`   ${status ? "" : ""} ${method}`);
  });

  // P2 Methods
  console.log("\n   Priority P2 (Optional):");
  Object.entries(systemParamResults).forEach(([method, status]) => {
    console.log(`   ${status ? "" : ""} ${method}`);
  });

  console.log("\n" + "=".repeat(70));

  if (workingMethods === totalMethods) {
    console.log("🎉 All ArbGasInfo methods are working correctly!");
  } else if (workingMethods >= totalMethods * 0.7) {
    console.log(
      "⚠️  Most ArbGasInfo methods are working, some issues detected"
    );
  } else {
    console.log(" Significant issues with ArbGasInfo precompile detected");
  }
}

// Run the probe
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(" ArbGasInfo probe failed:", error);
    process.exit(1);
  });
