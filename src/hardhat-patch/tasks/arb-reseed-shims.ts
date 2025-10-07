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
function nitroToShimTuple(n: Six): Six {
  const baseFee           = n[0];
  const l1BaseFeeEstimate = n[1];
  const l1CalldataCost    = n[2];
  const l2BaseFee         = n[3];
  const congestionFee     = n[4];
  const blobBaseFee       = n[5];
  const l1StorageCost     = "0"; // no explicit Nitro source

  return [
    l2BaseFee,
    l1BaseFeeEstimate,
    l1CalldataCost,
    l1StorageCost,
    congestionFee,
    blobBaseFee,
  ];
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
  .addFlag("stylus", "Fetch from Stylus RPC (alias: --fromStylus)")
  .addFlag("fromStylus", "Alias for --stylus")
  .addFlag("nitro", "Fetch from Nitro RPC (alias: --fromNitro)")
  .addFlag("fromNitro", "Alias for --nitro")
  .addOptionalParam("rpc", "Explicit RPC URL override")
  .setAction(async (flags, hre) => {
    // ensure shim code exists
    const code = await hre.network.provider.send("eth_getCode", [ADDR_GASINFO, "latest"]);
    if (code === "0x") {
      console.log("❌ ArbGasInfoShim not installed at 0x...6c. Run arb:install-shims or your predeploy first.");
      return;
    }

    const project = loadJsonConfig(hre);
    const userCfg = (hre.config as any).arbitrum ?? {};
    const runtime = (userCfg.runtime ?? project.runtime ?? "stylus") as "stylus" | "nitro";

    // Priority:
    // 1) --rpc
    // 2) --stylus / STYLUS_RPC / config.stylusRpc (default when runtime=stylus)
    // 3) --nitro  / NITRO_RPC  / config.nitroRpc
    // 4) precompiles.config.json gas.pricesInWei (already shim order)
    // 5) safe fallback
    let shimTuple: Six | null = null;

    // 1) direct RPC
    if (flags.rpc && typeof flags.rpc === "string") {
      const t = await fetchPricesTuple(flags.rpc, hre);
      if (t) {
        console.log("ℹ️ fetched from --rpc:", t);
        shimTuple = t; // already shim order (ArbGasInfo.getPricesInWei)
      } else {
        console.log("⚠️  RPC fetch failed (override).");
      }
    }

    // 2) stylus
    const wantStylus = !!(flags.stylus || flags.fromStylus || (!flags.nitro && runtime === "stylus"));
    if (!shimTuple && wantStylus) {
      const stylusRpc =
        (userCfg.stylusRpc ?? project.stylusRpc ?? process.env.STYLUS_RPC) || null;
      if (stylusRpc) {
        const t = await fetchPricesTuple(stylusRpc, hre);
        if (t) {
          console.log("ℹ️ fetched from Stylus:", t);
          shimTuple = t;
        } else {
          console.log("⚠️ Stylus RPC fetch failed.");
        }
      }
    }

    // 3) nitro
    const wantNitro = !!(flags.nitro || flags.fromNitro || (!flags.stylus && runtime === "nitro"));
    if (!shimTuple && wantNitro) {
      const nitroRpc =
        (userCfg.nitroRpc ?? project.nitroRpc ?? process.env.NITRO_RPC) || null;
      if (nitroRpc) {
        const t = await fetchPricesTuple(nitroRpc, hre);
        if (t) {
          const s = nitroToShimTuple(t);
          console.log("ℹ️ fetched from Nitro:", t, "→ shim:", s);
          shimTuple = s;
        } else {
          console.log("⚠️ Nitro RPC fetch failed.");
        }
      }
    }

    // 4) JSON/config (already shim order)
    if (!shimTuple) {
      const arr =
        (project?.gas?.pricesInWei as string[] | undefined) ??
        (userCfg?.gas?.pricesInWei as string[] | undefined);
      if (Array.isArray(arr) && arr.length === 6) {
        shimTuple = arr.map(String) as Six;
        console.log("ℹ️ using JSON/config (shim order):", shimTuple);
      }
    }

    // 5) fallback
    if (!shimTuple) {
      shimTuple = [
        "100000000",     // l2BaseFee (0.1 gwei)
        "1000000000",    // l1BaseFeeEstimate (1 gwei)
        "2000000000000", // l1CalldataCost
        "0",             // l1StorageCost
        "0",             // congestionFee
        "100000000",     // aux (blobBaseFee placeholder)
      ];
      console.log("ℹ️ using fallback:", shimTuple);
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
    console.log("✅ Re-seeded getPricesInWei ->", Array.from(r).map((x: any) => x.toString()));
  });
