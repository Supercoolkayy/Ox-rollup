# P2 Verification: Design Probes

**Status**: COMPLETED

## Overview

P2 involved designing minimal "probe" projects to empirically test current incompatibilities on unpatched Hardhat/Anvil.

## Verification Criteria

- [x] Hardhat probe project created
- [x] Foundry probe project created
- [x] Test contracts for precompiles implemented
- [x] 0x7e transaction probes implemented
- [x] Self-contained code and run steps provided

## Implementation Status

### Hardhat Probe Project

**Location**: `probes/hardhat/`

- **Contracts**: `ArbProbes.sol` - Interface stubs and test functions
- **Tests**: `test/arb-probes.ts` - Hardhat test suite
- **Scripts**: `scripts/probe-0x7e.ts` - 0x7e transaction probe
- **Config**: `hardhat.config.ts` - Standard configuration
- **Dependencies**: `package.json` - All required packages

### Foundry Probe Project

**Location**: `probes/foundry/`

- **Contracts**: `src/ArbProbes.sol` - Interface stubs and test functions
- **Tests**: `test/ArbProbes.t.sol` - Foundry test suite
- **Scripts**: `script/probe-0x7e.js` - 0x7e transaction probe
- **Config**: `foundry.toml` - Foundry configuration
- **Dependencies**: `forge-std` library installed

### Test Contract Features

- **ArbSys Interface**: `arbChainId()`, `arbBlockNumber()`
- **ArbGasInfo Interface**: `getCurrentTxL1GasFees()`
- **Precompile Addresses**: 0x64 and 0x6C correctly specified
- **Static Call Implementation**: Proper error handling and data decoding

### Probe Functionality

- **Precompile Testing**: Calls to ArbSys and ArbGasInfo methods
- **0x7e Transaction Testing**: Attempts to send deposit transactions
- **Error Capture**: Expected failures on unpatched nodes
- **Result Validation**: Proper error handling and logging

## Evidence Files

- `probes/hardhat/` - Complete Hardhat probe project
- `probes/foundry/` - Complete Foundry probe project
- All required files present and properly structured

## Test Results

**Status**: READY FOR TESTING

- Hardhat probes: Dependencies installed, ready to run
- Foundry probes: Dependencies installed, ready to run

## Issues Found

None - P2 implementation is complete and properly structured

## Verification Result

**P2: COMPLETED** - All probe projects created with self-contained code and run steps
