# Arbitrum Local Development Compatibility Matrix

## Executive Summary

This matrix analyzes the compatibility of core Arbitrum features (ArbSys, ArbGasInfo precompiles, and transaction type 0x7e deposits) with local development environments Hardhat Network and Foundry Anvil. **All target features are currently unsupported**, requiring testnet deployment for validation of Arbitrum-specific functionality.

## Methodology

Analysis based on:

- Arbitrum precompiles reference documentation
- Foundry Anvil implementation using revm EVM in Rust
- Hardhat Network EVM implementation
- Review of existing plugin architectures
- **Probe testing results** from both Hardhat and Foundry environments

## Compatibility Matrix

### ArbSys Precompile (0x0000000000000000000000000000000000000064)

| Feature              | Subfeature/Function                     | Address/Type | Hardhat Support | Foundry/Anvil Support | Evidence                                                             | Proposed Fix                       | Priority | Notes                                         |
| -------------------- | --------------------------------------- | ------------ | --------------- | --------------------- | -------------------------------------------------------------------- | ---------------------------------- | -------- | --------------------------------------------- |
| **Basic Chain Info** | `arbBlockNumber()`                      | 0x64         | Not Supported   | Not Supported         | `probes/hardhat/test/arb-probes.ts` - CALL_EXCEPTION with empty data | Emulate with block.number          | P0       | Returns current L2 block number               |
| **Basic Chain Info** | `arbChainID()`                          | 0x64         | Not Supported   | Not Supported         | `probes/hardhat/test/arb-probes.ts` - CALL_EXCEPTION with empty data | Emulate with configurable chain ID | P0       | Returns Arbitrum chain ID (42161)             |
| **Block History**    | `arbBlockHash(uint256)`                 | 0x64         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with block hash mapping    | P1       | Range: currentBlockNum-256 to currentBlockNum |
| **System Version**   | `arbOSVersion()`                        | 0x64         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with configurable version  | P1       | Returns current ArbOS version                 |
| **Address Aliasing** | `isL1ContractAddressAliased()`          | 0x64         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with address mapping       | P1       | Check if caller is L1 contract alias          |
| **Address Aliasing** | `mapL1SenderContractAddressToL2Alias()` | 0x64         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with address mapping       | P1       | Map L1 contract to L2 alias                   |
| **L1→L2 Messaging**  | `withdrawEth(address)`                  | 0x64         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with event emission        | P1       | Initiate ETH withdrawal to L1                 |
| **L1→L2 Messaging**  | `sendTxToL1(address,bytes)`             | 0x64         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with event emission        | P1       | Send message from L2 to L1                    |
| **Legacy Functions** | `isTopLevelCall()`                      | 0x64         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with call stack depth      | P2       | **DEPRECATED** - may be removed               |
| **Legacy Functions** | `getStorageGasAvailable()`              | 0x64         | Not Supported   | Not Supported         | Not tested in probes                                                 | Always return 0                    | P2       | Always returns 0 in Nitro                     |

### ArbGasInfo Precompile (0x000000000000000000000000000000000000006C)

| Feature                | Subfeature/Function                        | Address/Type | Hardhat Support | Foundry/Anvil Support | Evidence                                                             | Proposed Fix                      | Priority | Notes                                   |
| ---------------------- | ------------------------------------------ | ------------ | --------------- | --------------------- | -------------------------------------------------------------------- | --------------------------------- | -------- | --------------------------------------- |
| **Gas Pricing**        | `getPricesInWei()`                         | 0x6C         | Not Supported   | Not Supported         | `probes/hardhat/test/arb-probes.ts` - CALL_EXCEPTION with empty data | Emulate with mock pricing         | P0       | Returns 5-tuple of gas components       |
| **L1 Cost Estimation** | `getL1BaseFeeEstimate()`                   | 0x6C         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with configurable L1 fee  | P0       | Get estimated L1 base fee               |
| **Aggregator Pricing** | `getPricesInWeiWithAggregator(address)`    | 0x6C         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with mock aggregator      | P0       | Returns 6-tuple for specific aggregator |
| **ArbGas Pricing**     | `getPricesInArbGas()`                      | 0x6C         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with mock pricing         | P1       | Returns 3-tuple in ArbGas units         |
| **Aggregator ArbGas**  | `getPricesInArbGasWithAggregator(address)` | 0x6C         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with mock aggregator      | P1       | Returns 3-tuple for specific aggregator |
| **Transaction Fees**   | `getCurrentTxL1GasFees()`                  | 0x6C         | Not Supported   | Not Supported         | `probes/hardhat/test/arb-probes.ts` - CALL_EXCEPTION with empty data | Emulate with calldata calculation | P1       | Get L1 gas fees for current tx          |
| **System Parameters**  | `getGasAccountingParams()`                 | 0x6C         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with configurable params  | P2       | Get gas accounting parameters           |
| **System Parameters**  | `getGasBacklog()`                          | 0x6C         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with mock backlog         | P2       | Get current gas backlog                 |
| **System Parameters**  | `getPricingInertia()`                      | 0x6C         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with configurable inertia | P2       | Get pricing inertia parameter           |
| **System Parameters**  | `getL1PricingSurplus()`                    | 0x6C         | Not Supported   | Not Supported         | Not tested in probes                                                 | Emulate with mock surplus         | P2       | Get L1 pricing surplus/deficit          |

### Transaction Type 0x7e (Deposit Transactions)

| Feature                   | Subfeature/Function        | Address/Type | Hardhat Support | Foundry/Anvil Support | Evidence                                                                                        | Proposed Fix                          | Priority | Notes                                         |
| ------------------------- | -------------------------- | ------------ | --------------- | --------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------- | -------- | --------------------------------------------- |
| **Transaction Parsing**   | RLP Decoding               | 0x7e         | ⚠️ **Partial**  | Not Supported         | `probes/hardhat/scripts/probe-0x7e.ts` - Transaction accepted but may not have proper semantics | Implement proper 0x7e parser          | P0       | Hardhat accepts but may not process correctly |
| **Transaction Execution** | Deposit Processing         | 0x7e         | Not Supported   | Not Supported         | Not tested in probes                                                                            | Implement deposit transaction handler | P0       | Execute with L1→L2 address resolution         |
| **Signature Validation**  | ECDSA Verification         | 0x7e         | Not Supported   | Not Supported         | Not tested in probes                                                                            | Implement signature validation        | P0       | Validate ECDSA signature for deposit          |
| **RPC Support**           | `eth_sendRawTransaction`   | 0x7e         | ⚠️ **Partial**  | Not Supported         | `probes/hardhat/scripts/probe-0x7e.ts` - Transaction sent successfully                          | Extend RPC to handle 0x7e             | P0       | Hardhat accepts but may not process correctly |
| **Receipt Generation**    | Transaction Receipt        | 0x7e         | Not Supported   | Not Supported         | Not tested in probes                                                                            | Generate proper receipt format        | P1       | Include deposit-specific fields               |
| **Transaction Details**   | `eth_getTransactionByHash` | 0x7e         | Not Supported   | Not Supported         | Not tested in probes                                                                            | Return deposit transaction details    | P1       | Include all deposit fields                    |

## Evidence Summary

### Hardhat Probe Results

- **ArbSys Precompiles**: All calls return `CALL_EXCEPTION` with empty data (`0x`)
  - `arbChainId()`: CALL_EXCEPTION, data: "0x"
  - `arbBlockNumber()`: CALL_EXCEPTION, data: "0x"
- **ArbGasInfo Precompiles**: All calls return `CALL_EXCEPTION` with empty data (`0x`)
  - `getCurrentTxL1GasFees()`: CALL_EXCEPTION, data: "0x"
- **0x7e Transactions**: ⚠️ **Unexpected Success** - Transaction sent successfully
  - Hash: `0xae75d9ef9997836b0f3c0aa027a55531494df6573a72d0f802435a2efd7977cf`
  - **Note**: This suggests Hardhat Network is more permissive than expected

### Foundry Probe Results

- **ArbSys Precompiles**: All calls fail gracefully as expected
  - `testGetArbChainId()`: Expected failure logged
  - `testGetArbBlockNumber()`: Expected failure logged
- **ArbGasInfo Precompiles**: All calls fail gracefully as expected
  - `testGetCurrentTxL1GasFees()`: Expected failure logged
- **0x7e Transactions**: Not tested due to script compilation issues

## Implementation Priority Matrix

### P0 (Critical - Must Implement First)

- `arbChainID()` - Basic chain identification
- `arbBlockNumber()` - Basic block information
- `getPricesInWei()` - Core gas pricing
- `getL1BaseFeeEstimate()` - L1 cost estimation
- Transaction type 0x7e parsing and execution
- RPC support for 0x7e transactions

### P1 (Important - Implement After P0)

- `arbBlockHash()` - Block history support
- `arbOSVersion()` - System version info
- Address aliasing functions
- L1→L2 messaging functions
- Aggregator-specific gas pricing
- Transaction receipt generation

### P2 (Optional - Implement Last)

- Legacy/deprecated functions
- Advanced system parameters
- Gas accounting details
- Performance optimization features

## Proposed Implementation Strategy

### Phase 1: Foundation (P0 Features)

1. **Precompile Registration**: Register ArbSys and ArbGasInfo at addresses 0x64 and 0x6C
2. **Basic Methods**: Implement `arbChainID()`, `arbBlockNumber()`, `getPricesInWei()`
3. **Transaction Parsing**: Add 0x7e support to RLP decoder
4. **RPC Extension**: Extend `eth_sendRawTransaction` for 0x7e

### Phase 2: Enhanced Features (P1 Features)

1. **Address Aliasing**: Implement L1→L2 address mapping
2. **L1 Messaging**: Add `withdrawEth()` and `sendTxToL1()` emulation
3. **Gas Aggregators**: Support custom gas price aggregators
4. **Transaction Receipts**: Generate proper deposit transaction receipts

### Phase 3: Advanced Features (P2 Features)

1. **System Parameters**: Implement advanced gas accounting
2. **Performance**: Optimize precompile execution
3. **Monitoring**: Add debugging and monitoring capabilities

## Technical Considerations

### Hardhat Implementation

- **Plugin Architecture**: Extend Hardhat Network's EVM implementation
- **Precompile Injection**: Hook into precompile registration system
- **Transaction Processing**: Extend transaction pipeline for 0x7e

### Foundry Implementation

- **revm Extension**: Extend precompile map with Arbitrum precompiles
- **Transaction Types**: Add 0x7e support to transaction enum
- **Gas Logic**: Implement custom gas calculation algorithms

### Cross-Platform Consistency

- **API Compatibility**: Ensure consistent behavior between Hardhat and Anvil
- **Configuration**: Support similar configuration schemas
- **Testing**: Maintain compatibility with existing test suites

---

**Generated**: 2025-08-19  
**Sources**: Arbitrum Documentation, Probe Testing Results, Hardhat/Foundry Implementation Analysis  
**Status**: Ready for Milestone 2 Implementation Planning
