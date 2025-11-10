const hre = require("hardhat");

async function main() {
  const ARBGASINFO = "0x000000000000000000000000000000000000006c";
  const abi = [
    "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)"
  ];
  const c = new hre.ethers.Contract(ARBGASINFO, abi, hre.ethers.provider);
  const r = await c.getPricesInWei();
  console.log(r.map(x => x.toString()));
}

main().catch((e) => { console.error(e); process.exit(1); });
