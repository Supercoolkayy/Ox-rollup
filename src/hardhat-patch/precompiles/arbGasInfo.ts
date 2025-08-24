/**
 * ArbGasInfo Precompile Handler (0x6C)
 * 
 * Implements the ArbGasInfo precompile interface for local development.
 * This is a stub implementation that provides basic gas pricing functionality.
 */

import { 
  PrecompileHandler, 
  ExecutionContext, 
  PrecompileResult, 
  PrecompileConfig,
  PartialPrecompileConfig,
  GasPriceComponents 
} from './registry';

export class ArbGasInfoHandler implements PrecompileHandler {
  public readonly address = '0x000000000000000000000000000000000000006C';
  public readonly name = 'ArbGasInfo';
  public readonly tags = ['arbitrum', 'gas', 'pricing'];

  private config: PrecompileConfig;

  constructor(config?: PartialPrecompileConfig) {
    const defaultGasComponents = {
      l2BaseFee: BigInt(1e9), // 1 gwei default
      l1CalldataCost: BigInt(16), // 16 gas per byte
      l1StorageCost: BigInt(0), // No storage gas in Nitro
      congestionFee: BigInt(0) // No congestion fee by default
    };

    this.config = {
      chainId: config?.chainId ?? 42161, // Arbitrum One default
      arbOSVersion: config?.arbOSVersion ?? 20,
      l1BaseFee: config?.l1BaseFee ?? BigInt(20e9), // 20 gwei default
      gasPriceComponents: {
        l2BaseFee: config?.gasPriceComponents?.l2BaseFee ?? defaultGasComponents.l2BaseFee,
        l1CalldataCost: config?.gasPriceComponents?.l1CalldataCost ?? defaultGasComponents.l1CalldataCost,
        l1StorageCost: config?.gasPriceComponents?.l1StorageCost ?? defaultGasComponents.l1StorageCost,
        congestionFee: config?.gasPriceComponents?.congestionFee ?? defaultGasComponents.congestionFee
      }
    };
  }

  async handleCall(calldata: Uint8Array, context: ExecutionContext): Promise<PrecompileResult> {
    if (calldata.length < 4) {
      return {
        success: false,
        gasUsed: 0,
        error: 'Invalid calldata: too short'
      };
    }

    // Extract function selector (first 4 bytes)
    const selector = calldata.slice(0, 4);
    const selectorHex = Array.from(selector)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    try {
      switch (selectorHex) {
        case '4d2301cc': // getPricesInWei()
          return this.handleGetPricesInWei(context);
        
        case '4d2301cc': // getL1BaseFeeEstimate()
          return this.handleGetL1BaseFeeEstimate(context);
        
        case '4d2301cc': // getCurrentTxL1GasFees()
          return this.handleGetCurrentTxL1GasFees(calldata, context);
        
        case '4d2301cc': // getPricesInArbGas()
          return this.handleGetPricesInArbGas(context);
        
        default:
          return {
            success: false,
            gasUsed: 0,
            error: `Unknown function selector: 0x${selectorHex}`
          };
      }
    } catch (error) {
      return {
        success: false,
        gasUsed: 0,
        error: `Handler execution failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  getConfig(): PrecompileConfig {
    return { ...this.config };
  }

  private handleGetPricesInWei(context: ExecutionContext): PrecompileResult {
    // Return 5-tuple: (l2BaseFee, l1CalldataCost, l1StorageCost, baseL2GasPrice, congestionFee)
    const data = new Uint8Array(160); // 5 * 32 bytes
    const view = new DataView(data.buffer);
    
    let offset = 0;
    view.setBigUint64(offset + 24, this.config.gasPriceComponents.l2BaseFee, false);
    offset += 32;
    view.setBigUint64(offset + 24, this.config.gasPriceComponents.l1CalldataCost, false);
    offset += 32;
    view.setBigUint64(offset + 24, this.config.gasPriceComponents.l1StorageCost, false);
    offset += 32;
    view.setBigUint64(offset + 24, this.config.gasPriceComponents.l2BaseFee, false);
    offset += 32;
    view.setBigUint64(offset + 24, this.config.gasPriceComponents.congestionFee, false);

    return {
      success: true,
      data,
      gasUsed: 10
    };
  }

  private handleGetL1BaseFeeEstimate(context: ExecutionContext): PrecompileResult {
    return {
      success: true,
      data: this.encodeUint256(Number(this.config.l1BaseFee)),
      gasUsed: 5
    };
  }

  private handleGetCurrentTxL1GasFees(calldata: Uint8Array, context: ExecutionContext): PrecompileResult {
    // For now, return a simple calculation based on calldata size
    // In a real implementation, this would calculate actual L1 gas costs
    const calldataSize = calldata.length;
    const l1GasUsed = calldataSize * 16; // 16 gas per byte
    const l1GasFees = BigInt(l1GasUsed) * this.config.l1BaseFee;

    return {
      success: true,
      data: this.encodeUint256(Number(l1GasFees)),
      gasUsed: 8
    };
  }

  private handleGetPricesInArbGas(context: ExecutionContext): PrecompileResult {
    // Return 3-tuple: (l2BaseFee, l1CalldataCost, l1StorageCost) in ArbGas units
    const data = new Uint8Array(96); // 3 * 32 bytes
    const view = new DataView(data.buffer);
    
    let offset = 0;
    view.setBigUint64(offset + 24, this.config.gasPriceComponents.l2BaseFee, false);
    offset += 32;
    view.setBigUint64(offset + 24, this.config.gasPriceComponents.l1CalldataCost, false);
    offset += 32;
    view.setBigUint64(offset + 24, this.config.gasPriceComponents.l1StorageCost, false);

    return {
      success: true,
      data,
      gasUsed: 8
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
}
