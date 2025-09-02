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
  // Enhanced context for L1 message handling
  l1MessageQueue?: L1MessageQueue;
};

export interface PrecompileHandler {
  address: string; // e.g., 0x000...064
  name: string; // "ArbSys" | "ArbGasInfo" | ...
  tags: string[]; // ["arbitrum","precompile"]
  handleCall(calldata: Uint8Array, ctx: PrecompileContext): Promise<Uint8Array>;
  gasCost?(calldata: Uint8Array): number; // Optional gas cost calculation
}

export interface PrecompileRegistry {
  register(h: PrecompileHandler): void;
  getByAddress(addr: string): PrecompileHandler | undefined;
  list(): PrecompileHandler[];
  handleCall(
    address: string,
    calldata: Uint8Array,
    context: ExecutionContext
  ): Promise<PrecompileResult>;
}

// L1 Message Queue for sendTxToL1 simulation
export interface L1MessageQueue {
  addMessage(message: Omit<L1Message, "id">): string; // Returns message ID
  getMessages(): L1Message[];
  clearMessages(): void;
}

export interface L1Message {
  id: string;
  from: string;
  to: string;
  value: bigint;
  data: Uint8Array;
  timestamp: number;
  blockNumber: number;
  txHash: string;
}

// Legacy interfaces for backward compatibility
export interface ExecutionContext {
  blockNumber: number;
  chainId: number;
  gasPrice: bigint;
  caller: string;
  callStack: string[];
  l1Context?: L1Context;
  l1MessageQueue?: L1MessageQueue;
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
  private l1MessageQueue: L1MessageQueue = new HardhatL1MessageQueue();

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
   * Get the L1 message queue instance
   */
  getL1MessageQueue(): L1MessageQueue {
    return this.l1MessageQueue;
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
        l1MessageQueue: this.l1MessageQueue,
      };

      const result = await handler.handleCall(calldata, precompileContext);

      // Calculate gas used based on the handler's gas cost
      const gasUsed = handler.gasCost ? handler.gasCost(calldata) : 0;

      // Convert Uint8Array result to PrecompileResult
      return {
        success: true,
        data: result,
        gasUsed: gasUsed,
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
 * Implementation of L1MessageQueue for Hardhat environment
 */
export class HardhatL1MessageQueue implements L1MessageQueue {
  private messages: L1Message[] = [];
  private messageCounter = 0;

  addMessage(message: Omit<L1Message, "id">): string {
    const id = `msg_${this.messageCounter++}_${Date.now()}`;
    const fullMessage: L1Message = {
      ...message,
      id,
    };
    this.messages.push(fullMessage);
    return id;
  }

  getMessages(): L1Message[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
    this.messageCounter = 0;
  }
}

/**
 * Create a new precompile registry instance
 */
export function createRegistry(): HardhatPrecompileRegistry {
  return new HardhatPrecompileRegistry();
}
