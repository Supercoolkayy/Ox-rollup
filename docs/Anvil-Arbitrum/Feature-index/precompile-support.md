# **Precompile Support**
---
Anvil-Arbitrum provides native emulation for Arbitrum's most critical precompiled contracts.
Precompiles are special contracts at fixed addresses that provide functionality that would be too expensive or impossible to implement in the EVM directly.
This support is crucial for testing contracts that interact with Arbitrum's core system logic.

<br>

## **Activation**

When the `--arbitrum` flag is enabled, **Anvil-Arbitrum** activates handlers for the following precompiles:

<br>

### **ArbSys (`0x0000000000000000000000000000000000000064`)**

The **ArbSys** precompile provides information about the current Arbitrum chain and block.

#### **Supported Functions**

| Function           | Selector     | Description                               |
| ------------------ | ------------ | ----------------------------------------- |
| `arbChainID()`     | `0xa3b1b31d` | Returns the configured Arbitrum chain ID. |
| `arbBlockNumber()` | `0x051038f2` | Returns the current L2 block number.      |
| `arbOSVersion()`   | `0x4d2301cc` | Returns the configured ArbOS version.     |

#### **Example Solidity Usage**

```solidity
import {ArbSys} from "@arbitrum/nitro-contracts/src/precompiles/ArbSys.sol";

contract ArbitrumInfo {
    ArbSys constant ARB_SYS = ArbSys(address(100));

    function getChainId() public view returns (uint256) {
        // This call will work in Anvil-Arbitrum
        return ARB_SYS.arbChainID();
    }

    function getArbBlockNumber() public view returns (uint256) {
        // This call will also work
        return ARB_SYS.arbBlockNumber();
    }
}
```

<br>


### **ArbGasInfo (`0x000000000000000000000000000000000000006c`)**

The **ArbGasInfo** precompile provides detailed information about gas scheduling and pricing on Arbitrum, including **L1 and L2 fee components**.

#### **Supported Functions**

| Function                  | Selector      | Description                                               |
| ------------------------- | ------------- | --------------------------------------------------------- |
| `getCurrentTxL1GasFees()` | `0x4d2301cc`  | Returns the L1 gas fees paid for the current transaction. |
| `getPricesInWei()`        | `0xa3b1b31d`  | Returns a 5-tuple of the core gas price components.       |
| `getL1BaseFeeEstimate()`  | `0xb4d2301cc` | Returns the estimated L1 base fee in wei.                 |

#### **Example Solidity Usage**

```solidity
import {ArbGasInfo} from "@arbitrum/nitro-contracts/src/precompiles/ArbGasInfo.sol";

contract GasInfo {
    ArbGasInfo constant ARB_GAS_INFO = ArbGasInfo(address(108));

    function getL1FeeEstimate() public view returns (uint256) {
        // This call will work in Anvil-Arbitrum
        return ARB_GAS_INFO.getL1BaseFeeEstimate();
    }
}
```
