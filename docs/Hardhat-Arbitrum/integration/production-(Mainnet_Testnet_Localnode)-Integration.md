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
Local tuple     : [ '69440', '496', '2000000000000', '100000000', '0', '100000000' ]
Remote tuple    : [ '...', '...', '...', '...', '...', '...' ] (https://arb1.arbitrum.io/rpc)
Index-by-index  :
  [0] 69440 != ...
  [1] 496   != ...
  ...
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
