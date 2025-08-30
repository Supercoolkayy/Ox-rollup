#!/usr/bin/env node

/**
 * Minimal test runner for Milestone 2 precompile registry
 * Tests only the core functionality without external dependencies
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 Running Minimal Milestone 2 Precompile Registry Tests...\n");

let testResults = [];
let passedTests = 0;
let totalTests = 0;

function runTest(name, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`${name}`);
    testResults.push({ name, status: "PASSED", error: null });
    passedTests++;
  } catch (error) {
    console.log(` ${name}: ${error.message}`);
    testResults.push({ name, status: "FAILED", error: error.message });
  }
}

// Test 1: Basic Structure Verification
runTest("Source Files Exist", () => {
  const files = [
    "src/hardhat-patch/precompiles/registry.ts",
    "src/hardhat-patch/precompiles/arbSys.ts",
    "src/hardhat-patch/precompiles/arbGasInfo.ts",
    "src/hardhat-patch/index.ts",
  ];

  files.forEach((file) => {
    if (!fs.existsSync(file)) {
      throw new Error(`File ${file} does not exist`);
    }
  });
});

// Test 2: Compiled Files Exist
runTest("Compiled Files Exist", () => {
  const files = [
    "dist/src/hardhat-patch/precompiles/registry.js",
    "dist/src/hardhat-patch/precompiles/arbSys.js",
    "dist/src/hardhat-patch/precompiles/arbGasInfo.js",
    "dist/src/hardhat-patch/index.js",
  ];

  files.forEach((file) => {
    if (!fs.existsSync(file)) {
      throw new Error(`Compiled file ${file} does not exist`);
    }
  });
});

// Test 3: TypeScript Compilation Success
runTest("TypeScript Compilation Success", () => {
  // Check if dist directory exists and has content
  if (!fs.existsSync("dist")) {
    throw new Error("dist directory does not exist");
  }

  const distContents = fs.readdirSync("dist");
  if (distContents.length === 0) {
    throw new Error("dist directory is empty");
  }

  // Check if source and tests directories were compiled
  if (!fs.existsSync("dist/src")) {
    throw new Error("dist/src directory does not exist");
  }
  if (!fs.existsSync("dist/tests")) {
    throw new Error("dist/tests directory does not exist");
  }
});

// Test 4: File Content Validation
runTest("File Content Validation", () => {
  // Check if registry.ts contains expected interfaces
  const registryContent = fs.readFileSync(
    "src/hardhat-patch/precompiles/registry.ts",
    "utf8"
  );

  const expectedInterfaces = [
    "PrecompileHandler",
    "PrecompileRegistry",
    "ExecutionContext",
    "PrecompileResult",
  ];

  expectedInterfaces.forEach((interfaceName) => {
    if (!registryContent.includes(`interface ${interfaceName}`)) {
      throw new Error(`Interface ${interfaceName} not found in registry.ts`);
    }
  });

  // Check if arbSys.ts contains expected class
  const arbSysContent = fs.readFileSync(
    "src/hardhat-patch/precompiles/arbSys.ts",
    "utf8"
  );
  if (!arbSysContent.includes("class ArbSysHandler")) {
    throw new Error("ArbSysHandler class not found in arbSys.ts");
  }

  // Check if arbGasInfo.ts contains expected class
  const arbGasInfoContent = fs.readFileSync(
    "src/hardhat-patch/precompiles/arbGasInfo.ts",
    "utf8"
  );
  if (!arbGasInfoContent.includes("class ArbGasInfoHandler")) {
    throw new Error("ArbGasInfoHandler class not found in arbGasInfo.ts");
  }
});

// Test 5: Address Constants
runTest("Address Constants", () => {
  const arbSysContent = fs.readFileSync(
    "src/hardhat-patch/precompiles/arbSys.ts",
    "utf8"
  );
  const arbGasInfoContent = fs.readFileSync(
    "src/hardhat-patch/precompiles/arbGasInfo.ts",
    "utf8"
  );

  if (!arbSysContent.includes("0x0000000000000000000000000000000000000064")) {
    throw new Error("ArbSys address 0x64 not found");
  }

  if (
    !arbGasInfoContent.includes("0x000000000000000000000000000000000000006C")
  ) {
    throw new Error("ArbGasInfo address 0x6C not found");
  }
});

// Test 6: Method Selectors
runTest("Method Selectors", () => {
  const arbSysContent = fs.readFileSync(
    "src/hardhat-patch/precompiles/arbSys.ts",
    "utf8"
  );
  const arbGasInfoContent = fs.readFileSync(
    "src/hardhat-patch/precompiles/arbGasInfo.ts",
    "utf8"
  );

  // Check for expected method selectors
  const expectedSelectors = [
    "a3b1b31d", // arbChainID()
    "051038f2", // arbBlockNumber()
    "4d2301cc", // Common selector used in multiple functions
  ];

  expectedSelectors.forEach((selector) => {
    if (!arbSysContent.includes(selector)) {
      throw new Error(`Selector ${selector} not found in arbSys.ts`);
    }
  });

  if (!arbGasInfoContent.includes("4d2301cc")) {
    throw new Error("Expected selector not found in arbGasInfo.ts");
  }
});

// Test 7: Configuration Interface
runTest("Configuration Interface", () => {
  const registryContent = fs.readFileSync(
    "src/hardhat-patch/precompiles/registry.ts",
    "utf8"
  );

  const expectedConfigProps = [
    "chainId",
    "arbOSVersion",
    "l1BaseFee",
    "gasPriceComponents",
  ];

  expectedConfigProps.forEach((prop) => {
    if (!registryContent.includes(prop)) {
      throw new Error(`Configuration property ${prop} not found`);
    }
  });
});

// Test 8: Error Handling
runTest("Error Handling", () => {
  const registryContent = fs.readFileSync(
    "src/hardhat-patch/precompiles/registry.ts",
    "utf8"
  );

  if (!registryContent.includes("error?: string")) {
    throw new Error("Error handling not properly defined");
  }

  if (!registryContent.includes("success: boolean")) {
    throw new Error("Success flag not properly defined");
  }
});

console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);

// Save test results
const logContent = `# Milestone 2 Precompile Registry Test Results (Minimal)
# Date: ${new Date().toISOString()}
# Summary: ${passedTests}/${totalTests} tests passed

## Test Results
${testResults
  .map(
    (test) =>
      `${test.status === "PASSED" ? "" : ""} ${test.name}: ${test.status}${
        test.error ? ` - ${test.error}` : ""
      }`
  )
  .join("\n")}

## Summary
- Total Tests: ${totalTests}
- Passed: ${passedTests}
- Failed: ${totalTests - passedTests}
- Success Rate: ${Math.round((passedTests / totalTests) * 100)}%

## Status
${
  passedTests === totalTests
    ? "All tests passed successfully!"
    : " Some tests failed. Check the details above."
}

## Note
This is a minimal test that verifies file structure, content, and compilation success.
For full functionality testing, the Hardhat environment needs to be properly configured.
`;

const logPath = path.join(
  __dirname,
  "..",
  "logs",
  "step1-precompile-registry.log"
);
fs.writeFileSync(logPath, logContent);

console.log(`\n📝 Test results saved to: ${logPath}`);

// Exit with appropriate code
process.exit(passedTests === totalTests ? 0 : 1);
