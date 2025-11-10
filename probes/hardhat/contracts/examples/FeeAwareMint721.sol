// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IArbGasInfo.sol";

/// Minimal NFT that prices mint by including an L1 data surcharge
/// proportional to the supplied payload length (bytes).
contract FeeAwareMint721 {
    using GasInfoReader for *;

    string public name;
    string public symbol;

    // Base mint price (in wei), independent of payload size.
    uint256 public basePriceWei;

    // Safety margin in basis points, applied to the per-byte L1 cost (e.g., +500 = +5%).
    uint16 public surchargeBps;

    uint256 private _nextId = 1;
    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;

    event Mint(address indexed to, uint256 indexed tokenId, uint256 paid, uint256 payloadBytes);

    constructor(string memory _name, string memory _symbol, uint256 _basePriceWei, uint16 _surchargeBps) {
        name = _name;
        symbol = _symbol;
        basePriceWei = _basePriceWei;
        surchargeBps = _surchargeBps;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _ownerOf[tokenId];
    }

    function balanceOf(address a) external view returns (uint256) {
        return _balanceOf[a];
    }

    /// Computes the mint price for a given payload length.
    /// Model: basePrice + l1CalldataCostWeiPerByte * payloadBytes * (1 + surchargeBps/10_000).
    function quoteMint(bytes calldata payload) public view returns (uint256) {
        ( , , uint256 l1CalldataCost, , , ) = GasInfoReader.prices();
        uint256 perByte = l1CalldataCost;
        uint256 bytesLen = payload.length;

        // apply margin
        uint256 scaled = perByte * bytesLen;
        uint256 withMargin = (scaled * (10_000 + surchargeBps)) / 10_000;

        return basePriceWei + withMargin;
    }

    function mint(bytes calldata payload) external payable {
        uint256 price = quoteMint(payload);
        require(msg.value >= price, "insufficient mint value");

        uint256 id = _nextId++;
        _ownerOf[id] = msg.sender;
        _balanceOf[msg.sender] += 1;

        emit Mint(msg.sender, id, msg.value, payload.length);

        // optional refund of dust
        if (msg.value > price) {
            unchecked {
                payable(msg.sender).transfer(msg.value - price);
            }
        }
    }
}
