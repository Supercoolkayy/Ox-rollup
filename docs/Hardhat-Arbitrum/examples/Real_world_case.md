# **Examples: Fee-Aware Minting, Settlement Escrow, Relayer Guard, and Precompile Interfaces**
---
This document describes five example components and their companion scripts:

* `contracts/examples/FeeAwareMint721.sol` with `scripts/examples/demo-fee-aware-mint.js`
* `contracts/examples/SettlementEscrow.sol` with `scripts/examples/demo-settlement-escrow.js`
* `contracts/examples/RelayerGuard.sol` with `scripts/examples/demo-relayer-guard.js`
* `contracts/examples/IArbGasInfo.sol`
* `contracts/examples/IArbSys.sol`

Focus: practical use-cases for a Stylus-first local testing environment that exposes Arbitrum precompile data via shims at canonical addresses.

---

## **Shared context**

**Canonical precompile addresses**

| Precompile | Address                                      |
| ---------- | -------------------------------------------- |
| ArbSys     | `0x0000000000000000000000000000000000000064` |
| ArbGasInfo | `0x000000000000000000000000000000000000006C` |

**ArbGasInfo shim tuple order** returned by `getPricesInWei()`:

```
[ l2BaseFee, l1BaseFeeEstimate, l1CalldataCost, l1StorageCost, congestionFee, aux ]
```

* `getCurrentTxL1GasFees()` (shim) returns the **estimate** (tuple index 1) for deterministic testing.

**Local reseeding**

* Command: `npx hardhat arb:reseed-shims [--stylus|--nitro] [--cache-ttl <sec>]`
* Priority: Stylus RPC → `precompiles.config.json` → built-in fallback
* Typical Stylus RPC for testnet: `https://sepolia-rollup.arbitrum.io/rpc`
* Example stability flags (helpful on WSL/docker):
  `NODE_OPTIONS=--dns-result-order=ipv4first` and `NODE_NO_HTTP2=1`

---

## **FeeAwareMint721.sol**

### Purpose

ERC-721 minting with **fee-aware pricing** that accounts for L1 data costs (calldata) derived from `ArbGasInfo.getPricesInWei()`.

### Design

* Reads the 6-tuple from `ArbGasInfo` at `0x…006C`.
* Derives a **surcharge** from the `l1CalldataCost` component (tuple index 2) and the **payload length** supplied at mint time.
* Final mint price = `basePrice + surcharge`.
* In shim mode, changing the tuple via reseed immediately updates the quoted price, enabling deterministic CI or controlled what-if testing.

**Pricing model (illustrative)**

```
basePriceWei   = contract constant or constructor parameter
calldataBytes  = length(payload)
surchargeWei   = l1CalldataCostWeiPerByte * calldataBytes
finalPriceWei  = basePriceWei + surchargeWei
```

### Dependencies

* `IArbGasInfo.sol` interface and canonical address constant.
* Local shims or native handlers installed and readable.

### Example script

File: `scripts/examples/demo-fee-aware-mint.js`

**What the script does**

1. Deploys `FeeAwareMint721`.
2. Calls `quoteMint(payload)` to print the current price under the active tuple.
3. Executes the mint with `msg.value` that covers the quoted amount.
4. Prints the transaction gas used.

**Run**

```bash
npx hardhat --config hardhat.config.js run --network localhost scripts/examples/demo-fee-aware-mint.js
```

**Observed output (example)**

```
FeeAwareMint721 deployed: 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
quoteMint(payload): 1044100000000000 wei
mint tx gasUsed: 104158
```

### Interpretation

* `quoteMint(payload)` reflects current `l1CalldataCost` and payload size, proving fee awareness.
* Reseeding the tuple before running the script modifies the quoted price deterministically.

---

## **SettlementEscrow.sol**

### Purpose

Settlement/withdrawal flow that **escrows** enough ether to cover the L1 submission cost, using `getCurrentTxL1GasFees()` as a simple bound.

### Design

* `quote()` queries `ArbGasInfo.getCurrentTxL1GasFees()` to estimate required funds.
* `finalize()` enforces that escrowed funds ≥ estimate; otherwise reverts.
* In shim mode, the estimate equals the tuple’s slot 1 (`l1BaseFeeEstimate`) for deterministic bounds.

### Dependencies

* `IArbGasInfo.sol` interface and canonical address constant.
* Local shims or native handlers.

### Example script

File: `scripts/examples/demo-settlement-escrow.js`

**What the script does**

1. Deploys `SettlementEscrow`.
2. Calls `quote()` to print the minimum escrow requirement.
3. Sends a finalize transaction with exact or greater value and prints gas used.

**Run**

```bash
npx hardhat --config hardhat.config.js run --network localhost scripts/examples/demo-settlement-escrow.js
```

**Observed output (example)**

```
SettlementEscrow deployed: 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
quote(): 0 wei
finalize gasUsed: 32332
```

### Interpretation

* `quote()` equals tuple slot 1 in shim mode. After reseeding to a higher estimate, `quote()` increases accordingly.
* Validates a common settlement invariant: **escrowed ≥ estimate**.

---

## **RelayerGuard.sol**

### Purpose

Meta-transaction relayer guard that **accepts or rejects sponsorship** based on expected L1 data fees to avoid relayer loss.

### Design

* Reads `getPricesInWei()` from `ArbGasInfo`.
* Computes expected L1 fee from `l1CalldataCost` and a declared payload size.
* Compares **expectedWei** to a **relayerBudget**; sponsorship proceeds only if `budget ≥ expectedWei * safetyMargin`.

**Guard model (illustrative)**

```
l1Cost = l1CalldataCostWeiPerByte * payloadBytes
expectedWei = l1Cost + (optional surcharge or margin)
decision = (budgetWei >= expectedWei * marginBps/10000)
```

### Dependencies

* `IArbGasInfo.sol` interface and canonical address constant.
* Local shims or native handlers.

### Example script

File: `scripts/examples/demo-relayer-guard.js`

**What the script does**

1. Deploys `RelayerGuard`.
2. Computes `expectedWei` for a sample payload.
3. Prints `willSponsor` decision and the budget used for the test.

**Run**

```bash
npx hardhat --config hardhat.config.js run --network localhost scripts/examples/demo-relayer-guard.js
```

**Observed output (example)**

```
RelayerGuard deployed: 0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e
willSponsor: false expectedWei: 1105920000000000 budget: 400000000000000
```

### Interpretation

* The guard blocks sponsorship when expected L1 costs exceed the provided budget, demonstrating robust relayer protection.
* Reseeding the tuple changes the decision threshold deterministically.

---

## **IArbGasInfo.sol**

### Purpose

Lightweight interface for the Arbitrum `ArbGasInfo` precompile used by the examples.

### Contents

* `function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)`
* `function getCurrentTxL1GasFees() view returns (uint256)`
* `address constant GASINFO = 0x000000000000000000000000000000000000006C;`
  *(Checksum `…006C` avoids Solidity literal warnings.)*

### Role in examples

* Shared by `FeeAwareMint721`, `SettlementEscrow`, and `RelayerGuard`.
* Encapsulates precompile address and ABI; eases reuse across contracts.

---

## **IArbSys.sol**

### Purpose

Lightweight interface for the Arbitrum `ArbSys` precompile.

### Contents (typical)

* `function arbChainID() view returns (uint256)`
* `address constant ARBSYS = 0x0000000000000000000000000000000000000064;`

### Role in examples

* Not directly invoked by the three example applications above, but commonly used in probes and diagnostics to confirm configured chain ID (`ArbSys.arbChainID()`).

---

## **Execution matrix**

| Example                 | Script                      | Primary behavior                                                  | Depends on tuple index |
| ----------------------- | --------------------------- | ----------------------------------------------------------------- | ---------------------- |
| FeeAwareMint721         | `demo-fee-aware-mint.js`    | Fee-aware mint pricing using calldata length and `l1CalldataCost` | Index 2 (calldata)     |
| SettlementEscrow        | `demo-settlement-escrow.js` | Escrow bound using `getCurrentTxL1GasFees()`                      | Index 1 (estimate)     |
| RelayerGuard            | `demo-relayer-guard.js`     | Sponsorship decision from computed L1 cost vs. budget             | Index 2 (calldata)     |
| IArbGasInfo (interface) | —                           | Interface for `ArbGasInfo`                                        | —                      |
| IArbSys (interface)     | —                           | Interface for `ArbSys`                                            | —                      |

---

## **Example command sequences**

**Persistent local node**

```bash
# Start a persistent node (example port)
npx hardhat node --port 8549
```

**Predeploy shims (once per node boot)**

```bash
npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js
```

**Optional: reseed from Stylus testnet (Stylus-first)**

```bash
export NODE_OPTIONS=--dns-result-order=ipv4first
export NODE_NO_HTTP2=1
export STYLUS_RPC=https://sepolia-rollup.arbitrum.io/rpc

npx hardhat --config hardhat.config.js arb:reseed-shims --network localhost --stylus
```

**Run examples**

```bash
npx hardhat --config hardhat.config.js run --network localhost scripts/examples/demo-fee-aware-mint.js
npx hardhat --config hardhat.config.js run --network localhost scripts/examples/demo-settlement-escrow.js
npx hardhat --config hardhat.config.js run --network localhost scripts/examples/demo-relayer-guard.js
```

---

## **What these examples accomplish**

* **FeeAwareMint721**: Demonstrates dynamic, fee-aware pricing that responds to L1 data cost, enabling realistic mint economics in a deterministic local environment.
* **SettlementEscrow**: Demonstrates settlement logic that ensures sufficient funds for L1 submission costs, validated through a simple, stable estimate.
* **RelayerGuard**: Demonstrates a practical relayer/paymaster guard to prevent sponsoring loss under volatile fee conditions; fully testable by reseeding different fee tuples.

All three examples are directly affected by shim reseeding, making them suitable for CI workflows that require consistent behavior while still allowing controlled variation of fee conditions.
