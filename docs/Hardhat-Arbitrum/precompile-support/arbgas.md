# **ArbGasInfo (`0x000000000000000000000000000000000000006c`)**

---

The **ArbGasInfo** precompile provides essential information regarding gas scheduling, pricing components, and accounting parameters on Arbitrum Nitro. It is the primary interface for contracts and dApps to estimate L1 and L2 fees programmatically.

## **Configuration**

The handler supports runtime configuration via a `node_state/gas_config.json` file. This allows for the simulation of various network conditions (e.g., congestion, high L1 fees) without restarting the local node.

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

## **Supported Functions**

The handler intercepts calls to the following 4-byte function selectors:

| Function | Selector | Description |
| --- | --- | --- |
| `getPricesInWei()` | `0x41b247a8` | Returns a 6-tuple containing L2 base fee, L1 calldata cost, L1 byte price, active L2 base fee, congestion fee, and total L2 fee. |
| `getPricesInArbGas()` | `0x02199f34` | Returns gas prices denominated in internal ArbGas units (3-tuple). |
| `getCurrentTxL1GasFees()` | `0xc6f7de0e` | Estimates L1 gas fees for the transaction using a local compression heuristic. |
| `getL1BaseFeeEstimate()` | `0xf5d6ded7` | Returns the current estimated L1 base fee (in wei). |
| `getL2BaseFeeEstimate()` | `0xb246b565` | Returns the current L2 base fee (in wei). |
| `getL1GasPriceEstimate()` | `0x055f362f` | Returns the estimated L1 gas price (typically matches L1 base fee). |
| `getGasAccountingParams()` | `0x612af178` | Returns the Speed Limit, Gas Pool Max, and Max Tx Gas Limit. |
| `getMinimumGasPrice()` | `0xf918379a` | Returns the minimum gas price required for a transaction. |
| `getAmortizedCostCapBips()` | `0x7a7d6beb` | Returns the amortized cost cap in basis points. |
| `getL1BlobBaseFeeEstimate()` | `0x67037bec` | Returns the estimated L1 blob base fee (EIP-4844 support). |

## **L1 Cost Estimation**

The `getCurrentTxL1GasFees` method implements a compression heuristic to approximate Mainnet behavior, where data is compressed using Brotli before posting to L1. The local simulation logic is as follows:

1. **Zero-Byte Analysis:** Input calldata bytes equal to `0x00` are weighted at 4 gas per byte.
2. **Non-Zero Analysis:** Non-zero bytes are weighted at the configured `l1CalldataCost` (default 16 gas).
3. **Compression Discount:** The total calculated cost is discounted by a factor of **0.9x** to simulate the average savings achieved by batch compression and metadata amortization.

**Formula:**
$$Cost_{L1} = \lfloor (N_{zero} \times 4 + N_{nonzero} \times Cost_{calldata}) \times 0.9 \rfloor \times Fee_{L1Base}$$