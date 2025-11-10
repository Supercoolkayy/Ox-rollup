const hre = require("hardhat");

const ADDR_ARBSYS  = "0x0000000000000000000000000000000000000064";
const ADDR_GASINFO = "0x000000000000000000000000000000000000006c";

const hex32 = (n) => "0x" + BigInt(n).toString(16).padStart(64, "0");

async function setCode(addr, bytecode) {
  await hre.network.provider.send("hardhat_setCode", [addr, bytecode]);
}
async function setStorage(addr, slotHex32, valueHex32) {
  await hre.network.provider.send("hardhat_setStorageAt", [addr, slotHex32, valueHex32]);
}

async function main() {
  await hre.run("compile");

  const arbSysArt  = await hre.artifacts.readArtifact("ArbSysShim");
  const gasInfoArt = await hre.artifacts.readArtifact("ArbGasInfoShim");

  await setCode(ADDR_ARBSYS,  arbSysArt.deployedBytecode);
  await setCode(ADDR_GASINFO, gasInfoArt.deployedBytecode);

  // init L1 base fee = 1 gwei in slot 0
  const slot0   = "0x" + "00".repeat(31) + "00";
  const oneGwei = hex32(1_000_000_000n);
  await setStorage(ADDR_GASINFO, slot0, oneGwei);

  const code64 = await hre.network.provider.send("eth_getCode", [ADDR_ARBSYS, "latest"]);
  const code6c = await hre.network.provider.send("eth_getCode", [ADDR_GASINFO, "latest"]);
  console.log("ArbSys code len:", code64.length, "ArbGasInfo code len:", code6c.length);
  console.log("✅ Shims predeployed at", ADDR_ARBSYS, "and", ADDR_GASINFO);
}

main().catch((e) => { console.error(e); process.exit(1); });
