// Deploys FeeAwareMint721 and performs a mint with a sample payload.
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const FeeAware = await hre.ethers.getContractFactory("FeeAwareMint721");
  const basePriceWei = hre.ethers.parseEther("0.001"); // example base price
  const surchargeBps = 500; // +5%
  const nft = await FeeAware.deploy("Gas-Aware NFT", "GANFT", basePriceWei, surchargeBps);
  await nft.waitForDeployment();

  console.log("FeeAwareMint721 deployed:", await nft.getAddress());

  // sample payload (e.g., offchain metadata hint)
  const payload = hre.ethers.toUtf8Bytes("example-payload-bytes");

  const quoted = await nft.quoteMint(payload);
  console.log("quoteMint(payload):", quoted.toString(), "wei");

  // send slightly more than quoted to show refund behavior
  const pay = quoted + hre.ethers.parseEther("0.0001");
  const tx = await nft.mint(payload, { value: pay });
  const rcpt = await tx.wait();
  console.log("mint tx gasUsed:", rcpt.gasUsed.toString());
}

main().catch((e) => { console.error(e); process.exit(1); });
