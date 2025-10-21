# **Configuration**
---
**Anvil-Arbitrum** provides flexible configuration options to tailor the local testing environment to your specific needs.
You can configure the node using a **JSON file** or **environment variables**, which can also be combined with CLI flags.

<br>


##  **Configuration File**

For complex or frequently used setups, a **JSON configuration file** is the most convenient method.

### **1. Create a `config.json` file**

Create a file named `config.json` with the desired settings.
The structure should match the fields in `ArbitrumConfig`.

```json
{
  "chain_id": 421614,
  "arb_os_version": 21,
  "l1_base_fee": 15000000000,
  "gas_price_components": {
    "l2_base_fee": 800000000,
    "l1_calldata_cost": 16,
    "l1_storage_cost": 0,
    "congestion_fee": 0
  },
  "tx7e_enabled": true,
  "mock_l1_bridge": "0x0000000000000000000000000000000000000064"
}
```

---

### **2. Load the Configuration**

Use the `--gas-config` CLI flag to specify the path to your configuration file when starting the node.

```bash
anvil --arbitrum --gas-config config.json
```

> **Note:** CLI flags override any settings defined in the JSON file.
> For instance, if you set `chain_id` in `config.json` but also provide `--arb-chain-id 42161` on the command line,
> the value `42161` will be used.

<br>


##  **Environment Variables**

You can also configure **Anvil-Arbitrum** using environment variables.
This is especially useful for **CI/CD environments** or for making temporary adjustments without modifying files.

The following environment variables are supported:

| **Variable**                 | **Corresponding Flag** |
| ---------------------------- | ---------------------- |
| `ANVIL_ARBITRUM_CHAIN_ID`    | `--arb-chain-id`       |
| `ANVIL_ARBITRUM_OS_VERSION`  | `--arb-os-version`     |
| `ANVIL_ARBITRUM_L1_BASE_FEE` | `--l1-base-fee`        |

<br>


###  **Example**

```bash
export ANVIL_ARBITRUM_CHAIN_ID=421614
export ANVIL_ARBITRUM_L1_BASE_FEE=15000000000

anvil --arbitrum
```

This will start **Anvil-Arbitrum** with:

* Chain ID: `421614`
* L1 base fee: `15 gwei`

---

##  **Order of Precedence**

The configuration is applied in the following order —
with later sources **overriding** earlier ones:

1. **Default Values:** Hardcoded defaults in the application.
2. **Configuration File:** Values from the JSON file loaded via `--gas-config`.
3. **Environment Variables:** Values set in the environment.
4. **CLI Flags:** Arguments passed directly on the command line.

