const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("deployer:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("ArbProbes");
  const c = await Factory.deploy();
  await c.waitForDeployment();
  console.log("ArbProbes deployed to:", await c.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
