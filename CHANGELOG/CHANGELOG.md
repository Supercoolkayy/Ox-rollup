
# Changelog

## [0.6.0] - 2026-02-18

### Added
- **Nitro Parity:** Integrated new selectors for Nitro-specific gas accounting and pricing constraints to `ArbGasInfoShim` (#12).
- **L1 Estimation:** Implemented a calldata compression heuristic for more accurate L1 estimation (#15).
- **Dev Tools:** Added support for granular reseeding of Nitro parameters and constraints (#13).
- **Testing:** Added `Ox-rollup/probes/hardhat` with internal compatibility probes (e.g., `FeeAwareMint721`, `RelayerGuard`) to stress-test shims.
- **Anvil:** Expanded precompiler support within the Anvil fork for better local emulation.

### Changed
- **ArbGasInfoShim:** Overhauled the shim to return the correct 5-tuple structure and deprecated legacy L1 cost logic (#11).
- **Gas Costs:** Updated `gas_cost` calculation for precompiles to use fixed Mainnet costs, replacing the previous linear formula (#14).
- **Anvil:** Updated `handle_get_prices_in_wei` to return comprehensive gas pricing data, now explicitly including total L2 fee calculation.
- **DevEx:** Made the precompiler output for `arbsys` / `arbgas` selectors configurable for easier debugging (#16).
- **Documentation:** Updated Git and public docs with migration notes and removed the Next.js community-reported vulnerability.

### Fixed
- **Anvil Critical:** Fixed a bug where the internal dispatch was pointing to an incorrect function selector (Commit: Dec 19).
- **Anvil Tests:** Updated input values for `arbChainID`, `arbOSVersion`, and `getCurrentTxL1GasFees` tests to reflect current network realities (Commit: Dec 21).
- **CI/CD:** Resolved persistent GitHub Actions commit-test failures and fixed the pipeline to "fail fast" on build errors.
- **Precompiles:** Fixed `ArbGasInfoShim` returning an incorrect 5-tuple which caused mismatches in fee estimation (#11).

---

## [0.5.0] - 2025-12-22

### Added
- Added `scripts/validate-arbgas.js` to verify selector compliance and return values against the Nitro specification (#8).

### Fixed
- **Critical:** Corrected `nitroToShimTuple` mapping logic which was misidentifying Calldata Price as Base Fee and corrupting data conversion from Nitro to Shim formats (#7).
- **Critical:** Fixed `ArbGasInfoShim.getPricesInWei()` return value ordering to match the official Arbitrum One interface (0x00...06C), resolving simulation failures (#6).
- Updated the precompiles to listen for the standard `arbChainId()` selector (0xd127f54a) instead of the incorrect 0xa3b1b31d, restoring compatibility with Hardhat and Cast (#4).

### Changed
- Refactored `ArbGasInfoShim` to strictly adhere to the official One precompile specification, ensuring `uint256` return types are used where expected.
- Consolidated precompile compliance fixes into a single major patch (PR #8).


