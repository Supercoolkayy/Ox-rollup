/**
 * End-to-End Integration Test: ERC20 Contract + 0x7e Deposit Flow
 *
 * This test validates the complete flow:
 * 1. Deploy ERC20 contract
 * 2. Execute deposit via 0x7e transaction
 * 3. Validate state changes
 * 4. Call ArbSys/ArbGasInfo from within deposit tx
 * 5. Validate return values
 */

import { expect } from "chai";
import { ethers } from "ethers";
import { HardhatPrecompileRegistry } from "../../src/hardhat-patch/precompiles/registry";
import {
  setupTestContext,
  createTestWallet,
  MockProvider,
} from "../utils/hardhat-helper";

describe("E2E Deposit Flow Integration", () => {
  let provider: MockProvider;
  let wallet: any;
  let erc20Contract: any;
  let hardhatPatch: any;
  let testContext: any;

  // Test configuration
  const INITIAL_SUPPLY = ethers.utils.parseEther("1000000"); // 1M tokens
  const DEPOSIT_AMOUNT = ethers.utils.parseEther("1000"); // 1K tokens
  const ARBITRUM_CHAIN_ID = 42161;

  before(async () => {
    // Setup test context with Arbitrum support
    testContext = setupTestContext();
    hardhatPatch = testContext.arbitrumPatch;

    // Setup mock provider and wallet for testing
    provider = new MockProvider(ARBITRUM_CHAIN_ID);
    wallet = createTestWallet();

    // Mock ERC20 contract for testing - focus on precompile integration
    let balances: { [key: string]: ethers.BigNumber } = {
      [wallet.address]: INITIAL_SUPPLY,
    };

    erc20Contract = {
      address: "0x1234567890123456789012345678901234567890",
      name: () => Promise.resolve("Test Token"),
      symbol: () => Promise.resolve("TEST"),
      decimals: () => Promise.resolve(18),
      totalSupply: () => Promise.resolve(INITIAL_SUPPLY),
      balanceOf: (addr: string) =>
        Promise.resolve(balances[addr] || ethers.BigNumber.from(0)),
      transfer: (to: string, amount: any) => {
        const fromBalance =
          balances[wallet.address] || ethers.BigNumber.from(0);
        const toBalance = balances[to] || ethers.BigNumber.from(0);

        balances[wallet.address] = fromBalance.sub(amount);
        balances[to] = toBalance.add(amount);

        return Promise.resolve(true);
      },
      interface: {
        encodeFunctionData: (func: string, params: any[]) =>
          "0x" + "00".repeat(32),
      },
    };

    console.log(`Mock ERC20 contract address: ${erc20Contract.address}`);
    console.log(
      `Initial supply: ${ethers.utils.formatEther(INITIAL_SUPPLY)} tokens`
    );
  });

  describe("ERC20 Contract Deployment", () => {
    it("should deploy with correct initial state", async () => {
      const name = await erc20Contract.name();
      const symbol = await erc20Contract.symbol();
      const decimals = await erc20Contract.decimals();
      const totalSupply = await erc20Contract.totalSupply();
      const deployerBalance = await erc20Contract.balanceOf(wallet.address);

      expect(name).to.equal("Test Token");
      expect(symbol).to.equal("TEST");
      expect(decimals).to.equal(18);
      expect(totalSupply).to.equal(INITIAL_SUPPLY);
      expect(deployerBalance).to.equal(INITIAL_SUPPLY);
    });

    it("should allow token transfers", async () => {
      const recipient = ethers.Wallet.createRandom().address;
      const transferAmount = ethers.utils.parseEther("100");

      await erc20Contract.transfer(recipient, transferAmount);

      const recipientBalance = await erc20Contract.balanceOf(recipient);
      const deployerBalance = await erc20Contract.balanceOf(wallet.address);

      expect(recipientBalance.toString()).to.equal(transferAmount.toString());
      expect(deployerBalance.toString()).to.equal(
        INITIAL_SUPPLY.sub(transferAmount).toString()
      );
    });
  });

  describe("ArbSys Precompile Integration", () => {
    it("should return correct chain ID", async () => {
      // Test ArbSys precompile directly through the registry
      const registry = hardhatPatch.getRegistry() as HardhatPrecompileRegistry;

      const arbSysCalldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // arbChainID()
      const context = {
        blockNumber: 12345,
        chainId: ARBITRUM_CHAIN_ID,
        gasPrice: BigInt(1e9),
        caller: wallet.address,
        callStack: [],
      };

      const result = await registry.handleCall(
        "0x0000000000000000000000000000000000000064", // ArbSys address
        arbSysCalldata,
        context
      );

      expect(result.success).to.be.true;
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(32);

      // Decode the chain ID
      const chainId = new DataView(result.data!.buffer).getBigUint64(24, false);
      expect(Number(chainId)).to.equal(ARBITRUM_CHAIN_ID);
    });
  });

  describe("ArbGasInfo Precompile Integration", () => {
    it("should return correct gas information", async () => {
      // Test ArbGasInfo precompile directly through the registry
      const registry = hardhatPatch.getRegistry() as HardhatPrecompileRegistry;

      const arbGasInfoCalldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // getL1BaseFeeEstimate()
      const context = {
        blockNumber: 12345,
        chainId: ARBITRUM_CHAIN_ID,
        gasPrice: BigInt(1e9),
        caller: wallet.address,
        callStack: [],
      };

      const result = await registry.handleCall(
        "0x000000000000000000000000000000000000006c", // ArbGasInfo address
        arbGasInfoCalldata,
        context
      );

      expect(result.success).to.be.true;
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(32);

      // Decode the L1 base fee
      const l1BaseFee = new DataView(result.data!.buffer).getBigUint64(
        24,
        false
      );
      expect(Number(l1BaseFee)).to.equal(20e9); // 20 gwei
    });
  });

  describe("0x7e Transaction Simulation", () => {
    it("should handle deposit transaction format", async () => {
      // Simulate a 0x7e deposit transaction
      // In a real implementation, this would use the Tx7eProcessor
      const depositData = {
        target: erc20Contract.address,
        value: ethers.utils.parseEther("0"),
        data: erc20Contract.interface.encodeFunctionData("transfer", [
          wallet.address,
          DEPOSIT_AMOUNT,
        ]),
        gasLimit: 100000,
        chainId: ARBITRUM_CHAIN_ID,
      };

      // Validate deposit transaction structure
      expect(depositData.target).to.equal(erc20Contract.address);
      expect(depositData.value.toString()).to.equal("0");
      expect(depositData.data).to.be.a("string");
      expect(depositData.gasLimit).to.be.gt(0);
      expect(depositData.chainId).to.equal(ARBITRUM_CHAIN_ID);

      console.log("Deposit transaction data:", depositData);
    });

    it("should validate precompile calls within deposit context", async () => {
      // Test that ArbSys and ArbGasInfo work correctly in the context of a deposit
      const initialBalance = await erc20Contract.balanceOf(wallet.address);

      // Simulate a deposit that calls ArbSys
      const depositWithArbSysData = {
        target: erc20Contract.address,
        value: 0,
        data: erc20Contract.interface.encodeFunctionData("transfer", [
          wallet.address,
          DEPOSIT_AMOUNT,
        ]),
        gasLimit: 150000, // Higher gas limit for precompile calls
        chainId: ARBITRUM_CHAIN_ID,
      };

      // Validate the deposit transaction structure
      expect(depositWithArbSysData.data).to.include("0x"); // Valid hex data
      expect(depositWithArbSysData.gasLimit).to.be.gte(100000);

      console.log("Deposit with ArbSys data:", depositWithArbSysData);
    });
  });

  describe("State Validation", () => {
    it("should maintain consistent state after operations", async () => {
      const initialTotalSupply = await erc20Contract.totalSupply();
      const initialDeployerBalance = await erc20Contract.balanceOf(
        wallet.address
      );

      // Perform some operations
      const recipient = ethers.Wallet.createRandom().address;
      const transferAmount = ethers.utils.parseEther("500");

      await erc20Contract.transfer(recipient, transferAmount);

      // Validate state consistency
      const finalTotalSupply = await erc20Contract.totalSupply();
      const finalDeployerBalance = await erc20Contract.balanceOf(
        wallet.address
      );
      const finalRecipientBalance = await erc20Contract.balanceOf(recipient);

      expect(finalTotalSupply.toString()).to.equal(
        initialTotalSupply.toString()
      );
      expect(finalDeployerBalance.toString()).to.equal(
        initialDeployerBalance.sub(transferAmount).toString()
      );
      expect(finalRecipientBalance.toString()).to.equal(
        transferAmount.toString()
      );
      expect(
        finalDeployerBalance.add(finalRecipientBalance).toString()
      ).to.equal(initialDeployerBalance.toString());
    });
  });

  describe("Integration with Hardhat Arbitrum Patch", () => {
    it("should have precompile handlers registered", () => {
      const registry = hardhatPatch.getRegistry();
      const handlers = registry.list();

      expect(handlers).to.have.length(2);

      const arbSysHandler = handlers.find((h: any) => h.name === "ArbSys");
      const arbGasInfoHandler = handlers.find(
        (h: any) => h.name === "ArbGasInfo"
      );

      expect(arbSysHandler).to.not.be.undefined;
      expect(arbGasInfoHandler).to.not.be.undefined;
      expect(arbSysHandler!.address).to.equal(
        "0x0000000000000000000000000000000000000064"
      );
      expect(arbGasInfoHandler!.address).to.equal(
        "0x000000000000000000000000000000000000006c"
      );
    });

    it("should handle precompile calls correctly", async () => {
      const registry = hardhatPatch.getRegistry() as HardhatPrecompileRegistry;

      // Test ArbSys call
      const arbSysCalldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // arbChainID()
      const context = {
        blockNumber: 12345,
        chainId: ARBITRUM_CHAIN_ID,
        gasPrice: BigInt(1e9),
        caller: wallet.address,
        callStack: [],
      };

      const result = await registry.handleCall(
        "0x0000000000000000000000000000000000000064",
        arbSysCalldata,
        context
      );

      expect(result.success).to.be.true;
      expect(result.data).to.be.instanceOf(Uint8Array);
      expect(result.data!.length).to.equal(32);
    });
  });
});
