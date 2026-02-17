# **Production (Mainnet) Integration**
---
## **Objective**

Enable a safe, documented path to read Stylus/Arbitrum mainnet fee data and—only when explicitly requested—apply those values to local shims. Remote networks are never written to; all writes occur on the local Hardhat node.

---

## **Configuration & switches**

### Hardhat config (no changes required)

Keep `mode: "shim"` for determinism:

```js
// hardhat.config.js
require("@nomicfoundation/hardhat-ethers");
require("@arbitrum/hardhat-patch");

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat:  { chainId: 42161 },
    localhost:{ url: "http://127.0.0.1:8549", chainId: 42161 },
  },
  arbitrum: {
    enabled: true,
    runtime: "stylus",
    precompiles: { mode: "shim" },     // deterministic; no VM injection
    // stylusRpc can be left unset; use env for prod/testnet endpoints
  },
};
```

### Environment (choose a mainnet/testnet RPC)

Set a **read-only** RPC for Stylus/Arbitrum gas queries:

```bash
# Example: Arbitrum One (mainnet) public RPC
export STYLUS_RPC=https://arb1.arbitrum.io/rpc

# Optional stability knobs for CI/WSL
export NODE_OPTIONS=--dns-result-order=ipv4first
export NODE_NO_HTTP2=1
```

> Any HTTPS endpoint serving `eth_call` is acceptable. These tasks never broadcast transactions to that endpoint.

---

## **“Prod dry run” — compare only (no local changes)**

Use the comparison task to read the remote tuple and diff it against the local shim, without reseeding:

```bash
# Start a persistent local node if not already running
npx hardhat node --port 8549 &

# Inspect remote (mainnet) vs local tuple
npx hardhat --config hardhat.config.js arb:gas-info --network localhost --stylus
```

Expected style of output:

```
Arbitrum Precompile State Comparison
Remote RPC: https://sepolia-rollup.arbitrum.io/rpc

 Property                  | Local                | Remote               | Status
 --------------------------+----------------------+----------------------+------
 Per L2 Tx (Stub)          | 88946706240          | 86789261440          | DIFF
 Per L1 Calldata (Stub)    | 635333616            | 619923296            | DIFF
 Per Storage (L1 Cost)     | 400000000000         | 404960000000         | DIFF
 Per ArbGas Base           | 20000000             | 20000000             | OK
 Per ArbGas Congestion     | 0                    | 248000               | DIFF
 Per ArbGas Total          | 20000000             | 20248000             | DIFF
 --------------------------+----------------------+----------------------+------
 ArbGas Per L2 Tx          | 4446                 | 4339                 | DIFF
 ArbGas Per L1 Call        | 31                   | 30                   | DIFF
 ArbGas Per Storage        | 20000                | 20000                | OK
 --------------------------+----------------------+----------------------+------
 l1BaseFeeEstimate         | 0                    | 38745206             | DIFF
 minimumGasPrice           | 100000000            | 20000000             | DIFF
 speedLimitPerSecond       | 100000000            | 7000000              | DIFF
 gasPoolMax                | 32000000             | 32000000             | OK
 maxBlockGasLimit          | 32000000             | 32000000             | OK
 maxTxGasLimit             | 32000000             | 32000000             | OK
 --------------------------+----------------------+----------------------+------
 Pricing Constraints       | 6 active             | 6 active             | OK

Local Constraints Details:
  [0] Target: 60000000, Window: 9, Backlog: 127475
  [1] Target: 41000000, Window: 52, Backlog: 127475
  [2] Target: 29000000, Window: 329, Backlog: 127475
  [3] Target: 20000000, Window: 2105, Backlog: 127475
  [4] Target: 14000000, Window: 13485, Backlog: 127475
  [5] Target: 10000000, Window: 86400, Backlog: 127475

```

This step performs **only** `eth_call` against `STYLUS_RPC` and **does not** modify local shims.

---

## **Update local shims deterministically (only when asked)**

To overwrite the local tuple with the current mainnet values, reseed explicitly:

```bash
# Ensure shims exist on the local node (if needed)
npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js

# Apply the mainnet tuple to the local shim (write is LOCAL only)
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus
```

Optional cache to reduce repeated mainnet reads:

```bash
# Cache the tuple for 10 minutes; subsequent runs reuse .cache/stylus-prices.json
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus --cache-ttl 600
```

Confirm the new tuple on the same local node:

```bash
npx hardhat --config hardhat.config.js run --network localhost scripts/check-gasinfo-local.js
```

---

## **CI-safe posture**

* Keep `arbitrum.precompiles.mode = "shim"` for stable tests.
* Omit `STYLUS_RPC` in CI to force deterministic tuples from `precompiles.config.json` (or the baked-in fallback).

---

## **Safety guarantees**

* Tasks only **read** from the remote RPC via `eth_call`.
* All writes happen **locally** to the Hardhat node (e.g., `hardhat_setCode`, `hardhat_setStorageAt`, or the shim’s `__seed`).
* No changes are ever sent to mainnet/testnet; no transactions are broadcast.

---

## **Acceptance checklist**

* Running:

  ```bash
  STYLUS_RPC=<mainnet-endpoint> \
  npx hardhat --config hardhat.config.js arb:gas-info --network localhost --stylus
  ```

  produces a remote tuple and an index-by-index diff against the local shim, without altering local state.

* Running:

  ```bash
  STYLUS_RPC=<mainnet-endpoint> \
  npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus
  ```

  updates **only** the local shim, and `scripts/check-gasinfo-local.js` reflects the new tuple.

* CI flow remains deterministic when `STYLUS_RPC` is unset and reseed is not invoked, or when reseed is driven from `precompiles.config.json`.
