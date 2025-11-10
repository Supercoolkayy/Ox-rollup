# **Getting Started with Anvil-Arbitrum**
---
This guide will walk you through the process of setting up and running **Anvil-Arbitrum** on your local machine.

<br>

##  **Prerequisites**

Before you begin, ensure you have the following installed:

* **Rust (version 1.70 or higher)**
  Anvil-Arbitrum is built with Rust.
  You can install it using `rustup` by following the official instructions at [rust-lang.org](https://www.rust-lang.org/).

* **Foundry**
  While not required to run Anvil-Arbitrum itself, **Foundry** (specifically `forge`) is necessary for running integration tests and interacting with the node.
  You can install it by following the instructions at [getfoundry.sh](https://getfoundry.sh).


<br>

##  **Installation**

Follow these steps to build the **Anvil-Arbitrum** binary from source.

### **1. Clone the Repository**

First, clone the project repository from GitHub to your local machine and navigate into the project directory:

```bash
git clone https://github.com/Supercoolkayy/ox-rollup.git
cd ox-rollup
```

---

### **2. Build the Crate**

Next, navigate to the `anvil-arbitrum` crate directory and build the project in release mode for optimal performance:

```bash
cd crates/anvil-arbitrum
cargo build --release
```

After the build process completes, the executable binary will be located at:

```
target/release/anvil
```

---

### **3. (Optional) Install Locally**

For easier access, you can install the binary to your Cargo path.
This allows you to run **Anvil-Arbitrum** from any directory:

```bash
cargo install --path .
```


<br>

##  **Running Anvil-Arbitrum**

Once the build is complete, you can start the local testnet node.

### **1. Start the Server**

To run Anvil with Arbitrum support enabled, use the `--arbitrum` flag:

```bash
./target/release/anvil --arbitrum
```

You should see output indicating that **Anvil** has started, along with a list of available accounts and their private keys.
The node will be listening for RPC requests on the default address:

```
http://127.0.0.1:8545
```

---

### **2. Verifying the Setup**

To confirm that the node is running correctly with Arbitrum features, you can interact with it using **forge**.

In a new terminal, run the following command to query the chain ID from the running node:

```bash
cast chain-id --rpc-url http://127.0.0.1:8545
```

Since you started with the `--arbitrum` flag, it should return the default **Arbitrum One** chain ID:

```
42161
```

