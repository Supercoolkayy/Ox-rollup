/**
 * Compare local shim tuple vs Stylus RPC tuple.
 * Honors STYLUS_RPC; no writes performed.
 */
const hre = require("hardhat");
const ADDR_GASINFO = "0x000000000000000000000000000000000000006c";

async function rpcCall(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

async function main() {
  const iface = new hre.ethers.Interface([
    "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)"
  ]);

  // local
  const gas = new hre.ethers.Contract(ADDR_GASINFO, iface.fragments, hre.ethers.provider);
  const local = (await gas.getPricesInWei()).map(x => x.toString());

  // remote
  const rpc = process.env.STYLUS_RPC || (hre.config.arbitrum && hre.config.arbitrum.stylusRpc);
  let remote = null;
  if (rpc) {
    const data = iface.encodeFunctionData("getPricesInWei", []);
    const out = await rpcCall(rpc, "eth_call", [{ to: ADDR_GASINFO, data }, "latest"]);
    remote = iface.decodeFunctionResult("getPricesInWei", out).map(x => x.toString());
  }

  console.log("Local :", local);
  console.log("Remote:", remote, rpc ? `(${rpc})` : "(no RPC)");
  for (let i = 0; i < 6; i++) {
    const eq = local?.[i] === remote?.[i];
    console.log(`[${i}]`, local?.[i] ?? "-", eq ? "==" : "!=", remote?.[i] ?? "-");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
