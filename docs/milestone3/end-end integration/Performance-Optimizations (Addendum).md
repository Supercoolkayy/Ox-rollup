# Milestone 3 — Performance Optimizations (Addendum)

This addendum documents the incremental changes introduced for Milestone 3 performance work within the **shim-only** scope: RPC gas-tuple caching and a lightweight micro-benchmark. Configuration hooks for future gas-cost accounting are also described.

---

## New capabilities

### 1) RPC gas-tuple caching (Stylus-first)

**Goal:** reduce repeated network calls during reseeding while preserving deterministic behavior.

**Behavior**

* The reseed task can cache the 6-value Stylus gas tuple returned by `ArbGasInfo.getPricesInWei()`.
* Cache is persisted to a JSON file and reused until a configurable TTL expires.
* When cache is valid, reseed logs indicate a cache hit and the tuple is applied without an RPC round trip.

**Artifacts**

* Cache file path: `.cache/stylus-prices.json` (project root).
* File contents: a JSON array of six decimal strings (shim order).

**Task flag**

* `--cache-ttl <seconds>` — enables caching and sets the time-to-live for the on-disk cache.

  * Example: `--cache-ttl 600` (10 minutes).
  * Example: `--cache-ttl 0` disables reuse (always fetches).

**Source priority remains unchanged**

1. Stylus RPC (when explicitly selected or configured)
2. `precompiles.config.json` (shim order)
3. Built-in fallback tuple

**Examples**

```
STYLUS_RPC=https://sepolia-rollup.arbitrum.io/rpc \
npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus --cache-ttl 600
# → ℹ️ fetched from Stylus: [...]
# → ✅ Re-seeded getPricesInWei -> [...]

npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus --cache-ttl 600
# → ℹ️ using Stylus file cache: [...]
# → ✅ Re-seeded getPricesInWei -> [...]
```

---

### 2) Micro-benchmark (sanity)

**Goal:** demonstrate negligible overhead for repeated reads in shim mode.

**Script**

* `scripts/micro-bench-gasinfo.js` — executes `N` sequential `eth_call` reads of `getPricesInWei()` against the local node and prints total/average latency.

**Usage**

```
N=1000 npx hardhat --config hardhat.config.js run --network localhost scripts/micro-bench-gasinfo.js
# → Reads: 1000, total ms: 1746, avg ms/read: 1.746
```

Performance numbers vary by machine; above output reflects a typical run observed during validation.

---

### 3) Costing configuration (reserved; shim-safe)

**Intent:** allow configurable, stable gas-cost accounting when native precompile hooks are enabled in a later phase.

**Config shape**

```js
arbitrum: {
  costing: {
    enabled: false,      // default off (shim behavior unchanged)
    emulateNitro: false  // reserved for future native mode
  }
}
```

**Current scope**

* In shim-only mode, JSON-RPC `eth_call` does not report `gasUsed`; enabling this flag has no effect on receipts produced via calls.
* Native VM handler paths (not part of this milestone slice) can read this config and return a small, constant, non-zero `gasUsed` to satisfy realism without breaking tests.

---

## Operational notes

* Cache file is written only on successful Stylus fetch with `--stylus` and a positive `--cache-ttl`.
* A valid cache is reused even if the `STYLUS_RPC` variable is not set during subsequent runs, until TTL expiration.
* Cache contents are in **shim order**:

  ```
  [ l2BaseFee, l1BaseFeeEstimate, l1CalldataCost, l1StorageCost, congestionFee, aux ]
  ```

---

## Quick verification

1. **Fresh fetch and cache write**

   ```
   rm -f .cache/stylus-prices.json
   STYLUS_RPC=https://sepolia-rollup.arbitrum.io/rpc \
   npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus --cache-ttl 600
   # Expect: “fetched from Stylus …”, cache file created
   ```

2. **Cache hit without network**

   ```
   unset STYLUS_RPC
   npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus --cache-ttl 600
   # Expect: “using Stylus file cache …”
   ```

3. **Performance sanity**

   ```
   N=1000 npx hardhat --config hardhat.config.js run --network localhost scripts/micro-bench-gasinfo.js
   # Expect low single-ms average per read
   ```

---

## Limitations

* Caching covers the tuple fetch during reseeding only; it does not alter Hardhat’s provider behavior for subsequent `eth_call` executions.
* Gas-cost accounting remains a no-op in shim mode; enabling realistic `gasUsed` requires native VM precompile hooks (tracked for a later milestone).
