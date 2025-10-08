// Queries RelayerGuard.willSponsor for a given payload size and max fee.
const hre = require("hardhat");

async function main() {
  const Guard = await hre.ethers.getContractFactory("RelayerGuard");
  const marginBps = 800; // +8%
  const guard = await Guard.deploy(marginBps);
  await guard.waitForDeployment();
  console.log("RelayerGuard deployed:", await guard.getAddress());

  const payloadBytes = 512; // simulate a 512-byte calldata request
  const maxFeeWei = hre.ethers.parseEther("0.0004"); // sponsor budget

  const [ok, expectedWei] = await guard.willSponsor(payloadBytes, maxFeeWei);
  console.log("willSponsor:", ok, "expectedWei:", expectedWei.toString(), "budget:", maxFeeWei.toString());
}

main().catch((e) => { console.error(e); process.exit(1); });
