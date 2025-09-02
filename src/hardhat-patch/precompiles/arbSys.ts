/**
 * ArbSys Precompile Handler (0x64)
 *
 * Implements the ArbSys precompile interface for local development.
 * This is a stub implementation that provides basic functionality.
 */

import {
  PrecompileHandler,
  PrecompileContext,
  PrecompileResult,
  PrecompileConfig,
  PartialPrecompileConfig,
  GasPriceComponents,
  ExecutionContext,
  L1Message,
} from "./registry";

export class ArbSysHandler implements PrecompileHandler {
  public readonly address = "0x0000000000000000000000000000000000000064";
  public readonly name = "ArbSys";
  public readonly tags = ["arbitrum", "precompile"];

  private config: PrecompileConfig;
  private l1MessageCounter = 0;

  constructor(config?: PartialPrecompileConfig) {
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
        l2BaseFee:
          config?.gasPriceComponents?.l2BaseFee ??
          defaultGasComponents.l2BaseFee,
        l1CalldataCost:
          config?.gasPriceComponents?.l1CalldataCost ??
          defaultGasComponents.l1CalldataCost,
        l1StorageCost:
          config?.gasPriceComponents?.l1StorageCost ??
          defaultGasComponents.l1StorageCost,
        congestionFee:
          config?.gasPriceComponents?.congestionFee ??
          defaultGasComponents.congestionFee,
      },
    };
  }

  async handleCall(
    calldata: Uint8Array,
    ctx: PrecompileContext
  ): Promise<Uint8Array> {
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

        case "4d2301cc": // arbOSVersion()
          return this.handleArbOSVersion(ctx);

        case "6e8c1d6f": // sendTxToL1(address,bytes)
          return this.handleSendTxToL1(calldata, ctx);

        case "a0c12269": // mapL1SenderContractAddressToL2Alias(address)
          return this.handleMapL1SenderContractAddressToL2Alias(calldata, ctx);

        default:
          throw new Error(`Unknown function selector: 0x${selectorHex}`);
      }
    } catch (error) {
      throw new Error(
        `Handler execution failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Legacy method for backward compatibility
  async handleCallLegacy(
    calldata: Uint8Array,
    context: ExecutionContext
  ): Promise<PrecompileResult> {
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

        case "6e8c1d6f": // sendTxToL1(address,bytes)
          return this.handleSendTxToL1Legacy(calldata, context);

        case "a0c12269": // mapL1SenderContractAddressToL2Alias(address)
          return this.handleMapL1SenderContractAddressToL2AliasLegacy(
            calldata,
            context
          );

        default:
          return {
            success: false,
            gasUsed: 0,
            error: `Unknown function selector: 0x${selectorHex}`,
          };
      }
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

  getConfig(): PrecompileConfig {
    return { ...this.config };
  }

  /**
   * Calculate gas cost for a precompile call
   */
  gasCost(calldata: Uint8Array): number {
    if (calldata.length < 4) {
      return 0;
    }

    const selector = Array.from(calldata.slice(0, 4))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    switch (selector) {
      case "a3b1b31d": // arbChainID()
      case "051038f2": // arbBlockNumber()
      case "4d2301cc": // arbOSVersion()
        return 3;
      case "6e8c1d6f": // sendTxToL1()
        return 100;
      case "a0c12269": // mapL1SenderContractAddressToL2Alias()
        return 50;
      default:
        return 0;
    }
  }

  private handleArbChainID(ctx: PrecompileContext): Uint8Array {
    return this.encodeUint256(Number(ctx.chainId));
  }

  private handleArbBlockNumber(ctx: PrecompileContext): Uint8Array {
    return this.encodeUint256(Number(ctx.blockNumber));
  }

  private handleArbBlockHash(
    calldata: Uint8Array,
    ctx: PrecompileContext
  ): Uint8Array {
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

  private handleArbOSVersion(ctx: PrecompileContext): Uint8Array {
    return this.encodeUint256(this.config.arbOSVersion);
  }

  private handleSendTxToL1(
    calldata: Uint8Array,
    ctx: PrecompileContext
  ): Uint8Array {
    // sendTxToL1(address,bytes) - selector: 6e8c1d6f
    // Calldata: 4 bytes selector + 32 bytes offset + 32 bytes length + data
    if (calldata.length < 68) {
      throw new Error("Invalid calldata length for sendTxToL1");
    }

    // Parse calldata to extract destination address and data
    const dataView = new DataView(calldata.buffer, calldata.byteOffset);

    // Read offset to data (bytes32)
    const dataOffset = Number(dataView.getBigUint64(32 + 24, false));

    // Read data length (bytes32)
    const dataLength = Number(dataView.getBigUint64(64 + 24, false));

    // Extract destination address (first 20 bytes after selector)
    const destAddress = this.extractAddress(calldata, 4);

    // Extract data bytes
    const data = calldata.slice(dataOffset, dataOffset + dataLength);

    // Add message to L1 queue if available
    if (ctx.l1MessageQueue) {
      const message: Omit<L1Message, "id"> = {
        from: ctx.msgSender,
        to: destAddress,
        value: BigInt(0), // sendTxToL1 doesn't transfer value
        data: data,
        timestamp: Date.now(),
        blockNumber: Number(ctx.blockNumber),
        txHash: `0x${Math.random()
          .toString(16)
          .slice(2, 66)
          .padStart(64, "0")}`, // Mock tx hash
      };

      const messageId = ctx.l1MessageQueue.addMessage(message);

      // Log the L1 message for developer visibility
      console.log(`📤 L1 Message queued: ${messageId}`);
      console.log(`   From: ${message.from}`);
      console.log(`   To: ${message.to}`);
      console.log(`   Data length: ${data.length} bytes`);
    }

    // Return a mock message ID (in real Arbitrum, this would be a unique identifier)
    const messageId = this.generateMessageId();
    return this.encodeUint256(messageId);
  }

  private handleMapL1SenderContractAddressToL2Alias(
    calldata: Uint8Array,
    ctx: PrecompileContext
  ): Uint8Array {
    // mapL1SenderContractAddressToL2Alias(address) - selector: a0c12269
    // Calldata: 4 bytes selector + 32 bytes address
    if (calldata.length < 36) {
      throw new Error(
        "Invalid calldata length for mapL1SenderContractAddressToL2Alias"
      );
    }

    // Extract the L1 contract address
    const l1Address = this.extractAddress(calldata, 4);

    // Apply Arbitrum's address aliasing: L2 = L1 + 0x1111000000000000000000000000000000001111
    const l2Alias = this.applyAddressAliasing(l1Address);

    return l2Alias;
  }

  // Legacy handlers for backward compatibility
  private handleArbChainIDLegacy(context: ExecutionContext): PrecompileResult {
    return {
      success: true,
      data: this.encodeUint256(this.config.chainId),
      gasUsed: 3,
    };
  }

  private handleArbBlockNumberLegacy(
    context: ExecutionContext
  ): PrecompileResult {
    return {
      success: true,
      data: this.encodeUint256(context.blockNumber),
      gasUsed: 3,
    };
  }

  private handleArbBlockHashLegacy(
    calldata: Uint8Array,
    context: ExecutionContext
  ): PrecompileResult {
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

  private handleArbOSVersionLegacy(
    context: ExecutionContext
  ): PrecompileResult {
    return {
      success: true,
      data: this.encodeUint256(this.config.arbOSVersion),
      gasUsed: 3,
    };
  }

  private handleSendTxToL1Legacy(
    calldata: Uint8Array,
    context: ExecutionContext
  ): PrecompileResult {
    if (calldata.length < 68) {
      return {
        success: false,
        gasUsed: 0,
        error: "Invalid calldata length for sendTxToL1",
      };
    }

    // Mock implementation for legacy mode
    const messageId = this.generateMessageId();
    return {
      success: true,
      data: this.encodeUint256(messageId),
      gasUsed: 100,
    };
  }

  private handleMapL1SenderContractAddressToL2AliasLegacy(
    calldata: Uint8Array,
    context: ExecutionContext
  ): PrecompileResult {
    if (calldata.length < 36) {
      return {
        success: false,
        gasUsed: 0,
        error:
          "Invalid calldata length for mapL1SenderContractAddressToL2Alias",
      };
    }

    // Extract the L1 contract address
    const l1Address = this.extractAddress(calldata, 4);

    // Apply Arbitrum's address aliasing
    const l2Alias = this.applyAddressAliasing(l1Address);

    return {
      success: true,
      data: l2Alias,
      gasUsed: 50,
    };
  }

  /**
   * Encode a uint256 value as a 32-byte array
   */
  private encodeUint256(value: number): Uint8Array {
    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);
    view.setBigUint64(24, BigInt(value), false); // Little-endian, last 8 bytes
    return new Uint8Array(buffer);
  }

  /**
   * Extract an address from calldata at the specified offset
   */
  private extractAddress(calldata: Uint8Array, offset: number): string {
    // Address is 20 bytes, but calldata stores it as 32 bytes (padded)
    const addressBytes = calldata.slice(offset + 12, offset + 32); // Skip first 12 bytes of padding
    return `0x${Array.from(addressBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
  }

  /**
   * Apply Arbitrum's address aliasing: L2 = L1 + 0x1111000000000000000000000000000000001111
   */
  private applyAddressAliasing(l1Address: string): Uint8Array {
    // Remove 0x prefix and convert to BigInt
    const l1BigInt = BigInt(l1Address);

    // Arbitrum aliasing constant
    const aliasingConstant = BigInt(
      "0x1111000000000000000000000000000000001111"
    );

    // Apply aliasing
    const l2Alias = l1BigInt + aliasingConstant;

    // Convert back to 32-byte array (big-endian)
    const result = new Uint8Array(32);
    let value = l2Alias;

    // Convert BigInt to bytes (big-endian)
    for (let i = 31; i >= 0; i--) {
      result[i] = Number(value & BigInt(0xff));
      value = value >> BigInt(8);
    }

    return result;
  }

  /**
   * Generate a mock message ID for sendTxToL1
   */
  private generateMessageId(): number {
    return ++this.l1MessageCounter;
  }
}
