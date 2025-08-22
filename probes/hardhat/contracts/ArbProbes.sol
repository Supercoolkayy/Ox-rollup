// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Interface stubs for ArbSys precompile
interface ArbSys {
    function arbChainId() external view returns (uint256);
    function arbBlockNumber() external view returns (uint256);
}

// Interface stubs for ArbGasInfo precompile
interface ArbGasInfo {
    function getCurrentTxL1GasFees() external view returns (uint256);
}

/**
 * @title ArbProbes
 * @dev Contract to test Arbitrum precompile accessibility on unpatched Hardhat/Anvil
 */
contract ArbProbes {
    // Arbitrum precompile addresses
    address constant ARBSYS_ADDRESS = 0x0000000000000000000000000000000000000064;
    address constant ARBGASINFO_ADDRESS = 0x000000000000000000000000000000000000006C;

    /**
     * @dev Calls arbChainId function of ArbSys precompile
     * @return chainId The Arbitrum chain ID
     */
    function getArbChainId() external view returns (uint256 chainId) {
        (bool success, bytes memory data) = ARBSYS_ADDRESS.staticcall(
            abi.encodeWithSignature("arbChainId()")
        );
        require(success, "ArbSys: arbChainId call failed");
        chainId = abi.decode(data, (uint256));
    }

    /**
     * @dev Calls arbBlockNumber function of ArbSys precompile
     * @return blockNumber The Arbitrum block number
     */
    function getArbBlockNumber() external view returns (uint256 blockNumber) {
        (bool success, bytes memory data) = ARBSYS_ADDRESS.staticcall(
            abi.encodeWithSignature("arbBlockNumber()")
        );
        require(success, "ArbSys: arbBlockNumber call failed");
        blockNumber = abi.decode(data, (uint256));
    }

    /**
     * @dev Calls getCurrentTxL1GasFees function of ArbGasInfo precompile
     * @return l1GasFees The current L1 gas fees for the transaction
     */
    function getCurrentTxL1GasFees() external view returns (uint256 l1GasFees) {
        (bool success, bytes memory data) = ARBGASINFO_ADDRESS.staticcall(
            abi.encodeWithSignature("getCurrentTxL1GasFees()")
        );
        require(success, "ArbGasInfo: getCurrentTxL1GasFees call failed");
        l1GasFees = abi.decode(data, (uint256));
    }
}
