async function main() {
  const hre = require("hardhat");
  console.log("ethers in HRE?", !!hre.ethers);
  if (hre.ethers) {
    const [deployer] = await hre.ethers.getSigners();
    console.log("deployer", await deployer.getAddress());
  }
}
main().catch(e => { console.error(e); process.exit(1); });
