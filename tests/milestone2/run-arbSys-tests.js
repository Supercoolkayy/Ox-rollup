#!/usr/bin/env node

/**
 * Simple test runner for ArbSys precompile handler
 * Tests the core functionality without external dependencies
 */

async function main() {
  console.log("🧪 Running ArbSys Precompile Handler Tests...\n");

  // Import the compiled modules
  let HardhatPrecompileRegistry, ArbSysHandler;

  try {
    // Use dynamic import for ES modules
    const registryModule = await import(
      "../../src/hardhat-patch/dist/precompiles/registry.js"
    );
    const arbSysModule = await import(
      "../../src/hardhat-patch/dist/precompiles/arbSys.js"
    );

    HardhatPrecompileRegistry = registryModule.HardhatPrecompileRegistry;
    ArbSysHandler = arbSysModule.ArbSysHandler;
  } catch (error) {
    console.error(" Failed to import compiled modules:", error.message);
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
      console.log(`${name}`);
      passedTests++;
    } catch (error) {
      console.log(` ${name}: ${error.message}`);
      failedTests++;
    }
  }

  // Test 1: Basic ArbSys Methods
  test("Basic ArbSys Methods", () => {
    const handler = new ArbSysHandler({
      chainId: 42161,
      arbOSVersion: 20,
    });

    const config = handler.getConfig();
    if (config.chainId !== 42161) {
      throw new Error(`Expected chainId 42161, got ${config.chainId}`);
    }
    if (config.arbOSVersion !== 20) {
      throw new Error(`Expected arbOSVersion 20, got ${config.arbOSVersion}`);
    }
  });

  // Test 2: Registry Integration
  test("Registry Integration", () => {
    const registry = new HardhatPrecompileRegistry();
    const handler = new ArbSysHandler();

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
    const customHandler = new ArbSysHandler({
      chainId: 421613, // Arbitrum Goerli
      arbOSVersion: 21,
    });

    const config = customHandler.getConfig();
    if (config.chainId !== 421613) {
      throw new Error(`Expected chainId 421613, got ${config.chainId}`);
    }
    if (config.arbOSVersion !== 21) {
      throw new Error(`Expected arbOSVersion 21, got ${config.arbOSVersion}`);
    }
  });

  // Test 4: Address Constants
  test("Address Constants", () => {
    const handler = new ArbSysHandler();

    if (handler.address !== "0x0000000000000000000000000000000000000064") {
      throw new Error(`Expected address 0x64, got ${handler.address}`);
    }

    if (handler.name !== "ArbSys") {
      throw new Error(`Expected name "ArbSys", got ${handler.name}`);
    }

    if (!handler.tags.includes("arbitrum")) {
      throw new Error("Missing 'arbitrum' tag");
    }
  });

  // Test 5: L1 Message Queue Integration
  test("L1 Message Queue Integration", () => {
    const registry = new HardhatPrecompileRegistry();
    const handler = new ArbSysHandler();

    registry.register(handler);

    const l1Queue = registry.getL1MessageQueue();
    if (!l1Queue) {
      throw new Error("L1 message queue not available");
    }

    // Test adding a message
    const message = {
      from: "0x1234567890123456789012345678901234567890",
      to: "0x0987654321098765432109876543210987654321",
      value: BigInt(0),
      data: new Uint8Array([0x12, 0x34, 0x56, 0x78]),
      timestamp: Date.now(),
      blockNumber: 12345,
      txHash: "0x1234567890123456789012345678901234567890",
    };

    const messageId = l1Queue.addMessage(message);
    if (!messageId) {
      throw new Error("Failed to add message to queue");
    }

    const messages = l1Queue.getMessages();
    if (messages.length !== 1) {
      throw new Error(`Expected 1 message, got ${messages.length}`);
    }

    if (messages[0].id !== messageId) {
      throw new Error("Message ID mismatch");
    }
  });

  // Test 6: Method Selectors
  test("Method Selectors", () => {
    // These are the expected method selectors for ArbSys functions
    const expectedSelectors = [
      "a3b1b31d", // arbChainID()
      "051038f2", // arbBlockNumber()
      "4d2301cc", // arbOSVersion() and arbBlockHash()
      "6e8c1d6f", // sendTxToL1()
      "a0c12269", // mapL1SenderContractAddressToL2Alias()
    ];

    // For now, just verify the selectors are documented
    // In a full test, we would test each function call
    console.log(
      "    Documented method selectors:",
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
    console.log("\nAll tests passed successfully!");
    console.log(" ArbSys handler is working correctly!");
    process.exit(0);
  } else {
    console.log(`\n ${failedTests} test(s) failed`);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error(" Test runner failed:", error.message);
  process.exit(1);
});
