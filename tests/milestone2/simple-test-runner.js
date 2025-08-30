#!/usr/bin/env node

/**
 * Simple test runner for Milestone 2 tests
 * This script tests the actual functionality without external test frameworks
 */

console.log("🧪 Running Milestone 2 Precompile Registry Tests...\n");

// Import the compiled modules
let HardhatPrecompileRegistry, ArbSysHandler, ArbGasInfoHandler;

try {
  // Try to import the compiled modules from hardhat-patch/dist directory
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

// Test 1: Handler Registration
test("Handler Registration", () => {
  const registry = new HardhatPrecompileRegistry();
  const arbSysHandler = new ArbSysHandler();
  const arbGasInfoHandler = new ArbGasInfoHandler();

  registry.register(arbSysHandler);
  registry.register(arbGasInfoHandler);

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

// Test 2: Handler Retrieval
test("Handler Retrieval", () => {
  const registry = new HardhatPrecompileRegistry();
  const arbSysHandler = new ArbSysHandler();

  registry.register(arbSysHandler);

  const retrieved = registry.getHandler(arbSysHandler.address);
  if (retrieved !== arbSysHandler) {
    throw new Error("Retrieved handler doesn't match registered handler");
  }

  const nonExistent = registry.getHandler(
    "0x1234567890123456789012345678901234567890"
  );
  if (nonExistent !== null) {
    throw new Error("Non-existent handler should return null");
  }
});

// Test 3: ArbSys Functionality
test("ArbSys Functionality", async () => {
  const handler = new ArbSysHandler();

  // Test arbChainID
  const chainIdCalldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]);
  const context = {
    blockNumber: BigInt(12345),
    chainId: BigInt(42161),
    txOrigin: "0x1234567890123456789012345678901234567890",
    msgSender: "0x1234567890123456789012345678901234567890",
    gasPriceWei: BigInt(1e9),
    config: {},
  };

  const result = await handler.handleCall(chainIdCalldata, context);
  if (!(result instanceof Uint8Array)) {
    throw new Error("Expected Uint8Array result");
  }
  if (result.length !== 32) {
    throw new Error("Expected 32-byte result");
  }
});

// Test 4: ArbGasInfo Functionality
test("ArbGasInfo Functionality", async () => {
  const handler = new ArbGasInfoHandler();

  // Test getPricesInWei
  const calldata = new Uint8Array([0x4d, 0x23, 0x01, 0xcc]);
  const context = {
    blockNumber: BigInt(12345),
    chainId: BigInt(42161),
    txOrigin: "0x1234567890123456789012345678901234567890",
    msgSender: "0x1234567890123456789012345678901234567890",
    gasPriceWei: BigInt(1e9),
    config: {},
  };

  const result = await handler.handleCall(calldata, context);
  if (!(result instanceof Uint8Array)) {
    throw new Error("Expected Uint8Array result");
  }
  if (result.length !== 160) {
    throw new Error("Expected 160-byte result for getPricesInWei");
  }
});

// Test 5: Error Handling
test("Error Handling", async () => {
  const handler = new ArbSysHandler();

  // Test invalid calldata
  const invalidCalldata = new Uint8Array([0x12, 0x34]); // Too short
  const context = {
    blockNumber: BigInt(12345),
    chainId: BigInt(42161),
    txOrigin: "0x1234567890123456789012345678901234567890",
    msgSender: "0x1234567890123456789012345678901234567890",
    gasPriceWei: BigInt(1e9),
    config: {},
  };

  try {
    await handler.handleCall(invalidCalldata, context);
    throw new Error("Expected error for invalid calldata");
  } catch (error) {
    if (!error.message.includes("Invalid calldata: too short")) {
      throw new Error(`Unexpected error: ${error.message}`);
    }
  }
});

// Test 6: Registry Call Handling
test("Registry Call Handling", async () => {
  const registry = new HardhatPrecompileRegistry();
  const arbSysHandler = new ArbSysHandler();

  registry.register(arbSysHandler);

  const calldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]);
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
});

// Test 7: Unknown Precompile Handling
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

// Test 8: Address Format Validation
test("Address Format Validation", () => {
  const arbSysHandler = new ArbSysHandler();
  const arbGasInfoHandler = new ArbGasInfoHandler();

  // Check that addresses are 20-byte hex strings
  if (!arbSysHandler.address.match(/^0x[0-9a-f]{40}$/)) {
    throw new Error(`Invalid ArbSys address format: ${arbSysHandler.address}`);
  }

  if (!arbGasInfoHandler.address.match(/^0x[0-9a-f]{40}$/)) {
    throw new Error(
      `Invalid ArbGasInfo address format: ${arbGasInfoHandler.address}`
    );
  }

  // Check specific addresses
  if (arbSysHandler.address !== "0x0000000000000000000000000000000000000064") {
    throw new Error(
      `Expected ArbSys address 0x0000000000000000000000000000000000000064, got ${arbSysHandler.address}`
    );
  }

  if (
    arbGasInfoHandler.address !== "0x000000000000000000000000000000000000006c"
  ) {
    throw new Error(
      `Expected ArbGasInfo address 0x000000000000000000000000000000000000006c, got ${arbGasInfoHandler.address}`
    );
  }
});

console.log("\n🏁 Test Results:");
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log("\nAll tests passed successfully!");
  process.exit(0);
} else {
  console.log(`\n ${failedTests} test(s) failed`);
  process.exit(1);
}
