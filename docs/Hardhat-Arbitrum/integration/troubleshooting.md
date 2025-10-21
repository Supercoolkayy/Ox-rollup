# **CI & Dev Loops**
---
End-to-end guidance for running the Stylus-first **shim** workflow in continuous integration and during local development. Scope is limited to section’s precompile shims and reseeding/validation flow (no VM precompile injection).

---

## **Objective**

* Provide reproducible validation of **ArbSys** (`0x…64`) and **ArbGasInfo** (`0x…6c`) during builds.
* Prefer **Stylus** gas data when a public RPC is reachable; otherwise fall back to project configuration or a safe default.
* Keep executions hermetic within Hardhat; shim mode is sufficient.

---

## **Prerequisites**

* Node.js ≥ 18 (global `fetch`) and a recent Hardhat.
* Tasks and scripts present in the project (or exposed by the plugin):

  * `arb:reseed-shims`
  * `scripts/predeploy-precompiles.js`
  * `scripts/check-gasinfo-local.js`
  * `scripts/validate-precompiles.js`
* Optional public Stylus RPC for live reseed:

  * `https://sepolia-rollup.arbitrum.io/rpc` (subject to rate limits)

Common environment variables:

* `STYLUS_RPC` — remote source of gas prices (preferred)
* `NITRO_RPC` — optional compatibility source
* `ARB_PRECOMPILES_CONFIG` — path override to JSON config
* `NODE_OPTIONS=--dns-result-order=ipv4first` — prefer IPv4 resolution
* `NODE_NO_HTTP2=1` — disable HTTP/2 negotiation (stability on some runners)

---

## **CI blueprint**

###  Deterministic mode (no network dependency)

**Purpose:** fully offline, reproducible runs. Gas tuple is read from `precompiles.config.json`.

**Steps**

1. Start a **persistent** Hardhat node on a fixed port (e.g., 8549).
2. Predeploy shim bytecode at the canonical addresses.
3. Reseed from **project config** (no `STYLUS_RPC`).
4. Validate using the provided scripts.

**Command sketch**

```bash
# start node (background)
npx hardhat node --port 8549 &

# predeploy shims
npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js

# reseed from config (no RPC flags)
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost

# validations
npx hardhat --config hardhat.config.js run --network localhost scripts/check-gasinfo-local.js
npx hardhat --config hardhat.config.js run --network localhost scripts/validate-precompiles.js
```

**Pass criteria**

* `check-gasinfo-local.js` prints a 6-value tuple from configuration.
* `validate-precompiles.js` prints:

  * `ArbSys arbChainID returned: 42161` (or configured chainId)
  * `ArbGasInfo getL1BaseFeeEstimate returned: …`
  * Contract calls complete; `getCurrentTxL1GasFees` mirrors the estimate in shim mode.

###  Live Stylus mode (optional network dependency)

**Purpose:** align the local tuple with a live Stylus testnet.

**Steps**

1. Export network tuning flags to improve fetch stability on CI runners.
2. Start a persistent Hardhat node.
3. Predeploy shims.
4. Reseed with `--stylus` (source is `STYLUS_RPC` or configured `stylusRpc`).
5. Validate.

**Command sketch**

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

**Pass criteria**
Same as deterministic mode; the tuple should reflect live network values.

---

## **GitHub Actions example (minimal)**

```yaml
name: shim-validate

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

Notes: secret RPC endpoints (if used) should be stored as repository or environment secrets and mapped to `STYLUS_RPC`.

---

## **Local developer loop**

Two patterns are typical.

### In-process (single command run)

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

## **Build artifacts and logs**

* Reseed logs indicate the chosen source and resulting tuple:

  * `ℹ️ fetched from Stylus: […]`
  * `ℹ️ using JSON/config (shim order): […]`
  * `ℹ️ using plugin fallback: […]`
* Validation logs include:

  * Detected handlers and addresses
  * Raw precompile call results
  * Contract deployment address
  * Contract call outcomes

Persisting these logs in CI as workflow artifacts is recommended for traceability.

---

## **Failure modes & mitigation**

| Symptom                                          | Likely cause                                  | Mitigation                                                                                           |
| ------------------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `HH108: Cannot connect to the network localhost` | Hardhat node not running on expected port     | Start `npx hardhat node --port 8549`; confirm `networks.localhost.url` matches the port              |
| `RPC fetch failed …` during reseed               | Public RPC blocked, DNS/HTTP2 issues          | Export `NODE_OPTIONS=--dns-result-order=ipv4first` and `NODE_NO_HTTP2=1`; retry; fall back to config |
| `ArbGasInfoShim not installed …`                 | Predeploy step skipped                        | Run `scripts/predeploy-precompiles.js` or the one-shot installer                                     |
| Tuple readback fails (e.g., `0x`/decode error)   | Querying the wrong chain/port                 | Point the provider at the Hardhat node that hosts the shim                                           |
| `getCurrentTxL1GasFees` differs from expectation | Shim mode maps to slot 1 (estimate) by design | Behavior is intentional to guarantee deterministic tests                                             |

---

## **Security & hygiene**

* Public RPC endpoints may rate-limit; deterministic mode avoids non-determinism.
* Secrets for private RPCs belong in CI secret storage and must not be committed.
* Console logs should avoid leaking credentialed endpoints.

---

## **Optional extensions**

* A local cache file (e.g., `.cache/stylus-prices.json`) can be written after a successful live reseed and used as a high-priority offline source.
* A scheduled job can periodically refresh the cache to keep default shim tuples aligned with the testnet.


