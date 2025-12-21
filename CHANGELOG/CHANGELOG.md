# Changelog




## [0.5.0] - 2025-12-22

### Added
- Added `scripts/validate-arbgas.js` to verify selector compliance and return values against the Nitro specification (#8).

### Fixed
- **Critical:** Corrected `nitroToShimTuple` mapping logic which was misidentifying Calldata Price as Base Fee and corrupting data conversion from Nitro to Shim formats (#7).
- **Critical:** Fixed `ArbGasInfoShim.getPricesInWei()` return value ordering to match the official Arbitrum One interface (0x00...06C), resolving simulation failures (#6).
- Updated the  precompiles to listen for the standard; e.g `arbChainId()` selector (`0xd127f54a`) instead of the incorrect `0xa3b1b31d`, restoring compatibility with Hardhat and Cast (#4).

### Changed
- Refactored `ArbGasInfoShim` to strictly adhere to the official One precompile specification, ensuring `uint256` return types are used where expected.
- Consolidated precompile compliance fixes into a single major patch (PR #8).
