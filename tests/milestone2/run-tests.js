#!/usr/bin/env node

/**
 * Simple test runner for Milestone 2 tests
 * This script runs the precompile registry tests and saves the output
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running Milestone 2 Precompile Registry Tests...\n');

// Run the tests using mocha
const testProcess = spawn('npx', [
  'mocha',
  '--require', 'ts-node/register',
  '--timeout', '10000',
  'precompile-registry.test.ts'
], {
  cwd: __dirname,
  stdio: 'pipe'
});

let stdout = '';
let stderr = '';

testProcess.stdout.on('data', (data) => {
  const output = data.toString();
  stdout += output;
  process.stdout.write(output);
});

testProcess.stderr.on('data', (data) => {
  const output = data.toString();
  stderr += output;
  process.stderr.write(output);
});

testProcess.on('close', (code) => {
  console.log(`\n\n🏁 Test process exited with code ${code}`);
  
  // Save test output to logs
  const logContent = `# Milestone 2 Precompile Registry Test Results
# Date: ${new Date().toISOString()}
# Exit Code: ${code}

## Standard Output
${stdout}

## Standard Error
${stderr}

## Summary
${code === 0 ? '✅ All tests passed' : '❌ Some tests failed'}
`;

  const logPath = path.join(__dirname, '..', 'logs', 'step1-precompile-registry.log');
  fs.writeFileSync(logPath, logContent);
  
  console.log(`\n📝 Test results saved to: ${logPath}`);
  
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error.message);
  process.exit(1);
});
