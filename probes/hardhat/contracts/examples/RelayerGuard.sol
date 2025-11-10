// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IArbGasInfo.sol";

/// Guard contract for a relayer/paymaster to decide if a sponsored request is acceptable
/// based on expected L1 data fees derived from the current tuple.
contract RelayerGuard {
    using GasInfoReader for *;

    // Extra margin applied to the computed L1 data fee, in basis points.
    uint16 public marginBps;

    constructor(uint16 _marginBps) {
        marginBps = _marginBps;
    }

    /// Returns (ok, expectedWei) where expectedWei = l1BaseFeeEstimate + perByte * payloadBytes,
    /// then scaled by (1 + marginBps/10_000).
    function willSponsor(uint256 payloadBytes, uint256 maxFeeWei)
        external
        view
        returns (bool ok, uint256 expectedWei)
    {
        ( , uint256 l1BaseFeeEstimate, uint256 l1CalldataCost, , , ) = GasInfoReader.prices();
        uint256 base = l1BaseFeeEstimate;
        uint256 data = l1CalldataCost * payloadBytes;

        uint256 raw = base + data;
        expectedWei = (raw * (10_000 + marginBps)) / 10_000;

        ok = (expectedWei <= maxFeeWei);
    }
}
