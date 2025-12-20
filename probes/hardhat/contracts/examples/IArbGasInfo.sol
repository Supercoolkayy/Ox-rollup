// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// Minimal interface for the ArbGasInfo precompile (0x...006C).
interface IArbGasInfo {
    /// Returns six uint256 values (shim order):
    /// [ perL2Tx, perL1CalldataFee, perStorageAllocation, perArbGasBase, perArbGasCongestion, perArbGasTotal ]
    function getPricesInWei()
        external
        view
        returns (
            uint256 perL2Tx,
            uint256 perL1CalldataFee,
            uint256 perStorageAllocation,
            uint256 perArbGasBase,
            uint256 perArbGasCongestion,
            uint256 perArbGasTotal
        );

    /// Returns the current L1 fee estimate for the tx (shim returns seeded slot[1]).
    function getCurrentTxL1GasFees() external view returns (uint256);
}

// Canonical constant address for ArbGasInfo on Arbitrum.
address constant ADDR_ARBGASINFO = 0x000000000000000000000000000000000000006C;

library GasInfoReader {
    IArbGasInfo internal constant GASINFO = IArbGasInfo(ADDR_ARBGASINFO);

    function prices() internal view returns (
        uint256 perL2Tx,
        uint256 perL1CalldataFee,
        uint256 perStorageAllocation,
        uint256 perArbGasBase,
        uint256 perArbGasCongestion,
        uint256 perArbGasTotal
    ) {
        return GASINFO.getPricesInWei();
    }

    function l1Estimate() internal view returns (uint256) {
        return GASINFO.getCurrentTxL1GasFees();
    }
}
