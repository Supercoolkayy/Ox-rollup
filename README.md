# Arbitrum Local Development Compatibility Project

## 1\. Project Overview

**Goal**: To create local testing patches that add native support for Arbitrum-specific features to Hardhat and Foundry (Anvil).

**Why**: Standard local EVM nodes like Hardhat Network and Anvil cannot execute or parse core Arbitrum functionality. This includes calls to precompiles like `ArbSys` and `ArbGasInfo` or the L1-to-L2 `0x7e` deposit transaction type. This forces developers to deploy to a live testnet to validate core flows, which is slow and inefficient.

This project provides the necessary tools to enable high-fidelity local testing of Arbitrum-specific logic.

-----

## 2\. Technical Approach
**Deposit Transaction (0x7e) Support**: The node can natively parse and execute Arbitrum's unique L1-to-L2 deposit transactions, enabling local testing of retryable tickets. also
The project provides two different solutions tailored to each development environment.

### For Foundry (Anvil)

This solution provides a specialized version of Anvil patched to natively support Arbitrum's chain-specific features.

  * **Native Precompile Emulation**: Provides built-in emulation for `ArbSys` (at `0x...64`) and `ArbGasInfo` (at `0x...6c`).
  * **Seamless Activation**: Arbitrum-specific features are enabled with a simple `--arbitrum` command-line flag.

### For Hardhat

This solution uses a Hardhat plugin that deploys **shims**—lightweight, mock contract implementations—to the canonical precompile addresses on your local Hardhat network.

  * **Shim Contracts**: Deploys `ArbSysShim.sol` and `ArbGasInfoShim.sol` to `0x...64` and `0x...6c` respectively, allowing your tests to interact with them as if they were the real precompiles.
  * **Stylus-First by Default**: The plugin is optimized for Stylus development, using its 6-tuple gas-price format out of the box.
  * **Flexible Data Seeding**: The shims can be "seeded" with realistic on-chain data in a flexible order:
    1.  Fetches live data from a `stylusRpc` (e.g., Arbitrum Sepolia).
    2.  Uses deterministic values from a local `precompiles.config.json` file.
    3.  Uses built-in fallback values if no other source is available.

-----

## 3\. Developer Documentation

All technical specifications, compatibility analyses, and implementation designs are located in the `/docs` directory.

  * **[Technical Design Brief](docs/design-brief.md)**: The primary implementation-ready design for engineers, covering architecture for both Hardhat and Foundry.
  * **[Compatibility Matrix](docs/compatibility-matrix.md)**: A comprehensive analysis of Arbitrum features vs. Hardhat and Foundry, including priority and feasibility.
  * **[Technical Specifications](docs/Architecture-and-Internals/full-implements.md)**: Complete specifications for Arbitrum Nitro precompiles and the `0x7e` transaction type.
  * **[Anvil Implementation Details](docs/Anvil-Arbitrum/)**: Documentation specific to the Anvil patch.
  * **[Hardhat Implementation Details](docs/Hardhat-Arbitrum/)**: Documentation specific to the Hardhat plugin and shims.
  * **[Project Architecture](docs/Architecture-and-Internals/phase-2/)**: Further technical design details.

-----

## 4\. Project Structure

```
ox-rollup/
├── docs/
│   ├── Anvil-Arbitrum/               # Anvil patch implementation docs
│   ├── Architecture-and-Internals/  # Low-level specs and design docs
│   ├── Hardhat-Arbitrum/            # Hardhat plugin implementation docs
│   ├── compatibility-matrix.csv     # Machine-readable compatibility data
│   ├── compatibility-matrix.md    # Main compatibility analysis
│   ├── design-brief.md              # Core technical implementation guide
│   └── specification-details.md     # (Legacy) Now in Architecture-and-Internals
├── probes/
│   ├── hardhat/                        # Hardhat testing scripts
│   └── foundry/                        # Foundry testing scripts
├── crates/                             # Rust crates (for Anvil patch)
├── src/                                # Typescript source (for Hardhat plugin)
└── README.md                           
```

-----

## 5\. Running Tests (Probes)

The `/probes` directory contains test suites used to validate the functionality of the patches and shims.

### Hardhat Probes

These scripts test the Hardhat plugin and its shims.

```bash
# Navigate to a Hardhat project using the plugin
cd your-hardhat-project

# install dev
npm install --save-dev @dappsoverapps.com/hardhat-patch

# Run individual probes
npx hardhat run probes/hardhat/test-arbsys-calls.js
npx hardhat run probes/hardhat/test-arbgasinfo.js
npx hardhat run probes/hardhat/test-deposit-tx.js
```

### Foundry Probes

These tests validate the patched Anvil node.

```bash
# Navigate to a Foundry project
cd your-foundry-project

# Run Solidity tests
forge test --match-contract ArbitrumPrecompileTest -vvv

# Run shell script (requires jq and curl)
chmod +x probes/foundry/test-deposit-flow.sh
./probes/foundry/test-deposit-flow.sh
```