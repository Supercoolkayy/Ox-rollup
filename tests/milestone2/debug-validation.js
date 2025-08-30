const { Tx7eParser } = require("../../src/hardhat-patch");

async function debugValidation() {
  console.log("Debugging validation logic...");

  const parser = new Tx7eParser();

  // Create a mock transaction
  const mockTx = parser.createMockDepositTransaction();
  console.log("Mock transaction gas limit:", mockTx.gasLimit);
  console.log("MIN_GAS_LIMIT:", parser.MIN_GAS_LIMIT);
  console.log("MAX_GAS_LIMIT:", parser.MAX_GAS_LIMIT);

  // Test validation
  const validation = parser.validateTransaction(mockTx);
  console.log("Validation result:", validation);

  // Test with low gas limit
  const lowGasTx = { ...mockTx, gasLimit: 10000 };
  console.log("Low gas tx gas limit:", lowGasTx.gasLimit);
  const lowGasValidation = parser.validateTransaction(lowGasTx);
  console.log("Low gas validation:", lowGasValidation);

  // Test with high gas limit
  const highGasTx = { ...mockTx, gasLimit: 50000000 };
  console.log("High gas tx gas limit:", highGasTx.gasLimit);
  const highGasValidation = parser.validateTransaction(highGasTx);
  console.log("High gas validation:", highGasValidation);
}

debugValidation().catch(console.error);
