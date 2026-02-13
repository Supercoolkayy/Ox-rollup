# **ArbSys (`0x0000000000000000000000000000000000000064`)**

---

The **ArbSys** precompile acts as the primary interface for interacting with the underlying Arbitrum chain, providing system information, L2-to-L1 messaging capabilities, and address aliasing utilities.

## **Supported Functions**

The handler intercepts calls to the following 4-byte function selectors:

| Function | Selector | Description |
| --- | --- | --- |
| `arbChainID()` | `0xd127f54a` | Returns the configured Arbitrum chain ID (defaults to 42161). |
| `arbBlockNumber()` | `0xa3b1b31d` | Returns the current L2 block number from the execution context. |
| `arbOSVersion()` | `0x051038f2` | Returns the current ArbOS version (defaults to version 20). |
| `sendTxToL1(address, bytes)` | `0x6e8c1d6f` | Sends a message to the L1 chain. In Hardhat, this queues a message in the `L1MessageQueue`. |
| `mapL1SenderContractAddressToL2Alias(address)` | `0xa0c12269` | Calculates the aliased L2 address for a given L1 contract address. |

## **L2-to-L1 Messaging**

The `sendTxToL1` function is a core component for cross-chain communication (e.g., withdrawals). In the Hardhat environment, calling this function **does not** produce a real L1 transaction. Instead, it simulates the behavior of the Arbitrum Inbox:

1. **Parsing:** The handler extracts the destination L1 address and the data payload from the calldata.
2. **Queuing:** A mock L2-to-L1 message is generated and pushed into the `PrecompileContext.l1MessageQueue`.
3. **Logging:** The event is logged to the console, providing developers visibility into the "sent" message.
4. **Return Value:** It returns a mock Message ID (incrementing counter) to simulate a successful submission.

## **Address Aliasing**

The `mapL1SenderContractAddressToL2Alias` function implements the standard Arbitrum aliasing formula used when L1 contracts initiate calls to L2. This transformation prevents L1 contract addresses from colliding with native L2 EOA addresses.

**Formula:**

$$Address_{L2} = Address_{L1} + \texttt{0x1111000000000000000000000000000000001111}$$


This calculation is performed using modulo arithmetic on the 160-bit address field.