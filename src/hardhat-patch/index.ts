/**
 * Hardhat Arbitrum Patch Plugin
 *
 * This plugin extends Hardhat Network with Arbitrum precompile support.
 * It registers precompile handlers and integrates them into the EVM.
 */

import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { extendEnvironment } from "hardhat/config";

import { HardhatArbitrumPatch, ArbitrumConfig } from "./arbitrum-patch";

/**
 * Extend the Hardhat environment with Arbitrum precompile support
 * Only execute if we're in a Hardhat context
 */
try {
  extendEnvironment((hre: HardhatRuntimeEnvironment) => {
    // Use default configuration if no arbitrum config is provided
    const defaultConfig = {
      enabled: true,
      chainId: 42161,
      arbOSVersion: 20,
      l1BaseFee: BigInt("20000000000"),
    };

    const config = (hre.config as any).arbitrum || defaultConfig;

    if (config.enabled !== false) {
      const arbitrumPatch = new HardhatArbitrumPatch(config);

      // Attach to the environment for access in tests and scripts
      (hre as any).arbitrum = arbitrumPatch;
      (hre as any).arbitrumPatch = arbitrumPatch;

      // Log successful initialization only in debug mode
      if (process.env.DEBUG) {
        console.log("Hardhat Arbitrum Patch initialized");
      }
    }
  });
} catch (error) {
  // Silently ignore if not in Hardhat context
  // This allows the module to be imported in non-Hardhat environments
}

// Export the main class and types for external use
export * from "./arbitrum-patch";
export * from "./precompiles/registry";
export * from "./precompiles/arbSys";
export * from "./precompiles/arbGasInfo";

// Export transaction type 0x7e support
export * from "./tx/tx7e-parser";
export * from "./tx/tx7e-processor";
export * from "./tx/tx7e-integration";
