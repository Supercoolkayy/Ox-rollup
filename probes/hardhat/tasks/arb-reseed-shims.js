const { task } = require("hardhat/config");
const fs = require("fs");
const path = require("path");

const ADDR_GASINFO = "0x000000000000000000000000000000000000006c";

// Nitro → Shim reorder
function nitroToShimTuple(n) {
  if (!Array.isArray(n) || n.length !== 6) throw new Error("bad nitro tuple");
  const baseFee           = n[0];
  const l1BaseFeeEstimate = n[1];
  const l1CalldataCost    = n[2];
  const l2BaseFee         = n[3];
  const congestionFee     = n[4];
  const blobBaseFee       = n[5];
  const l1StorageCost     = 0; // no explicit source from Nitro
  return [
    l2BaseFee,
    l1BaseFeeEstimate,
    l1CalldataCost,
    l1StorageCost,
    congestionFee,
    blobBaseFee, // keep blob base fee in aux slot for debugging
  ].map((x) => x.toString());
}

// Raw JSON-RPC call (no Provider handshake)
async function rpcCall(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} HTTP ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(`RPC ${method} error: ${j.error.message ?? "unknown"}`);
  return j.result;
}

// Encode/decode getPricesInWei() using ethers Interface (no network needed)
function makeIface(hre) {
  return new hre.ethers.Interface([
    "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
  ]);
}
async function fetchPricesTuple(rpcUrl, hre) {
  const iface = makeIface(hre);
  const data = iface.encodeFunctionData("getPricesInWei", []);
  const result = await rpcCall(rpcUrl, "eth_call", [{ to: ADDR_GASINFO, data }, "latest"]);
  const decoded = iface.decodeFunctionResult("getPricesInWei", result);
  return decoded.map((x) => x.toString());
}

function loadJsonConfig(hre) {
  const root = hre.config.paths?.root ?? process.cwd();
  const file = process.env.ARB_PRECOMPILES_CONFIG ?? path.join(root, "precompiles.config.json");
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {}
  }
  return {};
}

function mergedCfg(hre) {
  const defaults = {
    gas: { pricesInWei: null },                 // shim order if present
    runtime: "stylus",
    stylusRpc: process.env.STYLUS_RPC || null,
    nitroRpc:  process.env.NITRO_RPC  || null,
  };
  const fileCfg = loadJsonConfig(hre);
  const userCfg = hre.config.arbitrum ?? {};
  return { ...defaults, ...fileCfg, ...userCfg };
}

task("arb:reseed-shims", "Seed ArbGasInfoShim from Stylus/Nitro RPC or JSON")
  .addFlag("stylus", "Fetch from Stylus RPC (alias: --fromStylus)")
  .addFlag("fromStylus", "Alias for --stylus")
  .addFlag("nitro", "Fetch from Nitro RPC (alias: --fromNitro)")
  .addFlag("fromNitro", "Alias for --nitro")
  .setAction(async (flags, hre) => {
    // ensure shim code exists
    const code = await hre.network.provider.send("eth_getCode", [ADDR_GASINFO, "latest"]);
    if (code === "0x") {
      console.log("❌ ArbGasInfoShim not installed at 0x...6c. Run your shim install first.");
      return;
    }

    const cfg = mergedCfg(hre);
    const wantStylus = !!(flags.stylus || flags.fromStylus);
    const wantNitro  = !!(flags.nitro  || flags.fromNitro);

    let shimTuple = null;

    // RPC (Stylus or Nitro), if requested & available
    try {
      if (wantStylus && cfg.stylusRpc) {
        const t = await fetchPricesTuple(cfg.stylusRpc, hre);
        // Stylus returns the same order as needed to store (already "shim order")
        shimTuple = t.map(String);
        console.log("ℹ️ fetched from Stylus:", shimTuple);
      } else if (wantNitro && cfg.nitroRpc) {
        const nitroTuple = await fetchPricesTuple(cfg.nitroRpc, hre);
        shimTuple = nitroToShimTuple(nitroTuple);
        console.log("ℹ️ fetched from Nitro:", nitroTuple, "→ shim:", shimTuple);
      }
    } catch (e) {
      console.log(`⚠️  RPC fetch failed (${wantStylus ? cfg.stylusRpc : cfg.nitroRpc}): ${e.message}`);
      console.log("ℹ️ Stylus/Nitro RPC unavailable; will try other sources.");
    }

    //  JSON or hardhat.config.js values (already shim order)
    if (!shimTuple) {
      const arr = cfg?.gas?.pricesInWei;
      if (Array.isArray(arr) && arr.length === 6) {
        shimTuple = arr.map(String);
        console.log("ℹ️ using JSON/config (shim order):", shimTuple);
      }
    }

    //  Safe fallback (shim order)
    if (!shimTuple) {
      shimTuple = [
        "100000000",     // l2BaseFee (0.1 gwei)
        "1000000000",    // l1BaseFeeEstimate (1 gwei)
        "2000000000000", // l1CalldataCost
        "0",             // l1StorageCost
        "0",             // congestionFee
        "100000000",     // aux (e.g., blob base fee placeholder)
      ];
      console.log("ℹ️ using plugin fallback:", shimTuple);
    }

    // Seed via the shim’s __seed()
    const [signer] = await hre.ethers.getSigners();
    const gasAbi = [
      "function __seed(uint256[6] calldata v) external",
      "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
    ];
    const gas = new hre.ethers.Contract(ADDR_GASINFO, gasAbi, signer);

    const tx = await gas.__seed([
      shimTuple[0], shimTuple[1], shimTuple[2],
      shimTuple[3], shimTuple[4], shimTuple[5],
    ]);
    await tx.wait();

    const r = await gas.getPricesInWei();
    console.log("✅ Re-seeded getPricesInWei ->", r.map((x) => x.toString()));
  });
