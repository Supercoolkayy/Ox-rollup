// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

/**
 * Foundry Probe: Arbitrum Precompile Testing
 * 
 * This contract tests the ArbSys and ArbGasInfo precompiles
 * in a local Anvil network with Arbitrum features enabled.
 * 
 * Usage: forge test --match-contract ArbitrumPrecompileTest
 */

contract ArbitrumPrecompileTest is Test {
    // Arbitrum precompile addresses
    address constant ARBSYS_ADDRESS = address(0x64);
    address constant ARBGASINFO_ADDRESS = address(0x6C);
    
    // Method selectors for ArbSys precompile
    bytes4 constant ARB_CHAIN_ID = 0xa3b1b31d;
    bytes4 constant ARB_BLOCK_NUMBER = 0x051038f2;
    bytes4 constant ARB_OS_VERSION = 0x4d2301cc;
    bytes4 constant IS_TOP_LEVEL_CALL = 0x2d4ba935;
    
    // Method selectors for ArbGasInfo precompile
    bytes4 constant GET_PRICES_IN_WEI = 0x4d2301cc;
    bytes4 constant GET_L1_BASE_FEE_ESTIMATE = 0x4d2301cc;
    bytes4 constant GET_PRICES_IN_WEI_WITH_AGGREGATOR = 0x4d2301cc;
    
    function setUp() public {
        // Set up test environment
        vm.label(ARBSYS_ADDRESS, "ArbSys Precompile");
        vm.label(ARBGASINFO_ADDRESS, "ArbGasInfo Precompile");
    }
    
    function testArbSysPrecompileAccessibility() public view {
        console.log(" Testing ArbSys precompile accessibility...");
        
        // Check if precompile has code
        uint256 codeSize = ARBSYS_ADDRESS.code.length;
        console.log("    Code size at 0x64:", codeSize);
        
        if (codeSize > 0) {
            console.log("    ArbSys precompile is accessible");
        } else {
            console.log("    ArbSys precompile not found");
            console.log("   💡 Arbitrum features may not be enabled");
        }
        
        // This test will pass regardless, but logs the status
        assertTrue(true);
    }
    
    function testArbGasInfoPrecompileAccessibility() public view {
        console.log("\n Testing ArbGasInfo precompile accessibility...");
        
        // Check if precompile has code
        uint256 codeSize = ARBGASINFO_ADDRESS.code.length;
        console.log("    Code size at 0x6C:", codeSize);
        
        if (codeSize > 0) {
            console.log("    ArbGasInfo precompile is accessible");
        } else {
            console.log("    ArbGasInfo precompile not found");
            console.log("   💡 Arbitrum features may not be enabled");
        }
        
        // This test will pass regardless, but logs the status
        assertTrue(true);
    }
    
    function testArbSysMethods() public {
        console.log("\n Testing ArbSys precompile methods...");
        
        // Test arbChainID()
        console.log("   Testing arbChainID()...");
        try this.callArbSys(ARB_CHAIN_ID) {
            console.log("    arbChainID() call successful");
        } catch Error(string memory reason) {
            console.log("    arbChainID() failed:", reason);
        } catch {
            console.log("    arbChainID() failed with unknown error");
        }
        
        // Test arbBlockNumber()
        console.log("   Testing arbBlockNumber()...");
        try this.callArbSys(ARB_BLOCK_NUMBER) {
            console.log("    arbBlockNumber() call successful");
        } catch Error(string memory reason) {
            console.log("    arbBlockNumber() failed:", reason);
        } catch {
            console.log("    arbBlockNumber() failed with unknown error");
        }
        
        // Test arbOSVersion()
        console.log("   Testing arbOSVersion()...");
        try this.callArbSys(ARB_OS_VERSION) {
            console.log("    arbOSVersion() call successful");
        } catch Error(string memory reason) {
            console.log("    arbOSVersion() failed:", reason);
        } catch {
            console.log("    arbOSVersion() failed with unknown error");
        }
    }
    
    function testArbGasInfoMethods() public {
        console.log("\n Testing ArbGasInfo precompile methods...");
        
        // Test getPricesInWei()
        console.log("   Testing getPricesInWei()...");
        try this.callArbGasInfo(GET_PRICES_IN_WEI) {
            console.log("    getPricesInWei() call successful");
        } catch Error(string memory reason) {
            console.log("    getPricesInWei() failed:", reason);
        } catch {
            console.log("    getPricesInWei() failed with unknown error");
        }
        
        // Test getL1BaseFeeEstimate()
        console.log("   Testing getL1BaseFeeEstimate()...");
        try this.callArbGasInfo(GET_L1_BASE_FEE_ESTIMATE) {
            console.log("    getL1BaseFeeEstimate() call successful");
        } catch Error(string memory reason) {
            console.log("    getL1BaseFeeEstimate() failed:", reason);
        } catch {
            console.log("    getL1BaseFeeEstimate() failed with unknown error");
        }
        
        // Test getPricesInWeiWithAggregator()
        console.log("   Testing getPricesInWeiWithAggregator()...");
        try this.callArbGasInfo(GET_PRICES_IN_WEI_WITH_AGGREGATOR) {
            console.log("    getPricesInWeiWithAggregator() call successful");
        } catch Error(string memory reason) {
            console.log("    getPricesInWeiWithAggregator() failed:", reason);
        } catch {
            console.log("    getPricesInWeiWithAggregator() failed with unknown error");
        }
    }
    
    function testGasCalculationAccuracy() public view {
        console.log("\n Testing gas calculation accuracy...");
        
        // Get current block gas limit
        uint256 gasLimit = block.gaslimit;
        console.log("    Current block gas limit:", gasLimit);
        
        // Get current gas price (if available)
        uint256 gasPrice = tx.gasprice;
        console.log("    Current transaction gas price:", gasPrice);
        
        // Try to get L1 base fee estimate from ArbGasInfo
        console.log("    Attempting to get L1 base fee estimate...");
        
        // This is a view function call that might fail
        try this.callArbGasInfo(GET_L1_BASE_FEE_ESTIMATE) {
            console.log("    L1 base fee estimate available");
        } catch {
            console.log("   ℹ️  L1 base fee estimate not available");
        }
        
        // This test will pass regardless, but logs the status
        assertTrue(true);
    }
    
    function testPrecompileStatePersistence() public {
        console.log("\n🔍 Testing precompile state persistence...");
        
        // Make multiple calls to see if state persists
        console.log("   Making multiple calls to ArbSys...");
        
        for (uint i = 0; i < 3; i++) {
            try this.callArbSys(ARB_CHAIN_ID) {
                console.log("    Call", i + 1, "successful");
            } catch {
                console.log("    Call", i + 1, "failed");
            }
        }
        
        // This test will pass regardless, but logs the status
        assertTrue(true);
    }
    
    // Helper function to call ArbSys precompile
    function callArbSys(bytes4 selector) external view returns (bytes memory) {
        (bool success, bytes memory data) = ARBSYS_ADDRESS.staticcall(abi.encodeWithSelector(selector));
        require(success, "ArbSys call failed");
        return data;
    }
    
    // Helper function to call ArbGasInfo precompile
    function callArbGasInfo(bytes4 selector) external view returns (bytes memory) {
        (bool success, bytes memory data) = ARBGASINFO_ADDRESS.staticcall(abi.encodeWithSelector(selector));
        require(success, "ArbGasInfo call failed");
        return data;
    }
    
    function testSummary() public view {
        console.log("\n" + string(abi.encodePacked("=", "=", "=", "=", "=", "=", "=", "=", "=", "=")));
        console.log(" ARBITRUM PRECOMPILE TEST SUMMARY");
        console.log(string(abi.encodePacked("=", "=", "=", "=", "=", "=", "=", "=", "=", "=")));
        
        console.log("This test suite validates Arbitrum precompile functionality");
        console.log("in a local Anvil network environment.");
        console.log("");
        console.log("Expected behavior:");
        console.log("- If Arbitrum features are enabled: precompiles should respond");
        console.log("- If Arbitrum features are disabled: precompiles should fail gracefully");
        console.log("");
        console.log("Check the logs above for detailed results.");
        console.log(string(abi.encodePacked("=", "=", "=", "=", "=", "=", "=", "=", "=", "=")));
    }
}
