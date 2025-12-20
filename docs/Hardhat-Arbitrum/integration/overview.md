# **Arbitrum Precompile Shims for Local Testing**
---

Testing smart contracts that interact with Arbitrum's precompiles (ArbSys, ArbGasInfo) in a local Hardhat environment presents a challenge: these precompiles don't exist on a standard local EVM chain.

This plugin solves that problem by using shims—lightweight, mock contract implementations that are automatically deployed to the canonical precompile addresses on your local Hardhat network. This allows your tests to call Arbitrum-specific functions in a deterministic and predictable way, without needing a live testnet connection.

This overview focuses on the **Stylus-first shim mode**, which is the default and recommended way to use the plugin for local testing.

---

## **How It Works**

The plugin operates by deploying shim contracts to the addresses for ArbSys (`0x...64`) and ArbGasInfo (`0x...6c`). Your contracts and tests can then interact with these shims as if they were the real precompiles.

The data for these shims, particularly the gas price information for ArbGasInfo, is sourced in a specific order to give you maximum control and consistency:

* **Live Stylus RPC:** Fetches the latest gas data from a live network.
* **Local Config File:** Uses values from `precompiles.config.json` for deterministic testing.
* **Built-in Fallback:** A set of default values if no other source is available.

---

## **Configuration Files & Flags**

```
hardhat.config.js
    └─ arbitrum.runtime = "stylus"
    └─ arbitrum.precompiles.mode = "shim"

precompiles.config.json  (optional)
    └─ arbSysChainId
    └─ gas.pricesInWei      [6-tuple of gas values]
    └─ stylusRpc            (public or private RPC)
```

---

## **Plugin (index.ts)**

* Deploys shims to `0x…64` / `0x…6c` on your Hardhat network
* Provides a `reseed-shims` task to update shim data
* Includes validation scripts to confirm setup

---

## **Shim Contracts**

**ArbGasInfoShim.sol**

* `getPricesInWei()` -> returns seeded gas tuple
* `__seed(uint256[6])` -> internal function for reseeding

**ArbSysShim.sol**

* `arbChainID()` -> returns configured chainId

---

## **Key Features**

* **Stylus-First by Default:** The plugin is optimized for Stylus development, using its gas-price tuple format out of the box. Nitro runtimes are also supported as an opt-in.
* **Automatic Shim Deployment:** The shims are automatically placed at the correct addresses when you run your Hardhat network, requiring no manual setup.
* **Flexible Data Seeding:** Keep your local environment in sync with realistic on-chain data using the `arb:reseed-shims` task, which can pull data from a live Stylus RPC or a local config file.
* **Built-in Validation Scripts:** Run a simple command to confirm that the shims are deployed correctly and your contracts can successfully call the precompile functions.

---

## **Configuration**

You can configure the plugin through your `hardhat.config.js` file and an optional `precompiles.config.json`.

### Hardhat Configuration (`hardhat.config.js`)

```js
module.exports = {
  // ... your other config
  arbitrum: {
    runtime: "stylus", // "stylus" (default) or "nitro"
    precompiles: {
      mode: "auto", // "auto" (default) or "shim"
    },
  },
};
```

### JSON Configuration (`precompiles.config.json`)

This optional file allows you to lock down specific values for your tests.

```json
{
  "arbSysChainId": 42161,
  "gas": {
    "pricesInWei": [
      "100000000",
      "15000000000",
      "16",
      "0",
      "0",
      "0"
    ]
  },
  "stylusRpc": "[https://sepolia-rollup.arbitrum.io/rpc](https://sepolia-rollup.arbitrum.io/rpc)"
}
```

The `gas.pricesInWei` tuple order is: `[ perL2Tx, perL1CalldataFee, perStorageAllocation, perArbGasBase, perArbGasCongestion, perArbGasTotal ]`

---

## **Basic Usage Workflow**

* **Installation & Configuration:** Install the plugin and configure it in your `hardhat.config.js`.
* **Reseeding Data (Optional):** Run `npx hardhat arb:reseed-shims` to populate the `ArbGasInfoShim` with the latest gas data before running your tests.
* **Validation:** Run the validation scripts to ensure the shims are responding correctly to both direct calls and calls made from your smart contracts.

---

## **Glossary**

* **Shim:** A lightweight smart contract deployed at a canonical precompile address to emulate its behavior in a local EVM.
* **Stylus:** Arbitrum’s WASM-compatible execution environment. The plugin defaults to emulating a Stylus network environment.
* **Reseed:** The process of updating the data in the shim's storage, typically to reflect new gas prices from a live network or a config file.

---

## **Next Steps**

See the Setup & Configuration guide for detailed installation instructions.
Refer to the Commands & Validation guide for exact commands and expected outputs.
