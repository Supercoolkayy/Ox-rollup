// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IArbGasInfo.sol";

/// Simple escrow that requires enough ETH to cover L1 submission costs when finalizing.
/// Uses getCurrentTxL1GasFees() for a deterministic estimate under shim mode.
contract SettlementEscrow {
    using GasInfoReader for *;

    // Extra safety margin on top of the estimate, in basis points (e.g., 1000 = +10%).
    uint16 public marginBps;

    event Finalized(address indexed caller, uint256 paid, uint256 required);

    constructor(uint16 _marginBps) {
        marginBps = _marginBps;
    }

    function quote() public view returns (uint256) {
        uint256 est = GasInfoReader.l1Estimate();
        return (est * (10_000 + marginBps)) / 10_000;
    }

    function finalize(bytes calldata /*proofOrPayload*/) external payable {
        uint256 requiredWei = quote();
        require(msg.value >= requiredWei, "insufficient escrow for L1 cost");
        emit Finalized(msg.sender, msg.value, requiredWei);
        // Placeholder for post-finalization logic; funds could be swept after proof verification.
    }
}
