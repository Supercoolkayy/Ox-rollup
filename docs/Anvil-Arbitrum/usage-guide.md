# **Usage Guide**
---
**Anvil-Arbitrum** extends the standard **Anvil** command-line interface with additional flags specific to the Arbitrum environment.
It is designed to be a **drop-in replacement**, so all standard Anvil commands continue to work as expected.

---

##  **Enabling Arbitrum Mode**

The core feature is enabled by a single flag: `--arbitrum`.
When this flag is present, **Anvil-Arbitrum** activates the precompile handlers and enables support for the `0x7e` transaction type.

**Basic Command:**

```bash
anvil --arbitrum
```

---

##  **Arbitrum-Specific CLI Flags**

You can customize the local Arbitrum environment using the following flags.
These are only active when `--arbitrum` is enabled.

| **Flag**           | **Description**                                 | **Default Value**                             |
| ------------------ | ----------------------------------------------- | --------------------------------------------- |
| `--arbitrum`       | Enables Arbitrum mode.                          | `false`                                       |
| `--arb-chain-id`   | The chain ID for the Arbitrum network.          | `42161` (Arbitrum One)                        |
| `--arb-os-version` | The version of ArbOS to emulate.                | `20`                                          |
| `--l1-base-fee`    | The L1 base fee in wei for gas calculations.    | `20000000000` (20 gwei)                       |
| `--enable-tx7e`    | Enables parsing of `0x7e` deposit transactions. | `true` (when `--arbitrum` is active)          |
| `--mock-l1-bridge` | The address to use for the mock L1 bridge.      | `0x00...0064` (ArbSys address for simplicity) |

---

###  Example with Custom Configuration

This command starts an Anvil instance for a **custom Arbitrum testnet** with a specific chain ID and L1 base fee:

```bash
anvil --arbitrum --arb-chain-id 421614 --l1-base-fee 15000000000
```

---

##  **Integration with Standard Anvil Flags**

All **standard Anvil flags** are fully supported and passed directly to the underlying Anvil instance.
You can use them to configure your node’s port, host, accounts, and more.

---

###  Example: Combining Flags

This command starts **Anvil-Arbitrum** on a different port, sets a custom block time, and forks **Arbitrum One mainnet** from a specific block number:

```bash
anvil --arbitrum \
  --port 9545 \
  --host 0.0.0.0 \
  --accounts 15 \
  --block-time 5 \
  --fork-url https://arb1.arbitrum.io/rpc \
  --fork-block-number 150000000
```
