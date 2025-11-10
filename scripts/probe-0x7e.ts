#!/usr/bin/env node

/**
 * Probe Script for 0x7e Transaction Type Support
 *
 * Tests the complete 0x7e transaction pipeline including:
 * - Transaction parsing and validation
 * - RLP encoding/decoding
 * - Transaction processing and execution
 * - Integration with Hardhat network
 */

import { ethers } from "hardhat";
import {
  Tx7eParser,
  Tx7eProcessor,
  Tx7eIntegration,
  extendHardhatWithTx7e,
} from "../src/hardhat-patch";

async function main() {
  console.log(" Probing 0x7e Transaction Type Support...\n");

  // Initialize components
  const parser = new Tx7eParser();
  const processor = new Tx7eProcessor(ethers.provider);

  // Extend Hardhat with 0x7e support
  const integration = extendHardhatWithTx7e(ethers as any, {
    enabled: true,
    logTransactions: true,
    validateSignatures: true,
  });

  console.log(" 0x7e transaction support initialized\n");

  // Test 1: Basic Transaction Creation and Parsing
  console.log("1. Testing Basic Transaction Creation and Parsing...");

  const mockTx = parser.createMockDepositTransaction({
    to: "0x1234567890123456789012345678901234567890",
    value: ethers.utils.parseEther("1.0"),
    data: "0x12345678",
  });

  console.log("    Mock transaction created:");
  console.log(`   - Type: 0x${mockTx.type.toString(16)}`);
  console.log(`   - From: ${mockTx.from}`);
  console.log(`   - To: ${mockTx.to}`);
  console.log(`   - Value: ${ethers.utils.formatEther(mockTx.value)} ETH`);
  console.log(`   - Data: ${mockTx.data}`);

  // Test 2: Transaction Validation
  console.log("\n2. Testing Transaction Validation...");

  const validation = parser.validateTransaction(mockTx);
  console.log(
    `    Validation result: ${validation.isValid ? "PASSED" : "FAILED"}`
  );

  if (validation.errors.length > 0) {
    console.log("    Validation errors:");
    validation.errors.forEach((error) => console.log(`      - ${error}`));
  }

  if (validation.warnings.length > 0) {
    console.log("    Validation warnings:");
    validation.warnings.forEach((warning) => console.log(`      - ${warning}`));
  }

  // Test 3: RLP Encoding and Decoding
  console.log("\n3. Testing RLP Encoding and Decoding...");

  const encoded = parser.encodeTransaction(mockTx);
  console.log(`   📦 Encoded transaction: ${encoded.length} bytes`);
  console.log(`    First byte: 0x${encoded[0].toString(16)}`);

  const parsed = parser.parseTransaction(encoded);
  console.log(`    Parse result: ${parsed.success ? "SUCCESS" : "FAILED"}`);

  if (parsed.success && parsed.transaction) {
    console.log(
      `    Parsed transaction hash: ${parser.getTransactionHash(
        parsed.transaction
      )}`
    );
  }

  // Test 4: Transaction Processing
  console.log("\n4. Testing Transaction Processing...");

  const processResult = await processor.processTransaction(encoded);
  console.log(
    `    Processing result: ${processResult.success ? "SUCCESS" : "FAILED"}`
  );

  if (processResult.success) {
    console.log(`    Transaction hash: ${processResult.transactionHash}`);
    console.log(`    Gas used: ${processResult.gasUsed || "unknown"}`);
  } else {
    console.log(`    Error: ${processResult.error}`);
  }

  // Test 5: Gas Estimation
  console.log("\n5. Testing Gas Estimation...");

  const gasResult = await processor.estimateGas(encoded);
  console.log(
    `    Gas estimation: ${gasResult.success ? "SUCCESS" : "FAILED"}`
  );

  if (gasResult.success) {
    console.log(
      `    Estimated gas: ${gasResult.gasEstimate?.toLocaleString()}`
    );
  } else {
    console.log(`    Error: ${gasResult.error}`);
  }

  // Test 6: Call Simulation
  console.log("\n6. Testing Call Simulation...");

  const callResult = await processor.callStatic(encoded);
  console.log(
    `    Call simulation: ${callResult.success ? "SUCCESS" : "FAILED"}`
  );

  if (callResult.success) {
    console.log(`    Return data: ${callResult.returnData}`);
  } else {
    console.log(`    Error: ${callResult.error}`);
  }

  // Test 7: Integration Layer
  console.log("\n7. Testing Integration Layer...");

  const extendedProvider = integration.getProvider();
  console.log("   🔌 Extended provider methods:");
  console.log(
    `      - processDepositTransaction: ${
      typeof extendedProvider.processDepositTransaction === "function" ? "" : ""
    }`
  );
  console.log(
    `      - estimateDepositGas: ${
      typeof extendedProvider.estimateDepositGas === "function" ? "" : ""
    }`
  );
  console.log(
    `      - callDepositStatic: ${
      typeof extendedProvider.callDepositStatic === "function" ? "" : ""
    }`
  );

  // Test 8: Transaction Summary
  console.log("\n8. Testing Transaction Summary...");

  const summary = parser.getTransactionSummary(mockTx);
  console.log("    Transaction summary:");
  console.log(summary);

  // Test 9: Batch Processing
  console.log("\n9. Testing Batch Processing...");

  const batchTxs = [
    parser.createMockDepositTransaction({
      nonce: 1,
      value: ethers.utils.parseEther("0.1"),
    }),
    parser.createMockDepositTransaction({
      nonce: 2,
      value: ethers.utils.parseEther("0.2"),
    }),
    parser.createMockDepositTransaction({
      nonce: 3,
      value: ethers.utils.parseEther("0.3"),
    }),
  ];

  const encodedBatch = batchTxs.map((tx) => parser.encodeTransaction(tx));
  const batchResults = await processor.processBatch(encodedBatch);

  console.log(`   📦 Batch processing: ${batchResults.length} transactions`);
  const successCount = batchResults.filter((r) => r.success).length;
  console.log(`    Successful: ${successCount}/${batchResults.length}`);

  // Test 10: Error Handling
  console.log("\n10. Testing Error Handling...");

  const invalidBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
  const errorResult = await processor.processTransaction(invalidBuffer);

  console.log(
    `    Error handling: ${errorResult.success ? "FAILED" : "SUCCESS"}`
  );
  if (!errorResult.success) {
    console.log(`    Error message: ${errorResult.error}`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(" 0x7e TRANSACTION SUPPORT PROBE RESULTS");
  console.log("=".repeat(60));

  const tests = [
    { name: "Transaction Creation", result: !!mockTx },
    { name: "Transaction Validation", result: validation.isValid },
    { name: "RLP Encoding/Decoding", result: parsed.success },
    { name: "Transaction Processing", result: processResult.success },
    { name: "Gas Estimation", result: gasResult.success },
    { name: "Call Simulation", result: callResult.success },
    {
      name: "Integration Layer",
      result: !!extendedProvider.processDepositTransaction,
    },
    { name: "Batch Processing", result: successCount === batchResults.length },
    { name: "Error Handling", result: !errorResult.success },
  ];

  tests.forEach((test) => {
    const status = test.result ? " PASSED" : " FAILED";
    console.log(`${status} ${test.name}`);
  });

  const passedTests = tests.filter((t) => t.result).length;
  const totalTests = tests.length;

  console.log(`\n🏁 Overall Result: ${passedTests}/${totalTests} tests passed`);
  console.log(
    `📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
  );

  if (passedTests === totalTests) {
    console.log(
      "\n All tests passed! 0x7e transaction support is working correctly."
    );
  } else {
    console.log(
      `\n ${totalTests - passedTests} test(s) failed. Check the details above.`
    );
  }
}

main().catch((error) => {
  console.error(" Probe script failed:", error);
  process.exitCode = 1;
});
