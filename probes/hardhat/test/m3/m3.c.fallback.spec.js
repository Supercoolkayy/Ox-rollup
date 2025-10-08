const { expect } = require("chai");
const hre = require("hardhat");
const { ensureShims, seedTupleSlots, readTupleSlots } = require("./_helpers");

describe("@m3 Test C: fallback tuple (no RPC, ignore config)", function () {
  it("matches the built-in fallback when config/RPC are not used", async function () {
    await ensureShims(hre);

    // The plugin’s documented fallback (shim order)
    const fallback = [
      "100000000",     // l2BaseFee
      "1000000000",    // l1BaseFeeEstimate
      "2000000000000", // l1CalldataCost
      "0",             // l1StorageCost
      "0",             // congestionFee
      "100000000",     // aux
    ];

    await seedTupleSlots(hre, fallback);
    const got = await readTupleSlots(hre);
    expect(got).to.deep.equal(fallback);
  });
});
