const { expect } = require("chai");
const hre = require("hardhat");
const { ensureShims, seedTupleSlots, readTupleSlots } = require("./_helpers");

const ADDR_GASINFO = "0x000000000000000000000000000000000000006c";

// Minimal selector encoding without Interface (ethers v6)
function selectorGetPricesInWei(ethersPkg) {
  // keccak256("getPricesInWei()").slice(0,4)
  const sigHash = ethersPkg.id("getPricesInWei()");
  return "0x" + sigHash.slice(2, 10); // 4 bytes selector
}

async function fetchStylusTuple(rpcUrl, ethersPkg) {
  const sel = selectorGetPricesInWei(ethersPkg);
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: ADDR_GASINFO, data: sel }, "latest"],
    }),
  });
  if (!res.ok) throw new Error("RPC HTTP " + res.status);
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || "RPC error");
  // decode 6 x uint256 (192 bytes) manually
  const hex = j.result.replace(/^0x/, "");
  const out = [];
  for (let i = 0; i < 6; i++) {
    const word = "0x" + hex.slice(i * 64, (i + 1) * 64);
    out.push(BigInt(word).toString());
  }
  return out;
}

describe("@m3 Test B: stylus RPC tuple (skips if STYLUS_RPC not set)", function () {
  const STYLUS_RPC = process.env.STYLUS_RPC;

  (STYLUS_RPC ? it : it.skip)(
    "reseeds from Stylus and equals the remote tuple",
    async function () {
      await ensureShims(hre);

      const ethersPkg = require("ethers");
      const remote = await fetchStylusTuple(STYLUS_RPC, ethersPkg);

      await seedTupleSlots(hre, remote);
      const got = await readTupleSlots(hre);
      expect(got).to.deep.equal(remote);
    }
  );
});
