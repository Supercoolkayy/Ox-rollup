# Technical Design Brief: Arbitrum Features for Local EVM Devnets

**Milestone 1 Research Deliverable**  
**Project**: Local testing patch for Arbitrum precompiles and transaction type 0x7e  
**Status**: Ready for Milestone 2 Implementation

## 1. Problem Statement

### Current State

Local EVM development environments (Hardhat Network and Foundry Anvil) lack support for core Arbitrum features:

- **ArbSys Precompile (0x64)**: System-level utilities for L1↔L2 interactions return `CALL_EXCEPTION` with empty data
- **ArbGasInfo Precompile (0x6c)**: Gas pricing and L1 cost estimation methods fail completely
- **Transaction Type 0x7e**: Deposit transactions are either rejected or processed without proper semantics

### Why Local EVMs Fail

1. **Precompile Registry**: Standard EVM implementations only recognize addresses 0x01-0x09, not Arbitrum-specific 0x64 and 0x6c
2. **Transaction Type Support**: EIP-2718 implementations lack support for custom type 0x7e
3. **Gas Model Mismatch**: Local EVMs use single gas pricing vs. Arbitrum's multi-component L1+L2 model
4. **State Isolation**: No mechanism to simulate L1→L2 bridge state and address aliasing

### Impact on Development

- Developers must deploy to Arbitrum testnets for any L1→L2 flow validation
- Gas optimization testing impossible without accurate L1 cost simulation
- Cross-chain contract testing requires live network deployment
- Development cycles extended by 10-30 minutes per test iteration

## 2. Scope (M2 Target)

### Core Features to Implement

1. **ArbSys Precompile Emulator (0x64)**

   - Read-only functions: `arbChainID()`, `arbBlockNumber()`, `arbBlockHash()`, `arbOSVersion()`
   - Address aliasing: `isL1ContractAddressAliased()`, `mapL1SenderContractAddressToL2Alias()`
   - L1→L2 messaging: `withdrawEth()`, `sendTxToL1()` (event emission only)

2. **ArbGasInfo Precompile Emulator (0x6c)**

   - Gas pricing: `getPricesInWei()`, `getPricesInArbGas()`
   - L1 cost estimation: `getL1BaseFeeEstimate()`, `getCurrentTxL1GasFees()`
   - Aggregator support: `getPricesInWeiWithAggregator()`, `getPricesInArbGasWithAggregator()`

3. **Transaction Type 0x7e Support**
   - RLP parsing and validation
   - Execution forwarding with proper context
   - Baseline gas accounting aligned with Nitro
   - Receipt generation with deposit-specific fields

### Packaging Strategy

- **Hardhat**: `@arbitrum/hardhat-patch` plugin with EVM extension
- **Foundry**: `anvil-arbitrum` crate extending revm precompile map

### Non-Goals (M2)

- Full retryable transaction semantics and outbox proofs
- Stylus WASM runtime support
- Advanced gas pricing (APGAS) algorithms
- L1 fee simulation beyond configurable mocks
- Cross-chain state synchronization

## 3. Architecture Overview

### 3.1 Precompile Emulator Registry

```typescript
interface PrecompileHandler {
  address: string;
  version: string;
  handleCall(
    calldata: Buffer,
    context: ExecutionContext
  ): Promise<PrecompileResult>;
  getConfig(): PrecompileConfig;
}

interface PrecompileRegistry {
  register(handler: PrecompileHandler): void;
  getHandler(address: string): PrecompileHandler | null;
  listHandlers(): PrecompileHandler[];
}
```

### 3.2 Handler Interface Design

```typescript
interface ExecutionContext {
  blockNumber: number;
  chainId: number;
  gasPrice: bigint;
  caller: string;
  callStack: string[];
  l1Context?: L1Context;
}

interface PrecompileResult {
  success: boolean;
  data?: Buffer;
  gasUsed: number;
  error?: string;
}

interface PrecompileConfig {
  chainId: number;
  arbOSVersion: number;
  l1BaseFee: bigint;
  gasPriceComponents: GasPriceComponents;
}
```

### 3.3 Transaction Type 0x7e Integration Points

#### Hardhat Network

```typescript
// Extend Hardhat's transaction processing pipeline
class DepositTransactionProcessor {
  parseTransaction(rawTx: Buffer): DepositTransaction | null;
  validateTransaction(tx: DepositTransaction): ValidationResult;
  executeTransaction(
    tx: DepositTransaction,
    context: ExecutionContext
  ): ExecutionResult;
}

// Hook into Hardhat's EVM
hardhatNetwork.evm.transactionProcessor.registerType(
  0x7e,
  new DepositTransactionProcessor()
);
```

#### Foundry Anvil

```rust
// Extend revm transaction types
#[derive(Debug, Clone)]
pub enum TransactionType {
    Legacy,
    Eip2930,
    Eip1559,
    Deposit(DepositTransaction), // New: 0x7e
}

// Transaction parsing extension
impl Transaction {
    pub fn decode_deposit(data: &[u8]) -> Result<Self, Error> {
        if data[0] != 0x7e {
            return Err(Error::InvalidTransactionType);
        }
        // Parse deposit transaction fields
        let decoded: Vec<Vec<u8>> = rlp::decode_list(&data[1..])?;
        // ... field parsing
    }
}
```

### 3.4 Configuration Surface

```typescript
interface ArbitrumConfig {
  chainId: number; // Default: 42161 (Arbitrum One)
  arbOSVersion: number; // Default: 20
  l1: {
    baseFee: bigint; // Default: 20 gwei
    gasPriceEstimate: bigint; // Default: 25 gwei
    feeModel: "static" | "dynamic"; // Default: 'static'
  };
  precompiles: {
    arbSys: { enabled: boolean; address: string };
    arbGasInfo: { enabled: boolean; address: string };
  };
  transactions: {
    depositType: { enabled: boolean; gasLimit: number };
  };
}
```

## 4. Detailed Design

### 4.1 ArbSys Emulator (0x64)

#### Supported Functions (P0 Priority)

```typescript
class ArbSysHandler implements PrecompileHandler {
  address = "0x0000000000000000000000000000000000000064";
  version = "1.0.0";

  async handleCall(
    calldata: Buffer,
    context: ExecutionContext
  ): Promise<PrecompileResult> {
    const selector = calldata.slice(0, 4);

    switch (selector.toString("hex")) {
      case "a3b1b31d": // arbChainID()
        return this.arbChainID(context);
      case "051038f2": // arbBlockNumber()
        return this.arbBlockNumber(context);
      case "4d2301cc": // arbBlockHash(uint256)
        return this.arbBlockHash(calldata, context);
      case "4d2301cc": // arbOSVersion()
        return this.arbOSVersion(context);
      default:
        return { success: false, gasUsed: 0, error: "Unknown selector" };
    }
  }

  private arbChainID(context: ExecutionContext): PrecompileResult {
    return {
      success: true,
      data: ethers.utils.defaultAbiCoder.encode(["uint256"], [context.chainId]),
      gasUsed: 3,
    };
  }

  private arbBlockNumber(context: ExecutionContext): PrecompileResult {
    return {
      success: true,
      data: ethers.utils.defaultAbiCoder.encode(
        ["uint256"],
        [context.blockNumber]
      ),
      gasUsed: 3,
    };
  }
}
```

#### Return Value Sources

- **Chain ID**: From configuration (default: 42161)
- **Block Number**: From local EVM context
- **Block Hash**: From local EVM block history (limited to 256 blocks)
- **OS Version**: From configuration (default: 20)

#### Error Semantics

- **Invalid Selector**: Return error with 0 gas used
- **Invalid Parameters**: Return error with minimal gas used
- **State Unavailable**: Return appropriate default values

### 4.2 ArbGasInfo Emulator (0x6c)

#### Read-Only Functions Implementation

```typescript
class ArbGasInfoHandler implements PrecompileHandler {
  address = "0x000000000000000000000000000000000000006C";
  version = "1.0.0";

  async handleCall(
    calldata: Buffer,
    context: ExecutionContext
  ): Promise<PrecompileResult> {
    const selector = calldata.slice(0, 4);

    switch (selector.toString("hex")) {
      case "4d2301cc": // getPricesInWei()
        return this.getPricesInWei(context);
      case "4d2301cc": // getL1BaseFeeEstimate()
        return this.getL1BaseFeeEstimate(context);
      case "4d2301cc": // getCurrentTxL1GasFees()
        return this.getCurrentTxL1GasFees(context);
      default:
        return { success: false, gasUsed: 0, error: "Unknown selector" };
    }
  }

  private getPricesInWei(context: ExecutionContext): PrecompileResult {
    const config = this.getConfig();
    const l2BaseFee = context.gasPrice;
    const l1BaseFee = config.l1.baseFee;
    const l1GasPrice = config.l1.gasPriceEstimate;

    return {
      success: true,
      data: ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256", "uint256", "uint256"],
        [l2BaseFee, l1BaseFee, 0, l2BaseFee, 0] // 5-tuple: L2 cost, L1 calldata, storage, base L2, congestion
      ),
      gasUsed: 10,
    };
  }
}
```

#### Mock Strategy for L1 Cost

- **Static Model**: Configurable L1 base fee and gas price estimates
- **Dynamic Model**: Simple formulas based on calldata size and transaction complexity
- **Aggregator Support**: Mock aggregator addresses with configurable pricing

### 4.3 Transaction Type 0x7e Implementation

#### Envelope Fields for M2

```typescript
interface DepositTransaction {
  type: 0x7e;
  sourceHash: string; // bytes32 - Unique deposit identifier
  from: string; // address - L1 sender (aliased if contract)
  to: string; // address - L2 recipient (or null for contract creation)
  mint: bigint; // uint256 - ETH value to mint on L2
  value: bigint; // uint256 - ETH value to transfer
  gasLimit: number; // uint64 - Gas limit for execution
  isCreation: boolean; // bool - Whether this creates a contract
  data: string; // bytes - Call data
}
```

#### Execution Model

```typescript
class DepositTransactionExecutor {
  async execute(
    tx: DepositTransaction,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    // 1. Validate transaction structure
    const validation = this.validateTransaction(tx);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 2. Resolve L1→L2 address aliasing
    const resolvedFrom = await this.resolveL1Address(tx.from, context);

    // 3. Mint ETH if specified
    if (tx.mint > 0) {
      await this.mintETH(resolvedFrom, tx.mint);
    }

    // 4. Execute transaction with proper context
    const executionContext = {
      ...context,
      caller: resolvedFrom,
      value: tx.value,
      gasLimit: tx.gasLimit,
    };

    // 5. Forward to standard transaction execution
    return await this.forwardToEVM(tx, executionContext);
  }
}
```

#### Baseline Gas Accounting

- **Base Cost**: 21,000 gas (standard transaction)
- **Calldata Cost**: 16 gas per byte (simplified L1 cost model)
- **L1 Fee Component**: Configurable multiplier for L1 gas costs
- **Deferred**: Complex L1 congestion modeling, calldata compression

### 4.4 Error Handling and Logging

#### Developer UX Strategy

```typescript
class ArbitrumErrorHandler {
  handlePrecompileError(error: PrecompileError, context: ErrorContext): string {
    const suggestions = this.getSuggestions(error, context);

    return `
  Arbitrum Precompile Error: ${error.message}
  Address: ${error.address}
  Selector: ${error.selector}
  Suggestion: ${suggestions}
 Docs: https://docs.arbitrum.io/precompiles
    `.trim();
  }

  private getSuggestions(
    error: PrecompileError,
    context: ErrorContext
  ): string {
    switch (error.type) {
      case "UNSUPPORTED_METHOD":
        return "This method is not yet implemented in the local emulator. Consider using a supported alternative or deploy to Arbitrum testnet.";
      case "INVALID_PARAMETERS":
        return "Check parameter types and ranges. Refer to Arbitrum documentation for expected formats.";
      case "STATE_UNAVAILABLE":
        return "Required state is not available in local environment. Configure mock values or use testnet.";
      default:
        return "Check configuration and ensure Arbitrum features are enabled.";
    }
  }
}
```

#### Logging Levels

- **DEBUG**: Method calls, parameter parsing, gas calculations
- **INFO**: Configuration changes, feature enablement
- **WARN**: Deprecated methods, configuration issues
- **ERROR**: Execution failures, validation errors

### 4.5 Testing Strategy

#### Unit Tests for Handlers

```typescript
describe("ArbSys Handler", () => {
  let handler: ArbSysHandler;
  let context: ExecutionContext;

  beforeEach(() => {
    handler = new ArbSysHandler();
    context = createMockContext();
  });

  it("should return correct chain ID", async () => {
    const result = await handler.handleCall(
      ethers.utils.hexlify(ethers.utils.id("arbChainID()").slice(0, 4)),
      context
    );

    expect(result.success).to.be.true;
    expect(
      ethers.utils.defaultAbiCoder.decode(["uint256"], result.data)[0]
    ).to.equal(42161);
  });
});
```

#### Golden Tests vs Arbitrum One

```typescript
describe("Arbitrum One Compatibility", () => {
  it("should match mainnet arbChainID()", async () => {
    // Local emulator
    const localResult = await localArbSys.arbChainID();

    // Arbitrum One RPC
    const mainnetResult = await arbitrumOneProvider.call({
      to: "0x0000000000000000000000000000000000000064",
      data: ethers.utils.id("arbChainID()"),
    });

    expect(localResult).to.equal(mainnetResult);
  });
});
```

## 5. Risks & Trade-offs

### 5.1 Technical Risks

| Risk                               | Impact | Mitigation                                                    |
| ---------------------------------- | ------ | ------------------------------------------------------------- |
| **Incomplete Precompile Coverage** | Medium | Implement P0 methods first, document limitations clearly      |
| **Fee Accuracy Limits**            | High   | Use configurable models, provide realistic defaults           |
| **Divergence from Nitro**          | High   | Regular testing against mainnet, version compatibility matrix |
| **Stylus Update Maintenance**      | Medium | Modular design, clear upgrade paths                           |

### 5.2 Implementation Trade-offs

- **Simplicity vs Accuracy**: Choose simple models for M2, enhance in future iterations
- **Performance vs Features**: Optimize for common use cases, lazy-load advanced features
- **Compatibility vs Innovation**: Maintain compatibility with existing tools, add value incrementally

## 6. Alternatives Considered

### 6.1 Contract-Level Mocks

- **Pros**: Easy to implement, no EVM modifications
- **Cons**: Gas costs differ, state management complex, limited transaction support
- **Decision**: Rejected - insufficient for comprehensive testing

### 6.2 Forking Arbitrum Nodes

- **Pros**: Full compatibility, real L1 state
- **Cons**: Resource intensive, slow startup, complex configuration
- **Decision**: Rejected - violates local development principle

### 6.3 RPC Shims

- **Pros**: No EVM changes, flexible routing
- **Cons**: Performance overhead, complex state synchronization
- **Decision**: Rejected - adds unnecessary complexity

## 7. Acceptance Criteria (for M2)

### Functional Requirements

- [ ] All P0 precompile methods return correct values
- [ ] Transaction type 0x7e can be parsed and executed
- [ ] Configuration system allows customization of key parameters
- [ ] Error messages provide actionable guidance for developers

### Compatibility Requirements

- [ ] Matrix items move from "Not Supported" → "Supported/Partial"
- [ ] Existing Hardhat/Foundry functionality unaffected
- [ ] Example projects run end-to-end without testnet deployment
- [ ] Performance regression < 10% for standard transactions

### Quality Requirements

- [ ] Unit test coverage > 90% for all handlers
- [ ] Integration tests pass against both Hardhat and Anvil
- [ ] Documentation covers installation, configuration, and troubleshooting
- [ ] Error handling provides clear developer guidance

### Deliverables

- [ ] `@arbitrum/hardhat-patch` npm package
- [ ] `anvil-arbitrum` crate for Foundry
- [ ] Example repositories demonstrating usage
- [ ] Comprehensive documentation and migration guides

---

**Next Steps**: Begin implementation with P0 tasks, starting with plugin scaffolding and basic precompile handlers.

**Success Metrics**: 90%+ compatibility matrix coverage, < 10% performance impact
