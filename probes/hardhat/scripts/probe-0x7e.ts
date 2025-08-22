import { ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { task } from "hardhat/config";

async function main() {
  // Get the hardhat runtime environment
  const hre: HardhatRuntimeEnvironment = require("hardhat");
  const [signer] = await hre.ethers.getSigners();

  // Construct a minimal raw transaction with type 0x7e
  const tx = {
    to: signer.address,
    value: ethers.utils.parseEther("0.01"),
    gasLimit: 21000,
    gasPrice: await hre.ethers.provider.getGasPrice(),
    nonce: await hre.ethers.provider.getTransactionCount(signer.address),
    type: 0x7e,
  };

  try {
    const txResponse = await signer.sendTransaction(tx);
    await txResponse.wait();
    console.log("Transaction sent successfully:", txResponse.hash);
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
