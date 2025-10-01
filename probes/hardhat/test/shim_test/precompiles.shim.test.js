const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const { ethers, artifacts, network } = hre;

const ADDR_ARBSYS  = "0x0000000000000000000000000000000000000064";
const ADDR_GASINFO = "0x000000000000000000000000000000000000006c";

const slotHex = (i) => "0x" + i.toString(16).padStart(64, "0");
const wordHex = (v) => "0x" + BigInt(v).toString(16).padStart(64, "0");

describe("Arbitrum precompile shims (Hardhat-only)", function () {
  let cfgTuple, cfgChainId;

  before(async () => {
    // compile to ensure artifacts exist
    await hre.run("compile");

    // load shim artifacts
    const sys = await artifacts.readArtifact("ArbSysShim");
    const gas = await artifacts.readArtifact("ArbGasInfoShim");

    // install code at precompile addresses
    await network.provider.send("hardhat_setCode", [ADDR_ARBSYS,  sys.deployedBytecode]);
    await network.provider.send("hardhat_setCode", [ADDR_GASINFO, gas.deployedBytecode]);

    // read local config
    const cfg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "precompiles.config.json"), "utf8")
    );
    cfgTuple  = cfg.arbGasInfo?.pricesInWei ??
      ["69440","496","2000000000000","100000000","0","100000000"];
    cfgChainId = cfg.arbSys?.chainId ?? 42161;

    // seed storage
    await network.provider.send("hardhat_setStorageAt", [
      ADDR_ARBSYS, slotHex(0), wordHex(cfgChainId),
    ]);
    for (let i = 0; i < 6; i++) {
      await network.provider.send("hardhat_setStorageAt", [
        ADDR_GASINFO, slotHex(i), wordHex(cfgTuple[i]),
      ]);
    }
  });

  it("ArbSys: arbChainID()/arbChainId() return the configured chain id", async () => {
    const sysAbi = [
      "function arbChainID() view returns (uint256)",
      "function arbChainId() view returns (uint256)"
    ];
    const sys = new ethers.Contract(ADDR_ARBSYS, sysAbi, ethers.provider);
    const up  = await sys.arbChainID();
    const low = await sys.arbChainId();
    expect(up).to.equal(low);
    expect(up.toString()).to.equal(String(cfgChainId));
  });

  it("ArbGasInfo: getPricesInWei() returns the seeded tuple", async () => {
    const gasAbi = [
      "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)"
    ];
    const gas = new ethers.Contract(ADDR_GASINFO, gasAbi, ethers.provider);
    const r = await gas.getPricesInWei();
    const got = r.map((x) => x.toString());
    expect(got).to.deep.equal(cfgTuple.map(String));
  });
});
