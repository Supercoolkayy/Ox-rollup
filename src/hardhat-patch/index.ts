/**
 * Hardhat Arbitrum Patch Plugin
 *
 * This plugin extends Hardhat Network with Arbitrum precompile support.
 * It registers precompile handlers and integrates them into the EVM.
 */

import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { extendEnvironment } from "hardhat/config";

import {
  HardhatPrecompileRegistry,
  PartialPrecompileConfig,
  createRegistry,
  PrecompileRegistry,
} from "./precompiles/registry";
import { ArbSysHandler } from "./precompiles/arbSys";
import { ArbGasInfoHandler } from "./precompiles/arbGasInfo";

export interface ArbitrumConfig {
  chainId?: number;
  arbOSVersion?: number;
  l1BaseFee?: bigint;
  gasPriceComponents?: {
    l2BaseFee?: bigint;
    l1CalldataCost?: bigint;
    l1StorageCost?: bigint;
    congestionFee?: bigint;
  };
  enabled?: boolean;
}

export class HardhatArbitrumPatch {
  private registry: HardhatPrecompileRegistry;
  private config: ArbitrumConfig;

  constructor(config: ArbitrumConfig = {}) {
    this.config = {
      enabled: true,
      chainId: 42161, // Arbitrum One default
      arbOSVersion: 20,
      l1BaseFee: BigInt(20e9), // 20 gwei default
      gasPriceComponents: {
        l2BaseFee: BigInt(1e9), // 1 gwei default
        l1CalldataCost: BigInt(16), // 16 gas per byte
        l1StorageCost: BigInt(0), // No storage gas in Nitro
        congestionFee: BigInt(0), // No congestion fee by default
      },
      ...config,
    };

    this.registry = new HardhatPrecompileRegistry();
    this.initializeHandlers();
  }

  private initializeHandlers(): void {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Register ArbSys handler (0x64)
      const arbSysHandler = new ArbSysHandler({
        chainId: this.config.chainId,
        arbOSVersion: this.config.arbOSVersion,
        l1BaseFee: this.config.l1BaseFee,
        gasPriceComponents: this.config.gasPriceComponents,
      });
      this.registry.register(arbSysHandler);

      // Register ArbGasInfo handler (0x6C)
      const arbGasInfoHandler = new ArbGasInfoHandler({
        chainId: this.config.chainId,
        arbOSVersion: this.config.arbOSVersion,
        l1BaseFee: this.config.l1BaseFee,
        gasPriceComponents: this.config.gasPriceComponents,
      });
      this.registry.register(arbGasInfoHandler);

      console.log("Arbitrum precompile handlers registered successfully");
      console.log(`   ArbSys: ${arbSysHandler.address}`);
      console.log(`   ArbGasInfo: ${arbGasInfoHandler.address}`);
    } catch (error) {
      throw new HardhatPluginError(
        "hardhat-arbitrum-patch",
        `Failed to initialize precompile handlers: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get the precompile registry instance
   */
  getRegistry(): PrecompileRegistry {
    return this.registry;
  }

  /**
   * Check if a precompile address has a handler
   */
  hasHandler(address: string): boolean {
    return this.registry.hasHandler(address);
  }

  /**
   * Get a precompile handler by address
   */
  getHandler(address: string) {
    return this.registry.getHandler(address);
  }

  /**
   * List all registered precompile handlers
   */
  listHandlers() {
    return this.registry.listHandlers();
  }

  /**
   * Handle a precompile call
   */
  async handleCall(address: string, calldata: Uint8Array, context: any) {
    return await this.registry.handleCall(address, calldata, context);
  }

  /**
   * Get the current configuration
   */
  getConfig(): ArbitrumConfig {
    return { ...this.config };
  }
}

/**
 * Initialize the Arbitrum patch with the Hardhat runtime environment
 */
export function initArbitrumPatch(
  hre: HardhatRuntimeEnvironment,
  opts?: { enable?: boolean }
): void {
  const config = (hre.config as any).arbitrum || {};

  if (opts?.enable !== false && config.enabled !== false) {
    const arbitrumPatch = new HardhatArbitrumPatch(config);

    // Attach to the environment for access in tasks and scripts
    (hre as any).arbitrumPatch = arbitrumPatch;

    console.log(" Hardhat Arbitrum Patch initialized");
  }
}

/**
 * Extend the Hardhat environment with Arbitrum precompile support
 */
extendEnvironment((hre: HardhatRuntimeEnvironment) => {
  const config = (hre.config as any).arbitrum || {};

  if (config.enabled !== false) {
    const arbitrumPatch = new HardhatArbitrumPatch(config);

    // Attach to the environment for access in tasks and scripts
    (hre as any).arbitrum = arbitrumPatch;

    // Log successful initialization
    console.log(" Hardhat Arbitrum Patch initialized");
  }
});

// Export the main class and types for external use
export * from "./precompiles/registry";
export * from "./precompiles/arbSys";
export * from "./precompiles/arbGasInfo";

// Export transaction type 0x7e support
export * from "./tx/tx7e-parser";
export * from "./tx/tx7e-processor";
export * from "./tx/tx7e-integration";
