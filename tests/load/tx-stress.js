#!/usr/bin/env node

/**
 * Transaction Stress Test: 500 Sequential Deposit Transactions
 *
 * This test simulates high-load scenarios to validate:
 * 1. Memory usage stability
 * 2. No crashes under load
 * 3. Consistent performance
 * 4. Resource cleanup
 */

const { HardhatArbitrumPatch } = require("../../src/hardhat-patch");

class TransactionStressTest {
  constructor() {
    this.hardhatPatch = new HardhatArbitrumPatch({
      chainId: 42161,
      arbOSVersion: 20,
      enabled: true,
    });

    this.testResults = [];
    this.startTime = Date.now();
    this.memoryUsage = [];
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage() {
    const usage = process.memoryUsage();
    this.memoryUsage.push({
      timestamp: Date.now(),
      rss: usage.rss,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
    });
  }

  /**
   * Simulate a single deposit transaction
   */
  async simulateDepositTransaction(txIndex) {
    const startTime = Date.now();

    try {
      // Create mock transaction data
      const mockCalldata = new Uint8Array([
        0xa3,
        0xb1,
        0xb3,
        0x1d, // arbChainID() selector
        ...Array.from({ length: Math.floor(Math.random() * 100) }, () =>
          Math.floor(Math.random() * 256)
        ),
      ]);

      const context = {
        blockNumber: 12345 + txIndex,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: `0x${txIndex.toString(16).padStart(40, "0")}`,
        callStack: [],
      };

      // Process through ArbSys precompile
      const registry = this.hardhatPatch.getRegistry();
      const result = await registry.handleCall(
        "0x0000000000000000000000000000000000000064",
        mockCalldata,
        context
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        txIndex,
        success: result.success,
        duration,
        gasUsed: result.gasUsed || 0,
        error: result.error || null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        txIndex,
        success: false,
        duration,
        gasUsed: 0,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Simulate multiple deposit transactions with ArbGasInfo calls
   */
  async simulateArbGasInfoTransactions(txIndex) {
    const startTime = Date.now();

    try {
      // Create mock transaction data for ArbGasInfo
      const mockCalldata = new Uint8Array([
        0x4d,
        0x23,
        0x01,
        0xcc, // getCurrentTxL1GasFees() selector
        ...Array.from({ length: Math.floor(Math.random() * 200) }, () =>
          Math.floor(Math.random() * 256)
        ),
      ]);

      const context = {
        blockNumber: 12345 + txIndex,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: `0x${txIndex.toString(16).padStart(40, "0")}`,
        callStack: [],
      };

      // Process through ArbGasInfo precompile
      const registry = this.hardhatPatch.getRegistry();
      const result = await registry.handleCall(
        "0x000000000000000000000000000000000000006c",
        mockCalldata,
        context
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        txIndex,
        type: "ArbGasInfo",
        success: result.success,
        duration,
        gasUsed: result.gasUsed || 0,
        error: result.error || null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        txIndex,
        type: "ArbGasInfo",
        success: false,
        duration,
        gasUsed: 0,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Run the stress test
   */
  async runStressTest(totalTransactions = 500) {
    console.log(
      `🚀 Starting Transaction Stress Test: ${totalTransactions} transactions`
    );
    console.log(`⏰ Start time: ${new Date().toISOString()}`);

    // Record initial memory usage
    this.recordMemoryUsage();

    const batchSize = 50; // Process in batches to avoid overwhelming
    const results = [];

    for (
      let batch = 0;
      batch < Math.ceil(totalTransactions / batchSize);
      batch++
    ) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min((batch + 1) * batchSize, totalTransactions);

      console.log(
        `📦 Processing batch ${batch + 1}: transactions ${
          batchStart + 1
        }-${batchEnd}`
      );

      // Process batch in parallel
      const batchPromises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        // Alternate between ArbSys and ArbGasInfo calls
        if (i % 2 === 0) {
          batchPromises.push(this.simulateDepositTransaction(i));
        } else {
          batchPromises.push(this.simulateArbGasInfoTransactions(i));
        }
      }

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Record memory usage after each batch
      this.recordMemoryUsage();

      // Progress update
      const completed = results.length;
      const successCount = results.filter((r) => r.success).length;
      const failureCount = completed - successCount;

      console.log(
        ` Batch ${
          batch + 1
        } completed: ${completed}/${totalTransactions} (${successCount} success, ${failureCount} failed)`
      );

      // Small delay between batches to simulate real-world conditions
      if (batch < Math.ceil(totalTransactions / batchSize) - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    this.testResults = results;

    // Record final memory usage
    this.recordMemoryUsage();

    return results;
  }

  /**
   * Analyze test results
   */
  analyzeResults() {
    const totalTransactions = this.testResults.length;
    const successfulTransactions = this.testResults.filter(
      (r) => r.success
    ).length;
    const failedTransactions = totalTransactions - successfulTransactions;

    const durations = this.testResults.map((r) => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    const gasUsed = this.testResults.map((r) => r.gasUsed);
    const totalGasUsed = gasUsed.reduce((a, b) => a + b, 0);
    const avgGasUsed = totalGasUsed / gasUsed.length;

    // Memory analysis
    const initialMemory = this.memoryUsage[0];
    const finalMemory = this.memoryUsage[this.memoryUsage.length - 1];
    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryGrowthMB = (memoryGrowth / 1024 / 1024).toFixed(2);

    console.log("\n📊 Stress Test Results Analysis");
    console.log("=================================");
    console.log(`Total Transactions: ${totalTransactions}`);
    console.log(
      `Successful: ${successfulTransactions} (${(
        (successfulTransactions / totalTransactions) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `Failed: ${failedTransactions} (${(
        (failedTransactions / totalTransactions) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`\n⏱️  Performance Metrics:`);
    console.log(`  Average Duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Min Duration: ${minDuration}ms`);
    console.log(`  Max Duration: ${maxDuration}ms`);
    console.log(`\n Gas Usage:`);
    console.log(`  Total Gas Used: ${totalGasUsed}`);
    console.log(`  Average Gas per Transaction: ${avgGasUsed.toFixed(2)}`);
    console.log(`\n🧠 Memory Usage:`);
    console.log(
      `  Initial Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(
        2
      )} MB`
    );
    console.log(
      `  Final Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(`  Memory Growth: ${memoryGrowthMB} MB`);
    console.log(
      `  Memory Growth per Transaction: ${(
        memoryGrowth /
        totalTransactions /
        1024
      ).toFixed(2)} KB`
    );

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      successRate: successfulTransactions / totalTransactions,
      avgDuration,
      minDuration,
      maxDuration,
      totalGasUsed,
      avgGasUsed,
      memoryGrowth,
      memoryGrowthMB,
    };
  }

  /**
   * Check for potential issues
   */
  checkForIssues(analysis) {
    const issues = [];

    if (analysis.successRate < 0.95) {
      issues.push(
        `Low success rate: ${(analysis.successRate * 100).toFixed(
          1
        )}% (should be >95%)`
      );
    }

    if (analysis.avgDuration > 100) {
      issues.push(
        `High average duration: ${analysis.avgDuration.toFixed(
          2
        )}ms (should be <100ms)`
      );
    }

    if (analysis.memoryGrowth > 100 * 1024 * 1024) {
      // 100MB
      issues.push(
        `High memory growth: ${analysis.memoryGrowthMB} MB (should be <100MB)`
      );
    }

    if (analysis.memoryGrowth > 0) {
      const growthPerTx = analysis.memoryGrowth / analysis.totalTransactions;
      if (growthPerTx > 1024 * 1024) {
        // 1MB per transaction
        issues.push(
          `High memory growth per transaction: ${(
            growthPerTx /
            1024 /
            1024
          ).toFixed(2)} MB (should be <1MB)`
        );
      }
    }

    if (issues.length === 0) {
      console.log("\n No issues detected - stress test passed!");
    } else {
      console.log("\n  Potential issues detected:");
      issues.forEach((issue) => console.log(`  - ${issue}`));
    }

    return issues;
  }

  /**
   * Generate detailed report
   */
  generateReport() {
    const analysis = this.analyzeResults();
    const issues = this.checkForIssues(analysis);

    const report = {
      timestamp: new Date().toISOString(),
      testDuration: Date.now() - this.startTime,
      analysis,
      issues,
      memoryUsage: this.memoryUsage,
      testResults: this.testResults,
    };

    return report;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log("🧪 Transaction Stress Test Suite");
    console.log("================================\n");

    const stressTest = new TransactionStressTest();

    // Run the stress test
    await stressTest.runStressTest(500);

    // Generate and display report
    const report = stressTest.generateReport();

    // Save detailed results
    const fs = require("fs");
    const reportPath = "../../tests/logs/step6-stress.log";

    const reportContent = `# Step 6: Transaction Stress Test Results
# Date: ${new Date().toISOString()}
# Test Duration: ${report.testDuration}ms

## Summary
- Total Transactions: ${report.analysis.totalTransactions}
- Successful: ${report.analysis.successfulTransactions} (${(
      report.analysis.successRate * 100
    ).toFixed(1)}%)
- Failed: ${report.analysis.failedTransactions} (${(
      (report.analysis.failedTransactions / report.analysis.totalTransactions) *
      100
    ).toFixed(1)}%)

## Performance Metrics
- Average Duration: ${report.analysis.avgDuration.toFixed(2)}ms
- Min Duration: ${report.analysis.minDuration}ms
- Max Duration: ${report.analysis.maxDuration}ms

## Gas Usage
- Total Gas Used: ${report.analysis.totalGasUsed}
- Average Gas per Transaction: ${report.analysis.avgGasUsed.toFixed(2)}

## Memory Usage
- Memory Growth: ${report.analysis.memoryGrowthMB} MB
- Memory Growth per Transaction: ${(
      report.analysis.memoryGrowth /
      report.analysis.totalTransactions /
      1024
    ).toFixed(2)} KB

## Issues Detected
${
  report.issues.length === 0
    ? "None - All tests passed!"
    : report.issues.map((issue) => `- ${issue}`).join("\n")
}

## Memory Usage Timeline
${report.memoryUsage
  .map(
    (usage, index) =>
      `Batch ${index}: ${(usage.heapUsed / 1024 / 1024).toFixed(
        2
      )} MB (${new Date(usage.timestamp).toISOString()})`
  )
  .join("\n")}

## Test Results Sample
${report.testResults
  .slice(0, 10)
  .map(
    (result) =>
      `TX ${result.txIndex}: ${result.success ? "SUCCESS" : "FAILED"} - ${
        result.duration
      }ms - ${result.gasUsed} gas`
  )
  .join("\n")}
... and ${report.testResults.length - 10} more transactions

## Status
${
  report.issues.length === 0
    ? "STRESS TEST PASSED - No memory leaks or crashes detected"
    : " ISSUES DETECTED - Review the issues above"
}
`;

    fs.writeFileSync(reportPath, reportContent);
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Exit with appropriate code
    process.exit(report.issues.length === 0 ? 0 : 1);
  } catch (error) {
    console.error("❌ Stress test failed:", error.message);
    process.exit(1);
  }
}

// Run the stress test if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { TransactionStressTest };
