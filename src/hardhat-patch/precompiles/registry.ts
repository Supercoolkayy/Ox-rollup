/**
 * Precompile Registry Interface
 * 
 * This module provides the core interface for managing Arbitrum precompiles
 * in the Hardhat Network environment.
 */

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
  feeModel: 'static' | 'dynamic';
}

export interface PrecompileResult {
  success: boolean;
  data?: Uint8Array;
  gasUsed: number;
  error?: string;
}

export interface PrecompileHandler {
  address: string;
  name: string;
  tags: string[];
  handleCall(
    calldata: Uint8Array, 
    context: ExecutionContext
  ): Promise<PrecompileResult>;
  getConfig(): PrecompileConfig;
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

export interface PrecompileRegistry {
  register(handler: PrecompileHandler): void;
  getHandler(address: string): PrecompileHandler | null;
  listHandlers(): PrecompileHandler[];
  hasHandler(address: string): boolean;
}

/**
 * Implementation of the precompile registry
 */
export class HardhatPrecompileRegistry implements PrecompileRegistry {
  private handlers: Map<string, PrecompileHandler> = new Map();

  register(handler: PrecompileHandler): void {
    if (this.handlers.has(handler.address)) {
      throw new Error(`Handler already registered for address ${handler.address}`);
    }
    
    this.handlers.set(handler.address, handler);
  }

  getHandler(address: string): PrecompileHandler | null {
    return this.handlers.get(address) || null;
  }

  listHandlers(): PrecompileHandler[] {
    return Array.from(this.handlers.values());
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
        error: `No handler registered for address ${address}`
      };
    }

    try {
      return await handler.handleCall(calldata, context);
    } catch (error) {
      return {
        success: false,
        gasUsed: 0,
        error: `Handler execution failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
