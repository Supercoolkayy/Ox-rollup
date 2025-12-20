// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ArbGasInfoShim {
    //@note \/ getPricesInWei outputs
    uint256 private _perL2Tx;               // slot 0
    uint256 private _perL1CalldataFee;      // slot 1
    uint256 private _perStorageAllocation;  // slot 2
    uint256 private _perArbGasBase;         // slot 3
    uint256 private _perArbGasCongestion;   // slot 4
    uint256 private _perArbGasTotal;        // slot 5


    // one-compatible bundle
    function getPricesInWei()
        external
        view
        returns (uint256, uint256, uint256, uint256, uint256, uint256)
    {
        return (
            _perL2Tx,
            _perL1CalldataFee,      
            _perStorageAllocation,
            _perArbGasBase,
            _perArbGasCongestion,
            _perArbGasTotal
        );
    }




    // helpers for tests
    function __seed(uint256[6] calldata v) external {
        _perL2Tx = v[0];
        _perL1CalldataFee = v[1];
        _perStorageAllocation = v[2];
        _perArbGasBase = v[3];
        _perArbGasCongestion = v[4];
        _perArbGasTotal = v[5];
    }


    //@Deprecated/Legacy
    function getL1BaseFeeEstimate() external view returns (uint256) {
        return 0;
    }

    //@Deprecated/Legacy
    function getCurrentTxL1GasFees() external view returns (uint256) {
        return 0;
    }
}
