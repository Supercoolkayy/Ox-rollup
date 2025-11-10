// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ArbProbes
 * @dev Contract to test Arbitrum precompile functionality
 * This contract provides a clean interface for testing ArbSys precompiles
 */
contract ArbProbes {
    // Events for tracking L1 message sends
    event L1MessageSent(
        address indexed destination,
        bytes data,
        uint256 messageId
    );

    event L1MessageQueued(
        address indexed destination,
        bytes data,
        uint256 messageId
    );

    // ArbSys precompile address
    address constant ARBSYS = 0x0000000000000000000000000000000000000064;

    // ArbGasInfo precompile address
    address constant ARBGASINFO = 0x000000000000000000000000000000000000006C;

    /**
     * @dev Test arbChainID() precompile call
     * @return chainId The current chain ID
     */
    function testArbChainID() external view returns (uint256 chainId) {
        // Call arbChainID() on ArbSys precompile
        // Function selector: 0xa3b1b31d
        (bool success, bytes memory data) = ARBSYS.staticcall(
            abi.encodeWithSignature("arbChainID()")
        );
        
        require(success, "ArbSys.arbChainID() call failed");
        require(data.length == 32, "Invalid data length");
        
        chainId = abi.decode(data, (uint256));
    }

    /**
     * @dev Test arbBlockNumber() precompile call
     * @return blockNumber The current block number
     */
    function testArbBlockNumber() external view returns (uint256 blockNumber) {
        // Call arbBlockNumber() on ArbSys precompile
        // Function selector: 0x051038f2
        (bool success, bytes memory data) = ARBSYS.staticcall(
            abi.encodeWithSignature("arbBlockNumber()")
        );
        
        require(success, "ArbSys.arbBlockNumber() call failed");
        require(data.length == 32, "Invalid data length");
        
        blockNumber = abi.decode(data, (uint256));
    }

    /**
     * @dev Test arbOSVersion() precompile call
     * @return version The current ArbOS version
     */
    function testArbOSVersion() external view returns (uint256 version) {
        // Call arbOSVersion() on ArbSys precompile
        // Function selector: 0x4d2301cc
        (bool success, bytes memory data) = ARBSYS.staticcall(
            abi.encodeWithSignature("arbOSVersion()")
        );
        
        require(success, "ArbSys.arbOSVersion() call failed");
        require(data.length == 32, "Invalid data length");
        
        version = abi.decode(data, (uint256));
    }

    /**
     * @dev Test sendTxToL1() precompile call
     * @param destination The L1 destination address
     * @param data The data to send to L1
     * @return messageId The unique message identifier
     */
    function testSendTxToL1(
        address destination,
        bytes calldata data
    ) external returns (uint256 messageId) {
        // Call sendTxToL1(address,bytes) on ArbSys precompile
        // Function selector: 0x6e8c1d6f
        (bool success, bytes memory result) = ARBSYS.call(
            abi.encodeWithSignature("sendTxToL1(address,bytes)", destination, data)
        );
        
        require(success, "ArbSys.sendTxToL1() call failed");
        require(result.length == 32, "Invalid result length");
        
        messageId = abi.decode(result, (uint256));
        
        // Emit events for tracking
        emit L1MessageSent(destination, data, messageId);
        emit L1MessageQueued(destination, data, messageId);
    }

    /**
     * @dev Test mapL1SenderContractAddressToL2Alias() precompile call
     * @param l1Address The L1 contract address to alias
     * @return l2Alias The L2 aliased address
     */
    function testMapL1SenderContractAddressToL2Alias(
        address l1Address
    ) external view returns (address l2Alias) {
        // Call mapL1SenderContractAddressToL2Alias(address) on ArbSys precompile
        // Function selector: 0xa0c12269
        (bool success, bytes memory data) = ARBSYS.staticcall(
            abi.encodeWithSignature("mapL1SenderContractAddressToL2Alias(address)", l1Address)
        );
        
        require(success, "ArbSys.mapL1SenderContractAddressToL2Alias() call failed");
        require(data.length == 32, "Invalid data length");
        
        l2Alias = abi.decode(data, (address));
    }

    /**
     * @dev Test multiple ArbSys calls in sequence
     * @return chainId The current chain ID
     * @return blockNumber The current block number
     * @return version The current ArbOS version
     */
    function testMultipleArbSysCalls() external view returns (
        uint256 chainId,
        uint256 blockNumber,
        uint256 version
    ) {
        chainId = this.testArbChainID();
        blockNumber = this.testArbBlockNumber();
        version = this.testArbOSVersion();
    }

    /**
     * @dev Test L1 message queuing with multiple messages
     * @param destinations Array of L1 destination addresses
     * @param dataArray Array of data to send to L1
     * @return messageIds Array of unique message identifiers
     */
    function testMultipleL1Messages(
        address[] calldata destinations,
        bytes[] calldata dataArray
    ) external returns (uint256[] memory messageIds) {
        require(
            destinations.length == dataArray.length,
            "Arrays must have same length"
        );
        
        messageIds = new uint256[](destinations.length);
        
        for (uint256 i = 0; i < destinations.length; i++) {
            messageIds[i] = this.testSendTxToL1(destinations[i], dataArray[i]);
        }
    }

    /**
     * @dev Test address aliasing for multiple L1 addresses
     * @param l1Addresses Array of L1 contract addresses to alias
     * @return l2Aliases Array of L2 aliased addresses
     */
    function testMultipleAddressAliases(
        address[] calldata l1Addresses
    ) external view returns (address[] memory l2Aliases) {
        l2Aliases = new address[](l1Addresses.length);
        
        for (uint256 i = 0; i < l1Addresses.length; i++) {
            l2Aliases[i] = this.testMapL1SenderContractAddressToL2Alias(l1Addresses[i]);
        }
    }

    /**
     * @dev Test that the precompile addresses are accessible
     * @return arbSysAddress The ArbSys precompile address
     * @return arbGasInfoAddress The ArbGasInfo precompile address
     */
    function testPrecompileAddresses() external pure returns (
        address arbSysAddress,
        address arbGasInfoAddress
    ) {
        arbSysAddress = ARBSYS;
        arbGasInfoAddress = ARBGASINFO;
    }

    /**
     * @dev Test error handling for invalid precompile calls
     * This should fail gracefully when the precompile is not available
     */
    function testErrorHandling() external view {
        // Try to call a non-existent function on ArbSys
        // This should fail gracefully
        (bool success, ) = ARBSYS.staticcall(
            abi.encodeWithSignature("nonExistentFunction()")
        );
        
        // We expect this to fail, but not crash
        // The exact behavior depends on the precompile implementation
    }

    /**
     * @dev Test gas estimation for precompile calls
     * @return gasUsed The estimated gas usage
     */
    function testGasEstimation() external view returns (uint256 gasUsed) {
        uint256 gasBefore = gasleft();
        
        // Make a simple precompile call
        this.testArbChainID();
        
        gasUsed = gasBefore - gasleft();
    }
}
