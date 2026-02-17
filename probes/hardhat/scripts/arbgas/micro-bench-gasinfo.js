const hre = require("hardhat");
const ADDR = "0x000000000000000000000000000000000000006c";
const ABI = [
  "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)"
];

async function main() {
  const N = Number(process.env.N || 1000);
  const c = new hre.ethers.Contract(ADDR, ABI, hre.ethers.provider);

  // warmup
  await c.getPricesInWei();

  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    await c.getPricesInWei();
  }
  const dt = Date.now() - t0;

  console.log(`Reads: ${N}, total ms: ${dt}, avg ms/read: ${(dt / N).toFixed(3)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
