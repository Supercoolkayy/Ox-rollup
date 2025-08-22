const { ethers } = require("ethers");

async function main() {
  console.log("🔍 Probing 0x7e transaction type support on Hardhat...\n");

  // Create a provider and signer for local Hardhat
  const provider = new ethers.providers.JsonRpcProvider(
    "http://127.0.0.1:8545"
  );
  const privateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Default Hardhat private key
  const signer = new ethers.Wallet(privateKey, provider);

  console.log(`Using signer: ${signer.address}`);
  console.log(`Network: ${(await provider.getNetwork()).name}\n`);

  // Construct a minimal raw transaction with type 0x7e
  const tx = {
    to: signer.address,
    value: ethers.utils.parseEther("0.01"),
    gasLimit: 21000,
    gasPrice: await provider.getGasPrice(),
    nonce: await provider.getTransactionCount(signer.address),
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
