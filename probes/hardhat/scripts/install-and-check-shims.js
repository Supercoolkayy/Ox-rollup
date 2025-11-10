const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const ADDR_ARBSYS  = "0x0000000000000000000000000000000000000064";
const ADDR_GASINFO = "0x000000000000000000000000000000000000006c";

const ABI = [
  "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)"
];

const slotHex = (i) => "0x" + i.toString(16).padStart(64, "0");
const wordHex = (v) => "0x" + BigInt(v).toString(16).padStart(64, "0");

async function main() {
  // compile to ensure artifacts exist
  await hre.run("compile");

  // load artifacts
  const sys = await hre.artifacts.readArtifact("ArbSysShim");
  const gas = await hre.artifacts.readArtifact("ArbGasInfoShim");

  // install code at the precompile addresses
  await hre.network.provider.send("hardhat_setCode", [ADDR_ARBSYS,  sys.deployedBytecode]);
  await hre.network.provider.send("hardhat_setCode", [ADDR_GASINFO, gas.deployedBytecode]);

  // seed from local JSON (no Nitro)
  const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "precompiles.config.json"), "utf8"));
  const chainId = cfg.arbSys?.chainId ?? 42161;
  await hre.network.provider.send("hardhat_setStorageAt", [ADDR_ARBSYS, slotHex(0), wordHex(chainId)]);

  const tuple = cfg.arbGasInfo?.pricesInWei ??
    ["69440","496","2000000000000","100000000","0","100000000"];
  for (let i = 0; i < 6; i++) {
    await hre.network.provider.send("hardhat_setStorageAt", [ADDR_GASINFO, slotHex(i), wordHex(tuple[i])]);
  }

  // read back in the SAME VM
  const c = new hre.ethers.Contract(ADDR_GASINFO, ABI, hre.ethers.provider);
  const r = await c.getPricesInWei();
  console.log("getPricesInWei():", r.map(x => x.toString()));
  console.log("✅ shims installed, seeded, and verified in one run.");
}

main().catch((e) => { console.error(e); process.exit(1); });
