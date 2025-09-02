/**
 * Hardhat Arbitrum Patch Core Class
 *
 * This file contains the core HardhatArbitrumPatch class without
 * the Hardhat environment extensions, allowing it to be used
 * in testing environments without Hardhat context.
 */

import {
  HardhatPrecompileRegistry,
  PartialPrecompileConfig,
  createRegistry,
} from "./precompiles/registry";
import { ArbSysHandler } from "./precompiles/arbSys";
import { ArbGasInfoHandler } from "./precompiles/arbGasInfo";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export interface ArbitrumConfig {
  enabled?: boolean;
  chainId?: number;
  arbOSVersion?: number;
  l1BaseFee?: bigint;
  gasPriceComponents?: {
    l2BaseFee?: bigint;
    l1CalldataCost?: bigint;
    l1StorageCost?: bigint;
    congestionFee?: bigint;
  };
}

/**
 * Main class that manages Arbitrum precompile handlers and configuration
 */
export class HardhatArbitrumPatch {
  private registry: HardhatPrecompileRegistry;
  private config: Required<ArbitrumConfig>;

  constructor(config: ArbitrumConfig = {}) {
    // Set default configuration
    this.config = {
      enabled: config.enabled ?? true,
      chainId: config.chainId ?? 42161,
      arbOSVersion: config.arbOSVersion ?? 20,
      l1BaseFee: config.l1BaseFee ?? BigInt(20e9),
      gasPriceComponents: {
        l2BaseFee: config.gasPriceComponents?.l2BaseFee ?? BigInt(1e9),
        l1CalldataCost: config.gasPriceComponents?.l1CalldataCost ?? BigInt(16),
        l1StorageCost: config.gasPriceComponents?.l1StorageCost ?? BigInt(0),
        congestionFee: config.gasPriceComponents?.congestionFee ?? BigInt(0),
      },
    };

    // Create registry and register handlers
    this.registry = createRegistry();

    if (this.config.enabled) {
      this.initializeHandlers();
    }
  }

  /**
   * Initialize and register precompile handlers
   */
  private initializeHandlers(): void {
    // Convert config to partial format for handlers
    const handlerConfig: PartialPrecompileConfig = {
      chainId: this.config.chainId,
      arbOSVersion: this.config.arbOSVersion,
      l1BaseFee: this.config.l1BaseFee,
      gasPriceComponents: this.config.gasPriceComponents,
    };

    // Register ArbSys precompile handler
    const arbSysHandler = new ArbSysHandler(handlerConfig);
    this.registry.register(arbSysHandler);

    // Register ArbGasInfo precompile handler
    const arbGasInfoHandler = new ArbGasInfoHandler(handlerConfig);
    this.registry.register(arbGasInfoHandler);
  }

  /**
   * Get the current configuration
   */
  getConfig(): Required<ArbitrumConfig> {
    return { ...this.config };
  }

  /**
   * Get the precompile registry instance
   */
  getRegistry(): HardhatPrecompileRegistry {
    return this.registry;
  }

  /**
   * Check if a precompile address has a handler
   */
  hasHandler(address: string): boolean {
    return this.registry.hasHandler(address);
  }

  /**
   * List all registered precompile handlers
   */
  listHandlers() {
    return this.registry.list();
  }

  /**
   * Enable or disable the Arbitrum patch
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;

    if (!enabled) {
      // Clear all handlers when disabled
      this.registry = createRegistry();
    } else {
      // Re-initialize handlers when enabled
      this.initializeHandlers();
    }
  }

  /**
   * Update the configuration and reinitialize handlers
   */
  updateConfig(newConfig: Partial<ArbitrumConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      gasPriceComponents: {
        ...this.config.gasPriceComponents,
        ...newConfig.gasPriceComponents,
      },
    };

    if (this.config.enabled) {
      // Recreate registry with new config
      this.registry = createRegistry();
      this.initializeHandlers();
    }
  }

  /**
   * Get a summary of the current configuration
   */
  getConfigSummary(): string {
    const config = this.config;
    return `Hardhat Arbitrum Patch Configuration:
  Enabled: ${config.enabled}
  Chain ID: ${config.chainId}
  ArbOS Version: ${config.arbOSVersion}
  L1 Base Fee: ${config.l1BaseFee} wei (${Number(config.l1BaseFee) / 1e9} gwei)
  L2 Base Fee: ${config.gasPriceComponents.l2BaseFee} wei (${
      Number(config.gasPriceComponents.l2BaseFee) / 1e9
    } gwei)
  L1 Calldata Cost: ${config.gasPriceComponents.l1CalldataCost} gas/byte
  L1 Storage Cost: ${config.gasPriceComponents.l1StorageCost} gas
  Congestion Fee: ${config.gasPriceComponents.congestionFee} wei
  Registered Handlers: ${this.registry.list().length}`;
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

    console.log("✅ Hardhat Arbitrum Patch initialized");
  }
}
