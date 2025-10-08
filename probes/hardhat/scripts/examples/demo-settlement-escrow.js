// Deploys SettlementEscrow and calls finalize() with the quoted amount.
const hre = require("hardhat");

async function main() {
  const Escrow = await hre.ethers.getContractFactory("SettlementEscrow");
  const marginBps = 1000; // +10%
  const esc = await Escrow.deploy(marginBps);
  await esc.waitForDeployment();
  console.log("SettlementEscrow deployed:", await esc.getAddress());

  const q = await esc.quote();
  console.log("quote():", q.toString(), "wei");

  const proof = hre.ethers.toUtf8Bytes("dummy-proof");
  const tx = await esc.finalize(proof, { value: q });
  const rcpt = await tx.wait();
  console.log("finalize gasUsed:", rcpt.gasUsed.toString());
}

main().catch((e) => { console.error(e); process.exit(1); });

