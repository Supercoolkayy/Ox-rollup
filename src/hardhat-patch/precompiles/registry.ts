/**
 * Precompile Registry Interface
 *
 * This module provides the core interface for managing Arbitrum precompiles
 * in the Hardhat Network environment.
 */

export type PrecompileContext = {
  blockNumber: bigint;
  chainId: bigint;
  txOrigin: string; // 0x-prefixed hex address
  msgSender: string; // 0x-prefixed hex address
  gasPriceWei: bigint;
  config: Record<string, unknown>;
};

export interface PrecompileHandler {
  address: string; // e.g., 0x000...064
  name: string; // "ArbSys" | "ArbGasInfo" | ...
  tags: string[]; // ["arbitrum","precompile"]
  handleCall(calldata: Uint8Array, ctx: PrecompileContext): Promise<Uint8Array>;
}

export interface PrecompileRegistry {
  register(h: PrecompileHandler): void;
  getByAddress(addr: string): PrecompileHandler | undefined;
  list(): PrecompileHandler[];
}

// Legacy interfaces for backward compatibility
export interface ExecutionContext {
  blockNumber: number;
  chainId: number;
  gasPrice: bigint;
  caller: string;
  callStack: string[];
  l1Context?: L1Context;
}

export interface L1Context {
  baseFee: bigint;
  gasPriceEstimate: bigint;
  feeModel: "static" | "dynamic";
}

export interface PrecompileResult {
  success: boolean;
  data?: Uint8Array;
  gasUsed: number;
  error?: string;
}

export interface PrecompileConfig {
  chainId: number;
  arbOSVersion: number;
  l1BaseFee: bigint;
  gasPriceComponents: GasPriceComponents;
}

export interface PartialPrecompileConfig {
  chainId?: number;
  arbOSVersion?: number;
  l1BaseFee?: bigint;
  gasPriceComponents?: PartialGasPriceComponents;
}

export interface GasPriceComponents {
  l2BaseFee: bigint;
  l1CalldataCost: bigint;
  l1StorageCost: bigint;
  congestionFee: bigint;
}

export interface PartialGasPriceComponents {
  l2BaseFee?: bigint;
  l1CalldataCost?: bigint;
  l1StorageCost?: bigint;
  congestionFee?: bigint;
}

// Legacy registry interface for backward compatibility
export interface LegacyPrecompileRegistry {
  register(handler: PrecompileHandler): void;
  getHandler(address: string): PrecompileHandler | null;
  listHandlers(): PrecompileHandler[];
  hasHandler(address: string): boolean;
}

/**
 * Implementation of the precompile registry
 */
export class HardhatPrecompileRegistry
  implements PrecompileRegistry, LegacyPrecompileRegistry
{
  private handlers: Map<string, PrecompileHandler> = new Map();

  register(h: PrecompileHandler): void {
    if (this.handlers.has(h.address)) {
      throw new Error(`Handler already registered for address ${h.address}`);
    }

    this.handlers.set(h.address, h);
  }

  getByAddress(addr: string): PrecompileHandler | undefined {
    return this.handlers.get(addr);
  }

  list(): PrecompileHandler[] {
    return Array.from(this.handlers.values());
  }

  // Legacy methods for backward compatibility
  getHandler(address: string): PrecompileHandler | null {
    return this.handlers.get(address) || null;
  }

  listHandlers(): PrecompileHandler[] {
    return this.list();
  }

  hasHandler(address: string): boolean {
    return this.handlers.has(address);
  }

  /**
   * Handle a precompile call by delegating to the appropriate handler
   */
  async handleCall(
    address: string,
    calldata: Uint8Array,
    context: ExecutionContext
  ): Promise<PrecompileResult> {
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
      const precompileContext: PrecompileContext = {
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
    } catch (error) {
      return {
        success: false,
        gasUsed: 0,
        error: `Handler execution failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}

/**
 * Create a new precompile registry instance
 */
export function createRegistry(): PrecompileRegistry {
  return new HardhatPrecompileRegistry();
}
