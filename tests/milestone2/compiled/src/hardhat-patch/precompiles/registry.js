"use strict";
/**
 * Precompile Registry Interface
 *
 * This module provides the core interface for managing Arbitrum precompiles
 * in the Hardhat Network environment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardhatPrecompileRegistry = void 0;
exports.createRegistry = createRegistry;
/**
 * Implementation of the precompile registry
 */
class HardhatPrecompileRegistry {
    constructor() {
        this.handlers = new Map();
    }
    register(h) {
        if (this.handlers.has(h.address)) {
            throw new Error(`Handler already registered for address ${h.address}`);
        }
        this.handlers.set(h.address, h);
    }
    getByAddress(addr) {
        return this.handlers.get(addr);
    }
    list() {
        return Array.from(this.handlers.values());
    }
    // Legacy methods for backward compatibility
    getHandler(address) {
        return this.handlers.get(address) || null;
    }
    listHandlers() {
        return this.list();
    }
    hasHandler(address) {
        return this.handlers.has(address);
    }
    /**
     * Handle a precompile call by delegating to the appropriate handler
     */
    async handleCall(address, calldata, context) {
        const handler = this.getHandler(address);
        if (!handler) {
            return {
                success: false,
                gasUsed: 0,
                error: `No handler registered for address ${address}`,
            };
        }
        try {
            // Convert ExecutionContext to PrecompileContext
            const precompileContext = {
                blockNumber: BigInt(context.blockNumber),
                chainId: BigInt(context.chainId),
                txOrigin: context.caller,
                msgSender: context.caller,
                gasPriceWei: context.gasPrice,
                config: {},
            };
            const result = await handler.handleCall(calldata, precompileContext);
            // Convert Uint8Array result to PrecompileResult
            return {
                success: true,
                data: result,
                gasUsed: 0, // Will be calculated by caller
            };
        }
        catch (error) {
            return {
                success: false,
                gasUsed: 0,
                error: `Handler execution failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
}
exports.HardhatPrecompileRegistry = HardhatPrecompileRegistry;
/**
 * Create a new precompile registry instance
 */
function createRegistry() {
    return new HardhatPrecompileRegistry();
}
