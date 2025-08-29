# Arbitrum Local Development Compatibility Project

## Project Overview

**Goal**: Local testing patch that adds native support for Arbitrum precompiles (ArbSys at 0x64, ArbGasInfo at 0x6c) and transaction type 0x7e (deposits) to Hardhat and Foundry (Anvil).

**Why**: Today, Hardhat/Anvil can't call Arbitrum precompiles or parse 0x7e; devs must deploy to testnet to validate core flows.

## Milestone 1 Status: COMPLETED

Milestone 1 deliverables have been completed and are ready for review. All specifications have been gathered and documented:

### Deliverables Completed

1. **[Compatibility Matrix](docs/m1-compatibility-matrix.md)**

   - Comprehensive analysis of Arbitrum features vs Hardhat and Foundry
   - Priority-based feature categorization (P0, P1, P2)
   - Technical root cause analysis
   - Implementation feasibility assessment

2. **[Compatibility Matrix (CSV)](docs/m1-compatibility-matrix.csv)**

   - Machine-readable format for analysis
   - Detailed method-by-method compatibility status
   - Complexity and implementation notes

3. **[Technical Design Brief](docs/m1-design-brief.md)**

   - Implementation-ready design for engineers in M2
   - Architecture overview for both Hardhat and Foundry
   - Detailed implementation strategies
   - Configuration schemas and testing strategies

4. **[Technical Specifications](docs/m1-specification-details.md)**

   - Complete Arbitrum Nitro precompile specifications
   - Detailed function signatures and return types
   - Transaction type 0x7e envelope format and execution semantics
   - Method selectors and implementation priorities

5. **Probe Files** (Optional)
   - **[Hardhat Probes](probes/hardhat/)**
     - `test-arbsys-calls.js` - Tests ArbSys precompile functionality
     - `test-arbgasinfo.js` - Tests ArbGasInfo precompile functionality
     - `test-deposit-tx.js` - Tests deposit transaction (0x7e) support
   - **[Foundry Probes](probes/foundry/)**
     - `test-precompiles.sol` - Solidity tests for precompiles
     - `test-deposit-flow.sh` - Shell script for deposit transaction testing

## Continue Reading

For detailed information about the project implementation and current status:

- **[Milestone 2 Implementation](docs/milestone2/)** - Current development progress
- **[Verification Reports](docs/verification/)** - Quality assurance and validation
- **[Project Architecture](docs/milestone2/ARCH_STEP1.md)** - Technical design details

## Key Findings

### Current State

- **All target Arbitrum features are currently unsupported** in both Hardhat Network and Foundry Anvil
- Developers must deploy to testnet to validate Arbitrum-specific functionality
- No existing workarounds provide full local testing capabilities

### Implementation Feasibility

- **ArbSys Precompile (0x64)**: Medium complexity, minimal state requirements
- **ArbGasInfo Precompile (0x6c)**: High complexity, requires gas pricing algorithms
- **Transaction Type 0x7e**: High complexity, requires RLP parsing and new transaction flow

### Technical Approach

- **Hardhat**: Plugin architecture with EVM extension
- **Foundry**: revm precompile extension with transaction type support

## Next Steps (Milestone 2)

With Milestone 1 research complete, the project is ready to proceed to implementation:

1. **Plugin/Extension Development**

   - Hardhat plugin scaffolding
   - Anvil revm extension
   - Precompile registration mechanisms

2. **Core Feature Implementation**

   - P0 priority methods for both precompiles
   - Transaction type 0x7e parsing and execution
   - Basic gas calculation algorithms

3. **Testing & Validation**
   - Unit tests for each precompile method
   - Integration tests for deposit transactions
   - Performance regression testing

## Project Structure

```
ox-rollup/
├── docs/
│   ├── m1-compatibility-matrix.md      # Main compatibility analysis
│   ├── m1-compatibility-matrix.csv     # CSV format for analysis
│   ├── m1-design-brief.md              # Technical implementation guide
│   ├── m1-specification-details.md     # Complete technical specifications
│   ├── milestone2/                     # Current development progress
│   └── verification/                   # Quality assurance reports
├── probes/
│   ├── hardhat/                        # Hardhat testing scripts
│   │   ├── test-arbsys-calls.js
│   │   ├── test-arbgasinfo.js
│   │   └── test-deposit-tx.js
│   └── foundry/                        # Foundry testing scripts
│       ├── test-precompiles.sol
│       └── test-deposit-flow.sh
└── README.md                           # This file
```

## Running the Probes

### Hardhat Probes

```bash
# Navigate to a Hardhat project
cd your-hardhat-project

# Run individual probes
npx hardhat run probes/hardhat/test-arbsys-calls.js
npx hardhat run probes/hardhat/test-arbgasinfo.js
npx hardhat run probes/hardhat/test-deposit-tx.js
```

### Foundry Probes

```bash
# Navigate to a Foundry project
cd your-foundry-project

# Run Solidity tests
forge test --match-contract ArbitrumPrecompileTest -vvv

# Run shell script (requires jq and curl)
chmod +x probes/foundry/test-deposit-flow.sh
./probes/foundry/test-deposit-flow.sh
```

## Documentation

- **[Compatibility Matrix](docs/m1-compatibility-matrix.md)**: Comprehensive feature-by-feature analysis
- **[Design Brief](docs/m1-design-brief.md)**: Implementation-ready technical specifications
- **[Probe Files](probes/)**: Testing utilities for validation

## Dependencies

- **Hardhat**: JavaScript-based EVM with plugin architecture
- **Foundry**: Rust-based revm with performance focus
- **Arbitrum**: Layer 2 scaling solution with custom precompiles

## Notes

- All findings are based on current state analysis
- Implementation complexity estimates are preliminary
- Probe files provide validation capabilities for future development
- Design brief is ready for engineering team implementation

---

**Status**: Milestone 1 Complete  
**Next**: Ready for Milestone 2 Implementation
