#!/usr/bin/env node

/**
 * Simple test runner for Milestone 2 precompile registry
 * This script manually tests the functionality and saves the results
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Running Milestone 2 Precompile Registry Tests...\n');

// Import the compiled modules
const { HardhatPrecompileRegistry, ArbSysHandler, ArbGasInfoHandler } = require('../../dist/src/hardhat-patch');

let testResults = [];
let passedTests = 0;
let totalTests = 0;

function runTest(name, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`✅ ${name}`);
    testResults.push({ name, status: 'PASSED', error: null });
    passedTests++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    testResults.push({ name, status: 'FAILED', error: error.message });
  }
}

// Test 1: Registry Creation
runTest('Registry Creation', () => {
  const registry = new HardhatPrecompileRegistry();
  if (!registry) throw new Error('Registry not created');
});

// Test 2: Handler Creation
runTest('ArbSys Handler Creation', () => {
  const handler = new ArbSysHandler();
  if (!handler) throw new Error('ArbSys handler not created');
  if (handler.address !== '0x0000000000000000000000000000000000000064') {
    throw new Error(`Expected address 0x64, got ${handler.address}`);
  }
});

runTest('ArbGasInfo Handler Creation', () => {
  const handler = new ArbGasInfoHandler();
  if (!handler) throw new Error('ArbGasInfo handler not created');
  if (handler.address !== '0x000000000000000000000000000000000000006C') {
    throw new Error(`Expected address 0x6C, got ${handler.address}`);
  }
});

// Test 3: Handler Registration
runTest('Handler Registration', () => {
  const registry = new HardhatPrecompileRegistry();
  const arbSysHandler = new ArbSysHandler();
  const arbGasInfoHandler = new ArbGasInfoHandler();
  
  registry.register(arbSysHandler);
  registry.register(arbGasInfoHandler);
  
  if (!registry.hasHandler(arbSysHandler.address)) {
    throw new Error('ArbSys handler not registered');
  }
  if (!registry.hasHandler(arbGasInfoHandler.address)) {
    throw new Error('ArbGasInfo handler not registered');
  }
  
  const handlers = registry.listHandlers();
  if (handlers.length !== 2) {
    throw new Error(`Expected 2 handlers, got ${handlers.length}`);
  }
});

// Test 4: Handler Retrieval
runTest('Handler Retrieval', () => {
  const registry = new HardhatPrecompileRegistry();
  const arbSysHandler = new ArbSysHandler();
  
  registry.register(arbSysHandler);
  const retrieved = registry.getHandler(arbSysHandler.address);
  
  if (retrieved !== arbSysHandler) {
    throw new Error('Retrieved handler does not match registered handler');
  }
});

// Test 5: Non-existent Handler
runTest('Non-existent Handler', () => {
  const registry = new HardhatPrecompileRegistry();
  const handler = registry.getHandler('0x1234567890123456789012345678901234567890');
  
  if (handler !== null) {
    throw new Error('Expected null for non-existent handler');
  }
});

// Test 6: Duplicate Registration Prevention
runTest('Duplicate Registration Prevention', () => {
  const registry = new HardhatPrecompileRegistry();
  const handler = new ArbSysHandler();
  
  registry.register(handler);
  
  try {
    registry.register(handler);
    throw new Error('Expected error for duplicate registration');
  } catch (error) {
    if (!error.message.includes('already registered')) {
      throw new Error('Unexpected error message');
    }
  }
});

// Test 7: Configuration Handling
runTest('Configuration Handling', () => {
  const customConfig = {
    chainId: 421613, // Arbitrum Goerli
    arbOSVersion: 21,
    l1BaseFee: BigInt(15e9)
  };
  
  const handler = new ArbSysHandler(customConfig);
  const config = handler.getConfig();
  
  if (config.chainId !== 421613) {
    throw new Error(`Expected chainId 421613, got ${config.chainId}`);
  }
  if (config.arbOSVersion !== 21) {
    throw new Error(`Expected arbOSVersion 21, got ${config.arbOSVersion}`);
  }
  if (config.l1BaseFee !== BigInt(15e9)) {
    throw new Error(`Expected l1BaseFee ${BigInt(15e9)}, got ${config.l1BaseFee}`);
  }
});

// Test 8: Call Handling
runTest('Call Handling', async () => {
  const registry = new HardhatPrecompileRegistry();
  const arbSysHandler = new ArbSysHandler();
  
  registry.register(arbSysHandler);
  
  const context = {
    blockNumber: 12345,
    chainId: 42161,
    gasPrice: BigInt(1e9),
    caller: '0x1234567890123456789012345678901234567890',
    callStack: []
  };
  
  // Test arbChainID() call
  const calldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // arbChainID() selector
  const result = await registry.handleCall(arbSysHandler.address, calldata, context);
  
  if (!result.success) {
    throw new Error(`Call failed: ${result.error}`);
  }
  if (result.gasUsed !== 3) {
    throw new Error(`Expected gasUsed 3, got ${result.gasUsed}`);
  }
  if (!result.data) {
    throw new Error('Expected data in result');
  }
});

// Test 9: Error Handling
runTest('Error Handling', async () => {
  const registry = new HardhatPrecompileRegistry();
  
  const context = {
    blockNumber: 12345,
    chainId: 42161,
    gasPrice: BigInt(1e9),
    caller: '0x1234567890123456789012345678901234567890',
    callStack: []
  };
  
  // Test call to non-existent precompile
  const calldata = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
  const result = await registry.handleCall('0x1234567890123456789012345678901234567890', calldata, context);
  
  if (result.success) {
    throw new Error('Expected call to fail');
  }
  if (!result.error) {
    throw new Error('Expected error message');
  }
  if (result.gasUsed !== 0) {
    throw new Error(`Expected gasUsed 0, got ${result.gasUsed}`);
  }
});

console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);

// Save test results
const logContent = `# Milestone 2 Precompile Registry Test Results
# Date: ${new Date().toISOString()}
# Summary: ${passedTests}/${totalTests} tests passed

## Test Results
${testResults.map(test => `${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}: ${test.status}${test.error ? ` - ${test.error}` : ''}`).join('\n')}

## Summary
- Total Tests: ${totalTests}
- Passed: ${passedTests}
- Failed: ${totalTests - passedTests}
- Success Rate: ${Math.round((passedTests / totalTests) * 100)}%

## Status
${passedTests === totalTests ? '✅ All tests passed successfully!' : '❌ Some tests failed. Check the details above.'}
`;

const logPath = path.join(__dirname, '..', 'logs', 'step1-precompile-registry.log');
fs.writeFileSync(logPath, logContent);

console.log(`\n📝 Test results saved to: ${logPath}`);

// Exit with appropriate code
process.exit(passedTests === totalTests ? 0 : 1);
