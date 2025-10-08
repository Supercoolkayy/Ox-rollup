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
    tasks/
      arb-install-shims.ts
      arb-reseed-shims.ts
      arb-gas-info.ts

  probes/hardhat/
    hardhat.config.js
    precompiles.config.json            (optional)
    contracts/
      ArbSysShim.sol
      ArbGasInfoShim.sol
    scripts/
      predeploy-precompiles.js         (preinstall bytecode at 0x…64/0x…6c)
      install-and-check-shims.js       (one-shot install + verify)
      check-gasinfo-local.js           (read getPricesInWei())
      validate-precompiles.js          (end-to-end probe)
  ```

---

### Options (Hardhat `arbitrum` block)

| Key                | Type                           | Default    | Notes                                                                                                                                   |
| ------------------ | ------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`          | boolean                        | `true`     | Turns the patch on/off.                                                                                                                 |
| `runtime`          | `"stylus" \| "nitro"`          | `"stylus"` | Stylus-first target.                                                                                                                    |
| `precompiles.mode` | `"shim" \| "auto" \| "native"` | `"auto"`   | Milestone 3 uses shim path; `auto` gracefully installs shims.                                                                           |
| `stylusRpc`        | string                         | *(unset)*  | Remote RPC used by tasks when `--stylus` is selected. Can also be set via `STYLUS_RPC`.                                                 |
| `gas.pricesInWei`  | string[6]                      | *(unset)*  | **Shim order**: `[l2BaseFee, l1BaseFeeEstimate, l1CalldataCost, l1StorageCost, congestionFee, aux]`. Used when no RPC/ cache is chosen. |
| `arbSysChainId`    | number                         | `42161`    | Returned by `ArbSysShim` at slot 0.                                                                                                     |
| `costing.enabled`  | boolean                        | `false`    | If implemented, returns a small, stable non-zero `gasUsed` for precompile calls in shim mode (off by default).                          |


---

## 2) Configuration

### 2.1 `hardhat.config.js` (Stylus-first defaults)

```js
require("@nomicfoundation/hardhat-ethers");
require("@arbitrum/hardhat-patch");     // plugin entry; auto-loads tasks

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: { chainId: 42161 },
    // optional persistent node:
    // localhost: { url: "http://127.0.0.1:8549", chainId: 42161 }
  },
  arbitrum: {
    enabled: true,
    runtime: "stylus",                  // Stylus-first
    precompiles: { mode: "auto" },      // tries native later; shims today
    // stylusRpc: "https://sepolia-rollup.arbitrum.io/rpc", // optional default
  },
};
```

* `runtime: "stylus"` sets Stylus as the default runtime flavor.
* `precompiles.mode: "auto"` enables lazy shim installation in this milestone (native hooks can be introduced in a later phase).

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

* `gas.pricesInWei` is a **6-tuple in shim order**:

  ```
  [ l2BaseFee, l1BaseFeeEstimate, l1CalldataCost, l1StorageCost, congestionFee, aux ]
  ```

* When both `stylusRpc` and `gas.pricesInWei` are present, reseeding prioritizes RPC (§3.4).

### 2.3 Environment variables (optional)

* `STYLUS_RPC` — RPC endpoint for Stylus (for example, `https://sepolia-rollup.arbitrum.io/rpc`).
* `ARB_PRECOMPILES_CONFIG` — path override to a non-default `precompiles.config.json`.

**Stability toggles** (often helpful on WSL/docker):

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

Two flows are supported: **ephemeral** (in-process Hardhat VM) and **persistent** (a running Hardhat node on a port, e.g., 8549). Both install shims at the canonical addresses:

* **ArbSys**     — `0x0000000000000000000000000000000000000064`
* **ArbGasInfo** — `0x000000000000000000000000000000000000006c`

### 3.1 Ephemeral Hardhat (fastest loop)

This mode spins up a fresh in-process Hardhat network per command.

```bash
# One-shot install + verify
npx hardhat --config hardhat.config.js run scripts/install-and-check-shims.js
```

Expected example:

```
getPricesInWei(): [ '69440', '496', '2000000000000', '100000000', '0', '100000000' ]
✅ shims installed, seeded, and verified in one run.
```

Tasks auto-loaded by the plugin can also be used:

```bash
npx hardhat --config hardhat.config.js arb:install-shims
```

### 3.2 Persistent Hardhat node (HTTP)

Start a node and point “localhost” at it:

```bash
# Start persistent node on 8549
npx hardhat node --port 8549
# …leave running
```

Optional environment setup:

```bash
export NODE_OPTIONS=--dns-result-order=ipv4first
export NODE_NO_HTTP2=1
export STYLUS_RPC=https://sepolia-rollup.arbitrum.io/rpc
```

Network entry for the persistent node:

```js
networks: {
  localhost: { url: "http://127.0.0.1:8549", chainId: 42161 },
}
```

Predeploy shim bytecode:

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

**Success**

```
ℹ️ fetched from Stylus: [
  '26440960','188864','2000000000000','100000000','0','100000000'
]
✅ Re-seeded getPricesInWei -> [
  '26440960','188864','2000000000000','100000000','0','100000000'
]
```

**Temporary failure (fallback)**

```
⚠️  RPC fetch failed (https://sepolia-rollup.arbitrum.io/rpc): fetch failed
ℹ️ Stylus/Nitro RPC unavailable; will try other sources.
ℹ️ using JSON/config (shim order): [ '69440','496','2000000000000','100000000','0','100000000' ]
✅ Re-seeded getPricesInWei -> [ '69440','496','2000000000000','100000000','0','100000000' ]
```

### 3.4 Source priority (reseeding)

1. **Stylus RPC** (flag `--stylus`, or `stylusRpc`/`STYLUS_RPC`)
2. **`precompiles.config.json`** (`gas.pricesInWei` in shim order)
3. **Built-in fallback** (safe defaults)

Supported flags:

* `--stylus` — prioritize Stylus RPC
* `--nitro`  — prioritize Nitro RPC (optional, for parity checks)
* No flag    — follow config/env; otherwise fall back to config/defaults

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

Note: in shim mode, `getCurrentTxL1GasFees()` returns the **estimate** (slot 1) for deterministic test results.

---

## 5) Operational notes

* **Address immutability:** shims are placed at canonical precompile addresses; this mirrors Arbitrum expectations in local testing.
* **Determinism vs. realism:** shim values can be fixed via config or sampled via RPC. For reproducible tests, the config tuple is recommended.
* **RPC networking:** `ipv4first` and `NODE_NO_HTTP2=1` often resolve transient TLS/HTTP2 issues on WSL/docker.
* **ChainId:** `ArbSysShim` returns `arbSysChainId` (from config) at slot 0; default resolves to 42161.

---

## 6) Quick reference (common commands)

**Ephemeral, one-shot**

```bash
npx hardhat --config hardhat.config.js run scripts/install-and-check-shims.js
# or
npx hardhat --config hardhat.config.js arb:install-shims
```

**Persistent node (8549)**

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
