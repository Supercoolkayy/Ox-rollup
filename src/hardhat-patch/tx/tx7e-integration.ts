/**
 * Transaction Type 0x7e Integration Layer for Hardhat Network
 *
 * Hooks into Hardhat's network provider to intercept 0x7e transactions
 * and process them through the deposit transaction pipeline.
 */

import { ethers } from "ethers";
// import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Tx7eProcessor } from "./tx7e-processor";
import { DepositTransaction } from "./tx7e-parser";

/**
 * Integration configuration for 0x7e transactions
 */
export interface Tx7eIntegrationConfig {
  enabled: boolean;
  logTransactions: boolean;
  validateSignatures: boolean;
  mockL1Bridge: string;
}

/**
 * Network provider extension for 0x7e transaction support
 */
export interface ExtendedProvider extends ethers.providers.Provider {
  // Standard provider methods
  getNetwork(): Promise<ethers.providers.Network>;
  getBalance(
    addressOrName: string | Promise<string>,
    blockTag?: ethers.providers.BlockTag
  ): Promise<ethers.BigNumber>;
  getTransactionCount(
    addressOrName: string | Promise<string>,
    blockTag?: ethers.providers.BlockTag
  ): Promise<number>;
  getCode(
    addressOrName: string | Promise<string>,
    blockTag?: ethers.providers.BlockTag
  ): Promise<string>;
  getStorageAt(
    addressOrName: string | Promise<string>,
    position: ethers.BigNumberish,
    blockTag?: ethers.providers.BlockTag
  ): Promise<string>;
  getGasPrice(): Promise<ethers.BigNumber>;
  estimateGas(
    transaction: ethers.providers.TransactionRequest
  ): Promise<ethers.BigNumber>;
  call(
    transaction: ethers.providers.TransactionRequest,
    blockTag?: ethers.providers.BlockTag
  ): Promise<string>;

  // Extended methods for 0x7e support
  sendRawTransaction(
    signedTransaction: string | Promise<string>
  ): Promise<ethers.providers.TransactionResponse>;

  // Custom methods for deposit transactions
  processDepositTransaction(
    rawTx: Buffer
  ): Promise<ethers.providers.TransactionResponse>;
  estimateDepositGas(rawTx: Buffer): Promise<number>;
  callDepositStatic(rawTx: Buffer): Promise<string>;
}

/**
 * 0x7e Transaction Integration Layer
 *
 * Integrates with Hardhat's network provider to handle deposit transactions
 */
export class Tx7eIntegration {
  private processor: Tx7eProcessor;
  private config: Tx7eIntegrationConfig;
  private originalProvider: ethers.providers.Provider;
  private extendedProvider: ExtendedProvider;

  constructor(
    provider: ethers.providers.Provider,
    config: Partial<Tx7eIntegrationConfig> = {}
  ) {
    const defaultConfig: Tx7eIntegrationConfig = {
      enabled: true,
      logTransactions: true,
      validateSignatures: true,
      mockL1Bridge: "0x0000000000000000000000000000000000000064",
    };

    this.config = { ...defaultConfig, ...config };
    this.originalProvider = provider;
    this.processor = new Tx7eProcessor(provider);
    this.extendedProvider = this.createExtendedProvider();
  }

  /**
   * Create an extended provider with 0x7e transaction support
   */
  private createExtendedProvider(): ExtendedProvider {
    const extended = this.originalProvider as ExtendedProvider;

    // Override sendRawTransaction to intercept 0x7e transactions
    const originalSendRawTransaction =
      extended.sendRawTransaction.bind(extended);
    extended.sendRawTransaction = async (
      signedTransaction: string | Promise<string>
    ): Promise<ethers.providers.TransactionResponse> => {
      const rawTx = await signedTransaction;

      // Convert hex string to buffer
      const txBuffer = Buffer.from(rawTx.slice(2), "hex");

      // Check if this is a 0x7e transaction
      if (this.processor.isDepositTransaction(txBuffer)) {
        if (this.config.logTransactions) {
          console.log(" Intercepted 0x7e deposit transaction");
        }

        // Process the deposit transaction
        return await this.processDepositTransaction(txBuffer);
      }

      // Fall back to standard processing for non-0x7e transactions
      return await originalSendRawTransaction(rawTx);
    };

    // Note: We're not overriding sendTransaction to avoid type conflicts
    // 0x7e transactions should be sent via sendRawTransaction instead

    // Add custom methods for deposit transactions
    extended.processDepositTransaction = async (
      rawTx: Buffer
    ): Promise<ethers.providers.TransactionResponse> => {
      return await this.processDepositTransaction(rawTx);
    };

    extended.estimateDepositGas = async (rawTx: Buffer): Promise<number> => {
      const result = await this.processor.estimateGas(rawTx);
      if (!result.success) {
        throw new Error(result.error || "Failed to estimate gas");
      }
      return result.gasEstimate!;
    };

    extended.callDepositStatic = async (rawTx: Buffer): Promise<string> => {
      const result = await this.processor.callStatic(rawTx);
      if (!result.success) {
        throw new Error(result.error || "Failed to call static");
      }
      return result.returnData!;
    };

    return extended;
  }

  /**
   * Process a deposit transaction and return a transaction response
   */
  private async processDepositTransaction(
    rawTx: Buffer
  ): Promise<ethers.providers.TransactionResponse> {
    try {
      // Process the transaction
      const result = await this.processor.processTransaction(rawTx);

      if (!result.success) {
        throw new Error(
          result.error || "Failed to process deposit transaction"
        );
      }

      // Create a mock transaction response
      const mockResponse = await this.createMockTransactionResponse(
        rawTx,
        result
      );

      if (this.config.logTransactions) {
        console.log("Deposit transaction processed successfully");
        console.log(` Hash: ${mockResponse.hash}`);
        console.log(` Gas Used: ${result.gasUsed || "unknown"}`);
      }

      return mockResponse;
    } catch (error) {
      if (this.config.logTransactions) {
        console.error(" Failed to process deposit transaction:", error);
      }
      throw error;
    }
  }

  /**
   * Convert a transaction object to raw transaction format
   */
  private async convertTransactionToRaw(
    tx: ethers.providers.TransactionRequest
  ): Promise<Buffer> {
    // This is a simplified conversion - in a real implementation,
    // you would need to properly sign and encode the transaction
    const mockTx = this.processor.createMockTransaction({
      to: tx.to as string,
      value: tx.value as ethers.BigNumber,
      gasLimit:
        typeof tx.gasLimit === "number"
          ? tx.gasLimit
          : (tx.gasLimit as ethers.BigNumber)?.toNumber() || 21000,
      data:
        typeof tx.data === "string"
          ? tx.data
          : (tx.data as any)?.toString() || "0x",
      nonce:
        typeof tx.nonce === "number"
          ? tx.nonce
          : (tx.nonce as ethers.BigNumber)?.toNumber() || 0,
      gasPrice:
        (tx.gasPrice as ethers.BigNumber) ||
        ethers.utils.parseUnits("20", "gwei"),
    });

    return this.processor.encodeTransaction(mockTx);
  }

  /**
   * Create a mock transaction response for the processed deposit transaction
   */
  private async createMockTransactionResponse(
    rawTx: Buffer,
    result: any
  ): Promise<ethers.providers.TransactionResponse> {
    // Parse the transaction to get details
    const parsed = this.processor.parseTransaction(rawTx);
    if (!parsed.success || !parsed.transaction) {
      throw new Error("Failed to parse transaction for response creation");
    }

    const tx = parsed.transaction;
    const txHash =
      result.transactionHash || this.processor.getTransactionHash(tx);

    // Create a mock transaction response
    const mockResponse: ethers.providers.TransactionResponse = {
      hash: txHash,
      to: tx.to === ethers.constants.AddressZero ? undefined : tx.to,
      from: tx.from,
      nonce: tx.nonce,
      gasLimit: ethers.BigNumber.from(tx.gasLimit),
      gasPrice: tx.gasPrice,
      data: tx.data,
      value: tx.value,
      chainId: 42161, // Arbitrum One
      type: 0x7e,
      confirmations: 1,
      blockNumber: await this.getCurrentBlockNumber(),
      blockHash: await this.getCurrentBlockHash(),
      timestamp: Math.floor(Date.now() / 1000),
      raw: rawTx.toString("hex"),
      wait: async (confirmations?: number) => {
        // Mock wait implementation
        return {
          to: tx.to === ethers.constants.AddressZero ? undefined : tx.to,
          from: tx.from,
          contractAddress: tx.isCreation ? txHash : undefined,
          transactionIndex: 0,
          gasUsed: ethers.BigNumber.from(result.gasUsed || 21000),
          effectiveGasPrice: tx.gasPrice,
          cumulativeGasUsed: ethers.BigNumber.from(result.gasUsed || 21000),
          logs: [],
          blockNumber: await this.getCurrentBlockNumber(),
          blockHash: await this.getCurrentBlockHash(),
          transactionHash: txHash,
          confirmations: confirmations || 1,
          byzantium: true,
          status: 1, // Success
          logsBloom: "0x",
          events: [],
          type: 0x7e,
        } as any;
      },
    };

    return mockResponse;
  }

  /**
   * Get the current block number
   */
  private async getCurrentBlockNumber(): Promise<number> {
    try {
      return await this.originalProvider.getBlockNumber();
    } catch {
      return 1; // Fallback
    }
  }

  /**
   * Get the current block hash
   */
  private async getCurrentBlockHash(): Promise<string> {
    try {
      const blockNumber = await this.getCurrentBlockNumber();
      const block = await this.originalProvider.getBlock(blockNumber);
      return (
        block?.hash ||
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    } catch {
      return "0x0000000000000000000000000000000000000000000000000000000000000000"; // Fallback
    }
  }

  /**
   * Get the extended provider with 0x7e support
   */
  getProvider(): ExtendedProvider {
    return this.extendedProvider;
  }

  /**
   * Get the underlying processor
   */
  getProcessor(): Tx7eProcessor {
    return this.processor;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<Tx7eIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if 0x7e transactions are enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable or disable 0x7e transaction processing
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): Tx7eIntegrationConfig {
    return { ...this.config };
  }
}

/**
 * Factory function to create a 0x7e transaction integration layer
 */
export function createTx7eIntegration(
  provider: ethers.providers.Provider,
  config?: Partial<Tx7eIntegrationConfig>
): Tx7eIntegration {
  return new Tx7eIntegration(provider, config || {});
}

/**
 * Extend a Hardhat runtime environment with 0x7e transaction support
 */
export function extendHardhatWithTx7e(
  hre: any,
  config?: Partial<Tx7eIntegrationConfig>
): Tx7eIntegration {
  const provider = hre.ethers.provider;
  const integration = createTx7eIntegration(provider, config);

  // Attach the integration to the HRE for access in tasks and scripts
  (hre as any).tx7eIntegration = integration;

  // Replace the provider with the extended one
  (hre.ethers as any).provider = integration.getProvider();

  console.log(" Hardhat extended with 0x7e transaction support");

  return integration;
}
