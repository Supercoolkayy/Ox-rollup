# Milestone 3 — Reseeding & Validation

This document covers reseeding the **ArbGasInfo** shim with fee data and validating **ArbSys / ArbGasInfo** behavior in a Stylus-first workflow. Scope is limited to the shim path (no VM precompile injection).

---

## 1) Purpose

* Keep local tests aligned with a live Stylus network by periodically reseeding `ArbGasInfoShim` at `0x…6c` with a 6-value tuple from RPC.
* Preserve determinism when RPC is unavailable by falling back to project configuration (`precompiles.config.json`) or to a safe default.
* Validate end-to-end behavior using raw precompile selectors and a minimal probe contract.

---

## 2) Data model

### 2.1 Canonical addresses

* **ArbSys**      `0x0000000000000000000000000000000000000064`
* **ArbGasInfo**  `0x000000000000000000000000000000000000006c`

### 2.2 Shim tuple (storage order)

`ArbGasInfoShim.getPricesInWei()` returns a 6-tuple in **shim order**:

```
[ l2BaseFee, l1BaseFeeEstimate, l1CalldataCost, l1StorageCost, congestionFee, aux ]
```

* `aux` is a general-purpose slot (commonly used to surface auxiliary fees such as blob base fee during experiments).
* Tuples fetched from networks with different ordering are normalized by the reseed task before storage.

---

## 3) Sources & priority

Reseeding uses the following priority:

1. **Stylus RPC** — selected via `--stylus`, or when `stylusRpc`/`STYLUS_RPC` is present.
2. **Nitro RPC** — selected via `--nitro`, or when `nitroRpc`/`NITRO_RPC` is present (optional parity path).
3. **Project config** — `precompiles.config.json` → `gas.pricesInWei` (already in shim order).
4. **Built-in fallback** — safe constant tuple for deterministic testing.

### 3.1 Configuration keys & env

* **Environment**

  * `STYLUS_RPC` (preferred public endpoint for Stylus)
  * `NITRO_RPC` (optional)
  * `ARB_PRECOMPILES_CONFIG` (path override for the JSON file)
* **Project config** (`precompiles.config.json`)

  * `stylusRpc`, `nitroRpc`
  * `gas.pricesInWei` — array of 6 decimal strings in **shim order**

---

## 4) Task: `arb:reseed-shims`

### 4.1 Behavior

* Confirms the shim is installed at `0x…6c`.
* Selects a source using the priority rules above (flags/env/config).
* Normalizes remote tuples to **shim order** when required.
* Calls `ArbGasInfoShim.__seed(uint256[6])`.
* Prints the source used and a readback value for verification.

### 4.2 Flags

* `--stylus` — force Stylus RPC as the source.
* `--nitro`  — force Nitro RPC as the source.

### 4.3 Examples

**Reseed from Stylus Sepolia (public RPC)**

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

**Fallback to config (no RPC reachable)**

```bash
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost
```

Output:

```
ℹ️ using JSON/config (shim order): [ '69440','496','2000000000000','100000000','0','100000000' ]
✅ Re-seeded getPricesInWei -> [ '69440','496','2000000000000','100000000','0','100000000' ]
```

**Nitro compatibility (optional)**

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

Expected example:

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

Note: in shim mode, `getCurrentTxL1GasFees()` is bound to the estimate (slot 1) for deterministic results.

---

## 6) Comparative inspection (optional)

A helper task provides a quick comparison between the local tuple and a remote RPC:

```bash
# Compare local vs Stylus remote (prints per-index equality)
npx hardhat --config hardhat.config.js arb:gas-info --stylus

# Compare local vs explicit RPC
npx hardhat --config hardhat.config.js arb:gas-info --rpc https://sepolia-rollup.arbitrum.io/rpc

# Machine-readable output
npx hardhat --config hardhat.config.js arb:gas-info --stylus --json
```

Output includes `local`, `remote`, and an index-by-index diff with equality markers.

---

## 7) End-to-end local flows

### 7.1 Ephemeral (single-shot)

```bash
# One-shot install + verify in a fresh in-process VM
npx hardhat --config hardhat.config.js run scripts/install-and-check-shims.js
```

### 7.2 Persistent node (recommended for iterative testing)

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

# (Optional) Inspect diff vs remote
npx hardhat --config hardhat.config.js arb:gas-info --stylus
```

---

## 8) Troubleshooting (quick picks)

* **HH108: cannot connect to `localhost`**
  Ensure a Hardhat node is running on the configured port (e.g., `npx hardhat node --port 8549`) and that `networks.localhost.url` matches.

* **Public RPC fetch failures**
  Set:

  ```bash
  export NODE_OPTIONS=--dns-result-order=ipv4first
  export NODE_NO_HTTP2=1
  ```

  Sanity-check with:

  ```bash
  curl -s https://sepolia-rollup.arbitrum.io/rpc \
    -H 'content-type: application/json' \
    --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
  ```

* **Shims not present**
  Run the predeploy or the one-shot installer:

  ```bash
  npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js
  # or
  npx hardhat --config hardhat.config.js run scripts/install-and-check-shims.js
  ```

* **Tuple order confusion**
  `precompiles.config.json` must use **shim order**. Remote tuples with different order are normalized by the task prior to `__seed`.

---

## 9) Artifacts & scripts (expected)

* **Tasks**

  * `tasks/arb-reseed-shims.ts` → implements `arb:reseed-shims`
  * `tasks/arb-gas-info.ts`     → implements `arb:gas-info`
  * `tasks/arb-install-shims.ts`→ implements `arb:install-shims`

* **Scripts**

  * `scripts/predeploy-precompiles.js` → writes shim bytecode at `0x…64`/`0x…6c`
  * `scripts/install-and-check-shims.js` → one-shot install + readback
  * `scripts/check-gasinfo-local.js` → prints the tuple
  * `scripts/validate-precompiles.js` → raw selector + contract probe

---
### Tasks & flags

| Task                | Purpose                                                                              | Key Flags / Params                                                                                                                                | Output (typical)                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `arb:install-shims` | One-shot install + readback of shims at `0x…64/0x…6c`.                               | *(none)*                                                                                                                                          | Prints the tuple read from the local shim and success line.                                           |
| `arb:reseed-shims`  | Reseed `ArbGasInfoShim.__seed([6])` from **Stylus RPC** → **config** → **fallback**. | `--stylus` (force Stylus RPC), `--nitro` (optional), `--cache-ttl <sec>` (optional file cache), `--network localhost` (when using a running node) | Prints chosen source, the tuple applied, and a readback confirmation.                                 |
| `arb:gas-info`      | Compare **local** tuple vs **remote** tuple (no writes).                             | `--stylus` (or `--nitro`), `--rpc <URL>`, `--json`                                                                                                | Prints side-by-side values and per-index equality markers; JSON mode emits a machine-readable object. |

**Environment keys (honored by tasks)**
`STYLUS_RPC`, `NITRO_RPC`, `ARB_PRECOMPILES_CONFIG`, plus stability toggles `NODE_OPTIONS=--dns-result-order=ipv4first`, `NODE_NO_HTTP2=1`.

---

