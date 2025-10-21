# Architecture Documentation

## Overview

Precompile emulator registry and interface for ox-rollup project.

## Registry Design

### Core Interfaces

- **PrecompileContext**: Execution context with block info, addresses, gas price
- **PrecompileHandler**: Interface for precompile implementations
- **PrecompileRegistry**: Registry for managing and dispatching to handlers

### Implementation

`HardhatPrecompileRegistry` provides handler registration, lookup, and call delegation.

## Handler Contract

### ArbSys Handler (0x64)

- Address: `0x0000000000000000000000000000000000000064`
- Functions: arbChainID, arbBlockNumber, arbBlockHash, arbOSVersion

### ArbGasInfo Handler (0x6c)

- Address: `0x000000000000000000000000000000000000006c`
- Functions: getPricesInWei, getL1BaseFeeEstimate, getCurrentTxL1GasFees

## Address Format

Full 20-byte lowercase hex strings for all precompile addresses.

## Error Behavior

- Handler-level: Throws errors for invalid calldata/unknown selectors
- Registry-level: Returns structured error responses for unknown precompiles
- Format: `{ success: false, gasUsed: 0, error: "message" }`

## Plugin Integration

- `initArbitrumPatch()` function for initialization
- Configuration via `ArbitrumConfig` interface
- Registry attached to `hre.arbitrumPatch`

## Testing Strategy

- Unit tests for core functionality
- Integration tests for plugin bootstrap
- Smoke tests for component validation
