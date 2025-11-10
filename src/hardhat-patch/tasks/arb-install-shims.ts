import { task } from "hardhat/config";
import path from "path";

/**
 * Installs shim bytecode at 0x...64 / 0x...6c and seeds values,
 * then prints the tuple for verification.
 */
task("arb:install-shims", "Install + seed ArbSys/ArbGasInfo shims").setAction(
  async (_, hre) => {
    await hre.run("compile");

    // run the compiled script inside this plugin's dist
    const script = path.resolve(
      __dirname,
      "../scripts/install-and-check-shims.js"
    );
    await hre.run("run", { script });
  }
);
