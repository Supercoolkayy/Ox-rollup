// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ArbGasInfoShim {
    // sequential storage slots 0..5
    uint256 private _l2BaseFee;         // slot 0
    uint256 private _l1BaseFeeEstimate; // slot 1
    uint256 private _l1CalldataCost;    // slot 2
    uint256 private _l1StorageCost;     // slot 3
    uint256 private _congestionFee;     // slot 4
    uint256 private _aux;               // slot 5 (reserved/aux)

    // Nitro-compatible bundle
    function getPricesInWei()
        external
        view
        returns (uint256, uint256, uint256, uint256, uint256, uint256)
    {
        return (
            _l2BaseFee,
            _l1BaseFeeEstimate,
            _l1CalldataCost,
            _l1StorageCost,
            _congestionFee,
            _aux
        );
    }

    // helpers for tests
    function __seed(uint256[6] calldata v) external {
        _l2BaseFee = v[0];
        _l1BaseFeeEstimate = v[1];
        _l1CalldataCost = v[2];
        _l1StorageCost = v[3];
        _congestionFee = v[4];
        _aux = v[5];
    }


    function getL1BaseFeeEstimate() external view returns (uint256) {
        return _l1BaseFeeEstimate;
    }

    // Simple stand-in so the probe passes. Nitro’s real value is contextual;
    // for local shim, contract return the estimate (slot 1).
    function getCurrentTxL1GasFees() external view returns (uint256) {
        return _l1BaseFeeEstimate;
    }
}
