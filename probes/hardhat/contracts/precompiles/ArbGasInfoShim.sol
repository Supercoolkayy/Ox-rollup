// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ArbGasInfoShim
 * @notice Mock implementation of the ArbGasInfo precompile (0x6C) for local development and testing.
 * @dev Implements the interface used by Arbitrum Nitro (ArbOS v50+), including gas accounting, 
 * pricing constraints, and legacy support.
 */
contract ArbGasInfoShim {
    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    // Legacy gas pricing slots (maintained for backward compatibility)
    uint256 private _perL2Tx;               // Slot 0
    uint256 private _perL1CalldataFee;      // Slot 1
    uint256 private _perStorageAllocation;  // Slot 2 (Mapped to L1 Cost Per Byte in Nitro)
    uint256 private _perArbGasBase;         // Slot 3 (Mapped to L2 Base Fee in Nitro)
    uint256 private _perArbGasCongestion;   // Slot 4 (Mapped to Congestion Fee in Nitro)
    uint256 private _perArbGasTotal;        // Slot 5 (Mapped to Total L2 Fee in Nitro)

    // Nitro-specific pricing and accounting
    uint256 private _l1BaseFeeEstimate;
    uint256 private _minimumGasPrice;
    
    // Gas accounting parameters
    uint256 private _speedLimitPerSecond;
    uint256 private _gasPoolMax;
    uint256 private _maxBlockGasLimit;
    uint256 private _maxTxGasLimit;
    
    // Nitro pricing constraints (Token Bucket algorithm parameters)
    // Structure: [target, window, backlog]
    uint64[3][] private _pricingConstraints;

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
     * @notice Get the L1 base fee estimate.
     */
    function getL1BaseFeeEstimate() external view returns (uint256) {
        return _l1BaseFeeEstimate;
    }

    /**
     * @notice Get the gas accounting parameters.
     * @return (speedLimitPerSecond, gasPoolMax, maxBlockGasLimit)
     */
    function getGasAccountingParams() 
        external 
        view 
        returns (uint256, uint256, uint256) 
    {
        return (_speedLimitPerSecond, _gasPoolMax, _maxBlockGasLimit);
    }

    /**
     * @notice Get the gas pricing constraints used by the multi-constraint pricing model.
     */
    function getGasPricingConstraints() 
        external 
        view 
        returns (uint64[3][] memory) 
    {
        return _pricingConstraints;
    }

    /**
     * @notice Get the minimum gas price needed for a transaction to succeed.
     */
    function getMinimumGasPrice() external view returns (uint256) {
        return _minimumGasPrice;
    }
    
    /**
     * @notice Get the maximum gas limit per transaction.
     */
    function getMaxTxGasLimit() external view returns (uint256) {
        return _maxTxGasLimit;
    }

    /**
     * @notice Get the maximum gas limit per block.
     */
    function getMaxBlockGasLimit() external view returns (uint64) {
        return uint64(_maxBlockGasLimit);
    }

    /**
     * @notice Legacy method returning fixed stub values.
     * @return (0, 0, 20000)
     */
    function getPricesInArbGas() public pure returns (uint256, uint256, uint256) {
        return (0, 0, 20000);
    }

    /**
     * @notice Legacy wrapper for getPricesInArbGas.
     */
    function getPricesInArbGasWithAggregator(address) 
        external 
        pure 
        returns (uint256, uint256, uint256) 
    {
        return getPricesInArbGas();
    }

    // -------------------------------------------------------------------------
    // Test Configuration (Seeding)
    // -------------------------------------------------------------------------

    /**
     * @notice Configures the standard pricing slots.
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
     * @notice Configures Nitro-specific accounting and pricing parameters.
     * @param l1BaseFeeEst The L1 base fee estimate.
     * @param speedLimit The L2 speed limit per second.
     * @param maxBlockGas The maximum gas allowed per block.
     * @param maxTxGas The maximum gas allowed per transaction.
     * @param minGasPrice The minimum gas price.
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
    }

    /**
     * @notice Adds a pricing constraint to the constraints array.
     */
    function __pushPricingConstraint(uint64 target, uint64 window, uint64 backlog) external {
        _pricingConstraints.push([target, window, backlog]);
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
    // The following methods return default zero values to ensure full interface 
    // compliance and prevent transaction reverts on standard method calls.

    function getCurrentTxL1GasFees() external view returns (uint256) { return 0; }
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