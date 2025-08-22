const { ethers } = require("ethers");

async function main() {
  const [signer] = await ethers.getSigners();

  // Construct a minimal raw transaction with type 0x7e
  const tx = {
    to: signer.address,
    value: ethers.parseEther("0.01"),
    gasLimit: 21000,
    gasPrice: await ethers.provider.getGasPrice(),
    nonce: await ethers.provider.getTransactionCount(signer.address),
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
