const hre = require("hardhat");

async function main() {
  await hre.run("compile");
  const [deployer, recipient] = await hre.ethers.getSigners();

  const initialSupply = hre.ethers.parseUnits("1000000", 18); // 1,000,000 TK
  const F = await hre.ethers.getContractFactory("ERC20");
  const c = await F.deploy(initialSupply);
  await c.waitForDeployment();

  console.log("ERC20 deployed:", await c.getAddress());
  console.log(" name:", await c.name());
  console.log(" symbol:", await c.symbol());
  console.log(" totalSupply:", (await c.totalSupply()).toString());

  // simple transfer demo
  const tx = await c.transfer(recipient.address, hre.ethers.parseUnits("100", 18));
  await tx.wait();
  console.log(" transfer 100 →", recipient.address);
  console.log(" recipient balance:", (await c.balanceOf(recipient.address)).toString());
}

main().catch((e) => { console.error(e); process.exit(1); });
