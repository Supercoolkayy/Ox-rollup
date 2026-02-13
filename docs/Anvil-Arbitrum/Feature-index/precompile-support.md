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

The **ArbGasInfo** precompile provides detailed information about gas scheduling and pricing on Arbitrum, including **L1 and L2 fee components**, **accounting parameters**, and **EIP-4844 Blob pricing**.

#### **Supported Functions**

| Function | Selector | Description |
| --- | --- | --- |
| `getPricesInWei()` | `0x41b247a8` | Returns a 6-tuple of the core gas price components (L1/L2 fees, congestion). |
| `getPricesInArbGas()` | `0x02199f34` | Returns gas prices in internal ArbGas units (3-tuple). |
| `getL1BaseFeeEstimate()` | `0xf5d6ded7` | Returns the estimated L1 base fee in wei. |
| `getL2BaseFeeEstimate()` | `0xb246b565` | Returns the current L2 base fee. |
| `getL1GasPriceEstimate()` | `0x055f362f` | Returns the estimated L1 gas price. |
| `getCurrentTxL1GasFees()` | `0xc6f7de0e` | Returns L1 gas fees for the current transaction (with compression heuristic). |
| `getGasAccountingParams()` | `0x612af178` | Returns speed limit, gas pool max, and tx gas limit parameters. |
| `getMinimumGasPrice()` | `0xf918379a` | Returns the minimum gas price (usually L2 base fee floor). |
| `getAmortizedCostCapBips()` | `0x7a7d6beb` | Returns the amortized cost cap in basis points. |
| `getL1BlobBaseFeeEstimate()` | `0x67037bec` | Returns the estimated L1 blob base fee (EIP-4844 support). |

#### **Example Solidity Usage**

```solidity
import {ArbGasInfo} from "@arbitrum/nitro-contracts/src/precompiles/ArbGasInfo.sol";

contract GasInfo {
    ArbGasInfo constant ARB_GAS_INFO = ArbGasInfo(address(108));

    function getL1FeeEstimate() public view returns (uint256) {
        // This call will work in Anvil-Arbitrum
        return ARB_GAS_INFO.getL1BaseFeeEstimate();
    }
    
    function getBlobFee() public view returns (uint256) {
         // This call will work (EIP-4844)
         return ARB_GAS_INFO.getL1BlobBaseFeeEstimate();
    }
}

```