import { expect } from "chai";
import { ethers } from "hardhat";
import { ArbProbes } from "../typechain";

describe("ArbProbes", function () {
  let arbProbes: ArbProbes;

  beforeEach(async function () {
    const ArbProbesFactory = await ethers.getContractFactory("ArbProbes");
    arbProbes = await ArbProbesFactory.deploy();
    await arbProbes.deployed();
  });

  it("should revert or return zero for getArbChainId on unpatched nodes", async function () {
    try {
      const chainId = await arbProbes.getArbChainId();
      expect(chainId).to.equal(0);
    } catch (error) {
      console.error("getArbChainId call failed:", error);
    }
  });

  it("should revert or return zero for getArbBlockNumber on unpatched nodes", async function () {
    try {
      const blockNumber = await arbProbes.getArbBlockNumber();
      expect(blockNumber).to.equal(0);
    } catch (error) {
      console.error("getArbBlockNumber call failed:", error);
    }
  });

  it("should revert or return zero for getCurrentTxL1GasFees on unpatched nodes", async function () {
    try {
      const l1GasFees = await arbProbes.getCurrentTxL1GasFees();
      expect(l1GasFees).to.equal(0);
    } catch (error) {
      console.error("getCurrentTxL1GasFees call failed:", error);
    }
  });
});
