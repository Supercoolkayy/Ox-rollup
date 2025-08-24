"use strict";
/**
 * ArbSys Precompile Handler (0x64)
 *
 * Implements the ArbSys precompile interface for local development.
 * This is a stub implementation that provides basic functionality.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArbSysHandler = void 0;
class ArbSysHandler {
    constructor(config) {
        this.address = "0x0000000000000000000000000000000000000064";
        this.name = "ArbSys";
        this.tags = ["arbitrum", "precompile"];
        const defaultGasComponents = {
            l2BaseFee: BigInt(1e9), // 1 gwei default
            l1CalldataCost: BigInt(16), // 16 gas per byte
            l1StorageCost: BigInt(0), // No storage gas in Nitro
            congestionFee: BigInt(0), // No congestion fee by default
        };
        this.config = {
            chainId: config?.chainId ?? 42161, // Arbitrum One default
            arbOSVersion: config?.arbOSVersion ?? 20,
            l1BaseFee: config?.l1BaseFee ?? BigInt(20e9), // 20 gwei default
            gasPriceComponents: {
                l2BaseFee: config?.gasPriceComponents?.l2BaseFee ??
                    defaultGasComponents.l2BaseFee,
                l1CalldataCost: config?.gasPriceComponents?.l1CalldataCost ??
                    defaultGasComponents.l1CalldataCost,
                l1StorageCost: config?.gasPriceComponents?.l1StorageCost ??
                    defaultGasComponents.l1StorageCost,
                congestionFee: config?.gasPriceComponents?.congestionFee ??
                    defaultGasComponents.congestionFee,
            },
        };
    }
    async handleCall(calldata, ctx) {
        if (calldata.length < 4) {
            throw new Error("Invalid calldata: too short");
        }
        // Extract function selector (first 4 bytes)
        const selector = calldata.slice(0, 4);
        const selectorHex = Array.from(selector)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        try {
            switch (selectorHex) {
                case "a3b1b31d": // arbChainID()
                    return this.handleArbChainID(ctx);
                case "051038f2": // arbBlockNumber()
                    return this.handleArbBlockNumber(ctx);
                case "4d2301cc": // arbBlockHash(uint256)
                    return this.handleArbBlockHash(calldata, ctx);
                case "4d2301cc": // arbOSVersion()
                    return this.handleArbOSVersion(ctx);
                default:
                    throw new Error(`Unknown function selector: 0x${selectorHex}`);
            }
        }
        catch (error) {
            throw new Error(`Handler execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Legacy method for backward compatibility
    async handleCallLegacy(calldata, context) {
        if (calldata.length < 4) {
            return {
                success: false,
                gasUsed: 0,
                error: "Invalid calldata: too short",
            };
        }
        // Extract function selector (first 4 bytes)
        const selector = calldata.slice(0, 4);
        const selectorHex = Array.from(selector)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        try {
            switch (selectorHex) {
                case "a3b1b31d": // arbChainID()
                    return this.handleArbChainIDLegacy(context);
                case "051038f2": // arbBlockNumber()
                    return this.handleArbBlockNumberLegacy(context);
                case "4d2301cc": // arbBlockHash(uint256)
                    return this.handleArbBlockHashLegacy(calldata, context);
                case "4d2301cc": // arbOSVersion()
                    return this.handleArbOSVersionLegacy(context);
                default:
                    return {
                        success: false,
                        gasUsed: 0,
                        error: `Unknown function selector: 0x${selectorHex}`,
                    };
            }
        }
        catch (error) {
            return {
                success: false,
                gasUsed: 0,
                error: `Handler execution failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
    getConfig() {
        return { ...this.config };
    }
    handleArbChainID(ctx) {
        return this.encodeUint256(Number(ctx.chainId));
    }
    handleArbBlockNumber(ctx) {
        return this.encodeUint256(Number(ctx.blockNumber));
    }
    handleArbBlockHash(calldata, ctx) {
        if (calldata.length < 36) {
            // 4 bytes selector + 32 bytes uint256
            throw new Error("Invalid calldata length for arbBlockHash");
        }
        // For now, return a mock block hash
        // In a real implementation, this would query the block history
        const mockHash = new Uint8Array(32);
        mockHash.fill(0x42); // Fill with a recognizable pattern
        return mockHash;
    }
    handleArbOSVersion(ctx) {
        return this.encodeUint256(this.config.arbOSVersion);
    }
    // Legacy handlers for backward compatibility
    handleArbChainIDLegacy(context) {
        return {
            success: true,
            data: this.encodeUint256(this.config.chainId),
            gasUsed: 3,
        };
    }
    handleArbBlockNumberLegacy(context) {
        return {
            success: true,
            data: this.encodeUint256(context.blockNumber),
            gasUsed: 3,
        };
    }
    handleArbBlockHashLegacy(calldata, context) {
        if (calldata.length < 36) {
            // 4 bytes selector + 32 bytes uint256
            return {
                success: false,
                gasUsed: 0,
                error: "Invalid calldata length for arbBlockHash",
            };
        }
        // For now, return a mock block hash
        // In a real implementation, this would query the block history
        const mockHash = new Uint8Array(32);
        mockHash.fill(0x42); // Fill with a recognizable pattern
        return {
            success: true,
            data: mockHash,
            gasUsed: 10,
        };
    }
    handleArbOSVersionLegacy(context) {
        return {
            success: true,
            data: this.encodeUint256(this.config.arbOSVersion),
            gasUsed: 3,
        };
    }
    /**
     * Encode a uint256 value as a 32-byte array
     */
    encodeUint256(value) {
        const buffer = new ArrayBuffer(32);
        const view = new DataView(buffer);
        view.setBigUint64(24, BigInt(value), false); // Little-endian, last 8 bytes
        return new Uint8Array(buffer);
    }
}
exports.ArbSysHandler = ArbSysHandler;
