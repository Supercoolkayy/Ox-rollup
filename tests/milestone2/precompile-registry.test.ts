/**
 * Unit Tests for Precompile Registry
 *
 * Tests the precompile registry functionality, handler registration,
 * and call handling for Arbitrum precompiles.
 */

import { expect } from "chai";
import { HardhatPrecompileRegistry } from "../../src/hardhat-patch/precompiles/registry";
import { ArbSysHandler } from "../../src/hardhat-patch/precompiles/arbSys";
import { ArbGasInfoHandler } from "../../src/hardhat-patch/precompiles/arbGasInfo";
import { HardhatArbitrumPatch } from "../../src/hardhat-patch/arbitrum-patch";

describe("Precompile Registry", () => {
  let registry: HardhatPrecompileRegistry;
  let arbSysHandler: ArbSysHandler;
  let arbGasInfoHandler: ArbGasInfoHandler;

  beforeEach(() => {
    registry = new HardhatPrecompileRegistry();

    arbSysHandler = new ArbSysHandler({
      chainId: 42161,
      arbOSVersion: 20,
      l1BaseFee: BigInt(20e9),
    });

    arbGasInfoHandler = new ArbGasInfoHandler({
      chainId: 42161,
      arbOSVersion: 20,
      l1BaseFee: BigInt(20e9),
    });
  });

  describe("Handler Registration", () => {
    it("should register handlers successfully", () => {
      registry.register(arbSysHandler);
      registry.register(arbGasInfoHandler);

      expect(registry.hasHandler(arbSysHandler.address)).to.be.true;
      expect(registry.hasHandler(arbGasInfoHandler.address)).to.be.true;
      expect(registry.listHandlers()).to.have.length(2);
    });

    it("should prevent duplicate registration", () => {
      registry.register(arbSysHandler);

      expect(() => {
        registry.register(arbSysHandler);
      }).to.throw(
        `Handler already registered for address ${arbSysHandler.address}`
      );
    });

    it("should retrieve handlers by address", () => {
      registry.register(arbSysHandler);

      const retrieved = registry.getHandler(arbSysHandler.address);
      expect(retrieved).to.equal(arbSysHandler);
    });

    it("should return null for non-existent handlers", () => {
      const handler = registry.getHandler(
        "0x1234567890123456789012345678901234567890"
      );
      expect(handler).to.be.null;
    });
  });

  describe("Handler Functionality", () => {
    beforeEach(() => {
      registry.register(arbSysHandler);
      registry.register(arbGasInfoHandler);
    });

    it("should handle ArbSys arbChainID() call", async () => {
      const calldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // arbChainID() selector
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
      expect(result.gasUsed).to.equal(3);
      expect(result.data).to.be.instanceOf(Uint8Array);
    });

    it("should handle ArbSys arbBlockNumber() call", async () => {
      const calldata = new Uint8Array([0x05, 0x10, 0x38, 0xf2]); // arbBlockNumber() selector
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
      expect(result.gasUsed).to.equal(3);
      expect(result.data).to.be.instanceOf(Uint8Array);
    });

    it("should handle ArbGasInfo getPricesInWei() call", async () => {
      const calldata = new Uint8Array([0x4d, 0x23, 0x01, 0xcc]); // getPricesInWei() selector
      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        arbGasInfoHandler.address,
        calldata,
        context
      );

      expect(result.success).to.be.true;
      expect(result.gasUsed).to.equal(10);
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(160); // 5 * 32 bytes
    });

    it("should handle ArbGasInfo getL1BaseFeeEstimate() call", async () => {
      const calldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // getL1BaseFeeEstimate() selector
      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        arbGasInfoHandler.address,
        calldata,
        context
      );

      expect(result.success).to.be.true;
      expect(result.gasUsed).to.equal(5);
      expect(result.data).to.be.instanceOf(Uint8Array);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      registry.register(arbSysHandler);
    });

    it("should reject calls to non-existent precompiles gracefully", async () => {
      const nonExistentAddress = "0x1234567890123456789012345678901234567890";
      const calldata = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        nonExistentAddress,
        calldata,
        context
      );

      expect(result.success).to.be.false;
      expect(result.gasUsed).to.equal(0);
      expect(result.error).to.include("No handler registered for address");
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
      expect(result.gasUsed).to.equal(0);
      expect(result.error).to.include("Invalid calldata: too short");
    });

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
      expect(result.gasUsed).to.equal(0);
      expect(result.error).to.include("Unknown function selector");
    });
  });

  describe("HardhatArbitrumPatch Integration", () => {
    it("should initialize with default configuration", () => {
      const patch = new HardhatArbitrumPatch();
      const config = patch.getConfig();

      expect(config.chainId).to.equal(42161);
      expect(config.arbOSVersion).to.equal(20);
      expect(config.enabled).to.be.true;
    });

    it("should initialize with custom configuration", () => {
      const customConfig = {
        chainId: 421613, // Arbitrum Goerli
        arbOSVersion: 21,
        l1BaseFee: BigInt(15e9), // 15 gwei
      };

      const patch = new HardhatArbitrumPatch(customConfig);
      const config = patch.getConfig();

      expect(config.chainId).to.equal(421613);
      expect(config.arbOSVersion).to.equal(21);
      expect(config.l1BaseFee).to.equal(BigInt(15e9));
    });

    it("should register handlers on initialization", () => {
      const patch = new HardhatArbitrumPatch();

      expect(patch.hasHandler("0x0000000000000000000000000000000000000064")).to
        .be.true; // ArbSys
      expect(patch.hasHandler("0x000000000000000000000000000000000000006c")).to
        .be.true; // ArbGasInfo

      const handlers = patch.listHandlers();
      expect(handlers).to.have.length(2);
      expect(handlers.map((h) => h.name)).to.include("ArbSys");
      expect(handlers.map((h) => h.name)).to.include("ArbGasInfo");
    });

    it("should be disabled when configured", () => {
      const patch = new HardhatArbitrumPatch({ enabled: false });

      expect(patch.hasHandler("0x0000000000000000000000000000000000000064")).to
        .be.false;
      expect(patch.listHandlers()).to.have.length(0);
    });
  });

  describe("Configuration Validation", () => {
    it("should handle BigInt configuration values", () => {
      const config = {
        l1BaseFee: BigInt(25e9), // 25 gwei
        gasPriceComponents: {
          l2BaseFee: BigInt(2e9), // 2 gwei
          l1CalldataCost: BigInt(20), // 20 gas per byte
          l1StorageCost: BigInt(0),
          congestionFee: BigInt(1e8), // 0.1 gwei
        },
      };

      const patch = new HardhatArbitrumPatch(config);
      const retrievedConfig = patch.getConfig();

      expect(retrievedConfig.l1BaseFee).to.equal(BigInt(25e9));
      expect(retrievedConfig.gasPriceComponents!.l2BaseFee).to.equal(
        BigInt(2e9)
      );
      expect(retrievedConfig.gasPriceComponents!.l1CalldataCost).to.equal(
        BigInt(20)
      );
      expect(retrievedConfig.gasPriceComponents!.congestionFee).to.equal(
        BigInt(1e8)
      );
    });
  });
});
