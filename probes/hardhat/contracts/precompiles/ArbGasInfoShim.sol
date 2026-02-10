// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ArbGasInfoShim
 * @notice Simulation of the Arbitrum ArbGasInfo precompile at 0x000000000000000000000000000000000000006c
 * @dev Implements the interface used by Arbitrum Nitro (ArbOS v50+), including gas accounting,
 * pricing constraints, and legacy support.
 */
contract ArbGasInfoShim {
    // -------------------------------------------------------------------------
    // Storage: Legacy & ArbGas Pricing
    // -------------------------------------------------------------------------

    // Legacy gas pricing slots (maintained for backward compatibility)
    uint256 private _perL2Tx;           // Slot 0
    uint256 private _perL1CalldataFee;  // Slot 1
    uint256 private _perStorageAllocation; // Slot 2
    uint256 private _perArbGasBase;     // Slot 3
    uint256 private _perArbGasCongestion; // Slot 4
    uint256 private _perArbGasTotal;    // Slot 5

    // ArbGas pricing slots (defaults match Arbitrum One mainnet)
    uint256 private _arbGasPerL2Tx = 91;
    uint256 private _arbGasPerL1Call = 0;
    uint256 private _arbGasPerStorage = 20000;

    uint256 private _currentTxL1GasFees;

    // -------------------------------------------------------------------------
    // Storage: Nitro Configuration
    // -------------------------------------------------------------------------

    // Nitro-specific pricing and accounting
    uint256 private _l1BaseFeeEstimate;
    uint256 private _minimumGasPrice;
    
    // Gas accounting parameters
    uint256 private _speedLimitPerSecond;
    uint256 private _gasPoolMax;
    uint256 private _maxBlockGasLimit;
    uint256 private _maxTxGasLimit;
    
    // Nitro pricing constraints (Token Bucket algorithm parameters)
    struct Constraint { uint64 t; uint64 w; uint64 b; }
    Constraint[] private _pricingConstraints;

    // -------------------------------------------------------------------------
    // Core Interface
    // -------------------------------------------------------------------------

    /**
     * @notice Get gas prices in wei.
     * @return (perL2Tx, perL1CalldataFee, perStorageAllocation, perArbGasBase, perArbGasCongestion, perArbGasTotal)
     */
    function getPricesInWei()
        public
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

    /**
     * @notice Wrapper for getPricesInWei that ignores the aggregator argument.
     */
    function getPricesInWeiWithAggregator(address)
        external
        view
        returns (uint256, uint256, uint256, uint256, uint256, uint256)
    {
        return getPricesInWei();
    }

    /**
     * @notice Get gas prices in ArbGas.
     * @return (perL2Tx, perL1CalldataFee, perStorageAllocation)
     */
    function getPricesInArbGas() public view returns (uint256, uint256, uint256) {
        return (_arbGasPerL2Tx, _arbGasPerL1Call, _arbGasPerStorage);
    }

    /**
     * @notice Wrapper for getPricesInArbGas that ignores the aggregator argument.
     */
    function getPricesInArbGasWithAggregator(address) 
        external 
        view 
        returns (uint256, uint256, uint256) 
    {
        return getPricesInArbGas();
    }


    function getCurrentTxL1GasFees() external view returns (uint256) { 
        return _currentTxL1GasFees; 
    }


    // -------------------------------------------------------------------------
    // Nitro Interface
    // -------------------------------------------------------------------------

    function getL1BaseFeeEstimate() external view returns (uint256) {
        return _l1BaseFeeEstimate;
    }

    function getGasAccountingParams() 
        external 
        view 
        returns (uint256, uint256, uint256) 
    {
        return (_speedLimitPerSecond, _gasPoolMax, _maxBlockGasLimit);
    }

    function getGasPricingConstraints() 
        external 
        view 
        returns (Constraint[] memory) 
    {
        return _pricingConstraints;
    }

    function getMinimumGasPrice() external view returns (uint256) {
        return _minimumGasPrice;
    }
    
    function getMaxTxGasLimit() external view returns (uint256) {
        return _maxTxGasLimit;
    }

    function getMaxBlockGasLimit() external view returns (uint64) {
        return uint64(_maxBlockGasLimit);
    }

    

    // -------------------------------------------------------------------------
    // Configuration & Seeding (Shim-Specific)
    // -------------------------------------------------------------------------

    /**
     * @notice Configures the standard pricing slots (Legacy Wei).
     * @param v Array of 6 uint256 values corresponding to the return values of getPricesInWei.
     */
    function __seed(uint256[6] calldata v) external {
        _perL2Tx = v[0];
        _perL1CalldataFee = v[1];
        _perStorageAllocation = v[2];
        _perArbGasBase = v[3];
        _perArbGasCongestion = v[4];
        _perArbGasTotal = v[5];
    }

    /**
     * @notice Configures the ArbGas pricing slots.
     */
    function __seedArbGasTuple(uint256 l2Tx, uint256 l1Call, uint256 storageGas) external {
        _arbGasPerL2Tx = l2Tx;
        _arbGasPerL1Call = l1Call;
        _arbGasPerStorage = storageGas;
    }

    /**
     * @notice Configures Nitro-specific accounting and pricing parameters.
     */
    function __seedNitroConfig(
        uint256 l1BaseFeeEst,
        uint256 speedLimit,
        uint256 maxBlockGas,
        uint256 maxTxGas,
        uint256 minGasPrice
    ) external {
        _l1BaseFeeEstimate = l1BaseFeeEst;
        _speedLimitPerSecond = speedLimit;
        _maxBlockGasLimit = maxBlockGas;
        _maxTxGasLimit = maxTxGas;
        _minimumGasPrice = minGasPrice;
        _gasPoolMax = maxBlockGas;
    }


    function __seedCurrentTxL1GasFees(uint256 value) external {
        _currentTxL1GasFees = value;
    }

    
    /**
     * @notice Adds a pricing constraint to the constraints array.
     */
    function __pushPricingConstraint(uint64 target, uint64 window, uint64 backlog) external {
        _pricingConstraints.push(Constraint(target, window, backlog));
    }
    
    /**
     * @notice Clears all pricing constraints.
     */
    function __clearPricingConstraints() external {
        delete _pricingConstraints;
    }

    // -------------------------------------------------------------------------
    // Stubs (Interface Compliance)
    // -------------------------------------------------------------------------
    // These methods return zero values to ensure interface compliance and
    // prevent reverts on standard calls that are not simulated by this shim.


    function getL1RewardRate() external view returns (uint64) { return 0; }
    function getL1RewardRecipient() external view returns (address) { return address(0); }
    function getGasBacklog() external view returns (uint64) { return 0; }
    function getPricingInertia() external view returns (uint64) { return 0; }
    function getGasBacklogTolerance() external view returns (uint64) { return 0; }
    function getL1PricingSurplus() external view returns (int256) { return 0; }
    function getPerBatchGasCharge() external view returns (int64) { return 0; }
    function getAmortizedCostCapBips() external view returns (uint64) { return 0; }
    function getL1FeesAvailable() external view returns (uint256) { return 0; }
    function getL1PricingEquilibrationUnits() external view returns (uint256) { return 0; }
    function getLastL1PricingUpdateTime() external view returns (uint64) { return 0; }
    function getL1PricingFundsDueForRewards() external view returns (uint256) { return 0; }
    function getL1PricingUnitsSinceUpdate() external view returns (uint64) { return 0; }
    function getLastL1PricingSurplus() external view returns (int256) { return 0; }
}
