"use strict";
/**
 * Unit Tests for Precompile Registry
 *
 * Tests the precompile registry functionality, handler registration,
 * and call handling for Arbitrum precompiles.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const registry_1 = require("../../src/hardhat-patch/precompiles/registry");
const arbSys_1 = require("../../src/hardhat-patch/precompiles/arbSys");
const arbGasInfo_1 = require("../../src/hardhat-patch/precompiles/arbGasInfo");
const hardhat_patch_1 = require("../../src/hardhat-patch");
describe("Precompile Registry", () => {
    let registry;
    let arbSysHandler;
    let arbGasInfoHandler;
    beforeEach(() => {
        registry = new registry_1.HardhatPrecompileRegistry();
        arbSysHandler = new arbSys_1.ArbSysHandler({
            chainId: 42161,
            arbOSVersion: 20,
            l1BaseFee: BigInt(20e9),
        });
        arbGasInfoHandler = new arbGasInfo_1.ArbGasInfoHandler({
            chainId: 42161,
            arbOSVersion: 20,
            l1BaseFee: BigInt(20e9),
        });
    });
    describe("Handler Registration", () => {
        it("should register handlers successfully", () => {
            registry.register(arbSysHandler);
            registry.register(arbGasInfoHandler);
            (0, chai_1.expect)(registry.hasHandler(arbSysHandler.address)).to.be.true;
            (0, chai_1.expect)(registry.hasHandler(arbGasInfoHandler.address)).to.be.true;
            (0, chai_1.expect)(registry.listHandlers()).to.have.length(2);
        });
        it("should prevent duplicate registration", () => {
            registry.register(arbSysHandler);
            (0, chai_1.expect)(() => {
                registry.register(arbSysHandler);
            }).to.throw(`Handler already registered for address ${arbSysHandler.address}`);
        });
        it("should retrieve handlers by address", () => {
            registry.register(arbSysHandler);
            const retrieved = registry.getHandler(arbSysHandler.address);
            (0, chai_1.expect)(retrieved).to.equal(arbSysHandler);
        });
        it("should return null for non-existent handlers", () => {
            const handler = registry.getHandler("0x1234567890123456789012345678901234567890");
            (0, chai_1.expect)(handler).to.be.null;
        });
    });
    describe("Handler Functionality", () => {
        beforeEach(() => {
            registry.register(arbSysHandler);
            registry.register(arbGasInfoHandler);
        });
        it("should handle ArbSys arbChainID() call", async () => {
            const calldata = new Uint8Array([0xa3, 0xb1, 0xb3, 0x1d]); // arbChainID() selector
            const context = {
                blockNumber: 12345,
                chainId: 42161,
                gasPrice: BigInt(1e9),
                caller: "0x1234567890123456789012345678901234567890",
                callStack: [],
            };
            const result = await registry.handleCall(arbSysHandler.address, calldata, context);
            (0, chai_1.expect)(result.success).to.be.true;
            (0, chai_1.expect)(result.gasUsed).to.equal(3);
            (0, chai_1.expect)(result.data).to.be.instanceOf(Uint8Array);
        });
        it("should handle ArbSys arbBlockNumber() call", async () => {
            const calldata = new Uint8Array([0x05, 0x10, 0x38, 0xf2]); // arbBlockNumber() selector
            const context = {
                blockNumber: 12345,
                chainId: 42161,
                gasPrice: BigInt(1e9),
                caller: "0x1234567890123456789012345678901234567890",
                callStack: [],
            };
            const result = await registry.handleCall(arbSysHandler.address, calldata, context);
            (0, chai_1.expect)(result.success).to.be.true;
            (0, chai_1.expect)(result.gasUsed).to.equal(3);
            (0, chai_1.expect)(result.data).to.be.instanceOf(Uint8Array);
        });
        it("should handle ArbGasInfo getPricesInWei() call", async () => {
            const calldata = new Uint8Array([0x4d, 0x23, 0x01, 0xcc]); // getPricesInWei() selector
            const context = {
                blockNumber: 12345,
                chainId: 42161,
                gasPrice: BigInt(1e9),
                caller: "0x1234567890123456789012345678901234567890",
                callStack: [],
            };
            const result = await registry.handleCall(arbGasInfoHandler.address, calldata, context);
            (0, chai_1.expect)(result.success).to.be.true;
            (0, chai_1.expect)(result.gasUsed).to.equal(10);
            (0, chai_1.expect)(result.data).to.be.instanceOf(Uint8Array);
            (0, chai_1.expect)(result.data.length).to.equal(160); // 5 * 32 bytes
        });
        it("should handle ArbGasInfo getL1BaseFeeEstimate() call", async () => {
            const calldata = new Uint8Array([0x4d, 0x23, 0x01, 0xcc]); // getL1BaseFeeEstimate() selector
            const context = {
                blockNumber: 12345,
                chainId: 42161,
                gasPrice: BigInt(1e9),
                caller: "0x1234567890123456789012345678901234567890",
                callStack: [],
            };
            const result = await registry.handleCall(arbGasInfoHandler.address, calldata, context);
            (0, chai_1.expect)(result.success).to.be.true;
            (0, chai_1.expect)(result.gasUsed).to.equal(5);
            (0, chai_1.expect)(result.data).to.be.instanceOf(Uint8Array);
        });
    });
    describe("Error Handling", () => {
        beforeEach(() => {
            registry.register(arbSysHandler);
        });
        it("should reject calls to non-existent precompiles gracefully", async () => {
            const nonExistentAddress = "0x1234567890123456789012345678901234567890";
            const calldata = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
            const context = {
                blockNumber: 12345,
                chainId: 42161,
                gasPrice: BigInt(1e9),
                caller: "0x1234567890123456789012345678901234567890",
                callStack: [],
            };
            const result = await registry.handleCall(nonExistentAddress, calldata, context);
            (0, chai_1.expect)(result.success).to.be.false;
            (0, chai_1.expect)(result.gasUsed).to.equal(0);
            (0, chai_1.expect)(result.error).to.include("No handler registered for address");
        });
        it("should handle invalid calldata gracefully", async () => {
            const calldata = new Uint8Array([0x12, 0x34]); // Too short
            const context = {
                blockNumber: 12345,
                chainId: 42161,
                gasPrice: BigInt(1e9),
                caller: "0x1234567890123456789012345678901234567890",
                callStack: [],
            };
            const result = await registry.handleCall(arbSysHandler.address, calldata, context);
            (0, chai_1.expect)(result.success).to.be.false;
            (0, chai_1.expect)(result.gasUsed).to.equal(0);
            (0, chai_1.expect)(result.error).to.include("Invalid calldata: too short");
        });
        it("should handle unknown function selectors gracefully", async () => {
            const calldata = new Uint8Array([0xff, 0xff, 0xff, 0xff]); // Unknown selector
            const context = {
                blockNumber: 12345,
                chainId: 42161,
                gasPrice: BigInt(1e9),
                caller: "0x1234567890123456789012345678901234567890",
                callStack: [],
            };
            const result = await registry.handleCall(arbSysHandler.address, calldata, context);
            (0, chai_1.expect)(result.success).to.be.false;
            (0, chai_1.expect)(result.gasUsed).to.equal(0);
            (0, chai_1.expect)(result.error).to.include("Unknown function selector");
        });
    });
    describe("HardhatArbitrumPatch Integration", () => {
        it("should initialize with default configuration", () => {
            const patch = new hardhat_patch_1.HardhatArbitrumPatch();
            const config = patch.getConfig();
            (0, chai_1.expect)(config.chainId).to.equal(42161);
            (0, chai_1.expect)(config.arbOSVersion).to.equal(20);
            (0, chai_1.expect)(config.enabled).to.be.true;
        });
        it("should initialize with custom configuration", () => {
            const customConfig = {
                chainId: 421613, // Arbitrum Goerli
                arbOSVersion: 21,
                l1BaseFee: BigInt(15e9), // 15 gwei
            };
            const patch = new hardhat_patch_1.HardhatArbitrumPatch(customConfig);
            const config = patch.getConfig();
            (0, chai_1.expect)(config.chainId).to.equal(421613);
            (0, chai_1.expect)(config.arbOSVersion).to.equal(21);
            (0, chai_1.expect)(config.l1BaseFee).to.equal(BigInt(15e9));
        });
        it("should register handlers on initialization", () => {
            const patch = new hardhat_patch_1.HardhatArbitrumPatch();
            (0, chai_1.expect)(patch.hasHandler("0x0000000000000000000000000000000000000064")).to
                .be.true; // ArbSys
            (0, chai_1.expect)(patch.hasHandler("0x000000000000000000000000000000000000006C")).to
                .be.true; // ArbGasInfo
            const handlers = patch.listHandlers();
            (0, chai_1.expect)(handlers).to.have.length(2);
            (0, chai_1.expect)(handlers.map((h) => h.name)).to.include("ArbSys");
            (0, chai_1.expect)(handlers.map((h) => h.name)).to.include("ArbGasInfo");
        });
        it("should be disabled when configured", () => {
            const patch = new hardhat_patch_1.HardhatArbitrumPatch({ enabled: false });
            (0, chai_1.expect)(patch.hasHandler("0x0000000000000000000000000000000000000064")).to
                .be.false;
            (0, chai_1.expect)(patch.listHandlers()).to.have.length(0);
        });
    });
    describe("Configuration Validation", () => {
        it("should handle BigInt configuration values", () => {
            const config = {
                l1BaseFee: BigInt(25e9), // 25 gwei
                gasPriceComponents: {
                    l2BaseFee: BigInt(2e9), // 2 gwei
                    l1CalldataCost: BigInt(20), // 20 gas per byte
                    l1StorageCost: BigInt(0),
                    congestionFee: BigInt(1e8), // 0.1 gwei
                },
            };
            const patch = new hardhat_patch_1.HardhatArbitrumPatch(config);
            const retrievedConfig = patch.getConfig();
            (0, chai_1.expect)(retrievedConfig.l1BaseFee).to.equal(BigInt(25e9));
            (0, chai_1.expect)(retrievedConfig.gasPriceComponents.l2BaseFee).to.equal(BigInt(2e9));
            (0, chai_1.expect)(retrievedConfig.gasPriceComponents.l1CalldataCost).to.equal(BigInt(20));
            (0, chai_1.expect)(retrievedConfig.gasPriceComponents.congestionFee).to.equal(BigInt(1e8));
        });
    });
});
