
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ArbSysShim {
    uint256 private _chainId; // slot 0 (override)

    function arbChainID() public view returns (uint256) {
        return _chainId == 0 ? block.chainid : _chainId;
    }

    // compatibility:  lowercase variant
    function arbChainId() external view returns (uint256) {
        return arbChainID();
    }

    function arbBlockNumber() external view returns (uint256) { return block.number; }
}
