const hre = require("hardhat");

async function main() {
  await hre.run("compile");

  const F = await hre.ethers.getContractFactory("ArbPrecompileProbe");
  const probe = await F.deploy();
  await probe.waitForDeployment();
  const addr = await probe.getAddress();
  console.log("Probe deployed:", addr);

  console.log("chainId():", (await probe.chainId()).toString());

  const tuple = await probe.prices();
  console.log("prices():", tuple.map(x => x.toString()));

  console.log("currentTxL1Fee():", (await probe.currentTxL1Fee()).toString());
}

main().catch((e) => { console.error(e); process.exit(1); });
