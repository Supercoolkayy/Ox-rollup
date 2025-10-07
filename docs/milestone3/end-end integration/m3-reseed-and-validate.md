# Milestone 3 — Reseeding & Validation

This document covers reseeding the **ArbGasInfo shim** with fee data and validating **ArbSys / ArbGasInfo** behavior in a Stylus-first workflow. Scope is limited to the shim path (no VM precompile injection).

---

## 1) Purpose

* Keep local tests aligned with a real Stylus network by periodically **reseeding** `ArbGasInfoShim` at `0x…6c` with a 6-value tuple from a live RPC.
* Support deterministic runs by falling back to **project configuration** (`precompiles.config.json`) or a **safe default**.
* Validate behavior end-to-end using raw precompile selectors and a small probe contract.

---

## 2) Data model

### 2.1 Canonical addresses

* `ArbSys`     `0x0000000000000000000000000000000000000064`
* `ArbGasInfo` `0x000000000000000000000000000000000000006c`

### 2.2 Shim tuple (storage order)

`ArbGasInfoShim.getPricesInWei()` returns a **6-tuple** in this **shim order**:

```
[ l2BaseFee, l1BaseFeeEstimate, l1CalldataCost, l1StorageCost, congestionFee, aux ]
```

* `aux` is a free slot (often used to surface a blob/aux fee placeholder for debugging).

> Note: The reseed task automatically converts tuples fetched from networks where ordering differs.

---

## 3) Sources & priority

Reseeding uses the following priority:

1. **Stylus RPC** — when `--stylus` is passed, or `stylusRpc`/`STYLUS_RPC` is present.
2. **Nitro RPC** — when `--nitro` is passed, or `nitroRpc`/`NITRO_RPC` is present.
3. **Project config** — `precompiles.config.json` → `gas.pricesInWei` (must already be in **shim order**).
4. **Built-in fallback** — a safe constant tuple.

### 3.1 Environment & config keys

* Environment:

  * `STYLUS_RPC` (preferred)
  * `NITRO_RPC`  (optional compatibility)
  * `ARB_PRECOMPILES_CONFIG` (path override)
* Project config (`precompiles.config.json`):

  * `stylusRpc`, `nitroRpc`
  * `gas.pricesInWei` (array of 6 decimal strings, **shim order**)

---

## 4) Task: `arb:reseed-shims`

### 4.1 Behavior

* Verifies the shim is installed at `0x…6c`.
* Selects a source by priority (flags/env/config).
* Normalizes remote tuples to **shim order**.
* Calls `ArbGasInfoShim.__seed(uint256[6])`.
* Prints the effective tuple chosen and confirms the readback.

### 4.2 Flags

* `--stylus` — force Stylus RPC as the source.
* `--nitro`  — force Nitro RPC as the source.

### 4.3 Examples

**Reseed from Stylus Sepolia (public RPC):**

```bash
export NODE_OPTIONS=--dns-result-order=ipv4first
export NODE_NO_HTTP2=1
export STYLUS_RPC=https://sepolia-rollup.arbitrum.io/rpc

# Persistent node flow (assumes a Hardhat node on 8549 and shims predeployed)
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus
```

Possible output:

```
ℹ️ fetched from Stylus: [
  '26440960', '188864', '2000000000000', '100000000', '0', '100000000'
]
✅ Re-seeded getPricesInWei -> [
  '26440960', '188864', '2000000000000', '100000000', '0', '100000000'
]
```

**Fallback to config (no RPC):**

```bash
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost
```

Output:

```
ℹ️ using JSON/config (shim order): [ '69440','496','2000000000000','100000000','0','100000000' ]
✅ Re-seeded getPricesInWei -> [ '69440','496','2000000000000','100000000','0','100000000' ]
```

**Nitro compatibility (optional):**

```bash
export NITRO_RPC=http://127.0.0.1:8547
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --nitro
```

---

## 5) Validation workflows

Two validation styles are provided: **readback** and **full probe**.

### 5.1 Readback (sanity check)

Checks the tuple stored in the shim:

```bash
npx hardhat --config hardhat.config.js run --network localhost scripts/check-gasinfo-local.js
```

Expected:

```
[ '69440', '496', '2000000000000', '100000000', '0', '100000000' ]
```

### 5.2 Full probe (raw + contract)

Validates both precompiles and contract calls:

```bash
npx hardhat --config hardhat.config.js run --network localhost scripts/validate-precompiles.js
```

Typical output:

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
ArbProbes contract deployed at: 0x...
Contract ArbSys call returned: 42161
Contract ArbGasInfo call returned: 496

 Precompile validation completed!
```

Notes:

* In shim mode, `getCurrentTxL1GasFees()` is bound to the estimate (slot 1) for determinism.

---

## 6) End-to-end local flows

### 6.1 Ephemeral (single-shot)

```bash
# One-shot install + verify in a fresh in-process VM
npx hardhat --config hardhat.config.js run scripts/install-and-check-shims.js
```

### 6.2 Persistent node (recommended for iterative testing)

```bash
# Terminal A
npx hardhat node --port 8549

# Terminal B
export NODE_OPTIONS=--dns-result-order=ipv4first
export NODE_NO_HTTP2=1
export STYLUS_RPC=https://sepolia-rollup.arbitrum.io/rpc

# Predeploy shims at 0x…64 / 0x…6c
npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js

# Reseed from Stylus
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus

# Validate
npx hardhat --config hardhat.config.js run --network localhost scripts/check-gasinfo-local.js
npx hardhat --config hardhat.config.js run --network localhost scripts/validate-precompiles.js
```

---

## 7) Troubleshooting

### 7.1 HH108: cannot connect to `localhost`

* Ensure a Hardhat node is running on the configured port.
* Example: `npx hardhat node --port 8549` and set `localhost: { url: "http://127.0.0.1:8549" }`.

### 7.2 Public RPC fetch failures

* Set:

  ```bash
  export NODE_OPTIONS=--dns-result-order=ipv4first
  export NODE_NO_HTTP2=1
  ```
* Confirm remote reachability:

  ```bash
  curl -s https://sepolia-rollup.arbitrum.io/rpc \
    -H 'content-type: application/json' \
    --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
  ```

### 7.3 Shims not present

* Run the predeploy script (or the one-shot installer):

  ```bash
  npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js
  # or
  npx hardhat --config hardhat.config.js run scripts/install-and-check-shims.js
  ```

### 7.4 Tuple order confusion

* `precompiles.config.json` **must** use **shim order**.
* Remote tuples with a different order are normalized by the task before calling `__seed`.

---

## 8) Expected artifacts & scripts

* **Tasks**

  * `tasks/arb-reseed-shims.js` → implements `arb:reseed-shims`
* **Scripts**

  * `scripts/predeploy-precompiles.js` → writes shim bytecode at `0x…64`/`0x…6c`
  * `scripts/install-and-check-shims.js` → one-shot install + readback
  * `scripts/check-gasinfo-local.js` → prints the tuple
  * `scripts/validate-precompiles.js` → raw selector + contract probe

This completes reseeding and validation for Milestone 3’s Stylus-first shim flow.
