const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const { ethers, artifacts, network } = hre;

const ADDR_ARBSYS  = "0x0000000000000000000000000000000000000064";
const ADDR_GASINFO = "0x000000000000000000000000000000000000006c";

const slotHex = (i) => "0x" + i.toString(16).padStart(64, "0");
const wordHex = (v) => "0x" + BigInt(v).toString(16).padStart(64, "0");

describe("ArbProbes via shims", function () {
  let cfgChainId;

  before(async () => {
    await hre.run("compile");

    // install shims
    const sys = await artifacts.readArtifact("ArbSysShim");
    const gas = await artifacts.readArtifact("ArbGasInfoShim");
    await network.provider.send("hardhat_setCode", [ADDR_ARBSYS,  sys.deployedBytecode]);
    await network.provider.send("hardhat_setCode", [ADDR_GASINFO, gas.deployedBytecode]);

    // seed minimal fields (chain id only)
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "precompiles.config.json"), "utf8"));
    cfgChainId = cfg.arbSys?.chainId ?? 42161;
    await network.provider.send("hardhat_setStorageAt", [
      ADDR_ARBSYS, slotHex(0), wordHex(cfgChainId),
    ]);
  });

  it("getArbChainId() matches shimmed ArbSys", async () => {
    const F = await ethers.getContractFactory("ArbProbes");
    const p = await F.deploy();
    await p.waitForDeployment();
    const got = await p.getArbChainId();
    expect(got.toString()).to.equal(String(cfgChainId));
  });

});

