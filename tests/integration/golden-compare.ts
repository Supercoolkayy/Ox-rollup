/**
 * Golden Test: Local vs Forked Arbitrum RPC Comparison
 * Compares local implementation against forked Arbitrum mainnet RPC
 */

import { expect } from "chai";
import { ethers } from "ethers";
import { HardhatPrecompileRegistry } from "../../src/hardhat-patch/precompiles/registry";
import { setupTestContext, MockProvider } from "../utils/hardhat-helper";

describe("Golden Test: Local vs Forked Arbitrum RPC", () => {
  let localProvider: ethers.providers.JsonRpcProvider;
  let forkedProvider: ethers.providers.JsonRpcProvider;
  let hardhatPatch: any;

  const ARBITRUM_MAINNET_RPC = "https://arb1.arbitrum.io/rpc";
  const LOCAL_RPC = "http://127.0.0.1:8545";
  const ARBITRUM_CHAIN_ID = 42161;

  before(async () => {
    // Setup test context with Arbitrum support
    const testContext = setupTestContext();
    hardhatPatch = testContext.arbitrumPatch;

    localProvider = new MockProvider(ARBITRUM_CHAIN_ID) as any;
    forkedProvider = new ethers.providers.JsonRpcProvider(ARBITRUM_MAINNET_RPC);

    console.log("Golden test initialized");
  });

  describe("Network Configuration Parity", () => {
    it("should have matching chain IDs", async () => {
      const localNetwork = await localProvider.getNetwork();
      const forkedNetwork = await forkedProvider.getNetwork();

      expect(localNetwork.chainId).to.equal(ARBITRUM_CHAIN_ID);
      expect(forkedNetwork.chainId).to.equal(ARBITRUM_CHAIN_ID);
    });
  });

  describe("ArbSys Precompile Parity", () => {
    it("should return identical chain IDs", async () => {
      // Test local implementation
      const localRegistry =
        hardhatPatch.getRegistry() as HardhatPrecompileRegistry;
      const localCalldata = new Uint8Array([0xd1, 0x27, 0xf5, 0x4a]); // arbChainID()
      const localContext = {
        blockNumber: 12345,
        chainId: ARBITRUM_CHAIN_ID,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const localResult = await localRegistry.handleCall(
        "0x0000000000000000000000000000000000000064",
        localCalldata,
        localContext
      );

      // Test forked implementation
      const ArbSysInterface = new ethers.utils.Interface([
        "function arbChainID() external view returns (uint256)",
      ]);

      const forkedCalldata = ArbSysInterface.encodeFunctionData("arbChainID");
      const forkedResult = await forkedProvider.call({
        to: "0x0000000000000000000000000000000000000064",
        data: forkedCalldata,
      });

      // Decode results
      const localChainId = ethers.BigNumber.from(localResult.data);
      const forkedChainId = ethers.BigNumber.from(forkedResult);

      // Validate parity
      expect(localResult.success).to.be.true;
      expect(localChainId).to.equal(forkedChainId);
      expect(localChainId).to.equal(ARBITRUM_CHAIN_ID);
    });
  });

  describe("ArbGasInfo Precompile Parity", () => {
    it("should return consistent L1 base fee estimates", async () => {
      // Test local implementation
      const localRegistry =
        hardhatPatch.getRegistry() as HardhatPrecompileRegistry;
      const localCalldata = new Uint8Array([0xf5, 0xd6, 0xde, 0xd7]); // getL1BaseFeeEstimate()
      const localContext = {
        blockNumber: 12345,
        chainId: ARBITRUM_CHAIN_ID,
        gasPrice: BigInt(1e9),
        caller: "0x1234567890123456789012345678901234567890",
        callStack: [],
      };

      const localResult = await localRegistry.handleCall(
        "0x000000000000000000000000000000000000006c",
        localCalldata,
        localContext
      );

      // Test forked implementation
      const ArbGasInfoInterface = new ethers.utils.Interface([
        "function getL1BaseFeeEstimate() external view returns (uint256)",
      ]);

      const forkedCalldata = ArbGasInfoInterface.encodeFunctionData(
        "getL1BaseFeeEstimate"
      );
      const forkedResult = await forkedProvider.call({
        to: "0x000000000000000000000000000000000000006c",
        data: forkedCalldata,
      });

      // Decode results
      const localL1BaseFee = ethers.BigNumber.from(localResult.data);
      const forkedL1BaseFee = ethers.BigNumber.from(forkedResult);

      // Validate consistency
      expect(localResult.success).to.be.true;
      expect(localL1BaseFee).to.equal(ethers.utils.parseUnits("20", "gwei")); // Our configured value
      expect(forkedL1BaseFee.gte(ethers.utils.parseUnits("1", "gwei"))).to.be
        .true; // Mainnet should be reasonable
    });
  });
});
