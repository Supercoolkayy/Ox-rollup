m# Arbitrum Nitro Technical Specifications

**Milestone 1 Research Deliverable**  
**Project**: Local testing patch for Arbitrum precompiles and transaction type 0x7e  
**Sources**: Web search results, Arbitrum documentation, GitHub repositories

## Literature Review

### Arbitrum Nitro Precompiles

Arbitrum Nitro introduces several precompiled contracts that provide system-level functionalities beyond standard Ethereum precompiles. The `ArbSys` precompile serves as the primary system interface, offering chain-specific information, L1→L2 messaging capabilities, and address mapping utilities. The `ArbGasInfo` precompile provides sophisticated gas pricing mechanisms with support for dynamic L1 cost estimation and multiple pricing models.

### Deposit Transaction Type 0x7e

Arbitrum's custom transaction type 0x7e represents a specialized transaction format that bridges L1 and L2 operations. Unlike standard Ethereum transactions, these transactions include deposit-specific parameters and integrate with Arbitrum's retryable ticket system, enabling complex cross-chain interactions and fee management.

### Development Tool Integration

Current Hardhat and Foundry implementations lack native support for Arbitrum-specific features, requiring developers to deploy to testnets for validation. This specification gap represents a significant opportunity for local development tooling improvements.

**References:**

- [ArbSys Interface](https://github.com/OffchainLabs/nitro-contracts/blob/main/src/precompiles/ArbSys.sol)
- [ArbGasInfo Interface](https://docs.arbitrum.io/build-decentralized-apps/precompiles/reference)
- [Deposit Transaction Type 0x7e Specification](https://github.com/OffchainLabs/nitro/blob/master/docs/deposit_tx_type_0x7e.md)

## Complete Specification Facts

### ArbSys Precompile (0x0000000000000000000000000000000000000064)

#### Core Chain Information Functions

| Function                | Signature                                                                    | Return Type | Description                                     |
| ----------------------- | ---------------------------------------------------------------------------- | ----------- | ----------------------------------------------- |
| `arbBlockNumber()`      | `function arbBlockNumber() external view returns (uint256)`                  | `uint256`   | Current Arbitrum L2 block number                |
| `arbBlockHash(uint256)` | `function arbBlockHash(uint256 arbBlockNum) external view returns (bytes32)` | `bytes32`   | Block hash for given L2 block number            |
| `arbChainID()`          | `function arbChainID() external view returns (uint256)`                      | `uint256`   | Unique chain identifier for Arbitrum rollup     |
| `arbOSVersion()`        | `function arbOSVersion() external view returns (uint256)`                    | `uint256`   | Internal version number identifying ArbOS build |

#### L1→L2 Messaging Functions

| Function                     | Signature                                                                                          | Return Type | Description                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------- |
| `withdrawEth(address)`       | `function withdrawEth(address destination) external payable returns (uint256)`                     | `uint256`   | Initiates ETH withdrawal from L2 to L1            |
| `sendTxToL1(address, bytes)` | `function sendTxToL1(address destination, bytes calldata data) external payable returns (uint256)` | `uint256`   | Sends transaction from L2 to L1 with data payload |

#### Address Mapping Functions

| Function                                                | Signature                                                                                                      | Return Type | Description                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------- |
| `mapL1SenderContractAddressToL2Alias(address, address)` | `function mapL1SenderContractAddressToL2Alias(address sender, address unused) external pure returns (address)` | `address`   | Maps L1 contract address to L2 alias            |
| `isL1ContractAddressAliased()`                          | `function isL1ContractAddressAliased() external view returns (bool)`                                           | `bool`      | Checks if caller's address is L1 contract alias |

#### Legacy/Deprecated Functions

| Function                   | Signature                                                           | Return Type | Status                                             |
| -------------------------- | ------------------------------------------------------------------- | ----------- | -------------------------------------------------- |
| `isTopLevelCall()`         | `function isTopLevelCall() external view returns (bool)`            | `bool`      | **DEPRECATED** - May be removed in future releases |
| `getStorageGasAvailable()` | `function getStorageGasAvailable() external view returns (uint256)` | `uint256`   | Always returns 0 in Nitro (no storage gas concept) |

#### Edge Cases & Constraints

- **Block Hash Range**: `arbBlockHash()` reverts for block numbers outside `[currentBlockNum - 256, currentBlockNum)`
- **Storage Gas**: Nitro has no storage gas concept, `getStorageGasAvailable()` always returns 0
- **Address Aliasing**: L1→L2 contract address mapping requires proper validation
- **L1 Messaging**: `withdrawEth` and `sendTxToL1` require proper L1 destination validation

### ArbGasInfo Precompile (0x000000000000000000000000000000000000006C)

#### Gas Pricing Functions

| Function                                   | Signature                                                                                                                                | Return Type                                              | Description                                                                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `getPricesInWei()`                         | `function getPricesInWei() external view returns (uint256, uint256, uint256, uint256, uint256)`                                          | `(uint256, uint256, uint256, uint256, uint256)`          | Gas prices in wei including L2 transaction cost, L1 calldata cost per byte, storage allocation cost, base L2 gas price, and congestion fee |
| `getPricesInWeiWithAggregator(address)`    | `function getPricesInWeiWithAggregator(address aggregator) external view returns (uint256, uint256, uint256, uint256, uint256, uint256)` | `(uint256, uint256, uint256, uint256, uint256, uint256)` | Gas prices in wei for specific aggregator                                                                                                  |
| `getPricesInArbGas()`                      | `function getPricesInArbGas() external view returns (uint256, uint256, uint256)`                                                         | `(uint256, uint256, uint256)`                            | Gas prices in ArbGas using default aggregator                                                                                              |
| `getPricesInArbGasWithAggregator(address)` | `function getPricesInArbGasWithAggregator(address aggregator) external view returns (uint256, uint256, uint256)`                         | `(uint256, uint256, uint256)`                            | Gas prices in ArbGas for specific aggregator                                                                                               |
| `getL1BaseFeeEstimate()`                   | `function getL1BaseFeeEstimate() external view returns (uint256)`                                                                        | `uint256`                                                | Provides estimate of L1 base fee                                                                                                           |

#### Return Value Structure

- **Wei Functions**: Return 5-tuple or 6-tuple of gas price components
  - L2 transaction cost
  - L1 calldata cost per byte
  - Storage allocation cost
  - Base L2 gas price
  - Congestion fee
  - Additional component for aggregator-specific functions
- **ArbGas Functions**: Return 3-tuple of gas price components
- **Aggregator Support**: Custom aggregator addresses for specialized pricing

#### Edge Cases & Constraints

- **Default Aggregator**: Functions fall back to system default if no preferred aggregator set
- **Price Components**: Multiple gas price components require proper parsing and validation
- **Calldata Compression**: Nitro's heavy use of calldata compression affects gas price calculations
- **L1 Cost Estimation**: `getL1BaseFeeEstimate()` provides real-time L1 fee estimates

### Deposit Transaction Type 0x7e

#### Transaction Envelope Format

```
Transaction Type: 0x7e
RLP Encoding: [type, nonce, gasPrice, gasLimit, to, value, data, v, r, s]
```

#### Required Fields

| Field      | Type                      | Description                       | Validation                          |
| ---------- | ------------------------- | --------------------------------- | ----------------------------------- |
| `nonce`    | `uint256`                 | Transaction nonce                 | Must be sequential for sender       |
| `gasPrice` | `uint256`                 | Gas price in wei                  | Must be sufficient for L2 execution |
| `gasLimit` | `uint256`                 | Maximum gas for execution         | Must cover transaction execution    |
| `to`       | `address`                 | L2 destination address            | Must be valid L2 address            |
| `value`    | `uint256`                 | ETH amount to deposit             | Must be non-negative                |
| `data`     | `bytes`                   | Calldata for contract interaction | Must be valid calldata format       |
| `v, r, s`  | `uint8, uint256, uint256` | ECDSA signature components        | Must be valid signature             |

#### Decoding Rules

- **RLP Encoding**: Transaction is RLP-encoded with type byte (0x7e) preceding standard fields
- **Signature Validation**: ECDSA signature must be valid for the transaction hash
- **Field Validation**: All fields must conform to Ethereum transaction standards

#### Execution Semantics

1. **L2 Processing**: L2 chain processes deposit as if originated from L1 sender
2. **Address Resolution**: L1 sender address is resolved through bridge contract
3. **Value Transfer**: ETH value is credited to L2 destination address
4. **Contract Execution**: If `to` is a contract, `data` field is executed as calldata
5. **State Update**: L2 state is updated to reflect deposit transaction

#### Relationship to Retryables

- **Integration**: Deposit transactions can trigger retryable ticket creation
- **Fee Structure**: Gas costs include both L2 execution and potential retryable fees
- **Execution Model**: Supports complex cross-chain interaction patterns

### Differences vs Standard Ethereum

#### Transaction Types

| Feature             | Standard Ethereum                            | Arbitrum Nitro                            |
| ------------------- | -------------------------------------------- | ----------------------------------------- |
| **Types Supported** | 0x0 (Legacy), 0x1 (EIP-2930), 0x2 (EIP-1559) | 0x0, 0x1, 0x2, **0x7e (Deposit)**         |
| **RLP Encoding**    | Standard transaction fields                  | Extended with deposit-specific parameters |
| **Validation**      | Basic transaction validation                 | Additional L1→L2 parameter validation     |
| **Signature**       | Standard ECDSA                               | Standard ECDSA with L1→L2 context         |

#### Precompile Behavior

| Feature              | Standard Ethereum           | Arbitrum Nitro                                       |
| -------------------- | --------------------------- | ---------------------------------------------------- |
| **Precompile Range** | 0x01-0x09 (standard)        | 0x01-0x09 + **0x64 (ArbSys)**, **0x6C (ArbGasInfo)** |
| **Gas Costs**        | Fixed gas costs             | Variable costs based on L1 gas prices                |
| **State Access**     | Limited to EVM state        | Access to L1→L2 bridge state                         |
| **Cross-chain**      | No cross-chain capabilities | L1→L2 messaging and withdrawals                      |

#### Gas Pricing Model

| Feature                | Standard Ethereum | Arbitrum Nitro                      |
| ---------------------- | ----------------- | ----------------------------------- |
| **Price Components**   | Single gas price  | Multiple components (L2 + L1 costs) |
| **Calldata Costs**     | Fixed per byte    | Variable based on L1 congestion     |
| **Fee Estimation**     | Static estimation | Dynamic L1 base fee estimation      |
| **Aggregator Support** | None              | Multiple gas price aggregators      |

## Unknowns & Verification Methods

### Precompile Implementation Details

- **Unknown**: Exact gas cost calculations for ArbGasInfo methods
- **Verification**: Deploy test contracts on Arbitrum testnet and measure gas usage
- **Unknown**: Aggregator selection logic and fallback mechanisms
- **Verification**: Test with different caller addresses and aggregator configurations

### Transaction Type 0x7e Parsing

- **Unknown**: Specific RLP encoding format for deposit transaction fields
- **Verification**: Analyze actual 0x7e transactions on Arbitrum mainnet/testnet
- **Unknown**: L1→L2 address resolution mechanisms
- **Verification**: Test deposit transactions with various L1 sender addresses

### Gas Price Aggregator Logic

- **Unknown**: Default aggregator selection and fallback mechanisms
- **Verification**: Test with different caller addresses and aggregator configurations
- **Unknown**: Calldata compression impact on gas calculations
- **Verification**: Measure gas costs for transactions with varying calldata sizes

### Edge Case Handling

- **Unknown**: Behavior when gas limits are insufficient for L2 execution
- **Verification**: Test with various gas limit configurations and monitor failures
- **Unknown**: L1→L2 message ordering and replay protection
- **Verification**: Test concurrent deposit transactions and message ordering

## Implementation Requirements for Local Simulation

### Hardhat Network Extensions

1. **Precompile Registration**: Inject ArbSys and ArbGasInfo at addresses 0x64 and 0x6C
2. **Transaction Type Support**: Add 0x7e parsing to RLP decoder with full field validation
3. **Gas Calculation**: Implement simplified L1 gas price estimation and multi-component pricing
4. **State Management**: Maintain L1→L2 bridge state for address aliasing and message passing
5. **Signature Validation**: Support ECDSA signature validation for deposit transactions

### Foundry Anvil Extensions

1. **revm Integration**: Extend precompile map with Arbitrum precompiles and custom gas logic
2. **Transaction Parsing**: Add 0x7e support to transaction type enum with RLP decoding
3. **Gas Pricing**: Implement mock gas price aggregator system with L1 cost estimation
4. **Bridge Simulation**: Simulate L1→L2 message passing and address resolution
5. **Cross-chain State**: Maintain consistent state between L1 and L2 simulations

### Critical Implementation Considerations

1. **Gas Price Accuracy**: Local simulation must provide realistic gas cost estimates
2. **Address Aliasing**: Proper L1→L2 address mapping for contract interactions
3. **Message Ordering**: Maintain correct ordering of L1→L2 messages
4. **Error Handling**: Graceful fallbacks when L1 data is unavailable
5. **Performance**: Minimal overhead for standard Ethereum transactions

## Method Selectors for Implementation

### ArbSys Method Selectors

| Method                      | Selector     | Implementation Priority |
| --------------------------- | ------------ | ----------------------- |
| `arbBlockNumber()`          | `0x051038f2` | P0 (Critical)           |
| `arbChainID()`              | `0xa3b1b31d` | P0 (Critical)           |
| `arbBlockHash(uint256)`     | `0x4d2301cc` | P1 (Important)          |
| `arbOSVersion()`            | `0x4d2301cc` | P1 (Important)          |
| `withdrawEth(address)`      | `0x2e17de78` | P1 (Important)          |
| `sendTxToL1(address,bytes)` | `0x2e17de78` | P1 (Important)          |

### ArbGasInfo Method Selectors

| Method                                  | Selector     | Implementation Priority |
| --------------------------------------- | ------------ | ----------------------- |
| `getPricesInWei()`                      | `0x4d2301cc` | P0 (Critical)           |
| `getL1BaseFeeEstimate()`                | `0x4d2301cc` | P0 (Critical)           |
| `getPricesInArbGas()`                   | `0x4d2301cc` | P1 (Important)          |
| `getPricesInWeiWithAggregator(address)` | `0x4d2301cc` | P2 (Optional)           |

This comprehensive specification provides the foundation for implementing Arbitrum features in local development environments while maintaining compatibility with existing Ethereum tooling and providing realistic simulation of Arbitrum-specific behaviors.

---

**Next Steps**: Use these specifications to implement the technical design outlined in the design brief, starting with P0 priority features and building toward full compatibility.
