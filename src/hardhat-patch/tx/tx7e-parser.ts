/**
 * Transaction Type 0x7e Parser for Arbitrum Deposit Transactions
 *
 * Implements the Milestone 1 specification for parsing and validating
 * deposit transactions that originate from L1 and execute on L2.
 */

import { ethers } from "ethers";

/**
 * Deposit Transaction (0x7e) Interface
 * Based on Milestone 1 specification
 */
export interface DepositTransaction {
  type: 0x7e;
  sourceHash: string; // bytes32 - Unique deposit identifier
  from: string; // address - L1 sender (aliased if contract)
  to: string; // address - L2 recipient (or null for contract creation)
  mint: ethers.BigNumber; // uint256 - ETH value to mint on L2
  value: ethers.BigNumber; // uint256 - ETH value to transfer
  gasLimit: number; // uint64 - Gas limit for execution
  isCreation: boolean; // bool - Whether this creates a contract
  data: string; // bytes - Call data
  // Standard transaction fields for compatibility
  nonce: number;
  gasPrice: ethers.BigNumber;
  v: number;
  r: string;
  s: string;
}

/**
 * Parsed transaction result
 */
export interface ParsedTransaction {
  success: boolean;
  transaction?: DepositTransaction;
  error?: string;
}

/**
 * Validation result for deposit transactions
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 0x7e Transaction Parser
 *
 * Handles RLP decoding and validation of deposit transactions
 * according to Arbitrum's specification
 */
export class Tx7eParser {
  private readonly DEPOSIT_TX_TYPE = 126 as const;
  private readonly MIN_GAS_LIMIT = 21000;
  private readonly MAX_GAS_LIMIT = 30_000_000; // 30M gas limit

  /**
   * Parse a raw transaction buffer and detect if it's a 0x7e transaction
   */
  parseTransaction(rawTx: Buffer): ParsedTransaction {
    try {
      // Check if transaction starts with 0x7e
      if (rawTx.length === 0 || rawTx[0] !== this.DEPOSIT_TX_TYPE) {
        return {
          success: false,
          error: "Not a 0x7e deposit transaction",
        };
      }

      // Extract the RLP-encoded transaction data (skip the type byte)
      const rlpData = rawTx.slice(1);

      // Decode RLP data
      const decoded = ethers.utils.RLP.decode(rlpData);

      if (!Array.isArray(decoded) || decoded.length < 9) {
        return {
          success: false,
          error: "Invalid RLP encoding: insufficient fields",
        };
      }

      // Parse individual fields according to specification
      const transaction = this.parseFields(decoded);

      // Validate the parsed transaction
      const validation = this.validateTransaction(transaction);

      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(", ")}`,
        };
      }

      return {
        success: true,
        transaction,
      };
    } catch (error) {
      return {
        success: false,
        error: `Parsing failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Parse individual RLP fields into a DepositTransaction object
   */
  private parseFields(decoded: any[]): DepositTransaction {
    // RLP encoding order: [type, nonce, gasPrice, gasLimit, to, value, data, v, r, s]
    // Note: type is already extracted, so we start from index 0 for nonce

    const nonce = ethers.BigNumber.from(decoded[0]).toNumber();
    const gasPrice = ethers.BigNumber.from(decoded[1]);
    const gasLimit = ethers.BigNumber.from(decoded[2]).toNumber();
    const to = decoded[3] as string;
    const value = ethers.BigNumber.from(decoded[4]);
    const data = decoded[5] as string;
    const v = ethers.BigNumber.from(decoded[6]).toNumber();
    const r = decoded[7] as string;
    const s = decoded[8] as string;

    // Generate source hash for this deposit (in real Arbitrum, this comes from L1)
    const sourceHash = this.generateSourceHash({
      nonce,
      gasPrice,
      gasLimit,
      to,
      value,
      data,
      v,
      r,
      s,
    });

    // Determine if this is a contract creation
    const isCreation = to === ethers.constants.AddressZero && data.length > 0;

    // For deposit transactions, the 'from' address is typically the L1 sender
    // In our mock implementation, we'll use a default L1 bridge address
    const from = "0x0000000000000000000000000000000000000064"; // Mock L1 bridge

    // Mint value is the same as transfer value for simple deposits
    const mint = value;

    return {
      type: this.DEPOSIT_TX_TYPE,
      sourceHash,
      from,
      to,
      mint,
      value,
      gasLimit,
      isCreation,
      data,
      nonce,
      gasPrice,
      v,
      r,
      s,
    };
  }

  /**
   * Validate a parsed deposit transaction
   */
  validateTransaction(tx: DepositTransaction): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Type validation
    if (tx.type !== this.DEPOSIT_TX_TYPE) {
      errors.push("Invalid transaction type");
    }

    // Gas limit validation
    if (tx.gasLimit < this.MIN_GAS_LIMIT) {
      errors.push(`Gas limit too low: ${tx.gasLimit} < ${this.MIN_GAS_LIMIT}`);
    }
    if (tx.gasLimit > this.MAX_GAS_LIMIT) {
      errors.push(`Gas limit too high: ${tx.gasLimit} > ${this.MAX_GAS_LIMIT}`);
    }

    // Value validation
    if (tx.value.lt(0)) {
      errors.push("Value cannot be negative");
    }
    if (tx.mint.lt(0)) {
      errors.push("Mint value cannot be negative");
    }

    // Address validation
    if (!ethers.utils.isAddress(tx.from)) {
      errors.push("Invalid 'from' address");
    }
    if (
      tx.to !== ethers.constants.AddressZero &&
      !ethers.utils.isAddress(tx.to)
    ) {
      errors.push("Invalid 'to' address");
    }

    // Signature validation
    if (tx.v < 27 || tx.v > 28) {
      errors.push("Invalid signature 'v' value");
    }
    if (!ethers.utils.isHexString(tx.r, 32)) {
      errors.push("Invalid signature 'r' value");
    }
    if (!ethers.utils.isHexString(tx.s, 32)) {
      errors.push("Invalid signature 's' value");
    }

    // Data validation
    if (!ethers.utils.isHexString(tx.data)) {
      errors.push("Invalid calldata format");
    }

    // Contract creation validation
    if (tx.isCreation && tx.to !== ethers.constants.AddressZero) {
      errors.push("Contract creation must have 'to' address as zero");
    }

    // Warnings for potential issues
    if (tx.gasLimit > 1_000_000) {
      warnings.push("High gas limit may indicate inefficient contract");
    }
    // Check data size in bytes (each hex pair represents 1 byte)
    const dataSizeInBytes = tx.data === "0x" ? 0 : (tx.data.length - 2) / 2;
    if (dataSizeInBytes > 500) {
      // 500 bytes threshold
      warnings.push("Large calldata may incur high L1 costs");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate a mock source hash for testing purposes
   * In real Arbitrum, this would come from the L1 block containing the deposit
   */
  private generateSourceHash(txData: Partial<DepositTransaction>): string {
    const hashData = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256", "uint64", "address", "uint256", "bytes"],
      [
        txData.nonce || 0,
        txData.gasPrice || 0,
        txData.gasLimit || 0,
        txData.to || ethers.constants.AddressZero,
        txData.value || 0,
        txData.data || "0x",
      ]
    );

    return ethers.utils.keccak256(hashData);
  }

  /**
   * Convert a DepositTransaction to a standard Ethereum transaction format
   * for execution on the L2 EVM
   */
  toEthereumTransaction(
    tx: DepositTransaction
  ): ethers.providers.TransactionRequest {
    return {
      to: tx.to === ethers.constants.AddressZero ? undefined : tx.to,
      value: tx.value,
      gasLimit: tx.gasLimit,
      gasPrice: tx.gasPrice,
      nonce: tx.nonce,
      data: tx.data,
      // Note: We don't include type, v, r, s as these are handled by the parser
    };
  }

  /**
   * Create a mock deposit transaction for testing
   */
  createMockDepositTransaction(
    overrides: Partial<DepositTransaction> = {}
  ): DepositTransaction {
    const defaultTx: DepositTransaction = {
      type: this.DEPOSIT_TX_TYPE,
      sourceHash:
        "0x" +
        Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      from: "0x1234567890123456789012345678901234567890",
      to: "0x0987654321098765432109876543210987654321",
      mint: ethers.utils.parseEther("1.0"),
      value: ethers.utils.parseEther("0.5"),
      gasLimit: 21000,
      isCreation: false,
      data: "0x",
      nonce: 0,
      gasPrice: ethers.utils.parseUnits("20", "gwei"),
      v: 27,
      r:
        "0x" +
        Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      s:
        "0x" +
        Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
    };

    const result = { ...defaultTx, ...overrides };

    // Dynamically determine if this is a contract creation (only if not explicitly set)
    if (!("isCreation" in overrides)) {
      result.isCreation =
        (result.to === ethers.constants.AddressZero &&
          result.data &&
          result.data !== "0x" &&
          result.data.length > 0) ||
        false;
    }

    return result;
  }

  /**
   * Encode a deposit transaction back to RLP format
   */
  encodeTransaction(tx: DepositTransaction): Buffer {
    const rlpData = [
      tx.nonce === 0 ? "0x00" : `0x${tx.nonce.toString(16).padStart(2, "0")}`,
      tx.gasPrice.toHexString(),
      `0x${tx.gasLimit.toString(16)}`,
      tx.to,
      tx.value.toHexString(),
      tx.data && tx.data !== "0x" ? tx.data : "0x",
      `0x${tx.v.toString(16)}`,
      tx.r,
      tx.s,
    ];

    // RLP data is ready for encoding

    let encoded;
    try {
      encoded = ethers.utils.RLP.encode(rlpData);
    } catch (error) {
      throw error;
    }

    // Prepend the transaction type byte
    // Calculate the correct size: 1 byte for type + encoded data length
    const encodedData = encoded.slice(2); // Remove '0x' prefix
    const encodedBuffer = Buffer.from(encodedData, "hex");
    const result = Buffer.alloc(1 + encodedBuffer.length);

    result[0] = this.DEPOSIT_TX_TYPE;
    result.set(encodedBuffer, 1);

    // Transaction encoded successfully

    return result;
  }

  /**
   * Get transaction hash for a deposit transaction
   */
  getTransactionHash(tx: DepositTransaction): string {
    const encoded = this.encodeTransaction(tx);
    return ethers.utils.keccak256(encoded);
  }

  /**
   * Check if a transaction is a deposit transaction
   */
  isDepositTransaction(rawTx: Buffer): boolean {
    return rawTx.length > 0 && rawTx[0] === this.DEPOSIT_TX_TYPE;
  }

  /**
   * Get human-readable transaction summary
   */
  getTransactionSummary(tx: DepositTransaction): string {
    return `Deposit Transaction (0x7e):
  Source Hash: ${tx.sourceHash}
  From (L1): ${tx.from}
  To (L2): ${tx.to}
  Mint: ${ethers.utils.formatEther(tx.mint)} ETH
  Value: ${ethers.utils.formatEther(tx.value)} ETH
  Gas Limit: ${tx.gasLimit.toLocaleString()}
  Is Creation: ${tx.isCreation}
  Data Length: ${tx.data.length} bytes
  Nonce: ${tx.nonce}
  Gas Price: ${ethers.utils.formatUnits(tx.gasPrice, "gwei")} gwei`;
  }
}
