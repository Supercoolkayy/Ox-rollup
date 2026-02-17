# Hardhat Precompile Registry

---

The Hardhat Precompile Registry serves as a middleware layer within the Hardhat Network environment, emulating the behavior of Arbitrum's native precompiled contracts. This system intercepts calls to specific reserved addresses (`0x0...64` through `0x0...6c`) and executes local handlers, allowing developers to test Arbitrum-specific logic, such as cross-chain messaging and gas estimation, without connecting to a live node.

## **Registry Architecture**

The registry operates by injecting an L2-specific context into the execution environment.

* **PrecompileContext:** Every call receives an enhanced context containing the current block number, chain ID, L1 base fee estimates, and access to the L1 message queue.
* **Handler Resolution:** The registry maps target addresses to specific `PrecompileHandler` instances.
* **L1 Message Queue:** A specialized queue that captures messages sent via `sendTxToL1`, simulating the Arbitrum Inbox behavior for local testing.

---

## **ArbGasInfo (`0x000000000000000000000000000000000000006c`)**

The **ArbGasInfo** precompile provides essential information regarding gas scheduling, pricing components, and accounting parameters on Arbitrum Nitro.

### **Configuration**

The handler supports runtime configuration via a `node_state/gas_config.json` file. This allows for the simulation of various network conditions (e.g., congestion, high L1 fees).

**Configuration Schema:**

```json
{
  "l1BaseFee": "20000000000",
  "gasPriceComponents": {
    "l2BaseFee": "100000000",
    "l1CalldataCost": "16",
    "l1StorageCost": "0",
    "congestionFee": "0"
  },
  "gasAccounting": {
    "speedLimitPerSecond": "120000000",
    "gasPoolMax": "32000000",
    "maxTxGasLimit": "32000000",
    "amortizedCostCapBips": "10000"
  }
}

```

### **Supported Functions**

| Function | Selector | Description |
| --- | --- | --- |
| `getPricesInWei()` | `0x41b247a8` | Returns a 6-tuple of gas components including L1 byte price, L2 base fee, and congestion fees. |
| `getPricesInArbGas()` | `0x02199f34` | Returns gas prices denominated in internal ArbGas units (3-tuple). |
| `getCurrentTxL1GasFees()` | `0xc6f7de0e` | Estimates L1 gas fees for the transaction using a local compression heuristic. |
| `getL1BaseFeeEstimate()` | `0xf5d6ded7` | Returns the current estimated L1 base fee (in wei). |
| `getL2BaseFeeEstimate()` | `0xb246b565` | Returns the current L2 base fee (in wei). |
| `getL1GasPriceEstimate()` | `0x055f362f` | Returns the estimated L1 gas price (typically matches L1 base fee). |
| `getGasAccountingParams()` | `0x612af178` | Returns the Speed Limit, Gas Pool Max, and Max Tx Gas Limit. |
| `getMinimumGasPrice()` | `0xf918379a` | Returns the minimum gas price required for a transaction. |
| `getAmortizedCostCapBips()` | `0x7a7d6beb` | Returns the amortized cost cap in basis points. |
| `getL1BlobBaseFeeEstimate()` | `0x67037bec` | Returns the estimated L1 blob base fee (EIP-4844 support). |

### **L1 Cost Estimation**

The `getCurrentTxL1GasFees` method implements a compression heuristic to approximate Mainnet behavior:

1. **Zero Bytes:** Charged at 4 gas per byte.
2. **Non-Zero Bytes:** Charged at the configured `l1CalldataCost` (default 16 gas).
3. **Compression Discount:** The total is discounted by a factor of 0.9 to simulate Brotli compression savings.

---

## **ArbSys (`0x0000000000000000000000000000000000000064`)**

The **ArbSys** precompile acts as the primary interface for interacting with the underlying Arbitrum chain, providing system information and L2-to-L1 messaging capabilities.

### **Supported Functions**

| Function | Selector | Description |
| --- | --- | --- |
| `arbChainID()` | `0xd127f54a` | Returns the configured Arbitrum chain ID (defaults to 42161). |
| `arbBlockNumber()` | `0xa3b1b31d` | Returns the current L2 block number. |
| `arbOSVersion()` | `0x051038f2` | Returns the current ArbOS version. |
| `sendTxToL1(address, bytes)` | `0x6e8c1d6f` | Sends a message to the L1 chain. In Hardhat, this queues a message in the `L1MessageQueue`. |
| `mapL1SenderContractAddressToL2Alias(address)` | `0xa0c12269` | Calculates the aliased L2 address for a given L1 contract address. |

### **L2-to-L1 Messaging**

The `sendTxToL1` function is a core component for cross-chain communication (e.g., withdrawals). In the Hardhat environment, calling this function does not produce a real L1 transaction but instead:

1. Parses the destination address and data payload.
2. Generates a mock L2-to-L1 message.
3. Pushes the message into the `PrecompileContext.l1MessageQueue`.
4. Logs the event to the console for debugging visibility.

### **Address Aliasing**

The `mapL1SenderContractAddressToL2Alias` function implements the standard Arbitrum aliasing formula used when L1 contracts initiate calls to L2:

```
L2_Alias = L1_Address + 0x1111000000000000000000000000000000001111

```

This ensures that L1 contract addresses do not collide with native L2 EOA addresses.