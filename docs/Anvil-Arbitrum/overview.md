# **Anvil-Arbitrum**
---

Anvil-Arbitrum is a specialized version of Anvil, the local testnet node from the Foundry toolkit. It is specifically patched to provide native, out-of-the-box support for chain-specific features of the Arbitrum network.

This tool integrates directly into existing  workflows, allowing developers to test Arbitrum-specific logic locally with high fidelity, mirroring on-chain behavior without deploying to a live testnet.

<br>


## **Core Functionality**

* **Native Precompile Emulation:** Anvil-Arbitrum provides built-in emulation for essential Arbitrum precompiles, including:

    * `ArbSys` (at address `0x...64`) for chain and block information.

    * `ArbGasInfo` (at address `0x...6c`) for L1 gas pricing data.

* **Deposit Transaction (0x7e) Support:** The node can natively parse and execute Arbitrum's unique L1-to-L2 deposit transactions (type `0x7e`). This enables local testing of retryable tickets and other cross-chain messaging patterns.

* **Seamless Activation:** All Arbitrum-specific features are enabled with a simple `--arbitrum` command-line flag, requiring minimal changes to existing testing setups.

* **Broad Compatibility:** The patch is designed to support development across the entire Arbitrum ecosystem, including Arbitrum Stylus.

