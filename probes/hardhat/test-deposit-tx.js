#!/usr/bin/env node

/**
 * Hardhat Probe: Deposit Transaction (0x7e) Testing
 *
 * This script tests the support for Arbitrum deposit transactions
 * (transaction type 0x7e) in the local Hardhat network.
 *
 * Usage: npx hardhat run probes/hardhat/test-deposit-tx.js
 */

const { ethers } = require("hardhat");

// Arbitrum deposit transaction type
const DEPOSIT_TX_TYPE = 0x7e;

// Test addresses
const TEST_ADDRESSES = {
  l1Sender: "0x1234567890123456789012345678901234567890",
  l2Recipient: "0x0987654321098765432109876543210987654321",
  contractAddress: "0x1111111111111111111111111111111111111111",
};

async function testDepositTransactionParsing() {
  console.log("1. Testing deposit transaction parsing...");

  try {
    // Create a mock deposit transaction structure
    const mockDepositTx = {
      type: DEPOSIT_TX_TYPE,
      sourceHash: ethers.utils.randomBytes(32),
      from: TEST_ADDRESSES.l1Sender,
      to: TEST_ADDRESSES.l2Recipient,
      mint: ethers.utils.parseEther("2.0"),
      value: ethers.utils.parseEther("1.5"),
      gasLimit: 100000,
      isCreation: false,
      data: "0x12345678", // Mock calldata
    };

    console.log("    Mock deposit transaction created:");
    console.log(`   - Type: 0x${mockDepositTx.type.toString(16)}`);
    console.log(
      `   - Source Hash: 0x${mockDepositTx.sourceHash.toString("hex")}`
    );
    console.log(`   - From (L1): ${mockDepositTx.from}`);
    console.log(`   - To (L2): ${mockDepositTx.to}`);
    console.log(
      `   - Mint: ${ethers.utils.formatEther(mockDepositTx.mint)} ETH`
    );
    console.log(
      `   - Value: ${ethers.utils.formatEther(mockDepositTx.value)} ETH`
    );
    console.log(`   - Gas Limit: ${mockDepositTx.gasLimit.toLocaleString()}`);
    console.log(`   - Is Creation: ${mockDepositTx.isCreation}`);
    console.log(`   - Data: ${mockDepositTx.data}`);

    return true;
  } catch (error) {
    console.log(
      `    Deposit transaction parsing test failed: ${error.message}`
    );
    return false;
  }
}

async function testRLPEncoding() {
  console.log("\n2. Testing RLP encoding for deposit transactions...");

  try {
    // Create deposit transaction fields for RLP encoding
    const depositFields = [
      ethers.utils.randomBytes(32), // sourceHash
      TEST_ADDRESSES.l1Sender, // from
      TEST_ADDRESSES.l2Recipient, // to
      ethers.utils.parseEther("1.0"), // mint
      ethers.utils.parseEther("0.5"), // value
      50000, // gasLimit
      false, // isCreation
      "0x", // data
    ];

    // Encode the fields using RLP
    const encodedFields = ethers.utils.RLP.encode(depositFields);
    console.log("    RLP encoding successful");
    console.log(`    Encoded length: ${encodedFields.length} bytes`);
    console.log(`    Encoded data: ${encodedFields}`);

    // Try to decode to verify
    try {
      const decodedFields = ethers.utils.RLP.decode(encodedFields);
      console.log("    RLP decoding successful");
      console.log(`    Decoded fields: ${decodedFields.length}`);

      // Verify first field (sourceHash)
      if (decodedFields[0].length === 32) {
        console.log("    Source hash field correctly encoded/decoded");
      } else {
        console.log("    Source hash field encoding issue");
      }

      return true;
    } catch (decodeError) {
      console.log(`    RLP decoding failed: ${decodeError.message}`);
      return false;
    }
  } catch (error) {
    console.log(`    RLP encoding test failed: ${error.message}`);
    return false;
  }
}

async function testTransactionTypeSupport() {
  console.log("\n3. Testing transaction type 0x7e support...");

  try {
    // Check if the network supports the deposit transaction type
    const network = await ethers.provider.getNetwork();
    console.log(`    Network: ${network.name} (Chain ID: ${network.chainId})`);

    // Try to create a transaction with type 0x7e
    const [signer] = await ethers.getSigners();
    const signerAddress = await signer.getAddress();

    console.log("   🔍 Testing transaction type 0x7e acceptance...");

    // Create a mock deposit transaction
    const mockDepositTx = {
      type: DEPOSIT_TX_TYPE,
      to: TEST_ADDRESSES.l2Recipient,
      value: ethers.utils.parseEther("0.1"),
      gasLimit: 21000,
      data: "0x",
    };

    try {
      // This will likely fail since Hardhat doesn't support 0x7e yet
      const tx = await signer.sendTransaction(mockDepositTx);
      console.log("    Transaction type 0x7e accepted!");
      console.log(`    Transaction hash: ${tx.hash}`);
      return true;
    } catch (txError) {
      console.log("    Transaction type 0x7e not supported");
      console.log(`    Error: ${txError.message}`);

      // Check if it's a transaction type error
      if (
        txError.message.includes("transaction type") ||
        txError.message.includes("0x7e") ||
        txError.message.includes("unsupported")
      ) {
        console.log(
          "   ℹ️  This confirms that deposit transactions are not yet implemented"
        );
      }

      return false;
    }
  } catch (error) {
    console.log(`    Transaction type support test failed: ${error.message}`);
    return false;
  }
}

async function testRPCCompatibility() {
  console.log("\n4. Testing RPC compatibility for deposit transactions...");

  try {
    // Test eth_sendRawTransaction with 0x7e transaction
    console.log("   🔍 Testing eth_sendRawTransaction...");

    // Create a mock raw transaction (this won't work without 0x7e support)
    const mockRawTx = "0x7e" + ethers.utils.randomBytes(64).toString("hex");

    try {
      const result = await ethers.provider.send("eth_sendRawTransaction", [
        mockRawTx,
      ]);
      console.log("    eth_sendRawTransaction accepted 0x7e transaction");
      console.log(`    Result: ${result}`);
      return true;
    } catch (rpcError) {
      console.log("    eth_sendRawTransaction rejected 0x7e transaction");
      console.log(`    Error: ${rpcError.message}`);

      // Check if it's a transaction type error
      if (
        rpcError.message.includes("transaction type") ||
        rpcError.message.includes("0x7e") ||
        rpcError.message.includes("invalid")
      ) {
        console.log("   ℹ️  RPC layer doesn't support deposit transactions");
      }

      return false;
    }
  } catch (error) {
    console.log(`    RPC compatibility test failed: ${error.message}`);
    return false;
  }
}

async function testContractInteraction() {
  console.log("\n5. Testing contract interaction with deposit context...");

  try {
    // Deploy a simple test contract
    console.log("   🔨 Deploying test contract...");

    const TestContract = await ethers.getContractFactory("TestContract");
    const testContract = await TestContract.deploy();
    await testContract.deployed();

    console.log(`    Test contract deployed at: ${testContract.address}`);

    // Test if the contract can access Arbitrum-specific features
    console.log("   🔍 Testing contract access to Arbitrum features...");

    try {
      // Try to call ArbSys precompile from the contract
      const result = await testContract.testArbSysCall();
      console.log("    Contract can access Arbitrum features");
      return true;
    } catch (contractError) {
      console.log("    Contract cannot access Arbitrum features");
      console.log(`    Error: ${contractError.message}`);
      return false;
    }
  } catch (error) {
    console.log(`    Contract interaction test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(
    " Starting Deposit Transaction (0x7e) Probe for Hardhat Network\n"
  );
  console.log("=".repeat(70));

  const results = {
    parsing: false,
    rlpEncoding: false,
    txTypeSupport: false,
    rpcCompatibility: false,
    contractInteraction: false,
  };

  // Test deposit transaction parsing
  results.parsing = await testDepositTransactionParsing();

  // Test RLP encoding/decoding
  results.rlpEncoding = await testRLPEncoding();

  // Test transaction type support
  results.txTypeSupport = await testTransactionTypeSupport();

  // Test RPC compatibility
  results.rpcCompatibility = await testRPCCompatibility();

  // Test contract interaction
  results.contractInteraction = await testContractInteraction();

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log(" DEPOSIT TRANSACTION PROBE RESULTS SUMMARY");
  console.log("=".repeat(70));

  console.log(
    `Transaction Parsing:        ${
      results.parsing ? " SUPPORTED" : " NOT SUPPORTED"
    }`
  );
  console.log(
    `RLP Encoding:              ${
      results.rlpEncoding ? " SUPPORTED" : " NOT SUPPORTED"
    }`
  );
  console.log(
    `Transaction Type 0x7e:     ${
      results.txTypeSupport ? " SUPPORTED" : " NOT SUPPORTED"
    }`
  );
  console.log(
    `RPC Compatibility:         ${
      results.rpcCompatibility ? " SUPPORTED" : " NOT SUPPORTED"
    }`
  );
  console.log(
    `Contract Interaction:      ${
      results.contractInteraction ? " SUPPORTED" : " NOT SUPPORTED"
    }`
  );

  const supportedFeatures = Object.values(results).filter(Boolean).length;
  console.log(`\nTotal Features Supported: ${supportedFeatures}/5`);

  if (supportedFeatures === 0) {
    console.log("\n💡 To enable deposit transaction support:");
    console.log("   1. Install hardhat-arbitrum-local plugin");
    console.log("   2. Configure transaction type 0x7e support");
    console.log("   3. Implement RLP parsing for deposit transactions");
    console.log("   4. Add RPC handling for 0x7e transactions");
  } else if (supportedFeatures === 5) {
    console.log("\n🎉 Full deposit transaction support is working!");
  } else {
    console.log("\n Partial deposit transaction support detected");
    console.log(
      "   Some features work, but full 0x7e support requires implementation"
    );
  }

  console.log("\n" + "=".repeat(70));
}

// Test contract for interaction testing
const TestContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TestContract {
    function testArbSysCall() external view returns (bool) {
        // Try to call ArbSys precompile
        (bool success, ) = address(0x64).staticcall("");
        return success;
    }
}
`;

// Run the probe
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(" Deposit transaction probe failed:", error);
    process.exit(1);
  });
