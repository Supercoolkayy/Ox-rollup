# Milestone 3 — Setup & Configuration (Stylus-first Shims)

This document describes installation and configuration for the **Stylus-first** precompile shims used in Milestone 3. Scope is limited to shim mode, reseeding from a Stylus RPC, and validation via Hardhat scripts.

---

## 1) Prerequisites

* **Node.js:** v22 LTS recommended.
* **Hardhat:** project includes `@nomicfoundation/hardhat-ethers` (ethers v6).
* **Repository layout (relevant parts):**

  ```
  src/hardhat-patch/
    index.ts
    arbitrum-patch.ts
    native-precompiles.ts
    shims/
      ArbSysShim.json
      ArbGasInfoShim.json

  probes/hardhat/
    hardhat.config.js
    precompiles.config.json            (optional)
    contracts/
      ArbSysShim.sol
      ArbGasInfoShim.sol
    tasks/
      arb-reseed-shims.js              (task name: arb:reseed-shims)
    scripts/
      predeploy-precompiles.js         (preinstall bytecode at 0x…64/0x…6c)
      install-and-check-shims.js       (one-shot install + verify)
      check-gasinfo-local.js           (read getPricesInWei())
      validate-precompiles.js          (end-to-end probe)
  ```

---

## 2) Configuration

### 2.1 `hardhat.config.js` (Stylus-first defaults)

```js
require("@nomicfoundation/hardhat-ethers");
require("@arbitrum/hardhat-patch");     // plugin entry

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: { chainId: 42161 },
    // optional persistent node:
    // localhost: { url: "http://127.0.0.1:8549", chainId: 42161 }
  },
  arbitrum: {
    enabled: true,
    runtime: "stylus",                  // stylus-first
    precompiles: { mode: "auto" },      // tries native in future; shims today
    // stylusRpc: "https://sepolia-rollup.arbitrum.io/rpc", // optional default
  },
};
```

* `runtime: "stylus"` marks Stylus as the default runtime flavor.
* `precompiles.mode: "auto"` enables lazy shim installation and reseeding logic in this milestone (native hooks can be introduced in a later phase).

### 2.2 `precompiles.config.json` (optional)

```json
{
  "arbSysChainId": 42161,
  "runtime": "stylus",
  "gas": {
    "pricesInWei": ["69440", "496", "2000000000000", "100000000", "0", "100000000"]
  },
  "stylusRpc": "https://sepolia-rollup.arbitrum.io/rpc"
}
```

* `gas.pricesInWei` must be a **6-tuple in shim order**:

  ```
  [ l2BaseFee, l1BaseFeeEstimate, l1CalldataCost, l1StorageCost, congestionFee, aux ]
  ```
* If both `stylusRpc` and `gas.pricesInWei` are provided, the reseed task prioritizes RPC first (see §3.4).

### 2.3 Environment variables (optional but recommended)

* `STYLUS_RPC` — RPC endpoint for Stylus (e.g., `https://sepolia-rollup.arbitrum.io/rpc`).
* `ARB_PRECOMPILES_CONFIG` — path override to a non-default `precompiles.config.json`.
* **Stability toggles (helpful on WSL/docker):**

  * `NODE_OPTIONS=--dns-result-order=ipv4first`
  * `NODE_NO_HTTP2=1`

Example:

```bash
export NODE_OPTIONS=--dns-result-order=ipv4first
export NODE_NO_HTTP2=1
export STYLUS_RPC=https://sepolia-rollup.arbitrum.io/rpc
```

---

## 3) Shim installation & reseeding

Two flows are supported: **ephemeral** (in-process Hardhat VM) and **persistent** (a running Hardhat node on a port, e.g., 8549). Both end up with shims at the canonical addresses:

* **ArbSys**   — `0x0000000000000000000000000000000000000064`
* **ArbGasInfo** — `0x000000000000000000000000000000000000006c`

### 3.1 Ephemeral Hardhat (fastest loop)

This mode spins up a fresh in-process Hardhat network per command.

```bash
# Install + verify shims in a single run (one-shot script)
npx hardhat --config hardhat.config.js run scripts/install-and-check-shims.js
```

Expected output (example):

```
getPricesInWei(): [ '69440', '496', '2000000000000', '100000000', '0', '100000000' ]
✅ shims installed, seeded, and verified in one run.
```

### 3.2 Persistent Hardhat node (HTTP)

Run a node and point “localhost” at it:

```bash
# Start persistent node on 8549
npx hardhat node --port 8549
# …leave running in this terminal

# In another terminal:
# Optional: set environment stability toggles and Stylus RPC
export NODE_OPTIONS=--dns-result-order=ipv4first
export NODE_NO_HTTP2=1
export STYLUS_RPC=https://sepolia-rollup.arbitrum.io/rpc
```

Add (or ensure) in `hardhat.config.js`:

```js
networks: {
  localhost: { url: "http://127.0.0.1:8549", chainId: 42161 },
}
```

Predeploy shim bytecode to the node:

```bash
npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js
# Example:
# ArbSys code len: 582 ArbGasInfo code len: 1600
# ✅ Shims predeployed at 0x...64 and 0x...6c
```

### 3.3 Reseed from Stylus (preferred)

```bash
# Reseed using Stylus RPC (explicit flag)
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus
```

Examples:

* Success:

  ```
  ℹ️ fetched from Stylus: [
    '26440960','188864','2000000000000','100000000','0','100000000'
  ]
  ✅ Re-seeded getPricesInWei -> [
    '26440960','188864','2000000000000','100000000','0','100000000'
  ]
  ```

* Temporary failure (falls back to config/default):

  ```
  ⚠️  RPC fetch failed (https://sepolia-rollup.arbitrum.io/rpc): fetch failed
  ℹ️ Stylus/Nitro RPC unavailable; will try other sources.
  ℹ️ using JSON/config (shim order): [ '69440','496','2000000000000','100000000','0','100000000' ]
  ✅ Re-seeded getPricesInWei -> [ '69440','496','2000000000000','100000000','0','100000000' ]
  ```

### 3.4 Source priority (reseeding)

1. **Stylus RPC** (flag `--stylus` or `stylusRpc`/`STYLUS_RPC` available)
2. **`precompiles.config.json`** (`gas.pricesInWei` in shim order)
3. **Built-in fallback** (safe defaults)

Flags supported by the reseed task:

* `--stylus` — force Stylus RPC
* `--nitro`  — force Nitro RPC (optional, for parity testing)
* No flag   — follow config and environment; otherwise fall back to config/defaults

---

## 4) Validation scripts

### 4.1 Readback sanity check

```bash
npx hardhat --config hardhat.config.js run --network localhost scripts/check-gasinfo-local.js
# Example:
# [ '69440', '496', '2000000000000', '100000000', '0', '100000000' ]
```

### 4.2 Full validation (raw selectors + contract calls)

```bash
npx hardhat --config hardhat.config.js run --network localhost scripts/validate-precompiles.js
```

Expected example:

```
 Validating Arbitrum Precompiles in Hardhat Context...

Arbitrum patch found in HRE
 Found 2 precompile handlers:
   ArbSys: 0x0000000000000000000000000000000000000064
   ArbGasInfo: 0x000000000000000000000000000000000000006c

 Testing ArbSys arbChainID...
ArbSys arbChainID returned: 42161

⛽ Testing ArbGasInfo getL1BaseFeeEstimate...
ArbGasInfo getL1BaseFeeEstimate returned: 1000000000 wei (1 gwei)

📄 Testing contract deployment and precompile calls...
ArbProbes contract deployed at: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Contract ArbSys call returned: 42161
Contract ArbGasInfo call returned: 496

 Precompile validation completed!
```

Notes:

* In shim mode, `getCurrentTxL1GasFees()` returns the **estimate** (slot 1) to provide deterministic test results.

---

## 5) Operational notes

* **Address immutability:** shims are placed at canonical precompile addresses to match Arbitrum expectations; normal deployments cannot override them in a live chain—this is a local testing convenience.
* **Determinism vs. realism:** shim return values can be fixed via config or sampled via RPC. For reproducible unit tests, the config tuple is recommended.
* **RPC networking:** `ipv4first` and `NODE_NO_HTTP2=1` often resolve transient TLS/HTTP2 issues on WSL/docker when calling public RPCs.
* **ChainId:** `ArbSysShim` returns `arbSysChainId` (from config) at slot 0; default resolves to 42161.

---

## 6) Quick reference (common commands)

Ephemeral, one-shot:

```bash
npx hardhat --config hardhat.config.js run scripts/install-and-check-shims.js
```

Persistent node (8549):

```bash
# Terminal A
npx hardhat node --port 8549

# Terminal B
npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js
STYLUS_RPC=https://sepolia-rollup.arbitrum.io/rpc \
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus
npx hardhat --config hardhat.config.js run --network localhost scripts/check-gasinfo-local.js
npx hardhat --config hardhat.config.js run --network localhost scripts/validate-precompiles.js
```

This completes setup and configuration for the Stylus-first shim workflow used in Milestone 3.
