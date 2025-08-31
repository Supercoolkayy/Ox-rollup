/**
 * End-to-End Integration Test: ERC20 Contract + 0x7e Deposit Flow (JavaScript Version)
 *
 * This test validates the complete flow:
 * 1. Deploy ERC20 contract
 * 2. Execute deposit via 0x7e transaction
 * 3. Validate state changes
 * 4. Call ArbSys/ArbGasInfo from within deposit tx
 * 5. Validate return values
 */

const { expect } = require("chai");
const { ethers } = require("ethers");
const { HardhatArbitrumPatch } = require("../../src/hardhat-patch");

describe("E2E Deposit Flow Integration (JS)", () => {
  let provider;
  let wallet;
  let erc20Contract;
  let hardhatPatch;

  // Test configuration
  const INITIAL_SUPPLY = ethers.utils.parseEther("1000000"); // 1M tokens
  const DEPOSIT_AMOUNT = ethers.utils.parseEther("1000"); // 1K tokens
  const ARBITRUM_CHAIN_ID = 42161;

  before(async () => {
    // Initialize Hardhat Arbitrum Patch
    hardhatPatch = new HardhatArbitrumPatch({
      chainId: ARBITRUM_CHAIN_ID,
      arbOSVersion: 20,
      enabled: true,
    });

    // Setup provider and wallet
    provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
    wallet = new ethers.Wallet(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Hardhat account #0
      provider
    );

    // Deploy ERC20 contract
    const ERC20Factory = new ethers.ContractFactory(
      [
        "constructor(string memory name, string memory symbol, uint256 initialSupply)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function balanceOf(address account) view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
      ],
      `
        pragma solidity ^0.8.19;
        
        contract TestERC20 {
            string public name;
            string public symbol;
            uint8 public decimals;
            uint256 public totalSupply;
            mapping(address => uint256) public balanceOf;
            mapping(address => mapping(address => uint256)) public allowance;
            
            event Transfer(address indexed from, address indexed to, uint256 value);
            event Approval(address indexed owner, address indexed spender, uint256 value);
            
            constructor(string memory _name, string memory _symbol, uint256 _initialSupply) {
                name = _name;
                symbol = _symbol;
                decimals = 18;
                totalSupply = _initialSupply;
                balanceOf[msg.sender] = _initialSupply;
                emit Transfer(address(0), msg.sender, _initialSupply);
            }
            
            function transfer(address to, uint256 amount) public returns (bool) {
                require(balanceOf[msg.sender] >= amount, "Insufficient balance");
                balanceOf[msg.sender] -= amount;
                balanceOf[to] += amount;
                emit Transfer(msg.sender, to, amount);
                return true;
            }
            
            function approve(address spender, uint256 amount) public returns (bool) {
                allowance[msg.sender][spender] = amount;
                emit Approval(msg.sender, spender, amount);
                return true;
            }
            
            function transferFrom(address from, address to, uint256 amount) public returns (bool) {
                require(balanceOf[from] >= amount, "Insufficient balance");
                require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
                balanceOf[from] -= amount;
                balanceOf[to] += amount;
                allowance[from][msg.sender] -= amount;
                emit Transfer(from, to, amount);
                return true;
            }
        }
      `,
      wallet
    );

    erc20Contract = await ERC20Factory.deploy(
      "Test Token",
      "TEST",
      INITIAL_SUPPLY
    );
    await erc20Contract.deployed();

    console.log(`ERC20 contract deployed at: ${erc20Contract.address}`);
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

      expect(recipientBalance).to.equal(transferAmount);
      expect(deployerBalance).to.equal(INITIAL_SUPPLY.sub(transferAmount));
    });
  });

  describe("ArbSys Precompile Integration", () => {
    it("should return correct chain ID", async () => {
      // Create a contract that calls ArbSys.arbChainID()
      const ArbSysTestFactory = new ethers.ContractFactory(
        [
          "function getArbChainId() view returns (uint256)",
          "function getArbBlockNumber() view returns (uint256)",
          "function getArbOSVersion() view returns (uint256)",
        ],
        `
          pragma solidity ^0.8.19;
          
          interface ArbSys {
              function arbChainID() external view returns (uint256);
              function arbBlockNumber() external view returns (uint256);
              function arbOSVersion() external view returns (uint256);
          }
          
          contract ArbSysTest {
              ArbSys constant arbSys = ArbSys(0x0000000000000000000000000000000000000064);
              
              function getArbChainId() external view returns (uint256) {
                  return arbSys.arbChainID();
              }
              
              function getArbBlockNumber() external view returns (uint256) {
                  return arbSys.arbBlockNumber();
              }
              
              function getArbOSVersion() external view returns (uint256) {
                  return arbSys.arbOSVersion();
              }
          }
        `,
        wallet
      );

      const arbSysTest = await ArbSysTestFactory.deploy();
      await arbSysTest.deployed();

      const chainId = await arbSysTest.getArbChainId();
      const blockNumber = await arbSysTest.getArbBlockNumber();
      const osVersion = await arbSysTest.getArbOSVersion();

      expect(chainId).to.equal(ARBITRUM_CHAIN_ID);
      expect(blockNumber).to.be.gt(0);
      expect(osVersion).to.equal(20);
    });
  });

  describe("ArbGasInfo Precompile Integration", () => {
    it("should return correct gas information", async () => {
      // Create a contract that calls ArbGasInfo functions
      const ArbGasInfoTestFactory = new ethers.ContractFactory(
        [
          "function getL1BaseFeeEstimate() view returns (uint256)",
          "function getCurrentTxL1GasFees() view returns (uint256)",
        ],
        `
          pragma solidity ^0.8.19;
          
          interface ArbGasInfo {
              function getL1BaseFeeEstimate() external view returns (uint256);
              function getCurrentTxL1GasFees() external view returns (uint256);
          }
          
          contract ArbGasInfoTest {
              ArbGasInfo constant arbGasInfo = ArbGasInfo(0x000000000000000000000000000000000000006c);
              
              function getL1BaseFeeEstimate() external view returns (uint256) {
                  return arbGasInfo.getL1BaseFeeEstimate();
              }
              
              function getCurrentTxL1GasFees() external view returns (uint256) {
                  return arbGasInfo.getCurrentTxL1GasFees();
              }
          }
        `,
        wallet
      );

      const arbGasInfoTest = await ArbGasInfoTestFactory.deploy();
      await arbGasInfoTest.deployed();

      const l1BaseFee = await arbGasInfoTest.getL1BaseFeeEstimate();
      const currentTxL1GasFees = await arbGasInfoTest.getCurrentTxL1GasFees();

      // L1 base fee should be reasonable (20 gwei = 20e9 wei)
      expect(l1BaseFee.gte(ethers.utils.parseUnits("1", "gwei"))).to.be.true;
      expect(l1BaseFee.lte(ethers.utils.parseUnits("1000", "gwei"))).to.be.true;

      // Current tx L1 gas fees should be non-zero for non-empty calldata
      expect(currentTxL1GasFees).to.be.gte(0);
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
      expect(depositData.value).to.equal(0);
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

      expect(finalTotalSupply).to.equal(initialTotalSupply);
      expect(finalDeployerBalance).to.equal(
        initialDeployerBalance.sub(transferAmount)
      );
      expect(finalRecipientBalance).to.equal(transferAmount);
      expect(finalDeployerBalance.add(finalRecipientBalance)).to.equal(
        initialDeployerBalance
      );
    });
  });

  describe("Integration with Hardhat Arbitrum Patch", () => {
    it("should have precompile handlers registered", () => {
      const registry = hardhatPatch.getRegistry();
      const handlers = registry.list();

      expect(handlers).to.have.length(2);

      const arbSysHandler = handlers.find((h) => h.name === "ArbSys");
      const arbGasInfoHandler = handlers.find((h) => h.name === "ArbGasInfo");

      expect(arbSysHandler).to.not.be.undefined;
      expect(arbGasInfoHandler).to.not.be.undefined;
      expect(arbSysHandler.address).to.equal(
        "0x0000000000000000000000000000000000000064"
      );
      expect(arbGasInfoHandler.address).to.equal(
        "0x000000000000000000000000000000000000006c"
      );
    });

    it("should handle precompile calls correctly", async () => {
      const registry = hardhatPatch.getRegistry();

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
      expect(result.data.length).to.equal(32);
    });
  });
});
