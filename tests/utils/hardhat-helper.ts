/**
 * Hardhat Test Helper
 *
 * This module provides utilities to run tests in a Hardhat context
 * without requiring the full Hardhat plugin infrastructure.
 */

// Import individual classes to avoid the plugin environment extension
import { HardhatArbitrumPatch } from "../../src/hardhat-patch/arbitrum-patch";
import { HardhatPrecompileRegistry } from "../../src/hardhat-patch/precompiles/registry";
import { ArbSysHandler } from "../../src/hardhat-patch/precompiles/arbSys";
import { ArbGasInfoHandler } from "../../src/hardhat-patch/precompiles/arbGasInfo";

/**
 * Mock Hardhat Runtime Environment for testing
 */
export interface MockHRE {
  config: {
    networks: {
      hardhat: {
        chainId: number;
      };
    };
  };
  network: {
    name: string;
    config: {
      chainId: number;
    };
  };
  arbitrum?: HardhatArbitrumPatch;
  arbitrumPatch?: HardhatArbitrumPatch;
}

/**
 * Create a mock Hardhat Runtime Environment with Arbitrum support
 */
export function createMockHRE(): MockHRE {
  const mockHRE: MockHRE = {
    config: {
      networks: {
        hardhat: {
          chainId: 42161,
        },
      },
    },
    network: {
      name: "hardhat",
      config: {
        chainId: 42161,
      },
    },
  };

  // Initialize the Arbitrum patch
  const arbitrumPatch = new HardhatArbitrumPatch({
    enabled: true,
    chainId: 42161,
    arbOSVersion: 20,
    l1BaseFee: BigInt("20000000000"),
  });

  // Attach to mock HRE
  mockHRE.arbitrum = arbitrumPatch;
  mockHRE.arbitrumPatch = arbitrumPatch;

  return mockHRE;
}

/**
 * Initialize Arbitrum patch for testing without Hardhat context
 */
export function initializeArbitrumForTesting(): HardhatArbitrumPatch {
  return new HardhatArbitrumPatch({
    enabled: true,
    chainId: 42161,
    arbOSVersion: 20,
    l1BaseFee: BigInt("20000000000"),
    gasPriceComponents: {
      l2BaseFee: BigInt(1e9), // 1 gwei
      l1CalldataCost: BigInt(16), // 16 gas per byte
      l1StorageCost: BigInt(0),
      congestionFee: BigInt(0),
    },
  });
}

/**
 * Test context that provides both mock HRE and direct patch access
 */
export interface TestContext {
  hre: MockHRE;
  arbitrumPatch: HardhatArbitrumPatch;
}

/**
 * Setup test context for Arbitrum tests
 */
export function setupTestContext(): TestContext {
  const hre = createMockHRE();
  const arbitrumPatch = hre.arbitrumPatch!;

  return {
    hre,
    arbitrumPatch,
  };
}

/**
 * Mock provider that simulates ethers.js provider for testing
 */
export class MockProvider {
  private chainId: number;

  constructor(chainId: number = 42161) {
    this.chainId = chainId;
  }

  async getNetwork() {
    return {
      chainId: this.chainId,
      name: "arbitrum",
    };
  }

  async getGasPrice() {
    return BigInt(1e9); // 1 gwei
  }

  async getBalance(address: string) {
    return BigInt(1000000000000000000); // 1 ETH
  }

  async getTransactionCount(address: string) {
    return 0;
  }

  async call(tx: any) {
    // Mock successful call
    return "0x";
  }

  async estimateGas(tx: any) {
    return BigInt(21000);
  }

  async sendTransaction(tx: any) {
    return {
      hash: "0x" + "0".repeat(64),
      wait: async () => ({ status: 1, type: 0x7e }),
    };
  }
}

/**
 * Create a test wallet for use in tests
 */
export function createTestWallet() {
  // Return a mock wallet with common properties needed for testing
  return {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  };
}

/**
 * Utility to convert BigInt values to ethers-compatible format
 */
export function formatForEthers(value: bigint): string {
  return "0x" + value.toString(16);
}

/**
 * Utility to parse ethers-compatible values to BigInt
 */
export function parseFromEthers(value: string): bigint {
  return BigInt(value);
}
