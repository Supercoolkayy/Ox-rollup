# **0x7e Transaction Support**
---
A key feature of **Arbitrum** is its ability to receive messages and transactions initiated from **Layer 1 (L1)**.
These are known as **“deposit transactions”** and are identified by the unique **EIP-2718 transaction type `0x7e`**.

**Anvil-Arbitrum** adds native support for parsing and executing these transactions, allowing you to **simulate L1-to-L2 interactions** in your local environment.

<br>


## **What is a Deposit Transaction?**

A **deposit transaction** is an **L2 transaction** created in response to an action on **L1**, such as:

* A user depositing **ETH**
* A user calling a **contract via a bridge**

It carries over important context from **L1**, including:

* The **L1 block number**
* The **timestamp**
* **Gas fee details**

This mechanism is **fundamental** to how **retryable tickets** and **cross-chain messaging** work on Arbitrum.

<br>


## **How Anvil-Arbitrum Handles 0x7e Transactions**

When `--arbitrum` mode is enabled, **Anvil-Arbitrum’s JSON-RPC layer** can recognize and decode **raw transactions** prefixed with the `0x7e` type byte.

---


### **Transaction Format**

A raw `0x7e` transaction is structured as:

```
0x7e || RLP_ENCODED_DATA
```

Where `RLP_ENCODED_DATA` is the **RLP-encoded list** of the transaction’s fields.

---


### **RLP-Encoded Fields**

| Field           | Description                                          |
| --------------- | ---------------------------------------------------- |
| `chainId`       | Identifier for the Arbitrum chain.                   |
| `target`        | Recipient address of the transaction.                |
| `value`         | Amount of ETH being transferred.                     |
| `data`          | Calldata sent with the transaction.                  |
| `gasLimit`      | Maximum gas allowed for execution.                   |
| `l1BlockNumber` | The originating L1 block number.                     |
| `l1Timestamp`   | The originating L1 block timestamp.                  |
| `l1BaseFee`     | The L1 base fee used for gas calculations.           |
| `l1GasPrice`    | The price of gas on L1.                              |
| `l1GasUsed`     | The amount of gas consumed on L1.                    |
| `l1Fee`         | The total fee associated with the L1 component.      |
| `refundAddress` | Address for excess fee refunds.                      |
| `sourceHash`    | A unique identifier derived from the L1 transaction. |

<br>


## **Simulating a Deposit Transaction**

While you typically won’t craft a `0x7e` transaction manually, **testing frameworks or scripts** can use `eth_sendRawTransaction` to submit one to the **Anvil-Arbitrum node**.

When submitted, the node will:

1. **Decode** the transaction payload.
2. **Validate** its structure and fields.
3. **Execute** it as an **L2 transaction**, making the `value` and `data` available to the target contract.
4. **Provide baseline gas accounting** consistent with **Arbitrum Nitro specifications**.

<br>


### **This Enables End-to-End Testing For:**

* Contracts triggered by **cross-chain messages**.
* Protocols that use **retryable tickets** for L1-to-L2 contract calls.
* Systems that **validate L1 block context** within L2 transactions.
