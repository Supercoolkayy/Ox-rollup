#!/usr/bin/env node

/**
 * Simple Smoke Test for Plugin Bootstrap
 *
 * This script validates that the Hardhat Arbitrum Patch plugin components
 * can be properly instantiated and work correctly.
 */

console.log(" Running Plugin Bootstrap Smoke Test...\n");

// Import the compiled modules directly
let HardhatPrecompileRegistry, ArbSysHandler, ArbGasInfoHandler;

try {
  const registryModule = require("../../src/hardhat-patch/dist/precompiles/registry");
  const arbSysModule = require("../../src/hardhat-patch/dist/precompiles/arbSys");
  const arbGasInfoModule = require("../../src/hardhat-patch/dist/precompiles/arbGasInfo");

  HardhatPrecompileRegistry = registryModule.HardhatPrecompileRegistry;
  ArbSysHandler = arbSysModule.ArbSysHandler;
  ArbGasInfoHandler = arbGasInfoModule.ArbGasInfoHandler;
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

// Test 1: Component Instantiation
test("Component Instantiation", () => {
  // Test that we can create instances of all components
  const registry = new HardhatPrecompileRegistry();
  const arbSysHandler = new ArbSysHandler();
  const arbGasInfoHandler = new ArbGasInfoHandler();

  if (!registry) {
    throw new Error("Registry not created");
  }

  if (!arbSysHandler) {
    throw new Error("ArbSys handler not created");
  }

  if (!arbGasInfoHandler) {
    throw new Error("ArbGasInfo handler not created");
  }
});

// Test 2: Registry Handler Registration
test("Registry Handler Registration", () => {
  const registry = new HardhatPrecompileRegistry();
  const arbSysHandler = new ArbSysHandler();
  const arbGasInfoHandler = new ArbGasInfoHandler();

  // Register handlers
  registry.register(arbSysHandler);
  registry.register(arbGasInfoHandler);

  // Check registration
  if (!registry.hasHandler(arbSysHandler.address)) {
    throw new Error("ArbSys handler not registered");
  }

  if (!registry.hasHandler(arbGasInfoHandler.address)) {
    throw new Error("ArbGasInfo handler not registered");
  }

  const handlers = registry.listHandlers();
  if (handlers.length !== 2) {
    throw new Error(`Expected 2 handlers, got ${handlers.length}`);
  }
});

// Test 3: Handler Addresses
test("Handler Addresses", () => {
  const arbSysHandler = new ArbSysHandler();
  const arbGasInfoHandler = new ArbGasInfoHandler();

  // Check ArbSys address
  if (arbSysHandler.address !== "0x0000000000000000000000000000000000000064") {
    throw new Error(
      `Expected ArbSys address 0x0000000000000000000000000000000000000064, got ${arbSysHandler.address}`
    );
  }

  // Check ArbGasInfo address
  if (
    arbGasInfoHandler.address !== "0x000000000000000000000000000000000000006c"
  ) {
    throw new Error(
      `Expected ArbGasInfo address 0x000000000000000000000000000000000000006c, got ${arbGasInfoHandler.address}`
    );
  }
});

// Test 4: Handler Names and Tags
test("Handler Names and Tags", () => {
  const arbSysHandler = new ArbSysHandler();
  const arbGasInfoHandler = new ArbGasInfoHandler();

  // Check names
  if (arbSysHandler.name !== "ArbSys") {
    throw new Error(`Expected ArbSys name "ArbSys", got ${arbSysHandler.name}`);
  }

  if (arbGasInfoHandler.name !== "ArbGasInfo") {
    throw new Error(
      `Expected ArbGasInfo name "ArbGasInfo", got ${arbGasInfoHandler.name}`
    );
  }

  // Check tags
  if (!arbSysHandler.tags.includes("arbitrum")) {
    throw new Error("ArbSys handler missing 'arbitrum' tag");
  }

  if (!arbGasInfoHandler.tags.includes("arbitrum")) {
    throw new Error("ArbGasInfo handler missing 'arbitrum' tag");
  }
});

// Test 5: Registry Call Handling
test("Registry Call Handling", async () => {
  const registry = new HardhatPrecompileRegistry();
  const arbSysHandler = new ArbSysHandler();

  registry.register(arbSysHandler);

  // Test a simple precompile call
  const calldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // arbChainID()
  const context = {
    blockNumber: 12345,
    chainId: 42161,
    gasPrice: BigInt(1e9),
    caller: "0x1234567890123456789012345678901234567890",
    callStack: [],
  };

  const result = await registry.handleCall(
    arbSysHandler.address,
    calldata,
    context
  );

  if (!result.success) {
    throw new Error(`Call failed: ${result.error}`);
  }

  if (!result.data) {
    throw new Error("Expected data in result");
  }

  if (!(result.data instanceof Uint8Array)) {
    throw new Error("Expected Uint8Array data in result");
  }
});

// Test 6: Unknown Precompile Handling
test("Unknown Precompile Handling", async () => {
  const registry = new HardhatPrecompileRegistry();

  const calldata = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
  const context = {
    blockNumber: 12345,
    chainId: 42161,
    gasPrice: BigInt(1e9),
    caller: "0x1234567890123456789012345678901234567890",
    callStack: [],
  };

  const result = await registry.handleCall(
    "0x1234567890123456789012345678901234567890",
    calldata,
    context
  );

  if (result.success) {
    throw new Error("Expected failure for unknown precompile");
  }

  if (!result.error || !result.error.includes("No handler registered")) {
    throw new Error(`Unexpected error: ${result.error}`);
  }
});

console.log("\n🏁 Smoke Test Results:");
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log("\nAll smoke tests passed successfully!");
  console.log(" Plugin components are working correctly!");
  process.exit(0);
} else {
  console.log(`\n ${failedTests} test(s) failed`);
  process.exit(1);
}
