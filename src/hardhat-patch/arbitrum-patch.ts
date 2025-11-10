/**
 * Hardhat Arbitrum Patch Core Class
 *
 * Pure core (no Hardhat side-effects). Builds a registry of precompile
 * handlers and holds config. Runtime/mode I/O (RPC, shim seeding, etc.)
 * is implemented in the plugin entry (index.ts).
 */


//src/hardhat-patch/arbitrum-patch.ts

import {
  HardhatPrecompileRegistry,
  PartialPrecompileConfig,
  createRegistry,
} from "./precompiles/registry";
import { ArbSysHandler } from "./precompiles/arbSys";
import { ArbGasInfoHandler } from "./precompiles/arbGasInfo";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

export type PrecompileMode = "native" | "shim" | "auto";
export type RuntimeFlavor = "stylus" | "nitro";

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

  // Stylus-first runtime selector (the plugin uses these)
  runtime?: RuntimeFlavor;                // default: "stylus"
  precompiles?: { mode?: PrecompileMode };// default: "auto"
  stylusRpc?: string;                     // used when runtime=stylus (native/auto)
  nitroRpc?: string;                      // optional (compatibility)

    // costing block (off by default; shim path keeps behavior unchanged)
  costing?: {
    enabled?: boolean;
    emulateNitro?: boolean; // reserved for native mode later
  };


  // Optional local seeding override (used by plugin in shim mode)
  gas?: { pricesInWei?: (string | number | bigint)[] };
  arbSysChainId?: any;                 // override for ArbSys shim
}

/**
 * Main class that manages Arbitrum precompile handlers and configuration
 */
export class HardhatArbitrumPatch {
  private registry: HardhatPrecompileRegistry;
  private config: Required<ArbitrumConfig>;

  constructor(config: ArbitrumConfig = {}) {
    // Complete defaults so Required<ArbitrumConfig> is safe
    this.config = {
      enabled: config.enabled ?? true,
      chainId: config.chainId ?? 42161,
      arbOSVersion: config.arbOSVersion ?? 20,
      l1BaseFee: config.l1BaseFee ?? BigInt(20e9),
      gasPriceComponents: {
        l2BaseFee: config.gasPriceComponents?.l2BaseFee ?? BigInt(1e9),
        l1CalldataCost:
          config.gasPriceComponents?.l1CalldataCost ?? BigInt(16),
        l1StorageCost: config.gasPriceComponents?.l1StorageCost ?? BigInt(0),
        congestionFee: config.gasPriceComponents?.congestionFee ?? BigInt(0),
      },

      // Stylus-first defaults. (The plugin actually uses these.)
      runtime: config.runtime ?? "stylus",
      precompiles: { mode: config.precompiles?.mode ?? "auto" },
      stylusRpc: config.stylusRpc ?? "",
      nitroRpc: config.nitroRpc ?? "",

      costing: {
        enabled: config.costing?.enabled ?? false,
        emulateNitro: config.costing?.emulateNitro ?? false,
      },

      gas: {
        pricesInWei: config.gas?.pricesInWei ?? undefined,
      },
      arbSysChainId: config.arbSysChainId ?? undefined,
    };

    // Build registry and register handlers
    this.registry = createRegistry();

    if (this.config.enabled) {
      this.initializeHandlers();
    }
  }


  /**
   * Initialize and register precompile handlers
   */
  private initializeHandlers(): void {
    const handlerConfig: PartialPrecompileConfig = {
      chainId: this.config.chainId,
      arbOSVersion: this.config.arbOSVersion,
      l1BaseFee: this.config.l1BaseFee,
      gasPriceComponents: this.config.gasPriceComponents,
    };

    // ArbSys & ArbGasInfo
    this.registry.register(new ArbSysHandler(handlerConfig));
    this.registry.register(new ArbGasInfoHandler(handlerConfig));
  }

  /** Get the current configuration */
  getConfig(): Required<ArbitrumConfig> {
    return { ...this.config };
  }

  /** Get the precompile registry instance */
  getRegistry(): HardhatPrecompileRegistry {
    return this.registry;
  }

  /** Check if a precompile address has a handler */
  hasHandler(address: string): boolean {
    return this.registry.hasHandler(address);
  }

  /** List all registered precompile handlers */
  listHandlers() {
    return this.registry.list();
  }

  /** Enable or disable the Arbitrum patch */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;

    if (!enabled) {
      this.registry = createRegistry();
    } else {
      this.initializeHandlers();
    }
  }

  /** Update the configuration and reinitialize handlers */
  updateConfig(newConfig: Partial<ArbitrumConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      gasPriceComponents: {
        ...this.config.gasPriceComponents,
        ...newConfig.gasPriceComponents,
      },
      precompiles: {
        ...this.config.precompiles,
        ...(newConfig.precompiles ?? {}),
      },
      costing: { 
        ...this.config.costing, 
        ...(newConfig.costing ?? {}) 
      }, 
      gas: {
        ...this.config.gas,
        ...(newConfig.gas ?? {}),
      },
    };

    if (this.config.enabled) {
      this.registry = createRegistry();
      this.initializeHandlers();
    }
  }

  /**  debug  */
  getConfigSummary(): string {
    const c = this.config;
    return `Hardhat Arbitrum Patch Configuration:
  Enabled: ${c.enabled}
  Runtime: ${c.runtime}
  Mode: ${c.precompiles.mode}
  Chain ID: ${c.chainId}
  ArbOS Version: ${c.arbOSVersion}
  L1 Base Fee: ${c.l1BaseFee} wei (${Number(c.l1BaseFee) / 1e9} gwei)
  L2 Base Fee: ${c.gasPriceComponents.l2BaseFee} wei (${Number(
      c.gasPriceComponents.l2BaseFee
    ) / 1e9} gwei)
  L1 Calldata Cost: ${c.gasPriceComponents.l1CalldataCost} gas/byte
  L1 Storage Cost: ${c.gasPriceComponents.l1StorageCost} gas
  Congestion Fee: ${c.gasPriceComponents.congestionFee} wei
  Registered Handlers: ${this.registry.list().length}`;
  }
}

/**
 * helper to attach the patch to HRE (kept for compatibility).
 * The plugin's index.ts calls this when appropriate.
 */
export function initArbitrumPatch(
  hre: HardhatRuntimeEnvironment,
  opts?: { enable?: boolean }
): void {
  const config = (hre.config as any).arbitrum || {};
  if (opts?.enable === false || config.enabled === false) return;

  const patch = new HardhatArbitrumPatch(config);
  (hre as any).arbitrumPatch = patch;
  (hre as any).arbitrum = (hre as any).arbitrum || patch;

  if (process.env.DEBUG) {
    console.log("[hardhat-arbitrum-patch] core initialized");
    // console.log(patch.getConfigSummary());
  }
}
