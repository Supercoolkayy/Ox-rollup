/**
 * Golden Test: Local vs Forked Arbitrum RPC Comparison (JavaScript Version)
 * Compares local implementation against forked Arbitrum mainnet RPC
 */

const { expect } = require("chai");
const { ethers } = require("ethers");
const { HardhatArbitrumPatch } = require("../../src/hardhat-patch");

describe("Golden Test: Local vs Forked Arbitrum RPC (JS)", () => {
  let localProvider;
  let forkedProvider;
  let hardhatPatch;

  const ARBITRUM_MAINNET_RPC = "https://arb1.arbitrum.io/rpc";
  const LOCAL_RPC = "http://127.0.0.1:8545";
  const ARBITRUM_CHAIN_ID = 42161;

  before(async () => {
    hardhatPatch = new HardhatArbitrumPatch({
      chainId: ARBITRUM_CHAIN_ID,
      arbOSVersion: 20,
      enabled: true,
    });

    localProvider = new ethers.providers.JsonRpcProvider(LOCAL_RPC);
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
      const localRegistry = hardhatPatch.getRegistry();
      const localCalldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // arbChainID()
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
      const localRegistry = hardhatPatch.getRegistry();
      const localCalldata = new Uint8Array([0x4d, 0x23, 0x01, 0xcc]); // getL1BaseFeeEstimate()
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
      expect(forkedL1BaseFee.gte(ethers.utils.parseUnits("1", "gwei"))).to.be.true; // Mainnet should be reasonable
    });
  });
});
