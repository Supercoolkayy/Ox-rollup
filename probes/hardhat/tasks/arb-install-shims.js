const { task } = require("hardhat/config");

task("arb:install-shims", "Install + seed ArbSys/ArbGasInfo shims")
  .setAction(async (_, hre) => {
    await hre.run("compile");
    await hre.run("run", { script: "scripts/install-and-check-shims.js" });
  });

module.exports = {};
