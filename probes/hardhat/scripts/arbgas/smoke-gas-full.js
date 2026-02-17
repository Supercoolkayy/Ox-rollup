const { ethers } = require("hardhat");

const ADDR = "0x000000000000000000000000000000000000006c";

async function main() {
  console.log(`\n=== ArbGasInfo Inspector ===`);
  console.log(`Address: ${ADDR}\n`);

  const provider = ethers.provider;
  
  // Define complete ABI to ensure all methods are callable
  const abi = [
    // Core Pricing
    "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
    "function getPricesInArbGas() view returns (uint256,uint256,uint256)",
    
    // Nitro / Accounting
    "function getL1BaseFeeEstimate() view returns (uint256)",
    "function getMinimumGasPrice() view returns (uint256)",
    "function getGasAccountingParams() view returns (uint256 speedLimit, uint256 gasPoolMax, uint256 maxBlockGas)",
    "function getMaxTxGasLimit() view returns (uint256)",
    "function getMaxBlockGasLimit() view returns (uint64)",
    
    // Constraints
    "function getGasPricingConstraints() view returns (tuple(uint64 t, uint64 w, uint64 b)[])",
    
    // Stubs
    "function getCurrentTxL1GasFees() view returns (uint256)",
    "function getGasBacklog() view returns (uint64)",
    "function getL1PricingSurplus() view returns (int256)"
  ];

  const contract = new ethers.Contract(ADDR, abi, provider);

  // Executes a contract call and formats the output
  const fetchAndPrint = async (label, fn) => {
    try {
      let res = await fn();
      
      // formatting helper for BigInt
      const fmt = (v) => (typeof v === 'bigint') ? v.toString() : v;
      
      let output;
      if (Array.isArray(res)) {
        // Handle structs/tuples (e.g., constraints)
        output = JSON.stringify(res.map(x => {
            if (Array.isArray(x)) return x.map(fmt); 
            return fmt(x);
        }));
      } else {
        output = fmt(res);
      }
      
      // Print aligned output
      console.log(`${label.padEnd(30)} : ${output}`);
    } catch (e) {
      console.log(`${label.padEnd(30)} : [REVERT] ${e.message}`);
    }
  };

  console.log("[Prices]");
  await fetchAndPrint("getPricesInWei", () => contract.getPricesInWei());
  await fetchAndPrint("getPricesInArbGas", () => contract.getPricesInArbGas());

  console.log("\n[Nitro Configuration]");
  await fetchAndPrint("getL1BaseFeeEstimate", () => contract.getL1BaseFeeEstimate());
  await fetchAndPrint("getMinimumGasPrice", () => contract.getMinimumGasPrice());
  await fetchAndPrint("getGasAccountingParams", () => contract.getGasAccountingParams());
  await fetchAndPrint("getMaxTxGasLimit", () => contract.getMaxTxGasLimit());
  await fetchAndPrint("getMaxBlockGasLimit", () => contract.getMaxBlockGasLimit());

  console.log("\n[Constraints]");
  await fetchAndPrint("getGasPricingConstraints", () => contract.getGasPricingConstraints());

  console.log("\n[Stubs & Misc]");
  await fetchAndPrint("getCurrentTxL1GasFees", () => contract.getCurrentTxL1GasFees());
  await fetchAndPrint("getGasBacklog", () => contract.getGasBacklog());
}

main().catch(console.error);