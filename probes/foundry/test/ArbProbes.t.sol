// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/ArbProbes.sol";

contract ArbProbesTest is Test {
    ArbProbes private arbProbes;

    function setUp() public {
        arbProbes = new ArbProbes();
    }

    function testGetArbChainId() public {
        try arbProbes.getArbChainId() returns (uint256 chainId) {
            assertEq(chainId, 0, "Expected chainId to be 0 on unpatched nodes");
        } catch {
            emit log("getArbChainId call failed as expected on unpatched nodes");
        }
    }

    function testGetArbBlockNumber() public {
        try arbProbes.getArbBlockNumber() returns (uint256 blockNumber) {
            assertEq(blockNumber, 0, "Expected blockNumber to be 0 on unpatched nodes");
        } catch {
            emit log("getArbBlockNumber call failed as expected on unpatched nodes");
        }
    }

    function testGetCurrentTxL1GasFees() public {
        try arbProbes.getCurrentTxL1GasFees() returns (uint256 l1GasFees) {
            assertEq(l1GasFees, 0, "Expected l1GasFees to be 0 on unpatched nodes");
        } catch {
            emit log("getCurrentTxL1GasFees call failed as expected on unpatched nodes");
        }
    }
}
