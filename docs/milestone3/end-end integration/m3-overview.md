# Milestone 3 — Stylus-first Precompile Shims (Overview)

## Purpose

Enable deterministic local testing of Arbitrum precompiles with a **Stylus-first** focus. Two precompiles are emulated via shims at their canonical addresses:

* **ArbSys** at `0x0000000000000000000000000000000000000064`
* **ArbGasInfo** at `0x000000000000000000000000000000000000006c`

The shim at `ArbGasInfo` exposes `getPricesInWei()` and returns a 6-value tuple. Values can be reseeded from a live **Stylus** RPC or from a local config file, producing consistent behavior across unit tests and scripts without relying on a running L2 node.

This milestone covers **shim mode**, **Stylus gas reseeding**, and **validation scripts**. VM precompile hook manipulation (“native” mode) and deposit `0x7e` execution are outside this slice.

---

## Outcomes

* **Stylus-first configuration**: default runtime set to Stylus, with Nitro as an opt-in.
* **Shim installation**: bytecode predeployed at `0x…64/0x…6c` into the Hardhat chain (ephemeral or persistent).
* **Reseeding logic**: `ArbGasInfoShim.__seed(uint256[6])` receives values with priority

  1. **Stylus RPC**, then 2) **`precompiles.config.json`**, then 3) **built-in fallback**.
* **Validation**: scripts demonstrate successful raw precompile calls and contract-based calls, including:

  * `ArbSys.arbChainID()` returning the configured chain ID (e.g., 42161).
  * `ArbGasInfo.getPricesInWei()` returning the seeded tuple.
  * Contract wrapper calling `getCurrentTxL1GasFees()` returning the seeded estimate in shim mode.

---

## Scope

### In scope

* Shim bytecode placement for `ArbSys` and `ArbGasInfo` at canonical addresses.
* Deterministic gas tuple for local testing via `getPricesInWei()`.
* Reseed task with **Stylus-first** source selection and explicit flags.
* Validation scripts that:

  * Read raw precompiles by selector.
  * Deploy a small probe contract and perform calls against the shims.

### Out of scope (handled in other milestones)

* Native VM precompile handlers (direct ethereumjs VM hook registration).
* Full `0x7e` deposit parser/executor and state effects.
* Nitro equivalence testing and multi-version ArbOS parity checks.
* Production RPC cost modeling beyond the tuple used for tests.

---

## Architecture (high-level)

```
hardhat.config.js
    └─ arbitrum.runtime = "stylus"
    └─ arbitrum.precompiles.mode = "auto" | "shim"

precompiles.config.json  (optional)
    └─ arbSysChainId
    └─ gas.pricesInWei   [6-tuple in shim order]
    └─ stylusRpc         (public or private RPC)

Plugin entry (index.ts)
    ├─ Lazy shim install at 0x…64 / 0x…6c
    ├─ Reseed helper (exposed as task and utility)
    └─ Validation scripts use ethers provider against the same HH network

ArbGasInfoShim
    ├─ getPricesInWei() -> (uint256 x 6)
    └─ __seed(uint256[6]) for reseeding

ArbSysShim
    └─ returns configured chainId (slot 0)

Validation scripts
    ├─ Raw eth_call to 0x…64 / 0x…6c selectors
    └─ Deploy probe contract → call precompiles via EVM path
```

**Shim tuple order (used by `ArbGasInfoShim`)**

```
[ l2BaseFee, l1BaseFeeEstimate, l1CalldataCost, l1StorageCost, congestionFee, aux ]
```

Stylus RPC values are ingested in compatible order; Nitro tuples (if ever used) are reordered before seeding.

---

## Configuration model

* `hardhat.config.js`

  * `arbitrum.runtime`: `"stylus"` (default) or `"nitro"`
  * `arbitrum.precompiles.mode`: `"auto"` (default) or `"shim"`
    `auto` may attempt native hooks in other milestones; in this slice, shim mode is the functional path.
* `precompiles.config.json` (optional)

  * `arbSysChainId`: number
  * `gas.pricesInWei`: string[6] in **shim order**
  * `stylusRpc`: HTTPS RPC for Stylus (e.g., `https://sepolia-rollup.arbitrum.io/rpc`)
* Environment toggles

  * `STYLUS_RPC`: overrides RPC used by reseed
  * `ARB_PRECOMPILES_CONFIG`: points to a non-default config path
  * Stability flags for some environments:
    `NODE_OPTIONS=--dns-result-order=ipv4first`, `NODE_NO_HTTP2=1`

---

## Developer tasks (summary)

* **Shim install**: automatic on first JSON-RPC call (in shim/auto modes) or via a predeploy script.
* **Reseed**: `arb:reseed-shims` with explicit `--stylus` or configuration-driven selection; falls back to config or defaults.
* **Validate**: run the validation script to confirm raw selectors and contract calls behave as expected.

Detailed steps and commands appear in the dedicated setup and validation document.

---

## Acceptance criteria

* Shims are present at `0x…64` and `0x…6c` on the local Hardhat network.
* `getPricesInWei()` returns a six-element tuple matching either:

  * Live Stylus RPC values (when reachable), or
  * `precompiles.config.json` values, or
  * The baked-in fallback tuple.
* The validation script reports:

  * “ArbSys arbChainID returned: 42161” (or configured chainId),
  * “ArbGasInfo … returned: <non-zero value>” for raw selector,
  * Probe contract successfully calls both precompiles; `getCurrentTxL1GasFees()` returns the seeded estimate in shim mode.

---

## Rationale

* **Determinism**: local tests must not depend on live L2 timing/fees; shims guarantee predictable reads.
* **Stylus-first**: aligns with milestone priority while keeping Nitro compatibility paths optional.
* **Seeding flexibility**: supports real-world fee sampling (Stylus RPC) and lockstep unit tests (config).
* **Minimal friction**: lazy shim installation and a single reseed task fit seamlessly into typical Hardhat flows.

---

## Glossary

* **Shim**: a lightweight contract at a canonical precompile address used to emulate behavior in a local EVM.
* **Stylus**: Arbitrum’s WASM execution environment atop Nitro; this milestone targets Stylus networks as the default runtime.
* **Precompile**: a special address that implements system functionality; on Arbitrum, `ArbSys` and `ArbGasInfo` are examples.
* **Reseed**: the act of writing a new gas-price tuple into the shim’s storage, sourced from RPC/config/fallback.

---

**Next documents**
See `m3-setup-and-config.md` for installation/configuration details, `m3-reseed-and-validate.md` for exact commands and expected outputs, and `m3-troubleshooting.md` for common issues and fast resolutions.
