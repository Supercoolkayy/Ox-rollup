# Anvil-Arbitrum

An extended version of [Anvil](https://github.com/foundry-rs/foundry/tree/master/anvil) with Arbitrum precompile support and 0x7e transaction type parsing.

## Features

- **Arbitrum Precompile Support**: Implements ArbSys and ArbGasInfo precompiles
- **0x7e Transaction Type**: Full support for Arbitrum deposit transactions
- **Configurable Gas Model**: Customizable L1/L2 gas pricing
- **CLI Integration**: Seamless integration with existing Anvil commands

## Prerequisites

- Rust 1.70+ ([Install Rust](https://rustup.rs/))
- Foundry (for testing) ([Install Foundry](https://getfoundry.sh/))

## Building

### 1. Clone the Repository

```bash
git clone https://github.com/Supercoolkayy/ox-rollup.git
cd ox-rollup
```

### 2. Build the Crate

```bash
cd crates/anvil-arbitrum
cargo build --release
```

The binary will be available at `target/release/anvil`.

### 3. Install Locally (Optional)

```bash
cargo install --path .
```

## Usage

### Basic Usage

```bash
# Start Anvil with Arbitrum support
./target/release/anvil --arbitrum

# Start with custom configuration
./target/release/anvil --arbitrum --chain-id 421613 --arb-os-version 21
```

### Arbitrum-Specific Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--arbitrum` | Enable Arbitrum mode | `false` |
| `--chain-id` | Arbitrum chain ID | `42161` (Arbitrum One) |
| `--arb-os-version` | ArbOS version | `20` |
| `--l1-base-fee` | L1 base fee in wei | `20000000000` (20 gwei) |
| `--enable-tx7e` | Enable 0x7e transaction parsing | `true` |
| `--mock-l1-bridge` | Mock L1 bridge address | `0x0000000000000000000000000000000000000064` |

### Standard Anvil Flags

All standard Anvil flags are supported and will be forwarded to the underlying Anvil instance:

```bash
./target/release/anvil --arbitrum --port 8545 --host 0.0.0.0 --accounts 10
```

## Configuration

### Environment Variables

```bash
export ANVIL_ARBITRUM_CHAIN_ID=421613
export ANVIL_ARBITRUM_OS_VERSION=21
export ANVIL_ARBITRUM_L1_BASE_FEE=15000000000
```

### Configuration File

Create a JSON configuration file:

```json
{
  "chain_id": 421613,
  "arb_os_version": 21,
  "l1_base_fee": 15000000000,
  "gas_price_components": {
    "l2_base_fee": 800000000,
    "l1_calldata_cost": 16,
    "l1_storage_cost": 0,
    "congestion_fee": 0
  },
  "tx7e_enabled": true,
  "mock_l1_bridge": "0x0000000000000000000000000000000000000064"
}
```

Load the configuration:

```bash
./target/release/anvil --arbitrum --gas-config config.json
```

## Precompile Support

### ArbSys (0x64)

| Function | Selector | Description |
|----------|----------|-------------|
| `arbChainID()` | `0xa3b1b31d` | Returns the Arbitrum chain ID |
| `arbBlockNumber()` | `0x051038f2` | Returns the current L2 block number |
| `arbOSVersion()` | `0x4d2301cc` | Returns the current ArbOS version |

### ArbGasInfo (0x6C)

| Function | Selector | Description |
|----------|----------|-------------|
| `getCurrentTxL1GasFees()` | `0x4d2301cc` | Returns L1 gas fees for current transaction |
| `getPricesInWei()` | `0x4d2301cc` | Returns 5-tuple of gas price components |
| `getL1BaseFeeEstimate()` | `0x4d2301cc` | Returns estimated L1 base fee |

## 0x7e Transaction Support

The extended Anvil supports Arbitrum's 0x7e transaction type for deposit transactions.

### Transaction Format

```
[0x7e][RLP encoded transaction data]
```

### RLP Fields

1. `nonce` - Transaction nonce
2. `gasPrice` - Gas price in wei
3. `gasLimit` - Gas limit
4. `to` - Recipient address (None for contract creation)
5. `value` - Value in wei
6. `data` - Call data
7. `v` - Signature recovery value
8. `r` - Signature R component
9. `s` - Signature S component

### Example Usage

```bash
# Start Anvil with 0x7e support
./target/release/anvil --arbitrum --enable-tx7e

# In another terminal, test with Forge
forge test --fork-url http://127.0.0.1:8545
```

## Testing

### Run Unit Tests

```bash
cargo test
```

### Run Integration Tests

```bash
# Start Anvil with Arbitrum support
./target/release/anvil --arbitrum --port 8545 &

# Run Forge tests
cd ../../probes/foundry
forge test --fork-url http://127.0.0.1:8545

# Stop Anvil
pkill anvil
```

### Test Precompiles

```solidity
// Test ArbSys
ArbSys arbSys = ArbSys(0x0000000000000000000000000000000000000064);
uint256 chainId = arbSys.arbChainID();
uint256 version = arbSys.arbOSVersion();

// Test ArbGasInfo
ArbGasInfo arbGasInfo = ArbGasInfo(0x000000000000000000000000000000000000006c);
uint256 l1Fees = arbGasInfo.getCurrentTxL1GasFees();
```

## Development

### Project Structure

```
src/
├── main.rs              # Main entry point
├── cli.rs               # Command line interface
├── arbitrum.rs          # Arbitrum configuration
├── precompiles.rs       # Precompile implementations
└── tx7e.rs             # 0x7e transaction support
```

### Adding New Precompiles

1. Implement the `PrecompileHandler` trait
2. Register the handler in `PrecompileRegistry::default()`
3. Add tests in the `tests` module

### Adding New CLI Flags

1. Add the flag to `AnvilArbitrumArgs` in `cli.rs`
2. Handle the flag in `main.rs`
3. Update the configuration accordingly

## Troubleshooting

### Common Issues

**Build fails with dependency errors**
```bash
# Update Rust
rustup update

# Clean and rebuild
cargo clean
cargo build
```

**Anvil fails to start**
```bash
# Check if port is in use
lsof -i :8545

# Use different port
./target/release/anvil --arbitrum --port 8546
```

**Precompiles not working**
```bash
# Verify Arbitrum mode is enabled
./target/release/anvil --arbitrum --help

# Check logs for configuration errors
RUST_LOG=debug ./target/release/anvil --arbitrum
```

### Debug Mode

```bash
# Enable debug logging
RUST_LOG=debug ./target/release/anvil --arbitrum

# Build with debug symbols
cargo build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Acknowledgments

- [Foundry](https://github.com/foundry-rs/foundry) - The original Anvil implementation
- [Arbitrum](https://arbitrum.io/) - The L2 scaling solution
- [Ethers.rs](https://github.com/gakonst/ethers-rs) - Ethereum library for Rust
