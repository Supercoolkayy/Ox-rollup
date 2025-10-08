const hre = require("hardhat");

async function main() {
  await hre.run("compile");
  const [deployer, recipient] = await hre.ethers.getSigners();

  const F = await hre.ethers.getContractFactory("ERC721");
  const c = await F.deploy();
  await c.waitForDeployment();

  console.log("ERC721 deployed:", await c.getAddress());
  console.log(" name:", await c.name());
  console.log(" symbol:", await c.symbol());

  const tokenId = 1n;
  await (await c.mint(recipient.address, tokenId)).wait();
  console.log(" minted tokenId", tokenId.toString(), "to", recipient.address);
  console.log(" ownerOf(tokenId):", await c.ownerOf(tokenId));
}

main().catch((e) => { console.error(e); process.exit(1); });
