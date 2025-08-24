"use strict";
/**
 * Hardhat Arbitrum Patch Plugin
 *
 * This plugin extends Hardhat Network with Arbitrum precompile support.
 * It registers precompile handlers and integrates them into the EVM.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardhatArbitrumPatch = void 0;
exports.initArbitrumPatch = initArbitrumPatch;
const plugins_1 = require("hardhat/plugins");
const config_1 = require("hardhat/config");
const registry_1 = require("./precompiles/registry");
const arbSys_1 = require("./precompiles/arbSys");
const arbGasInfo_1 = require("./precompiles/arbGasInfo");
class HardhatArbitrumPatch {
    constructor(config = {}) {
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
        this.registry = new registry_1.HardhatPrecompileRegistry();
        this.initializeHandlers();
    }
    initializeHandlers() {
        if (!this.config.enabled) {
            return;
        }
        try {
            // Register ArbSys handler (0x64)
            const arbSysHandler = new arbSys_1.ArbSysHandler({
                chainId: this.config.chainId,
                arbOSVersion: this.config.arbOSVersion,
                l1BaseFee: this.config.l1BaseFee,
                gasPriceComponents: this.config.gasPriceComponents,
            });
            this.registry.register(arbSysHandler);
            // Register ArbGasInfo handler (0x6C)
            const arbGasInfoHandler = new arbGasInfo_1.ArbGasInfoHandler({
                chainId: this.config.chainId,
                arbOSVersion: this.config.arbOSVersion,
                l1BaseFee: this.config.l1BaseFee,
                gasPriceComponents: this.config.gasPriceComponents,
            });
            this.registry.register(arbGasInfoHandler);
            console.log("✅ Arbitrum precompile handlers registered successfully");
            console.log(`   ArbSys: ${arbSysHandler.address}`);
            console.log(`   ArbGasInfo: ${arbGasInfoHandler.address}`);
        }
        catch (error) {
            throw new plugins_1.HardhatPluginError("hardhat-arbitrum-patch", `Failed to initialize precompile handlers: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get the precompile registry instance
     */
    getRegistry() {
        return this.registry;
    }
    /**
     * Check if a precompile address has a handler
     */
    hasHandler(address) {
        return this.registry.hasHandler(address);
    }
    /**
     * Get a precompile handler by address
     */
    getHandler(address) {
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
    async handleCall(address, calldata, context) {
        return await this.registry.handleCall(address, calldata, context);
    }
    /**
     * Get the current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.HardhatArbitrumPatch = HardhatArbitrumPatch;
/**
 * Initialize the Arbitrum patch with the Hardhat runtime environment
 */
function initArbitrumPatch(hre, opts) {
    const config = hre.config.arbitrum || {};
    if (opts?.enable !== false && config.enabled !== false) {
        const arbitrumPatch = new HardhatArbitrumPatch(config);
        // Attach to the environment for access in tasks and scripts
        hre.arbitrumPatch = arbitrumPatch;
        console.log("🚀 Hardhat Arbitrum Patch initialized");
    }
}
/**
 * Extend the Hardhat environment with Arbitrum precompile support
 */
(0, config_1.extendEnvironment)((hre) => {
    const config = hre.config.arbitrum || {};
    if (config.enabled !== false) {
        const arbitrumPatch = new HardhatArbitrumPatch(config);
        // Attach to the environment for access in tasks and scripts
        hre.arbitrum = arbitrumPatch;
        // Log successful initialization
        console.log("🚀 Hardhat Arbitrum Patch initialized");
    }
});
// Export the main class and types for external use
__exportStar(require("./precompiles/registry"), exports);
__exportStar(require("./precompiles/arbSys"), exports);
__exportStar(require("./precompiles/arbGasInfo"), exports);
