# Milestone 3 — CI & Dev Loops

End-to-end guidance for running the Stylus-first **shim** workflow in continuous integration and during local development. Scope is limited to Milestone 3’s precompile shims and reseeding/validation flow.

---

## 1) Objective

* Guarantee reproducible validation of **ArbSys** (`0x…64`) and **ArbGasInfo** (`0x…6c`) during builds.
* Prefer **Stylus** gas data when network access is available; fall back to project configuration or a safe default when offline.
* Keep executions hermetic: no VM precompile injection is required; the shim path is sufficient.

---

## 2) Pre-requisites

* Node.js ≥ 18 (for global `fetch`) and a recent Hardhat.
* Project has:

  * `tasks/arb-reseed-shims.js`
  * `scripts/predeploy-precompiles.js`
  * `scripts/check-gasinfo-local.js`
  * `scripts/validate-precompiles.js`
* Public Stylus RPC for optional live reseed:

  * `https://sepolia-rollup.arbitrum.io/rpc` (public; subject to rate limits)

Environment variables commonly used:

* `STYLUS_RPC` — remote source of gas prices (preferred)
* `NITRO_RPC` — optional compatibility source
* `ARB_PRECOMPILES_CONFIG` — path override to JSON config (optional)
* `NODE_OPTIONS=--dns-result-order=ipv4first` — encourages IPv4
* `NODE_NO_HTTP2=1` — disables HTTP/2 negotiation (stability on some runners)

---

## 3) CI blueprint

### 3.1 Deterministic mode (no network dependency)

**Purpose:** produce fully offline, reproducible tests. Gas tuple is read from `precompiles.config.json`.

**Steps:**

1. Install dependencies (npm/pnpm/yarn).
2. Start a **persistent** Hardhat node on a fixed port (e.g., 8549).
3. Predeploy shim bytecode at the canonical addresses.
4. Reseed from **project config** (no `STYLUS_RPC` set).
5. Validate: quick readback and full precompile probe.

**Command sketch:**

```bash
# 1) start node (background on CI)
npx hardhat node --port 8549 &

# 2) predeploy shims
npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js

# 3) reseed from config (no RPC flags set)
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost

# 4) validations
npx hardhat --config hardhat.config.js run --network localhost scripts/check-gasinfo-local.js
npx hardhat --config hardhat.config.js run --network localhost scripts/validate-precompiles.js
```

**Pass criteria:**

* `check-gasinfo-local.js` prints the configured tuple (6 values).
* `validate-precompiles.js` prints:

  * `ArbSys arbChainID returned: 42161`
  * `ArbGasInfo getL1BaseFeeEstimate returned: ...`
  * Contract calls complete; `getCurrentTxL1GasFees` mirrors the estimate in shim mode.

### 3.2 Live Stylus mode (optional network dependency)

**Purpose:** align local tuples with a live Stylus testnet.

**Steps:**

1. Export network tuning flags to improve fetch stability on CI runners.
2. Start a persistent Hardhat node.
3. Predeploy shims.
4. Reseed with `--stylus`; source is `STYLUS_RPC` (or configured `stylusRpc`).
5. Validate as above.

**Command sketch:**

```bash
export NODE_OPTIONS=--dns-result-order=ipv4first
export NODE_NO_HTTP2=1
export STYLUS_RPC=https://sepolia-rollup.arbitrum.io/rpc

npx hardhat node --port 8549 &
npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus
npx hardhat --config hardhat.config.js run --network localhost scripts/check-gasinfo-local.js
npx hardhat --config hardhat.config.js run --network localhost scripts/validate-precompiles.js
```

**Pass criteria:** same as Deterministic mode, with the tuple reflecting live network values.

---

## 4) GitHub Actions example (minimal)

```yaml
name: m3-shim-validate

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest

    env:
      NODE_OPTIONS: --dns-result-order=ipv4first
      NODE_NO_HTTP2: 1
      # Set to enable live Stylus reseed; omit for deterministic mode
      # STYLUS_RPC: https://sepolia-rollup.arbitrum.io/rpc

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: Start hardhat node
        run: npx hardhat node --port 8549 &
      
      - name: Predeploy shims
        run: npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js

      - name: Reseed (Stylus if STYLUS_RPC set; else config)
        run: |
          if [ -n "${STYLUS_RPC}" ]; then
            npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus
          else
            npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost
          fi

      - name: Readback tuple
        run: npx hardhat --config hardhat.config.js run --network localhost scripts/check-gasinfo-local.js

      - name: Validate probe
        run: npx hardhat --config hardhat.config.js run --network localhost scripts/validate-precompiles.js
```

Notes:

* Secret RPC endpoints (if used) should be stored as repository or environment secrets, then mapped to `STYLUS_RPC`.

---

## 5) Local developer loop

Two patterns are typical.

### 5.1 In-process (single command run)

Suitable for quick smoke checks. The one-shot installer can predeploy and verify within the same Hardhat process:

```bash
npx hardhat --config hardhat.config.js run scripts/install-and-check-shims.js
```

### 5.2 Persistent node (recommended for iteration)

```bash
# Terminal A
npx hardhat node --port 8549

# Terminal B
export NODE_OPTIONS=--dns-result-order=ipv4first
export NODE_NO_HTTP2=1
export STYLUS_RPC=https://sepolia-rollup.arbitrum.io/rpc

npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus
npx hardhat --config hardhat.config.js run --network localhost scripts/check-gasinfo-local.js
npx hardhat --config hardhat.config.js run --network localhost scripts/validate-precompiles.js
```

---

## 6) Build artifacts and logs

* **Console output** from reseed shows the chosen source and resulting tuple:

  * `ℹ️ fetched from Stylus: [...]` or
  * `ℹ️ using JSON/config (shim order): [...]` or
  * `ℹ️ using plugin fallback: [...]`
* Validation logs include:

  * Detected handlers and addresses
  * Raw precompile call results
  * Contract deployment address
  * Contract call results

Archiving these logs in CI is recommended for traceability (e.g., as workflow artifacts).

---

## 7) Failure modes & mitigation

| Symptom                                          | Likely cause                                   | Mitigation                                                                                             |
| ------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HH108: Cannot connect to the network localhost` | Hardhat node not running on expected port      | Ensure `npx hardhat node --port 8549` is started; match `networks.localhost.url`                       |
| `RPC fetch failed …` during reseed               | Public RPC blocked, DNS/HTTP2 oddities         | Set `NODE_OPTIONS=--dns-result-order=ipv4first` and `NODE_NO_HTTP2=1`; retry; fall back to config mode |
| `ArbGasInfoShim not installed …`                 | Predeploy step was skipped                     | Run `scripts/predeploy-precompiles.js` or one-shot installer                                           |
| Tuple printed as `0x` or decoding error          | Querying wrong chain/port                      | Confirm the RPC endpoint points to the Hardhat node that hosts the shim                                |
| `getCurrentTxL1GasFees` differs from expectation | In shim mode it mirrors slot 1 for determinism | Behavior is by design to keep tests stable                                                             |

---

## 8) Security & hygiene

* Public RPC endpoints can rate-limit or rotate behavior; deterministic mode avoids non-determinism.
* Secrets for private RPCs must be handled via CI secret storage; never committed to version control.
* Log redaction should be considered when using credentialed endpoints.

---

## 9) Extension hooks (non-blocking)

* A cache file (e.g., `.cache/stylus-prices.json`) can be written after successful live reseed and used as a high-priority offline source on subsequent runs.
* A periodic scheduled job can refresh the cache to keep the default shim tuple in sync with the testnet.

---

## 10) Exit criteria (Milestone 3 scope)

* Shims are predeployed at the canonical addresses.
* Reseed task succeeds in both **deterministic** and **live Stylus** modes.
* Validation script passes: raw precompile calls and contract calls return expected values.
* CI workflow enforces the above on each change.
