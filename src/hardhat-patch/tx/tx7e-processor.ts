/**
 * Transaction Type 0x7e Processor for Hardhat Network
 *
 * Integrates with Hardhat's network provider to process deposit transactions
 * and convert them to standard Ethereum transactions for execution.
 */

import { ethers } from "ethers";
import {
  Tx7eParser,
  DepositTransaction,
  ParsedTransaction,
} from "./tx7e-parser";

/**
 * Transaction processing result
 */
export interface ProcessingResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: number;
  error?: string;
  warnings?: string[];
}

/**
 * Gas estimation result for deposit transactions
 */
export interface GasEstimationResult {
  success: boolean;
  gasEstimate?: number;
  error?: string;
}

/**
 * Call simulation result for deposit transactions
 */
export interface CallSimulationResult {
  success: boolean;
  returnData?: string;
  gasUsed?: number;
  error?: string;
}

/**
 * 0x7e Transaction Processor
 *
 * Handles the execution of deposit transactions on Hardhat Network
 * by converting them to standard Ethereum transactions
 */
export class Tx7eProcessor {
  private parser: Tx7eParser;
  private provider: ethers.providers.Provider;

  constructor(provider: ethers.providers.Provider) {
    this.parser = new Tx7eParser();
    this.provider = provider;
  }

  /**
   * Process a raw 0x7e transaction
   */
  async processTransaction(rawTx: Buffer): Promise<ProcessingResult> {
    try {
      // Parse the transaction
      const parsed = this.parser.parseTransaction(rawTx);

      if (!parsed.success || !parsed.transaction) {
        return {
          success: false,
          error: parsed.error || "Failed to parse transaction",
        };
      }

      const tx = parsed.transaction;

      // Validate the transaction
      const validation = this.parser.validateTransaction(tx);

      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(", ")}`,
          warnings: validation.warnings,
        };
      }

      // Convert to standard Ethereum transaction
      const ethTx = this.parser.toEthereumTransaction(tx);

      // Get transaction hash
      const txHash = this.parser.getTransactionHash(tx);

      // Log transaction details for debugging
      // console.log("🔍 Processing 0x7e deposit transaction:");
      // console.log(this.parser.getTransactionSummary(tx));
      // console.log(` Transaction hash: ${txHash}`);

      // For now, we'll simulate the transaction execution
      // In a full implementation, this would integrate with Hardhat's EVM
      const simulation = await this.simulateTransaction(tx);

      if (!simulation.success) {
        return {
          success: false,
          error: `Simulation failed: ${simulation.error}`,
          warnings: validation.warnings,
        };
      }

      return {
        success: true,
        transactionHash: txHash,
        gasUsed: simulation.gasUsed,
        warnings: validation.warnings,
      };
    } catch (error) {
      return {
        success: false,
        error: `Processing failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Simulate a deposit transaction execution
   */
  async simulateTransaction(
    tx: DepositTransaction
  ): Promise<CallSimulationResult> {
    try {
      // Convert to standard Ethereum transaction
      const ethTx = this.parser.toEthereumTransaction(tx);

      // Simulate the call using callStatic
      const result = await this.provider.call(ethTx);

      // Estimate gas usage
      const gasEstimate = await this.provider.estimateGas(ethTx);

      return {
        success: true,
        returnData: result,
        gasUsed: gasEstimate.toNumber(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Simulation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Estimate gas for a deposit transaction
   */
  async estimateGas(rawTx: Buffer): Promise<GasEstimationResult> {
    try {
      // Parse the transaction
      const parsed = this.parser.parseTransaction(rawTx);

      if (!parsed.success || !parsed.transaction) {
        return {
          success: false,
          error: parsed.error || "Failed to parse transaction",
        };
      }

      const tx = parsed.transaction;

      // Validate the transaction
      const validation = this.parser.validateTransaction(tx);

      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(", ")}`,
        };
      }

      // Convert to standard Ethereum transaction
      const ethTx = this.parser.toEthereumTransaction(tx);

      // Estimate gas
      const gasEstimate = await this.provider.estimateGas(ethTx);

      return {
        success: true,
        gasEstimate: gasEstimate.toNumber(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Gas estimation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Simulate a call to a deposit transaction (callStatic equivalent)
   */
  async callStatic(rawTx: Buffer): Promise<CallSimulationResult> {
    try {
      // Parse the transaction
      const parsed = this.parser.parseTransaction(rawTx);

      if (!parsed.success || !parsed.transaction) {
        return {
          success: false,
          error: parsed.error || "Failed to parse transaction",
        };
      }

      const tx = parsed.transaction;

      // Validate the transaction
      const validation = this.parser.validateTransaction(tx);

      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(", ")}`,
        };
      }

      // Convert to standard Ethereum transaction
      const ethTx = this.parser.toEthereumTransaction(tx);

      // Simulate the call
      const result = await this.provider.call(ethTx);

      return {
        success: true,
        returnData: result,
        gasUsed: 0, // callStatic doesn't return gas used
      };
    } catch (error) {
      return {
        success: false,
        error: `Call simulation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Check if a transaction is a 0x7e deposit transaction
   */
  isDepositTransaction(rawTx: Buffer): boolean {
    return this.parser.isDepositTransaction(rawTx);
  }

  /**
   * Parse a raw transaction without processing it
   */
  parseTransaction(rawTx: Buffer): ParsedTransaction {
    return this.parser.parseTransaction(rawTx);
  }

  /**
   * Create a mock deposit transaction for testing
   */
  createMockTransaction(
    overrides: Partial<DepositTransaction> = {}
  ): DepositTransaction {
    return this.parser.createMockDepositTransaction(overrides);
  }

  /**
   * Get transaction hash for a deposit transaction
   */
  getTransactionHash(tx: DepositTransaction): string {
    return this.parser.getTransactionHash(tx);
  }

  /**
   * Encode a deposit transaction to RLP format
   */
  encodeTransaction(tx: DepositTransaction): Buffer {
    return this.parser.encodeTransaction(tx);
  }

  /**
   * Get human-readable transaction summary
   */
  getTransactionSummary(tx: DepositTransaction): string {
    return this.parser.getTransactionSummary(tx);
  }

  /**
   * Process multiple transactions in batch
   */
  async processBatch(rawTransactions: Buffer[]): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];

    for (const rawTx of rawTransactions) {
      const result = await this.processTransaction(rawTx);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate a transaction without processing it
   */
  validateTransaction(rawTx: Buffer): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const parsed = this.parser.parseTransaction(rawTx);

    if (!parsed.success || !parsed.transaction) {
      return {
        isValid: false,
        errors: [parsed.error || "Failed to parse transaction"],
        warnings: [],
      };
    }

    const validation = this.parser.validateTransaction(parsed.transaction);
    return validation;
  }
}
