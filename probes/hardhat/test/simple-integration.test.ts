/**
 * Simple Hardhat Integration Test
 * Validates that our Arbitrum patch is loaded and working
 */

import { expect } from "chai";

describe("Simple Hardhat Arbitrum Integration", function () {
  it("should have Arbitrum patch loaded in HRE", async function () {
    // Get the Hardhat runtime environment
    const hre = require("hardhat");

    // Check if our patch is available
    const arbitrumPatch = (hre as any).arbitrumPatch;

    // Verify the patch is initialized
    expect(arbitrumPatch).to.not.be.undefined;
    expect(arbitrumPatch).to.have.property("getRegistry");

    // Test registry functionality
    const registry = arbitrumPatch.getRegistry();
    const handlers = registry.list();

    expect(handlers).to.have.length(2);

    const arbSysHandler = handlers.find((h: any) => h.name === "ArbSys");
    const arbGasInfoHandler = handlers.find(
      (h: any) => h.name === "ArbGasInfo"
    );

    expect(arbSysHandler).to.not.be.undefined;
    expect(arbGasInfoHandler).to.not.be.undefined;
    expect(arbSysHandler!.address).to.equal(
      "0x0000000000000000000000000000000000000064"
    );
    expect(arbGasInfoHandler!.address).to.equal(
      "0x000000000000000000000000000000000000006c"
    );
  });

  it("should handle ArbSys arbChainID call", async function () {
    const hre = require("hardhat");
    const arbitrumPatch = (hre as any).arbitrumPatch;
    const registry = arbitrumPatch.getRegistry();

    // arbChainID() function selector: 0xa3b1b31d
    const arbSysCalldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]);
    const context = {
      blockNumber: 12345,
      chainId: 42161,
      gasPrice: BigInt(1e9),
      caller: "0x1234567890123456789012345678901234567890",
      callStack: [],
    };

    const result = await registry.handleCall(
      "0x0000000000000000000000000000000000000064", // ArbSys address
      arbSysCalldata,
      context
    );

    expect(result.success).to.be.true;
    expect(result.data).to.be.instanceOf(Uint8Array);
    expect(result.data!.length).to.equal(32);

    // Decode the chain ID
    const chainId = new DataView(result.data!.buffer).getBigUint64(24, false);
    expect(Number(chainId)).to.equal(42161);
  });

  it("should handle ArbGasInfo getL1BaseFeeEstimate call", async function () {
    const hre = require("hardhat");
    const arbitrumPatch = (hre as any).arbitrumPatch;
    const registry = arbitrumPatch.getRegistry();

    // getL1BaseFeeEstimate() function selector: 0x4d2301cc
    const arbGasInfoCalldata = new Uint8Array([0x4d, 0x23, 0x01, 0xcc]);
    const context = {
      blockNumber: 12345,
      chainId: 42161,
      gasPrice: BigInt(1e9),
      caller: "0x1234567890123456789012345678901234567890",
      callStack: [],
    };

    const result = await registry.handleCall(
      "0x000000000000000000000000000000000000006c", // ArbGasInfo address
      arbGasInfoCalldata,
      context
    );

    expect(result.success).to.be.true;
    expect(result.data).to.be.instanceOf(Uint8Array);
    expect(result.data!.length).to.equal(32);

    // Decode the L1 base fee
    const l1BaseFee = new DataView(result.data!.buffer).getBigUint64(24, false);
    expect(Number(l1BaseFee)).to.equal(20e9); // 20 gwei as configured
  });
});
