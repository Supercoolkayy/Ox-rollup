/**
 * Smoke Test for Plugin Bootstrap
 *
 * This test validates that the Hardhat Arbitrum Patch plugin can be properly
 * initialized and attached to a mock runtime environment.
 */

import {
  initArbitrumPatch,
  HardhatArbitrumPatch,
} from "../../src/hardhat-patch";

describe("Plugin Bootstrap", () => {
  let mockHre: any;

  beforeEach(() => {
    // Mock Hardhat runtime environment
    mockHre = {
      config: {
        arbitrum: {
          enabled: true,
          chainId: 42161,
          arbOSVersion: 20,
        },
      },
    };
  });

  describe("initArbitrumPatch", () => {
    it("should initialize plugin when enabled", () => {
      // Call the initialization function
      initArbitrumPatch(mockHre, { enable: true });

      // Check that the plugin was attached to the environment
      expect(mockHre.arbitrumPatch).to.be.instanceOf(HardhatArbitrumPatch);

      // Verify the registry contains the expected handlers
      const plugin = mockHre.arbitrumPatch as HardhatArbitrumPatch;
      const registry = plugin.getRegistry();
      const handlers = registry.list();

      expect(handlers).to.have.length(2);
      expect(handlers.map((h: any) => h.name)).to.include("ArbSys");
      expect(handlers.map((h: any) => h.name)).to.include("ArbGasInfo");
    });

    it("should not initialize plugin when disabled", () => {
      // Call the initialization function with disabled flag
      initArbitrumPatch(mockHre, { enable: false });

      // Check that the plugin was not attached
      expect(mockHre.arbitrumPatch).to.be.undefined;
    });

    it("should respect config.enabled setting", () => {
      // Set config to disabled
      mockHre.config.arbitrum.enabled = false;

      // Call the initialization function
      initArbitrumPatch(mockHre, { enable: true });

      // Check that the plugin was not attached due to config setting
      expect(mockHre.arbitrumPatch).to.be.undefined;
    });

    it("should initialize with default configuration", () => {
      // Remove arbitrum config to test defaults
      delete mockHre.config.arbitrum;

      // Call the initialization function
      initArbitrumPatch(mockHre, { enable: true });

      // Check that the plugin was attached
      expect(mockHre.arbitrumPatch).to.be.instanceOf(HardhatArbitrumPatch);

      // Verify default configuration
      const plugin = mockHre.arbitrumPatch as HardhatArbitrumPatch;
      const config = plugin.getConfig();

      expect(config.chainId).to.equal(42161); // Arbitrum One default
      expect(config.arbOSVersion).to.equal(20);
      expect(config.enabled).to.be.true;
    });
  });

  describe("Plugin Integration", () => {
    it("should provide working registry methods", () => {
      // Initialize the plugin
      initArbitrumPatch(mockHre, { enable: true });
      const plugin = mockHre.arbitrumPatch as HardhatArbitrumPatch;
      const registry = plugin.getRegistry();

      // Test registry methods
      expect(registry.list()).to.have.length(2);
      expect(
        registry.getByAddress("0x0000000000000000000000000000000000000064")
      ).to.not.be.undefined;
      expect(
        registry.getByAddress("0x000000000000000000000000000000000000006c")
      ).to.not.be.undefined;
    });

    it("should handle precompile calls through registry", async () => {
      // Initialize the plugin
      initArbitrumPatch(mockHre, { enable: true });
      const plugin = mockHre.arbitrumPatch as HardhatArbitrumPatch;
      const registry = plugin.getRegistry();

      // Test a simple precompile call
      const calldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // arbChainID()
      const context = {
        blockNumber: 12345,
        chainId: 42161,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const result = await registry.handleCall(
        "0x0000000000000000000000000000000000000064", // ArbSys address
        calldata,
        context
      );

      expect(result.success).to.be.true;
      expect(result.data).to.be.instanceOf(Uint8Array);
    });
  });
});
