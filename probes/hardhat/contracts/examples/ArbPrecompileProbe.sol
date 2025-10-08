// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IArbSys.sol";
import "./IArbGasInfo.sol";

contract ArbPrecompileProbe {
    IArbSys     constant ARBSYS  = IArbSys(0x0000000000000000000000000000000000000064);
    IArbGasInfo constant GASINFO = IArbGasInfo(0x000000000000000000000000000000000000006C);

    function chainId() external view returns (uint256) {
        return ARBSYS.arbChainID();
    }

    function prices() external view returns (uint256[6] memory out) {
        (out[0], out[1], out[2], out[3], out[4], out[5]) = GASINFO.getPricesInWei();
    }

    function currentTxL1Fee() external view returns (uint256) {
        // In shim mode this returns the seeded estimate (slot 1), by design for determinism.
        return GASINFO.getCurrentTxL1GasFees();
    }
}
