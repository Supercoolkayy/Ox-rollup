import fs from "fs";
import path from "path";
import hre from "hardhat";

const ADDR_ARBSYS  = "0x0000000000000000000000000000000000000064" as const;
const ADDR_GASINFO = "0x000000000000000000000000000000000000006c" as const;

const ABI = [
  "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
];

const slotHex = (i: number) => "0x" + i.toString(16).padStart(64, "0");
const wordHex = (v: string | number | bigint) =>
  "0x" + BigInt(v).toString(16).padStart(64, "0");

async function main() {
  await hre.run("compile");

  // load plugin-built shim artifacts
  const sys = await hre.artifacts.readArtifact("ArbSysShim");
  const gas = await hre.artifacts.readArtifact("ArbGasInfoShim");

  await hre.network.provider.send("hardhat_setCode", [ADDR_ARBSYS,  sys.deployedBytecode]);
  await hre.network.provider.send("hardhat_setCode", [ADDR_GASINFO, gas.deployedBytecode]);

  // config: accept both shapes for compatibility
  const cfgPath =
    process.env.ARB_PRECOMPILES_CONFIG ??
    path.join(process.cwd(), "precompiles.config.json");

  let cfg: any = {};
  if (fs.existsSync(cfgPath)) {
    try { cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8")); } catch {}
  }

  const chainId =
    cfg.arbSysChainId ??
    cfg.arbSys?.chainId ??
    42161;

  await hre.network.provider.send("hardhat_setStorageAt", [
    ADDR_ARBSYS,
    slotHex(0),
    wordHex(chainId),
  ]);

  const tuple =
    cfg.gas?.pricesInWei ??
    cfg.arbGasInfo?.pricesInWei ??
    ["69440", "496", "2000000000000", "100000000", "0", "100000000"];

  for (let i = 0; i < 6; i++) {
    await hre.network.provider.send("hardhat_setStorageAt", [
      ADDR_GASINFO,
      slotHex(i),
      wordHex(String(tuple[i])),
    ]);
  }

  const c = new (hre as any).ethers.Contract(ADDR_GASINFO, ABI, (hre as any).ethers.provider);
  const r = await c.getPricesInWei();
  console.log("getPricesInWei():", Array.from(r).map((x: any) => x.toString()));
  console.log("✅ shims installed, seeded, and verified in one run.");
}

main().catch((e) => { console.error(e); process.exit(1); });
