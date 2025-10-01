const hre = require("hardhat");

async function main() {
  const addr = process.argv[2];
  if (!addr) {
    console.error("Usage: npx hardhat run --network nitrodev scripts/smoke-nitro.js -- <ArbProbesAddress>");
    process.exit(1);
  }

  const c = await hre.ethers.getContractAt("ArbProbes", addr);
  console.log("contract:", addr);

  // via contract ( ArbProbes)
  const chainId = await c.getArbChainId();
  const l1Gas   = await c.getCurrentTxL1GasFees();
  console.log("via contract -> chainId:", chainId.toString());
  console.log("via contract -> L1 gas :", l1Gas.toString(), "wei");

  // raw precompile calls
  const sys   = "0x0000000000000000000000000000000000000064";
  const gas   = "0x000000000000000000000000000000000000006c";
  const selID = "0xa3b1b31d"; // arbChainID()
  const selGF = "0x84d9b9e7"; // getCurrentTxL1GasFees()
  const rawId = await hre.ethers.provider.call({ to: sys, data: selID });
  const rawG  = await hre.ethers.provider.call({ to: gas, data: selGF });
  console.log("raw -> chainId:", rawId);
  console.log("raw -> L1 gas :", rawG);
}

main().catch((e) => { console.error(e); process.exit(1); });
