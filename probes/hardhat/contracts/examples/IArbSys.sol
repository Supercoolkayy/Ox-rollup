// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IArbSys {
    // canonical: 0x0000000000000000000000000000000000000064
    function arbChainID() external view returns (uint256);
    function arbChainId() external view returns (uint256);
    function arbBlockNumber() external view returns (uint256);
}
