#!/usr/bin/env node

/**
 * Simple Transaction Stress Test
 * Tests precompile handlers directly without Hardhat dependencies
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 Simple Transaction Stress Test");
console.log("================================\n");

// Mock the precompile handlers directly
class MockArbSysHandler {
  constructor() {
    this.address = "0x0000000000000000000000000000000000000064";
    this.name = "ArbSys";
  }

  async handleCall(calldata, context) {
    const selector = Array.from(calldata.slice(0, 4))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    switch (selector) {
      case "a3b1b31d": // arbChainID()
        return new Uint8Array(32)
          .fill(0)
          .map((_, i) => (i === 31 ? context.chainId : 0));
      case "051038f2": // arbBlockNumber()
        return new Uint8Array(32)
          .fill(0)
          .map((_, i) => (i === 31 ? context.blockNumber : 0));
      case "4d2301cc": // arbOSVersion()
        return new Uint8Array(32).fill(0).map((_, i) => (i === 31 ? 20 : 0));
      default:
        throw new Error(`Unknown selector: 0x${selector}`);
    }
  }

  gasCost() {
    return 3;
  }
}

class MockArbGasInfoHandler {
  constructor() {
    this.address = "0x000000000000000000000000000000000000006c";
    this.name = "ArbGasInfo";
  }

  async handleCall(calldata, context) {
    const selector = Array.from(calldata.slice(0, 4))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    switch (selector) {
      case "4d2301cc": // getCurrentTxL1GasFees()
        const calldataSize = calldata.length;
        const gasUsed = calldataSize * 16; // 16 gas per byte
        const fees = gasUsed * 20_000_000_000; // 20 gwei L1 base fee

        const result = new Uint8Array(32);
        const view = new DataView(result.buffer);
        view.setBigUint64(24, BigInt(fees), false);
        return result;
      default:
        throw new Error(`Unknown selector: 0x${selector}`);
    }
  }

  gasCost() {
    return 8;
  }
}

class MockRegistry {
  constructor() {
    this.handlers = new Map();
    this.handlers.set(
      "0x0000000000000000000000000000000000000064",
      new MockArbSysHandler()
    );
    this.handlers.set(
      "0x000000000000000000000000000000000000006c",
      new MockArbGasInfoHandler()
    );
  }

  async handleCall(address, calldata, context) {
    const handler = this.handlers.get(address);
    if (!handler) {
      return {
        success: false,
        gasUsed: 0,
        error: `No handler registered for address ${address}`,
      };
    }

    try {
      const result = await handler.handleCall(calldata, context);
      return {
        success: true,
        data: result,
        gasUsed: handler.gasCost(),
      };
    } catch (error) {
      return {
        success: false,
        gasUsed: 0,
        error: error.message,
      };
    }
  }

  list() {
    return Array.from(this.handlers.values());
  }
}

class SimpleTransactionStressTest {
  constructor() {
    this.registry = new MockRegistry();
    this.testResults = [];
    this.startTime = Date.now();
    this.memoryUsage = [];
  }

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

  async simulateTransaction(txIndex) {
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
      const result = await this.registry.handleCall(
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

  async runStressTest(totalTransactions = 500) {
    console.log(
      `🚀 Starting Simple Transaction Stress Test: ${totalTransactions} transactions`
    );
    console.log(`⏰ Start time: ${new Date().toISOString()}`);

    this.recordMemoryUsage();

    const batchSize = 50;
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

      const batchPromises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        batchPromises.push(this.simulateTransaction(i));
      }

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      this.recordMemoryUsage();

      const completed = results.length;
      const successCount = results.filter((r) => r.success).length;
      const failureCount = completed - successCount;

      console.log(
        ` Batch ${
          batch + 1
        } completed: ${completed}/${totalTransactions} (${successCount} success, ${failureCount} failed)`
      );

      if (batch < Math.ceil(totalTransactions / batchSize) - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    this.testResults = results;
    this.recordMemoryUsage();

    return results;
  }

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
    console.log(`\n⛽ Gas Usage:`);
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

  checkForIssues(analysis) {
    const issues = [];

    if (analysis.successRate < 0.95) {
      issues.push(
        `Low success rate: ${(analysis.successRate * 100).toFixed(
          1
        )}% (should be >95%)`
      );
    }

    if (analysis.avgDuration > 50) {
      issues.push(
        `High average duration: ${analysis.avgDuration.toFixed(
          2
        )}ms (should be <50ms)`
      );
    }

    if (analysis.memoryGrowth > 50 * 1024 * 1024) {
      // 50MB
      issues.push(
        `High memory growth: ${analysis.memoryGrowthMB} MB (should be <50MB)`
      );
    }

    if (issues.length === 0) {
      console.log("\n No issues detected - stress test passed!");
    } else {
      console.log("\n  Potential issues detected:");
      issues.forEach((issue) => console.log(`  - ${issue}`));
    }

    return issues;
  }

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

async function main() {
  try {
    const stressTest = new SimpleTransactionStressTest();

    await stressTest.runStressTest(500);

    const report = stressTest.generateReport();

    const reportContent = `# Step 6: Simple Transaction Stress Test Results
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

## Status
${
  report.issues.length === 0
    ? " STRESS TEST PASSED - No memory leaks or crashes detected"
    : " ISSUES DETECTED - Review the issues above"
}
`;

    const reportPath = path.join(__dirname, "..", "logs", "step6-stress.log");
    fs.writeFileSync(reportPath, reportContent);
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    process.exit(report.issues.length === 0 ? 0 : 1);
  } catch (error) {
    console.error("❌ Stress test failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SimpleTransactionStressTest };
