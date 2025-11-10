// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title ERC20Basic (minimal for tests)
contract ERC20Basic {
    string public name = "Token";
    string public symbol = "TK";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;

    constructor() {
        uint256 mintAmount = 1_000_000 * 10**uint256(decimals);
        totalSupply = mintAmount;
        balanceOf[msg.sender] = mintAmount;
    }
}
