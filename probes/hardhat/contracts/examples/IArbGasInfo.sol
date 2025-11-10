// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// Minimal interface for the ArbGasInfo precompile (0x...006C).
interface IArbGasInfo {
    /// Returns six uint256 values (shim order):
    /// [ l2BaseFee, l1BaseFeeEstimate, l1CalldataCost, l1StorageCost, congestionFee, aux ]
    function getPricesInWei()
        external
        view
        returns (
            uint256 l2BaseFee,
            uint256 l1BaseFeeEstimate,
            uint256 l1CalldataCost,
            uint256 l1StorageCost,
            uint256 congestionFee,
            uint256 aux
        );

    /// Returns the current L1 fee estimate for the tx (shim returns seeded slot[1]).
    function getCurrentTxL1GasFees() external view returns (uint256);
}

// Canonical constant address for ArbGasInfo on Arbitrum.
address constant ADDR_ARBGASINFO = 0x000000000000000000000000000000000000006C;

library GasInfoReader {
    IArbGasInfo internal constant GASINFO = IArbGasInfo(ADDR_ARBGASINFO);

    function prices() internal view returns (
        uint256 l2BaseFee,
        uint256 l1BaseFeeEstimate,
        uint256 l1CalldataCost,
        uint256 l1StorageCost,
        uint256 congestionFee,
        uint256 aux
    ) {
        return GASINFO.getPricesInWei();
    }

    function l1Estimate() internal view returns (uint256) {
        return GASINFO.getCurrentTxL1GasFees();
    }
}
