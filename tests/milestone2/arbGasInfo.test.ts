/**
 * Unit Tests for ArbGasInfo Precompile Handler
 *
 * Tests the ArbGasInfo precompile functionality including:
 * - getPricesInWei()
 * - getL1BaseFeeEstimate()
 * - getCurrentTxL1GasFees()
 * - getPricesInArbGas()
 * - Gas configuration loading
 * - Nitro baseline gas calculations
 */

import { expect } from "chai";
import { HardhatPrecompileRegistry } from "../../src/hardhat-patch/precompiles/registry";
import { ArbGasInfoHandler } from "../../src/hardhat-patch/precompiles/arbGasInfo";
import { HardhatArbitrumPatch } from "../../src/hardhat-patch/arbitrum-patch";

describe("ArbGasInfo Precompile Handler", () => {
  let registry: HardhatPrecompileRegistry;
  let arbGasInfoHandler: ArbGasInfoHandler;
  let patch: HardhatArbitrumPatch;

  beforeEach(() => {
    registry = new HardhatPrecompileRegistry();

    arbGasInfoHandler = new ArbGasInfoHandler({
      chainId: 42161, // Arbitrum One
      arbOSVersion: 20,
      l1BaseFee: BigInt(20e9),
    });

    patch = new HardhatArbitrumPatch({
      chainId: 42161,
      arbOSVersion: 20,
    });

    registry.register(arbGasInfoHandler);
  });

  describe("Basic ArbGasInfo Methods", () => {
    it("should handle getPricesInWei() correctly", async () => {
      const calldata = new Uint8Array([0x41, 0xb2, 0x47, 0xa8]); // getPricesInWei() selector
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
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(160); // 5 * 32 bytes

      // Decode the result to verify gas price components
      const decodedPrices = decodePricesInWei(result.data!);
      expect(decodedPrices.l2BaseFee).to.equal(1e9); // 1 gwei
      expect(decodedPrices.l1CalldataCost).to.equal(16); // 16 gas per byte
      expect(decodedPrices.l1StorageCost).to.equal(0); // No storage gas
      expect(decodedPrices.baseL2GasPrice).to.equal(1e9); // Same as L2 base fee
      expect(decodedPrices.congestionFee).to.equal(0); // No congestion fee
    });

    it("should handle getL1BaseFeeEstimate() correctly", async () => {
      const calldata = new Uint8Array([0xf5, 0xd6, 0xde, 0xd7]); // getL1BaseFeeEstimate() selector
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
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(32);

      // Decode the result to verify L1 base fee
      const decodedL1BaseFee = decodeUint256(result.data!);
      expect(decodedL1BaseFee).to.equal(20e9); // 20 gwei
    });

    it("should handle getCurrentTxL1GasFees() correctly", async () => {
      const calldata = new Uint8Array([0xc6, 0xf7, 0xde, 0x0e]); // getCurrentTxL1GasFees() selector
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
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(32);

      // Decode the result to verify L1 gas fees
      const decodedL1GasFees = decodeUint256(result.data!);
      // Expected: calldata length (4) * 16 gas per byte * 20 gwei L1 base fee
      const expectedFees = 4 * 16 * 20e9;
      expect(decodedL1GasFees).to.equal(expectedFees);
    });

    it("should handle getPricesInArbGas() correctly", async () => {
      const calldata = new Uint8Array([0x02, 0x19, 0x9f, 0x34]); // getPricesInArbGas() selector
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
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(96); // 3 * 32 bytes

      // Decode the result to verify ArbGas price components
      const decodedArbGasPrices = decodePricesInArbGas(result.data!);
      expect(decodedArbGasPrices.l2BaseFee).to.equal(1e9); // 1 gwei
      expect(decodedArbGasPrices.l1CalldataCost).to.equal(16); // 16 gas per byte
      expect(decodedArbGasPrices.l1StorageCost).to.equal(0); // No storage gas
    });
  });

  describe("Gas Calculation Accuracy", () => {
    it("should calculate L1 gas fees correctly for different calldata sizes", async () => {
      const handler = new ArbGasInfoHandler({
        l1BaseFee: BigInt(20e9), // 20 gwei
        gasPriceComponents: {
          l1CalldataCost: BigInt(16), // 16 gas per byte
        },
      });

      // Test with different calldata sizes
      const testCases = [
        { size: 0, expectedGas: 0 },
        { size: 1, expectedGas: 16 },
        { size: 10, expectedGas: 160 },
        { size: 100, expectedGas: 1600 },
        { size: 1000, expectedGas: 16000 },
      ];

      for (const testCase of testCases) {
        const calldata = new Uint8Array(testCase.size);
        const l1GasFees = handler["calculateL1GasFees"](calldata);
        const expectedFees = BigInt(testCase.expectedGas) * BigInt(20e9);
        expect(l1GasFees).to.equal(expectedFees);
      }
    });

    it("should handle large calldata sizes correctly", async () => {
      const handler = new ArbGasInfoHandler({
        l1BaseFee: BigInt(20e9),
        gasPriceComponents: {
          l1CalldataCost: BigInt(16),
        },
      });

      // Test with large calldata (simulating complex contract calls)
      const largeCalldata = new Uint8Array(10000); // 10KB
      const l1GasFees = handler["calculateL1GasFees"](largeCalldata);

      // Expected: 10000 * 16 * 20e9 = 3,200,000,000,000,000 wei
      const expectedFees = BigInt(10000) * BigInt(16) * BigInt(20e9);
      expect(l1GasFees).to.equal(expectedFees);
    });

    it("should respect custom gas price components", async () => {
      const customHandler = new ArbGasInfoHandler({
        l1BaseFee: BigInt(25e9), // 25 gwei
        gasPriceComponents: {
          l2BaseFee: BigInt(2e9), // 2 gwei
          l1CalldataCost: BigInt(20), // 20 gas per byte
          l1StorageCost: BigInt(0),
          congestionFee: BigInt(1e8), // 0.1 gwei
        },
      });

      const config = customHandler.getConfig();
      expect(config.l1BaseFee).to.equal(BigInt(25e9));
      expect(config.gasPriceComponents!.l2BaseFee).to.equal(BigInt(2e9));
      expect(config.gasPriceComponents!.l1CalldataCost).to.equal(BigInt(20));
      expect(config.gasPriceComponents!.congestionFee).to.equal(BigInt(1e8));
    });
  });

  describe("Configuration and Customization", () => {
    it("should initialize with default configuration", () => {
      const defaultHandler = new ArbGasInfoHandler();
      const config = defaultHandler.getConfig();

      expect(config.chainId).to.equal(42161); // Arbitrum One default
      expect(config.arbOSVersion).to.equal(20);
      expect(config.l1BaseFee).to.equal(BigInt(20e9)); // 20 gwei default
      expect(config.gasPriceComponents.l2BaseFee).to.equal(BigInt(1e9)); // 1 gwei default
      expect(config.gasPriceComponents.l1CalldataCost).to.equal(BigInt(16)); // 16 gas per byte
    });

    it("should handle custom chain ID configuration", () => {
      const customHandler = new ArbGasInfoHandler({
        chainId: 421613, // Arbitrum Goerli
        arbOSVersion: 21,
      });

      expect(customHandler.getConfig().chainId).to.equal(421613);
      expect(customHandler.getConfig().arbOSVersion).to.equal(21);
    });

    it("should provide human-readable gas configuration summary", () => {
      const handler = new ArbGasInfoHandler({
        l1BaseFee: BigInt(20e9),
        gasPriceComponents: {
          l2BaseFee: BigInt(1e9),
          l1CalldataCost: BigInt(16),
          l1StorageCost: BigInt(0),
          congestionFee: BigInt(0),
        },
      });

      const summary = handler.getGasConfigSummary();
      expect(summary).to.include("L1 Base Fee: 20000000000 wei (20 gwei)");
      expect(summary).to.include("L2 Base Fee: 1000000000 wei (1 gwei)");
      expect(summary).to.include("L1 Calldata Cost: 16 gas/byte");
      expect(summary).to.include("L1 Storage Cost: 0 gas");
      expect(summary).to.include("Congestion Fee: 0 wei");
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
        arbGasInfoHandler.address,
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
        arbGasInfoHandler.address,
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

      const arbGasInfoHandler = handlers.find((h) => h.name === "ArbGasInfo");
      expect(arbGasInfoHandler).to.not.be.undefined;
      expect(arbGasInfoHandler!.address).to.equal(
        "0x000000000000000000000000000000000000006c"
      );
    });

    it("should handle calls through the patch registry", async () => {
      const registry = patch.getRegistry() as HardhatPrecompileRegistry;

      const calldata = new Uint8Array([0x41, 0xb2, 0x47, 0xa8]); // getPricesInWei()
      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        "0x000000000000000000000000000000000000006c",
        calldata,
        context
      );

      expect(result.success).to.be.true;
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(160); // 5 * 32 bytes
    });
  });

  describe("Gas Model Implementation", () => {
    it("should implement Nitro baseline gas algorithm correctly", () => {
      const handler = new ArbGasInfoHandler({
        l1BaseFee: BigInt(20e9), // 20 gwei
        gasPriceComponents: {
          l1CalldataCost: BigInt(16), // 16 gas per byte
        },
      });

      // Test the private calculateL1GasFees method
      const testCalldata = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a]); // 5 bytes
      const l1GasFees = handler["calculateL1GasFees"](testCalldata);

      // Expected: 5 bytes * 16 gas per byte * 20 gwei = 1,600,000,000,000 wei
      const expectedFees = BigInt(5) * BigInt(16) * BigInt(20e9);
      expect(l1GasFees).to.equal(expectedFees);
    });

    it("should handle zero calldata correctly", () => {
      const handler = new ArbGasInfoHandler({
        l1BaseFee: BigInt(20e9),
        gasPriceComponents: {
          l1CalldataCost: BigInt(16),
        },
      });

      const emptyCalldata = new Uint8Array(0);
      const l1GasFees = handler["calculateL1GasFees"](emptyCalldata);
      expect(l1GasFees).to.equal(BigInt(0));
    });

    it("should handle single byte calldata correctly", () => {
      const handler = new ArbGasInfoHandler({
        l1BaseFee: BigInt(20e9),
        gasPriceComponents: {
          l1CalldataCost: BigInt(16),
        },
      });

      const singleByteCalldata = new Uint8Array([0x42]);
      const l1GasFees = handler["calculateL1GasFees"](singleByteCalldata);

      // Expected: 1 byte * 16 gas per byte * 20 gwei = 320,000,000,000 wei
      const expectedFees = BigInt(1) * BigInt(16) * BigInt(20e9);
      expect(l1GasFees).to.equal(expectedFees);
    });
  });
});

/**
 * Helper function to decode uint256 from 32-byte array
 */
function decodeUint256(data: Uint8Array): number {
  const view = new DataView(data.buffer, data.byteOffset);
  return Number(view.getBigUint64(24, false)); // Little-endian, last 8 bytes
}

/**
 * Helper function to decode getPricesInWei 5-tuple
 */
function decodePricesInWei(data: Uint8Array): {
  l2BaseFee: number;
  l1CalldataCost: number;
  l1StorageCost: number;
  baseL2GasPrice: number;
  congestionFee: number;
} {
  const view = new DataView(data.buffer, data.byteOffset);

  return {
    l2BaseFee: Number(view.getBigUint64(24, false)),
    l1CalldataCost: Number(view.getBigUint64(56, false)),
    l1StorageCost: Number(view.getBigUint64(88, false)),
    baseL2GasPrice: Number(view.getBigUint64(120, false)),
    congestionFee: Number(view.getBigUint64(152, false)),
  };
}

/**
 * Helper function to decode getPricesInArbGas 3-tuple
 */
function decodePricesInArbGas(data: Uint8Array): {
  l2BaseFee: number;
  l1CalldataCost: number;
  l1StorageCost: number;
} {
  const view = new DataView(data.buffer, data.byteOffset);

  return {
    l2BaseFee: Number(view.getBigUint64(24, false)),
    l1CalldataCost: Number(view.getBigUint64(56, false)),
    l1StorageCost: Number(view.getBigUint64(88, false)),
  };
}
