import { expect } from "chai";
import { HardhatArbitrumPatch } from "../../src/hardhat-patch/arbitrum-patch";

describe("Simple Integration Test", () => {
  it("should create HardhatArbitrumPatch instance", () => {
    const patch = new HardhatArbitrumPatch({
      chainId: 42161,
      arbOSVersion: 20,
      enabled: true,
    });

    expect(patch).to.be.instanceOf(HardhatArbitrumPatch);

    const config = patch.getConfig();
    expect(config.chainId).to.equal(42161);
    expect(config.arbOSVersion).to.equal(20);
    expect(config.enabled).to.be.true;
  });

  it("should have precompile handlers registered", () => {
    const patch = new HardhatArbitrumPatch();
    const registry = patch.getRegistry();
    const handlers = registry.list();

    expect(handlers).to.have.length(2);

    const arbSysHandler = handlers.find((h) => h.name === "ArbSys");
    const arbGasInfoHandler = handlers.find((h) => h.name === "ArbGasInfo");

    expect(arbSysHandler).to.not.be.undefined;
    expect(arbGasInfoHandler).to.not.be.undefined;
    expect(arbSysHandler!.address).to.equal(
      "0x0000000000000000000000000000000000000064"
    );
    expect(arbGasInfoHandler!.address).to.equal(
      "0x000000000000000000000000000000000000006c"
    );
  });
});
