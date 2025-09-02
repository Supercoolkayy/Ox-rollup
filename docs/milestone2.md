# Milestone 2: Arbitrum Precompile & 0x7e Transaction Support

This document provides comprehensive setup instructions, testing guides, and expected outputs for Milestone 2 of the ox-rollup project.

## Overview

Milestone 2 implements:
- **ArbSys Precompile**: Chain ID, block number, OS version, L1 messaging
- **ArbGasInfo Precompile**: Gas pricing, L1 fee estimation, gas calculations
- **Transaction Type 0x7e**: Deposit transaction support
- **Hardhat Plugin Integration**: Seamless integration with Hardhat development environment
- **TypeScript Test Suite**: Comprehensive testing with 82 passing tests

## Prerequisites

### System Requirements
- **Node.js**: v18.x or v20.x (recommended: v20.x)
- **Rust**: Latest stable toolchain
- **Git**: For version control
- **WSL**: For Windows users (recommended)

### Development Tools
- **VS Code** or **Cursor**: Recommended IDE
- **Hardhat**: Ethereum development framework
- **Foundry**: For Solidity testing (optional)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd ox-rollup

# Install Node.js dependencies
npm install

# Install Rust dependencies
cd crates/anvil-arbitrum
cargo fetch
cd ../..
```

### 2. Environment Setup

```bash
# Ensure you're in WSL (for Windows users)
wsl

# Verify Node.js version
node --version  # Should be 18.x or 20.x

# Verify Rust installation
rustc --version
cargo --version
```

### 3. Build the Project

```bash
# Build TypeScript
npm run build

# Build Rust components
cd crates/anvil-arbitrum
cargo build --release
cd ../..
```

## Arbitrum Configuration

### Enabling Arbitrum Flags

The project supports Arbitrum precompiles through configuration flags:

#### Hardhat Configuration
```typescript
// hardhat.config.ts
import "../../src/hardhat-patch";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 42161, // Arbitrum chain ID
    },
  },
  // Configure Arbitrum patch
  arbitrum: {
    enabled: true,
    chainId: 42161,
    arbOSVersion: 20,
    l1BaseFee: BigInt("20000000000"), // 20 gwei
  },
};
```

#### Environment Variables
```bash
# Enable debug logging
export DEBUG=true

# Set custom gas configuration
export ARBITRUM_L1_BASE_FEE=20000000000
export ARBITRUM_CHAIN_ID=42161
```

### Precompile Addresses

| Precompile | Address | Functionality |
|------------|---------|---------------|
| ArbSys | `0x0000000000000000000000000000000000000064` | Chain info, L1 messaging |
| ArbGasInfo | `0x000000000000000000000000000000000000006c` | Gas pricing, L1 fees |

## Testing Guide

### 1. Unit Tests

```bash
# Run all TypeScript unit tests
npm run test:unit

# Run specific test suites
npm test -- --grep "ArbSys"
npm test -- --grep "ArbGasInfo"
npm test -- --grep "0x7e"
```

### 2. Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run specific integration tests
npm test -- --grep "E2E Deposit Flow"
npm test -- --grep "Golden Test"
```

### 3. Stress Tests

```bash
# Run stress tests
npm run test:stress

# Run load tests
node tests/load/simple-stress.js
node tests/load/tx-stress.js
```

### 4. Rust Tests

```bash
# Run Rust precompile tests
cd crates/anvil-arbitrum
cargo test

# Run with verbose output
cargo test --verbose

# Run specific test modules
cargo test arb_sys
cargo test arb_gas_info
```

### 5. Hardhat Integration Tests

```bash
# Run Hardhat probe tests
cd probes/hardhat
npm install
npx hardhat test

# Validate precompiles
npx hardhat run scripts/validate-precompiles.js

# Test 0x7e transactions
npx hardhat run scripts/probe-0x7e.ts
```

### 6. Foundry Tests

```bash
# Run Foundry tests
cd probes/foundry
forge test

# Run with gas reporting
forge test --gas-report
```

## Expected Test Outputs

### 1. TypeScript Test Suite (82 tests)

```
  E2E Deposit Flow Integration
    ERC20 Contract Deployment
      ✔ should deploy with correct initial state
      ✔ should allow token transfers
    ArbSys Precompile Integration
      ✔ should return correct chain ID
    ArbGasInfo Precompile Integration
      ✔ should return correct gas information
    0x7e Transaction Simulation
      ✔ should handle deposit transaction format
      ✔ should validate precompile calls within deposit context
    State Validation
      ✔ should maintain consistent state after operations
    Integration with Hardhat Arbitrum Patch
      ✔ should have precompile handlers registered
      ✔ should handle precompile calls correctly

  ArbGasInfo Precompile Handler
    Basic ArbGasInfo Methods
      ✔ should handle getPricesInWei() correctly
      ✔ should handle getL1BaseFeeEstimate() correctly
      ✔ should handle getCurrentTxL1GasFees() correctly
      ✔ should handle getPricesInArbGas() correctly
    Gas Calculation Accuracy
      ✔ should calculate L1 gas fees correctly for different calldata sizes
      ✔ should handle large calldata sizes correctly
      ✔ should respect custom gas price components
    Configuration and Customization
      ✔ should initialize with default configuration
      ✔ should handle custom chain ID configuration
      ✔ should provide human-readable gas configuration summary
    Error Handling
      ✔ should handle unknown function selectors gracefully
      ✔ should handle invalid calldata gracefully
    Integration with HardhatArbitrumPatch
      ✔ should be properly registered in the patch
      ✔ should handle calls through the patch registry
    Gas Model Implementation
      ✔ should implement Nitro baseline gas algorithm correctly
      ✔ should handle zero calldata correctly
      ✔ should handle single byte calldata correctly

  ArbSys Precompile Handler
    Basic ArbSys Methods
      ✔ should handle arbChainID() correctly
      ✔ should handle arbBlockNumber() correctly
      ✔ should handle arbOSVersion() correctly
    sendTxToL1 Functionality
      ✔ should handle sendTxToL1() correctly
      ✔ should reject sendTxToL1 with invalid calldata length
    Address Aliasing Functionality
      ✔ should handle mapL1SenderContractAddressToL2Alias() correctly
      ✔ should reject mapL1SenderContractAddressToL2Alias with invalid calldata length
    Configuration and Customization
      ✔ should respect custom chain ID configuration
      ✔ should use default configuration when not specified
    Error Handling
      ✔ should handle unknown function selectors gracefully
      ✔ should handle invalid calldata gracefully
    Integration with HardhatArbitrumPatch
      ✔ should be properly registered in the patch
      ✔ should handle calls through the patch registry

  Plugin Bootstrap
    initArbitrumPatch
      ✔ should initialize plugin when enabled
      ✔ should not initialize plugin when disabled
      ✔ should respect config.enabled setting
      ✔ should initialize with default configuration
    Plugin Integration
      ✔ should provide working registry methods
      ✔ should handle precompile calls through registry

  Precompile Registry
    Handler Registration
      ✔ should register handlers successfully
      ✔ should prevent duplicate registration
      ✔ should retrieve handlers by address
      ✔ should return null for non-existent handlers
    Handler Functionality
      ✔ should handle ArbSys arbChainID() call
      ✔ should handle ArbSys arbBlockNumber() call
      ✔ should handle ArbGasInfo getPricesInWei() call
      ✔ should handle ArbGasInfo getL1BaseFeeEstimate() call
    Error Handling
      ✔ should reject calls to non-existent precompiles gracefully
      ✔ should handle invalid calldata gracefully
      ✔ should handle unknown function selectors gracefully
    HardhatArbitrumPatch Integration
      ✔ should initialize with default configuration
      ✔ should initialize with custom configuration
      ✔ should register handlers on initialization
      ✔ should be disabled when configured
    Configuration Validation
      ✔ should handle BigInt configuration values

  Simple Transaction Type 0x7e Support
    Basic Functionality
      ✔ should create a parser instance
      ✔ should create mock deposit transactions
      ✔ should validate deposit transactions correctly
      ✔ should reject invalid transaction types
      ✔ should provide human-readable transaction summaries
    Transaction Properties
      ✔ should have correct transaction type
      ✔ should have valid addresses
      ✔ should have valid signature components
      ✔ should have reasonable gas values

  Transaction Type 0x7e Support
    Tx7eParser
      ✔ should create mock deposit transactions
      ✔ should validate deposit transactions correctly
      ✔ should reject invalid transaction types
      ✔ should reject transactions with gas limit too low
      ✔ should reject transactions with gas limit too high
      ✔ should reject negative values
      ✔ should reject invalid addresses
      ✔ should reject invalid signature values
      ✔ should detect contract creation correctly
      ✔ should generate transaction hashes
      ✔ should encode transactions to RLP format
      ✔ should provide human-readable transaction summaries

  82 passing (3s)
```

### 2. Hardhat Plugin Initialization

```
Arbitrum precompile handlers registered successfully
   ArbSys: 0x0000000000000000000000000000000000000064
   ArbGasInfo: 0x000000000000000000000000000000000000006c
✅ Hardhat Arbitrum Patch initialized
```

### 3. Precompile Validation Output

```
🔍 Validating Arbitrum Precompiles in Hardhat Context...

✅ Arbitrum patch found in HRE
📋 Found 2 precompile handlers:
   ArbSys: 0x0000000000000000000000000000000000000064
   ArbGasInfo: 0x000000000000000000000000000000000000006c

🔧 Testing ArbSys arbChainID...
✅ ArbSys arbChainID returned: 42161

⛽ Testing ArbGasInfo getL1BaseFeeEstimate...
✅ ArbGasInfo getL1BaseFeeEstimate returned: 20000000000 wei (20 gwei)

📄 Testing contract deployment and precompile calls...
✅ ArbProbes contract deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
⚠️  Contract ArbSys call failed (expected for unpatched nodes): call revert exception
⚠️  Contract ArbGasInfo call failed (expected for unpatched nodes): call revert exception

🎉 Precompile validation completed!
```

### 4. Rust Test Output

```
running 15 tests
test arb_sys::tests::test_arb_chain_id ... ok
test arb_sys::tests::test_arb_block_number ... ok
test arb_sys::tests::test_arb_os_version ... ok
test arb_sys::tests::test_send_tx_to_l1 ... ok
test arb_sys::tests::test_map_l1_sender_contract_address_to_l2_alias ... ok
test arb_gas_info::tests::test_get_prices_in_wei ... ok
test arb_gas_info::tests::test_get_l1_base_fee_estimate ... ok
test arb_gas_info::tests::test_get_current_tx_l1_gas_fees ... ok
test arb_gas_info::tests::test_get_prices_in_arb_gas ... ok
test precompiles::tests::test_precompile_registry ... ok
test precompiles::tests::test_arb_sys_precompile ... ok
test precompiles::tests::test_arb_gas_info_precompile ... ok
test tx7e::tests::test_tx7e_parser ... ok
test tx7e::tests::test_tx7e_processor ... ok
test integration::tests::test_end_to_end_flow ... ok

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

## Troubleshooting

### Common Issues

1. **Node.js Version Issues**
   ```bash
   # Use nvm to switch Node.js versions
   nvm use 20
   ```

2. **Rust Compilation Errors**
   ```bash
   # Update Rust toolchain
   rustup update
   cargo clean
   cargo build
   ```

3. **Hardhat Plugin Not Loading**
   ```bash
   # Check plugin import in hardhat.config.ts
   import "../../src/hardhat-patch";
   ```

4. **Test Timeouts**
   ```bash
   # Increase timeout for slow tests
   npm test -- --timeout 30000
   ```

### Debug Mode

Enable debug logging for detailed output:

```bash
export DEBUG=true
npm test
```

## Performance Benchmarks

### Test Execution Times
- **Unit Tests**: ~3 seconds (82 tests)
- **Integration Tests**: ~5 seconds
- **Stress Tests**: ~10 seconds
- **Rust Tests**: ~2 seconds (15 tests)
- **Hardhat Tests**: ~5 seconds

### Memory Usage
- **Node.js Process**: ~100MB
- **Rust Process**: ~50MB
- **Total Test Suite**: ~150MB

## CI/CD Integration

The project includes GitHub Actions workflows that run:
- Multi-version Node.js testing (18.x, 20.x)
- Rust compilation and testing
- TypeScript compilation and testing
- Integration and stress testing
- Artifact upload for logs and build outputs

## Next Steps

After completing Milestone 2:
1. **Milestone 3**: Full EVM integration
2. **Performance Optimization**: Gas cost optimization
3. **Production Deployment**: Mainnet integration
4. **Documentation**: API documentation and examples

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test logs in `tests/logs/`
3. Enable debug mode for detailed output
4. Check CI/CD artifacts for automated test results