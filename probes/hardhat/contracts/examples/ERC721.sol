// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ERC721 {
    string public name = "NFT";
    string public symbol = "XNFT";

    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => address) public getApproved;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed spender, uint256 indexed tokenId);

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _ownerOf[tokenId];
        require(owner != address(0), "not minted");
        return owner;
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "zero addr");
        return _balanceOf[owner];
    }

    function approve(address spender, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(msg.sender == owner, "not owner");
        getApproved[tokenId] = spender;
        emit Approval(owner, spender, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(ownerOf(tokenId) == from, "bad owner");
        require(msg.sender == from || msg.sender == getApproved[tokenId], "not allowed");
        _ownerOf[tokenId] = to;
        _balanceOf[from] -= 1;
        _balanceOf[to] += 1;
        delete getApproved[tokenId];
        emit Transfer(from, to, tokenId);
    }

    function mint(address to, uint256 tokenId) external {
        require(to != address(0), "zero");
        require(_ownerOf[tokenId] == address(0), "minted");
        _ownerOf[tokenId] = to;
        _balanceOf[to] += 1;
        emit Transfer(address(0), to, tokenId);
    }
}
