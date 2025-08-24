# @arbitrum/hardhat-patch

A Hardhat plugin that adds native support for Arbitrum precompiles to local development networks.

## Features

- **ArbSys Precompile (0x64)**: System-level utilities for L1↔L2 interactions
- **ArbGasInfo Precompile (0x6C)**: Gas pricing and L1 cost estimation
- **Modular Registry**: Easy to add new precompile handlers
- **Configurable**: Customize chain ID, ArbOS version, and gas pricing

## Installation

```bash
npm install @arbitrum/hardhat-patch
```

## Usage

### Basic Setup

```typescript
// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      // Enable Arbitrum features
      arbitrum: {
        enabled: true,
        chainId: 42161, // Arbitrum One
        arbOSVersion: 20
      }
    }
  }
};

export default config;
```

### Custom Configuration

```typescript
const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      arbitrum: {
        enabled: true,
        chainId: 421613, // Arbitrum Goerli
        arbOSVersion: 21,
        l1BaseFee: BigInt(15e9), // 15 gwei
        gasPriceComponents: {
          l2BaseFee: BigInt(2e9), // 2 gwei
          l1CalldataCost: BigInt(20), // 20 gas per byte
          l1StorageCost: BigInt(0),
          congestionFee: BigInt(1e8) // 0.1 gwei
        }
      }
    }
  }
};
```

### Programmatic Usage

```typescript
import { HardhatArbitrumPatch } from '@arbitrum/hardhat-patch';

// Create plugin instance
const arbitrumPatch = new HardhatArbitrumPatch({
  chainId: 42161,
  arbOSVersion: 20
});

// Access the registry
const registry = arbitrumPatch.getRegistry();

// Check if a precompile is supported
if (arbitrumPatch.hasHandler('0x0000000000000000000000000000000000000064')) {
  console.log('ArbSys precompile is available');
}

// List all handlers
const handlers = arbitrumPatch.listHandlers();
console.log('Available precompiles:', handlers.map(h => h.name));
```

## Supported Precompiles

### ArbSys (0x64)

- `arbChainID()` - Returns the Arbitrum chain ID
- `arbBlockNumber()` - Returns the current L2 block number
- `arbBlockHash(uint256)` - Returns block hash for given block number
- `arbOSVersion()` - Returns the current ArbOS version

### ArbGasInfo (0x6C)

- `getPricesInWei()` - Returns 5-tuple of gas price components
- `getL1BaseFeeEstimate()` - Returns estimated L1 base fee
- `getCurrentTxL1GasFees()` - Returns L1 gas fees for current transaction
- `getPricesInArbGas()` - Returns 3-tuple in ArbGas units

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Architecture

The plugin uses a modular registry system:

1. **Registry Interface**: Defines the contract for precompile handlers
2. **Handler Implementation**: Each precompile has its own handler class
3. **Plugin Integration**: Automatically registers handlers on Hardhat startup
4. **Configuration**: Supports customization of key parameters

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT
