# **Arbitrum Local Development Compatibility Project**
---


## **Project Overview**

**Goal**: Local testing patch that adds native support for Arbitrum precompiles (ArbSys at 0x64, ArbGasInfo at 0x6c) and transaction type 0x7e (deposits) to Hardhat and Foundry (Anvil).

**Why**: Today, Hardhat/Anvil can't call Arbitrum precompiles or parse 0x7e; devs must deploy to testnet to validate core flows.


<br>
 


# **True Local Development for Arbitrum**

If you've built on `Arbitrum`, you know the challenge, your local development environment doesn't understand its unique on-chain features.

Standard tools like `Hardhat` and `Foundry` can't natively handle  `Arbitrum-specific precompiles` or `transaction types`, forcing a difficult choice:

` Either write inaccurate mocks or constantly deploy to a live testnet for basic validation.`

This friction **slows down innovation** and **adds complexity** to your workflow.

<br>
 


##  **The Arbitrum Local Dev Patch Solves This**

We have built a `lightweight, easy-to-install patch` that brings `native support for Arbitrum's core functionalities` directly into your local Hardhat and Foundry environments.

This tool closes the gap between **local testing** and **on-chain execution**, allowing you to **build, test, and iterate with confidence**.


<br>


##  **Key Features**

### **1. Test with High Fidelity**

Stop mocking and start emulating.
Our patch adds **native support** for Arbitrum’s most critical **precompiles**, allowing your smart contracts to interact with them just as they would on mainnet.

* **ArbSys (0x...64)** — Test logic that relies on `arbChainID()`, `arbBlockNumber()`, and other system-level information.
* **ArbGasInfo (0x...6c)** — Validate custom gas logic by calling functions like `getL1BaseFeeEstimate()` directly in your unit tests.

---

### **2. Simulate Cross-Chain Interactions**

Confidently test applications that rely on **L1-to-L2 messaging**.
The patch extends local testnets to **parse, decode, and execute** Arbitrum’s unique **deposit transactions (0x7e)**.

This enables end-to-end local testing for:

* Retryable tickets
* L1-initiated contract deployments and calls
* Any system that depends on bridging assets or data

---

### **3. Accelerate Your Workflow**

Instead of waiting minutes for a testnet deployment to validate a single change, **get instant feedback** from your local test suite.

By enabling **true local unit testing** for Arbitrum-specific features, our patch:

* Dramatically **speeds up development cycles**
* **Reduces debugging time**
* **Improves iteration efficiency**

<br>


##  **Who Is This For?**

This tool is designed for **any developer building within the Arbitrum ecosystem**, including:

* Teams on **Arbitrum One**, **Nova**, and **Stylus**
* Developers working with **cross-chain messaging** or **retryable tickets**
* Projects implementing **custom gas logic**
* Frameworks and dApps building on the **Orbit appchain stack**

<br>



##  **Available Tools**

Our solution is delivered as **two distinct packages** to integrate with your preferred development environment:

### **Hardhat Patch** — `@dappsoverapps.com/hardhat-patch`
`Plugin architecture with EVM extension`
* A simple **npm package** that extends the Hardhat Network to support **Arbitrum precompiles** and the **0x7e transaction type**.


### **Anvil Fork** — `anvil-arbitrum`

* A custom **fork of Anvil** that embeds the same powerful emulation features, activated with a simple `--arbitrum` flag.
It works as a **drop-in replacement** for the standard `anvil` binary.

### **Foundry** -

* revm precompile extension with transaction type support

<br>

## **Running the Probes**

### Hardhat Probes

```bash
# Navigate to a Hardhat project
cd your-hardhat-project

# install @dappsoverapps.com/hardhat-patch
npm install --save-dev @dappsoverapps.com/hardhat-patch

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

<br>
 

## Dependencies

- **Hardhat**: JavaScript-based EVM with plugin architecture
- **Foundry**: Rust-based revm with performance focus
- **Arbitrum**: Layer 2 scaling solution with custom precompiles

<br>
 

## Notes

- All findings are based on current state analysis
- Implementation complexity estimates are preliminary
- Probe files provide validation capabilities for future development
- Design brief is ready for engineering team implementation

