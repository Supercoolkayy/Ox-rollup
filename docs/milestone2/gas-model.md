# Arbitrum Nitro Gas Model

**Milestone 2: Gas Model Documentation**  
**Project**: Local testing patch for Arbitrum precompiles

## Overview

This document describes the gas model implementation for the ArbGasInfo precompile handler in the Hardhat Arbitrum Patch plugin. The gas model approximates Nitro's baseline gas calculations for local development and testing.

## Gas Model Components

### 1. L2 Base Fee
- **Default**: 1 gwei (1,000,000,000 wei)
- **Purpose**: Base cost for L2 transaction execution
- **Configurable**: Via plugin configuration or gas config file

### 2. L1 Calldata Cost
- **Default**: 16 gas per byte
- **Purpose**: Cost for data posted to L1 (calldata compression)
- **Algorithm**: `calldataSize * l1CalldataCost * l1BaseFee`

### 3. L1 Storage Cost
- **Default**: 0 gas (Nitro has no storage gas concept)
- **Purpose**: Reserved for future use or custom implementations
- **Note**: Always 0 in current Nitro implementation

### 4. Congestion Fee
- **Default**: 0 gas (no congestion fee by default)
- **Purpose**: Dynamic fee adjustment based on network congestion
- **Configurable**: Via plugin configuration

### 5. L1 Base Fee
- **Default**: 20 gwei (20,000,000,000 wei)
- **Purpose**: Base fee for L1 gas price estimation
- **Source**: Configurable or read from mock oracle

## Gas Calculation Algorithms

### getCurrentTxL1GasFees()
```typescript
function calculateL1GasFees(calldata: Uint8Array, l1BaseFee: bigint): bigint {
  const calldataSize = calldata.length;
  const l1GasUsed = calldataSize * 16; // 16 gas per byte
  return l1GasUsed * l1BaseFee;
}
```

### getPricesInWei()
Returns 5-tuple: `(l2BaseFee, l1CalldataCost, l1StorageCost, baseL2GasPrice, congestionFee)`

### getPricesInArbGas()
Returns 3-tuple: `(l2BaseFee, l1CalldataCost, l1StorageCost)` in ArbGas units

## Configuration Options

### Plugin Configuration
```typescript
const config = {
  l1BaseFee: BigInt(20e9), // 20 gwei
  gasPriceComponents: {
    l2BaseFee: BigInt(1e9), // 1 gwei
    l1CalldataCost: BigInt(16), // 16 gas per byte
    l1StorageCost: BigInt(0), // No storage gas
    congestionFee: BigInt(0), // No congestion fee
  },
};
```

### Gas Config File
```json
{
  "l1BaseFee": "20000000000",
  "gasPriceComponents": {
    "l2BaseFee": "1000000000",
    "l1CalldataCost": "16",
    "l1StorageCost": "0",
    "congestionFee": "0"
  }
}
```

## Implementation Notes

### Function Selectors
- `getPricesInWei()`: `0x4d2301cc`
- `getL1BaseFeeEstimate()`: `0x4d2301cc`
- `getCurrentTxL1GasFees()`: `0x4d2301cc`
- `getPricesInArbGas()`: `0x4d2301cc`

### Data Encoding
- All return values are encoded as 32-byte uint256 values
- Multi-value returns use consecutive 32-byte slots
- Little-endian encoding for BigInt values

### Error Handling
- Invalid calldata length throws descriptive errors
- Unknown function selectors return clear error messages
- Gas calculation failures are handled gracefully

## Future Enhancements

### Dynamic Gas Pricing
- Real-time L1 base fee updates
- Network congestion monitoring
- Calldata compression ratio adjustments

### Advanced Aggregators
- Custom gas price aggregator support
- Multi-aggregator fallback mechanisms
- Historical gas price analysis

### Performance Optimizations
- Cached gas calculations
- Batch processing for multiple calls
- Gas estimation pre-computation

## Testing Strategy

### Unit Tests
- Individual function selector handling
- Gas calculation accuracy
- Configuration validation
- Error handling scenarios

### Integration Tests
- Registry integration
- Plugin configuration
- Hardhat environment setup
- Real-world usage patterns

### Performance Tests
- Gas calculation speed
- Memory usage optimization
- Large calldata handling
- Concurrent call processing
