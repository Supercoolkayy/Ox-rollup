# **Testing Guide**
---
**Anvil-Arbitrum** is designed to integrate seamlessly into a **Foundry-based testing workflow**.
This guide explains how to run the project's **internal tests** and provides examples for testing your own **Arbitrum-aware smart contracts**.

---

## **Running the Internal Test Suite**

The project includes both:

* **Unit Tests** → For individual components
* **Integration Tests** → To verify the behavior of the running node

---

###  **1. Run Unit Tests**

The **Rust unit tests** check the logic of configuration, precompile handlers, and transaction parsing **without needing to run a full Anvil instance**.

```bash
# Navigate to the crate directory
cd crates/anvil-arbitrum

# Run the tests
cargo test
```

---

###  **2. Run Integration Tests**

The integration tests use **Foundry’s forge** to interact with a running **Anvil-Arbitrum instance**.
These tests deploy smart contracts and call precompiles to ensure they behave as expected.

#### Step 1: Start the Anvil-Arbitrum Node

```bash
# From the crates/anvil-arbitrum directory
./target/release/anvil --arbitrum --port 8545 &
```

#### Step 2: Run the Forge Tests

In another terminal:

```bash
# From the root of the repository
cd probes/foundry

# Run the forge tests against the local node
forge test --fork-url http://127.0.0.1:8545
```

#### Step 3: Stop the Anvil Server

```bash
pkill anvil
```

---

## **Testing Your Own Contracts**

To test your own smart contracts with **Anvil-Arbitrum**, simply **point your testing framework** to the **local RPC endpoint**.

---

### **Example with Foundry**

Let’s say you have a contract that uses **ArbSys** to check the chain ID.

---

####  **Contract (`MyContract.sol`)**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ArbSys} from "@arbitrum/nitro-contracts/src/precompiles/ArbSys.sol";

contract MyContract {
    ArbSys constant ARB_SYS = ArbSys(address(100));
    uint256 public constant ARBITRUM_ONE_CHAIN_ID = 42161;

    function requireIsArbitrumOne() public view {
        require(
            ARB_SYS.arbChainID() == ARBITRUM_ONE_CHAIN_ID,
            "Not on Arbitrum One"
        );
    }
}
```

---

####  **Test (`MyContract.t.sol`)**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/MyContract.sol";

contract MyContractTest is Test {
    MyContract myContract;

    function setUp() public {
        myContract = new MyContract();
    }

    function test_RequireIsArbitrumOne() public {
        // This test will pass when run against Anvil-Arbitrum
        myContract.requireIsArbitrumOne();
    }
}
```

---

### **Running the Test**

#### Step 1: Start Anvil-Arbitrum

```bash
anvil --arbitrum
```

#### Step 2: Run Forge Tests

If your `foundry.toml` doesn’t specify an RPC URL, `forge test` will default to `http://127.0.0.1:8545`.

```bash
forge test
```

**Result:**
The test will **pass** because **Anvil-Arbitrum** correctly handles the `arbChainID()` call and returns the **default value of `42161`**.

**If run against a standard Anvil or Hardhat node**, it would **fail**, as those environments lack support for Arbitrum precompiles.
