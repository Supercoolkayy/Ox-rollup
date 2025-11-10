# **Performance and Advanced Usage**
---

This guide covers advanced features designed to speed up your local testing workflow and verify the performance of the precompile shims.

---

## **Speeding Up Tests with RPC Caching**

When you use the `arb:reseed-shims` task with the `--stylus` flag, the plugin fetches the latest gas price data from a live RPC endpoint. Making a network call every time you run your tests can be slow.

To significantly speed this up, you can enable **RPC caching**.

### How Caching Works

When enabled, the plugin saves the fetched gas-price tuple to a local file. On subsequent runs, if the cache is still valid, the plugin reads from the file instead of making a network call, resulting in a much faster reseeding process.

* **Cache File Location:** The cache is stored at `.cache/stylus-prices.json` in your project root.
* **Activation:** Caching is activated by adding the `--cache-ttl <seconds>` flag to the reseed command.

### Usage Example

**First Run (Cache Miss):**
Run the reseed task with a Time-To-Live (TTL) for the cache (e.g., 600 seconds / 10 minutes). The task will fetch data from the RPC and create the cache file.

```bash
STYLUS_RPC=[https://sepolia-rollup.arbitrum.io/rpc](https://sepolia-rollup.arbitrum.io/rpc) \
npx hardhat arb:reseed-shims --network localhost --stylus --cache-ttl 600
```

**Expected Output:**

```
ℹ️ fetched from Stylus: [...]
✅ Re-seeded getPricesInWei -> [...]
```

**Second Run (Cache Hit):**
Run the same command again within the 10-minute TTL. This time, it reads from the local cache, skipping the network request. You can even run it without the `STYLUS_RPC` variable set.

```bash
npx hardhat arb:reseed-shims --network localhost --stylus --cache-ttl 600
```

**Expected Output:**

```
ℹ️ using Stylus file cache: [...]
✅ Re-seeded getPricesInWei -> [...]
```

---

## **Benchmarking Local Performance**

The precompile shims are designed to be extremely lightweight. To help you verify their performance, the plugin includes a micro-benchmark script. This script runs a high number of sequential reads against the `ArbGasInfo` shim to measure its latency.

### How to Run the Benchmark

Use the following command to execute 1,000 sequential `eth_call` reads. You can change the value of `N` to run more or fewer iterations.

```bash
N=1000 npx hardhat run --network localhost scripts/micro-bench-gasinfo.js
```

**Expected Output (will vary by machine):**

```
Reads: 1000, total ms: 1746, avg ms/read: 1.746
```

This demonstrates the negligible overhead of the shim, ensuring it won't slow down your test suite.

---

## **Future Feature: Gas Cost Accounting**

To better simulate on-chain behavior, a future version of the plugin will introduce realistic gas cost accounting for precompile calls. The configuration for this feature is reserved but has no effect in the current shim-only mode.

**Reserved Configuration (`hardhat.config.js`)**

```js
// This configuration is for a future feature and is currently a no-op.
arbitrum: {
  costing: {
    enabled: false,
    emulateNitro: false
  }
}
```

In the current version, calls to the shims via `eth_call` do not report `gasUsed`.
