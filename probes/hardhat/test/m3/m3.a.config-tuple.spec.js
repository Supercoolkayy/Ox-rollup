const { expect } = require("chai");
const hre = require("hardhat");
const {
  ensureShims,
  seedTupleSlots,
  readTupleSlots,
  loadProjectTuple,
} = require("./_helpers");

describe("@m3 Test A: deterministic config tuple", function () {
  it("seeds from precompiles.config.json and matches exactly", async function () {
    // Arrange
    await ensureShims(hre);
    const cfgTuple = loadProjectTuple();
    expect(cfgTuple, "config tuple (gas.pricesInWei) not found or invalid").to.be
      .an("array")
      .with.lengthOf(6);

    // Act: write 0..5 directly
    await seedTupleSlots(hre, cfgTuple);

    // Assert
    const got = await readTupleSlots(hre);
    expect(got).to.deep.equal(cfgTuple);

    // Optional: ERC20 quick probe if factory exists
    let Factory;
    try {
      Factory = await hre.ethers.getContractFactory("ERC20Preset");
    } catch {
      return; // no example ERC20, acceptable for this test
    }
    const erc20 = await Factory.deploy("Token", "TK", hre.ethers.parseEther("1000000"));
    await erc20.waitForDeployment();

    expect(await erc20.name()).to.equal("Token");
    expect(await erc20.symbol()).to.equal("TK");
  });
});
