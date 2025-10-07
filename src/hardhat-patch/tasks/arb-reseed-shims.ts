import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import fs from "fs";
import path from "path";

const ADDR_GASINFO = "0x000000000000000000000000000000000000006c" as const;

type Six = [string, string, string, string, string, string];

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

// Nitro → Shim reorder (Nitro tuple observed: [baseFee,l1Base,l1Calldata,l2Base,congestion,blobBase])
function nitroToShimTuple(n: string[]) {
  if (!Array.isArray(n) || n.length !== 6) throw new Error("bad nitro tuple");
  const l1StorageCost = "0";
  const [baseFee, l1BaseFeeEstimate, l1CalldataCost, l2BaseFee, congestionFee, blobBaseFee] = n.map(String);
  return [l2BaseFee, l1BaseFeeEstimate, l1CalldataCost, l1StorageCost, congestionFee, blobBaseFee];
}

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
  return new (hre as any).ethers.Interface([
    "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
  ]);
}

// --- File cache helpers ---
function tryReadCache(cachePath: string, ttlMs: number): string[] | null {
  try {
    const st = fs.statSync(cachePath);
    if (Date.now() - st.mtimeMs > ttlMs) return null;
    const j = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    if (Array.isArray(j) && j.length === 6) return j.map(String);
  } catch {}
  return null;
}
function writeCache(cachePath: string, tuple: string[]) {
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(tuple), "utf8");
  } catch {}
}


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




task("arb:reseed-shims", "Seed ArbGasInfoShim from Stylus/Nitro RPC or JSON")
  .addFlag("stylus", "Fetch from Stylus RPC")
  .addFlag("nitro", "Fetch from Nitro RPC")
  .addOptionalParam("cacheTtl", "File cache TTL (seconds, Stylus only)", "0")
  .addOptionalParam("cachePath", "Cache file path (Stylus only)", ".cache/stylus-prices.json")
  .setAction(async (flags: any, hre: HardhatRuntimeEnvironment) => {
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

    let shimTuple: string[] | null = null;

    // Stylus path: optional cache → RPC
    if (wantStylus && stylusRpc) {
      if (cacheTtlMs > 0) {
        const cached = tryReadCache(cachePath, cacheTtlMs);
        if (cached) {
          shimTuple = cached;
          console.log("ℹ️ using Stylus file cache:", shimTuple);
        }
      }
      if (!shimTuple) {
        try {
          const t: any = await fetchPricesTuple(stylusRpc, hre);
          shimTuple = t.map(String); // already shim order
          console.log("ℹ️ fetched from Stylus:", shimTuple);
          if (cacheTtlMs > 0) writeCache(cachePath, (shimTuple as any));
        } catch (e: any) {
          console.log(`⚠️ Stylus RPC fetch failed (${stylusRpc}): ${e?.message ?? e}`);
        }
      }
    }

    // Nitro path (optional compatibility)
    if (!shimTuple && wantNitro && nitroRpc) {
      try {
        const t: any = await fetchPricesTuple(nitroRpc, hre);
        shimTuple = nitroToShimTuple(t);
        console.log("ℹ️ fetched from Nitro:", t, "→ shim:", shimTuple);
      } catch (e: any) {
        console.log(`⚠️ Nitro RPC fetch failed (${nitroRpc}): ${e?.message ?? e}`);
      }
    }

    // Project config
    if (!shimTuple) {
      const arr = cfg?.gas?.pricesInWei;
      if (Array.isArray(arr) && arr.length === 6) {
        shimTuple = arr.map(String);
        console.log("ℹ️ using JSON/config (shim order):", shimTuple);
      }
    }

    // Fallback
    if (!shimTuple) {
      shimTuple = ["100000000", "1000000000", "2000000000000", "0", "0", "100000000"];
      console.log("ℹ️ using plugin fallback:", shimTuple);
    }

    // Seed via shim’s __seed()
    const [signer] = await (hre as any).ethers.getSigners();
    const gasAbi = [
      "function __seed(uint256[6] calldata v) external",
      "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
    ];
    const gas = new (hre as any).ethers.Contract(ADDR_GASINFO, gasAbi, signer);
    const tx = await gas.__seed(shimTuple);
    await tx.wait();
    const r = await gas.getPricesInWei();
    console.log("✅ Re-seeded getPricesInWei ->", r.map((x: any) => x.toString()));
  });
