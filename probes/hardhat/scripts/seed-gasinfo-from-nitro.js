// seeds 0x...6c storage slots [0..5] from Nitro's ArbGasInfo.getPricesInWei()
const hre = require("hardhat");
const { ethers } = require("ethers");

const NITRO_RPC = process.env.NITRO_RPC || "http://127.0.0.1:8547";
const GASINFO = "0x000000000000000000000000000000000000006c";
const ABI = [
  "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)"
];

function slotHex(i) { return "0x" + i.toString(16).padStart(64, "0"); }
function wordHex(v) { return "0x" + BigInt(v).toString(16).padStart(64, "0"); }

async function main() {
  // read tuple from Nitro
  const nitro = new ethers.JsonRpcProvider(NITRO_RPC);
  const gasInfo = new ethers.Contract(GASINFO, ABI, nitro);
  const tuple = await gasInfo.getPricesInWei();

  console.log("Nitro getPricesInWei():", tuple.map(x => x.toString()));

  // write into local Hardhat precompile shim storage
  for (let i = 0; i < 6; i++) {
    await hre.network.provider.send("hardhat_setStorageAt", [
      GASINFO,
      slotHex(i),
      wordHex(tuple[i]),
    ]);
  }
  console.log("✅ Seeded ArbGasInfo shim storage at 0x...6c (slots 0..5)");
}

main().catch((e) => { console.error(e); process.exit(1); });
