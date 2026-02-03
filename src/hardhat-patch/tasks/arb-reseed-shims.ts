import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import fs from "fs";
import path from "path";

const ADDR_GASINFO = "0x000000000000000000000000000000000000006c" as const;

// --- Types ---

type Six = [string, string, string, string, string, string];

interface NitroScalars {
  l1BaseFeeEstimate: string;
  minimumGasPrice: string;
  speedLimitPerSecond: string;
  gasPoolMax: string;
  maxBlockGasLimit: string;
  maxTxGasLimit: string;
}

interface NitroConstraint {
  targetPerSecond: string;
  adjustmentWindow: string;
  backlog: string;
}

interface CacheData {
  legacy: Six | null;
  scalars: NitroScalars | null;
  constraints: NitroConstraint[] | null;
}

// --- Config Helpers ---

function loadJsonConfig(hre: HardhatRuntimeEnvironment): any {
  const root = hre.config.paths?.root ?? process.cwd();
  const override = process.env.ARB_PRECOMPILES_CONFIG;
  const file = override ?? path.join(root, "precompiles.config.json");
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {}
  }
  return {};
}

// --- RPC Helpers ---

async function rpcCall(rpcUrl: string, method: string, params: any[]): Promise<any> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} HTTP ${res.status}`);
  const j: any = await res.json();
  if (j.error) throw new Error(`RPC ${method} error: ${j.error.message ?? "unknown"}`);
  return j.result;
}

function makeIface(hre: HardhatRuntimeEnvironment) {
  // Extended Interface for all new methods
  return new (hre as any).ethers.Interface([
    "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
    "function getL1BaseFeeEstimate() view returns (uint256)",
    "function getGasAccountingParams() view returns (uint256, uint256, uint256)",
    "function getMinimumGasPrice() view returns (uint256)",
    "function getMaxTxGasLimit() view returns (uint256)",
    "function getGasPricingConstraints() view returns (tuple(uint64, uint64, uint64)[])"
  ]);
}

// --- File Cache Helpers (Backward Compatible) ---

function tryReadCache(cachePath: string, ttlMs: number): CacheData | null {
  try {
    const st = fs.statSync(cachePath);
    if (Date.now() - st.mtimeMs > ttlMs) return null;
    
    const j = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    
    // Case 1: Legacy Cache (Just an array)
    if (Array.isArray(j) && j.length === 6) {
      return { legacy: j as Six, scalars: null, constraints: null };
    }
    
    // Case 2: New Cache (Object)
    if (j && typeof j === 'object' && !Array.isArray(j)) {
        return {
            legacy: Array.isArray(j.legacy) && j.legacy.length === 6 ? (j.legacy as Six) : null,
            scalars: j.scalars || null,
            constraints: Array.isArray(j.constraints) ? j.constraints : null
        };
    }
  } catch {}
  return null;
}

function writeCache(cachePath: string, data: CacheData) {
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), "utf8");
  } catch {}
}

// --- Fetchers (Independent Buckets) ---

async function fetchPricesTuple(rpcUrl: string, hre: HardhatRuntimeEnvironment): Promise<Six | null> {
  try {
    const iface = makeIface(hre);
    const data = iface.encodeFunctionData("getPricesInWei", []);
    const result = await rpcCall(rpcUrl, "eth_call", [{ to: ADDR_GASINFO, data }, "latest"]);
    const decoded = iface.decodeFunctionResult("getPricesInWei", result);
    const arr = Array.from(decoded).map((x: any) => x.toString());
    return arr.length === 6 ? (arr as Six) : null;
  } catch {
    return null;
  }
}

async function fetchNitroScalars(rpcUrl: string, hre: HardhatRuntimeEnvironment): Promise<NitroScalars | null> {
  try {
    const iface = makeIface(hre);
    
    // Parallel fetch for speed
    const [rawL1, rawMin, rawAcc] = await Promise.all([
        rpcCall(rpcUrl, "eth_call", [{ to: ADDR_GASINFO, data: iface.encodeFunctionData("getL1BaseFeeEstimate", []) }, "latest"]),
        rpcCall(rpcUrl, "eth_call", [{ to: ADDR_GASINFO, data: iface.encodeFunctionData("getMinimumGasPrice", []) }, "latest"]),
        rpcCall(rpcUrl, "eth_call", [{ to: ADDR_GASINFO, data: iface.encodeFunctionData("getGasAccountingParams", []) }, "latest"]),
    ]);

    // Handle MaxTxGas (might fail on older nodes)
    let maxTxGas = "0";
    try {
        const rawTx = await rpcCall(rpcUrl, "eth_call", [{ to: ADDR_GASINFO, data: iface.encodeFunctionData("getMaxTxGasLimit", []) }, "latest"]);
        maxTxGas = iface.decodeFunctionResult("getMaxTxGasLimit", rawTx)[0].toString();
    } catch {
        // Fallback to maxBlockGas if tx limit unavailable
        const acc = iface.decodeFunctionResult("getGasAccountingParams", rawAcc);
        maxTxGas = acc[2].toString(); 
    }

    const l1 = iface.decodeFunctionResult("getL1BaseFeeEstimate", rawL1);
    const min = iface.decodeFunctionResult("getMinimumGasPrice", rawMin);
    const acc = iface.decodeFunctionResult("getGasAccountingParams", rawAcc);

    return {
        l1BaseFeeEstimate: l1[0].toString(),
        minimumGasPrice: min[0].toString(),
        speedLimitPerSecond: acc[0].toString(),
        gasPoolMax: acc[1].toString(),
        maxBlockGasLimit: acc[2].toString(),
        maxTxGasLimit: maxTxGas
    };
  } catch {
    return null;
  }
}

async function fetchConstraints(rpcUrl: string, hre: HardhatRuntimeEnvironment): Promise<NitroConstraint[] | null> {
  try {
    const iface = makeIface(hre);
    const raw = await rpcCall(rpcUrl, "eth_call", [{ to: ADDR_GASINFO, data: iface.encodeFunctionData("getGasPricingConstraints", []) }, "latest"]);
    const decoded = iface.decodeFunctionResult("getGasPricingConstraints", raw);
    
    if (decoded[0] && Array.isArray(decoded[0])) {
        return decoded[0].map((c: any) => ({
            targetPerSecond: c[0].toString(),
            adjustmentWindow: c[1].toString(),
            backlog: c[2].toString()
        }));
    }
    return [];
  } catch {
    return null;
  }
}

// --- Main Task ---

task("arb:reseed-shims", "Seed ArbGasInfoShim from Stylus/Nitro RPC or JSON")
  .addFlag("stylus", "Fetch from Stylus RPC")
  .addFlag("nitro", "Fetch from Nitro RPC")
  .addOptionalParam("cacheTtl", "File cache TTL (seconds, Stylus only)", "0")
  .addOptionalParam("cachePath", "Cache file path (Stylus only)", ".cache/stylus-prices.json")
  .setAction(async (flags: any, hre: HardhatRuntimeEnvironment) => {
    // Verify Contract
    const code = await hre.network.provider.send("eth_getCode", [ADDR_GASINFO, "latest"]);
    if (code === "0x") {
      console.log("❌ ArbGasInfoShim not installed at 0x…6c. Install shims first.");
      return;
    }

    const cfg = { ...loadJsonConfig(hre), ...(hre.config as any).arbitrum };
    const wantStylus = !!flags.stylus;
    const wantNitro  = !!flags.nitro;

    const stylusRpc = cfg.stylusRpc ?? process.env.STYLUS_RPC ?? null;
    const nitroRpc  = cfg.nitroRpc  ?? process.env.NITRO_RPC  ?? null;

    const cacheTtlMs = Math.max(0, Number(flags.cacheTtl) | 0) * 1000;
    const cachePath  = String(flags.cachePath ?? ".cache/stylus-prices.json");

    // --- BUCKETS ---
    let bucketLegacy: Six | null = null;
    let bucketScalars: NitroScalars | null = null;
    let bucketConstraints: NitroConstraint[] | null = null;

    // --- PHASE 1: RESOLVE SOURCES ---

    // A. Network Sync (Stylus/Nitro Flags)
    // If flags are set, it attempt to fetch ALL buckets from the network.
    if (wantStylus || wantNitro) {
        const targetRpc = wantStylus ? stylusRpc : nitroRpc;
        const targetName = wantStylus ? "Stylus" : "Nitro";
        
        if (targetRpc) {
            // 1. Try Cache First
            if (cacheTtlMs > 0) {
                const cached = tryReadCache(cachePath, cacheTtlMs);
                if (cached) {
                    // We only use cache if it has what we need, otherwise we refetch
                    bucketLegacy = cached.legacy;
                    bucketScalars = cached.scalars;
                    bucketConstraints = cached.constraints;
                    if (bucketLegacy) console.log(`ℹ️ using ${targetName} file cache:`, bucketLegacy);
                }
            }

            // 2. Fetch Legacy (If not in cache)
            if (!bucketLegacy) {
                try {
                   bucketLegacy = await fetchPricesTuple(targetRpc, hre);
                   if (bucketLegacy) console.log(`ℹ️ fetched legacy from ${targetName}:`, bucketLegacy);
                } catch(e: any) {
                    console.log(`⚠️ ${targetName} RPC fetch failed: ${e?.message ?? e}`);
                }
            }

            // 3. Fetch Extended Buckets (If cache didn't provide them)
            // Note: We attempt these if we are in "Network Mode"
            if (!bucketScalars) {
                bucketScalars = await fetchNitroScalars(targetRpc, hre);
            }
            if (!bucketConstraints) {
                bucketConstraints = await fetchConstraints(targetRpc, hre);
            }

            // 4. Update Cache (Write back full state)
            if (cacheTtlMs > 0) {
                writeCache(cachePath, { 
                    legacy: bucketLegacy, 
                    scalars: bucketScalars, 
                    constraints: bucketConstraints 
                });
            }
        }
    }

    // B. JSON Config (Granular Overrides)
    // Only if a bucket is still null do we look at JSON
    if (!bucketLegacy) {
        const arr = cfg?.gas?.pricesInWei;
        if (Array.isArray(arr) && arr.length === 6) {
            bucketLegacy = arr.map(String) as Six;
            console.log("ℹ️ using JSON/config (shim order):", bucketLegacy);
        }
    }
    
    // Check JSON for Nitro sections (Buckets B & C)
    const nitroCfg = cfg?.gas?.nitro;
    if (nitroCfg) {
        if (!bucketScalars && nitroCfg.accounting) {
            bucketScalars = {
                l1BaseFeeEstimate: nitroCfg.l1BaseFeeEstimate ?? "0",
                minimumGasPrice: nitroCfg.minimumGasPrice ?? "0",
                speedLimitPerSecond: nitroCfg.accounting.speedLimitPerSecond ?? "0",
                gasPoolMax: nitroCfg.accounting.gasPoolMax ?? "0",
                maxBlockGasLimit: nitroCfg.accounting.maxBlockGasLimit ?? "0",
                maxTxGasLimit: nitroCfg.accounting.maxTxGasLimit ?? "0"
            };
        }
        if (!bucketConstraints && Array.isArray(nitroCfg.constraints)) {
            bucketConstraints = nitroCfg.constraints;
        }
    }

    // C. Fallback (Factory Defaults)
    // Only triggers if we have NO data for ANY bucket and NO flags were used to suggest partial update
    const isNetworkMode = wantStylus || wantNitro;
    const isPartialUpdate = bucketLegacy || bucketScalars || bucketConstraints;

    // If we are completely empty, load defaults for everything
    if (!isPartialUpdate && !isNetworkMode) {
        console.log("ℹ️ using plugin fallback (Legacy + Nitro Defaults)");
        bucketLegacy = ["100000000", "1000000000", "2000000000000", "0", "0", "100000000"];
        bucketScalars = {
            l1BaseFeeEstimate: "0",
            minimumGasPrice: "100000000",
            speedLimitPerSecond: "120000000",
            gasPoolMax: "0",
            maxBlockGasLimit: "32000000",
            maxTxGasLimit: "32000000"
        };
        bucketConstraints = [];
    } 
    // Edge Case: Network mode failed completely -> Defaults for Legacy to keep compat
    else if (isNetworkMode && !bucketLegacy) {
         bucketLegacy = ["100000000", "1000000000", "2000000000000", "0", "0", "100000000"];
         console.log("ℹ️ using plugin fallback (Legacy)");
    }


    // --- PHASE 2: EXECUTION ---

    const [signer] = await (hre as any).ethers.getSigners();
    const gasAbi = [
      "function __seed(uint256[6] calldata v) external",
      "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
      "function __seedNitroConfig(uint256, uint256, uint256, uint256, uint256) external",
      "function __clearPricingConstraints() external",
      "function __pushPricingConstraint(uint64, uint64, uint64) external"
    ];
    const gas = new (hre as any).ethers.Contract(ADDR_GASINFO, gasAbi, signer);

    // 1. Seed  (Bucket A)
    if (bucketLegacy) {
        const tx = await gas.__seed(bucketLegacy);
        await tx.wait();
        const r = await gas.getPricesInWei();
        console.log("✅ Re-seeded getPricesInWei ->", r.map((x: any) => x.toString()));
    }

    // 2. Seed Scalars (Bucket B)
    if (bucketScalars) {
        // Safe check for contract support
        if (typeof gas.__seedNitroConfig === 'function') {
            const tx = await gas.__seedNitroConfig(
                bucketScalars.l1BaseFeeEstimate,
                bucketScalars.speedLimitPerSecond,
                bucketScalars.maxBlockGasLimit,
                bucketScalars.maxTxGasLimit,
                bucketScalars.minimumGasPrice
            );
            await tx.wait();
            // console.log("✅ Re-seeded Nitro Scalars");
        }
    }

    // 3. Seed Constraints (Bucket C)
    if (bucketConstraints) {
        if (typeof gas.__clearPricingConstraints === 'function') {
            let tx = await gas.__clearPricingConstraints();
            await tx.wait();
            
            for (const c of bucketConstraints) {
                tx = await gas.__pushPricingConstraint(c.targetPerSecond, c.adjustmentWindow, c.backlog);
                await tx.wait();
            }
            // console.log(`✅ Re-seeded ${bucketConstraints.length} Constraints`);
        }
    }
  });