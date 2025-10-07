# Milestone 3 — Stylus-first Precompile Shims (Overview)

## Purpose

Provide deterministic local testing of Arbitrum precompiles with a **Stylus-first** focus. Two precompiles are emulated via shims at their canonical addresses:

* **ArbSys** at `0x0000000000000000000000000000000000000064`
* **ArbGasInfo** at `0x000000000000000000000000000000000000006c`

`ArbGasInfo` exposes `getPricesInWei()` and returns a six-value tuple. Values can be reseeded from a live **Stylus** RPC or from a local config file, yielding consistent behavior for unit tests and scripts without dependence on a running L2 node.

This milestone covers **shim mode**, **Stylus gas reseeding**, and **validation scripts**. VM precompile hook manipulation (“native” mode) and deposit `0x7e` execution are out of scope for this slice.

---

## Outcomes

* **Stylus-first configuration** — default runtime set to Stylus; Nitro is opt-in.
* **Shim installation** — bytecode predeployed at `0x…64/0x…6c` into a Hardhat chain (ephemeral or persistent).
* **Reseeding logic** — `ArbGasInfoShim.__seed(uint256[6])` accepts values with the following priority:

  1. **Stylus RPC**
  2. **`precompiles.config.json`**
  3. **Built-in fallback**
* **Validation** — scripts demonstrate successful raw precompile calls and contract-based calls:

  * `ArbSys.arbChainID()` returns the configured chain ID (e.g., 42161).
  * `ArbGasInfo.getPricesInWei()` returns the seeded tuple.
  * A probe contract calling `getCurrentTxL1GasFees()` returns the seeded estimate in shim mode.

---

## Scope

### In scope

* Shim bytecode placement for `ArbSys` and `ArbGasInfo` at canonical addresses.
* Deterministic gas tuple via `getPricesInWei()` for local testing.
* Reseed task with **Stylus-first** source selection and explicit flags.
* Validation scripts that:

  * Read raw precompiles by selector.
  * Deploy a small probe contract and perform calls through the EVM path.

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
    ├─ Reseed helper (task + utility)
    └─ Validation scripts use ethers provider against the same HH network

ArbGasInfoShim
    ├─ getPricesInWei() -> (uint256 × 6)
    └─ __seed(uint256[6]) for reseeding

ArbSysShim
    └─ returns configured chainId (slot 0)

Validation scripts
    ├─ Raw eth_call to 0x…64 / 0x…6c selectors
    └─ Deploy probe contract → call precompiles via EVM path
```

**Shim tuple order (ArbGasInfoShim storage/returns)**

```
[ l2BaseFee, l1BaseFeeEstimate, l1CalldataCost, l1StorageCost, congestionFee, aux ]
```

Stylus RPC values are already compatible with this order. Nitro tuples, if used, are reordered prior to seeding.

---

## Configuration model

* **Hardhat config (`arbitrum` block)**

  * `runtime`: `"stylus"` (default) or `"nitro"`
  * `precompiles.mode`: `"auto"` (default) or `"shim"`

    * In this milestone, shim mode is the functional path; auto may attempt native hooks in other milestones.
* **`precompiles.config.json` (optional)**

  * `arbSysChainId`: number
  * `gas.pricesInWei`: string[6] in **shim order**
  * `stylusRpc`: HTTPS RPC for Stylus (e.g., `https://sepolia-rollup.arbitrum.io/rpc`)
* **Environment toggles**

  * `STYLUS_RPC`: overrides Stylus RPC used by reseed
  * `ARB_PRECOMPILES_CONFIG`: path to a non-default config file
  * Stability flags used in some environments:

    * `NODE_OPTIONS=--dns-result-order=ipv4first`
    * `NODE_NO_HTTP2=1`

---

## Developer tasks (summary)

* **Shim install** — automatic on first JSON-RPC call (in shim/auto modes) or via a predeploy script.
* **Reseed** — `arb:reseed-shims` with `--stylus` (or explicit `--rpc`); falls back to config or defaults.
* **Validate** — run validation to confirm raw selectors and contract calls.

Detailed setup and validation commands are documented separately.

---

## Acceptance criteria

* Shims present at `0x…64` and `0x…6c` on a Hardhat network.
* `getPricesInWei()` returns a six-element tuple matching one of:

  * Live Stylus RPC values (when reachable),
  * `precompiles.config.json` values,
  * Built-in fallback tuple.
* Validation output includes:

  * `ArbSys arbChainID returned: 42161` (or the configured chainId),
  * A non-zero value for `ArbGasInfo` selector in raw calls,
  * Successful probe contract calls; `getCurrentTxL1GasFees()` returns the seeded estimate in shim mode.

---

## Rationale

* **Determinism** — local tests should not depend on live L2 timing/fees; shims provide predictable reads.
* **Stylus-first** — aligns with milestone priority while retaining optional Nitro paths.
* **Seeding flexibility** — supports real-world fee sampling (Stylus RPC) and lockstep unit tests (config).
* **Low friction** — lazy shim installation and a single reseed task integrate cleanly with typical Hardhat flows.

---

## Glossary

* **Shim** — lightweight contract deployed at a canonical precompile address to emulate behavior in a local EVM.
* **Stylus** — Arbitrum’s WASM execution environment atop Nitro; this milestone targets Stylus networks as the default runtime.
* **Precompile** — special address implementing system functionality; `ArbSys` and `ArbGasInfo` are examples on Arbitrum.
* **Reseed** — writing a new gas-price tuple into the shim’s storage, sourced from RPC/config/fallback.

---

**Next documents**
See `m3-setup-and-config.md` for installation and configuration details, `m3-reseed-and-validate.md` for exact commands and expected outputs, and `m3-troubleshooting.md` for common issues and resolutions.
