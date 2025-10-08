# Examples: ERC20, ERC721, and ArbPrecompileProbe

This document describes three example contracts and their companion scripts:

* `contracts/examples/ERC20.sol` with `scripts/examples/deploy-erc20.js`
* `contracts/examples/ERC721.sol` with `scripts/examples/deploy-erc721.js`
* `contracts/examples/ArbPrecompileProbe.sol` with `scripts/examples/arb-precompile-probe.js`

The token examples demonstrate standard deployment and basic interactions. The precompile probe demonstrates reads against `ArbSys` (`0x…64`) and `ArbGasInfo` (`0x…6c`) in the local environment (shim mode or native if available).

---

## Prerequisites (all examples)

* Hardhat project with `@nomicfoundation/hardhat-ethers` and the Arbitrum patch plugin configured.
* A local network:

  * Ephemeral: `--network hardhat` (default), or
  * Persistent: a running node such as `npx hardhat node --port 8549` and `networks.localhost` configured in `hardhat.config.js`.
* For `ArbPrecompileProbe`:

  * Shims predeployed at the canonical precompile addresses **or** native handlers active.
  * Typical predeploy script: `scripts/predeploy-precompiles.js`.

---

## 1) ERC20 Example

### Contract

File: `contracts/examples/ERC20.sol`
A minimal ERC-20 with constructor parameters `(name, symbol, initialSupply)` and standard getters.

### Script

File: `scripts/examples/deploy-erc20.js`
Actions performed:

1. Deploy `ERC20` with example parameters.
2. Read `name`, `symbol`, and `totalSupply`.
3. Transfer a small amount to another account and print the recipient balance.

### Run

```bash
npx hardhat --config hardhat.config.js run --network localhost scripts/examples/deploy-erc20.js
```

### Example output

```
ERC20 deployed: 0x5FbDB2315678afecb367f032d93F642f64180aa3
 name: Token
 symbol: TK
 totalSupply: 1000000000000000000000000
 transfer 100 → 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
 recipient balance: 100000000000000000000
```

### Notes

* Output values reflect constructor arguments and post-transfer state on the local network.
* No dependency on precompiles for this example.

---

## 2) ERC721 Example

### Contract

File: `contracts/examples/ERC721.sol`
A minimal ERC-721 with constructor parameters `(name, symbol)` and a simple `mint(to, tokenId)` function.

### Script

File: `scripts/examples/deploy-erc721.js`
Actions performed:

1. Deploy `ERC721` with example parameters.
2. Mint `tokenId = 1` to a second account.
3. Read `ownerOf(1)` and print the result.

### Run

```bash
npx hardhat --config hardhat.config.js run --network localhost scripts/examples/deploy-erc721.js
```

### Example output

```
ERC721 deployed: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
 name: NFT
 symbol: XNFT
 minted tokenId 1 to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
 ownerOf(tokenId): 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

### Notes

* Standard ERC-721 behavior on a local network.
* No dependency on precompiles for this example.

---

## 3) ArbPrecompileProbe Example

### Contract

File: `contracts/examples/ArbPrecompileProbe.sol`
Purpose: demonstrate EVM calls to Arbitrum precompiles from a contract on a local chain.

Interfaces:

* `ArbSys` at `0x0000000000000000000000000000000000000064`
* `ArbGasInfo` at `0x000000000000000000000000000000000000006C`
  *(Uppercase checksum `…006C` is used in the Solidity literal to satisfy the compiler.)*

Provided view functions (typical):

* `probeChainId()` → returns the chain ID through `ArbSys`.
* `probeL1Estimate()` → returns the L1 estimate through `ArbGasInfo.getCurrentTxL1GasFees()` *(shim mode returns the seeded estimate deterministically)*.
* `probeTuple()` → returns the `getPricesInWei()` 6-tuple *(shim order)*.

### Script

File: `scripts/examples/arb-precompile-probe.js`
Actions performed:

1. Deploy `ArbPrecompileProbe`.
2. Call `probeChainId()`, `probeL1Estimate()`, and `probeTuple()`.
3. Print results.

### Run

```bash
# If using shims, predeploy once to the persistent node:
npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js

# Then run the probe:
npx hardhat --config hardhat.config.js run --network localhost scripts/examples/arb-precompile-probe.js
```

### Example output

```
ArbPrecompileProbe deployed: 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
probeChainId(): 42161
probeL1Estimate(): 1000000000
probeTuple(): [ '69440', '1000000000', '2000000000000', '100000000', '0', '100000000' ]
```

### Notes

* Values reflect the current state of the local environment:

  * Shim mode: values mirror the last seeded tuple and chain ID.
  * Native mode (if enabled in other phases): values reflect the handler’s logic.
* Reseeding `ArbGasInfoShim` via `arb:reseed-shims` immediately affects `probeL1Estimate()` and `probeTuple()` on subsequent calls.

---

## Reference Table

| Example            | Contract                                    | Script                                     | Primary Actions                                        | Depends on Precompiles |
| ------------------ | ------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ | ---------------------- |
| ERC20              | `contracts/examples/ERC20.sol`              | `scripts/examples/deploy-erc20.js`         | Deploy, read metadata, transfer, read balance          | No                     |
| ERC721             | `contracts/examples/ERC721.sol`             | `scripts/examples/deploy-erc721.js`        | Deploy, mint, read owner                               | No                     |
| ArbPrecompileProbe | `contracts/examples/ArbPrecompileProbe.sol` | `scripts/examples/arb-precompile-probe.js` | Read `ArbSys` chainId, `ArbGasInfo` estimate and tuple | Yes (shims or native)  |

---

## Common commands

```bash
# Persistent local node
npx hardhat node --port 8549

# Predeploy shims (if using shim mode for the probe)
npx hardhat --config hardhat.config.js run --network localhost scripts/predeploy-precompiles.js

# Deploy ERC20 and perform a transfer
npx hardhat --config hardhat.config.js run --network localhost scripts/examples/deploy-erc20.js

# Deploy ERC721 and mint tokenId 1
npx hardhat --config hardhat.config.js run --network localhost scripts/examples/deploy-erc721.js

# Probe Arbitrum precompiles
npx hardhat --config hardhat.config.js run --network localhost scripts/examples/arb-precompile-probe.js
```

---

## Expected outcomes (summary)

* ERC20 example confirms standard ERC-20 deployment and transfer on the local chain.
* ERC721 example confirms standard ERC-721 deployment, minting, and ownership on the local chain.
* ArbPrecompileProbe confirms functional reads from `ArbSys` and `ArbGasInfo` in the local environment, making precompile-dependent logic demonstrable and testable with deterministic shim data.
