/**
 * ArbGasInfo Precompile Handler (0x6C)
 *
 * Implements the ArbGasInfo precompile interface for local development.
 * Provides configurable gas pricing functionality with Nitro baseline gas model.
 */

import {
  PrecompileHandler,
  PrecompileContext,
  PrecompileResult,
  PrecompileConfig,
  PartialPrecompileConfig,
  GasPriceComponents,
  ExecutionContext,
} from "./registry";
import * as fs from "fs";
import * as path from "path";

export class ArbGasInfoHandler implements PrecompileHandler {
  public readonly address = "0x000000000000000000000000000000000000006c";
  public readonly name = "ArbGasInfo";
  public readonly tags = ["arbitrum", "precompile"];

  private config: PrecompileConfig;
  private gasConfigPath: string;

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

    // Try to load gas config from file only if no custom config was provided
    this.gasConfigPath = path.join(
      process.cwd(),
      "node_state",
      "gas_config.json"
    );

    // Only load from file if no custom configuration was provided
    if (!config || Object.keys(config).length === 0) {
      this.loadGasConfig();
    }
  }

  /**
   * Load gas configuration from file if available
   */
  private loadGasConfig(): void {
    try {
      if (fs.existsSync(this.gasConfigPath)) {
        const configData = fs.readFileSync(this.gasConfigPath, "utf8");
        const gasConfig = JSON.parse(configData);

        // Update config with file values
        if (gasConfig.l1BaseFee) {
          this.config.l1BaseFee = BigInt(gasConfig.l1BaseFee);
        }

        if (gasConfig.gasPriceComponents) {
          const components = gasConfig.gasPriceComponents;
          if (components.l2BaseFee) {
            this.config.gasPriceComponents.l2BaseFee = BigInt(
              components.l2BaseFee
            );
          }
          if (components.l1CalldataCost) {
            this.config.gasPriceComponents.l1CalldataCost = BigInt(
              components.l1CalldataCost
            );
          }
          if (components.l1StorageCost) {
            this.config.gasPriceComponents.l1StorageCost = BigInt(
              components.l1StorageCost
            );
          }
          if (components.congestionFee) {
            this.config.gasPriceComponents.congestionFee = BigInt(
              components.congestionFee
            );
          }
        }

        console.log(` Loaded gas config from ${this.gasConfigPath}`);
      }
    } catch (error) {
      console.warn(
        `Failed to load gas config: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
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
        case "41b247a8": // getPricesInWei()
          return this.handleGetPricesInWei(ctx);

        case "f5d6ded7": // getL1BaseFeeEstimate()
          return this.handleGetL1BaseFeeEstimate(ctx);

        case "c6f7de0e": // getCurrentTxL1GasFees()
          return this.handleGetCurrentTxL1GasFees(calldata, ctx);

        case "02199f34": // getPricesInArbGas()
          return this.handleGetPricesInArbGas(ctx);

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
        case "41b247a8": // getPricesInWei()
          return this.handleGetPricesInWeiLegacy(context);

        case "f5d6ded7": // getL1BaseFeeEstimate()
          return this.handleGetL1BaseFeeEstimateLegacy(context);

        case "c6f7de0e": // getCurrentTxL1GasFees()
          return this.handleGetCurrentTxL1GasFeesLegacy(calldata, context);

        case "02199f34": // getPricesInArbGas()
          return this.handleGetPricesInArbGasLegacy(context);

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
      case "41b247a8": // getPricesInWei()
        return 10;
      case "f5d6ded7": // getL1BaseFeeEstimate()
        return 5;
      case "02199f34": // getPricesInArbGas()
        return 96;
      default:
        return 0;
    }
  }

  /**
   * Calculate L1 gas fees for current transaction
   * Implements Nitro baseline gas algorithm
   */
  private calculateL1GasFees(calldata: Uint8Array): bigint {
    const calldataSize = calldata.length;
    const l1GasUsed =
      calldataSize * Number(this.config.gasPriceComponents.l1CalldataCost);
    return BigInt(l1GasUsed) * this.config.l1BaseFee;
  }

  /**
   * Get gas prices in wei (6-tuple)
   * Returns: (
                per L2 tx,
                per L1 calldata byte
                per storage allocation,
                per ArbGas base,
                per ArbGas congestion,
                per ArbGas total
            )
   */
  private handleGetPricesInWei(ctx: PrecompileContext): Uint8Array {
    // Configurable Logic: Calculate prices based on current config state

    const l1CalldataCost = this.config.gasPriceComponents.l1CalldataCost;
    const l1BytePrice = this.config.l1BaseFee * this.config.gasPriceComponents.l1CalldataCost;
    const l2BaseFee = this.config.gasPriceComponents.l2BaseFee;
    const congestion = this.config.gasPriceComponents.congestionFee;
    const totalL2 = l2BaseFee + congestion;

    // The Data Structure is a 6-tuple of uint256 values
    // Map the values to the indices observed on Mainnet
    const payload = [
      l2BaseFee,       // [0] Stub
      l1CalldataCost,  // [1] Stub
      l1BytePrice,     // [2] L1 Cost Per Byte (ACTIVE)
      l2BaseFee,       // [3] L2 Base Fee (ACTIVE)
      congestion,      // [4] Congestion (ACTIVE)
      totalL2          // [5] Total (ACTIVE)
    ];

    // 
    return this.packUint256Array(payload);
  }


  /**
   * Get L1 base fee estimate
   */
  private handleGetL1BaseFeeEstimate(ctx: PrecompileContext): Uint8Array {
  // Nitro Mainnet returns 0 here; pricing is handled via getPricesInWei index [2]
  return this.packUint256Array([BigInt(0)]);
}

  /**
   * Get current transaction L1 gas fees
   * Implements Nitro baseline gas calculation
   */
  private handleGetCurrentTxL1GasFees(
    calldata: Uint8Array,
    ctx: PrecompileContext
  ): Uint8Array {
    const l1GasFees = this.calculateL1GasFees(calldata);
    return this.encodeUint256(Number(l1GasFees));
  }

  /**
   * Get gas prices in ArbGas units (3-tuple)
   * Returns: (l2BaseFee, l1CalldataCost, l1StorageCost)
   */
  private handleGetPricesInArbGas(ctx: PrecompileContext): Uint8Array {
    const payload = [
      BigInt(0),
      BigInt(0),
      BigInt(20000) // Legacy storage buffer stub
    ];
    return this.packUint256Array(payload);
}
  

  // Legacy handlers for backward compatibility
  private handleGetPricesInWeiLegacy(
    context: ExecutionContext
  ): PrecompileResult {
    const data = this.handleGetPricesInWei({
      blockNumber: BigInt(context.blockNumber),
      chainId: BigInt(context.chainId),
      txOrigin: context.caller,
      msgSender: context.caller,
      gasPriceWei: context.gasPrice,
      config: {},
    });

    return {
      success: true,
      data,
      gasUsed: 10,
    };
  }

  private handleGetL1BaseFeeEstimateLegacy(
    context: ExecutionContext
  ): PrecompileResult {
    return {
      success: true,
      data: this.encodeUint256(Number(this.config.l1BaseFee)),
      gasUsed: 5,
    };
  }

  private handleGetCurrentTxL1GasFeesLegacy(
    calldata: Uint8Array,
    context: ExecutionContext
  ): PrecompileResult {
    const l1GasFees = this.calculateL1GasFees(calldata);

    return {
      success: true,
      data: this.encodeUint256(Number(l1GasFees)),
      gasUsed: 8,
    };
  }

  private handleGetPricesInArbGasLegacy(
    context: ExecutionContext
  ): PrecompileResult {
    const data = this.handleGetPricesInArbGas({
      blockNumber: BigInt(context.blockNumber),
      chainId: BigInt(context.chainId),
      txOrigin: context.caller,
      msgSender: context.caller,
      gasPriceWei: context.gasPrice,
      config: {},
    });

    return {
      success: true,
      data,
      gasUsed: 8,
    };
  }

  
  private packUint256Array(values: bigint[]): Uint8Array {
    // Create buffer: number of items * 32 bytes each
    const buffer = new Uint8Array(values.length * 32);
    const view = new DataView(buffer.buffer);

    values.forEach((val, index) => {
      // Write 32-byte word (EVM standard is Big Endian, but DataView is explicit)
      // We write the lower 64 bits to the end of the 32-byte slot (Little Endian offset +24)
      const low = val & BigInt("0xFFFFFFFFFFFFFFFF");
      view.setBigUint64((index * 32) + 24, low, false); 
      
      // Handle bits 64-128 if you expect massive values
      const mid = (val >> BigInt(64)) & BigInt("0xFFFFFFFFFFFFFFFF");
      if (mid > 0) {
          view.setBigUint64((index * 32) + 16, mid, false);
      }
    });

    return buffer;
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
   * Reload gas configuration from file
   * Useful for runtime configuration updates
   */
  public reloadGasConfig(): void {
    this.loadGasConfig();
  }

  /**
   * Get current gas configuration as human-readable string
   */
  public getGasConfigSummary(): string {
    return `Gas Config:
  L1 Base Fee: ${this.config.l1BaseFee} wei (${
      Number(this.config.l1BaseFee) / 1e9
    } gwei)
  L2 Base Fee: ${this.config.gasPriceComponents.l2BaseFee} wei (${
      Number(this.config.gasPriceComponents.l2BaseFee) / 1e9
    } gwei)
  L1 Calldata Cost: ${this.config.gasPriceComponents.l1CalldataCost} gas/byte
  L1 Storage Cost: ${this.config.gasPriceComponents.l1StorageCost} gas
  Congestion Fee: ${this.config.gasPriceComponents.congestionFee} wei`;
  }
}
