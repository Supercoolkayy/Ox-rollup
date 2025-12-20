/**
 * Unit Tests for ArbSys Precompile Handler
 *
 * Tests the ArbSys precompile functionality including:
 * - arbChainID()
 * - arbBlockNumber()
 * - sendTxToL1()
 * - mapL1SenderContractAddressToL2Alias()
 */

import { expect } from "chai";
import { HardhatPrecompileRegistry } from "../../src/hardhat-patch/precompiles/registry";
import { ArbSysHandler } from "../../src/hardhat-patch/precompiles/arbSys";
import { HardhatArbitrumPatch } from "../../src/hardhat-patch/arbitrum-patch";

describe("ArbSys Precompile Handler", () => {
  let registry: HardhatPrecompileRegistry;
  let arbSysHandler: ArbSysHandler;
  let patch: HardhatArbitrumPatch;

  beforeEach(() => {
    registry = new HardhatPrecompileRegistry();

    arbSysHandler = new ArbSysHandler({
      chainId: 42161, // Arbitrum One
      arbOSVersion: 20,
      l1BaseFee: BigInt(20e9),
    });

    patch = new HardhatArbitrumPatch({
      chainId: 42161,
      arbOSVersion: 20,
    });

    registry.register(arbSysHandler);
  });

  describe("Basic ArbSys Methods", () => {
    it("should handle arbChainID() correctly", async () => {
      const calldata = new Uint8Array([0xd1, 0x27, 0xf5, 0x4a]); // arbChainID() selector
      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        arbSysHandler.address,
        calldata,
        context
      );

      expect(result.success).to.be.true;
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(32);

      // Decode the result to verify chain ID
      const decodedChainId = decodeUint256(result.data!);
      expect(Number(decodedChainId)).to.equal(42161);
    });

    it("should handle arbBlockNumber() correctly", async () => {
      const calldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // arbBlockNumber() selector
      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        arbSysHandler.address,
        calldata,
        context
      );

      expect(result.success).to.be.true;
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(32);

      // Decode the result to verify block number
      const decodedBlockNumber = decodeUint256(result.data!);
      expect(Number(decodedBlockNumber)).to.equal(12345);
    });

    it("should handle arbOSVersion() correctly", async () => {
      const calldata = new Uint8Array([0x05, 0x10, 0x38, 0xf2]); // arbOSVersion() selector
      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        arbSysHandler.address,
        calldata,
        context
      );

      expect(result.success).to.be.true;
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(32);

      // Decode the result to verify ArbOS version
      const decodedVersion = decodeUint256(result.data!);
      expect(Number(decodedVersion)).to.equal(20);
    });
  });

  describe("sendTxToL1 Functionality", () => {
    it("should handle sendTxToL1() correctly", async () => {
      // sendTxToL1(address,bytes) selector: 6e8c1d6f
      const selector = new Uint8Array([0x6e, 0x8c, 0x1d, 0x6f]);

      // Mock calldata: selector + offset(32) + length(32) + data
      const destAddress = "0x1234567890123456789012345678901234567890";
      const data = "0x12345678";

      // Encode calldata manually for testing
      // Structure: selector(4) + destAddress(32) + offset(32) + length(32) + data(4)
      const calldata = new Uint8Array(104); // 4 + 32 + 32 + 32 + 4
      calldata.set(selector, 0);

      // Set destination address (padded to 32 bytes) at offset 4
      const addressBytes = destAddress.slice(2); // Remove 0x
      for (let i = 0; i < 20; i++) {
        calldata[16 + i] = parseInt(addressBytes.slice(i * 2, i * 2 + 2), 16);
      }

      // Set offset to data (should be 100)
      const offsetView = new DataView(calldata.buffer, 36);
      offsetView.setBigUint64(24, BigInt(100), false);

      // Set data length
      const lengthView = new DataView(calldata.buffer, 68);
      lengthView.setBigUint64(24, BigInt(4), false);

      // Set data
      const dataBytes = data.slice(2); // Remove 0x
      for (let i = 0; i < 4; i++) {
        calldata[100 + i] = parseInt(dataBytes.slice(i * 2, i * 2 + 2), 16);
      }

      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        arbSysHandler.address,
        calldata,
        context
      );

      expect(result.success).to.be.true;
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(32);

      // Decode the result to verify message ID
      const decodedMessageId = decodeUint256(result.data!);
      expect(Number(decodedMessageId)).to.be.greaterThan(0);
    });

    it("should reject sendTxToL1 with invalid calldata length", async () => {
      const calldata = new Uint8Array([0x6e, 0x8c, 0x1d, 0x6f]); // Just selector
      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        arbSysHandler.address,
        calldata,
        context
      );

      expect(result.success).to.be.false;
      expect(result.error).to.include("Invalid calldata length for sendTxToL1");
    });
  });

  describe("Address Aliasing Functionality", () => {
    it("should handle mapL1SenderContractAddressToL2Alias() correctly", async () => {
      // mapL1SenderContractAddressToL2Alias(address) selector: a0c12269
      const selector = new Uint8Array([0xa0, 0xc1, 0x22, 0x69]);

      // Mock calldata: selector + address(32 bytes, padded)
      const l1Address = "0x1234567890123456789012345678901234567890";
      const calldata = new Uint8Array(36);
      calldata.set(selector, 0);

      // Set L1 address (padded to 32 bytes)
      const addressBytes = l1Address.slice(2); // Remove 0x
      for (let i = 0; i < 20; i++) {
        calldata[16 + i] = parseInt(addressBytes.slice(i * 2, i * 2 + 2), 16);
      }

      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        arbSysHandler.address,
        calldata,
        context
      );

      expect(result.success).to.be.true;
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(32);

      // Verify the aliasing logic
      const l1BigInt = BigInt(l1Address);
      const aliasingConstant = BigInt(
        "0x1111000000000000000000000000000000001111"
      );
      const expectedL2Alias = l1BigInt + aliasingConstant;

      const decodedL2Alias = decodeUint256(result.data!);
      expect(decodedL2Alias).to.equal(expectedL2Alias);
    });

    it("should reject mapL1SenderContractAddressToL2Alias with invalid calldata length", async () => {
      const calldata = new Uint8Array([0xa0, 0xc1, 0x22, 0x69]); // Just selector
      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        arbSysHandler.address,
        calldata,
        context
      );

      expect(result.success).to.be.false;
      expect(result.error).to.include(
        "Invalid calldata length for mapL1SenderContractAddressToL2Alias"
      );
    });
  });

  describe("Configuration and Customization", () => {
    it("should respect custom chain ID configuration", () => {
      const customHandler = new ArbSysHandler({
        chainId: 421613, // Arbitrum Goerli
        arbOSVersion: 21,
      });

      expect(customHandler.getConfig().chainId).to.equal(421613);
      expect(customHandler.getConfig().arbOSVersion).to.equal(21);
    });

    it("should use default configuration when not specified", () => {
      const defaultHandler = new ArbSysHandler();
      const config = defaultHandler.getConfig();

      expect(config.chainId).to.equal(42161); // Arbitrum One default
      expect(config.arbOSVersion).to.equal(20);
      expect(config.l1BaseFee).to.equal(BigInt(20e9));
    });
  });

  describe("Error Handling", () => {
    it("should handle unknown function selectors gracefully", async () => {
      const calldata = new Uint8Array([0xff, 0xff, 0xff, 0xff]); // Unknown selector
      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        arbSysHandler.address,
        calldata,
        context
      );

      expect(result.success).to.be.false;
      expect(result.error).to.include("Unknown function selector");
    });

    it("should handle invalid calldata gracefully", async () => {
      const calldata = new Uint8Array([0x12, 0x34]); // Too short
      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        arbSysHandler.address,
        calldata,
        context
      );

      expect(result.success).to.be.false;
      expect(result.error).to.include("Invalid calldata: too short");
    });
  });

  describe("Integration with HardhatArbitrumPatch", () => {
    it("should be properly registered in the patch", () => {
      const registry = patch.getRegistry() as HardhatPrecompileRegistry;
      const handlers = registry.list();

      expect(handlers).to.have.length(2);

      const arbSysHandler = handlers.find((h) => h.name === "ArbSys");
      expect(arbSysHandler).to.not.be.undefined;
      expect(arbSysHandler!.address).to.equal(
        "0x0000000000000000000000000000000000000064"
      );
    });

    it("should handle calls through the patch registry", async () => {
      const registry = patch.getRegistry() as HardhatPrecompileRegistry;

      const calldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // arbChainID()
      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        "0x0000000000000000000000000000000000000064",
        calldata,
        context
      );

      expect(result.success).to.be.true;
      expect(result.data).to.be.instanceOf(Uint8Array);
    });
  });
});

/**
 * Helper function to decode uint256 from 32-byte array
 */
function decodeUint256(data: Uint8Array): bigint {
  // Convert the 32-byte array to a BigInt (big-endian)
  let result = BigInt(0);
  for (let i = 0; i < data.length; i++) {
    result = result * BigInt(256) + BigInt(data[i]);
  }
  return result;
}
