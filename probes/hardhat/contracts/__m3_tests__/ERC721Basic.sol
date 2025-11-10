// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title ERC721Basic (ultra-minimal for tests)
contract ERC721Basic {
    string public name = "NFT";
    string public symbol = "XNFT";

    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _ownerOf[tokenId];
        require(owner != address(0), "NOT_MINTED");
        return owner;
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "ZERO_ADDR");
        return _balanceOf[owner];
    }

    function mint(address to, uint256 tokenId) external {
        require(to != address(0), "ZERO_ADDR");
        require(_ownerOf[tokenId] == address(0), "ALREADY_MINTED");
        _ownerOf[tokenId] = to;
        _balanceOf[to] += 1;
    }
}
