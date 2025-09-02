# Milestone 2: Arbitrum Precompile & 0x7e Transaction Support

This document provides comprehensive setup instructions, usage examples, and testing procedures for Milestone 2 of the ox-rollup project.

## Overview

Milestone 2 implements Arbitrum-specific features within an Anvil (Foundry) fork, including:

- **ArbSys Precompile** (0x64): Chain ID, block number, OS version queries
- **ArbGasInfo Precompile** (0x6C): L1 gas fee calculations and price information
- **0x7e Transaction Type**: Deposit transaction parsing and processing
- **Hardhat Integration**: Plugin for seamless development workflow

## Prerequisites

### System Requirements

- **Rust**: 1.70+ (for core precompile implementation)
- **Node.js**: 18+ (for TypeScript/JavaScript components)
- **Git**: Latest version
- **WSL2** (Windows users) or **Linux/macOS**

### Required Tools

- **Cargo**: Rust package manager
- **npm**: Node.js package manager
- **Foundry**: Ethereum development toolkit (optional, for advanced testing)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ox-rollup
```

### 2. Install Rust Dependencies

```bash
cd crates/anvil-arbitrum
cargo build
```

### 3. Install Node.js Dependencies

```bash
npm install
```

### 4. Build TypeScript Components

```bash
npm run build
```

## Configuration

### Arbitrum Configuration

The system supports various Arbitrum configurations through CLI flags or configuration files:

#### CLI Flags

```bash
# Enable Arbitrum features
--arbitrum

# Set chain ID (default: 42161 for Arbitrum One)
--arb-chain-id 42161

# Set ArbOS version (default: 20)
--arb-os-version 20

# Set L1 base fee in wei (default: 20 gwei)
--l1-base-fee 20000000000

# Enable 0x7e transaction processing
--enable-tx7e
```

#### Configuration File

Create `node_state/gas_config.json`:

```json
{
  "chainId": 42161,
  "arbOSVersion": 20,
  "l1BaseFee": "20000000000",
  "gasPriceComponents": {
    "l2BaseFee": "1000000000",
    "l1CalldataCost": "16",
    "l1StorageCost": "0",
    "congestionFee": "0"
  }
}
```

## Usage

### Running the Rust Implementation

#### Basic Usage

```bash
cd crates/anvil-arbitrum
cargo run -- --arbitrum --enable-tx7e
```

#### With Custom Configuration

```bash
cargo run -- \
  --arbitrum \
  --arb-chain-id 421613 \
  --arb-os-version 21 \
  --l1-base-fee 15000000000 \
  --enable-tx7e
```

### Using the Hardhat Plugin

#### 1. Install the Plugin

```bash
npm install ./src/hardhat-patch
```

#### 2. Configure Hardhat

```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-arbitrum-patch");

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 42161,
    },
  },
  arbitrum: {
    enabled: true,
    chainId: 42161,
    arbOSVersion: 20,
    l1BaseFee: "20000000000",
  },
};
```

#### 3. Use in Scripts

```javascript
// scripts/test-precompiles.js
const { HardhatArbitrumPatch } = require("hardhat-arbitrum-patch");

async function main() {
  const patch = new HardhatArbitrumPatch({
    chainId: 42161,
    arbOSVersion: 20,
  });

  const registry = patch.getRegistry();

  // Test ArbSys
  const arbSysCalldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // arbChainID()
  const result = await registry.handleCall(
    "0x0000000000000000000000000000000000000064",
    arbSysCalldata,
    {
      blockNumber: 12345,
      chainId: 42161,
      gasPrice: BigInt(1e9),
      caller: "0x...",
      callStack: [],
    }
  );

  console.log("ArbSys result:", result);
}

main().catch(console.error);
```

## Testing

### Running All Tests

#### Complete Test Suite

```bash
npm run test:all
```

This command runs:

1. Rust unit tests (`cargo test`)
2. TypeScript unit tests (`npm run test:unit`)
3. Integration tests (`npm run test:integration`)
4. Stress tests (`npm run test:stress`)

#### Individual Test Categories

**Rust Tests:**

```bash
npm run test:rust
```

**TypeScript Unit Tests:**

```bash
npm run test:unit
```

**Integration Tests:**

```bash
npm run test:integration
```

**Stress Tests:**

```bash
npm run test:stress
```

### Test Categories

#### 1. Unit Tests

- **Rust**: Precompile handlers, transaction parsing, configuration
- **TypeScript**: Plugin initialization, registry management

#### 2. Integration Tests

- **E2E Deposit Flow**: ERC20 deployment + 0x7e transaction processing
- **Golden Tests**: Local vs forked Arbitrum RPC comparison
- **Precompile Integration**: ArbSys and ArbGasInfo functionality

#### 3. Stress Tests

- **Transaction Processing**: 500 sequential deposit transactions
- **Memory Leak Detection**: Long-running operation validation
- **Performance Metrics**: Response time and resource usage

### Expected Test Outputs

#### Successful Rust Tests

```
running 21 tests
test arbitrum::tests::test_config_validation ... ok
test arbitrum::tests::test_default_config ... ok
test precompiles::tests::test_arbgasinfo_calls ... ok
test precompiles::tests::test_arbsys_calls ... ok
test tx7e::tests::test_transaction_parsing ... ok
...

test result: ok. 21 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

#### Successful Integration Tests

```
  E2E Deposit Flow Integration
    ERC20 Contract Deployment
      ✓ should deploy with correct initial state
      ✓ should allow token transfers
    ArbSys Precompile Integration
      ✓ should return correct chain ID
    ArbGasInfo Precompile Integration
      ✓ should return correct gas information
    Integration with Hardhat Arbitrum Patch
      ✓ should have precompile handlers registered
      ✓ should handle precompile calls correctly

  6 passing (2.5s)
```

#### Successful Stress Tests

```
🧪 Running Transaction Stress Test...
Processing 500 transactions...
✅ All transactions processed successfully
📊 Results:
   - Total Transactions: 500
   - Success Rate: 100%
   - Average Duration: 4.80ms
   - Memory Growth: 0.60 MB
   - No memory leaks detected
```

## Troubleshooting

### Common Issues

#### 1. Rust Compilation Errors

**Problem**: `cargo build` fails
**Solution**:

```bash
# Update Rust toolchain
rustup update
# Clean and rebuild
cargo clean && cargo build
```

#### 2. TypeScript Module Resolution

**Problem**: `Cannot find module` errors
**Solution**:

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
# Rebuild TypeScript
npm run build
```

#### 3. Hardhat Context Errors

**Problem**: `HardhatError: HH5: HardhatContext is not created`
**Solution**: Ensure tests run within Hardhat environment or use standalone validation scripts.

#### 4. Precompile Address Conflicts

**Problem**: Handler already registered errors
**Solution**: Check for duplicate registrations in test setup.

### Debug Mode

Enable verbose logging:

```bash
# Rust
RUST_LOG=debug cargo test

# TypeScript
DEBUG=* npm test
```

## Performance Benchmarks

### Expected Performance Metrics

| Test Category        | Transactions/sec | Memory Usage | CPU Usage |
| -------------------- | ---------------- | ------------ | --------- |
| ArbSys Calls         | 10,000+          | < 50MB       | < 5%      |
| ArbGasInfo Calls     | 8,000+           | < 50MB       | < 5%      |
| 0x7e Processing      | 5,000+           | < 100MB      | < 10%     |
| Stress Test (500 tx) | 100+             | < 200MB      | < 15%     |

### Optimization Tips

1. **Use Connection Pooling**: Reuse provider connections
2. **Batch Operations**: Group multiple calls when possible
3. **Memory Management**: Clear unused handlers and caches
4. **Async Processing**: Use non-blocking operations

## API Reference

### Core Classes

#### HardhatArbitrumPatch

```typescript
class HardhatArbitrumPatch {
  constructor(config?: ArbitrumConfig);
  getRegistry(): HardhatPrecompileRegistry;
  getConfig(): ArbitrumConfig;
  hasHandler(address: string): boolean;
  listHandlers(): PrecompileHandler[];
}
```

#### Tx7eParser

```typescript
class Tx7eParser {
  readonly DEPOSIT_TX_TYPE: number;
  parseTransaction(rawTx: Buffer): ParsedTransaction;
  validateTransaction(tx: DepositTransaction): ValidationResult;
  createMockDepositTransaction(
    overrides?: Partial<DepositTransaction>
  ): DepositTransaction;
}
```

### Precompile Addresses

| Precompile | Address | Functions                                            |
| ---------- | ------- | ---------------------------------------------------- |
| ArbSys     | 0x64    | `arbChainID()`, `arbBlockNumber()`, `arbOSVersion()` |
| ArbGasInfo | 0x6C    | `getL1BaseFeeEstimate()`, `getCurrentTxL1GasFees()`  |

### Function Selectors

| Function                  | Selector     | Description                             |
| ------------------------- | ------------ | --------------------------------------- |
| `arbChainID()`            | `0xa3b1b31d` | Returns Arbitrum chain ID               |
| `arbBlockNumber()`        | `0x051038f2` | Returns current block number            |
| `arbOSVersion()`          | `0x4d2301cc` | Returns ArbOS version                   |
| `getL1BaseFeeEstimate()`  | `0x4d2301cc` | Returns L1 base fee estimate            |
| `getCurrentTxL1GasFees()` | `0x4d2301cc` | Returns current transaction L1 gas fees |

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run full test suite
5. Submit pull request

### Code Style

- **Rust**: Follow rustfmt and clippy guidelines
- **TypeScript**: Use ESLint and Prettier
- **Tests**: Maintain >90% coverage

### Testing Guidelines

1. Write unit tests for new functionality
2. Add integration tests for complex flows
3. Include stress tests for performance-critical code
4. Update documentation for API changes

## Support

### Getting Help

- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check this guide and inline comments

### Reporting Bugs

Include:

- Environment details (OS, Rust/Node versions)
- Error messages and stack traces
- Steps to reproduce
- Expected vs actual behavior

## License

This project is licensed under the MIT License - see the LICENSE file for details.
