const { ethers } = require("ethers");
const RPC = process.env.NITRO_RPC || "http://127.0.0.1:8547";
const ARBGASINFO = "0x000000000000000000000000000000000000006c";
const abi = [
  "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)"
];

function fmt(x) {
  const wei = BigInt(x);
  const gwei = Number(wei) / 1e9;
  const eth  = Number(wei) / 1e18;
  return { wei: wei.toString(), gwei: gwei.toFixed(9), eth: eth.toExponential(6) };
}

(async () => {
  const provider = new ethers.JsonRpcProvider(RPC);
  const gasInfo = new ethers.Contract(ARBGASINFO, abi, provider);
  const r = await gasInfo.getPricesInWei();

  console.log("tuple length:", r.length);
  console.log("baseFee           :", fmt(r[0]));
  console.log("l1BaseFeeEstimate :", fmt(r[1]));
  console.log("component[2]      :", fmt(r[2]));
  console.log("component[3]      :", fmt(r[3]));
  console.log("component[4]      :", fmt(r[4]));
  console.log("component[5]      :", fmt(r[5]));
})();
