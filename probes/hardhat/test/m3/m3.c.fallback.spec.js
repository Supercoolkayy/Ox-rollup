const { expect } = require("chai");
const hre = require("hardhat");
const { ensureShims, seedTupleSlots, readTupleSlots } = require("./_helpers");

describe("@m3 Test C: fallback tuple (no RPC, ignore config)", function () {
  it("matches the built-in fallback when config/RPC are not used", async function () {
    await ensureShims(hre);

    // The plugin’s documented fallback (shim order)
    const fallback = [
      "100000000",     // perL2Tx
      "1000000000",    // perL1CalldataFee
      "2000000000000", // perStorageAllocation
      "0",             // perArbGasBase
      "0",             // perArbGasCongestion
      "100000000",     // perArbGasTotal
    ];

    await seedTupleSlots(hre, fallback);
    const got = await readTupleSlots(hre);
    expect(got).to.deep.equal(fallback);
  });
});
