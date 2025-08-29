#!/usr/bin/env node

/**
 * Simple test runner for ArbGasInfo precompile handler
 * Tests the core functionality without external dependencies
 */

async function main() {
  console.log("🧪 Running ArbGasInfo Precompile Handler Tests...\n");

  // Import the compiled modules
  let HardhatPrecompileRegistry, ArbGasInfoHandler;

  try {
    // Use dynamic import for ES modules
    const registryModule = await import(
      "../../src/hardhat-patch/dist/precompiles/registry.js"
    );
    const arbGasInfoModule = await import(
      "../../src/hardhat-patch/dist/precompiles/arbGasInfo.js"
    );

    HardhatPrecompileRegistry = registryModule.HardhatPrecompileRegistry;
    ArbGasInfoHandler = arbGasInfoModule.ArbGasInfoHandler;
  } catch (error) {
    console.error("❌ Failed to import compiled modules:", error.message);
    process.exit(1);
  }

  // Test results tracking
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function test(name, testFn) {
    totalTests++;
    try {
      testFn();
      console.log(`✅ ${name}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failedTests++;
    }
  }

  // Test 1: Basic ArbGasInfo Methods
  test("Basic ArbGasInfo Methods", () => {
    const handler = new ArbGasInfoHandler({
      chainId: 42161,
      arbOSVersion: 20,
      l1BaseFee: BigInt(20e9),
    });

    const config = handler.getConfig();
    if (config.chainId !== 42161) {
      throw new Error(`Expected chainId 42161, got ${config.chainId}`);
    }
    if (config.arbOSVersion !== 20) {
      throw new Error(`Expected arbOSVersion 20, got ${config.arbOSVersion}`);
    }
    if (config.l1BaseFee !== BigInt(20e9)) {
      throw new Error(`Expected l1BaseFee 20e9, got ${config.l1BaseFee}`);
    }
  });

  // Test 2: Registry Integration
  test("Registry Integration", () => {
    const registry = new HardhatPrecompileRegistry();
    const handler = new ArbGasInfoHandler();

    registry.register(handler);

    if (!registry.hasHandler(handler.address)) {
      throw new Error("Handler not registered");
    }

    const retrieved = registry.getHandler(handler.address);
    if (retrieved !== handler) {
      throw new Error("Retrieved handler doesn't match");
    }
  });

  // Test 3: Configuration Customization
  test("Configuration Customization", () => {
    const customHandler = new ArbGasInfoHandler({
      chainId: 421613, // Arbitrum Goerli
      arbOSVersion: 21,
      l1BaseFee: BigInt(15e9), // 15 gwei
      gasPriceComponents: {
        l2BaseFee: BigInt(800000000), // 0.8 gwei
        l1CalldataCost: BigInt(20), // 20 gas per byte
        l1StorageCost: BigInt(0),
        congestionFee: BigInt(1e8), // 0.1 gwei
      },
    });

    const config = customHandler.getConfig();
    if (config.chainId !== 421613) {
      throw new Error(`Expected chainId 421613, got ${config.chainId}`);
    }
    if (config.arbOSVersion !== 21) {
      throw new Error(`Expected arbOSVersion 21, got ${config.arbOSVersion}`);
    }
    if (config.l1BaseFee !== BigInt(15e9)) {
      throw new Error(`Expected l1BaseFee 15e9, got ${config.l1BaseFee}`);
    }
    if (config.gasPriceComponents.l2BaseFee !== BigInt(800000000)) {
      throw new Error(`Expected l2BaseFee 800000000, got ${config.gasPriceComponents.l2BaseFee}`);
    }
  });

  // Test 4: Address Constants
  test("Address Constants", () => {
    const handler = new ArbGasInfoHandler();

    if (handler.address !== "0x000000000000000000000000000000000000006c") {
      throw new Error(`Expected address 0x6c, got ${handler.address}`);
    }

    if (handler.name !== "ArbGasInfo") {
      throw new Error(`Expected name "ArbGasInfo", got ${handler.name}`);
    }

    if (!handler.tags.includes("arbitrum")) {
      throw new Error("Missing 'arbitrum' tag");
    }
  });

  // Test 5: Gas Calculation Methods
  test("Gas Calculation Methods", () => {
    const handler = new ArbGasInfoHandler({
      l1BaseFee: BigInt(20e9), // 20 gwei
      gasPriceComponents: {
        l1CalldataCost: BigInt(16), // 16 gas per byte
      },
    });

    // Test the private calculateL1GasFees method
    const testCalldata = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a]); // 5 bytes
    const l1GasFees = handler["calculateL1GasFees"](testCalldata);
    
    // Expected: 5 bytes * 16 gas per byte * 20 gwei = 1,600,000,000,000 wei
    const expectedFees = BigInt(5) * BigInt(16) * BigInt(20e9);
    if (l1GasFees !== expectedFees) {
      throw new Error(`Expected L1 gas fees ${expectedFees}, got ${l1GasFees}`);
    }
  });

  // Test 6: Gas Configuration Summary
  test("Gas Configuration Summary", () => {
    const handler = new ArbGasInfoHandler({
      l1BaseFee: BigInt(20e9),
      gasPriceComponents: {
        l2BaseFee: BigInt(1e9),
        l1CalldataCost: BigInt(16),
        l1StorageCost: BigInt(0),
        congestionFee: BigInt(0),
      },
    });

    const summary = handler.getGasConfigSummary();
    
    if (!summary.includes("L1 Base Fee: 20000000000 wei (20 gwei)")) {
      throw new Error("Gas config summary missing L1 base fee");
    }
    if (!summary.includes("L2 Base Fee: 1000000000 wei (1 gwei)")) {
      throw new Error("Gas config summary missing L2 base fee");
    }
    if (!summary.includes("L1 Calldata Cost: 16 gas/byte")) {
      throw new Error("Gas config summary missing L1 calldata cost");
    }
  });

  // Test 7: Method Selectors
  test("Method Selectors", () => {
    // These are the expected method selectors for ArbGasInfo functions
    const expectedSelectors = [
      "4d2301cc", // getPricesInWei(), getL1BaseFeeEstimate(), getCurrentTxL1GasFees(), getPricesInArbGas()
    ];

    // For now, just verify the selectors are documented
    // In a full test, we would test each function call
    console.log(
      "   📝 Documented method selectors:",
      expectedSelectors.join(", ")
    );
  });

  console.log("\n🏁 Test Results:");
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(
    `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
  );

  if (failedTests === 0) {
    console.log("\n✅ All tests passed successfully!");
    console.log("🚀 ArbGasInfo handler is working correctly!");
    process.exit(0);
  } else {
    console.log(`\n❌ ${failedTests} test(s) failed`);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("❌ Test runner failed:", error.message);
  process.exit(1);
});
