import { task } from "hardhat/config";

const ADDR_GASINFO = "0x000000000000000000000000000000000000006c" as const;

function asStrings(tuple: any): string[] {
  return Array.from(tuple).map((x: any) => x.toString());
}

async function fetchRemoteTuple(hre: any, rpcUrl: string): Promise<string[]> {
  const iface = new hre.ethers.Interface([
    "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
  ]);
  const data = iface.encodeFunctionData("getPricesInWei", []);
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: ADDR_GASINFO, data }, "latest"],
    }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const j: any = await res.json();
  if (j.error) throw new Error(`RPC error: ${j.error.message ?? "unknown"}`);
  const decoded = iface.decodeFunctionResult("getPricesInWei", j.result);
  return asStrings(decoded);
}

function diffTuples(local: string[] | null, remote: string[] | null) {
  const out = [];
  for (let i = 0; i < 6; i++) {
    out.push({
      idx: i,
      local: local?.[i] ?? null,
      remote: remote?.[i] ?? null,
      equal: local?.[i] === remote?.[i],
    });
  }
  return out;
}

/**
 * Compare local Hardhat tuple vs remote (Stylus/Nitro) tuple.
 *
 * Usage:
 *   npx hardhat arb:gas-info --stylus
 *   npx hardhat arb:gas-info --nitro
 *   npx hardhat arb:gas-info --rpc https://sepolia-rollup.arbitrum.io/rpc
 *   npx hardhat arb:gas-info --stylus --json
 */
task("arb:gas-info", "Compare local ArbGasInfo tuple with a remote RPC")
  .addFlag("stylus", "Use Stylus RPC (STYLUS_RPC or config.arbitrum.stylusRpc)")
  .addFlag("nitro", "Use Nitro RPC (NITRO_RPC or config.arbitrum.nitroRpc)")
  .addOptionalParam("rpc", "Explicit remote RPC URL")
  .addFlag("json", "Print machine-readable JSON")
  .setAction(async (args, hre) => {
    // Local tuple (works with shim or native)
    const abi = [
      "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
    ];
    const c = new (hre as any).ethers.Contract(ADDR_GASINFO, abi, (hre as any).ethers.provider);

    let local: string[] | null;
    try {
      local = asStrings(await c.getPricesInWei());
    } catch (e: any) {
      console.log("⚠️  Local read failed:", e.message);
      local = null;
    }

    // Determine remote RPC
    let remoteRpc: string | null = (args.rpc as string) || null;
    if (!remoteRpc) {
      if (args.stylus) {
        remoteRpc =
          process.env.STYLUS_RPC ||
          ((hre.config as any).arbitrum && (hre.config as any).arbitrum.stylusRpc) ||
          null;
      } else if (args.nitro) {
        remoteRpc =
          process.env.NITRO_RPC ||
          ((hre.config as any).arbitrum && (hre.config as any).arbitrum.nitroRpc) ||
          null;
      } else {
        const rt = ((hre.config as any).arbitrum && (hre.config as any).arbitrum.runtime) || "stylus";
        remoteRpc =
          rt === "stylus"
            ? process.env.STYLUS_RPC ||
              ((hre.config as any).arbitrum && (hre.config as any).arbitrum.stylusRpc) ||
              null
            : process.env.NITRO_RPC ||
              ((hre.config as any).arbitrum && (hre.config as any).arbitrum.nitroRpc) ||
              null;
      }
    }

    // Remote tuple
    let remote: string[] | null = null;
    if (remoteRpc) {
      try {
        remote = await fetchRemoteTuple(hre, remoteRpc);
      } catch (e: any) {
        console.log(`⚠️  Remote fetch failed (${remoteRpc}):`, e.message);
      }
    } else {
      console.log("ℹ️  No remote RPC provided/resolved; skipping remote read.");
    }

    const d = diffTuples(local, remote);
    if (args.json) {
      console.log(JSON.stringify({ local, remote, diff: d, rpc: remoteRpc || null }, null, 2));
      return;
    }

    console.log("Local tuple     :", local);
    console.log("Remote tuple    :", remote, remoteRpc ? `(${remoteRpc})` : "");
    console.log("Index-by-index  :");
    for (const row of d) {
      const mark = row.equal ? "==" : "!=";
      console.log(`  [${row.idx}] ${row.local ?? "null"} ${mark} ${row.remote ?? "null"}`);
    }
  });
