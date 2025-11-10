# **Test Suite & Validation ( Results)**
---
This document records the automated tests executed for Milestone 3’s  shim workflow, the conditions under which they ran, and the observed outcomes. Scope is limited to shim mode with storage-slot seeding and readback of `ArbGasInfo` at the canonical precompile address.

---

## **Objectives**

* Verify deterministic behavior using a locally configured gas tuple.
* Verify live Stylus tuple ingestion (when a public RPC is provided).
* Verify fallback behavior when neither RPC nor project configuration is used.

---

## **Test Inventory**

| ID | Name                       | Source of Gas Tuple            | Primary Assertions                                                                                              |
| -- | -------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| A  | Deterministic config tuple | `precompiles.config.json`      | Shim storage slots 0–5 equal configured 6-tuple; optional ERC20 basics (name/symbol) succeed if examples exist. |
| B  | Stylus RPC tuple           | `STYLUS_RPC` (public endpoint) | Shim seeded with 6-tuple fetched from Stylus RPC; post-seed readback equals remote 6-tuple.                     |
| C  | Fallback tuple             | Built-in defaults              | Shim storage slots 0–5 equal the documented fallback 6-tuple (shim order).                                      |

**Canonical addresses**

* `ArbSys` — `0x0000000000000000000000000000000000000064`
* `ArbGasInfo` — `0x000000000000000000000000000000000000006c`

**Shim tuple order (storage and assertions)**
`[ l2BaseFee, l1BaseFeeEstimate, l1CalldataCost, l1StorageCost, congestionFee, aux ]`

---

## **Environment & Inputs**

| Item                       | Value / Notes                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Node/Hardhat               | Standard Hardhat test runner (in-process network)                                       |
| RPC flags (stability)      | `NODE_OPTIONS=--dns-result-order=ipv4first`, `NODE_NO_HTTP2=1` (used in the Stylus run) |
| Stylus endpoint            | `STYLUS_RPC=https://sepolia-rollup.arbitrum.io/rpc` (only for Test B run)               |
| Project configuration      | `precompiles.config.json` contains a 6-tuple in **shim order** (used in Test A)         |
| Seeding/readback mechanism | Direct storage write/read (`0..5` slots) via JSON-RPC for deterministic validation      |
| Network mode               | Shim mode only (no VM precompile injection)                                             |

---

## **Execution Scenarios & Observed Results**

### Scenario 1 — Config + Fallback (no RPC)

* Command set invoked the three tests (A, B, C) without `STYLUS_RPC`.

**Outcome summary**

* **Pass** — Test A: deterministic config tuple
  Duration: **~2.19 s**
  Assertion: readback equals `precompiles.config.json`
* **Pending** — Test B: Stylus RPC tuple
  Reason: `STYLUS_RPC` not present, test marked as skipped by design
* **Pass** — Test C: fallback tuple
  Duration: **~0.3–0.5 s** (within the combined run’s overall ~2 s window)
  Assertion: readback equals built-in fallback tuple

**Runner output (abridged)**

> “@m3 Test A: deterministic config tuple — ✔ seeds from precompiles.config.json and matches exactly (2194ms)”
> “@m3 Test B: stylus RPC tuple (skips if STYLUS_RPC not set) — pending”
> “@m3 Test C: fallback tuple (no RPC, ignore config) — ✔ matches the built-in fallback when config/RPC are not used”
> “2 passing (2s), 1 pending”

---

### Scenario 2 — Stylus RPC (public testnet)

* Environment exported: `NODE_OPTIONS=--dns-result-order=ipv4first`, `NODE_NO_HTTP2=1`, `STYLUS_RPC=https://sepolia-rollup.arbitrum.io/rpc`.
* Command set invoked Test B only.

**Outcome summary**

* **Pass** — Test B: Stylus RPC tuple
  Duration: **~4.72 s**
  Assertion: readback equals the 6-tuple fetched from Stylus Sepolia

**Runner output (abridged)**

> “@m3 Test B: stylus RPC tuple (skips if STYLUS_RPC not set) — ✔ reseeds from Stylus and equals the remote tuple (4717ms)”
> “1 passing (5s)”

---

## **Assertions & Acceptance Criteria**

| Criterion                                                                                     | Status          |
| --------------------------------------------------------------------------------------------- | --------------- |
| Config-driven determinism: tuple readback equals `precompiles.config.json` (6 exact matches). | **Pass**        |
| Live Stylus mode: tuple readback equals remote RPC values (6 exact matches).                  | **Pass**        |
| Fallback determinism: tuple readback equals documented fallback (6 exact matches).            | **Pass**        |
| Tests operate fully in shim mode, with no writes to remote networks.                          | **Pass**        |
| Pending behavior for Test B when `STYLUS_RPC` is absent.                                      | **As designed** |

---

## **Metrics**

| Metric                          | Scenario 1 (Config+Fallback) | Scenario 2 (Stylus) |
| ------------------------------- | ---------------------------- | ------------------- |
| Total tests executed            | 3                            | 1                   |
| Passing                         | 2                            | 1                   |
| Pending/Skipped                 | 1                            | 0                   |
| Failing                         | 0                            | 0                   |
| Wall-clock (reported by runner) | ~2 s                         | ~5 s                |
| Longest single test duration    | ~2.19 s (Test A)             | ~4.72 s (Test B)    |
| RPC usage                       | None                         | Stylus Sepolia      |
| Tuple equality checks per test  | 6 fields                     | 6 fields            |

---

## **Determinism & Reproducibility Notes**

* Test A and Test C validate deterministic operation without external RPC dependencies.
* Test B validates optional live alignment with a Stylus testnet; the test remains skipped when no endpoint is provided, preserving hermetic runs.
* Storage slot seeding ensures identical behavior across runs and environments for local assertions.

---

## **Troubleshooting Cues (Test Context)**

| Symptom                                      | Likely Cause                                 | Resolution note                                                                                        |
| -------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Stylus test remains pending                  | `STYLUS_RPC` not exported                    | Provide a valid endpoint for a live run, or accept pending status for offline determinism.             |
| RPC fetch intermittently fails on some hosts | HTTP/2 or DNS behavior in runner environment | Set `NODE_OPTIONS=--dns-result-order=ipv4first` and `NODE_NO_HTTP2=1` before running tests.            |
| Tuple mismatch in Test A                     | JSON tuple not in shim order                 | Ensure 6-tuple is `[l2BaseFee, l1BaseFeeEstimate, l1CalldataCost, l1StorageCost, congestionFee, aux]`. |
| Tuple mismatch in Test C                     | Local modifications to fallback constants    | Restore documented fallback values before re-running.                                                  |

---

## **Coverage Statement**

* **Behavioral coverage:** config-driven determinism, RPC-driven alignment, fallback stability.
* **Surface coverage:** raw precompile storage slots (`0..5`) for `ArbGasInfo` at `0x…6c`.
* **Contract coverage (auxiliary):** optional ERC20 deployment sanity included in Test A when example contracts are available.

---

## **Conclusion**

The test suite validates the shim-based precompile behavior across three core modes: configuration, live Stylus RPC, and fallback. Results confirm that:

* Deterministic, local testing is achieved without external dependencies.
* Optional live alignment with Stylus Sepolia functions as intended when enabled.
* Fallback behavior remains stable and reproducible.
